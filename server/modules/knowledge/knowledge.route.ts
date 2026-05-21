import { FastifyInstance, FastifyReply } from 'fastify'
import { AppError } from '../../utils/AppError'
import { buildKnowledgeContext } from '../../services/knowledge.service'

export async function registerKnowledgeRoutes(app: FastifyInstance) {
  app.post(
    '/api/knowledge/match',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const body = request.body as any
      if (!body || !body.match_result || !body.score_analysis) {
        throw new AppError('缺少必要字段', 400, 'VALIDATION_ERROR')
      }
      const ctx = buildKnowledgeContext({
        opponent_tags: body.opponent_tags || [],
        self_state_tags: body.self_state_tags || [],
        most_painful_point: body.most_painful_point || '',
        match_result: body.match_result,
        score_analysis: body.score_analysis,
        ai_clarification: body.ai_clarification
      })
      reply.success(ctx)
    }
  )
}
