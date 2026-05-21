import { FastifyInstance, FastifyReply } from 'fastify'
import { buildPreMatchIntel } from './intel.service'

export async function registerIntelRoutes(app: FastifyInstance) {
  app.get<{ Params: { opponentName: string } }>(
    '/api/intel/:opponentName',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const opponentName = request.params.opponentName
      const result = await buildPreMatchIntel({ userId: request.user.id, opponentNameAlias: opponentName, redis: app.redis })
      reply.success({
        intel: result.intel,
        analysis_type: 'pre_match',
        analysis: result.analysis || null,
        generated_at: new Date().toISOString()
      })
    }
  )
}
