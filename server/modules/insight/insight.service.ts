import { createHash } from 'crypto'
import { env } from '../../config/env'
import { buildMonthlyInsightPrompt } from '../../prompts/monthlyInsight.prompt'
import { callAIText } from '../../services/ai.service'
import { AppError } from '../../utils/AppError'
import { calculateMonthlyStats } from './insight.calculator'
import { InsightReportModel } from './insight.model'
import { MatchModel } from '../match/match.model'
import { listMatches } from '../match/match.service'

type InsightContent = {
  total_summary: string
  failure_patterns: string[]
  tough_opponent_types: string
  strength_patterns: string
  training_focus: string
}

export type InsightReport = {
  id: string
  user_id: string
  period_start: string
  period_end: string
  matches_count: number
  content: InsightContent
  raw_stats: any
  generated_at: string
}

const memoryReports = new Map<string, InsightReport>()

function sha1(input: string) {
  return createHash('sha1').update(input).digest('hex')
}

function toReport(doc: any): InsightReport {
  return {
    id: String(doc._id),
    user_id: doc.user_id,
    period_start: new Date(doc.period_start).toISOString(),
    period_end: new Date(doc.period_end).toISOString(),
    matches_count: doc.matches_count,
    content: doc.content,
    raw_stats: doc.raw_stats,
    generated_at: doc.generated_at ? new Date(doc.generated_at).toISOString() : new Date().toISOString()
  }
}

function fallbackContent(stats: ReturnType<typeof calculateMonthlyStats>): InsightContent {
  const failure = stats.lose_states.slice(0, 2).map(s => `输球时常见状态：${s.tag}`)
  const strength = stats.win_tactics.slice(0, 2).map(s => `${s.tag}（${s.count}次）`).join('、') || '暂无明显高频战术'

  return {
    total_summary: `本月${stats.total_matches}场，${stats.wins}胜${stats.losses}负，胜率${stats.win_rate_pct}%。关键分问题提及${stats.critical_point_ratio}%。`,
    failure_patterns: failure.length > 0 ? failure : ['先把关键分策略固定下来，减少临场临时决策。'],
    tough_opponent_types: `你对「${stats.toughest_opponent_type}」类对手胜率${stats.toughest_win_rate_pct}%（${stats.toughest_match_count}场）。`,
    strength_patterns: `赢球时高频战术：${strength}。`,
    training_focus: stats.toughest_opponent_type === '未识别' ? '优先练接发站位与深度控制。' : `围绕「${stats.toughest_opponent_type}」的应对，优先练接发与第一拍执行。`
  }
}

function isAIConfigured() {
  if (env.ai.provider === 'openai_compatible') return Boolean(env.ai.baseUrl && env.ai.apiKey && env.ai.model)
  return Boolean(env.volcano.apiKey && env.volcano.modelId)
}

async function callVolcanoJson(prompt: string) {
  const content = await callAIText(prompt)
  if (typeof content !== 'string') return null

  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  const sliced = content.slice(start, end + 1)
  return JSON.parse(sliced) as InsightContent
}

export async function generateMonthlyInsight(params: {
  userId: string
  periodStart: Date
  periodEnd: Date
  redis?: any
}) {
  const modelId = env.ai.provider === 'openai_compatible' ? env.ai.model : env.volcano.modelId
  const cacheKey = `ai:monthly_insight:${modelId || 'unknown'}:${sha1(
    `${params.userId}:${params.periodStart.toISOString()}:${params.periodEnd.toISOString()}`
  )}`

  const cached = params.redis ? await params.redis.get(cacheKey) : null
  if (cached) {
    return JSON.parse(cached) as InsightContent
  }

  const matches = env.useInMemoryStore
    ? (await listMatches(params.userId, 1000, 0)).filter(m => {
        const t = new Date(m.updated_at).getTime()
        return t >= params.periodStart.getTime() && t < params.periodEnd.getTime()
      })
    : await MatchModel.find({
        user_id: params.userId,
        date_time: { $gte: params.periodStart, $lt: params.periodEnd }
      }).then((docs: any[]) => docs.map((d: any) => ({
        id: String(d._id),
        user_id: d.user_id,
        opponent_name_alias: d.opponent_name_alias,
        match_result: d.match_result,
        match_type: d.match_type,
        score: d.score,
        score_analysis: d.score_analysis,
        most_painful_point: d.most_painful_point,
        opponent_tags: d.opponent_tags,
        self_state_tags: d.self_state_tags,
        tactics_used_tags: d.tactics_used_tags,
        ai_clarification: d.ai_clarification,
        ai_feedback: d.ai_feedback,
        created_at: d.created_at?.toISOString?.() || new Date(d.created_at).toISOString(),
        updated_at: d.updated_at?.toISOString?.() || new Date(d.updated_at).toISOString()
      })))

  const stats = calculateMonthlyStats(matches as any)
  const prompt = buildMonthlyInsightPrompt(stats)
  const content = (await callVolcanoJson(prompt)) || (isAIConfigured() ? null : fallbackContent(stats))
  if (!content) {
    throw new AppError('AI 调用失败，请检查模型与 API Key 配置', 502, 'AI_CALL_FAILED')
  }

  if (params.redis) {
    await params.redis.set(cacheKey, JSON.stringify(content), 'EX', 60 * 60 * 24)
  }

  const report: InsightReport = {
    id: `${params.userId}:${params.periodStart.toISOString()}`,
    user_id: params.userId,
    period_start: params.periodStart.toISOString(),
    period_end: params.periodEnd.toISOString(),
    matches_count: stats.total_matches,
    content,
    raw_stats: stats,
    generated_at: new Date().toISOString()
  }

  if (env.useInMemoryStore) {
    memoryReports.set(report.id, report)
    return report
  }

  const saved = await InsightReportModel.findOneAndUpdate(
    { user_id: params.userId, period_start: params.periodStart },
    {
      $set: {
        period_end: params.periodEnd,
        matches_count: stats.total_matches,
        content,
        raw_stats: stats,
        generated_at: new Date()
      }
    },
    { upsert: true, new: true }
  )

  return toReport(saved)
}

export async function listInsightReports(userId: string, limit = 12, offset = 0) {
  if (env.useInMemoryStore) {
    return Array.from(memoryReports.values())
      .filter(r => r.user_id === userId)
      .sort((a, b) => (a.period_start < b.period_start ? 1 : -1))
      .slice(offset, offset + limit)
  }

  const docs = await InsightReportModel.find({ user_id: userId })
    .sort({ period_start: -1 })
    .skip(offset)
    .limit(limit)

  return docs.map(toReport)
}

// v4.1：跨场对比（只看比赛，不含练球）
export type RecentCompareResult = {
  available: boolean
  reason?: string
  mode?: 'same_opponent' | 'cross_opponent'
  current?: RecentCompareMatchBrief
  previous?: RecentCompareMatchBrief
  diff?: {
    summary: string
    bullets: string[]
  }
}

export type RecentCompareMatchBrief = {
  id: string
  date: string
  opponent: string
  result: string
  score: string
  scoring_methods: string[]
  losing_reasons: string[]
  one_line_summary: string
}

function tagDiff(prev: string[], curr: string[]) {
  const prevSet = new Set(prev || [])
  const currSet = new Set(curr || [])
  const added = (curr || []).filter(t => !prevSet.has(t))
  const removed = (prev || []).filter(t => !currSet.has(t))
  return { added, removed }
}

function briefOf(m: any): RecentCompareMatchBrief {
  const summary = m.post_match_summary || {}
  return {
    id: String(m.id),
    date: (m.date_time || m.created_at || '').slice(0, 10),
    opponent: m.opponent_name_alias || '未填',
    result: m.match_result === 'WIN' ? '胜' : m.match_result === 'LOSE' ? '负' : '平',
    score: m.score_analysis?.score_summary || '未填写',
    scoring_methods: Array.isArray(summary.scoring_methods) ? summary.scoring_methods : [],
    losing_reasons: Array.isArray(summary.losing_reasons) ? summary.losing_reasons : [],
    one_line_summary: summary.one_line_summary || m.most_painful_point || ''
  }
}

export async function buildRecentCompare(params: { userId: string }): Promise<RecentCompareResult> {
  const all = await listMatches(params.userId, 50, 0)
  const matches = all.filter(m => (m.record_type || 'match') === 'match')

  if (matches.length < 2) {
    return { available: false, reason: '至少需要 2 场比赛记录才能对比' }
  }

  const current = matches[0] as any
  const currOpp = current.opponent_name_alias || ''

  // 优先：找最近的同对手历史
  const prevSame = matches.slice(1).find((m: any) => (m.opponent_name_alias || '') === currOpp && currOpp)
  const previous = (prevSame || matches[1]) as any
  const mode: 'same_opponent' | 'cross_opponent' = prevSame ? 'same_opponent' : 'cross_opponent'

  const currBrief = briefOf(current)
  const prevBrief = briefOf(previous)

  const bullets: string[] = []
  if (mode === 'same_opponent') {
    const resultTrend =
      current.match_result === previous.match_result
        ? `结果同样：${currBrief.result}`
        : `结果反转：${prevBrief.result} → ${currBrief.result}`
    bullets.push(resultTrend)
    const sd = tagDiff(prevBrief.scoring_methods, currBrief.scoring_methods)
    if (sd.added.length) bullets.push(`这次新增的得分方式：${sd.added.join('、')}`)
    if (sd.removed.length) bullets.push(`上次有但这次丢的得分方式：${sd.removed.join('、')}`)
    const ld = tagDiff(prevBrief.losing_reasons, currBrief.losing_reasons)
    if (ld.added.length) bullets.push(`这次新出现的丢分原因：${ld.added.join('、')}`)
    if (ld.removed.length) bullets.push(`上次有但这次解决的丢分：${ld.removed.join('、')}`)
  } else {
    bullets.push(`最近一场（${currBrief.opponent}）结果：${currBrief.result}`)
    bullets.push(`上一场（${prevBrief.opponent}）结果：${prevBrief.result}`)
    if (currBrief.scoring_methods.length) bullets.push(`这次靠：${currBrief.scoring_methods.join('、')}`)
    if (currBrief.losing_reasons.length) bullets.push(`这次丢分主要在：${currBrief.losing_reasons.join('、')}`)
  }
  if (bullets.length === 0) bullets.push('两场都没填总结标签，建议补齐"得分方式 / 丢分原因"再来对比')

  const summary =
    mode === 'same_opponent'
      ? `vs ${currBrief.opponent}：${prevBrief.date} ${prevBrief.result} → ${currBrief.date} ${currBrief.result}`
      : `最近 2 场：${prevBrief.date} vs ${prevBrief.opponent}（${prevBrief.result}） → ${currBrief.date} vs ${currBrief.opponent}（${currBrief.result}）`

  return {
    available: true,
    mode,
    current: currBrief,
    previous: prevBrief,
    diff: { summary, bullets }
  }
}
