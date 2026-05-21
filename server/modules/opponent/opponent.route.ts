import { FastifyInstance, FastifyReply } from 'fastify'
import { AppError } from '../../utils/AppError'
import { getSubscriptionStatus } from '../subscription/subscription.service'
import { deleteOpponentByAlias, getOpponentByAlias, listOpponents, recalculateOpponentProfile, searchOpponents, updateOpponentNotes } from './opponent.service'

export async function registerOpponentRoutes(app: FastifyInstance) {
  app.get('/api/opponents/search', { preHandler: app.authenticate }, async (request, reply: FastifyReply) => {
    const q = String((request.query as any)?.q || '')
    const limitRaw = (request.query as any)?.limit
    const limit = Math.min(20, Math.max(1, Number(limitRaw || 10)))
    const items = await searchOpponents(request.user.id, q, limit)
    reply.success({ items })
  })

  app.get(
    '/api/opponents',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const sub = await getSubscriptionStatus(request.user.id)
      const limitRaw = (request.query as any)?.limit
      const offsetRaw = (request.query as any)?.offset
      const hardLimit = sub.is_pro ? 50 : 3
      const limit = Math.min(hardLimit, Math.max(1, Number(limitRaw || 20)))
      const offset = Math.max(0, Number(offsetRaw || 0))
      const items = await listOpponents(request.user.id, limit, offset)
      reply.success({ items, limit, offset })
    }
  )

  app.get(
    '/api/opponents/:alias',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const alias = decodeURIComponent((request.params as any).alias)
      const profile = await getOpponentByAlias(request.user.id, alias)
      if (!profile) throw new AppError('对手不存在', 404, 'OPPONENT_NOT_FOUND')
      reply.success({ opponent: profile })
    }
  )

  app.post(
    '/api/opponents/:alias/recalculate',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const alias = decodeURIComponent((request.params as any).alias)
      const profile = await recalculateOpponentProfile(request.user.id, alias)
      reply.success({ opponent: profile })
    }
  )

  app.delete(
    '/api/opponents/:alias',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const alias = decodeURIComponent((request.params as any).alias)
      const res = await deleteOpponentByAlias({ userId: request.user.id, opponentNameAlias: alias, redis: app.redis })
      if (!res.deleted_opponent && res.deleted_matches === 0) throw new AppError('对手不存在', 404, 'OPPONENT_NOT_FOUND')
      reply.success({ success: true, deleted_matches: res.deleted_matches })
    }
  )

  app.put<{ Body: { notes?: string } }>(
    '/api/opponents/:alias/notes',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const alias = decodeURIComponent((request.params as any).alias)
      const notes = String((request.body as any)?.notes || '')
      const updated = await updateOpponentNotes({ userId: request.user.id, opponentNameAlias: alias, notes })
      if (!updated) throw new AppError('对手不存在', 404, 'OPPONENT_NOT_FOUND')
      reply.success({ opponent: updated })
    }
  )
}
