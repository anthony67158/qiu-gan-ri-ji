import { WeaknessTrendAlert, WeaknessTrendAnalysis } from '../../../shared/types'
import { env } from '../../config/env'
import { generateWeaknessTrendAnalysis } from '../../services/ai.service'
import { buildTrendAnalysisPrompt } from '../../prompts/trendAnalysis.prompt'
import { listMatches } from '../match/match.service'
import { detectWeaknessTrends } from './trend.detector'
import { WeaknessTrendModel } from './trend.model'

const memoryTrends = new Map<string, WeaknessTrendAlert[]>()

function toAlert(doc: any): WeaknessTrendAlert {
  return {
    trend_type: doc.trend_type,
    detail: doc.detail,
    frequency: doc.frequency,
    suggestion: doc.suggestion,
    first_detected_at: doc.first_detected_at?.toISOString?.() || new Date(doc.first_detected_at).toISOString()
  }
}

export async function detectAndStoreTrends(userId: string) {
  const matches = await listMatches(userId, 30, 0)
  const now = new Date().toISOString()
  const alerts = detectWeaknessTrends(matches).map(a => ({
    trend_type: a.trend_type,
    detail: a.detail,
    frequency: a.frequency,
    suggestion: a.suggestion || '',
    first_detected_at: now
  }))
  if (env.useInMemoryStore) {
    memoryTrends.set(userId, alerts)
    return alerts
  }
  if (alerts.length === 0) return []
  const docs = alerts.map(a => ({
    user_id: userId,
    trend_type: a.trend_type,
    detail: a.detail,
    frequency: a.frequency,
    suggestion: a.suggestion,
    first_detected_at: new Date()
  }))
  await WeaknessTrendModel.insertMany(docs)
  return alerts
}

export async function listLatestTrends(userId: string) {
  if (env.useInMemoryStore) {
    return memoryTrends.get(userId) || []
  }
  const docs = await WeaknessTrendModel.find({ user_id: userId }).sort({ createdAt: -1 }).limit(10)
  return docs.map(toAlert)
}

export async function listTrendHistory(userId: string, limit = 50) {
  if (env.useInMemoryStore) {
    return memoryTrends.get(userId) || []
  }
  const docs = await WeaknessTrendModel.find({ user_id: userId }).sort({ createdAt: -1 }).limit(limit)
  return docs.map(toAlert)
}

export async function generateTrendAnalysis(params: { userId: string; lastN: number; redis?: any }): Promise<WeaknessTrendAnalysis> {
  const lastN = Math.min(30, Math.max(3, Number(params.lastN || 5)))
  const matches = await listMatches(params.userId, lastN, 0)
  const latestMyInfo = matches.find(m => (m as any).my_info)?.my_info as any
  const prompt = buildTrendAnalysisPrompt({
    play_style: latestMyInfo?.play_style,
    weaknesses: latestMyInfo?.weaknesses || [],
    matches: matches.map(m => ({
      date: (m.date_time || m.created_at || '').slice(0, 10),
      opponent: m.opponent_name_alias || '对手',
      score: m.score_analysis?.score_summary || '未填写',
      losing_reasons: ((m as any).post_match_summary?.losing_reasons || []) as string[],
      key_point_errors: ((m as any).post_match_summary?.key_point_error_reasons || []) as string[],
      physical_state: ((m as any).my_info?.physical_state || '') as string
    }))
  })

  return generateWeaknessTrendAnalysis({ prompt, redis: params.redis })
}
