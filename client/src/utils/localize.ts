import {
  KEY_POINT_ERROR_REASONS,
  LOSING_REASONS,
  MATCH_CONDITION_LABELS,
  MY_CLUTCH_STATE,
  MY_MAIN_WEAPONS,
  MY_MOBILITY,
  MY_PHYSICAL_STATE,
  MY_PLAY_STYLES,
  MY_WEAKNESSES,
  OPPONENT_CLUTCH_TENDENCY,
  OPPONENT_DOMINANT_HAND,
  OPPONENT_MAIN_WEAPONS,
  OPPONENT_MOBILITY,
  OPPONENT_PLAY_STYLES,
  OPPONENT_WEAKNESSES,
  PRACTICE_DURATIONS,
  PRACTICE_FOCUS,
  PRACTICE_GAINS,
  PRACTICE_ISSUES,
  PRACTICE_TYPES,
  SCORING_METHODS
} from '@/constants'

const labelMap = (() => {
  const lists: any[] = [
    OPPONENT_PLAY_STYLES,
    OPPONENT_DOMINANT_HAND,
    OPPONENT_MAIN_WEAPONS,
    OPPONENT_WEAKNESSES,
    OPPONENT_CLUTCH_TENDENCY,
    OPPONENT_MOBILITY,
    MY_PLAY_STYLES,
    MY_MAIN_WEAPONS,
    MY_WEAKNESSES,
    MY_MOBILITY,
    MY_CLUTCH_STATE,
    MY_PHYSICAL_STATE,
    SCORING_METHODS,
    LOSING_REASONS,
    KEY_POINT_ERROR_REASONS,
    PRACTICE_DURATIONS,
    PRACTICE_TYPES,
    PRACTICE_FOCUS,
    PRACTICE_GAINS,
    PRACTICE_ISSUES
  ]
  const map = new Map<string, string>()
  for (const list of lists) {
    for (const it of list as any[]) {
      if (it?.value && it?.label) map.set(String(it.value), String(it.label))
    }
  }
  const cond = MATCH_CONDITION_LABELS as any
  for (const k of Object.keys(cond || {})) {
    const obj = cond[k] || {}
    for (const v of Object.keys(obj)) {
      map.set(String(v), String(obj[v]))
    }
  }
  return map
})()

export function localizeText(raw: any) {
  const text = String(raw || '')
  let out = text
  for (const [k, v] of labelMap.entries()) {
    const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'g')
    out = out.replace(re, v)
  }
  return out
}

