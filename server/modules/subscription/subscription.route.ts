import { FastifyInstance, FastifyReply } from 'fastify'
import { AppError } from '../../utils/AppError'
import { devSetSubscription, getSubscriptionStatus } from './subscription.service'

export async function registerSubscriptionRoutes(app: FastifyInstance) {
  app.get(
    '/api/subscription/status',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const status = await getSubscriptionStatus(request.user.id)
      reply.success({ subscription: status })
    }
  )

  app.post(
    '/api/subscription/dev-set',
    { preHandler: app.authenticate },
    async (request, reply: FastifyReply) => {
      const body = request.body as any
      const plan = body?.plan
      const status = body?.status
      if (!plan || !status) throw new AppError('缺少订阅字段', 400, 'VALIDATION_ERROR')
      const updated = await devSetSubscription(request.user.id, plan, status)
      reply.success({ subscription: updated })
    }
  )
}
