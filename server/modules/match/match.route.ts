import { FastifyInstance, FastifyReply } from 'fastify'
import { CreateMatchDTO, SubmitClarificationDTO } from '../../../shared/types'
import { AppError } from '../../utils/AppError'
import {
  createMatchRecord,
  deleteMatchById,
  getMatchById,
  listMatches,
  listMatchesByOpponent,
  setMatchFeedbackFlag,
  regenerateMatchAnalysis,
  submitClarification
} from './match.service'

export async function registerMatchRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateMatchDTO }>(
    '/api/match',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const dto = request.body
      if (!dto || !dto.match_result) {
        throw new AppError('缺少比赛结果', 400, 'VALIDATION_ERROR')
      }
      const userId = request.user.id
      const created = await createMatchRecord(dto, userId, app.redis)
      reply.success({ match_id: created.match.id, clarification: created.clarification })
    }
  )

  app.get(
    '/api/match',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const limitRaw = (request.query as any)?.limit
      const offsetRaw = (request.query as any)?.offset
      const limit = Math.min(50, Math.max(1, Number(limitRaw || 20)))
      const offset = Math.max(0, Number(offsetRaw || 0))
      const items = await listMatches(request.user.id, limit, offset)
      reply.success({ items, limit, offset })
    }
  )

  app.post<{ Params: { id: string }; Body: SubmitClarificationDTO }>(
    '/api/match/:id/clarification',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const matchId = request.params.id
      const body = request.body
      if (!body || (!body.skipped && !body.selected_option)) {
        throw new AppError('缺少追问回答', 400, 'VALIDATION_ERROR')
      }
      const userId = request.user.id
      const updated = await submitClarification({
        matchId,
        userId,
        input: body,
        redis: app.redis
      })
      if (!updated) {
        throw new AppError('比赛记录不存在', 404, 'MATCH_NOT_FOUND')
      }
      reply.success({ match: updated })
    }
  )

  app.post<{ Params: { id: string } }>(
    '/api/match/:id/regenerate',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const matchId = request.params.id
      const userId = request.user.id
      const updated = await regenerateMatchAnalysis({ matchId, userId, redis: app.redis })
      if (!updated) {
        throw new AppError('比赛记录不存在', 404, 'MATCH_NOT_FOUND')
      }
      reply.success({ match: updated })
    }
  )

  app.get<{ Params: { id: string } }>(
    '/api/match/:id',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const record = await getMatchById(request.params.id, request.user.id)
      if (!record) throw new AppError('比赛记录不存在', 404, 'MATCH_NOT_FOUND')
      reply.success({ match: record })
    }
  )

  app.get<{ Params: { id: string } }>(
    '/api/match/:id/analysis',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const record = await getMatchById(request.params.id, request.user.id)
      if (!record) throw new AppError('比赛记录不存在', 404, 'MATCH_NOT_FOUND')
      const analysis = (record as any)?.ai_analysis?.match_analysis || null
      reply.success({ analysis_type: 'match', analysis, generated_at: (record as any)?.ai_analysis?.generated_at || record.updated_at })
    }
  )

  app.delete<{ Params: { id: string } }>(
    '/api/match/:id',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const removed = await deleteMatchById({ userId: request.user.id, matchId: request.params.id, redis: app.redis })
      if (!removed) throw new AppError('比赛记录不存在', 404, 'MATCH_NOT_FOUND')
      reply.success({ success: true })
    }
  )

  app.get(
    '/api/match/opponent/:alias',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const alias = decodeURIComponent((request.params as any).alias)
      const items = await listMatchesByOpponent(request.user.id, alias)
      reply.success({ items })
    }
  )

  app.patch<{ Params: { id: string }; Body: { is_helpful: boolean } }>(
    '/api/match/:id/feedback',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const body = request.body
      if (!body || typeof body.is_helpful !== 'boolean') {
        throw new AppError('缺少反馈字段', 400, 'VALIDATION_ERROR')
      }
      const updated = await setMatchFeedbackFlag({
        matchId: request.params.id,
        userId: request.user.id,
        is_helpful: body.is_helpful
      })
      if (!updated) throw new AppError('比赛记录不存在', 404, 'MATCH_NOT_FOUND')
      reply.success({ success: true })
    }
  )
}
