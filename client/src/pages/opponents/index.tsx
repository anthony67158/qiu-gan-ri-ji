import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'
import { OPPONENT_PLAY_STYLES, OPPONENT_DOMINANT_HAND } from '../../constants'
import Button from '@/components/ui/button'
import Badge from '@/components/ui/badge'
import SearchBar from '@/components/ui/search-bar'
import Status from '@/components/ui/Status'
import useNetworkStatus from '@/hooks/useNetworkStatus'
import IconButton from '@/components/ui/icon-button'

export default function OpponentsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null)
  const { online } = useNetworkStatus()

  const formatLastMatch = (iso?: string | null) => {
    if (!iso) return '上次：暂无'
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t)) return '上次：暂无'
    const diff = Date.now() - t
    const days = Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)))
    if (days <= 0) return '上次：今天'
    if (days === 1) return '上次：昨天'
    if (days < 7) return `上次：${days} 天前`
    const weeks = Math.floor(days / 7)
    if (weeks < 5) return `上次：${weeks} 周前`
    const months = Math.floor(days / 30)
    return `上次：${months} 月前`
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest<{ items: any[] }>({ url: '/api/opponents' })
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

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return items
    return items.filter((i: any) => String(i.opponent_name_alias || '').toLowerCase().includes(k))
  }, [items, q])

  const groups = (() => {
    const now = Date.now()
    const frequent = filtered.filter(i => {
      const t = i?.last_match_date ? new Date(i.last_match_date).getTime() : 0
      return t && now - t <= 30 * 24 * 60 * 60 * 1000
    })
    const others = filtered.filter(i => !frequent.includes(i))
    const needGroup = filtered.length > 5
    return {
      frequent: needGroup ? frequent : filtered,
      others: needGroup ? others : [],
      needGroup
    }
  })()
  const stale = lastLoadedAt ? Date.now() - lastLoadedAt > 2 * 60 * 1000 : false

  return (
    <View className="container">
      <View className="pageHeader">
        <View>
          <View className="titleRow">
            <View className="tennisBall" />
            <View className="pageTitle">对手档案</View>
          </View>
          <View className="pageSubtitle">自动从你的比赛记录汇总对手画像</View>
        </View>
        <IconButton icon="refresh" variant="ghost" disabled={loading || !online} onClick={load} />
      </View>

      <View className="section" style={{ marginBottom: '12px' }}>
        <SearchBar value={q} onChange={setQ} placeholder="搜索对手昵称…" onSubmit={() => {}} />
      </View>

      {!online ? (
        <View className="card bigCard glassCard" style={{ marginTop: '12px' }}>
          <View className="cardInner">
            <Status type="offline" message="当前离线，对手数据可能不是最新" />
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

      {loading && items.length === 0 ? (
        <View className="stack">
          {Array.from({ length: 5 }).map((_, idx) => (
            <View key={idx} className="skeletonCard">
              <View className="rowBetween">
                <View className="skeleton skeletonLine" style={{ width: '46%' }} />
                <View className="skeleton skeletonLine" style={{ width: '24%' }} />
              </View>
              <View style={{ marginTop: '12px' }} className="skeleton skeletonSmall" />
              <View style={{ marginTop: '12px' }} className="row" >
                <View className="skeleton skeletonLine" style={{ width: '22%' }} />
                <View className="skeleton skeletonLine" style={{ width: '18%' }} />
                <View className="skeleton skeletonLine" style={{ width: '18%' }} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className="stack">
          {groups.needGroup ? <View className="fieldLabel">常打对手</View> : null}
          {groups.frequent.map((i: any) => {
            const winRatePct = Math.round((i.win_rate || 0) * 100)
            const nemesis = Boolean(i.is_nemesis)
            const rf = i.recent_form
            const recentText = rf && rf.last_5_total ? `近 5 场 ${rf.last_5_wins} 胜` : '近 5 场：数据不足'
            const lockedIntel = Number(i.total_matches || 0) < 2
            const needMore = Math.max(0, 2 - Number(i.total_matches || 0))
            return (
              <View
                key={i.id}
                className="card bigCard glassCard pressable"
                hoverClass="pressHover"
                onClick={() => Taro.navigateTo({ url: `/pages/opponent-detail/index?alias=${encodeURIComponent(i.opponent_name_alias)}` })}
              >
                <View className="cardInner">
                  <View className="rowBetween">
                    <View className="row" style={{ gap: '10px' }}>
                      <View style={{ fontWeight: 900 }}>{i.opponent_name_alias}</View>
                      {nemesis ? <Badge variant="destructive">克星</Badge> : null}
                    </View>
                    <Badge>胜率 {winRatePct}%</Badge>
                  </View>
                  <View style={{ marginTop: '10px' }} className="barTrack">
                    <View className="barFill" style={{ width: `${Math.max(0, Math.min(100, winRatePct))}%` }} />
                  </View>
                  <View style={{ marginTop: '10px' }} className="rowBetween">
                    <View className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                      <Badge>交手 {i.total_matches}</Badge>
                      <Badge variant="success">胜 {i.wins}</Badge>
                      <Badge variant="destructive">负 {i.losses}</Badge>
                      <Badge>{recentText}</Badge>
                    </View>
                  </View>
                  <View className="hintText" style={{ marginTop: '10px' }}>
                    {formatLastMatch(i.last_match_date)}｜
                    {(() => {
                      const ps = i.play_style ? OPPONENT_PLAY_STYLES.find(x => x.value === i.play_style)?.label || '打法未填' : '打法未填'
                      const dh = i.dominant_hand ? OPPONENT_DOMINANT_HAND.find(x => x.value === i.dominant_hand)?.label || '' : ''
                      return dh ? `${ps} · ${dh}` : ps
                    })()}
                  </View>
                  <View className="row" style={{ marginTop: '12px', gap: '10px', flexWrap: 'wrap' }}>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={(e: any) => {
                        e?.stopPropagation?.()
                        Taro.setStorageSync('RECORD_PREFILL_ALIAS', i.opponent_name_alias)
                        Taro.switchTab({ url: '/pages/record/index' })
                      }}
                    >
                      记一场
                    </Button>
                    <Button size="sm" variant={lockedIntel ? 'secondary' : 'ghost'} onClick={(e: any) => {
                        e?.stopPropagation?.()
                        if (lockedIntel) {
                          Taro.showToast({ title: `再打 ${needMore} 场解锁赛前情报`, icon: 'none' })
                          return
                        }
                        Taro.navigateTo({ url: `/pages/pre-match-intel/index?alias=${encodeURIComponent(i.opponent_name_alias)}` })
                      }}>赛前情报</Button>
                    <IconButton icon="delete" variant="secondary" onClick={async (e: any) => {
                        e?.stopPropagation?.()
                        const ok = await Taro.showModal({
                          title: '删除对手',
                          content: `删除「${i.opponent_name_alias}」会同时删除与该对手相关的历史记录，删除后不可恢复，是否继续？`,
                          confirmText: '删除',
                          cancelText: '取消'
                        })
                        if (!ok.confirm) return
                        try {
                          const res = await apiRequest<{ deleted_matches?: number }>({
                            url: `/api/opponents/${encodeURIComponent(i.opponent_name_alias)}`,
                            method: 'DELETE'
                          })
                          await load()
                          const deletedMatches = Number((res as any)?.deleted_matches || 0)
                          Taro.showToast({ title: deletedMatches ? `已删除（${deletedMatches}条记录）` : '已删除', icon: 'success' })
                        } catch (err: any) {
                          Taro.showToast({ title: err?.message || '删除失败', icon: 'none' })
                        }
                      }} />
                  </View>
                </View>
              </View>
            )
          })}

          {groups.needGroup && groups.others.length ? <View className="fieldLabel">其他对手</View> : null}
          {groups.needGroup
            ? groups.others.map((i: any) => {
                const winRatePct = Math.round((i.win_rate || 0) * 100)
                const nemesis = Boolean(i.is_nemesis)
                const rf = i.recent_form
                const recentText = rf && rf.last_5_total ? `近 5 场 ${rf.last_5_wins} 胜` : '近 5 场：数据不足'
                const lockedIntel = Number(i.total_matches || 0) < 2
                const needMore = Math.max(0, 2 - Number(i.total_matches || 0))
                return (
                  <View
                    key={i.id}
                    className="card bigCard glassCard pressable"
                    hoverClass="pressHover"
                    onClick={() => Taro.navigateTo({ url: `/pages/opponent-detail/index?alias=${encodeURIComponent(i.opponent_name_alias)}` })}
                  >
                    <View className="cardInner">
                      <View className="rowBetween">
                        <View className="row" style={{ gap: '10px' }}>
                          <View style={{ fontWeight: 900 }}>{i.opponent_name_alias}</View>
                          {nemesis ? <Badge variant="destructive">克星</Badge> : null}
                        </View>
                        <Badge>胜率 {winRatePct}%</Badge>
                      </View>
                      <View style={{ marginTop: '10px' }} className="barTrack">
                        <View className="barFill" style={{ width: `${Math.max(0, Math.min(100, winRatePct))}%` }} />
                      </View>
                      <View style={{ marginTop: '10px' }} className="rowBetween">
                        <View className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                          <Badge>交手 {i.total_matches}</Badge>
                          <Badge variant="success">胜 {i.wins}</Badge>
                          <Badge variant="destructive">负 {i.losses}</Badge>
                          <Badge>{recentText}</Badge>
                        </View>
                      </View>
                      <View className="hintText" style={{ marginTop: '10px' }}>
                        {formatLastMatch(i.last_match_date)}｜
                        {(() => {
                          const ps = i.play_style ? OPPONENT_PLAY_STYLES.find(x => x.value === i.play_style)?.label || '打法未填' : '打法未填'
                          const dh = i.dominant_hand ? OPPONENT_DOMINANT_HAND.find(x => x.value === i.dominant_hand)?.label || '' : ''
                          return dh ? `${ps} · ${dh}` : ps
                        })()}
                      </View>
                      <View className="row" style={{ marginTop: '12px', gap: '10px', flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e: any) => {
                            e?.stopPropagation?.()
                            Taro.setStorageSync('RECORD_PREFILL_ALIAS', i.opponent_name_alias)
                            Taro.switchTab({ url: '/pages/record/index' })
                          }}
                        >
                          记一场
                        </Button>
                        <Button size="sm" variant={lockedIntel ? 'secondary' : 'ghost'} onClick={(e: any) => {
                            e?.stopPropagation?.()
                            if (lockedIntel) {
                              Taro.showToast({ title: `再打 ${needMore} 场解锁赛前情报`, icon: 'none' })
                              return
                            }
                            Taro.navigateTo({ url: `/pages/pre-match-intel/index?alias=${encodeURIComponent(i.opponent_name_alias)}` })
                          }}>赛前情报</Button>
                        <IconButton
                          icon="delete"
                          variant="secondary"
                          onClick={async (e: any) => {
                            e?.stopPropagation?.()
                            const ok = await Taro.showModal({
                              title: '删除对手',
                              content: `删除「${i.opponent_name_alias}」会同时删除与该对手相关的历史记录，删除后不可恢复，是否继续？`,
                              confirmText: '删除',
                              cancelText: '取消'
                            })
                            if (!ok.confirm) return
                            try {
                              const res = await apiRequest<{ deleted_matches?: number }>({
                                url: `/api/opponents/${encodeURIComponent(i.opponent_name_alias)}`,
                                method: 'DELETE'
                              })
                              await load()
                              const deletedMatches = Number((res as any)?.deleted_matches || 0)
                              Taro.showToast({ title: deletedMatches ? `已删除（${deletedMatches}条记录）` : '已删除', icon: 'success' })
                            } catch (err: any) {
                              Taro.showToast({ title: err?.message || '删除失败', icon: 'none' })
                            }
                          }}
                        />
                      </View>
                    </View>
                  </View>
                )
              })
            : null}

          {!loading && items.length === 0 ? <View className="emptyState">暂无对手档案：去「记录」填写对手昵称即可自动生成</View> : null}
        </View>
      )}
    </View>
  )
}
