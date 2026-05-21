import { env } from '../../config/env'
import { PartnerProfileModel } from './partner.model'

export type PartnerProfile = {
  id: string
  user_id: string
  nickname: string
  play_style?: string | null
  main_weapons: string[]
  weaknesses: string[]
  court_preference?: 'ad_court' | 'deuce_court' | 'flexible' | null
  physical_state?: string | null
  last_match_date?: string | null
  created_at?: string
  updated_at?: string
}

const memoryPartners = new Map<string, PartnerProfile>()

function toPartnerProfile(doc: any): PartnerProfile {
  return {
    id: String(doc._id),
    user_id: doc.user_id,
    nickname: doc.nickname,
    play_style: doc.play_style,
    main_weapons: doc.main_weapons || [],
    weaknesses: doc.weaknesses || [],
    court_preference: doc.court_preference,
    physical_state: doc.physical_state,
    last_match_date: doc.last_match_date ? new Date(doc.last_match_date).toISOString() : null,
    created_at: doc.createdAt?.toISOString?.() || undefined,
    updated_at: doc.updatedAt?.toISOString?.() || undefined
  }
}

export async function upsertPartnerProfile(params: {
  userId: string
  nickname: string
  play_style?: string | null
  main_weapons?: string[]
  weaknesses?: string[]
  court_preference?: 'ad_court' | 'deuce_court' | 'flexible' | null
  physical_state?: string | null
  last_match_date?: Date | null
}) {
  const nickname = params.nickname.trim()
  if (!nickname) return null

  if (env.useInMemoryStore) {
    const id = `${params.userId}:${nickname}`
    const prev = memoryPartners.get(id)
    const merged: PartnerProfile = {
      id,
      user_id: params.userId,
      nickname,
      play_style: params.play_style ?? prev?.play_style ?? null,
      main_weapons: params.main_weapons ?? prev?.main_weapons ?? [],
      weaknesses: params.weaknesses ?? prev?.weaknesses ?? [],
      court_preference: params.court_preference ?? prev?.court_preference ?? null,
      physical_state: params.physical_state ?? prev?.physical_state ?? null,
      last_match_date: (params.last_match_date ?? (prev?.last_match_date ? new Date(prev.last_match_date) : null))?.toISOString?.() || null
    }
    memoryPartners.set(id, merged)
    return merged
  }

  const doc = await PartnerProfileModel.findOneAndUpdate(
    { user_id: params.userId, nickname },
    {
      $set: {
        play_style: params.play_style ?? null,
        main_weapons: params.main_weapons ?? [],
        weaknesses: params.weaknesses ?? [],
        court_preference: params.court_preference ?? null,
        physical_state: params.physical_state ?? null,
        last_match_date: params.last_match_date ?? null
      }
    },
    { upsert: true, new: true }
  )

  return toPartnerProfile(doc)
}

export async function getPartnerById(userId: string, id: string) {
  if (env.useInMemoryStore) {
    const doc = memoryPartners.get(id)
    if (!doc || doc.user_id !== userId) return null
    return doc
  }
  const doc = await PartnerProfileModel.findOne({ _id: id, user_id: userId })
  if (!doc) return null
  return toPartnerProfile(doc)
}

export async function searchPartners(userId: string, q: string, limit = 10) {
  const keyword = (q || '').trim()
  if (!keyword) return []

  if (env.useInMemoryStore) {
    return Array.from(memoryPartners.values())
      .filter(p => p.user_id === userId && p.nickname.includes(keyword))
      .slice(0, limit)
  }

  const docs = await PartnerProfileModel.find({
    user_id: userId,
    nickname: { $regex: keyword, $options: 'i' }
  })
    .sort({ updatedAt: -1 })
    .limit(limit)

  return docs.map(toPartnerProfile)
}

export async function updatePartnerById(userId: string, id: string, patch: Partial<PartnerProfile>) {
  if (env.useInMemoryStore) {
    const prev = memoryPartners.get(id)
    if (!prev || prev.user_id !== userId) return null
    const next: PartnerProfile = {
      ...prev,
      play_style: patch.play_style ?? prev.play_style ?? null,
      main_weapons: patch.main_weapons ?? prev.main_weapons ?? [],
      weaknesses: patch.weaknesses ?? prev.weaknesses ?? [],
      court_preference: (patch as any).court_preference ?? prev.court_preference ?? null,
      physical_state: patch.physical_state ?? prev.physical_state ?? null,
      last_match_date: patch.last_match_date ?? prev.last_match_date ?? null
    }
    memoryPartners.set(id, next)
    return next
  }

  const doc = await PartnerProfileModel.findOneAndUpdate({ _id: id, user_id: userId }, { $set: patch }, { new: true })
  if (!doc) return null
  return toPartnerProfile(doc)
}

