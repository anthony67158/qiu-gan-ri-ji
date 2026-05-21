import Taro from '@tarojs/taro'

const API_BASE_URL_KEY = 'api_base_url'
const DEFAULT_BASE_URL = 'http://127.0.0.1:3003'

function normalizeBaseUrl(v: string) {
  const trimmed = v.trim().replace(/\/$/, '')
  return trimmed
    .replace(/^http:\/\/localhost(?=\/|:|$)/i, 'http://127.0.0.1')
    .replace(/^https:\/\/localhost(?=\/|:|$)/i, 'https://127.0.0.1')
}

function normalizeEnvString(v: any) {
  if (typeof v !== 'string') return ''
  const t = v.trim()
  if (!t) return ''
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim()
  }
  return t
}

function getBaseUrl() {
  const envFromProcess = typeof process !== 'undefined' ? (process as any)?.env : undefined
  const envFromGlobal = (globalThis as any)?.process?.env

  const envUrl =
    normalizeEnvString(envFromProcess?.TARO_APP_API_BASE_URL) ||
    normalizeEnvString(envFromProcess?.API_BASE_URL) ||
    normalizeEnvString(envFromGlobal?.TARO_APP_API_BASE_URL) ||
    normalizeEnvString(envFromGlobal?.API_BASE_URL)

  const nodeEnv = normalizeEnvString(envFromProcess?.NODE_ENV) || normalizeEnvString(envFromGlobal?.NODE_ENV)
  const nodeEnvLower = nodeEnv.toLowerCase()
  const isDev = nodeEnvLower === 'development'
  if (isDev) {
    return normalizeBaseUrl(envUrl || DEFAULT_BASE_URL)
  }
  if (typeof envUrl === 'string' && envUrl.trim()) return normalizeBaseUrl(envUrl)

  const stored = Taro.getStorageSync(API_BASE_URL_KEY)
  if (typeof stored === 'string' && stored.trim()) return normalizeBaseUrl(stored)

  return DEFAULT_BASE_URL
}

type ApiResponse<T> = { success: boolean; data?: T; error?: string; code?: string }

type ApiRequestError = Error & { statusCode?: number; url?: string }

function toNetworkErrorMessage(err: any, url: string) {
  const msg = String(err?.errMsg || err?.message || err || '')
  if (/timeout/i.test(msg)) {
    return `请求超时：${url}`
  }
  if (/ERR_CONNECTION_REFUSED/i.test(msg) || /request:fail/i.test(msg)) {
    return `无法连接到后端：${url}`
  }
  return ''
}

function clearAuth() {
  Taro.removeStorageSync('token')
}

function isAuthError(res: { statusCode?: number; data?: ApiResponse<any> }) {
  if (res.statusCode === 401) return true
  const code = res.data?.code
  return code === 'AUTH_REQUIRED' || code === 'AUTH_EXPIRED'
}

async function getToken() {
  const token = Taro.getStorageSync('token')
  if (token) return token as string
  const baseUrl = getBaseUrl()
  const loginUrl = `${baseUrl}/auth/dev-login`
  let res: Taro.request.SuccessCallbackResult<ApiResponse<{ token: string }>>
  try {
    res = await Taro.request<ApiResponse<{ token: string }>>({
      url: loginUrl,
      method: 'POST',
      data: { id: `u_${Date.now()}`, nickname: 'Dev' }
    })
  } catch (e: any) {
    const hint = toNetworkErrorMessage(e, loginUrl)
    throw new Error(hint || e?.message || '网络错误')
  }
  const t = res.data?.data?.token
  if (t) {
    Taro.setStorageSync('token', t)
    return t
  }
  throw new Error(res.data?.error || '登录失败')
}

async function apiRequestOnce<T>(options: { url: string; method?: any; data?: any }) {
  const token = await getToken()
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}${options.url}`
  const method = (options.method || 'GET') as any
  const upper = String(method || 'GET').toUpperCase()
  const shouldHaveBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upper)
  const data = options.data === undefined && shouldHaveBody ? {} : options.data
  let res: Taro.request.SuccessCallbackResult<ApiResponse<T>>
  try {
    res = await Taro.request<ApiResponse<T>>({
      url,
      method,
      data,
      header: {
        Authorization: `Bearer ${token}`,
        ...(shouldHaveBody ? { 'Content-Type': 'application/json' } : {})
      }
    })
  } catch (e: any) {
    const hint = toNetworkErrorMessage(e, url)
    throw new Error(hint || e?.message || '网络错误')
  }
  if (res.statusCode >= 400) {
    const serverMsg = typeof (res.data as any)?.error === 'string' ? String((res.data as any).error) : ''
    const err = new Error(
      res.statusCode === 404
        ? '接口不存在'
        : res.statusCode === 502
          ? '后端不可用（502）'
          : res.statusCode >= 500
            ? serverMsg || `后端错误（${res.statusCode}）`
            : `请求失败（${res.statusCode}）`
    ) as ApiRequestError
    err.statusCode = res.statusCode
    err.url = url
    if (isAuthError(res as any)) {
      clearAuth()
      err.message = '未登录或登录已过期'
    }
    throw err
  }
  if (!res.data?.success) {
    if (isAuthError(res as any)) {
      clearAuth()
      throw new Error(res.data?.error || '未登录或登录已过期')
    }
    throw new Error(res.data?.error || '请求失败')
  }
  return res.data.data as T
}

export async function apiRequest<T>(options: { url: string; method?: any; data?: any }) {
  try {
    return await apiRequestOnce<T>(options)
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (/未登录|登录已过期/i.test(msg)) {
      clearAuth()
      return apiRequestOnce<T>(options)
    }
    throw e
  }
}
