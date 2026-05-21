import { View } from '@tarojs/components'
import Badge from './badge'

export default function Status(props: { type: 'loading' | 'empty' | 'error' | 'stale' | 'offline' | 'disabled'; message?: string }) {
  const map: Record<string, { emoji: string; label: string; variant?: 'default' | 'destructive' }> = {
    loading: { emoji: '⏳', label: '加载中' },
    empty: { emoji: '🫙', label: '暂无数据' },
    error: { emoji: '⚠️', label: '出错了', variant: 'destructive' },
    stale: { emoji: '♻️', label: '数据未更新' },
    offline: { emoji: '📵', label: '离线' },
    disabled: { emoji: '🚫', label: '不可用' }
  }
  const info = map[props.type]
  return (
    <View className="row" style={{ gap: '10px', alignItems: 'center' }}>
      <Badge variant={info.variant || 'default'}>{info.emoji}</Badge>
      <View className="hintText">{props.message || info.label}</View>
    </View>
  )
}

