import { MatchRecord } from '../match/match.service'
import { loadKnowledgeBase, matchOpponentType } from '../../services/knowledge.service'

function pct(n: number) {
  return Math.round(n * 100)
}

function aggregateCounts(values: string[]) {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1)
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

export type MonthlyStats = {
  total_matches: number
  wins: number
  losses: number
  win_rate_pct: number
  critical_point_mention_count: number
  critical_point_ratio: number
  toughest_opponent_type: string
  toughest_win_rate_pct: number
  toughest_match_count: number
  win_tactics: { tag: string; count: number }[]
  lose_states: { tag: string; count: number }[]
  deciding_set_matches: number
  deciding_set_win_rate_pct: number
}

export function calculateMonthlyStats(matches: MatchRecord[]): MonthlyStats {
  const total = matches.length
  const wins = matches.filter(m => m.match_result === 'WIN').length
  const losses = matches.filter(m => m.match_result === 'LOSE').length

  const criticalRegex = /(关键分|30:40|5:5|抢七|决胜盘)/g
  const criticalCount = matches.filter(m => criticalRegex.test(m.most_painful_point || '')).length

  const tactics = aggregateCounts(
    matches.filter(m => m.match_result === 'WIN').flatMap(m => m.tactics_used_tags || [])
  ).slice(0, 5)

  const loseStates = aggregateCounts(
    matches.filter(m => m.match_result === 'LOSE').flatMap(m => m.self_state_tags || [])
  ).slice(0, 5)

  const decidingSetMatches = matches.filter(m => m.score_analysis?.went_to_deciding_set)
  const decidingSetWinRate =
    decidingSetMatches.length === 0
      ? 0
      : decidingSetMatches.filter(m => m.match_result === 'WIN').length / decidingSetMatches.length

  const kb = loadKnowledgeBase()
  const byType = new Map<string, { label: string; total: number; wins: number }>()
  for (const m of matches) {
    const t = matchOpponentType(m.opponent_tags || [], kb.opponent_types)
    if (!t) continue
    const prev = byType.get(t.type_id) || { label: t.label, total: 0, wins: 0 }
    prev.total += 1
    if (m.match_result === 'WIN') prev.wins += 1
    byType.set(t.type_id, prev)
  }

  let toughestType = '未识别'
  let toughestWinRate = 0
  let toughestCount = 0
  for (const [, v] of byType.entries()) {
    const winRate = v.total === 0 ? 0 : v.wins / v.total
    if (toughestType === '未识别' || winRate < toughestWinRate || toughestCount === 0) {
      toughestType = v.label
      toughestWinRate = winRate
      toughestCount = v.total
    }
  }

  return {
    total_matches: total,
    wins,
    losses,
    win_rate_pct: total === 0 ? 0 : pct(wins / total),
    critical_point_mention_count: criticalCount,
    critical_point_ratio: total === 0 ? 0 : pct(criticalCount / total),
    toughest_opponent_type: toughestType,
    toughest_win_rate_pct: toughestCount === 0 ? 0 : pct(toughestWinRate),
    toughest_match_count: toughestCount,
    win_tactics: tactics,
    lose_states: loseStates,
    deciding_set_matches: decidingSetMatches.length,
    deciding_set_win_rate_pct: pct(decidingSetWinRate)
  }
}
