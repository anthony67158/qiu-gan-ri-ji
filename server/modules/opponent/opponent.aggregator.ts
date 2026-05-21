import { MatchRecord } from '../match/match.service'

function buildTagStats(values: string[]) {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1)
  const total = values.length || 1
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count, ratio: count / total }))
    .sort((a, b) => b.count - a.count)
}

export function aggregateOpponentProfile(input: {
  opponent_name_alias: string
  matches: MatchRecord[]
}) {
  const totalMatches = input.matches.length
  const wins = input.matches.filter(m => m.match_result === 'WIN').length
  const losses = input.matches.filter(m => m.match_result === 'LOSE').length
  const draws = input.matches.filter(m => m.match_result === 'DRAW').length
  const winRate = totalMatches === 0 ? 0 : wins / totalMatches

  const opponentTags = input.matches.flatMap(m => m.opponent_tags || [])
  const tacticsWhenWin = input.matches
    .filter(m => m.match_result === 'WIN')
    .flatMap(m => m.tactics_used_tags || [])
  const patternsWhenLose = input.matches
    .filter(m => m.match_result === 'LOSE')
    .flatMap(m => m.self_state_tags || [])

  const totalSets = input.matches.reduce((acc, m) => acc + (m.score_analysis?.total_sets || 0), 0)
  const avgSetsPerMatch = totalMatches === 0 ? 0 : totalSets / totalMatches

  const decidingSetMatches = input.matches.filter(m => m.score_analysis?.went_to_deciding_set)
  const decidingSetCount = decidingSetMatches.length
  const decidingSetWinCount = decidingSetMatches.filter(m => m.match_result === 'WIN').length
  const decidingSetWinRate = decidingSetCount === 0 ? 0 : decidingSetWinCount / decidingSetCount

  const collapsedCount = input.matches.filter(m => m.score_analysis?.collapsed_from_leading).length

  const lastMatchDate = input.matches
    .map(m => new Date(m.updated_at))
    .sort((a, b) => b.getTime() - a.getTime())[0] || null

  return {
    opponent_name_alias: input.opponent_name_alias,
    total_matches: totalMatches,
    wins,
    losses,
    draws,
    win_rate: winRate,
    aggregated_opponent_tags: buildTagStats(opponentTags),
    tactics_when_win: buildTagStats(tacticsWhenWin),
    patterns_when_lose: buildTagStats(patternsWhenLose),
    score_patterns: {
      avg_sets_per_match: avgSetsPerMatch,
      deciding_set_count: decidingSetCount,
      deciding_set_win_rate: decidingSetWinRate,
      collapsed_from_leading_count: collapsedCount
    },
    last_match_date: lastMatchDate
  }
}
