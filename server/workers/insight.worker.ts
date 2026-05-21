import { Worker } from 'bullmq'
import { connectMongo } from '../config/db'
import { env } from '../config/env'
import { generateMonthlyInsight } from '../modules/insight/insight.service'

function buildConnection(url: string) {
  const u = new URL(url)
  const port = u.port ? Number(u.port) : 6379
  const db = u.pathname && u.pathname.length > 1 ? Number(u.pathname.slice(1)) : 0
  return {
    host: u.hostname,
    port,
    password: u.password || undefined,
    username: u.username || undefined,
    db: Number.isFinite(db) ? db : 0
  }
}

export async function startInsightWorker() {
  if (!env.redisUrl) throw new Error('缺少 REDIS_URL')
  await connectMongo()

  const worker = new Worker(
    'insight:generate',
    async (job: any) => {
      const { userId, periodStart, periodEnd } = job.data as any
      await generateMonthlyInsight({
        userId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        redis: undefined
      })
    },
    { connection: buildConnection(env.redisUrl) as any }
  )

  return worker
}

if (require.main === module) {
  startInsightWorker().catch(err => {
    process.stderr.write(String(err))
    process.exit(1)
  })
}
