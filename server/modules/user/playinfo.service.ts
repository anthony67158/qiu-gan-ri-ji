import { env } from '../../config/env'
import { UserPlayInfoModel } from './playinfo.model'
import { listMatches } from '../match/match.service'

export type MyPlayInfo = {
  tennis_age?: string | null
  play_style?: string | null
  main_weapons?: string[]
  weaknesses?: string[]
  mobility?: string[]
  clutch_state?: string | null
  updated_at?: string | null
}

const memoryStore = new Map<string, MyPlayInfo | null>()

export async function getMyPlayInfo(userId: string): Promise<MyPlayInfo | null> {
  if (env.useInMemoryStore) {
    const v = memoryStore.get(userId) || null
    return v ? { ...v } : null
  }
  const doc = await UserPlayInfoModel.findOne({ user_id: userId })
  const info = doc?.my_play_info || null
  if (!info && !doc?.tennis_age) return null
  return {
    tennis_age: doc?.tennis_age ?? null,
    play_style: info.play_style ?? null,
    main_weapons: info.main_weapons || [],
    weaknesses: info.weaknesses || [],
    mobility: info.mobility || [],
    clutch_state: info.clutch_state ?? null,
    updated_at: info.updated_at ? new Date(info.updated_at).toISOString() : null
  }
}

export async function upsertMyPlayInfo(userId: string, patch: Partial<MyPlayInfo>): Promise<MyPlayInfo> {
  const now = new Date()
  if (env.useInMemoryStore) {
    const prev = memoryStore.get(userId) || null
    const merged: MyPlayInfo = {
      tennis_age: patch.tennis_age ?? prev?.tennis_age ?? null,
      play_style: patch.play_style ?? prev?.play_style ?? null,
      main_weapons: patch.main_weapons ?? prev?.main_weapons ?? [],
      weaknesses: patch.weaknesses ?? prev?.weaknesses ?? [],
      mobility: patch.mobility ?? prev?.mobility ?? [],
      clutch_state: patch.clutch_state ?? prev?.clutch_state ?? null,
      updated_at: now.toISOString()
    }
    memoryStore.set(userId, merged)
    return merged
  }
  const prev = await UserPlayInfoModel.findOne({ user_id: userId })
  const prevInfo = prev?.my_play_info || null
  const merged = {
    tennis_age: patch.tennis_age ?? prev?.tennis_age ?? null,
    my_play_info: {
      play_style: patch.play_style ?? prevInfo?.play_style ?? null,
      main_weapons: patch.main_weapons ?? prevInfo?.main_weapons ?? [],
      weaknesses: patch.weaknesses ?? prevInfo?.weaknesses ?? [],
      mobility: patch.mobility ?? prevInfo?.mobility ?? [],
      clutch_state: patch.clutch_state ?? prevInfo?.clutch_state ?? null,
      updated_at: now
    }
  }
  const doc = await UserPlayInfoModel.findOneAndUpdate({ user_id: userId }, { $set: merged }, { upsert: true, new: true })
  const info = doc.my_play_info
  return {
    tennis_age: doc.tennis_age ?? null,
    play_style: info.play_style ?? null,
    main_weapons: info.main_weapons || [],
    weaknesses: info.weaknesses || [],
    mobility: info.mobility || [],
    clutch_state: info.clutch_state ?? null,
    updated_at: info.updated_at ? new Date(info.updated_at).toISOString() : null
  }
}

function getRecordTime(m: any) {
  const raw = m?.date_time || m?.created_at || m?.createdAt || null
  const t = raw ? new Date(raw).getTime() : NaN
  return Number.isFinite(t) ? t : 0
}

function isPracticeRecord(m: any) {
  return String(m?.match_result || '').toUpperCase() === 'PRACTICE' || Boolean(m?.practice_info)
}

function durationToHours(v: any) {
  const s = String(v || '')
  if (s === '30min') return 0.5
  if (s === '1h') return 1
  if (s === '1.5h') return 1.5
  if (s === '2h') return 2
  if (s === '2h_plus') return 2.2
  return 0
}

function countByMatchPresence(list: any[], getter: (m: any) => string[]) {
  const map = new Map<string, number>()
  for (const m of list) {
    const arr = getter(m) || []
    const uniq = Array.from(new Set(arr.filter(Boolean)))
    for (const v of uniq) {
      map.set(v, (map.get(v) || 0) + 1)
    }
  }
  return map
}

function buildRanking(map: Map<string, number>, total: number, keyName: 'method' | 'reason') {
  const items = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, count]) => ({
      [keyName]: k,
      count,
      percentage: total ? Number((count / total).toFixed(4)) : 0
    }))
  return items as any[]
}

function buildTrendBuckets(list: any[], period: '30d' | '90d' | 'all') {
  const sorted = list.slice().sort((a, b) => getRecordTime(a) - getRecordTime(b))
  if (!sorted.length) return []
  const buckets: Array<{ label: string; matches: any[] }> = []

  if (period === '30d') {
    const start = getRecordTime(sorted[0])
    const weekMs = 7 * 24 * 60 * 60 * 1000
    for (const m of sorted) {
      const idx = Math.floor((getRecordTime(m) - start) / weekMs) + 1
      const label = `W${idx}`
      const last = buckets[buckets.length - 1]
      if (!last || last.label !== label) buckets.push({ label, matches: [m] })
      else last.matches.push(m)
    }
  } else {
    for (const m of sorted) {
      const d = new Date(getRecordTime(m))
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const last = buckets[buckets.length - 1]
      if (!last || last.label !== label) buckets.push({ label, matches: [m] })
      else last.matches.push(m)
    }
  }

  return buckets.map(b => {
    const matches = b.matches.filter((m: any) => !isPracticeRecord(m))
    const total = matches.length
    const wins = matches.filter((m: any) => String(m.match_result || '').toUpperCase() === 'WIN').length
    return { label: b.label, win_rate: total ? Number((wins / total).toFixed(4)) : 0, matches: total }
  })
}

export async function buildUserDashboard(params: { userId: string; period: '30d' | '90d' | 'all' }) {
  const now = Date.now()
  const start =
    params.period === '30d' ? now - 30 * 24 * 60 * 60 * 1000 : params.period === '90d' ? now - 90 * 24 * 60 * 60 * 1000 : 0

  const all = await listMatches(params.userId, 5000, 0)
  const filtered = start ? all.filter(m => getRecordTime(m) >= start) : all
  const matches = filtered.filter(m => !isPracticeRecord(m))
  const practices = filtered.filter(m => isPracticeRecord(m))

  const wins = matches.filter(m => String(m.match_result || '').toUpperCase() === 'WIN').length
  const losses = matches.filter(m => String(m.match_result || '').toUpperCase() === 'LOSE').length
  const total = matches.length
  const win_rate = total ? Number((wins / total).toFixed(4)) : 0

  const singles = matches.filter(m => String(m.match_type || '').toLowerCase() !== 'doubles')
  const doubles = matches.filter(m => String(m.match_type || '').toLowerCase() === 'doubles')
  const singles_w = singles.filter(m => String(m.match_result || '').toUpperCase() === 'WIN').length
  const doubles_w = doubles.filter(m => String(m.match_result || '').toUpperCase() === 'WIN').length

  const scoringMap = countByMatchPresence(matches, m => (m as any)?.post_match_summary?.scoring_methods || [])
  const losingMap = countByMatchPresence(matches, m => (m as any)?.post_match_summary?.losing_reasons || [])

  const match_overview = {
    total,
    wins,
    losses,
    win_rate,
    singles: { total: singles.length, win_rate: singles.length ? Number((singles_w / singles.length).toFixed(4)) : 0 },
    doubles: { total: doubles.length, win_rate: doubles.length ? Number((doubles_w / doubles.length).toFixed(4)) : 0 }
  }

  const win_rate_trend = buildTrendBuckets(matches, params.period)

  const scoring_methods_ranking = buildRanking(scoringMap, total, 'method')

  const losingSorted = buildRanking(losingMap, total, 'reason').map((x: any) => ({ ...x, is_critical: x.percentage >= 0.7, consecutive: 0 }))
  const matchesDesc = matches.slice().sort((a, b) => getRecordTime(b) - getRecordTime(a))
  for (const row of losingSorted) {
    let c = 0
    for (const m of matchesDesc) {
      const arr = ((m as any)?.post_match_summary?.losing_reasons || []) as string[]
      if (arr.includes(row.reason)) c += 1
      else break
    }
    row.consecutive = c
  }

  const practice_overview = {
    total_sessions: practices.length,
    total_hours: Number(practices.reduce((acc, p) => acc + durationToHours((p as any)?.practice_info?.duration), 0).toFixed(2)),
    type_distribution: (() => {
      const map = new Map<string, number>()
      for (const p of practices) {
        const t = String((p as any)?.practice_info?.practice_type || '').trim()
        if (!t) continue
        map.set(t, (map.get(t) || 0) + 1)
      }
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count }))
    })(),
    focus_distribution: (() => {
      const map = new Map<string, number>()
      for (const p of practices) {
        const arr = (((p as any)?.practice_info?.focus_areas || []) as string[]).filter(Boolean)
        const uniq = Array.from(new Set(arr))
        for (const f of uniq) map.set(f, (map.get(f) || 0) + 1)
      }
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([focus, count]) => ({ focus, count }))
    })(),
    match_practice_ratio: `${total}:${practices.length}`
  }

  return {
    match_overview,
    win_rate_trend,
    scoring_methods_ranking,
    losing_reasons_ranking: losingSorted,
    practice_overview
  }
}
