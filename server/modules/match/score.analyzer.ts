import { MatchResult, MatchScore, ScoreAnalysis } from '../../../shared/types'

function isCloseSet(self: number, opp: number) {
  const diff = Math.abs(self - opp)
  if (diff <= 2) return true
  if ((self === 7 && opp === 6) || (self === 6 && opp === 7)) return true
  return false
}

export function analyzeScore(score: MatchScore | undefined, matchResult: MatchResult): ScoreAnalysis {
  const rawSets = score?.sets ?? []
  const sets = rawSets.filter(s => (s.score_self || 0) > 0 || (s.score_opponent || 0) > 0)

  const setWins = sets.reduce(
    (acc, s) => {
      if (s.score_self > s.score_opponent) acc.self += 1
      if (s.score_opponent > s.score_self) acc.opp += 1
      return acc
    },
    { self: 0, opp: 0 }
  )

  const totalSets = sets.length
  const closeSets = sets
    .map((s, idx) => ({ idx: idx + 1, close: isCloseSet(s.score_self, s.score_opponent) }))
    .filter(s => s.close)
    .map(s => s.idx)

  const points = sets.map(s => {
    if (s.score_self === s.score_opponent) return 0
    return s.score_self > s.score_opponent ? 1 : -1
  })

  let collapsedFromLeading = false
  let comebackWin = false
  if (points.length > 0) {
    let running = 0
    let everLead = false
    let everBehind = false
    for (const p of points) {
      running += p
      if (running > 0) everLead = true
      if (running < 0) everBehind = true
    }
    if (matchResult === 'LOSE' && everLead) collapsedFromLeading = true
    if (matchResult === 'WIN' && everBehind) comebackWin = true
  }

  const scoreSummary =
    totalSets === 0
      ? ''
      : `${setWins.self}:${setWins.opp}（${sets.map(s => `${s.score_self}:${s.score_opponent}`).join(', ')}）`

  return {
    total_sets: totalSets,
    went_to_deciding_set: totalSets >= 3,
    collapsed_from_leading: collapsedFromLeading,
    comeback_win: comebackWin,
    close_sets: closeSets,
    score_summary: scoreSummary
  }
}
