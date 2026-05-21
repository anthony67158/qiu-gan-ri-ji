import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'
import Button from '@/components/ui/button'
import Badge from '@/components/ui/badge'
import SearchBar from '@/components/ui/search-bar'
import Status from '@/components/ui/Status'
import useNetworkStatus from '@/hooks/useNetworkStatus'
import IconButton from '@/components/ui/icon-button'

export default function HistoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'LOSE' | 'PRACTICE'>('ALL')
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null)
  const { online } = useNetworkStatus()

  const formatResult = (v: string) => {
    if (v === 'WIN') return { label: '胜', tone: 'win' }
    if (v === 'LOSE') return { label: '负', tone: 'lose' }
    if (v === 'PRACTICE') return { label: '练习', tone: 'practice' }
    return { label: '平', tone: 'draw' }
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest<{ items: any[] }>({ url: '/api/match?limit=50&offset=0' })
      setItems(data.items || [])
      setLastLoadedAt(Date.now())
    } catch (e: any) {
      const msg = e?.message || '加载失败'
      setError(msg)
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredItems = useMemo(() => {
    let list = items
    if (filter !== 'ALL') list = list.filter(i => i.match_result === filter)
    const k = q.trim().toLowerCase()
    if (!k) return list
    return list.filter(i => String(i.opponent_name_alias || '').toLowerCase().includes(k))
  }, [items, filter, q])
  const stale = lastLoadedAt ? Date.now() - lastLoadedAt > 2 * 60 * 1000 : false

  return (
    <View className="container">
      <View className="pageHeader">
        <View>
          <View className="titleRow">
            <View className="tennisBall" />
            <View className="pageTitle">历史记录</View>
          </View>
          <View className="pageSubtitle">点击一条记录，查看 AI 追问与分析结果</View>
        </View>
        <IconButton icon="refresh" variant="ghost" disabled={loading || !online} onClick={load} />
      </View>

      {!online ? (
        <View className="card bigCard glassCard" style={{ marginTop: '12px' }}>
          <View className="cardInner">
            <Status type="offline" message="当前离线，历史数据可能不是最新" />
          </View>
        </View>
      ) : stale ? (
        <View className="card bigCard glassCard" style={{ marginTop: '12px' }}>
          <View className="cardInner">
            <Status type="stale" message="数据可能已过期，建议刷新" />
          </View>
        </View>
      ) : error ? (
        <View className="card bigCard glassCard" style={{ marginTop: '12px' }}>
          <View className="cardInner">
            <Status type="error" message={error} />
          </View>
        </View>
      ) : null}

      <View className="card bigCard glassCard">
        <View className="cardInner">
          <View className="rowBetween">
            <View style={{ fontWeight: 800 }}>筛选</View>
            <View className="hintText">只保留你关心的记录</View>
          </View>
          <View style={{ marginTop: '12px' }} className="segmented">
            <Button size="sm" variant="ghost" className={`${filter === 'ALL' ? 'segItem segActive' : 'segItem'}`} onClick={() => setFilter('ALL')}>全部</Button>
            <Button size="sm" variant="ghost" className={`${filter === 'WIN' ? 'segItem segActive' : 'segItem'}`} onClick={() => setFilter('WIN')}>胜</Button>
            <Button size="sm" variant="ghost" className={`${filter === 'LOSE' ? 'segItem segActive' : 'segItem'}`} onClick={() => setFilter('LOSE')}>负</Button>
            <Button size="sm" variant="ghost" className={`${filter === 'PRACTICE' ? 'segItem segActive' : 'segItem'}`} onClick={() => setFilter('PRACTICE')}>练习</Button>
          </View>
        </View>
      </View>

      <View className="section">
        <SearchBar value={q} onChange={setQ} placeholder="搜索对手昵称…" onSubmit={() => {}} />
      </View>

      {loading && items.length === 0 ? (
        <View className="stack" style={{ marginTop: '12px' }}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <View key={idx} className="skeletonCard">
              <View className="rowBetween">
                <View className="row" style={{ gap: '10px' }}>
                  <View className="skeleton skeletonCircle" />
                  <View className="skeleton skeletonLine" style={{ width: '52%' }} />
                </View>
                <View className="skeleton skeletonSmall" style={{ width: '18px' }} />
              </View>
              <View style={{ marginTop: '10px' }} className="skeleton skeletonSmall" />
            </View>
          ))}
        </View>
      ) : (
        <View className="stack" style={{ marginTop: '12px' }}>
          {filteredItems.map((m: any) => {
            const r = formatResult(m.match_result)
            const badgeVariant = r.tone === 'win' ? 'success' : r.tone === 'lose' ? 'destructive' : r.tone === 'practice' ? 'practice' : 'default'

            return (
              <View
                key={m.id}
                className="card bigCard glassCard pressable"
                hoverClass="pressHover"
                onClick={() => Taro.navigateTo({ url: `/pages/result/index?id=${m.id}` })}
              >
                <View className="cardInner">
                  <View className="rowBetween">
                    <View className="row" style={{ gap: '8px' }}>
                      <Badge variant={badgeVariant as any}>{r.label}</Badge>
                      <View style={{ fontWeight: 800 }}>{m.opponent_name_alias || '未填写对手'}</View>
                    </View>
                    <View className="row" style={{ gap: '8px' }}>
                      <IconButton icon="delete" variant="secondary" onClick={async (e: any) => {
                          e?.stopPropagation?.()
                          const ok = await Taro.showModal({
                            title: '删除记录',
                            content: '删除后不可恢复，确定删除这条历史记录吗？',
                            confirmText: '删除',
                            cancelText: '取消'
                          })
                          if (!ok.confirm) return
                          try {
                            await apiRequest({ url: `/api/match/${m.id}`, method: 'DELETE' })
                            setItems(prev => prev.filter(x => x.id !== m.id))
                            Taro.showToast({ title: '已删除', icon: 'success' })
                          } catch (err: any) {
                            Taro.showToast({ title: err?.message || '删除失败', icon: 'none' })
                          }
                        }} />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e: any) => {
                          e?.stopPropagation?.()
                          Taro.navigateTo({ url: `/pages/result/index?id=${m.id}` })
                        }}
                      >
                        详情→
                      </Button>
                    </View>
                  </View>
                  <View style={{ marginTop: '10px' }} className="mutedText">
                    {m.score_analysis?.score_summary || '未填写比分'}
                  </View>
                </View>
              </View>
            )
          })}

          {!loading && filteredItems.length === 0 ? (
            <View className="emptyState">
              <Status type="empty" message="暂无记录，去「记录」添加第一场比赛" />
            </View>
          ) : null}
        </View>
      )}
    </View>
  )
}
