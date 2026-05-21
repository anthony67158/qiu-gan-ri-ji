import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../services/api'

export type MyPlayInfo = {
  play_style?: string
  main_weapons?: string[]
  weaknesses?: string[]
  mobility?: string[]
  clutch_state?: string
}

export function useMyPlayInfo() {
  const [playInfo, setPlayInfo] = useState<MyPlayInfo | null>(null)
  const [loaded, setLoaded] = useState(false)
  const timerRef = useRef<any>(null)
  const pendingRef = useRef<MyPlayInfo | null>(null)

  useEffect(() => {
    let canceled = false
    async function run() {
      try {
        const data = await apiRequest<{ play_info: MyPlayInfo | null }>({ url: '/api/user/play-info' })
        if (canceled) return
        setPlayInfo(data.play_info || null)
        setLoaded(true)
      } catch {
        if (canceled) return
        setPlayInfo(null)
        setLoaded(true)
      }
    }
    run()
    return () => {
      canceled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function updateField(field: keyof MyPlayInfo, value: any) {
    const next = { ...(playInfo || {}), [field]: value }
    setPlayInfo(next)
    pendingRef.current = next
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        await apiRequest<{ play_info: MyPlayInfo }>({
          url: '/api/user/play-info',
          method: 'PUT',
          data: pendingRef.current
        })
      } catch {
        // ignore
      }
    }, 500)
  }

  return { playInfo, loaded, updateField }
}
