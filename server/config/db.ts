import mongoose from 'mongoose'
import Redis from 'ioredis'
import { env } from './env'

export type DbConnections = {
  mongo?: typeof mongoose
  redis?: Redis
}

export async function connectMongo() {
  if (!env.mongoUri) return undefined
  await mongoose.connect(env.mongoUri)
  return mongoose
}

export async function connectRedis() {
  if (!env.enableRedis || !env.redisUrl) return undefined
  const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: null })
  await redis.ping()
  return redis
}
