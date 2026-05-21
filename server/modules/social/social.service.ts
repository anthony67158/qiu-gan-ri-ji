import { CircleMember, CreateCircleDTO } from '../../../shared/types'
import { randomUUID } from 'crypto'

type Circle = {
  id: string
  user_id: string
  circle_name: string
  members: CircleMember[]
  created_at: string
}

const circles = new Map<string, Circle[]>()
const confirmations = new Map<string, { match_id: string; confirmed: boolean; updated_at: string }[]>()

function normalizeMembers(userId: string, invited?: string[]) {
  const base: CircleMember[] = [
    { user_id: userId, nickname: '我', win_rate: 0, recent_trend: 'stable' }
  ]
  const others = (invited || []).map(id => ({
    user_id: id,
    nickname: `成员${id.slice(0, 4)}`,
    win_rate: 0,
    recent_trend: 'stable' as const
  }))
  return [...base, ...others]
}

export async function createCircle(userId: string, input: CreateCircleDTO) {
  const list = circles.get(userId) || []
  const circle: Circle = {
    id: randomUUID(),
    user_id: userId,
    circle_name: input.circle_name,
    members: normalizeMembers(userId, input.invited_user_ids),
    created_at: new Date().toISOString()
  }
  list.push(circle)
  circles.set(userId, list)
  return circle
}

export async function listCircles(userId: string) {
  return circles.get(userId) || []
}

export async function getCircle(userId: string, circleId: string) {
  const list = circles.get(userId) || []
  return list.find(c => c.id === circleId) || null
}

export async function getLeaderboard(userId: string, circleId: string) {
  const circle = await getCircle(userId, circleId)
  if (!circle) return []
  return circle.members.sort((a, b) => b.win_rate - a.win_rate)
}

export async function confirmCircleMatch(userId: string, input: { match_id: string; confirmed: boolean }) {
  const list = confirmations.get(userId) || []
  const existed = list.find(x => x.match_id === input.match_id)
  const updated_at = new Date().toISOString()
  if (existed) {
    existed.confirmed = input.confirmed
    existed.updated_at = updated_at
  } else {
    list.push({ match_id: input.match_id, confirmed: input.confirmed, updated_at })
  }
  confirmations.set(userId, list)
  return { match_id: input.match_id, confirmed: input.confirmed, updated_at }
}
