import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'

export default function useNetworkStatus() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    let off: any = null
    async function init() {
      try {
        const res = await Taro.getNetworkType()
        setOnline(res.networkType !== 'none')
      } catch {
        setOnline(true)
      }
      off = Taro.onNetworkStatusChange((res: any) => {
        setOnline(Boolean(res?.isConnected))
      })
    }
    init()
    return () => {
      try {
        off?.()
      } catch {}
    }
  }, [])

  return { online }
}

