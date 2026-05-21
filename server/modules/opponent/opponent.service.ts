import { env } from '../../config/env'
import { deleteMatchesByOpponentAlias, listMatchesByOpponent, listRecentMatchesByOpponent } from '../match/match.service'
import { aggregateOpponentProfile } from './opponent.aggregator'
import { OpponentProfileModel } from './opponent.model'

export type OpponentProfile = {
  id: string
  user_id: string
  opponent_name_alias: string
  play_style?: string | null
  dominant_hand?: string | null
  main_weapons?: string[]
  weaknesses?: string[]
  clutch_tendency?: string | null
  mobility?: string[]
  total_matches: number
  wins: number
  losses: number
  draws: number
  win_rate: number
  aggregated_opponent_tags: { tag: string; count: number; ratio: number }[]
  tactics_when_win: { tag: string; count: number; ratio: number }[]
  patterns_when_lose: { tag: string; count: number; ratio: number }[]
  score_patterns: {
    avg_sets_per_match: number
    deciding_set_count: number
    deciding_set_win_rate: number
    collapsed_from_leading_count: number
  }
  ai_opponent_advice?: string | null
  personal_notes?: string | null
  last_match_date?: string | null
  recent_form?: { last_5_wins: number; last_5_total: number }
  is_nemesis?: boolean
  created_at?: string
  updated_at?: string
}

const memoryOpponents = new Map<string, OpponentProfile>()

function toOpponentProfile(doc: any): OpponentProfile {
  return {
    id: String(doc._id),
    user_id: doc.user_id,
    opponent_name_alias: doc.opponent_name_alias,
    play_style: doc.play_style ?? null,
    dominant_hand: doc.dominant_hand ?? null,
    main_weapons: doc.main_weapons || [],
    weaknesses: doc.weaknesses || [],
    clutch_tendency: doc.clutch_tendency ?? null,
    mobility: doc.mobility || [],
    total_matches: doc.total_matches,
    wins: doc.wins,
    losses: doc.losses,
    draws: doc.draws,
    win_rate: doc.win_rate,
    aggregated_opponent_tags: doc.aggregated_opponent_tags,
    tactics_when_win: doc.tactics_when_win,
    patterns_when_lose: doc.patterns_when_lose,
    score_patterns: doc.score_patterns,
    ai_opponent_advice: doc.ai_opponent_advice,
    personal_notes: doc.personal_notes ?? null,
    last_match_date: doc.last_match_date ? new Date(doc.last_match_date).toISOString() : null,
    created_at: doc.createdAt?.toISOString?.() || undefined,
    updated_at: doc.updatedAt?.toISOString?.() || undefined
  }
}

export async function recalculateOpponentProfile(userId: string, opponentNameAlias: string) {
  const matches = await listMatchesByOpponent(userId, opponentNameAlias)
  const aggregated = aggregateOpponentProfile({ opponent_name_alias: opponentNameAlias, matches })

  if (env.useInMemoryStore) {
    const id = `${userId}:${opponentNameAlias}`
    const prev = memoryOpponents.get(id)
    const merged: OpponentProfile = {
      id,
      user_id: userId,
      opponent_name_alias: aggregated.opponent_name_alias,
      play_style: prev?.play_style ?? null,
      dominant_hand: prev?.dominant_hand ?? null,
      main_weapons: prev?.main_weapons || [],
      weaknesses: prev?.weaknesses || [],
      clutch_tendency: prev?.clutch_tendency ?? null,
      mobility: prev?.mobility || [],
      total_matches: aggregated.total_matches,
      wins: aggregated.wins,
      losses: aggregated.losses,
      draws: aggregated.draws,
      win_rate: aggregated.win_rate,
      aggregated_opponent_tags: aggregated.aggregated_opponent_tags,
      tactics_when_win: aggregated.tactics_when_win,
      patterns_when_lose: aggregated.patterns_when_lose,
      score_patterns: aggregated.score_patterns,
      last_match_date: aggregated.last_match_date ? aggregated.last_match_date.toISOString() : null,
      ai_opponent_advice: prev?.ai_opponent_advice || null,
      personal_notes: prev?.personal_notes ?? null
    }
    memoryOpponents.set(id, merged)
    return merged
  }

  const doc = await OpponentProfileModel.findOneAndUpdate(
    { user_id: userId, opponent_name_alias: opponentNameAlias },
    {
      $set: {
        total_matches: aggregated.total_matches,
        wins: aggregated.wins,
        losses: aggregated.losses,
        draws: aggregated.draws,
        win_rate: aggregated.win_rate,
        aggregated_opponent_tags: aggregated.aggregated_opponent_tags,
        tactics_when_win: aggregated.tactics_when_win,
        patterns_when_lose: aggregated.patterns_when_lose,
        score_patterns: aggregated.score_patterns,
        last_match_date: aggregated.last_match_date
      }
    },
    { upsert: true, new: true }
  )

  return toOpponentProfile(doc)
}

export async function upsertOpponentTraits(params: {
  userId: string
  opponent_name_alias: string
  play_style?: string | null
  dominant_hand?: string | null
  main_weapons?: string[]
  weaknesses?: string[]
  clutch_tendency?: string | null
  mobility?: string[]
  last_match_date?: Date | null
}) {
  const alias = params.opponent_name_alias.trim()
  if (!alias) return null

  if (env.useInMemoryStore) {
    const id = `${params.userId}:${alias}`
    const prev = memoryOpponents.get(id)
    const merged: OpponentProfile = {
      id,
      user_id: params.userId,
      opponent_name_alias: alias,
      play_style: params.play_style ?? prev?.play_style ?? null,
      dominant_hand: params.dominant_hand ?? prev?.dominant_hand ?? null,
      main_weapons: params.main_weapons ?? prev?.main_weapons ?? [],
      weaknesses: params.weaknesses ?? prev?.weaknesses ?? [],
      clutch_tendency: params.clutch_tendency ?? prev?.clutch_tendency ?? null,
      mobility: params.mobility ?? prev?.mobility ?? [],
      total_matches: prev?.total_matches ?? 0,
      wins: prev?.wins ?? 0,
      losses: prev?.losses ?? 0,
      draws: prev?.draws ?? 0,
      win_rate: prev?.win_rate ?? 0,
      aggregated_opponent_tags: prev?.aggregated_opponent_tags ?? [],
      tactics_when_win: prev?.tactics_when_win ?? [],
      patterns_when_lose: prev?.patterns_when_lose ?? [],
      score_patterns: prev?.score_patterns ?? {
        avg_sets_per_match: 0,
        deciding_set_count: 0,
        deciding_set_win_rate: 0,
        collapsed_from_leading_count: 0
      },
      ai_opponent_advice: prev?.ai_opponent_advice ?? null,
      personal_notes: prev?.personal_notes ?? null,
      last_match_date: (params.last_match_date ?? (prev?.last_match_date ? new Date(prev.last_match_date) : null))?.toISOString?.() || null
    }
    memoryOpponents.set(id, merged)
    return merged
  }

  const doc = await OpponentProfileModel.findOneAndUpdate(
    { user_id: params.userId, opponent_name_alias: alias },
    {
      $set: {
        play_style: params.play_style ?? null,
        dominant_hand: params.dominant_hand ?? null,
        main_weapons: params.main_weapons ?? [],
        weaknesses: params.weaknesses ?? [],
        clutch_tendency: params.clutch_tendency ?? null,
        mobility: params.mobility ?? [],
        last_match_date: params.last_match_date ?? null
      }
    },
    { upsert: true, new: true }
  )
  return toOpponentProfile(doc)
}

export async function searchOpponents(userId: string, q: string, limit = 10) {
  const keyword = (q || '').trim()
  if (!keyword) {
    if (env.useInMemoryStore) {
      return Array.from(memoryOpponents.values())
        .filter(o => o.user_id === userId)
        .sort((a, b) => {
          const ad = a.last_match_date ? new Date(a.last_match_date).getTime() : 0
          const bd = b.last_match_date ? new Date(b.last_match_date).getTime() : 0
          return bd - ad
        })
        .slice(0, Math.min(5, limit))
    }
    const docs = await OpponentProfileModel.find({ user_id: userId })
      .sort({ last_match_date: -1, updatedAt: -1 })
      .limit(Math.min(5, limit))
    return docs.map(toOpponentProfile)
  }
  if (env.useInMemoryStore) {
    return Array.from(memoryOpponents.values())
      .filter(o => o.user_id === userId && o.opponent_name_alias.includes(keyword))
      .slice(0, limit)
  }
  const docs = await OpponentProfileModel.find({
    user_id: userId,
    opponent_name_alias: { $regex: keyword, $options: 'i' }
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
  return docs.map(toOpponentProfile)
}

export async function getOpponentByAlias(userId: string, opponentNameAlias: string) {
  if (env.useInMemoryStore) {
    return memoryOpponents.get(`${userId}:${opponentNameAlias}`) || null
  }
  const doc = await OpponentProfileModel.findOne({ user_id: userId, opponent_name_alias: opponentNameAlias })
  if (!doc) return null
  return toOpponentProfile(doc)
}

export async function listOpponents(userId: string, limit = 20, offset = 0) {
  const base = env.useInMemoryStore
    ? Array.from(memoryOpponents.values())
        .filter(o => o.user_id === userId)
        .sort((a, b) => {
          const ad = a.last_match_date ? new Date(a.last_match_date).getTime() : 0
          const bd = b.last_match_date ? new Date(b.last_match_date).getTime() : 0
          if (bd !== ad) return bd - ad
          return (b.total_matches || 0) - (a.total_matches || 0)
        })
        .slice(offset, offset + limit)
    : await OpponentProfileModel.find({ user_id: userId })
        .sort({ last_match_date: -1, total_matches: -1, updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .then(docs => docs.map(toOpponentProfile))

  const enriched = await Promise.all(
    base.map(async o => {
      const recent = await listRecentMatchesByOpponent({ userId, opponentNameAlias: o.opponent_name_alias, limit: 5 })
      const last5 = recent.filter(m => m.match_result !== 'PRACTICE')
      const last_5_total = last5.length
      const last_5_wins = last5.filter(m => m.match_result === 'WIN').length
      const is_nemesis = (o.total_matches || 0) >= 5 && (o.win_rate || 0) < 0.35
      return { ...o, recent_form: { last_5_wins, last_5_total }, is_nemesis }
    })
  )

  return enriched
}

export async function deleteOpponentByAlias(params: { userId: string; opponentNameAlias: string; redis?: any }) {
  const alias = String(params.opponentNameAlias || '').trim()
  if (!alias) return { deleted_matches: 0, deleted_opponent: false }
  const deletedMatches = await deleteMatchesByOpponentAlias({ userId: params.userId, opponentNameAlias: alias, redis: params.redis })
  if (env.useInMemoryStore) {
    const id = `${params.userId}:${alias}`
    const deletedOpponent = memoryOpponents.delete(id)
    return { deleted_matches: deletedMatches.deleted, deleted_opponent: deletedOpponent }
  }
  const res = await OpponentProfileModel.deleteOne({ user_id: params.userId, opponent_name_alias: alias })
  return { deleted_matches: deletedMatches.deleted, deleted_opponent: Boolean((res as any)?.deletedCount) }
}

export async function updateOpponentNotes(params: { userId: string; opponentNameAlias: string; notes: string }) {
  const alias = String(params.opponentNameAlias || '').trim()
  const notes = String(params.notes || '').trim().slice(0, 500)
  if (!alias) return null
  if (env.useInMemoryStore) {
    const key = `${params.userId}:${alias}`
    const prev = memoryOpponents.get(key)
    if (!prev) return null
    const next = { ...prev, personal_notes: notes || null }
    memoryOpponents.set(key, next)
    return next
  }
  const doc = await OpponentProfileModel.findOneAndUpdate(
    { user_id: params.userId, opponent_name_alias: alias },
    { $set: { personal_notes: notes || null } },
    { new: true }
  )
  if (!doc) return null
  return toOpponentProfile(doc)
}
