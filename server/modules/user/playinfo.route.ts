import { FastifyInstance, FastifyReply } from 'fastify'
import { AppError } from '../../utils/AppError'
import { buildUserDashboard, getMyPlayInfo, upsertMyPlayInfo } from './playinfo.service'

export async function registerPlayInfoRoutes(app: FastifyInstance) {
  app.get('/api/user/play-info', { preHandler: app.authenticate }, async (request, reply: FastifyReply) => {
    const info = await getMyPlayInfo(request.user.id)
    reply.success({ play_info: info })
  })

  app.put('/api/user/play-info', { preHandler: app.authenticate }, async (request, reply: FastifyReply) => {
    const body = (request.body as any) || {}
    if (!body || typeof body !== 'object') {
      throw new AppError('请求体不合法', 400, 'VALIDATION_ERROR')
    }
    const info = await upsertMyPlayInfo(request.user.id, body)
    reply.success({ play_info: info })
  })

  app.get('/api/user/dashboard', { preHandler: app.authenticate }, async (request, reply: FastifyReply) => {
    const period = String((request.query as any)?.period || '30d') as any
    const normalized = period === '90d' || period === 'all' ? period : '30d'
    const dashboard = await buildUserDashboard({ userId: request.user.id, period: normalized })
    reply.success({ dashboard, period: normalized })
  })
}
