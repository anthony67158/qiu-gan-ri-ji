import { FastifyInstance, FastifyReply } from 'fastify'
import { AppError } from '../../utils/AppError'
import { getPartnerById, searchPartners, updatePartnerById } from './partner.service'

export async function registerPartnerRoutes(app: FastifyInstance) {
  app.get('/api/partners/search', { preHandler: app.authenticate }, async (request, reply: FastifyReply) => {
    const q = String((request.query as any)?.q || '')
    const limitRaw = (request.query as any)?.limit
    const limit = Math.min(20, Math.max(1, Number(limitRaw || 10)))
    const items = await searchPartners(request.user.id, q, limit)
    reply.success({ items })
  })

  app.get<{ Params: { id: string } }>(
    '/api/partners/:id',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const partner = await getPartnerById(request.user.id, request.params.id)
      if (!partner) throw new AppError('搭档不存在', 404, 'PARTNER_NOT_FOUND')
      reply.success({ partner })
    }
  )

  app.put<{ Params: { id: string }; Body: any }>(
    '/api/partners/:id',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const patch = request.body || {}
      const updated = await updatePartnerById(request.user.id, request.params.id, patch)
      if (!updated) throw new AppError('搭档不存在', 404, 'PARTNER_NOT_FOUND')
      reply.success({ partner: updated })
    }
  )
}

