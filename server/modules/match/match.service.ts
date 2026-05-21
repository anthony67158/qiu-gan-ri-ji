import { randomUUID } from 'crypto'
import {
  AIFeedback,
  AIClarification,
  CreateMatchDTO,
  MatchConditions,
  MatchResult,
  ScoreAnalysis,
  SubmitClarificationDTO
} from '../../../shared/types'
import { env } from '../../config/env'
import { AppError } from '../../utils/AppError'
import { generateMatchAnalysis } from '../../services/ai.service'
import { buildMatchFeedbackPrompt } from '../../prompts/matchFeedback.prompt'
import { buildKnowledgeContext } from '../../services/knowledge.service'
import { enqueueDoublesUpdate, enqueueIntelPreGenerate, enqueueOpponentRecalculate, enqueueTrendDetect } from '../../services/queue.service'
import { analyzeScore } from './score.analyzer'
import { MatchModel } from './match.model'
import { upsertOpponentTraits } from '../opponent/opponent.service'
import { upsertPartnerProfile } from '../partner/partner.service'

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

export type MatchRecord = {
  id: string
  user_id: string
  record_type?: 'match' | 'practice'
  opponent_id?: string | null
  opponent_name_alias?: string | null
  match_result: MatchResult
  match_type?: string
  score?: CreateMatchDTO['score']
  score_analysis: ScoreAnalysis
  most_painful_point?: string
  painful_scene_tag?: string | null
  opponent_tags?: string[]
  self_state_tags?: string[]
  tactics_used_tags?: string[]
  opponent_info?: CreateMatchDTO['opponent_info']
  opponent_ids?: CreateMatchDTO['opponent_ids']
  opponent_snapshots?: CreateMatchDTO['opponent_snapshots']
  my_info?: CreateMatchDTO['my_info']
  post_match_summary?: CreateMatchDTO['post_match_summary']
  partner_snapshot?: CreateMatchDTO['partner_snapshot']
  my_court_preference?: CreateMatchDTO['my_court_preference']
  practice_info?: CreateMatchDTO['practice_info']
  practice_summary?: CreateMatchDTO['practice_summary']
  match_conditions?: MatchConditions
  doubles_data?: CreateMatchDTO['doubles_data']
  ai_clarification?: AIClarification
  ai_feedback?: AIFeedback | null
  ai_analysis?: any
  date_time?: string
  created_at: string
  updated_at: string
}

const memoryMatches = new Map<string, MatchRecord>()

function buildFallbackMatchAnalysis(params: {
  match_result: MatchResult
  score_analysis: ScoreAnalysis
  opponent_name_alias?: string | null
  ai_clarification: AIClarification
  match_conditions?: MatchConditions
  post_match_summary?: any
  knowledgeContext: any
}): { analysis: any; feedback: AIFeedback } {
  const score = params.score_analysis
  const kb = params.knowledgeContext || {}
  const post = params.post_match_summary || {}
  const losing = Array.isArray(post.losing_reasons) ? post.losing_reasons : []
  const scoring = Array.isArray(post.scoring_methods) ? post.scoring_methods : []
  const keyErrors = Array.isArray(post.key_point_error_reasons) ? post.key_point_error_reasons : []

  const failureLabel = kb?.failurePattern?.label || ''
  const failureFixes: string[] = Array.isArray(kb?.failurePattern?.fix) ? kb.failurePattern.fix : []
  const mentalLabel = kb?.mentalPattern?.label || ''
  const mentalFix = kb?.mentalPattern?.short_fix || ''
  const oppLabel = kb?.opponentMatch?.label || (params.opponent_name_alias ? `对手：${params.opponent_name_alias}` : '对手：未知')
  const oppHow = kb?.opponentMatch?.how_they_win || ''
  const oppTrap = kb?.opponentMatch?.your_trap || ''
  const oppMustDo: string[] = Array.isArray(kb?.opponentMatch?.must_do) ? kb.opponentMatch.must_do : []
  const oppMustAvoid: string[] = Array.isArray(kb?.opponentMatch?.must_avoid) ? kb.opponentMatch.must_avoid : []
  const drill = kb?.drill

  const rating =
    params.match_result === 'WIN' ? 'A' : params.match_result === 'LOSE' ? (score.collapsed_from_leading ? 'D' : 'C') : params.match_result === 'DRAW' ? 'B' : 'B'
  const ratingLabel = rating === 'A' ? '优势明显' : rating === 'B' ? '稳中有进' : rating === 'C' ? '有改进空间' : '需要补短板'

  const oneLiner = (() => {
    if (params.match_result === 'WIN') {
      return score.close_sets?.length ? '赢在关键分更稳，继续扩大优势套路' : '整体节奏掌控到位，优势点打穿了'
    }
    if (params.match_result === 'LOSE') {
      return score.collapsed_from_leading ? '领先后节奏断档，关键分处理需要一套固定脚本' : '被对手节奏牵着走，下次用明确战术先稳住'
    }
    return '训练记录已保存，先把可执行动作做出来'
  })()

  const improvPoint =
    failureLabel ||
    losing[0] ||
    keyErrors[0] ||
    (params.ai_clarification.selected_option ? `主要问题：${params.ai_clarification.selected_option}` : '主要问题：信息不足')
  const improvSuggestion =
    (failureFixes[0] ? `先做：${failureFixes[0]}` : '') ||
    (oppTrap ? `避免：${oppTrap}` : '') ||
    (keyErrors[0] ? `针对「${keyErrors[0]}」做 20 分钟固定球 + 落点约束` : '先求稳：每分先把球深度打出来，再谈主动得分')

  const drillText =
    drill
      ? {
          name: drill.label,
          description: drill.execution,
          duration: `${Number(drill.duration_minutes || 20)} 分钟`,
          targets: drill.target_issue || '稳定性'
        }
      : {
          name: '稳定性训练',
          description: '固定球 10 分钟（深度/高度），再加 10 分钟发球/接发第一拍（落点约束）',
          duration: '20 分钟',
          targets: '减少无谓失误'
        }

  const nextStrategy =
    params.ai_clarification.selected_option
      ? `围绕「${params.ai_clarification.selected_option}」做一个可重复的得分套路：先把球打深→逼出短球→再上手`
      : scoring[0]
        ? `继续放大「${scoring[0]}」这个得分方式，同时用深度把回合拉长`
        : '先稳住节奏：深度与高度优先，再找机会加速'

  const dos = [...oppMustDo.slice(0, 2), ...(failureFixes.slice(0, 1) || [])].filter(Boolean)
  const donts = [...oppMustAvoid.slice(0, 2), ...(oppTrap ? [oppTrap] : [])].filter(Boolean)
  const tags = [
    score.collapsed_from_leading ? '领先被逆转' : '',
    score.comeback_win ? '逆转取胜' : '',
    score.close_sets?.length ? `胶着盘：${score.close_sets.join('、')}` : ''
  ].filter(Boolean) as string[]

  const analysis = {
    overview: {
      rating,
      rating_label: ratingLabel,
      one_liner: oneLiner,
      tags
    },
    highlights: {
      title: '今天的亮点',
      items: [
        scoring[0]
          ? { emoji: '🔥', point: `得分方式：${scoring[0]}`, evidence: '从赛后总结提取；下次继续刻意放大' }
          : { emoji: '🧱', point: '稳定性是你的底盘', evidence: '先把深度/高度做出来，回合会自然变轻松' }
      ]
    },
    improvements: {
      title: '下次要注意',
      items: [{ emoji: '🎯', point: improvPoint, suggestion: improvSuggestion, priority: 'P0' }]
    },
    opponent_read: {
      title: '对手解读',
      summary: [oppLabel, oppHow ? `对方如何赢：${oppHow}` : '', oppTrap ? `你的陷阱：${oppTrap}` : ''].filter(Boolean).join('\n'),
      next_time_tip: nextStrategy
    },
    homework: {
      title: '练球作业',
      drills: [drillText]
    },
    next_match_tips: {
      title: '下次交手锦囊',
      strategy: nextStrategy,
      dos: dos.length ? dos : ['先把球打深', '关键分先求稳再上手'],
      donts: donts.length ? donts : ['不要无谓冒险', '不要被对方节奏带跑']
    }
  }

  const feedback: AIFeedback = {
    key_problem: `${improvPoint}\n→ ${improvSuggestion}`,
    next_tactic: nextStrategy,
    training_suggestion: `${drillText.name}：${drillText.description}（${drillText.duration}）`,
    condition_tip: params.match_conditions ? '结合比赛条件做微调（风大/炎热/疲劳）' : '',
    knowledge_used: {
      opponent_type_id: kb?.opponentMatch?.type_id,
      failure_pattern_id: kb?.failurePattern?.pattern_id,
      drill_id: kb?.drill?.drill_id,
      condition_pattern_id: kb?.conditionPattern?.condition_id
    },
    generated_at: new Date().toISOString()
  }

  if (mentalLabel || mentalFix) {
    analysis.improvements.items.push({
      emoji: '🧠',
      point: mentalLabel ? `心态模式：${mentalLabel}` : '心态模式',
      suggestion: mentalFix || '关键分固定呼吸节奏，先打高+深，稳定后再加速',
      priority: 'P1'
    })
  }

  return { analysis, feedback }
}

function includesAny(text: string, patterns: RegExp[]) {
  return patterns.some(p => p.test(text))
}

function generateClarification(input: {
  match_result: MatchResult
  match_type?: string
  most_painful_point?: string
  painful_scene_tag?: string | null
  opponent_tags?: string[]
  self_state_tags?: string[]
  match_conditions?: MatchConditions
}): AIClarification {
  const text = input.most_painful_point || ''
  const opponentTags = input.opponent_tags ?? []
  const selfTags = input.self_state_tags ?? []
  const weather = input.match_conditions?.weather || null

  const has = (tag: string) => opponentTags.includes(tag)
  const selfHas = (tag: string) => selfTags.includes(tag)

  if (input.match_type === 'DOUBLE' || input.match_type === 'doubles') {
    return {
      question: '今天双打的问题主要出在？',
      options: ['和搭档配合不默契', '自己负责的区域失误多', '对方某个人特别难对付'],
      skipped: false
    }
  }

  if (includesAny(text, [/领先/, /翻盘/, /被追/])) {
    return {
      question: '你领先后丢分，主要是？',
      options: ['自己失误增多（打太保守）', '对手突然打进，我没应对好', '体力下降，执行力跟不上'],
      skipped: false
    }
  }

  if (weather === 'windy' && input.match_result === 'LOSE') {
    return {
      question: '大风天输球主要问题是？',
      options: ['上旋球效果变差，经常出界', '对手切削在风中很难判断', '抛球不稳导致发球质量下降'],
      skipped: false
    }
  }

  if (has('发球好') && includesAny(text, [/接发/])) {
    return {
      question: '接发球问题，更像哪种？',
      options: ['站位偏后，被压底线角落', '接上去了但球太短被抢攻', '心理紧张，动作犹豫'],
      skipped: false
    }
  }

  if (selfHas('心态崩了')) {
    return {
      question: '心态崩掉是从什么时候？',
      options: ['关键分连续失误之后', '被对手从后面追分翻盘后', '一开始就没找到感觉'],
      skipped: false
    }
  }

  if (input.painful_scene_tag === '接发球完全被压制') {
    return {
      question: '接发球问题，更像哪种？',
      options: ['站位偏后，被压到底线角落', '接上去了但球太短被抢攻', '心理紧张，动作犹豫'],
      skipped: false
    }
  }

  if (has('打法稳') && input.match_result === 'LOSE') {
    return {
      question: '输给稳定型对手，你当时？',
      options: ['一直等他失误，他就不失误', '开始提高风险，反而失误更多', '知道要主动，但打不出主动球'],
      skipped: false
    }
  }

  return {
    question: '今天失分主要是哪种方式？',
    options: ['主动失误（自己出界/下网）', '被对手打得太被动', '关键分心态出了问题'],
    skipped: false
  }
}

function toMatchRecord(doc: any): MatchRecord {
  return {
    id: String(doc._id),
    user_id: doc.user_id,
    opponent_id: doc.opponent_id ? String(doc.opponent_id) : null,
    opponent_name_alias: doc.opponent_name_alias,
    match_result: doc.match_result,
    match_type: doc.match_type,
    score: doc.score,
    score_analysis: doc.score_analysis,
    most_painful_point: doc.most_painful_point,
    painful_scene_tag: doc.painful_scene_tag,
    opponent_tags: doc.opponent_tags,
    self_state_tags: doc.self_state_tags,
    tactics_used_tags: doc.tactics_used_tags,
    opponent_info: doc.opponent_info,
    opponent_ids: Array.isArray(doc.opponent_ids) ? doc.opponent_ids.map((x: any) => String(x)) : [],
    opponent_snapshots: doc.opponent_snapshots || [],
    my_info: doc.my_info,
    post_match_summary: doc.post_match_summary,
    partner_snapshot: doc.partner_snapshot,
    my_court_preference: doc.my_court_preference,
    practice_info: doc.practice_info,
    practice_summary: doc.practice_summary,
    match_conditions: doc.match_conditions,
    doubles_data: doc.doubles_data,
    ai_clarification: doc.ai_clarification,
    ai_feedback: doc.ai_feedback,
    ai_analysis: doc.ai_analysis,
    date_time: doc.date_time?.toISOString?.() || (doc.date_time ? new Date(doc.date_time).toISOString() : undefined),
    created_at: doc.created_at?.toISOString?.() || new Date(doc.created_at).toISOString(),
    updated_at: doc.updated_at?.toISOString?.() || new Date(doc.updated_at).toISOString()
  }
}

export async function createMatchRecord(dto: CreateMatchDTO, userId: string, redis?: any) {
  const now = new Date().toISOString()
  const id = randomUUID()
  const matchTypeRaw = dto.match_type || 'singles'
  const match_type = matchTypeRaw === 'DOUBLE' || matchTypeRaw === 'doubles' ? 'doubles' : 'singles'
  const isDoubles = match_type === 'doubles'
  const record_type = dto.match_result === 'PRACTICE' ? 'practice' : 'match'
  const opponent_snapshots =
    (Array.isArray((dto as any).opponent_snapshots) && (dto as any).opponent_snapshots.length
      ? ((dto as any).opponent_snapshots as any[])
      : dto.opponent_info
        ? [dto.opponent_info]
        : []) || []
  const opponent_ids = opponent_snapshots.map(o => o?.id).filter(Boolean)
  const scoreAnalysis = analyzeScore(dto.score, dto.match_result)
  const clarification = generateClarification({
    match_result: dto.match_result,
    match_type,
    most_painful_point: dto.most_painful_point,
    painful_scene_tag: dto.painful_scene_tag || null,
    opponent_tags: dto.opponent_tags as unknown as string[] | undefined,
    self_state_tags: dto.self_state_tags as unknown as string[] | undefined,
    match_conditions: dto.match_conditions
  })

  if (env.useInMemoryStore) {
    const record: MatchRecord = {
      id,
      user_id: userId,
      record_type: record_type as any,
      opponent_id: opponent_snapshots.length === 1 ? opponent_snapshots[0]?.id || null : null,
      opponent_name_alias: opponent_snapshots.length === 1 ? opponent_snapshots[0]?.name || dto.opponent_name_alias || null : null,
      match_result: dto.match_result,
      match_type,
      score: dto.score,
      score_analysis: scoreAnalysis,
      most_painful_point: dto.post_match_summary?.one_line_summary || dto.most_painful_point,
      painful_scene_tag: dto.painful_scene_tag || null,
      opponent_tags: dto.opponent_tags as unknown as string[] | undefined,
      self_state_tags: dto.self_state_tags as unknown as string[] | undefined,
      tactics_used_tags: dto.tactics_used_tags as unknown as string[] | undefined,
      opponent_info: opponent_snapshots.length === 1 ? opponent_snapshots[0] : undefined,
      opponent_ids,
      opponent_snapshots,
      my_info: dto.my_info,
      post_match_summary: dto.post_match_summary,
      partner_snapshot: (dto as any).partner_snapshot,
      my_court_preference: (dto as any).my_court_preference,
      match_conditions: dto.match_conditions,
      doubles_data: dto.doubles_data,
      practice_info: (dto as any).practice_info,
      practice_summary: (dto as any).practice_summary,
      date_time: dto.date_time || undefined,
      ai_clarification: {
        question: clarification.question,
        options: clarification.options,
        skipped: false
      },
      ai_feedback: null,
      created_at: now,
      updated_at: now
    }
    memoryMatches.set(id, record)

    for (const o of opponent_snapshots) {
      const alias = String(o?.name || '').trim()
      if (!alias) continue
      await upsertOpponentTraits({
        userId,
        opponent_name_alias: alias,
        play_style: o?.play_style || null,
        dominant_hand: o?.dominant_hand || null,
        main_weapons: o?.main_weapons || [],
        weaknesses: o?.weaknesses || [],
        clutch_tendency: o?.clutch_tendency || null,
        mobility: o?.mobility || [],
        last_match_date: new Date()
      })
      await enqueueOpponentRecalculate({ userId, opponentNameAlias: alias, redis })
      await enqueueIntelPreGenerate({ userId, opponentNameAlias: alias, redis })
    }

    if (isDoubles && (dto as any).partner_snapshot?.nickname) {
      await upsertPartnerProfile({
        userId,
        nickname: String((dto as any).partner_snapshot.nickname),
        play_style: (dto as any).partner_snapshot.play_style ?? null,
        main_weapons: (dto as any).partner_snapshot.main_weapons ?? [],
        weaknesses: (dto as any).partner_snapshot.weaknesses ?? [],
        court_preference: (dto as any).partner_snapshot.court_preference ?? null,
        physical_state: (dto as any).partner_snapshot.physical_state ?? null,
        last_match_date: new Date()
      })
    }

    await enqueueTrendDetect({ userId, redis })
    if (isDoubles) {
      await enqueueDoublesUpdate({ userId, redis })
    }
    return { match: record, clarification }
  }

  const created = await MatchModel.create({
    user_id: userId,
    record_type,
    opponent_id: opponent_snapshots.length === 1 ? opponent_snapshots[0]?.id || null : null,
    opponent_name_alias: opponent_snapshots.length === 1 ? opponent_snapshots[0]?.name || dto.opponent_name_alias || null : null,
    match_result: dto.match_result,
    match_type,
    score: dto.score || undefined,
    score_analysis: scoreAnalysis,
    most_painful_point: dto.post_match_summary?.one_line_summary || dto.most_painful_point || null,
    painful_scene_tag: dto.painful_scene_tag || null,
    opponent_tags: dto.opponent_tags || [],
    self_state_tags: dto.self_state_tags || [],
    tactics_used_tags: dto.tactics_used_tags || [],
    opponent_info: opponent_snapshots.length === 1 ? opponent_snapshots[0] : undefined,
    opponent_ids: opponent_ids.length ? opponent_ids : undefined,
    opponent_snapshots: opponent_snapshots.length ? opponent_snapshots : undefined,
    my_info: dto.my_info || undefined,
    post_match_summary: dto.post_match_summary || undefined,
    partner_snapshot: (dto as any).partner_snapshot || undefined,
    my_court_preference: (dto as any).my_court_preference || undefined,
    match_conditions: dto.match_conditions || undefined,
    doubles_data: dto.doubles_data || undefined,
    practice_info: (dto as any).practice_info || undefined,
    practice_summary: (dto as any).practice_summary || undefined,
    date_time: dto.date_time ? new Date(dto.date_time) : undefined,
    ai_clarification: {
      question: clarification.question,
      options: clarification.options,
      skipped: false
    }
  })

  for (const o of opponent_snapshots) {
    const alias = String(o?.name || '').trim()
    if (!alias) continue
    await upsertOpponentTraits({
      userId,
      opponent_name_alias: alias,
      play_style: o?.play_style || null,
      dominant_hand: o?.dominant_hand || null,
      main_weapons: o?.main_weapons || [],
      weaknesses: o?.weaknesses || [],
      clutch_tendency: o?.clutch_tendency || null,
      mobility: o?.mobility || [],
      last_match_date: new Date()
    })
    await enqueueOpponentRecalculate({ userId, opponentNameAlias: alias, redis })
    await enqueueIntelPreGenerate({ userId, opponentNameAlias: alias, redis })
  }

  if (isDoubles && (dto as any).partner_snapshot?.nickname) {
    await upsertPartnerProfile({
      userId,
      nickname: String((dto as any).partner_snapshot.nickname),
      play_style: (dto as any).partner_snapshot.play_style ?? null,
      main_weapons: (dto as any).partner_snapshot.main_weapons ?? [],
      weaknesses: (dto as any).partner_snapshot.weaknesses ?? [],
      court_preference: (dto as any).partner_snapshot.court_preference ?? null,
      physical_state: (dto as any).partner_snapshot.physical_state ?? null,
      last_match_date: new Date()
    })
  }

  await enqueueTrendDetect({ userId, redis })
  if (isDoubles) {
    await enqueueDoublesUpdate({ userId, redis })
  }

  return { match: toMatchRecord(created), clarification }
}

export async function submitClarification(params: {
  matchId: string
  userId: string
  input: SubmitClarificationDTO
  redis?: any
}) {
  const legacyFromAnalysis = (analysis: any): AIFeedback => {
    const firstImprove = analysis?.improvements?.items?.[0]
    const nextTip = analysis?.next_match_tips?.strategy || analysis?.opponent_read?.next_time_tip || ''
    const drills = Array.isArray(analysis?.homework?.drills) ? analysis.homework.drills : []
    const training = drills
      .slice(0, 2)
      .map((d: any) => `${d.name || ''}：${d.description || ''}（${d.duration || ''}）`)
      .filter(Boolean)
      .join('\n')
    return {
      key_problem: firstImprove ? `${firstImprove.point}\n→ ${firstImprove.suggestion}` : '',
      next_tactic: nextTip || '',
      training_suggestion: training || '',
      condition_tip: '',
      knowledge_used: {},
      generated_at: new Date().toISOString()
    }
  }

  if (env.useInMemoryStore) {
    const record = memoryMatches.get(params.matchId)
    if (!record || record.user_id !== params.userId) return null

    reportDebugEvent({
      runId: 'pre-fix',
      hypothesisId: 'H3',
      location: 'server/modules/match/match.service.ts:submitClarification:memory:begin',
      msg: 'submitClarification begin',
      data: {
        matchId: params.matchId,
        skipped: Boolean(params.input.skipped),
        hasSelected: Boolean(params.input.selected_option),
        opponentAlias: record.opponent_name_alias || null
      }
    })

    const aiClarification: AIClarification = {
      question: record.ai_clarification?.question || '',
      options: record.ai_clarification?.options || [],
      selected_option: params.input.selected_option,
      skipped: params.input.skipped
    }

    const scoreAnalysis =
      record.score_analysis && typeof (record.score_analysis as any).total_sets === 'number'
        ? record.score_analysis
        : analyzeScore((record as any).score, record.match_result)
    record.score_analysis = scoreAnalysis
    const knowledgeContext = buildKnowledgeContext({
      opponent_tags: record.opponent_tags,
      self_state_tags: record.self_state_tags,
      most_painful_point: record.most_painful_point,
      painful_scene_tag: record.painful_scene_tag || undefined,
      match_result: record.match_result,
      score_analysis: scoreAnalysis,
      ai_clarification: aiClarification,
      match_conditions: record.match_conditions
    })

    const prompt = buildMatchFeedbackPrompt({
      matchData: {
        match_result: record.match_result,
        match_type: record.match_type,
        score: record.score as any,
        match_date: record.date_time || record.created_at,
        most_painful_point: record.most_painful_point,
        painful_scene_tag: record.painful_scene_tag || undefined,
        opponent_tags: record.opponent_tags,
        self_state_tags: record.self_state_tags,
        tactics_used_tags: record.tactics_used_tags,
        ai_clarification: aiClarification,
        match_conditions: record.match_conditions,
        opponent_info: (record as any).opponent_info,
        opponent_snapshots: (record as any).opponent_snapshots,
        my_info: (record as any).my_info,
        post_match_summary: (record as any).post_match_summary,
        partner_snapshot: (record as any).partner_snapshot,
        my_court_preference: (record as any).my_court_preference
      },
      scoreAnalysis,
      knowledgeContext,
      h2h: (() => {
        const alias = record.opponent_name_alias || ''
        if (!alias) return null
        const matches = Array.from(memoryMatches.values())
          .filter(m => m.user_id === params.userId && (m.opponent_name_alias || '') === alias)
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
          .slice(0, 5)
        if (matches.length < 2) return null
        const wins = matches.filter(m => m.match_result === 'WIN').length
        const losses = matches.filter(m => m.match_result === 'LOSE').length
        const draws = matches.filter(m => m.match_result === 'DRAW').length
        return {
          opponent_name_alias: alias,
          wins,
          losses,
          draws,
          matches: matches.map(m => ({
            date: (m.date_time || m.created_at || '').slice(0, 10),
            score: m.score_analysis?.score_summary || '',
            scoring: (m as any).post_match_summary?.scoring_methods || [],
            losing: (m as any).post_match_summary?.losing_reasons || []
          }))
        }
      })()
    })

    const o1 = (record as any)?.opponent_snapshots?.[0] || (record as any)?.opponent_info || null
    const hasScore = Boolean((record as any)?.score_analysis?.total_sets) && String((record as any)?.score_analysis?.score_summary || '').trim().length > 0
    const hasOpponentStyle = Boolean(String(o1?.play_style || '').trim())
    const hasMyStyle = Boolean(String((record as any)?.my_info?.play_style || '').trim())
    const hasScoringSummary = Array.isArray((record as any)?.post_match_summary?.scoring_methods) && (record as any).post_match_summary.scoring_methods.length > 0
    const hasLosingSummary = Array.isArray((record as any)?.post_match_summary?.losing_reasons) && (record as any).post_match_summary.losing_reasons.length > 0

    let analysis: any = null
    let feedback: AIFeedback | null = null
    try {
      analysis = await generateMatchAnalysis({
        prompt,
        redis: params.redis,
        guardrails: {
          hasScore,
          hasOpponentStyle,
          hasMyStyle,
          hasScoringSummary,
          hasLosingSummary,
          allowHomeworkPadding: hasScore && hasScoringSummary && hasLosingSummary
        }
      })
      feedback = legacyFromAnalysis(analysis)
    } catch (e: any) {
      const fb = buildFallbackMatchAnalysis({
        match_result: record.match_result,
        score_analysis: scoreAnalysis,
        opponent_name_alias: record.opponent_name_alias,
        ai_clarification: aiClarification,
        match_conditions: record.match_conditions,
        post_match_summary: (record as any).post_match_summary,
        knowledgeContext
      })
      analysis = fb.analysis
      feedback = fb.feedback
    }

    record.ai_clarification = aiClarification
    ;(record as any).ai_analysis = { version: 'v3.1', match_analysis: analysis, generated_at: new Date().toISOString() }
    record.ai_feedback = feedback
    record.updated_at = new Date().toISOString()
    memoryMatches.set(record.id, record)

    reportDebugEvent({
      runId: 'pre-fix',
      hypothesisId: 'H3',
      location: 'server/modules/match/match.service.ts:submitClarification:memory:done',
      msg: 'submitClarification done',
      data: {
        matchId: record.id,
        hasAnalysis: Boolean((record as any).ai_analysis?.match_analysis),
        rating: (record as any).ai_analysis?.match_analysis?.overview?.rating || null
      }
    })

    return record
  }

  const found = await MatchModel.findOne({ _id: params.matchId, user_id: params.userId })
  if (!found) return null

  found.ai_clarification = {
    question: found.ai_clarification?.question || '',
    options: found.ai_clarification?.options || [],
    selected_option: params.input.selected_option || null,
    skipped: params.input.skipped
  }

  const scoreAnalysis =
    found.score_analysis && typeof (found.score_analysis as any).total_sets === 'number'
      ? (found.score_analysis as any)
      : analyzeScore((found.score as any) || undefined, found.match_result as any)
  ;(found as any).score_analysis = scoreAnalysis
  const knowledgeContext = buildKnowledgeContext({
    opponent_tags: found.opponent_tags,
    self_state_tags: found.self_state_tags,
    most_painful_point: found.most_painful_point,
    painful_scene_tag: found.painful_scene_tag || undefined,
    match_result: found.match_result,
    score_analysis: scoreAnalysis,
    ai_clarification: found.ai_clarification as any,
    match_conditions: found.match_conditions
  })

  const prompt = buildMatchFeedbackPrompt({
    matchData: {
      match_result: found.match_result,
      match_type: found.match_type,
      score: found.score as any,
      match_date: (found.date_time ? new Date(found.date_time as any).toISOString() : '') || (found.created_at ? new Date(found.created_at as any).toISOString() : ''),
      most_painful_point: found.most_painful_point,
      painful_scene_tag: found.painful_scene_tag || undefined,
      opponent_tags: found.opponent_tags,
      self_state_tags: found.self_state_tags,
      tactics_used_tags: found.tactics_used_tags,
      ai_clarification: found.ai_clarification as any,
      match_conditions: found.match_conditions,
      opponent_info: (found as any).opponent_info,
      opponent_snapshots: (found as any).opponent_snapshots,
      my_info: (found as any).my_info,
      post_match_summary: (found as any).post_match_summary,
      partner_snapshot: (found as any).partner_snapshot,
      my_court_preference: (found as any).my_court_preference
    },
    scoreAnalysis,
    knowledgeContext,
    h2h: await (async () => {
      const alias = String(found.opponent_name_alias || '')
      if (!alias) return null
      const matches = (await listMatchesByOpponent(params.userId, alias))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 5)
      if (matches.length < 2) return null
      const wins = matches.filter(m => m.match_result === 'WIN').length
      const losses = matches.filter(m => m.match_result === 'LOSE').length
      const draws = matches.filter(m => m.match_result === 'DRAW').length
      return {
        opponent_name_alias: alias,
        wins,
        losses,
        draws,
        matches: matches.map(m => ({
          date: (m.date_time || m.created_at || '').slice(0, 10),
          score: m.score_analysis?.score_summary || '',
          scoring: m.post_match_summary?.scoring_methods || [],
          losing: m.post_match_summary?.losing_reasons || []
        }))
      }
    })()
  })

  const o1 = (found as any)?.opponent_snapshots?.[0] || (found as any)?.opponent_info || null
  const hasScore = Boolean(found.score_analysis?.total_sets) && String(found.score_analysis?.score_summary || '').trim().length > 0
  const hasOpponentStyle = Boolean(String(o1?.play_style || '').trim())
  const hasMyStyle = Boolean(String((found as any)?.my_info?.play_style || '').trim())
  const hasScoringSummary = Array.isArray((found as any)?.post_match_summary?.scoring_methods) && (found as any).post_match_summary.scoring_methods.length > 0
  const hasLosingSummary = Array.isArray((found as any)?.post_match_summary?.losing_reasons) && (found as any).post_match_summary.losing_reasons.length > 0

  let analysis: any = null
  let feedback: AIFeedback | null = null
  try {
    analysis = await generateMatchAnalysis({
      prompt,
      redis: params.redis,
      guardrails: {
        hasScore,
        hasOpponentStyle,
        hasMyStyle,
        hasScoringSummary,
        hasLosingSummary,
        allowHomeworkPadding: hasScore && hasScoringSummary && hasLosingSummary
      }
    })
    feedback = legacyFromAnalysis(analysis)
  } catch (e: any) {
    const fb = buildFallbackMatchAnalysis({
      match_result: found.match_result,
      score_analysis: scoreAnalysis,
      opponent_name_alias: found.opponent_name_alias,
      ai_clarification: found.ai_clarification as any,
      match_conditions: found.match_conditions,
      post_match_summary: (found as any).post_match_summary,
      knowledgeContext
    })
    analysis = fb.analysis
    feedback = fb.feedback
  }
  found.ai_feedback = feedback as any
  ;(found as any).ai_analysis = { version: 'v3.1', match_analysis: analysis, generated_at: new Date() }
  await found.save()

  return toMatchRecord(found)
}

export async function regenerateMatchAnalysis(params: { matchId: string; userId: string; redis?: any }) {
  try {
  const legacyFromAnalysis = (analysis: any): AIFeedback => {
    const firstImprove = analysis?.improvements?.items?.[0]
    const nextTip = analysis?.next_match_tips?.strategy || analysis?.opponent_read?.next_time_tip || ''
    const drills = Array.isArray(analysis?.homework?.drills) ? analysis.homework.drills : []
    const training = drills
      .slice(0, 2)
      .map((d: any) => `${d.name || ''}：${d.description || ''}（${d.duration || ''}）`)
      .filter(Boolean)
      .join('\n')
    return {
      key_problem: firstImprove ? `${firstImprove.point}\n→ ${firstImprove.suggestion}` : '',
      next_tactic: nextTip || '',
      training_suggestion: training || '',
      condition_tip: '',
      knowledge_used: {},
      generated_at: new Date().toISOString()
    }
  }

  if (env.useInMemoryStore) {
    const record = memoryMatches.get(params.matchId)
    if (!record || record.user_id !== params.userId) return null

    const aiClarification: AIClarification = {
      question: record.ai_clarification?.question || '',
      options: record.ai_clarification?.options || [],
      selected_option: (record.ai_clarification as any)?.selected_option || null,
      skipped: Boolean((record.ai_clarification as any)?.skipped) || !Boolean((record.ai_clarification as any)?.selected_option)
    }
    record.ai_clarification = aiClarification

    const scoreAnalysis =
      record.score_analysis && typeof (record.score_analysis as any).total_sets === 'number'
        ? record.score_analysis
        : analyzeScore((record as any).score, record.match_result)
    record.score_analysis = scoreAnalysis
    const knowledgeContext = buildKnowledgeContext({
      opponent_tags: record.opponent_tags,
      self_state_tags: record.self_state_tags,
      most_painful_point: record.most_painful_point,
      painful_scene_tag: record.painful_scene_tag || undefined,
      match_result: record.match_result,
      score_analysis: scoreAnalysis,
      ai_clarification: aiClarification,
      match_conditions: record.match_conditions
    })

    const prompt = buildMatchFeedbackPrompt({
      matchData: {
        match_result: record.match_result,
        match_type: record.match_type,
        score: record.score as any,
        match_date: record.date_time || record.created_at,
        most_painful_point: record.most_painful_point,
        painful_scene_tag: record.painful_scene_tag || undefined,
        opponent_tags: record.opponent_tags,
        self_state_tags: record.self_state_tags,
        tactics_used_tags: record.tactics_used_tags,
        ai_clarification: aiClarification,
        match_conditions: record.match_conditions,
        opponent_info: (record as any).opponent_info,
        opponent_snapshots: (record as any).opponent_snapshots,
        my_info: (record as any).my_info,
        post_match_summary: (record as any).post_match_summary,
        partner_snapshot: (record as any).partner_snapshot,
        my_court_preference: (record as any).my_court_preference
      },
      scoreAnalysis,
      knowledgeContext,
      h2h: (() => {
        const alias = record.opponent_name_alias || ''
        if (!alias) return null
        const matches = Array.from(memoryMatches.values())
          .filter(m => m.user_id === params.userId && (m.opponent_name_alias || '') === alias)
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
          .slice(0, 5)
        if (matches.length < 2) return null
        const wins = matches.filter(m => m.match_result === 'WIN').length
        const losses = matches.filter(m => m.match_result === 'LOSE').length
        const draws = matches.filter(m => m.match_result === 'DRAW').length
        return {
          opponent_name_alias: alias,
          wins,
          losses,
          draws,
          matches: matches.map(m => ({
            date: (m.date_time || m.created_at || '').slice(0, 10),
            score: m.score_analysis?.score_summary || '',
            scoring: (m as any).post_match_summary?.scoring_methods || [],
            losing: (m as any).post_match_summary?.losing_reasons || []
          }))
        }
      })()
    })

    const o1 = (record as any)?.opponent_snapshots?.[0] || (record as any)?.opponent_info || null
    const hasScore = Boolean((record as any)?.score_analysis?.total_sets) && String((record as any)?.score_analysis?.score_summary || '').trim().length > 0
    const hasOpponentStyle = Boolean(String(o1?.play_style || '').trim())
    const hasMyStyle = Boolean(String((record as any)?.my_info?.play_style || '').trim())
    const hasScoringSummary = Array.isArray((record as any)?.post_match_summary?.scoring_methods) && (record as any).post_match_summary.scoring_methods.length > 0
    const hasLosingSummary = Array.isArray((record as any)?.post_match_summary?.losing_reasons) && (record as any).post_match_summary.losing_reasons.length > 0

    let analysis: any = null
    try {
      analysis = await generateMatchAnalysis({
        prompt,
        redis: params.redis,
        noCache: true,
        guardrails: {
          hasScore,
          hasOpponentStyle,
          hasMyStyle,
          hasScoringSummary,
          hasLosingSummary,
          allowHomeworkPadding: hasScore && hasScoringSummary && hasLosingSummary
        }
      })
    } catch {
      const fb = buildFallbackMatchAnalysis({
        match_result: record.match_result,
        score_analysis: scoreAnalysis,
        opponent_name_alias: record.opponent_name_alias,
        ai_clarification: aiClarification,
        match_conditions: record.match_conditions,
        post_match_summary: (record as any).post_match_summary,
        knowledgeContext
      })
      analysis = fb.analysis
    }
    const feedback = legacyFromAnalysis(analysis)
    ;(record as any).ai_analysis = {
      version: 'v3.1',
      match_analysis: analysis,
      generated_at: new Date().toISOString()
    }
    record.ai_feedback = feedback
    record.updated_at = new Date().toISOString()
    memoryMatches.set(record.id, record)
    return record
  }

  const found = await MatchModel.findOne({ _id: params.matchId, user_id: params.userId })
  if (!found) return null

  found.ai_clarification = {
    question: found.ai_clarification?.question || '',
    options: found.ai_clarification?.options || [],
    selected_option: (found.ai_clarification as any)?.selected_option || null,
    skipped: Boolean((found.ai_clarification as any)?.skipped) || !Boolean((found.ai_clarification as any)?.selected_option)
  }

  const scoreAnalysis =
    found.score_analysis && typeof (found.score_analysis as any).total_sets === 'number'
      ? (found.score_analysis as any)
      : analyzeScore((found.score as any) || undefined, found.match_result as any)
  ;(found as any).score_analysis = scoreAnalysis
  const knowledgeContext = buildKnowledgeContext({
    opponent_tags: found.opponent_tags,
    self_state_tags: found.self_state_tags,
    most_painful_point: found.most_painful_point,
    painful_scene_tag: found.painful_scene_tag || undefined,
    match_result: found.match_result,
    score_analysis: scoreAnalysis,
    ai_clarification: found.ai_clarification as any,
    match_conditions: found.match_conditions
  })

  const prompt = buildMatchFeedbackPrompt({
    matchData: {
      match_result: found.match_result,
      match_type: found.match_type,
      score: found.score as any,
      match_date: (found.date_time ? new Date(found.date_time as any).toISOString() : '') || (found.created_at ? new Date(found.created_at as any).toISOString() : ''),
      most_painful_point: found.most_painful_point,
      painful_scene_tag: found.painful_scene_tag || undefined,
      opponent_tags: found.opponent_tags,
      self_state_tags: found.self_state_tags,
      tactics_used_tags: found.tactics_used_tags,
      ai_clarification: found.ai_clarification as any,
      match_conditions: found.match_conditions,
      opponent_info: (found as any).opponent_info,
      opponent_snapshots: (found as any).opponent_snapshots,
      my_info: (found as any).my_info,
      post_match_summary: (found as any).post_match_summary,
      partner_snapshot: (found as any).partner_snapshot,
      my_court_preference: (found as any).my_court_preference
    },
    scoreAnalysis,
    knowledgeContext,
    h2h: await (async () => {
      const alias = String(found.opponent_name_alias || '')
      if (!alias) return null
      const matches = (await listMatchesByOpponent(params.userId, alias))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 5)
      if (matches.length < 2) return null
      const wins = matches.filter(m => m.match_result === 'WIN').length
      const losses = matches.filter(m => m.match_result === 'LOSE').length
      const draws = matches.filter(m => m.match_result === 'DRAW').length
      return {
        opponent_name_alias: alias,
        wins,
        losses,
        draws,
        matches: matches.map(m => ({
          date: (m.date_time || m.created_at || '').slice(0, 10),
          score: m.score_analysis?.score_summary || '',
          scoring: m.post_match_summary?.scoring_methods || [],
          losing: m.post_match_summary?.losing_reasons || []
        }))
      }
    })()
  })

  const o1 = (found as any)?.opponent_snapshots?.[0] || (found as any)?.opponent_info || null
  const hasScore = Boolean(found.score_analysis?.total_sets) && String(found.score_analysis?.score_summary || '').trim().length > 0
  const hasOpponentStyle = Boolean(String(o1?.play_style || '').trim())
  const hasMyStyle = Boolean(String((found as any)?.my_info?.play_style || '').trim())
  const hasScoringSummary = Array.isArray((found as any)?.post_match_summary?.scoring_methods) && (found as any).post_match_summary.scoring_methods.length > 0
  const hasLosingSummary = Array.isArray((found as any)?.post_match_summary?.losing_reasons) && (found as any).post_match_summary.losing_reasons.length > 0

  let analysis: any = null
  try {
    analysis = await generateMatchAnalysis({
      prompt,
      redis: params.redis,
      noCache: true,
      guardrails: {
        hasScore,
        hasOpponentStyle,
        hasMyStyle,
        hasScoringSummary,
        hasLosingSummary,
        allowHomeworkPadding: hasScore && hasScoringSummary && hasLosingSummary
      }
    })
  } catch {
    const fb = buildFallbackMatchAnalysis({
      match_result: found.match_result,
      score_analysis: scoreAnalysis,
      opponent_name_alias: found.opponent_name_alias,
      ai_clarification: found.ai_clarification as any,
      match_conditions: found.match_conditions,
      post_match_summary: (found as any).post_match_summary,
      knowledgeContext
    })
    analysis = fb.analysis
  }
  found.ai_feedback = legacyFromAnalysis(analysis) as any
  ;(found as any).ai_analysis = {
    version: 'v3.1',
    match_analysis: analysis,
    generated_at: new Date()
  }
  await found.save()
  return toMatchRecord(found)
  } catch (e: any) {
    if (e instanceof AppError) throw e
    throw new AppError(e?.message || 'AI 重新生成失败', 502, 'AI_REGENERATE_FAILED')
  }
}

export async function getMatchById(matchId: string, userId: string) {
  if (env.useInMemoryStore) {
    const record = memoryMatches.get(matchId)
    if (!record || record.user_id !== userId) return null
    return record
  }
  const found = await MatchModel.findOne({ _id: matchId, user_id: userId })
  if (!found) return null
  return toMatchRecord(found)
}

export async function listMatches(userId: string, limit = 20, offset = 0): Promise<MatchRecord[]> {
  if (env.useInMemoryStore) {
    return Array.from(memoryMatches.values())
      .filter(m => m.user_id === userId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(offset, offset + limit)
  }

  const docs = await MatchModel.find({ user_id: userId })
    .sort({ date_time: -1, created_at: -1 })
    .skip(offset)
    .limit(limit)

  return docs.map(toMatchRecord)
}

export async function listMatchesByOpponent(userId: string, opponentNameAlias: string): Promise<MatchRecord[]> {
  const all = await listMatches(userId, 1000, 0)
  return all.filter((m: MatchRecord) => (m.opponent_name_alias || '') === opponentNameAlias)
}

function matchIncludesOpponentAlias(record: any, opponentNameAlias: string) {
  const alias = String(opponentNameAlias || '')
  if (!alias) return false
  if (String(record?.opponent_name_alias || '') === alias) return true
  const snaps = (record as any)?.opponent_snapshots
  if (Array.isArray(snaps) && snaps.length) {
    return snaps.some((s: any) => String(s?.name || '') === alias)
  }
  return false
}

export async function listRecentMatchesByOpponent(params: { userId: string; opponentNameAlias: string; limit?: number }) {
  const alias = String(params.opponentNameAlias || '').trim()
  const limit = Math.min(20, Math.max(1, Number(params.limit || 5)))
  if (!alias) return [] as MatchRecord[]

  if (env.useInMemoryStore) {
    return Array.from(memoryMatches.values())
      .filter(m => m.user_id === params.userId && matchIncludesOpponentAlias(m, alias))
      .sort((a, b) => {
        const ad = new Date((a.date_time || a.created_at) as any).getTime()
        const bd = new Date((b.date_time || b.created_at) as any).getTime()
        return bd - ad
      })
      .slice(0, limit)
  }

  const docs = await MatchModel.find({
    user_id: params.userId,
    $or: [{ opponent_name_alias: alias }, { 'opponent_snapshots.name': alias }]
  })
    .sort({ date_time: -1, created_at: -1 })
    .limit(limit)

  return docs.map(toMatchRecord)
}

export async function deleteMatchById(params: { userId: string; matchId: string; redis?: any }) {
  if (env.useInMemoryStore) {
    const record = memoryMatches.get(params.matchId)
    if (!record || record.user_id !== params.userId) return null
    memoryMatches.delete(params.matchId)
    const aliases = new Set<string>()
    if (record.opponent_name_alias) aliases.add(String(record.opponent_name_alias))
    for (const s of ((record as any).opponent_snapshots || []) as any[]) {
      const a = String(s?.name || '').trim()
      if (a) aliases.add(a)
    }
    for (const alias of aliases) {
      await enqueueOpponentRecalculate({ userId: params.userId, opponentNameAlias: alias, redis: params.redis })
      await enqueueIntelPreGenerate({ userId: params.userId, opponentNameAlias: alias, redis: params.redis })
    }
    await enqueueTrendDetect({ userId: params.userId, redis: params.redis })
    if (String(record.match_type || '').toLowerCase() === 'doubles') {
      await enqueueDoublesUpdate({ userId: params.userId, redis: params.redis })
    }
    return record
  }

  const found = await MatchModel.findOne({ _id: params.matchId, user_id: params.userId })
  if (!found) return null
  const record = toMatchRecord(found)
  await MatchModel.deleteOne({ _id: params.matchId, user_id: params.userId })

  const aliases = new Set<string>()
  if (record.opponent_name_alias) aliases.add(String(record.opponent_name_alias))
  for (const s of (record.opponent_snapshots || []) as any[]) {
    const a = String((s as any)?.name || '').trim()
    if (a) aliases.add(a)
  }
  for (const alias of aliases) {
    await enqueueOpponentRecalculate({ userId: params.userId, opponentNameAlias: alias, redis: params.redis })
    await enqueueIntelPreGenerate({ userId: params.userId, opponentNameAlias: alias, redis: params.redis })
  }
  await enqueueTrendDetect({ userId: params.userId, redis: params.redis })
  if (String(record.match_type || '').toLowerCase() === 'doubles') {
    await enqueueDoublesUpdate({ userId: params.userId, redis: params.redis })
  }
  return record
}

export async function deleteMatchesByOpponentAlias(params: { userId: string; opponentNameAlias: string; redis?: any }) {
  const alias = String(params.opponentNameAlias || '').trim()
  if (!alias) return { deleted: 0 }
  if (env.useInMemoryStore) {
    let deleted = 0
    for (const [id, rec] of Array.from(memoryMatches.entries())) {
      if (rec.user_id !== params.userId) continue
      if (!matchIncludesOpponentAlias(rec, alias)) continue
      memoryMatches.delete(id)
      deleted += 1
    }
    await enqueueTrendDetect({ userId: params.userId, redis: params.redis })
    await enqueueOpponentRecalculate({ userId: params.userId, opponentNameAlias: alias, redis: params.redis })
    await enqueueIntelPreGenerate({ userId: params.userId, opponentNameAlias: alias, redis: params.redis })
    return { deleted }
  }

  const res = await MatchModel.deleteMany({
    user_id: params.userId,
    $or: [{ opponent_name_alias: alias }, { 'opponent_snapshots.name': alias }]
  })
  await enqueueTrendDetect({ userId: params.userId, redis: params.redis })
  await enqueueOpponentRecalculate({ userId: params.userId, opponentNameAlias: alias, redis: params.redis })
  await enqueueIntelPreGenerate({ userId: params.userId, opponentNameAlias: alias, redis: params.redis })
  return { deleted: Number((res as any)?.deletedCount || 0) }
}

export async function setMatchFeedbackFlag(params: { matchId: string; userId: string; is_helpful: boolean }) {
  if (env.useInMemoryStore) {
    const record = memoryMatches.get(params.matchId)
    if (!record || record.user_id !== params.userId) return null
    if (!record.ai_feedback) record.ai_feedback = null
    if (record.ai_feedback) record.ai_feedback.is_helpful = params.is_helpful
    record.updated_at = new Date().toISOString()
    memoryMatches.set(record.id, record)
    return record
  }

  const found = await MatchModel.findOne({ _id: params.matchId, user_id: params.userId })
  if (!found) return null
  if (!found.ai_feedback) found.ai_feedback = {} as any
  found.ai_feedback.is_helpful = params.is_helpful
  await found.save()
  return toMatchRecord(found)
}
