import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'
import { OPPONENT_PLAY_STYLES, OPPONENT_DOMINANT_HAND } from '../constants'
import Input from '@/components/ui/input'
import Button from '@/components/ui/button'

export type OpponentSearchItem = {
  id: string
  opponent_name_alias: string
  play_style?: string | null
  dominant_hand?: string | null
  main_weapons?: string[]
  weaknesses?: string[]
  clutch_tendency?: string | null
  mobility?: string[]
}

export default function OpponentSearchInput(props: {
  value: string
  placeholder?: string
  onChange: (v: string) => void
  onSelect: (item: OpponentSearchItem) => void
}) {
  const [items, setItems] = useState<OpponentSearchItem[]>([])
  const [open, setOpen] = useState(false)

  const q = props.value.trim()
  const normalizeName = (v: string) => v.trim().toLowerCase()
  const hasExactInList = q ? items.some(it => normalizeName(it.opponent_name_alias) === normalizeName(q)) : false
  const requestKey = useMemo(() => q, [q])

  useEffect(() => {
    let canceled = false
    let timer: any
    async function run() {
      try {
        const data = await apiRequest<{ items: OpponentSearchItem[] }>({
          url: `/api/opponents/search${q ? `?q=${encodeURIComponent(q)}&limit=10` : ''}`
        })
        if (canceled) return
        let list = data.items || []
        if (!q && (!list || list.length === 0)) {
          try {
            const fallback = await apiRequest<{ items: any[] }>({ url: '/api/opponents?limit=5' })
            list =
              (fallback.items || []).map(it => ({
                id: it.id,
                opponent_name_alias: it.opponent_name_alias,
                play_style: it.play_style,
                dominant_hand: it.dominant_hand,
                main_weapons: it.main_weapons,
                weaknesses: it.weaknesses,
                clutch_tendency: it.clutch_tendency,
                mobility: it.mobility
              })) || []
          } catch {
            // ignore
          }
        }
        setItems(list)
        setOpen(true)
      } catch {
        if (canceled) return
        setItems([])
        setOpen(false)
      }
    }
    timer = setTimeout(run, q ? 300 : 0)
    return () => {
      canceled = true
      if (timer) clearTimeout(timer)
    }
  }, [requestKey, q])

  return (
    <View style={{ position: 'relative' }}>
      <Input
        value={props.value}
        onInput={(e: any) => {
          props.onChange(e.detail.value)
        }}
        placeholder={props.placeholder || '输入对手昵称...'}
        onFocus={() => {
          setOpen(items.length > 0)
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 200)
        }}
      />
      {open ? (
        <View
          className="card"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '40px',
            zIndex: 20,
            background: '#0B0F14',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '6px',
            maxHeight: '180px',
            overflowY: 'scroll'
          }}
        >
          <View className="stack" style={{ gap: '8px' }}>
            {(!q) ? (
              <View className="hintText" style={{ padding: '2px 6px' }}>
                ⏱ 最近对手{items.length ? '' : '（暂无）'}
              </View>
            ) : null}
            {items.map(it => (
              <Button
                key={it.id}
                variant="ghost"
                onClick={() => {
                  props.onSelect(it)
                  setOpen(false)
                }}
                style={{ textAlign: 'left', padding: '8px 10px' }}
              >
                <View style={{ fontWeight: 700, fontSize: '14px' }}>{it.opponent_name_alias}</View>
                <View className="hintText" style={{ marginTop: '2px', fontSize: '12px' }}>
                  {(() => {
                    const ps = OPPONENT_PLAY_STYLES.find(x => x.value === it.play_style)?.label || '未填'
                    const dh = OPPONENT_DOMINANT_HAND.find(x => x.value === it.dominant_hand)?.label || '未填'
                    return `${ps} · ${dh}`
                  })()}
                </View>
              </Button>
            ))}
            {q ? (
              <Button
                variant="ghost"
                disabled={hasExactInList}
                onClick={async () => {
                  if (hasExactInList) {
                    Taro.showToast({ title: '该对手已存在，请从列表选择', icon: 'none' })
                    return
                  }
                  try {
                    const data = await apiRequest<{ items: OpponentSearchItem[] }>({
                      url: `/api/opponents/search?q=${encodeURIComponent(q)}&limit=20`
                    })
                    const exists = (data.items || []).some(it => normalizeName(it.opponent_name_alias) === normalizeName(q))
                    if (exists) {
                      Taro.showToast({ title: '该对手已存在，请从列表选择', icon: 'none' })
                      return
                    }
                  } catch {
                    // ignore
                  }
                  const newItem: OpponentSearchItem = {
                    id: '',
                    opponent_name_alias: q,
                    play_style: null,
                    dominant_hand: null,
                    main_weapons: [],
                    weaknesses: [],
                    clutch_tendency: null,
                    mobility: []
                  }
                  props.onSelect(newItem)
                  setOpen(false)
                }}
                style={{ textAlign: 'left', padding: '8px 10px' }}
              >
                <View style={{ fontWeight: 700, fontSize: '14px' }}>{`＋ 新建对手「${q}」`}</View>
              </Button>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  )
}
