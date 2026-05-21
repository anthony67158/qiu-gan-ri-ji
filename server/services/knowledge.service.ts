import fs from 'fs'
import path from 'path'
import { AIClarification, MatchConditions, MatchResult, ScoreAnalysis } from '../../shared/types'

export type OpponentTypeItem = {
  type_id: string
  label: string
  tags_combination: string[]
  how_they_win: string
  your_trap: string
  must_do: string[]
  must_avoid: string[]
  training_focus: string
}

export type FailurePatternItem = {
  pattern_id: string
  label: string
  trigger: {
    keywords?: string[]
    opponent_tags?: string[]
    self_state_tags?: string[]
    painful_scene_tags?: string[]
    match_conditions?: Partial<MatchConditions>
    match_result?: MatchResult[]
    score_flags?: (keyof ScoreAnalysis)[]
    min_sets?: number
  }
  psychological_root: string
  tactical_consequence: string
  fix: string[]
  drill_id?: string
}

export type TrainingDrillItem = {
  drill_id: string
  label: string
  target_issue: string
  duration_minutes: number
  execution: string
  key_reminder: string
  no_partner_alternative?: string
}

export type MentalPatternItem = {
  mental_id: string
  label: string
  trigger_tags: string[]
  what_happens_physically: string
  short_fix: string
  avoid?: string[]
}

export type ConditionPatternItem = {
  condition_id: string
  condition: string
  impact: string
  adjustment: string
  match_conditions: Partial<MatchConditions>
}

export type KnowledgeBase = {
  opponent_types: OpponentTypeItem[]
  failure_patterns: FailurePatternItem[]
  training_drills: TrainingDrillItem[]
  mental_patterns: MentalPatternItem[]
  condition_patterns: ConditionPatternItem[]
}

export type KnowledgeContext = {
  opponentMatch: OpponentTypeItem | null
  failurePattern: FailurePatternItem | null
  mentalPattern: MentalPatternItem | null
  conditionPattern: ConditionPatternItem | null
  drill: TrainingDrillItem | null
}

let cached: KnowledgeBase | null = null

function readJson<T>(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

export function loadKnowledgeBase() {
  if (cached) return cached

  const dir = path.join(process.cwd(), 'server', 'knowledge', 'v1')
  cached = {
    opponent_types: readJson<OpponentTypeItem[]>(path.join(dir, 'opponent_types.json')),
    failure_patterns: readJson<FailurePatternItem[]>(path.join(dir, 'failure_patterns.json')),
    training_drills: readJson<TrainingDrillItem[]>(path.join(dir, 'training_drills.json')),
    mental_patterns: readJson<MentalPatternItem[]>(path.join(dir, 'mental_patterns.json')),
    condition_patterns: readJson<ConditionPatternItem[]>(path.join(dir, 'condition_patterns.json'))
  }
  return cached
}

export function matchOpponentType(tags: string[] | undefined, items: OpponentTypeItem[]) {
  const t = tags ?? []
  if (t.length === 0) return null

  let best: { item: OpponentTypeItem; ratio: number } | null = null
  for (const item of items) {
    const needed = item.tags_combination
    const hit = needed.filter(tag => t.includes(tag)).length
    const ratio = needed.length === 0 ? 0 : hit / needed.length
    // 提高匹配阈值到60%，确保匹配更精准，避免宽泛匹配
    if (ratio >= 0.6 && (!best || ratio > best.ratio)) {
      best = { item, ratio }
    }
  }

  return best?.item ?? null
}

function keywordHit(text: string, keywords: string[]) {
  return keywords.some(k => text.includes(k))
}

export function detectFailurePattern(input: {
  self_state_tags?: string[]
  opponent_tags?: string[]
  most_painful_point?: string
  painful_scene_tag?: string
  match_conditions?: MatchConditions
  match_result: MatchResult
  score_analysis: ScoreAnalysis
  ai_clarification?: AIClarification
}, items: FailurePatternItem[]) {
  const text = input.most_painful_point || ''
  const selfTags = input.self_state_tags ?? []
  const oppTags = input.opponent_tags ?? []
  const sceneTag = input.painful_scene_tag
  const conditions = input.match_conditions

  const candidates = items.filter(item => {
    const t = item.trigger
    if (t.match_result && !t.match_result.includes(input.match_result)) return false
    if (t.min_sets && input.score_analysis.total_sets < t.min_sets) return false
    if (t.opponent_tags && !t.opponent_tags.every(tag => oppTags.includes(tag))) return false
    if (t.self_state_tags && !t.self_state_tags.every(tag => selfTags.includes(tag))) return false
    if (t.score_flags) {
      for (const flag of t.score_flags) {
        const v = (input.score_analysis as any)[flag]
        if (!v) return false
      }
    }
    if (t.painful_scene_tags && (!sceneTag || !t.painful_scene_tags.includes(sceneTag))) return false
    if (t.match_conditions) {
      const c = t.match_conditions
      if (c.surface && c.surface !== conditions?.surface) return false
      if (c.weather && c.weather !== conditions?.weather) return false
      if (c.physical_state && c.physical_state !== conditions?.physical_state) return false
    }
    if (t.keywords && !keywordHit(text, t.keywords)) return false
    return true
  })

  return candidates[0] ?? null
}

export function matchMentalState(self_state_tags: string[] | undefined, items: MentalPatternItem[]) {
  const tags = self_state_tags ?? []
  if (tags.length === 0) return null
  return items.find(item => item.trigger_tags.some(t => tags.includes(t))) ?? null
}

export function selectDrill(
  failurePatternId: string | undefined,
  opponentTypeId: string | undefined,
  conditionPatternId: string | undefined,
  drills: TrainingDrillItem[]
) {
  if (failurePatternId) {
    const hit = drills.find(d => d.drill_id === failurePatternId)
    if (hit) return hit
  }
  if (opponentTypeId) {
    const map: Record<string, string> = {
      server_stamina: 'return_advance_step',
      serve_strong: 'return_advance_step',
      net_rusher: 'low_ball_pass_net',
      steady_baseliner: 'short_ball_control',
      fast_rhythm: 'depth_height_control',
      slow_rhythm: 'short_ball_control',
      aggressive_baseliner: 'slice_control',
      defensive_counter: 'approach_volley',
      all_court: 'consistency_stability',
      heavy_topspin: 'rise_ball_hit',
      serve_volleyer: 'low_return_lob'
    }
    const drillId = map[opponentTypeId]
    if (drillId) return drills.find(d => d.drill_id === drillId) ?? null
  }
  if (conditionPatternId) {
    const map: Record<string, string> = {
      windy: 'windy_flat_drive',
      hot: 'serve_consistency',
      clay: 'short_ball_control',
      injured: 'return_advance_step',
      fatigued: 'rhythm_reset'
    }
    const drillId = map[conditionPatternId]
    if (drillId) return drills.find(d => d.drill_id === drillId) ?? null
  }
  return drills[0] ?? null
}

export function buildKnowledgeContext(input: {
  opponent_tags?: string[]
  self_state_tags?: string[]
  most_painful_point?: string
  painful_scene_tag?: string
  match_conditions?: MatchConditions
  match_result: MatchResult
  score_analysis: ScoreAnalysis
  ai_clarification?: AIClarification
}) {
  const kb = loadKnowledgeBase()
  const opponentMatch = matchOpponentType(input.opponent_tags, kb.opponent_types)
  const failurePattern = detectFailurePattern(input, kb.failure_patterns)
  const mentalPattern = matchMentalState(input.self_state_tags, kb.mental_patterns)
  const conditionPattern =
    kb.condition_patterns.find(item => {
      const c = item.match_conditions
      if (c.surface && c.surface !== input.match_conditions?.surface) return false
      if (c.weather && c.weather !== input.match_conditions?.weather) return false
      if (c.physical_state && c.physical_state !== input.match_conditions?.physical_state) return false
      return true
    }) ?? null
  const drill = selectDrill(failurePattern?.drill_id, opponentMatch?.type_id, conditionPattern?.condition_id, kb.training_drills)

  return { opponentMatch, failurePattern, mentalPattern, conditionPattern, drill } satisfies KnowledgeContext
}
