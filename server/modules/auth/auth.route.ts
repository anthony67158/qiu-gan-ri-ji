import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { AppError } from '../../utils/AppError'
import { wechatCodeToSession } from './auth.service'

type DevLoginBody = {
  id?: string
  nickname?: string
}

type WechatLoginBody = {
  code: string
  nickname?: string
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post(
    '/auth/login',
    async (request: FastifyRequest<{ Body: WechatLoginBody }>, reply: FastifyReply) => {
      const code = request.body?.code
      if (!code) throw new AppError('缺少 code', 400, 'VALIDATION_ERROR')
      const session = await wechatCodeToSession(code)
      const nickname = request.body?.nickname?.trim() || '用户'
      const token = await reply.jwtSign({ id: session.openid, nickname })
      reply.success({ token, user: { id: session.openid, nickname } })
    }
  )

  app.post(
    '/auth/dev-login',
    async (request: FastifyRequest<{ Body: DevLoginBody }>, reply: FastifyReply) => {
      const id = request.body?.id?.trim() || 'dev-user'
      const nickname = request.body?.nickname?.trim() || 'Dev'

      const token = await reply.jwtSign({ id, nickname })
      reply.success({ token, user: { id, nickname } })
    }
  )
}
