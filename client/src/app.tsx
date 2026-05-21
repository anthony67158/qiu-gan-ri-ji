import './app.scss'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import React, { useEffect } from 'react'
import Status from './components/ui/Status'

class ErrorBoundary extends React.Component<any, { error: any }> {
  state: { error: any } = { error: null }

  static getDerivedStateFromError(error: any) {
    return { error }
  }

  componentDidCatch(error: any) {
    try {
      const msg = String(error?.message || error || '未知错误')
      Taro.setStorageSync('LAST_UI_ERROR', msg)
      Taro.showToast({ title: msg.slice(0, 18), icon: 'none' })
    } catch {}
  }

  render() {
    if (this.state.error) {
      const msg = String(this.state.error?.message || this.state.error || '页面渲染失败')
      return (
        <View className="container">
          <View className="emptyState">
            <Status type="error" message={msg} />
          </View>
        </View>
      )
    }
    const children = (this as any).props?.children
    if (!children) {
      const last = String(Taro.getStorageSync('LAST_UI_ERROR') || '')
      return (
        <View className="container">
          <View className="emptyState">
            <Status type="error" message={last ? `页面未渲染：${last}` : '页面未渲染（未知原因）'} />
          </View>
        </View>
      )
    }
    return children
  }
}

export default function App(props: any) {
  useEffect(() => {
    const onError = (err: any) => {
      try {
        const msg = String(err?.message || err || '未知错误')
        Taro.setStorageSync('LAST_RUNTIME_ERROR', msg)
        Taro.showToast({ title: msg.slice(0, 18), icon: 'none' })
      } catch {}
    }
    const onUnhandled = (res: any) => {
      try {
        const reason = res?.reason || res
        const msg = String(reason?.message || reason || '未处理异常')
        Taro.setStorageSync('LAST_RUNTIME_ERROR', msg)
        Taro.showToast({ title: msg.slice(0, 18), icon: 'none' })
      } catch {}
    }

    const anyTaro = Taro as any
    if (typeof anyTaro.onError === 'function') anyTaro.onError(onError)
    if (typeof anyTaro.onUnhandledRejection === 'function') anyTaro.onUnhandledRejection(onUnhandled)

    return () => {
      try {
        if (typeof anyTaro.offError === 'function') anyTaro.offError(onError)
        if (typeof anyTaro.offUnhandledRejection === 'function') anyTaro.offUnhandledRejection(onUnhandled)
      } catch {}
    }
  }, [])
  return <ErrorBoundary>{props.children}</ErrorBoundary>
}
