import { FastifyInstance, FastifyReply } from 'fastify'
import { ConfirmMatchDTO, CreateCircleDTO } from '../../../shared/types'
import { AppError } from '../../utils/AppError'
import { confirmCircleMatch, createCircle, getCircle, getLeaderboard, listCircles } from './social.service'

export async function registerSocialRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateCircleDTO }>(
    '/api/circle',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const body = request.body
      if (!body?.circle_name) throw new AppError('缺少圈子名称', 400, 'VALIDATION_ERROR')
      const circle = await createCircle(request.user.id, body)
      reply.success({ circle })
    }
  )

  app.get('/api/circle/list', { preHandler: app.authenticate }, async (request, reply: FastifyReply) => {
    const items = await listCircles(request.user.id)
    reply.success({ items })
  })

  app.get<{ Params: { id: string } }>(
    '/api/circle/:id',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const circle = await getCircle(request.user.id, request.params.id)
      if (!circle) throw new AppError('圈子不存在', 404, 'CIRCLE_NOT_FOUND')
      reply.success({ circle })
    }
  )

  app.get<{ Params: { id: string } }>(
    '/api/circle/:id/leaderboard',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const items = await getLeaderboard(request.user.id, request.params.id)
      reply.success({ items })
    }
  )

  app.post<{ Body: ConfirmMatchDTO }>(
    '/api/circle/confirm',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const body = request.body
      if (!body?.match_id || typeof body.confirmed !== 'boolean') {
        throw new AppError('缺少确认参数', 400, 'VALIDATION_ERROR')
      }
      const result = await confirmCircleMatch(request.user.id, body)
      reply.success({ confirmation: result })
    }
  )
}
