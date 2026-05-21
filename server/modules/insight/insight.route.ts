import { FastifyInstance, FastifyReply } from 'fastify'
import { AppError } from '../../utils/AppError'
import { getSubscriptionStatus } from '../subscription/subscription.service'
import { generateMonthlyInsight, listInsightReports, buildRecentCompare } from './insight.service'

export async function registerInsightRoutes(app: FastifyInstance) {
  app.get(
    '/api/insights',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const limitRaw = (request.query as any)?.limit
      const offsetRaw = (request.query as any)?.offset
      const limit = Math.min(50, Math.max(1, Number(limitRaw || 12)))
      const offset = Math.max(0, Number(offsetRaw || 0))
      const items = await listInsightReports(request.user.id, limit, offset)
      reply.success({ items, limit, offset })
    }
  )

  app.post(
    '/api/insights/generate',
    { preHandler: app.authenticate, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply: FastifyReply) => {
      const sub = await getSubscriptionStatus(request.user.id)
      if (!sub.is_pro) throw new AppError('此功能需要 PRO 会员', 403, 'PRO_REQUIRED')
      const body = request.body as any
      const periodStart = body?.period_start ? new Date(body.period_start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const periodEnd = body?.period_end ? new Date(body.period_end) : new Date()
      if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
        throw new AppError('时间格式不正确', 400, 'VALIDATION_ERROR')
      }
      const report = await generateMonthlyInsight({
        userId: request.user.id,
        periodStart,
        periodEnd,
        redis: app.redis
      })
      reply.success({ report })
    }
  )

  // v4.1：跨场对比，免费、轻量、不调 AI
  app.get(
    '/api/insight/recent-compare',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const result = await buildRecentCompare({ userId: request.user.id })
      reply.success(result)
    }
  )
}
