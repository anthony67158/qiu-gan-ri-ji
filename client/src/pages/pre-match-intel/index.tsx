import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'
import Button from '@/components/ui/button'
import Badge from '@/components/ui/badge'
import Status from '@/components/ui/Status'
import useNetworkStatus from '@/hooks/useNetworkStatus'
import IconButton from '@/components/ui/icon-button'
import { localizeText } from '@/utils/localize'
import { OPPONENT_PLAY_STYLES } from '../../constants'

const STRANGER_PLAYBOOK: Record<string, { core: string; tactics: string[]; warn: string }> = {
  baseline_offensive: {
    core: '别和他对拉，缩短他的击球时间',
    tactics: ['多切削拖节奏', '上旋抬高顶到底线', '抓二发上手抢攻'],
    warn: '一旦让他站到底线发力位，分基本就丢了'
  },
  baseline_defensive: {
    core: '别陪跑，主动上网结束分',
    tactics: ['深球压底线后上网', '正反手大角度调动', '放小球+高吊组合'],
    warn: '不要一直拉对角，他靠回合数赢你'
  },
  all_court: {
    core: '逼他选择，不给舒适区',
    tactics: ['一发抓住率拉满', '反手位压制不变线', '第三拍主动加速'],
    warn: '节奏战会被他带走，必须自己定节奏'
  },
  serve_volley: {
    core: '接发是胜负手',
    tactics: ['接发顶他脚下', '低弹挑高+穿越', '二发坚决侧身抢攻'],
    warn: '他上网你犹豫，分就没了'
  }
}

// 雷达图维度标签（兼容旧数据）
const RADAR_DIM_LABEL: Record<string, string> = {
  serve: '发球',
  baseline: '底线',
  net: '网前',
  movement: '移动',
  mental: '心态'
}

type PreMatchIntelAnalysis = {
  opponent_portrait: { nickname: string; one_liner: string; danger_rating: 1 | 2 | 3 | 4 | 5; h2h_record: string }
  game_plan: { title: string; core_strategy: string; tactics: Array<{ emoji: string; tactic: string; reason: string }> }
  watch_out: { title: string; warnings: Array<{ emoji: string; warning: string }> }
  clutch_script: { title: string; when_leading: string; when_trailing: string; break_point: string }
}

export default function PreMatchIntelPage() {
  const router = Taro.getCurrentInstance().router
  const alias = useMemo(() => decodeURIComponent(((router?.params as any)?.alias || '') as string), [router?.params])
  const [intel, setIntel] = useState<any>(null)
  const [analysis, setAnalysis] = useState<PreMatchIntelAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null)
  const { online } = useNetworkStatus()

  // 无 alias 模式（TabBar 入口）：选对手 + 陌生对手 fallback
  const [opponents, setOpponents] = useState<any[]>([])
  const [oppLoading, setOppLoading] = useState(false)
  const [strangerStyle, setStrangerStyle] = useState<string>('')

  const load = async () => {
    if (!alias) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest<{ intel: any; analysis?: PreMatchIntelAnalysis | null }>({ url: `/api/intel/${encodeURIComponent(alias)}` })
      setIntel(data.intel)
      setAnalysis((data as any).analysis || null)
      setLastLoadedAt(Date.now())
    } catch (e: any) {
      const msg = e?.message || '加载失败'
      setError(msg)
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const loadOpponents = async () => {
    setOppLoading(true)
    try {
      const data = await apiRequest<{ items: any[] }>({ url: '/api/opponents' })
      setOpponents(data.items || [])
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '加载对手失败', icon: 'none' })
    } finally {
      setOppLoading(false)
    }
  }

  useEffect(() => {
    if (alias) {
      load()
    } else {
      setLoading(false)
      loadOpponents()
    }
  }, [alias])

  // ===== 无 alias：TabBar 入口（陌生对手 fallback + 选已有对手）=====
  if (!alias) {
    const hot = (opponents || [])
      .slice()
      .sort((a, b) => (Number(b.total_matches || 0) - Number(a.total_matches || 0)))
      .slice(0, 6)
    const playbook = strangerStyle ? STRANGER_PLAYBOOK[strangerStyle] : null
    return (
      <View className="container">
        <View className="pageHeader">
          <View>
            <View className="pageTitle">赛前情报</View>
            <View className="pageSubtitle">选已交手对手看 H2H，或先按打法类型出快速画像</View>
          </View>
        </View>

        <View className="card bigCard glassCard" style={{ marginBottom: '14px' }}>
          <View className="cardInner">
            <View style={{ fontWeight: 800, marginBottom: '10px' }}>陌生对手 · 快速画像</View>
            <View className="hintText" style={{ marginBottom: '10px' }}>第一次和他打？先按打法类型选一个，给你 1 套通用应对模板</View>
            <View className="chipRow" style={{ flexWrap: 'wrap', gap: '8px' }}>
              {OPPONENT_PLAY_STYLES.map(s => (
                <View
                  key={s.value}
                  onClick={() => setStrangerStyle(strangerStyle === s.value ? '' : s.value)}
                >
                  <Badge variant={strangerStyle === s.value ? 'success' : 'default'}>
                    {s.label}
                  </Badge>
                </View>
              ))}
            </View>
            {playbook ? (
              <View className="stack" style={{ gap: '10px', marginTop: '14px' }}>
                <View>
                  <View className="hintText" style={{ marginBottom: '4px' }}>核心策略</View>
                  <View style={{ fontWeight: 800, lineHeight: '22px' }}>{playbook.core}</View>
                </View>
                <View>
                  <View className="hintText" style={{ marginBottom: '4px' }}>3 个战术动作</View>
                  <View className="chipRow">
                    {playbook.tactics.map(t => <Badge key={t}>{t}</Badge>)}
                  </View>
                </View>
                <View>
                  <View className="hintText" style={{ marginBottom: '4px' }}>注意</View>
                  <View style={{ lineHeight: '22px' }}>⚠️ {playbook.warn}</View>
                </View>
                <View className="hintText" style={{ marginTop: '6px' }}>提示：打完之后回到「记录」页提交，下次再碰到他就有专属 H2H 情报了</View>
              </View>
            ) : (
              <View className="hintText">未选择打法类型</View>
            )}
          </View>
        </View>

        <View className="card bigCard glassCard">
          <View className="cardInner">
            <View className="rowBetween" style={{ marginBottom: '10px' }}>
              <View style={{ fontWeight: 800 }}>已交手对手 · 选一个看专属情报</View>
              <IconButton icon="refresh" variant="ghost" disabled={oppLoading || !online} onClick={loadOpponents} />
            </View>
            {oppLoading && hot.length === 0 ? (
              <View className="hintText">加载中…</View>
            ) : hot.length === 0 ? (
              <View className="hintText">还没有对手记录，去「记录」页打第一场吧</View>
            ) : (
              <View className="stack" style={{ gap: '10px' }}>
                {hot.map(i => {
                  const lockedIntel = Number(i.total_matches || 0) < 2
                  const needMore = Math.max(0, 2 - Number(i.total_matches || 0))
                  const winRatePct = Math.round((i.win_rate || 0) * 100)
                  return (
                    <View
                      key={i.id || i.opponent_name_alias}
                      className="rowBetween pressable"
                      hoverClass="pressHover"
                      style={{ padding: '10px 0', borderBottom: '1px dashed rgba(255,255,255,0.06)' }}
                      onClick={() => {
                        if (lockedIntel) {
                          Taro.showToast({ title: `再打 ${needMore} 场解锁专属情报`, icon: 'none' })
                          return
                        }
                        Taro.navigateTo({ url: `/pages/pre-match-intel/index?alias=${encodeURIComponent(i.opponent_name_alias)}` })
                      }}
                    >
                      <View>
                        <View style={{ fontWeight: 800 }}>{i.opponent_name_alias}</View>
                        <View className="hintText" style={{ marginTop: '4px' }}>交手 {i.total_matches} · 胜率 {winRatePct}%</View>
                      </View>
                      {lockedIntel ? <Badge>再打 {needMore} 场</Badge> : <Badge variant="success">查看</Badge>}
                    </View>
                  )
                })}
              </View>
            )}
            <Button
              size="sm"
              variant="ghost"
              style={{ marginTop: '12px' }}
              onClick={() => Taro.switchTab({ url: '/pages/opponents/index' })}
            >
              查看全部对手
            </Button>
          </View>
        </View>
      </View>
    )
  }

  if (loading)
    return (
      <View className="container">
        <View className="skeletonCard">
          <View className="skeleton skeletonLine" style={{ width: '40%' }} />
          <View style={{ marginTop: '12px' }} className="skeleton skeletonLine" />
        </View>
      </View>
    )

  if (!intel)
    return (
      <View className="container">
        <View className="emptyState">
          <Status type={error ? 'error' : 'empty'} message={error || '暂无赛前情报'} />
        </View>
      </View>
    )

  const radar = intel.weakness_radar || {}
  const stale = lastLoadedAt ? Date.now() - lastLoadedAt > 2 * 60 * 1000 : false

  return (
    <View className="container">
      <View className="pageHeader">
        <View>
          <View className="pageTitle">赛前情报</View>
          <View className="pageSubtitle">对手：{intel.opponent_name}</View>
        </View>
        <IconButton icon="refresh" variant="ghost" disabled={loading || !online} onClick={load} />
      </View>

      {!online ? (
        <View className="card bigCard glassCard" style={{ marginBottom: '14px' }}>
          <View className="cardInner">
            <Status type="offline" message="当前离线，内容可能不是最新" />
          </View>
        </View>
      ) : stale ? (
        <View className="card bigCard glassCard" style={{ marginBottom: '14px' }}>
          <View className="cardInner">
            <Status type="stale" message="数据可能已过期，建议刷新" />
          </View>
        </View>
      ) : error ? (
        <View className="card bigCard glassCard" style={{ marginBottom: '14px' }}>
          <View className="cardInner">
            <Status type="error" message={error} />
          </View>
        </View>
      ) : null}

      {analysis ? (
        <View className="stack" style={{ gap: '12px' }}>
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View className="rowBetween" style={{ marginBottom: '10px' }}>
                <View style={{ fontWeight: 800 }}>对手速写</View>
                <Badge>{'★'.repeat(analysis.opponent_portrait?.danger_rating || 3)}</Badge>
              </View>
              <View style={{ fontWeight: 900, fontSize: '18px', lineHeight: '26px' }}>{localizeText(analysis.opponent_portrait?.one_liner)}</View>
              <View className="hintText" style={{ marginTop: '10px' }}>{localizeText(analysis.opponent_portrait?.h2h_record)}</View>
            </View>
          </View>

          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 800, marginBottom: '8px' }}>{analysis.game_plan?.title || '今天的打法'}</View>
              <View style={{ fontWeight: 800, lineHeight: '22px' }}>{localizeText(analysis.game_plan?.core_strategy)}</View>
              <View className="stack" style={{ gap: '12px', marginTop: '12px' }}>
                {(analysis.game_plan?.tactics || []).slice(0, 3).map((t, idx) => (
                  <View key={idx} className="rowBetween" style={{ gap: '12px' }}>
                    <View style={{ display: 'flex', gap: '10px', flex: 1, minWidth: 0 }}>
                      <View style={{ width: '22px', textAlign: 'center' }}>{t.emoji || '🎯'}</View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ fontWeight: 800 }}>{localizeText(t.tactic)}</View>
                        <View className="hintText" style={{ marginTop: '4px' }}>{localizeText(t.reason)}</View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 800, marginBottom: '10px' }}>{analysis.watch_out?.title || '小心这些'}</View>
              <View className="stack" style={{ gap: '10px' }}>
                {(analysis.watch_out?.warnings || []).slice(0, 3).map((w, idx) => (
                  <View key={idx} style={{ display: 'flex', gap: '10px' }}>
                    <View style={{ width: '22px', textAlign: 'center' }}>{w.emoji || '⚡'}</View>
                    <View style={{ flex: 1, lineHeight: '22px' }}>{localizeText(w.warning)}</View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 800, marginBottom: '10px' }}>{analysis.clutch_script?.title || '关键分这样打'}</View>
              <View className="stack" style={{ gap: '10px' }}>
                <View>
                  <View className="hintText" style={{ marginBottom: '6px' }}>领先时</View>
                  <View style={{ lineHeight: '22px' }}>{localizeText(analysis.clutch_script?.when_leading)}</View>
                </View>
                <View>
                  <View className="hintText" style={{ marginBottom: '6px' }}>落后时</View>
                  <View style={{ lineHeight: '22px' }}>{localizeText(analysis.clutch_script?.when_trailing)}</View>
                </View>
                <View>
                  <View className="hintText" style={{ marginBottom: '6px' }}>破发点</View>
                  <View style={{ lineHeight: '22px' }}>{localizeText(analysis.clutch_script?.break_point)}</View>
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <View className="card bigCard glassCard" style={{ marginTop: analysis ? '14px' : undefined }}>
        <View className="cardInner">
          <View style={{ fontWeight: 800, marginBottom: '10px' }}>弱点雷达（低分=可攻击）</View>
          <View className="stack" style={{ gap: '10px' }}>
            {(Object.keys(radar) as string[]).filter(key => RADAR_DIM_LABEL[key]).map(key => (
              <View key={key}>
                <View className="rowBetween">
                  <View className="hintText">{RADAR_DIM_LABEL[key]}</View>
                  <Badge>{radar[key]} / 5</Badge>
                </View>
                <View style={{ marginTop: '6px' }} className="barTrack">
                  <View className="barFill" style={{ width: `${(radar[key] / 5) * 100}%` }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className="card bigCard glassCard" style={{ marginTop: '14px' }}>
        <View className="cardInner">
          <View style={{ fontWeight: 800, marginBottom: '8px' }}>你赢他时的规律</View>
          <View className="chipRow">
            {(intel.win_patterns || []).map((p: string) => (
              <Badge key={p}>{localizeText(p)}</Badge>
            ))}
            {(intel.win_patterns || []).length === 0 ? <View className="hintText">暂无规律</View> : null}
          </View>
        </View>
      </View>

      <View className="card bigCard glassCard" style={{ marginTop: '14px' }}>
        <View className="cardInner">
          <View style={{ fontWeight: 800, marginBottom: '8px' }}>你输他时的规律</View>
          <View className="chipRow">
            {(intel.lose_patterns || []).map((p: string) => (
              <Badge key={p}>{localizeText(p)}</Badge>
            ))}
            {(intel.lose_patterns || []).length === 0 ? <View className="hintText">暂无规律</View> : null}
          </View>
        </View>
      </View>

      <View className="card bigCard glassCard" style={{ marginTop: '14px' }}>
        <View className="cardInner">
          <View style={{ fontWeight: 800, marginBottom: '8px' }}>今天可执行建议</View>
          <View className="paraText">{localizeText(intel.tactical_advice)}</View>
        </View>
      </View>
    </View>
  )
}
