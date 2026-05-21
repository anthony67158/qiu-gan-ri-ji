import { PreMatchIntel, PreMatchIntelAnalysis } from '../../../shared/types'
import { OPPONENT_TAGS } from '../../../shared/constants'
import { env } from '../../config/env'
import { callAIText, generatePreMatchIntelAnalysis } from '../../services/ai.service'
import { listMatchesByOpponent } from '../match/match.service'
import { getOpponentByAlias } from '../opponent/opponent.service'
import { buildPreMatchIntelPrompt } from '../../prompts/preMatchIntel.prompt'

function buildWeaknessRadar(stats: { tag: string; count: number; ratio: number }[]) {
  const allCount = stats.reduce((acc, s) => acc + s.count, 0) || 1
  const dimensionScore = (tags: readonly string[]) => {
    const hit = stats.filter(s => tags.includes(s.tag)).reduce((acc, s) => acc + s.count, 0)
    const ratio = hit / allCount
    return Math.max(0, Math.min(5, Math.round(ratio * 5)))
  }
  return {
    serve: dimensionScore(OPPONENT_TAGS.serve),
    baseline: dimensionScore(OPPONENT_TAGS.baseline),
    net: dimensionScore(OPPONENT_TAGS.net),
    movement: dimensionScore(OPPONENT_TAGS.movement),
    mental: dimensionScore(OPPONENT_TAGS.mental)
  }
}

function pickWeaknessSummary(radar: PreMatchIntel['weakness_radar']) {
  const entries = Object.entries(radar) as Array<[keyof typeof radar, number]>
  const sorted = entries.sort((a, b) => a[1] - b[1])
  const weakest = sorted[0]?.[0]
  const map: Record<string, string> = {
    serve: '发球维度偏弱',
    baseline: '底线稳定性偏弱',
    net: '网前防守偏弱',
    movement: '移动覆盖偏弱',
    mental: '关键分心理偏弱'
  }
  return map[weakest || 'baseline'] || '底线稳定性偏弱'
}

function summarizeTags(tags: string[]) {
  const counts = new Map<string, number>()
  for (const t of tags) counts.set(t, (counts.get(t) || 0) + 1)
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(x => x[0])
}

export async function buildPreMatchIntel(params: { userId: string; opponentNameAlias: string; redis?: any }) {
  const cacheKey = `intel:${params.userId}:${params.opponentNameAlias}`
  if (params.redis) {
    const cached = await params.redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as { intel: PreMatchIntel; analysis?: PreMatchIntelAnalysis }
  }

  const profile = await getOpponentByAlias(params.userId, params.opponentNameAlias)
  const matches = await listMatchesByOpponent(params.userId, params.opponentNameAlias)
  const wins = matches.filter(m => m.match_result === 'WIN').length
  const losses = matches.filter(m => m.match_result === 'LOSE').length
  const draws = matches.filter(m => m.match_result === 'DRAW').length

  const radar = buildWeaknessRadar(profile?.aggregated_opponent_tags || [])
  const winPatterns = summarizeTags(matches.filter(m => m.match_result === 'WIN').flatMap(m => m.tactics_used_tags || []))
  const losePatterns = summarizeTags(matches.filter(m => m.match_result === 'LOSE').flatMap(m => m.self_state_tags || []))

  const weaknessSummary = pickWeaknessSummary(radar)
  let tacticalAdvice = `开局先打深中路稳定节奏，再集中攻击他“${weaknessSummary.replace('偏弱', '')}”的方向。`
  let analysis: PreMatchIntelAnalysis | undefined = undefined

  if (env.ai.provider && (env.ai.apiKey || env.volcano.apiKey)) {
    try {
      const lastOpponentInfo = matches.find(m => (m as any).opponent_info)?.opponent_info as any
      const lastMyInfo = matches.find(m => (m as any).my_info)?.my_info as any
      const h2hHistory = matches
        .slice()
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 5)
        .map(m => ({
          date: (m.date_time || m.created_at || '').slice(0, 10),
          score: m.score_analysis?.score_summary || '未填写',
          scoring: ((m as any).post_match_summary?.scoring_methods || []) as string[],
          losing: ((m as any).post_match_summary?.losing_reasons || []) as string[]
        }))

      const prompt = buildPreMatchIntelPrompt({
        opponent: {
          nickname: params.opponentNameAlias,
          play_style: lastOpponentInfo?.play_style,
          dominant_hand: lastOpponentInfo?.dominant_hand,
          main_weapons: lastOpponentInfo?.main_weapons || [],
          weaknesses: lastOpponentInfo?.weaknesses || [],
          clutch_tendency: lastOpponentInfo?.clutch_tendency,
          mobility: lastOpponentInfo?.mobility || []
        },
        my: {
          play_style: lastMyInfo?.play_style,
          main_weapons: lastMyInfo?.main_weapons || [],
          weaknesses: lastMyInfo?.weaknesses || [],
          mobility: lastMyInfo?.mobility || [],
          clutch_state: lastMyInfo?.clutch_state
        },
        h2h: h2hHistory.length
          ? {
              wins,
              losses,
              draws,
              history: h2hHistory
            }
          : undefined
      })

      analysis = await generatePreMatchIntelAnalysis({ prompt, redis: params.redis })
      tacticalAdvice = analysis.game_plan.core_strategy.slice(0, 120) || tacticalAdvice
    } catch {
      analysis = undefined
      tacticalAdvice = tacticalAdvice
    }
  }

  const result: PreMatchIntel = {
    opponent_name: params.opponentNameAlias,
    h2h_record: { wins, losses, draws },
    weakness_radar: radar,
    lose_patterns: losePatterns,
    win_patterns: winPatterns,
    condition_insights: undefined,
    tactical_advice: tacticalAdvice,
    last_updated: new Date().toISOString()
  }

  if (params.redis) {
    await params.redis.set(cacheKey, JSON.stringify({ intel: result, analysis }), 'EX', 60 * 60 * 12)
  }

  return { intel: result, analysis }
}
