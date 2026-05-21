import { FastifyInstance, FastifyReply } from 'fastify'
import { detectAndStoreTrends, generateTrendAnalysis, listLatestTrends, listTrendHistory } from './trend.service'

export async function registerTrendRoutes(app: FastifyInstance) {
  app.get('/api/trend/alerts', { preHandler: app.authenticate }, async (request, reply: FastifyReply) => {
    const userId = request.user.id
    const alerts = await listLatestTrends(userId)
    reply.success({ alerts })
  })

  app.get('/api/trend/history', { preHandler: app.authenticate }, async (request, reply: FastifyReply) => {
    const userId = request.user.id
    const limitRaw = (request.query as any)?.limit
    const limit = Math.min(100, Math.max(1, Number(limitRaw || 50)))
    const items = await listTrendHistory(userId, limit)
    reply.success({ items })
  })

  app.post('/api/trend/detect', { preHandler: app.authenticate }, async (request, reply: FastifyReply) => {
    const userId = request.user.id
    const alerts = await detectAndStoreTrends(userId)
    reply.success({ alerts })
  })

  app.get('/api/analysis/trend', { preHandler: app.authenticate }, async (request, reply: FastifyReply) => {
    const userId = request.user.id
    const lastNRaw = (request.query as any)?.last_n
    const lastN = Math.min(30, Math.max(3, Number(lastNRaw || 5)))
    const analysis = await generateTrendAnalysis({ userId, lastN, redis: app.redis })
    reply.success({ analysis_type: 'trend', analysis, generated_at: new Date().toISOString() })
  })
}
