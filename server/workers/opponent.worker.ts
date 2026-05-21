import { Worker } from 'bullmq'
import { env } from '../config/env'
import { connectMongo } from '../config/db'
import { recalculateOpponentProfile } from '../modules/opponent/opponent.service'

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

export async function startOpponentWorker() {
  if (!env.redisUrl) throw new Error('缺少 REDIS_URL')
  await connectMongo()

  const worker = new Worker(
    'opponent:recalculate',
    async (job: any) => {
      const { userId, opponentNameAlias } = job.data as any
      await recalculateOpponentProfile(userId, opponentNameAlias)
    },
    { connection: buildConnection(env.redisUrl) as any }
  )

  return worker
}

if (require.main === module) {
  startOpponentWorker().catch(err => {
    process.stderr.write(String(err))
    process.exit(1)
  })
}
