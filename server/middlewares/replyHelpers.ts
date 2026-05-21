import { FastifyInstance, FastifyReply } from 'fastify'

export function registerReplyHelpers(app: FastifyInstance) {
  app.decorateReply('success', function success(this: FastifyReply, data: unknown) {
    this.send({ success: true, data })
  })

  app.decorateReply('fail', function fail(this: FastifyReply, error: string, statusCode = 400, code = 'BAD_REQUEST') {
    this.status(statusCode).send({ success: false, error, code })
  })
}
