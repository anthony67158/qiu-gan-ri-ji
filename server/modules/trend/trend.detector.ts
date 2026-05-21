import { MatchRecord } from '../match/match.service'
import { TrendType } from '../../../shared/types'
import { loadKnowledgeBase, matchOpponentType } from '../../services/knowledge.service'

function winRate(matches: MatchRecord[]) {
  if (matches.length === 0) return 0
  const wins = matches.filter(m => m.match_result === 'WIN').length
  return wins / matches.length
}

export function detectWeaknessTrends(matches: MatchRecord[]) {
  const recent = matches.slice(0, 5)
  const alerts: { trend_type: TrendType; detail: string; frequency: number; suggestion?: string }[] = []

  if (recent.length === 0) return alerts

  const selfCounts = new Map<string, number>()
  for (const m of recent) {
    for (const t of m.self_state_tags || []) {
      selfCounts.set(t, (selfCounts.get(t) || 0) + 1)
    }
  }
  for (const [tag, count] of selfCounts.entries()) {
    if (count >= 3) {
      alerts.push({
        trend_type: 'self_state',
        detail: `最近 5 场有 ${count} 场标记“${tag}”`,
        frequency: count,
        suggestion: `优先针对“${tag}”做 1 个小训练，避免形成习惯性错误。`
      })
    }
  }

  const sceneCounts = new Map<string, number>()
  for (const m of recent) {
    if (m.painful_scene_tag) {
      sceneCounts.set(m.painful_scene_tag, (sceneCounts.get(m.painful_scene_tag) || 0) + 1)
    }
  }
  for (const [scene, count] of sceneCounts.entries()) {
    if (count >= 2) {
      alerts.push({
        trend_type: 'painful_scene',
        detail: `最近 5 场有 ${count} 场出现“${scene}”`,
        frequency: count,
        suggestion: `把“${scene}”当成当前最优先的修复场景。`
      })
    }
  }

  const overallRate = winRate(matches)
  const byWeather = new Map<string, MatchRecord[]>()
  const bySurface = new Map<string, MatchRecord[]>()
  const byPhysical = new Map<string, MatchRecord[]>()
  for (const m of matches) {
    const c = m.match_conditions
    if (c?.weather) byWeather.set(c.weather, [...(byWeather.get(c.weather) || []), m])
    if (c?.surface) bySurface.set(c.surface, [...(bySurface.get(c.surface) || []), m])
    if (c?.physical_state) byPhysical.set(c.physical_state, [...(byPhysical.get(c.physical_state) || []), m])
  }

  const checkCondition = (label: string, group: Map<string, MatchRecord[]>) => {
    for (const [k, list] of group.entries()) {
      if (list.length < 5) continue
      const rate = winRate(list)
      if (overallRate - rate >= 0.2) {
        alerts.push({
          trend_type: 'condition',
          detail: `${label}“${k}”下胜率仅 ${(rate * 100).toFixed(0)}%（${list.length} 场）`,
          frequency: list.length,
          suggestion: `该条件下优先调整战术，避免照常打法。`
        })
      }
    }
  }
  checkCondition('天气', byWeather)
  checkCondition('场地', bySurface)
  checkCondition('身体', byPhysical)

  const kb = loadKnowledgeBase()
  const byType = new Map<string, MatchRecord[]>()
  for (const m of matches) {
    const type = matchOpponentType(m.opponent_tags, kb.opponent_types)
    if (!type) continue
    const key = type.type_id
    byType.set(key, [...(byType.get(key) || []), m])
  }
  for (const [typeId, list] of byType.entries()) {
    if (list.length < 3) continue
    const rate = winRate(list)
    if (rate < 0.3) {
      const label = kb.opponent_types.find(x => x.type_id === typeId)?.label || typeId
      alerts.push({
        trend_type: 'opponent_type',
        detail: `对“${label}”类对手胜率 ${(rate * 100).toFixed(0)}%（${list.length} 场）`,
        frequency: list.length,
        suggestion: `把“${label}”作为近期重点备战对象。`
      })
    }
  }

  return alerts
}
