import { env } from '../../config/env'
import { SubscriptionModel } from './subscription.model'

export type SubscriptionStatus = {
  user_id: string
  plan: 'FREE' | 'MONTHLY' | 'YEARLY'
  status: 'ACTIVE' | 'EXPIRED' | 'TRIAL'
  is_pro: boolean
}

const memory = new Map<string, SubscriptionStatus>()

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  if (env.useInMemoryStore) {
    return memory.get(userId) || { user_id: userId, plan: 'FREE', status: 'TRIAL', is_pro: false }
  }

  const doc = await SubscriptionModel.findOne({ user_id: userId })
  if (!doc) return { user_id: userId, plan: 'FREE', status: 'TRIAL', is_pro: false }
  const plan = doc.plan as SubscriptionStatus['plan']
  const status = doc.status as SubscriptionStatus['status']
  const isPro = status === 'ACTIVE' && plan !== 'FREE'
  return { user_id: userId, plan, status, is_pro: isPro }
}

export async function devSetSubscription(userId: string, plan: SubscriptionStatus['plan'], status: SubscriptionStatus['status']) {
  const isPro = status === 'ACTIVE' && plan !== 'FREE'
  if (env.useInMemoryStore) {
    const next = { user_id: userId, plan, status, is_pro: isPro }
    memory.set(userId, next)
    return next
  }
  await SubscriptionModel.findOneAndUpdate(
    { user_id: userId },
    { $set: { plan, status, updated_at: new Date() } },
    { upsert: true }
  )
  return { user_id: userId, plan, status, is_pro: isPro }
}
