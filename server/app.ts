import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import fastify, { FastifyReply, FastifyRequest } from 'fastify'
import { connectMongo, connectRedis } from './config/db'
import { env } from './config/env'
import { registerAuthMiddleware } from './middlewares/auth'
import { registerErrorHandler } from './middlewares/errorHandler'
import { registerReplyHelpers } from './middlewares/replyHelpers'
import { callAIText } from './services/ai.service'
import { AppError } from './utils/AppError'
import { registerAuthRoutes } from './modules/auth/auth.route'
import { registerMatchRoutes } from './modules/match/match.route'
import { registerOpponentRoutes } from './modules/opponent/opponent.route'
import { registerInsightRoutes } from './modules/insight/insight.route'
import { registerKnowledgeRoutes } from './modules/knowledge/knowledge.route'
import { registerSubscriptionRoutes } from './modules/subscription/subscription.route'
import { registerIntelRoutes } from './modules/intel/intel.route'
import { registerPlayInfoRoutes } from './modules/user/playinfo.route'
// v4.1 已下线（保留模块代码，仅摘除路由）：
// import { registerTrendRoutes } from './modules/trend/trend.route'
// import { registerSocialRoutes } from './modules/social/social.route'
// import { registerDoublesRoutes } from './modules/doubles/doubles.route'
// import { registerPartnerRoutes } from './modules/partner/partner.route'

export function buildApp() {
  const app = fastify({ logger: true })

  app.register(cors, { origin: true })
  app.register(rateLimit, { global: false })
  app.register(jwt, { secret: env.jwtSecret })

  registerReplyHelpers(app)
  registerErrorHandler(app)
  registerAuthMiddleware(app)

  app.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.success({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.get('/api/ai/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.success({
      provider: env.ai.provider,
      base_url: env.ai.baseUrl || null,
      model: env.ai.model || env.volcano.modelId || null,
      configured:
        env.ai.provider === 'openai_compatible'
          ? Boolean(env.ai.baseUrl && env.ai.apiKey && env.ai.model)
          : Boolean(env.volcano.apiKey && env.volcano.modelId)
    })
  })

  app.post(
    '/api/ai/test',
    { preHandler: app.authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const prompt = (request.body as any)?.prompt?.trim?.() || '请回复：OK'
      const text = await callAIText(prompt)
      if (!text) throw new AppError('AI 未配置或调用失败', 500, 'AI_UNAVAILABLE')
      reply.success({ text: text.slice(0, 800) })
    }
  )

  app.register(registerAuthRoutes)
  app.register(registerMatchRoutes)
  app.register(registerOpponentRoutes)
  app.register(registerInsightRoutes)
  app.register(registerKnowledgeRoutes)
  app.register(registerSubscriptionRoutes)
  app.register(registerIntelRoutes)
  app.register(registerPlayInfoRoutes)
  // v4.1 已下线（保留模块代码，仅摘除路由注册）：
  // app.register(registerTrendRoutes)
  // app.register(registerSocialRoutes)
  // app.register(registerDoublesRoutes)
  // app.register(registerPartnerRoutes)

  app.register(async instance => {
    const redis = await connectRedis()
    if (redis) instance.decorate('redis', redis)
    await connectMongo()
  })

  return app
}

if (require.main === module) {
  const app = buildApp()
  const nodeEnv = process.env.NODE_ENV || 'development'
  const host = process.env.HOST || (nodeEnv === 'development' ? '0.0.0.0' : '::')
  app.listen({ port: env.port, host }).catch((err: unknown) => {
    app.log.error(err)
    process.exit(1)
  })
}
