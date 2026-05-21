import { Queue } from 'bullmq'
import { env } from '../config/env'
import { generateMonthlyInsight } from '../modules/insight/insight.service'
import { recalculateOpponentProfile } from '../modules/opponent/opponent.service'
import { detectAndStoreTrends } from '../modules/trend/trend.service'
import { buildPreMatchIntel } from '../modules/intel/intel.service'
import { listDoublesPartners } from '../modules/doubles/doubles.service'

type RedisConnection = any

let opponentQueue: Queue | null = null
let insightQueue: Queue | null = null
let trendQueue: Queue | null = null
let intelQueue: Queue | null = null
let doublesQueue: Queue | null = null

function getOpponentQueue(redis: RedisConnection) {
  if (opponentQueue) return opponentQueue
  opponentQueue = new Queue('opponent:recalculate', { connection: redis })
  return opponentQueue
}

function getInsightQueue(redis: RedisConnection) {
  if (insightQueue) return insightQueue
  insightQueue = new Queue('insight:generate', { connection: redis })
  return insightQueue
}

function getTrendQueue(redis: RedisConnection) {
  if (trendQueue) return trendQueue
  trendQueue = new Queue('trend:detect', { connection: redis })
  return trendQueue
}

function getIntelQueue(redis: RedisConnection) {
  if (intelQueue) return intelQueue
  intelQueue = new Queue('intel:pre-generate', { connection: redis })
  return intelQueue
}

function getDoublesQueue(redis: RedisConnection) {
  if (doublesQueue) return doublesQueue
  doublesQueue = new Queue('doubles:update', { connection: redis })
  return doublesQueue
}

export async function enqueueOpponentRecalculate(params: {
  userId: string
  opponentNameAlias: string
  redis?: RedisConnection
}) {
  if (!params.opponentNameAlias) return

  if (params.redis) {
    const queue = getOpponentQueue(params.redis)
    await queue.add(
      'recalculate',
      { userId: params.userId, opponentNameAlias: params.opponentNameAlias },
      { removeOnComplete: 100, removeOnFail: 100 }
    )
    return
  }

  if (env.useInMemoryStore) {
    await recalculateOpponentProfile(params.userId, params.opponentNameAlias)
  }
}

export async function enqueueTrendDetect(params: { userId: string; redis?: RedisConnection }) {
  if (params.redis) {
    const queue = getTrendQueue(params.redis)
    await queue.add('detect', { userId: params.userId }, { removeOnComplete: 100, removeOnFail: 100 })
    return
  }
  if (env.useInMemoryStore) {
    await detectAndStoreTrends(params.userId)
  }
}

export async function enqueueIntelPreGenerate(params: { userId: string; opponentNameAlias: string; redis?: RedisConnection }) {
  if (!params.opponentNameAlias) return
  if (params.redis) {
    const queue = getIntelQueue(params.redis)
    await queue.add(
      'pre-generate',
      { userId: params.userId, opponentNameAlias: params.opponentNameAlias },
      { removeOnComplete: 100, removeOnFail: 100 }
    )
    return
  }
  if (env.useInMemoryStore) {
    await buildPreMatchIntel({ userId: params.userId, opponentNameAlias: params.opponentNameAlias, redis: undefined })
  }
}

export async function enqueueDoublesUpdate(params: { userId: string; redis?: RedisConnection }) {
  if (params.redis) {
    const queue = getDoublesQueue(params.redis)
    await queue.add('update', { userId: params.userId }, { removeOnComplete: 100, removeOnFail: 100 })
    return
  }
  if (env.useInMemoryStore) {
    await listDoublesPartners(params.userId)
  }
}

export async function enqueueInsightGenerate(params: {
  userId: string
  periodStart: Date
  periodEnd: Date
  redis?: RedisConnection
}) {
  if (params.redis) {
    const queue = getInsightQueue(params.redis)
    await queue.add(
      'generate',
      {
        userId: params.userId,
        periodStart: params.periodStart.toISOString(),
        periodEnd: params.periodEnd.toISOString()
      },
      { removeOnComplete: 50, removeOnFail: 50 }
    )
    return
  }

  if (env.useInMemoryStore) {
    await generateMonthlyInsight({
      userId: params.userId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      redis: undefined
    })
  }
}
