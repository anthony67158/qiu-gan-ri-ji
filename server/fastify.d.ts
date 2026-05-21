import 'fastify'
import '@fastify/jwt'
import Redis from 'ioredis'

declare module 'fastify' {
  interface FastifyInstance {
    redis?: Redis
  }

  interface FastifyReply {
    success: <T>(data: T) => void
    fail: (error: string, statusCode?: number, code?: string) => void
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; nickname?: string }
    user: { id: string; nickname?: string }
  }
}
