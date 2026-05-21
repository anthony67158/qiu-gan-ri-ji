import dotenv from 'dotenv'

dotenv.config()

const nodeEnv = process.env.NODE_ENV || 'development'

if (nodeEnv === 'development' && !process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev'
}

const portFromEnv = Number(process.env.PORT)
const hasValidPort = Number.isFinite(portFromEnv) && portFromEnv > 0
const port =
  nodeEnv === 'development'
    ? !hasValidPort || portFromEnv === 3000
      ? 3003
      : portFromEnv
    : hasValidPort
      ? portFromEnv
      : 3000

const required = ['JWT_SECRET']

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`缺少必要环境变量：${key}`)
  }
}

export const env = {
  jwtSecret: process.env.JWT_SECRET as string,
  port,
  mongoUri: process.env.MONGODB_URI,
  redisUrl: process.env.REDIS_URL,
  ai: {
    provider:
      (process.env.AI_PROVIDER as 'openai_compatible' | 'volcano' | undefined) ||
      (process.env.AI_BASE_URL || process.env.AI_API_KEY || process.env.AI_MODEL ? 'openai_compatible' : 'volcano'),
    baseUrl: process.env.AI_BASE_URL,
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL
  },
  volcano: {
    apiUrl: process.env.VOLCANO_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/responses',
    apiKey: process.env.VOLCANO_API_KEY,
    modelId: process.env.VOLCANO_MODEL_ID
  },
  wechat: {
    appId: process.env.WECHAT_APP_ID,
    appSecret: process.env.WECHAT_APP_SECRET
  },
  useInMemoryStore: process.env.USE_IN_MEMORY_STORE === '1' || !process.env.MONGODB_URI,
  enableRedis: process.env.ENABLE_REDIS === '1' || Boolean(process.env.REDIS_URL)
}
