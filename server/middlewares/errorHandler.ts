import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { AppError } from '../utils/AppError'

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code
      })
      return
    }

    const nodeEnv = String(process.env.NODE_ENV || 'development').toLowerCase()
    if (nodeEnv === 'development') {
      const msg = String((error as any)?.message || error || '服务异常')
      reply.status(500).send({
        success: false,
        error: msg,
        code: 'INTERNAL_ERROR'
      })
      return
    }

    reply.status(500).send({
      success: false,
      error: '服务异常',
      code: 'INTERNAL_ERROR'
    })
  })
}
