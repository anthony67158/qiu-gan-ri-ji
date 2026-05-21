import { FastifyInstance, FastifyReply } from 'fastify'
import { getDoublesPartnerDetail, listDoublesPartners } from './doubles.service'
import { AppError } from '../../utils/AppError'

export async function registerDoublesRoutes(app: FastifyInstance) {
  app.get('/api/doubles/partners', { preHandler: app.authenticate }, async (request, reply: FastifyReply) => {
    const items = await listDoublesPartners(request.user.id)
    reply.success({ items })
  })

  app.get<{ Params: { name: string } }>(
    '/api/doubles/partner/:name',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const partner = await getDoublesPartnerDetail(request.user.id, request.params.name)
      if (!partner) throw new AppError('搭档不存在', 404, 'PARTNER_NOT_FOUND')
      reply.success({ partner })
    }
  )
}
