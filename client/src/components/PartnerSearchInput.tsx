import { View } from '@tarojs/components'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'
import Input from '@/components/ui/input'
import Button from '@/components/ui/button'
import { COURT_PREFERENCES, MY_PLAY_STYLES } from '../constants'

export type PartnerSearchItem = {
  id: string
  nickname: string
  play_style?: string | null
  main_weapons?: string[]
  weaknesses?: string[]
  court_preference?: 'ad_court' | 'deuce_court' | 'flexible' | null
  physical_state?: string | null
}

export default function PartnerSearchInput(props: {
  value: string
  placeholder?: string
  onChange: (v: string) => void
  onSelect: (item: PartnerSearchItem) => void
}) {
  const [items, setItems] = useState<PartnerSearchItem[]>([])
  const [open, setOpen] = useState(false)

  const q = props.value.trim()
  const canSearch = q.length >= 1
  const requestKey = useMemo(() => q, [q])
  const playStyleLabel = (v: any) => MY_PLAY_STYLES.find(x => x.value === v)?.label || '未填'
  const courtLabel = (v: any) => COURT_PREFERENCES.find(x => x.value === v)?.label || '未填'

  useEffect(() => {
    let canceled = false
    async function run() {
      if (!canSearch) {
        setItems([])
        setOpen(false)
        return
      }
      try {
        const data = await apiRequest<{ items: PartnerSearchItem[] }>({
          url: `/api/partners/search?q=${encodeURIComponent(q)}&limit=10`
        })
        if (canceled) return
        setItems(data.items || [])
        setOpen(true)
      } catch {
        if (canceled) return
        setItems([])
        setOpen(false)
      }
    }
    run()
    return () => {
      canceled = true
    }
  }, [requestKey, canSearch, q])

  return (
    <View style={{ position: 'relative' }}>
      <Input
        value={props.value}
        onInput={(e: any) => props.onChange(e.detail.value)}
        placeholder={props.placeholder || '输入搭档昵称...'}
        onFocus={() => {
          if (items.length) setOpen(true)
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 200)
        }}
      />
      {open && items.length ? (
        <View
          className="card"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '44px',
            zIndex: 20,
            background: '#0B0F14',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '8px'
          }}
        >
          <View className="stack" style={{ gap: '8px' }}>
            {items.map(it => (
              <Button
                key={it.id}
                variant="ghost"
                onClick={() => {
                  props.onSelect(it)
                  setOpen(false)
                }}
                style={{ textAlign: 'left', padding: '10px 12px' }}
              >
                <View style={{ fontWeight: 800 }}>{it.nickname}</View>
                <View className="hintText" style={{ marginTop: '4px' }}>
                  {playStyleLabel(it.play_style) + ' · ' + courtLabel(it.court_preference)}
                </View>
              </Button>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  )
}
