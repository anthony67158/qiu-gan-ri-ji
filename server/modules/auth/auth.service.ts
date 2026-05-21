import { env } from '../../config/env'
import { AppError } from '../../utils/AppError'

type WechatSession = {
  openid: string
  session_key: string
  unionid?: string
}

export async function wechatCodeToSession(code: string): Promise<WechatSession> {
  if (!env.wechat.appId || !env.wechat.appSecret) {
    throw new AppError('未配置微信小程序登录参数', 500, 'WECHAT_NOT_CONFIGURED')
  }

  const url =
    `https://api.weixin.qq.com/sns/jscode2session` +
    `?appid=${encodeURIComponent(env.wechat.appId)}` +
    `&secret=${encodeURIComponent(env.wechat.appSecret)}` +
    `&js_code=${encodeURIComponent(code)}` +
    `&grant_type=authorization_code`

  const res = await fetch(url)
  const json = (await res.json().catch(() => null)) as any
  if (!json || !json.openid || !json.session_key) {
    throw new AppError('微信登录失败', 401, 'WECHAT_LOGIN_FAILED')
  }

  return { openid: json.openid, session_key: json.session_key, unionid: json.unionid }
}
