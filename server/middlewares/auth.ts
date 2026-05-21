import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { AppError } from '../utils/AppError'

export function registerAuthMiddleware(app: FastifyInstance) {
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      throw new AppError('未登录或登录已过期', 401, 'AUTH_REQUIRED')
    }
  })
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
