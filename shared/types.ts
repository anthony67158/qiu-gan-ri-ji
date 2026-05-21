import { MATCH_CONDITIONS, PAINFUL_SCENE_TAGS, SELF_STATE_TAGS, TACTICS_TAGS } from './constants'

export type MatchResult = 'WIN' | 'LOSE' | 'DRAW' | 'PRACTICE'
export type MatchType = 'SINGLE' | 'DOUBLE' | 'PRACTICE' | 'singles' | 'doubles'
export type SubPlan = 'FREE' | 'MONTHLY' | 'YEARLY'
export type SubStatus = 'ACTIVE' | 'EXPIRED' | 'TRIAL'

export type SelfStateTag = typeof SELF_STATE_TAGS[number]
export type TacticsTag = typeof TACTICS_TAGS[number]
export type PainfulSceneTag = typeof PAINFUL_SCENE_TAGS[number]

export type Surface = typeof MATCH_CONDITIONS.surface[number]
export type Weather = typeof MATCH_CONDITIONS.weather[number]
export type PhysicalState = typeof MATCH_CONDITIONS.physical_state[number]

export interface MatchConditions {
  surface?: Surface | null
  weather?: Weather | null
  physical_state?: PhysicalState | null
}

export interface OpponentInfo {
  id?: string
  name?: string
  play_style?: string
  dominant_hand?: string
  main_weapons?: string[]
  weaknesses?: string[]
  clutch_tendency?: string
  mobility?: string[]
}

export interface MyInfo {
  play_style?: string
  main_weapons?: string[]
  weaknesses?: string[]
  mobility?: string[]
  clutch_state?: string
  physical_state?: string
}

export interface PostMatchSummary {
  scoring_methods?: string[]
  losing_reasons?: string[]
  key_point_error_reasons?: string[]
  one_line_summary?: string
  coordination_issues?: string[]
}

export type CourtPreference = 'ad_court' | 'deuce_court' | 'flexible'

export interface PartnerSnapshot {
  id?: string
  nickname?: string
  play_style?: string
  main_weapons?: string[]
  weaknesses?: string[]
  court_preference?: CourtPreference
  physical_state?: string
}

export interface OpponentSnapshot extends OpponentInfo {}

export type MatchRating = 'S' | 'A' | 'B' | 'C' | 'D'

export interface MatchAnalysis {
  overview: {
    rating: MatchRating
    rating_label: string
    one_liner: string
    tags: string[]
  }
  highlights: {
    title: '今天的亮点'
    items: Array<{
      emoji: string
      point: string
      evidence: string
    }>
  }
  improvements: {
    title: '下次要注意'
    items: Array<{
      emoji: string
      point: string
      suggestion: string
      priority: 'P0' | 'P1' | 'P2'
    }>
  }
  opponent_read: {
    title: '对手解读'
    summary: string
    next_time_tip: string
  }
  coordination_eval?: {
    title: '配合评估'
    summary: string
    drills: Array<{ name: string; description: string; duration: string; targets: string }>
  }
  homework: {
    title: '练球作业'
    drills: Array<{
      name: string
      description: string
      duration: string
      targets: string
    }>
  }
  next_match_tips?: {
    title: '下次交手锦囊'
    strategy: string
    dos: string[]
    donts: string[]
  }
}

export interface WeaknessTrendAnalysis {
  trend_overview: {
    total_matches: number
    period: string
    trend_verdict: string
  }
  weakness_ranking: Array<{
    rank: number
    weakness: string
    frequency: string
    trend: 'worsening' | 'stable' | 'improving'
    trend_icon: '📈' | '➡️' | '📉'
    severity: 'P0' | 'P1' | 'P2'
    quick_fix: string
  }>
  stamina_insight?: {
    finding: string
    advice: string
  }
  training_plan: {
    title: '本周训练重点'
    focus_area: string
    sessions: Array<{
      day: string
      drill_name: string
      detail: string
      duration: string
    }>
  }
}

export interface PreMatchIntelAnalysis {
  opponent_portrait: {
    nickname: string
    one_liner: string
    danger_rating: 1 | 2 | 3 | 4 | 5
    h2h_record: string
  }
  game_plan: {
    title: '今天的打法'
    core_strategy: string
    tactics: Array<{
      emoji: string
      tactic: string
      reason: string
    }>
  }
  watch_out: {
    title: '小心这些'
    warnings: Array<{
      emoji: string
      warning: string
    }>
  }
  clutch_script: {
    title: '关键分这样打'
    when_leading: string
    when_trailing: string
    break_point: string
  }
}

export interface DoublesData {
  partner_id?: string
  partner_name_alias: string
  partner_position?: 'ad_side' | 'deuce_side' | null
  doubles_tactics_tags?: string[]
}

export interface WeaknessRadar {
  serve: number
  baseline: number
  net: number
  movement: number
  mental: number
}

export type TrendType = 'self_state' | 'painful_scene' | 'condition' | 'opponent_type'
export interface WeaknessTrendAlert {
  trend_type: TrendType
  detail: string
  frequency: number
  suggestion: string
  first_detected_at: string
}

export interface SetScore {
  set_number: number
  score_self: number
  score_opponent: number
}

export interface MatchScore {
  sets: SetScore[]
  total_self: number
  total_opponent: number
}

export interface ScoreAnalysis {
  total_sets: number
  went_to_deciding_set: boolean
  collapsed_from_leading: boolean
  comeback_win: boolean
  close_sets: number[]
  score_summary: string
}

export interface AIClarification {
  question: string
  options: string[]
  selected_option?: string
  skipped: boolean
}

export interface AIFeedback {
  key_problem: string
  next_tactic: string
  training_suggestion: string
  condition_tip?: string
  knowledge_used: {
    opponent_type_id?: string
    failure_pattern_id?: string
    drill_id?: string
    condition_pattern_id?: string
  }
  is_helpful?: boolean
  generated_at: string
}

export interface TagStat {
  tag: string
  count: number
  ratio: number
}

export interface CreateMatchDTO {
  opponent_name_alias?: string
  match_result: MatchResult
  match_type?: MatchType
  score?: MatchScore
  most_painful_point?: string
  painful_scene_tag?: PainfulSceneTag
  match_conditions?: MatchConditions
  doubles_data?: DoublesData
  opponent_tags?: string[]
  self_state_tags?: SelfStateTag[]
  tactics_used_tags?: TacticsTag[]
  date_time?: string
  location?: string
  // v3.1 新增结构化字段
  opponent_info?: OpponentInfo
  my_info?: MyInfo
  post_match_summary?: PostMatchSummary

  // v3.2 双打模式新增（向后兼容：单打仍可用 opponent_info）
  opponent_snapshots?: OpponentSnapshot[]
  opponent_ids?: string[]
  partner_snapshot?: PartnerSnapshot
  my_court_preference?: CourtPreference
  // practice mode
  practice_info?: {
    duration?: string
    practice_type?: string
    focus_areas?: string[]
    practice_partner_id?: string
    practice_partner_nickname?: string
    date_time?: string
  }
  practice_summary?: {
    gains?: string[]
    unresolved?: string[]
    one_line_note?: string
  }
}

export interface SubmitClarificationDTO {
  selected_option?: string
  skipped: boolean
}

export interface PreMatchIntel {
  opponent_name: string
  h2h_record: { wins: number; losses: number; draws: number }
  weakness_radar: WeaknessRadar
  lose_patterns: string[]
  win_patterns: string[]
  condition_insights?: string
  tactical_advice: string
  last_updated: string
}

export interface CircleMember {
  user_id: string
  nickname: string
  win_rate: number
  recent_trend: 'up' | 'down' | 'stable'
  streak?: number
}

export interface CreateCircleDTO {
  circle_name: string
  invited_user_ids?: string[]
}

export interface ConfirmMatchDTO {
  match_id: string
  confirmed: boolean
}

export interface DoublesPartnerProfile {
  partner_name_alias: string
  total_matches: number
  wins: number
  losses: number
  win_rate: number
  tactics_together: TagStat[]
  last_match_date?: string | null
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
}
