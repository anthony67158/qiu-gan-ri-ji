import { createHash } from 'crypto'
import { AIFeedback, MatchAnalysis, PreMatchIntelAnalysis, WeaknessTrendAnalysis } from '../../shared/types'
import { env } from '../config/env'
import { KnowledgeContext } from './knowledge.service'
import { AppError } from '../utils/AppError'

// #region debug-point ai-no-analysis:server-report
function reportDebugEvent(params: {
  runId: string
  hypothesisId: string
  location: string
  msg: string
  data?: any
}) {
  try {
    void fetch('http://127.0.0.1:7777/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'ai-no-analysis',
        runId: params.runId,
        hypothesisId: params.hypothesisId,
        location: params.location,
        msg: params.msg,
        data: params.data || null,
        ts: Date.now()
      })
    }).catch(() => {})
  } catch {
    // ignore
  }
}
// #endregion

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex')
}

function buildCacheKey(kind: string, modelId: string | undefined, payload: string) {
  return `ai:${kind}:${modelId || 'unknown'}:${sha256(payload)}`
}

function extractSection(text: string, header: string) {
  const idx = text.indexOf(header)
  if (idx === -1) return ''
  const rest = text.slice(idx + header.length).trimStart()
  const next = rest.search(/\n[📋💡📅]/)
  if (next === -1) return rest.trim()
  return rest.slice(0, next).trim()
}

function normalizeToFeedback(text: string): AIFeedback {
  const keyProblem = extractSection(text, '📋 今天的关键问题')
  const nextTactic = extractSection(text, '💡 下次碰到同类对手，试试这 1 件事')
  const training = extractSection(text, '📅 下次训练可以练')
  const conditionTip = extractSection(text, '⚡ 条件提醒')

  const now = new Date().toISOString()
  return {
    key_problem: keyProblem || text.slice(0, 60),
    next_tactic: nextTactic || '',
    training_suggestion: training || '',
    condition_tip: conditionTip || undefined,
    knowledge_used: {},
    generated_at: now
  }
}

function buildFallbackFeedback(knowledge: KnowledgeContext): AIFeedback {
  const now = new Date().toISOString()

  const keyProblem =
    knowledge.failurePattern
      ? `${knowledge.failurePattern.label}：${knowledge.failurePattern.psychological_root}${knowledge.failurePattern.tactical_consequence ? '，' + knowledge.failurePattern.tactical_consequence : ''}`
      : knowledge.opponentMatch
        ? `对手类型「${knowledge.opponentMatch.label}」容易把你拖进他的节奏，先把落点做深、做对。`
        : '先把问题缩小：今天丢分主要是失误多、被动多、还是关键分波动。'

  const nextTactic =
    knowledge.opponentMatch?.must_do?.[0]
      ? `下一场：${knowledge.opponentMatch.must_do[0]}`
      : knowledge.failurePattern?.fix?.[0]
        ? `下一场：${knowledge.failurePattern.fix[0]}`
        : '下一场：中性球先打深中路，再找机会变线，不急着一拍结束。'

  const training =
    knowledge.drill
      ? `${knowledge.drill.label}，${knowledge.drill.duration_minutes}分钟。${knowledge.drill.key_reminder}`
      : '深度与高度控制，15分钟。深度优先于速度。'

  const conditionTip = knowledge.conditionPattern
    ? `${knowledge.conditionPattern.condition}时：${knowledge.conditionPattern.impact}，${knowledge.conditionPattern.adjustment}`
    : undefined

  return {
    key_problem: keyProblem,
    next_tactic: nextTactic,
    training_suggestion: training,
    condition_tip: conditionTip,
    knowledge_used: {
      opponent_type_id: knowledge.opponentMatch?.type_id,
      failure_pattern_id: knowledge.failurePattern?.pattern_id,
      drill_id: knowledge.drill?.drill_id,
      condition_pattern_id: knowledge.conditionPattern?.condition_id
    },
    generated_at: now
  }
}

function normalizeBaseUrl(v: string) {
  return v.trim().replace(/\/$/, '')
}

function extractOpenAICompatibleText(json: any) {
  const content = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text ?? json?.output_text ?? null
  if (typeof content === 'string' && content.trim()) return content
  return null
}

function extractOpenAICompatibleErrorMessage(json: any, raw: string) {
  const msg = json?.error?.message || json?.message || json?.error || null
  if (typeof msg === 'string' && msg.trim()) return msg.trim()
  if (raw && raw.trim()) return raw.trim().slice(0, 240)
  return 'unknown_error'
}

async function callOpenAICompatible(prompt: string) {
  const baseUrl = env.ai.baseUrl ? normalizeBaseUrl(env.ai.baseUrl) : ''
  if (!baseUrl || !env.ai.apiKey || !env.ai.model) {
    reportDebugEvent({
      runId: 'pre-fix',
      hypothesisId: 'H1',
      location: 'server/services/ai.service.ts:callOpenAICompatible:skip',
      msg: 'openai_compatible config missing',
      data: { hasBaseUrl: Boolean(baseUrl), hasApiKey: Boolean(env.ai.apiKey), hasModel: Boolean(env.ai.model) }
    })
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  let res: Response
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.ai.apiKey}`
      },
      body: JSON.stringify({
        model: env.ai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 600
      }),
      signal: controller.signal
    })
  } catch (e: any) {
    const msg = String(e?.name || e?.message || e || '')
    if (/AbortError/i.test(msg)) {
      throw new AppError('AI 调用超时（60s），请检查网络或更换模型/地区', 502, 'AI_TIMEOUT')
    }
    throw new AppError(`AI 网络请求失败：${msg || 'network_error'}`, 502, 'AI_NETWORK_ERROR')
  } finally {
    clearTimeout(timeout)
  }

  const raw = await res.text().catch(() => '')
  if (!res.ok) {
    let json: any = null
    try {
      json = raw ? JSON.parse(raw) : null
    } catch {
      json = null
    }
    const msg = extractOpenAICompatibleErrorMessage(json, raw)
    process.stderr.write(`ai_openai_compatible_error status=${res.status}\n`)
    process.stderr.write(`${msg}\n`)
    throw new AppError(`AI 调用失败（${res.status}）：${msg}`, 502, 'AI_CALL_FAILED')
  }

  const json = (() => {
    try {
      return raw ? JSON.parse(raw) : null
    } catch {
      process.stderr.write('ai_openai_compatible_error invalid_json\n')
      if (raw) process.stderr.write(`${raw.slice(0, 800)}\n`)
      throw new AppError('AI 返回非 JSON（兼容模式响应异常）', 502, 'AI_INVALID_RESPONSE')
    }
  })()

  const text = extractOpenAICompatibleText(json)
  if (text) return text

  process.stderr.write('ai_openai_compatible_error no_text\n')
  throw new AppError('AI 返回为空（no_text）', 502, 'AI_EMPTY_RESPONSE')
}

async function callVolcano(prompt: string) {
  if (!env.volcano.apiKey || !env.volcano.modelId) {
    reportDebugEvent({
      runId: 'pre-fix',
      hypothesisId: 'H1',
      location: 'server/services/ai.service.ts:callVolcano:skip',
      msg: 'volcano config missing',
      data: { hasApiKey: Boolean(env.volcano.apiKey), hasModelId: Boolean(env.volcano.modelId) }
    })
    return null
  }

  const res = await fetch(env.volcano.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.volcano.apiKey}`
    },
    body: JSON.stringify({
      model: env.volcano.modelId,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt
            }
          ]
        }
      ]
    })
  })

  const raw = await res.text().catch(() => '')
  if (!res.ok) {
    process.stderr.write(`volcano_responses_error status=${res.status}\n`)
    if (raw) process.stderr.write(`${raw.slice(0, 800)}\n`)
    return null
  }

  const json = (() => {
    try {
      return raw ? JSON.parse(raw) : null
    } catch {
      process.stderr.write('volcano_responses_error invalid_json\n')
      if (raw) process.stderr.write(`${raw.slice(0, 800)}\n`)
      return null
    }
  })()
  const outputText =
    json?.output_text ||
    json?.choices?.[0]?.message?.content ||
    json?.choices?.[0]?.text ||
    null

  if (typeof outputText === 'string' && outputText.trim()) return outputText

  const outputItems: any[] = Array.isArray(json?.output) ? json.output : []
  const parts = outputItems.flatMap(item => (Array.isArray(item?.content) ? item.content : []))

  const textFromParts = parts
    .map((p: any) => p?.text || p?.delta || p?.content || p?.output_text)
    .filter((x: any) => typeof x === 'string' && x.trim())
    .join('')

  if (textFromParts.trim()) return textFromParts

  process.stderr.write('volcano_responses_error no_text\n')
  return null
}

function stripCodeFences(raw: string) {
  const s = String(raw || '')
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fence && fence[1]) return fence[1].trim()
  return s.trim()
}

function extractJSONObject(raw: string) {
  const s = stripCodeFences(raw)
  const start = s.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (depth === 0) {
      return s.slice(start, i + 1)
    }
  }
  return null
}

function asString(v: any, fallback = '') {
  if (typeof v === 'string' && v.trim()) return v.trim()
  return fallback
}

function asStringArray(v: any, max = 10) {
  if (!Array.isArray(v)) return []
  return v
    .map(x => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
    .slice(0, max)
}

function stripSpecificSetClaims(text: string) {
  return text
    .replace(/第[一二三四五六七八九十0-9]+[盘局][^，。；：\n]*/g, '某些回合')
    .replace(/[0-9]+\s*[:：]\s*[0-9]+/g, '比分细节不足')
    .trim()
}

function buildConservativeMatchAnalysis(params: {
  reason: string
  hasScore: boolean
  hasOpponentStyle: boolean
  hasMyStyle: boolean
  hasScoringSummary: boolean
  hasLosingSummary: boolean
}): MatchAnalysis {
  const missing: string[] = []
  if (!params.hasScore) missing.push('比分')
  if (!params.hasOpponentStyle) missing.push('对手打法')
  if (!params.hasMyStyle) missing.push('我的风格')
  if (!params.hasScoringSummary) missing.push('得分方式')
  if (!params.hasLosingSummary) missing.push('丢分原因')
  const missingText = missing.length ? `当前缺少：${missing.join('、')}。` : ''

  return {
    overview: {
      rating: 'D',
      rating_label: '信息不足',
      one_liner: `这次先不给你硬编分析，${missingText || '已记录信息有限。'}补充后再生成会更靠谱。`.slice(0, 60),
      tags: ['不编造', '待补充']
    },
    highlights: {
      title: '今天的亮点',
      items: [
        {
          emoji: '📝',
          point: '已按你填写的内容生成保守结论',
          evidence: '未提供的字段不做推断，不展开具体盘局表现'
        }
      ]
    },
    improvements: {
      title: '下次要注意',
      items: [
        {
          emoji: '🔧',
          point: '[P0] 补充核心输入',
          suggestion: missing.length ? `优先补：${missing.join('、')}` : '补充更多比赛细节，分析会更具体',
          priority: 'P0'
        }
      ]
    },
    opponent_read: {
      title: '对手解读',
      summary: params.hasOpponentStyle ? '目前只根据你填写的对手画像做保守判断，不推断具体回合细节。' : '对手信息不足，暂不展开打法解读。',
      next_time_tip: '补充完核心字段后重新生成，结果会明显更准。'
    },
    homework: {
      title: '练球作业',
      drills: []
    }
  }
}

function fillMatchAnalysisDefaults(
  input: any,
  options?: { hasScore?: boolean; allowHomeworkPadding?: boolean }
): MatchAnalysis {
  const overview = input?.overview || {}
  const ratingRaw = String(overview?.rating || '').trim().toUpperCase()
  const rating = (['S', 'A', 'B', 'C', 'D'] as const).includes(ratingRaw as any) ? (ratingRaw as any) : 'B'
  const highlightsItems = Array.isArray(input?.highlights?.items) ? input.highlights.items : []
  const improvementsItems = Array.isArray(input?.improvements?.items) ? input.improvements.items : []
  const drills = Array.isArray(input?.homework?.drills) ? input.homework.drills : []

  const normalized: MatchAnalysis = {
    overview: {
      rating,
      rating_label: asString(overview?.rating_label, rating === 'S' ? '爆炸发挥' : rating === 'A' ? '发挥不错' : rating === 'B' ? '正常水平' : rating === 'C' ? '有点拉胯' : '崩盘'),
      one_liner: asString(overview?.one_liner, '这场信息不全，但能看出你有亮点也有明显短板。').slice(0, 60),
      tags: asStringArray(overview?.tags, 3)
    },
    highlights: {
      title: '今天的亮点',
      items: highlightsItems
        .slice(0, 3)
        .map((x: any) => ({
          emoji: asString(x?.emoji, '🔥').slice(0, 4),
          point: asString(x?.point, '').slice(0, 30),
          evidence: asString(x?.evidence, '').slice(0, 40)
        }))
        .filter((x: any) => x.point)
    },
    improvements: {
      title: '下次要注意',
      items: improvementsItems
        .slice(0, 3)
        .map((x: any) => {
          const pRaw = String(x?.priority || '').trim().toUpperCase()
          const priority = (['P0', 'P1', 'P2'] as const).includes(pRaw as any) ? (pRaw as any) : 'P1'
          return {
            emoji: asString(x?.emoji, '🔧').slice(0, 4),
            point: asString(x?.point, '').slice(0, 30),
            suggestion: asString(x?.suggestion, '').slice(0, 80),
            priority
          }
        })
        .filter((x: any) => x.point && x.suggestion)
        .sort((a: any, b: any) => (a.priority < b.priority ? -1 : a.priority > b.priority ? 1 : 0))
    },
    opponent_read: {
      title: '对手解读',
      summary: asString(input?.opponent_read?.summary, '').slice(0, 120),
      next_time_tip: asString(input?.opponent_read?.next_time_tip, '').slice(0, 80)
    },
    homework: {
      title: '练球作业',
      drills: drills
        .slice(0, 2)
        .map((d: any) => ({
          name: asString(d?.name, '').slice(0, 40),
          description: asString(d?.description, '').slice(0, 120),
          duration: asString(d?.duration, '').slice(0, 20),
          targets: asString(d?.targets, '').slice(0, 40)
        }))
        .filter((d: any) => d.name && d.description)
    }
  }

  const coord = input?.coordination_eval
  if (coord && typeof coord === 'object') {
    const coordDrills = Array.isArray(coord?.drills) ? coord.drills : []
    normalized.coordination_eval = {
      title: '配合评估',
      summary: asString(coord?.summary, '').slice(0, 200),
      drills: coordDrills
        .slice(0, 2)
        .map((d: any) => ({
          name: asString(d?.name, '').slice(0, 40),
          description: asString(d?.description, '').slice(0, 120),
          duration: asString(d?.duration, '').slice(0, 20),
          targets: asString(d?.targets, '').slice(0, 40)
        }))
        .filter((d: any) => d.name && d.description)
    }
  }

  const next = input?.next_match_tips
  if (next && typeof next === 'object') {
    normalized.next_match_tips = {
      title: '下次交手锦囊',
      strategy: asString(next?.strategy, '').slice(0, 80),
      dos: asStringArray(next?.dos, 2).map(s => s.slice(0, 40)),
      donts: asStringArray(next?.donts, 2).map(s => s.slice(0, 40))
    }
  }

  if (normalized.highlights.items.length === 0) {
    normalized.highlights.items = [{ emoji: '🎯', point: '亮点信息不全，先把得分方式记录清楚', evidence: '得分方式/丢分原因为空' }]
  }
  if (normalized.improvements.items.length === 0) {
    normalized.improvements.items = [{ emoji: '🔧', point: '先把丢分原因选出来', suggestion: '下次记录至少选3个丢分原因，AI才好给招', priority: 'P0' }]
  }
  if (options?.hasScore === false) {
    normalized.overview.one_liner = stripSpecificSetClaims(normalized.overview.one_liner)
    normalized.highlights.items = normalized.highlights.items.map(item => ({
      ...item,
      point: stripSpecificSetClaims(item.point),
      evidence: stripSpecificSetClaims(item.evidence)
    }))
    normalized.improvements.items = normalized.improvements.items.map(item => ({
      ...item,
      point: stripSpecificSetClaims(item.point),
      suggestion: stripSpecificSetClaims(item.suggestion)
    }))
    normalized.opponent_read.summary = stripSpecificSetClaims(normalized.opponent_read.summary)
    normalized.opponent_read.next_time_tip = stripSpecificSetClaims(normalized.opponent_read.next_time_tip)
    normalized.homework.drills = normalized.homework.drills.map(drill => ({
      ...drill,
      description: stripSpecificSetClaims(drill.description),
      targets: stripSpecificSetClaims(drill.targets)
    }))
  }

  return normalized
}

function fillWeaknessTrendAnalysisDefaults(input: any): WeaknessTrendAnalysis {
  const overview = input?.trend_overview || {}
  const ranking = Array.isArray(input?.weakness_ranking) ? input.weakness_ranking : []
  const plan = input?.training_plan || {}
  const sessions = Array.isArray(plan?.sessions) ? plan.sessions : []

  const normalized: WeaknessTrendAnalysis = {
    trend_overview: {
      total_matches: Number(overview?.total_matches || 0) || ranking.length || 0,
      period: asString(overview?.period, '最近一段时间'),
      trend_verdict: asString(overview?.trend_verdict, '先把数据记录完整，趋势才看得准').slice(0, 80)
    },
    weakness_ranking: ranking
      .slice(0, 5)
      .map((x: any, idx: number) => {
        const trendRaw = String(x?.trend || '').trim()
        const trend = (['worsening', 'stable', 'improving'] as const).includes(trendRaw as any) ? (trendRaw as any) : 'stable'
        const icon = trend === 'worsening' ? '📈' : trend === 'improving' ? '📉' : '➡️'
        const freq = asString(x?.frequency, '')
        const sevRaw = String(x?.severity || '').trim().toUpperCase()
        const severity = (['P0', 'P1', 'P2'] as const).includes(sevRaw as any) ? (sevRaw as any) : 'P1'
        const rawIcon = String(x?.trend_icon || '')
        const trend_icon = rawIcon === '📈' || rawIcon === '➡️' || rawIcon === '📉' ? (rawIcon as '📈' | '➡️' | '📉') : icon
        return {
          rank: Number(x?.rank || idx + 1) || idx + 1,
          weakness: asString(x?.weakness, '').slice(0, 40),
          frequency: freq.slice(0, 40),
          trend,
          trend_icon,
          severity,
          quick_fix: asString(x?.quick_fix, '').slice(0, 80)
        }
      })
      .filter((x: any) => x.weakness)
  ,
    training_plan: {
      title: '本周训练重点',
      focus_area: asString(plan?.focus_area, '把一个问题练扎实').slice(0, 40),
      sessions: sessions
        .slice(0, 3)
        .map((s: any, idx: number) => ({
          day: asString(s?.day, `第${idx + 1}次`).slice(0, 12),
          drill_name: asString(s?.drill_name, '').slice(0, 30),
          detail: asString(s?.detail, '').slice(0, 120),
          duration: asString(s?.duration, '').slice(0, 20)
        }))
        .filter((s: any) => s.drill_name && s.detail)
    }
  }

  const stamina = input?.stamina_insight
  if (stamina && typeof stamina === 'object') {
    const finding = asString(stamina?.finding, '')
    const advice = asString(stamina?.advice, '')
    if (finding && advice) normalized.stamina_insight = { finding: finding.slice(0, 80), advice: advice.slice(0, 80) }
  }

  if (normalized.weakness_ranking.length === 0) {
    normalized.weakness_ranking = [
      { rank: 1, weakness: '数据不足', frequency: '最近N场信息不完整', trend: 'stable', trend_icon: '➡️', severity: 'P0', quick_fix: '下次记录至少选3个丢分原因+2个关键分失误' }
    ]
  }
  if (normalized.training_plan.sessions.length === 0) {
    normalized.training_plan.sessions = [
      { day: '第1次', drill_name: '二发稳定性', detail: '连续发30个二发进发球区，目标进球率80%+，落点先求深', duration: '15分钟' },
      { day: '第2次', drill_name: '深度控制', detail: '底线对拉20球不出界，先把球打深中路，再找机会变线', duration: '15分钟' }
    ]
  }

  return normalized
}

function fillPreMatchIntelAnalysisDefaults(input: any): PreMatchIntelAnalysis {
  const portrait = input?.opponent_portrait || {}
  const gamePlan = input?.game_plan || {}
  const watchOut = input?.watch_out || {}
  const clutch = input?.clutch_script || {}

  const danger = Number(portrait?.danger_rating || 3)
  const danger_rating = (danger >= 1 && danger <= 5 ? danger : 3) as 1 | 2 | 3 | 4 | 5

  const tactics = Array.isArray(gamePlan?.tactics) ? gamePlan.tactics : []
  const warnings = Array.isArray(watchOut?.warnings) ? watchOut.warnings : []

  const normalized: PreMatchIntelAnalysis = {
    opponent_portrait: {
      nickname: asString(portrait?.nickname, '对手'),
      one_liner: asString(portrait?.one_liner, '').slice(0, 60),
      danger_rating,
      h2h_record: asString(portrait?.h2h_record, '').slice(0, 40)
    },
    game_plan: {
      title: '今天的打法',
      core_strategy: asString(gamePlan?.core_strategy, '').slice(0, 60),
      tactics: tactics
        .slice(0, 3)
        .map((t: any) => ({
          emoji: asString(t?.emoji, '🎯').slice(0, 4),
          tactic: asString(t?.tactic, '').slice(0, 60),
          reason: asString(t?.reason, '').slice(0, 60)
        }))
        .filter((t: any) => t.tactic)
    },
    watch_out: {
      title: '小心这些',
      warnings: warnings
        .slice(0, 3)
        .map((w: any) => ({ emoji: asString(w?.emoji, '⚡').slice(0, 4), warning: asString(w?.warning, '').slice(0, 60) }))
        .filter((w: any) => w.warning)
    },
    clutch_script: {
      title: '关键分这样打',
      when_leading: asString(clutch?.when_leading, '').slice(0, 80),
      when_trailing: asString(clutch?.when_trailing, '').slice(0, 80),
      break_point: asString(clutch?.break_point, '').slice(0, 80)
    }
  }

  if (!normalized.opponent_portrait.one_liner) normalized.opponent_portrait.one_liner = '先别慌，先用深度把节奏拿回来。'
  if (!normalized.game_plan.core_strategy) normalized.game_plan.core_strategy = '先稳住深度，再打对手最不舒服的点。'
  if (normalized.game_plan.tactics.length === 0) {
    normalized.game_plan.tactics = [
      { emoji: '🎯', tactic: '开局先打深中路，别送浅球', reason: '先把失误压下去' },
      { emoji: '🎯', tactic: '优先攻击他最弱的一侧', reason: '让他一直在被动位' },
      { emoji: '🎯', tactic: '短球出现就向前处理', reason: '别在底线跟他磨' }
    ]
  }
  if (normalized.watch_out.warnings.length === 0) {
    normalized.watch_out.warnings = [{ emoji: '⚡', warning: '别在关键分冒险一发式搏杀，先把球进场' }]
  }
  if (!normalized.clutch_script.when_leading) normalized.clutch_script.when_leading = '领先时先求深度，别突然变保守到只推中路短球。'
  if (!normalized.clutch_script.when_trailing) normalized.clutch_script.when_trailing = '落后时别瞎搏杀，先把回球质量提起来，逼他多打一拍。'
  if (!normalized.clutch_script.break_point) normalized.clutch_script.break_point = '破发点先用高成功率套路：发到身体/深中路，第三拍再找角度。'

  return normalized
}

export async function callAIText(prompt: string) {
  reportDebugEvent({
    runId: 'pre-fix',
    hypothesisId: 'H1',
    location: 'server/services/ai.service.ts:callAIText',
    msg: 'callAIText choose provider',
    data: { provider: env.ai.provider }
  })
  if (env.ai.provider === 'openai_compatible') return callOpenAICompatible(prompt)
  return callVolcano(prompt)
}

export async function generateMatchAnalysis(params: {
  prompt: string
  redis?: { get: (key: string) => Promise<string | null>; set: (key: string, value: string, mode: string, ttl: number) => Promise<any> }
  noCache?: boolean
  guardrails?: {
    hasScore?: boolean
    hasOpponentStyle?: boolean
    hasMyStyle?: boolean
    hasScoringSummary?: boolean
    hasLosingSummary?: boolean
    allowHomeworkPadding?: boolean
  }
}): Promise<MatchAnalysis> {
  const modelId = env.ai.provider === 'openai_compatible' ? env.ai.model : env.volcano.modelId
  const cacheKey = buildCacheKey('match_analysis_v31', modelId, params.prompt)
  if (!params.noCache) {
    const cached = params.redis ? await params.redis.get(cacheKey) : null
    if (cached) return JSON.parse(cached) as MatchAnalysis
  }

  reportDebugEvent({
    runId: 'pre-fix',
    hypothesisId: 'H1',
    location: 'server/services/ai.service.ts:generateMatchAnalysis:begin',
    msg: 'generateMatchAnalysis begin',
    data: {
      provider: env.ai.provider,
      hasOpenAIKey: Boolean(env.ai.apiKey),
      hasVolcanoKey: Boolean(env.volcano.apiKey),
      model: env.ai.model || env.volcano.modelId || null,
      promptLength: params.prompt.length
    }
  })

  let raw: string | null = null
  try {
    raw = await callAIText(params.prompt)
    reportDebugEvent({
      runId: 'pre-fix',
      hypothesisId: 'H2',
      location: 'server/services/ai.service.ts:generateMatchAnalysis:after-call',
      msg: 'callAIText returned',
      data: { rawType: typeof raw, rawLength: raw ? raw.length : 0 }
    })
    if (!raw) {
      const analysis = buildConservativeMatchAnalysis({
        reason: 'AI未配置',
        hasScore: Boolean(params.guardrails?.hasScore),
        hasOpponentStyle: Boolean(params.guardrails?.hasOpponentStyle),
        hasMyStyle: Boolean(params.guardrails?.hasMyStyle),
        hasScoringSummary: Boolean(params.guardrails?.hasScoringSummary),
        hasLosingSummary: Boolean(params.guardrails?.hasLosingSummary)
      })
      reportDebugEvent({
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'server/services/ai.service.ts:generateMatchAnalysis:fallback',
        msg: 'AI missing config, returned fallback analysis',
        data: { provider: env.ai.provider }
      })
      return analysis
    }
    const jsonStr = extractJSONObject(raw)
    reportDebugEvent({
      runId: 'pre-fix',
      hypothesisId: 'H2',
      location: 'server/services/ai.service.ts:generateMatchAnalysis:extract-json',
      msg: 'extractJSONObject done',
      data: { hasJson: Boolean(jsonStr), jsonLength: jsonStr ? jsonStr.length : 0 }
    })
    if (!jsonStr) throw new AppError('AI 返回缺少 JSON', 502, 'AI_INVALID_RESPONSE')
    const parsed = (() => {
      try {
        return JSON.parse(jsonStr)
      } catch {
        throw new AppError('AI JSON 解析失败', 502, 'AI_INVALID_RESPONSE')
      }
    })()
    const analysis = fillMatchAnalysisDefaults(parsed, {
      hasScore: params.guardrails?.hasScore,
      allowHomeworkPadding: params.guardrails?.allowHomeworkPadding
    })
    reportDebugEvent({
      runId: 'pre-fix',
      hypothesisId: 'H3',
      location: 'server/services/ai.service.ts:generateMatchAnalysis:parsed',
      msg: 'match analysis parsed',
      data: {
        rating: analysis?.overview?.rating || null,
        hasNextTips: Boolean((analysis as any)?.next_match_tips),
        highlightCount: analysis?.highlights?.items?.length || 0,
        improvementCount: analysis?.improvements?.items?.length || 0
      }
    })

    if (params.redis && !params.noCache) {
      await params.redis.set(cacheKey, JSON.stringify(analysis), 'EX', 60 * 60 * 24)
    }
    return analysis
  } catch (e: any) {
    reportDebugEvent({
      runId: 'pre-fix',
      hypothesisId: 'H1',
      location: 'server/services/ai.service.ts:generateMatchAnalysis:error',
      msg: 'generateMatchAnalysis error',
      data: {
        errName: e?.name || null,
        errCode: e?.code || null,
        errMessage: String(e?.message || e || '').slice(0, 240)
      }
    })
    const safeMsg = String(e?.message || e || '').slice(0, 160)
    return fillMatchAnalysisDefaults(
      {
      ...buildConservativeMatchAnalysis({
        reason: safeMsg || 'AI生成失败',
        hasScore: Boolean(params.guardrails?.hasScore),
        hasOpponentStyle: Boolean(params.guardrails?.hasOpponentStyle),
        hasMyStyle: Boolean(params.guardrails?.hasMyStyle),
        hasScoringSummary: Boolean(params.guardrails?.hasScoringSummary),
        hasLosingSummary: Boolean(params.guardrails?.hasLosingSummary)
      }),
      highlights: {
        items: [
          {
            emoji: '⚠️',
            point: '本次 AI 生成失败，已返回保守结果',
            evidence: safeMsg ? `错误：${safeMsg}` : '错误：未知'
          }
        ]
      },
      improvements: {
        items: [
          {
            emoji: '🔁',
            point: '[P0] 稍后重新生成',
            suggestion: '网络或模型偶发抖动时，重试一次通常能恢复；若字段还少，先补齐再试',
            priority: 'P0'
          }
        ]
      }
      },
      { hasScore: params.guardrails?.hasScore, allowHomeworkPadding: false }
    )
  }

  // unreachable
}

export async function generateWeaknessTrendAnalysis(params: {
  prompt: string
  redis?: { get: (key: string) => Promise<string | null>; set: (key: string, value: string, mode: string, ttl: number) => Promise<any> }
}): Promise<WeaknessTrendAnalysis> {
  const modelId = env.ai.provider === 'openai_compatible' ? env.ai.model : env.volcano.modelId
  const cacheKey = buildCacheKey('trend_analysis_v31', modelId, params.prompt)
  const cached = params.redis ? await params.redis.get(cacheKey) : null
  if (cached) return JSON.parse(cached) as WeaknessTrendAnalysis

  const raw = await callAIText(params.prompt)
  if (!raw) {
    return fillWeaknessTrendAnalysisDefaults({
      trend_overview: { total_matches: 0, period: '未配置AI', trend_verdict: 'AI 没配置好，先补齐 AI_* 或 VOLCANO_* 环境变量。' }
    })
  }
  const jsonStr = extractJSONObject(raw)
  if (!jsonStr) throw new AppError('AI 返回缺少 JSON', 502, 'AI_INVALID_RESPONSE')
  const parsed = (() => {
    try {
      return JSON.parse(jsonStr)
    } catch {
      throw new AppError('AI JSON 解析失败', 502, 'AI_INVALID_RESPONSE')
    }
  })()
  const analysis = fillWeaknessTrendAnalysisDefaults(parsed)

  if (params.redis) {
    await params.redis.set(cacheKey, JSON.stringify(analysis), 'EX', 60 * 60 * 12)
  }
  return analysis
}

export async function generatePreMatchIntelAnalysis(params: {
  prompt: string
  redis?: { get: (key: string) => Promise<string | null>; set: (key: string, value: string, mode: string, ttl: number) => Promise<any> }
}): Promise<PreMatchIntelAnalysis> {
  const modelId = env.ai.provider === 'openai_compatible' ? env.ai.model : env.volcano.modelId
  const cacheKey = buildCacheKey('pre_match_intel_v31', modelId, params.prompt)
  const cached = params.redis ? await params.redis.get(cacheKey) : null
  if (cached) return JSON.parse(cached) as PreMatchIntelAnalysis

  const raw = await callAIText(params.prompt)
  if (!raw) {
    return fillPreMatchIntelAnalysisDefaults({
      opponent_portrait: { nickname: '对手', one_liner: 'AI 没配置好，先补齐 AI_* 或 VOLCANO_* 环境变量。', danger_rating: 3, h2h_record: '' }
    })
  }
  const jsonStr = extractJSONObject(raw)
  if (!jsonStr) throw new AppError('AI 返回缺少 JSON', 502, 'AI_INVALID_RESPONSE')
  const parsed = (() => {
    try {
      return JSON.parse(jsonStr)
    } catch {
      throw new AppError('AI JSON 解析失败', 502, 'AI_INVALID_RESPONSE')
    }
  })()
  const analysis = fillPreMatchIntelAnalysisDefaults(parsed)

  if (params.redis) {
    await params.redis.set(cacheKey, JSON.stringify(analysis), 'EX', 60 * 60 * 12)
  }
  return analysis
}

export async function generateMatchFeedback(params: {
  prompt: string
  knowledgeContext: KnowledgeContext
  redis?: { get: (key: string) => Promise<string | null>; set: (key: string, value: string, mode: string, ttl: number) => Promise<any> }
}): Promise<AIFeedback> {
  const modelId = env.ai.provider === 'openai_compatible' ? env.ai.model : env.volcano.modelId
  const cacheKey = buildCacheKey('match_feedback', modelId, params.prompt)
  const cached = params.redis ? await params.redis.get(cacheKey) : null
  if (cached) {
    const parsed = JSON.parse(cached) as AIFeedback
    return parsed
  }

  const text = await callAIText(params.prompt)
  const feedback = text ? normalizeToFeedback(text) : buildFallbackFeedback(params.knowledgeContext)

  if (params.redis) {
    await params.redis.set(cacheKey, JSON.stringify(feedback), 'EX', 60 * 60 * 24)
  }

  return feedback
}
