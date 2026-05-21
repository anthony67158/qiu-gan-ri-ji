import { View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'
import { MY_CLUTCH_STATE, MY_MAIN_WEAPONS, MY_MOBILITY, MY_PLAY_STYLES, MY_WEAKNESSES, LOSING_REASONS, SCORING_METHODS, PRACTICE_TYPES, PRACTICE_FOCUS } from '../../constants'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import Status from '@/components/ui/Status'
import useNetworkStatus from '@/hooks/useNetworkStatus'
import IconButton from '@/components/ui/icon-button'

export default function InsightPage() {
  const { online } = useNetworkStatus()
  const [subscription, setSubscription] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [report, setReport] = useState<any>(null)
  const [loadingReport, setLoadingReport] = useState(false)

  const [playInfo, setPlayInfo] = useState<any>(null)
  const [loadingPlayInfo, setLoadingPlayInfo] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [savingPlayInfo, setSavingPlayInfo] = useState(false)
  const [returnToRecord, setReturnToRecord] = useState(false)

  const [period, setPeriod] = useState<'30d' | '90d' | 'all'>('30d')
  const [dashboard, setDashboard] = useState<any>(null)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [localOverview, setLocalOverview] = useState<any>(null)
  const [dashboardApiAvailable] = useState(false)

  const [trend, setTrend] = useState<any>(null)
  const [loadingTrend, setLoadingTrend] = useState(false)

  // v4.1：近两场对比
  const [compare, setCompare] = useState<any>(null)
  const [loadingCompare, setLoadingCompare] = useState(false)

  const [form, setForm] = useState({
    tennis_age: '',
    play_style: '' as string,
    main_weapons: [] as string[],
    weaknesses: [] as string[],
    mobility: [] as string[],
    clutch_state: '' as string
  })

  const nextLimitedMulti = (arr: string[], value: string, max: number) => {
    if (arr.includes(value)) return arr.filter(v => v !== value)
    if (arr.length >= max) return arr
    return [...arr, value]
  }

  const loadSubscription = async () => {
    const data = await apiRequest<{ subscription: any }>({ url: '/api/subscription/status' })
    setSubscription(data.subscription)
  }

  const loadPlayInfo = async () => {
    setLoadingPlayInfo(true)
    try {
      const data = await apiRequest<{ play_info: any }>({ url: '/api/user/play-info' })
      setPlayInfo(data.play_info || null)
      Taro.setStorageSync('MY_PLAY_INFO_CACHE', data.play_info || null)
    } catch {
      const cached = Taro.getStorageSync('MY_PLAY_INFO_CACHE')
      if (cached && typeof cached === 'object') {
        setPlayInfo(cached)
      }
    } finally {
      setLoadingPlayInfo(false)
    }
  }

  const openEditWith = (p: any, backToRecord: boolean) => {
    const draft = Taro.getStorageSync('MY_PLAY_INFO_DRAFT')
    const draftObj = draft && typeof draft === 'object' ? draft : null
    const src = p && Object.keys(p || {}).length ? p : draftObj || {}
    setForm({
      tennis_age: String(src?.tennis_age || ''),
      play_style: String(src?.play_style || ''),
      main_weapons: src?.main_weapons || [],
      weaknesses: src?.weaknesses || [],
      mobility: src?.mobility || [],
      clutch_state: String(src?.clutch_state || '')
    })
    setReturnToRecord(backToRecord)
    setShowEdit(true)
  }

  const openEdit = () => {
    openEditWith(playInfo || {}, false)
  }

  const savePlayInfo = async () => {
    setSavingPlayInfo(true)
    try {
      const payload = {
        tennis_age: form.tennis_age.trim() || null,
        play_style: form.play_style || null,
        main_weapons: form.main_weapons || [],
        weaknesses: form.weaknesses || [],
        mobility: form.mobility || [],
        clutch_state: form.clutch_state || null
      }
      const data = await apiRequest<{ play_info: any }>({ url: '/api/user/play-info', method: 'PUT', data: payload })
      setPlayInfo(data.play_info || null)
      Taro.setStorageSync('MY_PLAY_INFO_CACHE', data.play_info || null)
      Taro.removeStorageSync('MY_PLAY_INFO_DRAFT')
      setShowEdit(false)
      Taro.showToast({ title: '已保存', icon: 'success' })
      if (returnToRecord) {
        setReturnToRecord(false)
        Taro.setStorageSync('MY_PLAYINFO_UPDATED', '1')
        Taro.switchTab({ url: '/pages/record/index' })
      }
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '保存失败', icon: 'none' })
    } finally {
      setSavingPlayInfo(false)
    }
  }

  useEffect(() => {
    if (!showEdit) return
    const t = setTimeout(() => {
      Taro.setStorageSync('MY_PLAY_INFO_DRAFT', {
        tennis_age: form.tennis_age,
        play_style: form.play_style,
        main_weapons: form.main_weapons,
        weaknesses: form.weaknesses,
        mobility: form.mobility,
        clutch_state: form.clutch_state
      })
    }, 300)
    return () => clearTimeout(t)
  }, [showEdit, form.tennis_age, form.play_style, form.main_weapons, form.weaknesses, form.mobility, form.clutch_state])

  const loadDashboard = async (p: '30d' | '90d' | 'all') => {
    setLoadingDashboard(true)
    try {
      const getTs = (m: any) => {
        const raw = m?.date_time || m?.created_at || m?.createdAt || null
        const t = raw ? new Date(raw).getTime() : NaN
        return Number.isFinite(t) ? t : 0
      }
      const isPractice = (m: any) => String(m?.match_result || '').toUpperCase() === 'PRACTICE' || Boolean(m?.practice_info)
      const durationToHours = (v: any) => {
        const s = String(v || '')
        if (s === '30min') return 0.5
        if (s === '1h') return 1
        if (s === '1.5h') return 1.5
        if (s === '2h') return 2
        if (s === '2h_plus') return 2.2
        return 0
      }
      const computeDashboardFromMatches = (items: any[]) => {
        const now = Date.now()
        const start = p === '30d' ? now - 30 * 24 * 60 * 60 * 1000 : p === '90d' ? now - 90 * 24 * 60 * 60 * 1000 : 0
        const inPeriod = start ? items.filter(m => getTs(m) >= start) : items
        const matchesOnly = inPeriod.filter(m => !isPractice(m))
        const practices = inPeriod.filter(m => isPractice(m))
        const wins = matchesOnly.filter(m => String(m.match_result || '').toUpperCase() === 'WIN').length
        const losses = matchesOnly.filter(m => String(m.match_result || '').toUpperCase() === 'LOSE').length
        const total = matchesOnly.length
        const win_rate = total ? Number((wins / total).toFixed(4)) : 0
        const singles = matchesOnly.filter(m => String(m.match_type || '').toLowerCase() !== 'doubles')
        const doubles = matchesOnly.filter(m => String(m.match_type || '').toLowerCase() === 'doubles')
        const singles_w = singles.filter(m => String(m.match_result || '').toUpperCase() === 'WIN').length
        const doubles_w = doubles.filter(m => String(m.match_result || '').toUpperCase() === 'WIN').length

        const match_overview = {
          total,
          wins,
          losses,
          win_rate,
          singles: { total: singles.length, win_rate: singles.length ? Number((singles_w / singles.length).toFixed(4)) : 0 },
          doubles: { total: doubles.length, win_rate: doubles.length ? Number((doubles_w / doubles.length).toFixed(4)) : 0 }
        }

        const countPresence = (list: any[], getter: (m: any) => string[]) => {
          const map = new Map<string, number>()
          for (const m of list) {
            const arr = getter(m) || []
            const uniq = Array.from(new Set(arr.filter(Boolean)))
            for (const v of uniq) map.set(v, (map.get(v) || 0) + 1)
          }
          return map
        }
        const buildRanking = (map: Map<string, number>, totalMatches: number, keyName: 'method' | 'reason') =>
          Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([k, count]) => ({ [keyName]: k, count, percentage: totalMatches ? Number((count / totalMatches).toFixed(4)) : 0 }))

        const scoringMap = countPresence(matchesOnly, m => (m as any)?.post_match_summary?.scoring_methods || [])
        const losingMap = countPresence(matchesOnly, m => (m as any)?.post_match_summary?.losing_reasons || [])
        const scoring_methods_ranking = buildRanking(scoringMap, total, 'method')
        const losing_reasons_ranking = buildRanking(losingMap, total, 'reason').map((x: any) => ({ ...x, is_critical: x.percentage >= 0.7, consecutive: 0 }))
        const matchesDesc = matchesOnly.slice().sort((a, b) => getTs(b) - getTs(a))
        for (const row of losing_reasons_ranking as any[]) {
          let c = 0
          for (const m of matchesDesc) {
            const arr = (((m as any)?.post_match_summary?.losing_reasons || []) as string[]).filter(Boolean)
            if (arr.includes(row.reason)) c += 1
            else break
          }
          row.consecutive = c
        }

        const practice_overview = {
          total_sessions: practices.length,
          total_hours: Number(practices.reduce((acc, m) => acc + durationToHours((m as any)?.practice_info?.duration), 0).toFixed(2)),
          type_distribution: (() => {
            const map = new Map<string, number>()
            for (const m of practices) {
              const t = String((m as any)?.practice_info?.practice_type || '').trim()
              if (!t) continue
              map.set(t, (map.get(t) || 0) + 1)
            }
            return Array.from(map.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => ({ type, count }))
          })(),
          focus_distribution: (() => {
            const map = new Map<string, number>()
            for (const m of practices) {
              const arr = (((m as any)?.practice_info?.focus_areas || []) as string[]).filter(Boolean)
              const uniq = Array.from(new Set(arr))
              for (const f of uniq) map.set(f, (map.get(f) || 0) + 1)
            }
            return Array.from(map.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([focus, count]) => ({ focus, count }))
          })(),
          match_practice_ratio: `${total}:${practices.length}`
        }

        return { match_overview, scoring_methods_ranking, losing_reasons_ranking, practice_overview }
      }

      const matchesResp = await apiRequest<{ items: any[] }>({ url: '/api/match?limit=500&offset=0' })
      const items = (matchesResp.items || []) as any[]

      const computed = computeDashboardFromMatches(items)
      setDashboard(computed)

      setLocalOverview(computed.match_overview)
    } catch {
      setDashboard(null)
      setLocalOverview(null)
    } finally {
      setLoadingDashboard(false)
    }
  }

  const loadTrend = async () => {
    setLoadingTrend(true)
    try {
      const data = await apiRequest<{ analysis: any }>({ url: '/api/analysis/trend?last_n=8' })
      setTrend(data.analysis || null)
    } catch {
      setTrend(null)
    } finally {
      setLoadingTrend(false)
    }
  }

  const loadCompare = async () => {
    setLoadingCompare(true)
    try {
      const data = await apiRequest<any>({ url: '/api/insight/recent-compare' })
      setCompare(data || null)
    } catch {
      setCompare(null)
    } finally {
      setLoadingCompare(false)
    }
  }

  const loadReports = async () => {
    try {
      const data = await apiRequest<{ items: any[] }>({ url: '/api/insights?limit=6&offset=0' })
      setReports(data.items || [])
    } catch {
      setReports([])
    }
  }

  const makePro = async () => {
    await apiRequest({
      url: '/api/subscription/dev-set',
      method: 'POST',
      data: { plan: 'MONTHLY', status: 'ACTIVE' }
    })
    await loadSubscription()
  }

  const generate = async () => {
    setLoadingReport(true)
    try {
      const data = await apiRequest<{ report: any }>({ url: '/api/insights/generate', method: 'POST', data: {} })
      setReport(data.report)
      await loadReports()
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '生成失败', icon: 'none' })
    } finally {
      setLoadingReport(false)
    }
  }

  useEffect(() => {
    loadSubscription()
    loadPlayInfo()
    loadDashboard('30d')
    loadTrend()
    loadCompare()
    loadReports()
  }, [])

  useDidShow(() => {
    const openFlag = Taro.getStorageSync('MY_OPEN_EDIT_PLAYINFO')
    if (!openFlag) return
    Taro.removeStorageSync('MY_OPEN_EDIT_PLAYINFO')

    const returnFlag = Boolean(Taro.getStorageSync('MY_EDIT_RETURN_TO_RECORD'))
    if (returnFlag) Taro.removeStorageSync('MY_EDIT_RETURN_TO_RECORD')

    void (async () => {
      try {
        const data = await apiRequest<{ play_info: any }>({ url: '/api/user/play-info' })
        setPlayInfo(data.play_info || null)
        openEditWith(data.play_info || null, returnFlag)
      } catch {
        openEditWith(null, returnFlag)
      }
    })()
  })

  useDidShow(() => {
    void (async () => {
      try {
        await loadPlayInfo()
      } catch {}
      try {
        await loadDashboard(period)
      } catch {}
      try {
        await loadTrend()
      } catch {}
      try {
        await loadReports()
      } catch {}
    })()
  })

  const isPro = Boolean(subscription?.is_pro)
  const mo = localOverview || dashboard?.match_overview
  const po = dashboard?.practice_overview

  const mapLabel = (list: any[], value: string) => list.find((x: any) => x.value === value)?.label || value
  const scoringLabel = (v: string) => mapLabel(SCORING_METHODS as any, v)
  const losingLabel = (v: string) => mapLabel(LOSING_REASONS as any, v)
  const practiceTypeLabel = (v: string) => mapLabel(PRACTICE_TYPES as any, v)
  const focusLabel = (v: string) => mapLabel(PRACTICE_FOCUS as any, v)

  return (
    <View className="container">
      {showEdit ? (
        <View className="aiLoadingOverlay" onClick={() => setShowEdit(false)}>
          <View className="card bigCard glassCard" style={{ width: '100%', maxWidth: '420px' }} onClick={(e: any) => e?.stopPropagation?.()}>
            <View className="cardInner">
              <View className="rowBetween" style={{ marginBottom: '10px' }}>
                <View style={{ fontWeight: 900 }}>编辑我的信息</View>
                <Button
                  size="sm"
                  className="btnMuted"
                  onClick={() => {
                    setShowEdit(false)
                    if (returnToRecord) {
                      setReturnToRecord(false)
                      Taro.switchTab({ url: '/pages/record/index' })
                    }
                  }}
                >
                  {returnToRecord ? '返回' : '关闭'}
                </Button>
              </View>

              <View className="formSection" style={{ marginTop: 0 }}>
                <View className="fieldLabelTight">球龄</View>
                <Input
                  value={form.tennis_age}
                  onInput={(e: any) => setForm(prev => ({ ...prev, tennis_age: e.detail.value }))}
                  placeholder='如 "2 年"'
                  className="input"
                />
              </View>

              <View style={{ marginTop: '12px' }}>
                <View className="tagGroupTitle">比赛风格</View>
                <View className="chipRow" style={{ marginTop: '10px' }}>
                  {(MY_PLAY_STYLES as any).map((item: any) => (
                    <Button
                      key={item.value}
                      size="sm"
                      className={form.play_style === item.value ? 'chip chipActive' : 'chip'}
                      onClick={() => setForm(prev => ({ ...prev, play_style: prev.play_style === item.value ? '' : item.value }))}
                    >
                      {item.label}
                    </Button>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: '12px' }}>
                <View className="tagGroupTitle">主要武器（最多选2个）</View>
                <View className="chipRow" style={{ marginTop: '10px' }}>
                  {(MY_MAIN_WEAPONS as any).map((item: any) => (
                    <Button
                      key={item.value}
                      size="sm"
                      className={form.main_weapons.includes(item.value) ? 'chip chipActive' : 'chip'}
                      onClick={() => setForm(prev => ({ ...prev, main_weapons: nextLimitedMulti(prev.main_weapons, item.value, 2) }))}
                    >
                      {item.label}
                    </Button>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: '12px' }}>
                <View className="tagGroupTitle">主要短板（最多选3个）</View>
                <View className="chipRow" style={{ marginTop: '10px' }}>
                  {(MY_WEAKNESSES as any).map((item: any) => (
                    <Button
                      key={item.value}
                      size="sm"
                      className={form.weaknesses.includes(item.value) ? 'chip chipActive' : 'chip'}
                      onClick={() => setForm(prev => ({ ...prev, weaknesses: nextLimitedMulti(prev.weaknesses, item.value, 3) }))}
                    >
                      {item.label}
                    </Button>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: '12px' }}>
                <View className="tagGroupTitle">移动体能（最多选2个）</View>
                <View className="chipRow" style={{ marginTop: '10px' }}>
                  {(MY_MOBILITY as any).map((item: any) => (
                    <Button
                      key={item.value}
                      size="sm"
                      className={form.mobility.includes(item.value) ? 'chip chipActive' : 'chip'}
                      onClick={() => setForm(prev => ({ ...prev, mobility: nextLimitedMulti(prev.mobility, item.value, 2) }))}
                    >
                      {item.label}
                    </Button>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: '12px' }}>
                <View className="tagGroupTitle">关键分状态</View>
                <View className="chipRow" style={{ marginTop: '10px' }}>
                  {(MY_CLUTCH_STATE as any).map((item: any) => (
                    <Button
                      key={item.value}
                      size="sm"
                      className={form.clutch_state === item.value ? 'chip chipActive' : 'chip'}
                      onClick={() => setForm(prev => ({ ...prev, clutch_state: prev.clutch_state === item.value ? '' : item.value }))}
                    >
                      {item.label}
                    </Button>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: '14px' }}>
                <Button loading={savingPlayInfo} disabled={savingPlayInfo || !online} variant="default" onClick={savePlayInfo}>
                  {returnToRecord ? '确认并返回' : '保存'}
                </Button>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <View className="pageHeader">
        <View>
          <View className="titleRow">
            <View className="tennisBall" />
            <View className="pageTitle">我的</View>
          </View>
          <View className="pageSubtitle">个人网球主页：信息管理、数据统计、AI 成长、月度报告</View>
        </View>
      </View>

      {!online ? (
        <View className="card bigCard glassCard" style={{ marginBottom: '14px' }}>
          <View className="cardInner">
            <Status type="offline" message="当前离线，数据可能不是最新" />
          </View>
        </View>
      ) : null}

      <View className="card bigCard glassCard">
        <View className="cardInner">
          <View className="rowBetween">
            <View>
              <View style={{ fontWeight: 900 }}>个人名片</View>
              <View className="hintText">{loadingPlayInfo ? '加载中…' : playInfo?.tennis_age ? `球龄 ${playInfo.tennis_age}` : '还没设置球龄与打法信息'}</View>
            </View>
            <IconButton icon="edit" variant="ghost" onClick={openEdit} />
          </View>

          <View style={{ marginTop: '12px' }} className="row" >
            <View className="pill">总场次 {mo?.total || 0}</View>
            <View className="pill pillWin">胜 {mo?.wins || 0}</View>
            <View className="pill pillLose">负 {mo?.losses || 0}</View>
            <View className="pill pillNeutral">胜率 {Math.round((mo?.win_rate || 0) * 100)}%</View>
          </View>

          <View style={{ marginTop: '12px' }} className="stack">
            <View className="hintText">{`比赛风格：${playInfo?.play_style ? mapLabel(MY_PLAY_STYLES as any, playInfo.play_style) : '未填'}`}</View>
            <View className="hintText">{`主要武器：${(playInfo?.main_weapons || []).length ? (playInfo.main_weapons as string[]).map(v => mapLabel(MY_MAIN_WEAPONS as any, v)).join('、') : '未填'}`}</View>
            <View className="hintText">{`主要短板：${(playInfo?.weaknesses || []).length ? (playInfo.weaknesses as string[]).map(v => mapLabel(MY_WEAKNESSES as any, v)).join('、') : '未填'}`}</View>
            <View className="hintText">{`移动体能：${(playInfo?.mobility || []).length ? (playInfo.mobility as string[]).map(v => mapLabel(MY_MOBILITY as any, v)).join('、') : '未填'}`}</View>
            <View className="hintText">{`关键分状态：${playInfo?.clutch_state ? mapLabel(MY_CLUTCH_STATE as any, playInfo.clutch_state) : '未填'}`}</View>
          </View>
        </View>
      </View>

      {/* 数据看板选择器合并到下方主卡片中 */}

      {loadingDashboard ? (
        <View style={{ marginTop: '14px' }} className="skeletonCard">
          <View className="skeleton skeletonLine" style={{ width: '40%' }} />
          <View style={{ marginTop: '12px' }} className="skeleton skeletonLine" />
          <View style={{ marginTop: '10px' }} className="skeleton skeletonSmall" />
        </View>
      ) : (
        <View style={{ marginTop: '14px' }}>
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View className="rowBetween" style={{ marginBottom: '8px' }}>
                <View style={{ fontWeight: 900 }}>📊 数据看板</View>
                <View className="segmented">
                  {(['30d', '90d', 'all'] as const).map(p => (
                    <Button
                      key={p}
                      size="sm"
                      className={`${period === p ? 'segItem segActive' : 'segItem'}`}
                      onClick={async () => {
                        setPeriod(p)
                        await loadDashboard(p)
                      }}
                    >
                      {p === '30d' ? '近30天' : p === '90d' ? '近90天' : '全部'}
                    </Button>
                  ))}
                </View>
              </View>
              <View className="hintText" style={{ marginBottom: '8px' }}>
                {`当前范围：${period === 'all' ? '全部' : period === '30d' ? '近30天' : '近90天'}`}
              </View>
              <View className="row" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <View className="pill">场次 {mo?.total || 0}</View>
                <View className="pill pillWin">胜 {mo?.wins || 0}</View>
                <View className="pill pillLose">负 {mo?.losses || 0}</View>
                <View className="pill pillNeutral">胜率 {Math.round((mo?.win_rate || 0) * 100)}%</View>
              </View>
              <View className="hintText" style={{ marginTop: '10px' }}>
                单打 {mo?.singles?.total || 0} 场（胜率 {Math.round((mo?.singles?.win_rate || 0) * 100)}%）｜双打 {mo?.doubles?.total || 0} 场（胜率 {Math.round((mo?.doubles?.win_rate || 0) * 100)}%）
              </View>

              <View className="divider" />

              <View style={{ fontWeight: 900, marginBottom: '8px' }}>🎯 得分方式 Top 5</View>
              {(dashboard?.scoring_methods_ranking || []).length ? (
                <View className="stack" style={{ gap: '10px' }}>
                  {(dashboard.scoring_methods_ranking || []).map((r: any) => (
                    <View key={r.method} className="rowBetween">
                      <View style={{ fontWeight: 800 }}>{scoringLabel(r.method)}</View>
                      <View className="pill pillNeutral">{Math.round((r.percentage || 0) * 100)}%</View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="hintText">暂无数据（需要在赛后总结里选择得分方式）</View>
              )}

              <View className="divider" />

              <View style={{ fontWeight: 900, marginBottom: '8px' }}>⚠️ 丢分原因 Top 5</View>
              {(dashboard?.losing_reasons_ranking || []).length ? (
                <View className="stack" style={{ gap: '10px' }}>
                  {(dashboard.losing_reasons_ranking || []).map((r: any) => (
                    <View key={r.reason} className="rowBetween">
                      <View style={{ fontWeight: 800 }}>{`${losingLabel(r.reason)}${r.is_critical ? ' 🔴' : ''}`}</View>
                      <View className="pill pillNeutral">{Math.round((r.percentage || 0) * 100)}%</View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="hintText">暂无数据（需要在赛后总结里选择丢分原因）</View>
              )}

              <View className="divider" />

              <View style={{ fontWeight: 900, marginBottom: '8px' }}>🎾 练习统计</View>
              <View className="row" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <View className="pill">练习 {po?.total_sessions || 0} 次</View>
                <View className="pill pillNeutral">约 {po?.total_hours || 0} 小时</View>
                <View className="pill pillNeutral">{`比赛:练习 = ${po?.match_practice_ratio || '0:0'}`}</View>
              </View>
              {(po?.type_distribution || []).length ? (
                <View className="hintText" style={{ marginTop: '10px' }}>
                  类型：{(po.type_distribution || []).slice(0, 4).map((x: any) => `${practiceTypeLabel(x.type)} ${x.count}次`).join('｜')}
                </View>
              ) : null}
              {(po?.focus_distribution || []).length ? (
                <View className="hintText" style={{ marginTop: '8px' }}>
                  重点：{(po.focus_distribution || []).slice(0, 4).map((x: any) => `${focusLabel(x.focus)} ${x.count}次`).join('｜')}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      )}

      <View style={{ marginTop: '14px' }} className="card bigCard glassCard">
        <View className="cardInner">
          <View className="rowBetween">
            <View>
              <View style={{ fontWeight: 900 }}>🆚 近两场对比</View>
              <View className="hintText">直接看你最近 2 场的差异，不用月报</View>
            </View>
            <IconButton icon="refresh" variant="ghost" onClick={loadCompare} />
          </View>

          {loadingCompare ? (
            <View className="hintText" style={{ marginTop: '10px' }}>加载中…</View>
          ) : !compare ? (
            <View className="hintText" style={{ marginTop: '10px' }}>暂无数据</View>
          ) : !compare.available ? (
            <View className="hintText" style={{ marginTop: '10px' }}>{compare.reason || '至少需要 2 场比赛记录才能对比'}</View>
          ) : (
            <View style={{ marginTop: '10px' }} className="stack">
              <View style={{ fontWeight: 800, lineHeight: '22px' }}>{compare.diff?.summary}</View>
              <View className="row" style={{ gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                <View className="pill pillNeutral">
                  {compare.mode === 'same_opponent' ? '同对手对比' : '跨对手对比'}
                </View>
                <View className="pill">{`本场：${compare.current?.opponent}（${compare.current?.result}）${compare.current?.score ? ' · ' + compare.current.score : ''}`}</View>
                <View className="pill">{`上场：${compare.previous?.opponent}（${compare.previous?.result}）${compare.previous?.score ? ' · ' + compare.previous.score : ''}`}</View>
              </View>
              <View className="stack" style={{ gap: '8px', marginTop: '10px' }}>
                {(compare.diff?.bullets || []).map((b: string, idx: number) => (
                  <View key={idx} style={{ lineHeight: '22px' }}>• {b}</View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={{ marginTop: '14px' }} className="card bigCard glassCard">
        <View className="cardInner">
          <View className="rowBetween">
            <View>
              <View style={{ fontWeight: 900 }}>📅 月度报告</View>
              <View className="hintText">阶段性回顾与改进清单（PRO）</View>
            </View>
          </View>

          {!isPro ? (
            <View style={{ marginTop: '12px' }}>
              <View className="hintText">当前账号不是 PRO，无法生成月度报告。</View>
              <View style={{ marginTop: '10px' }}>
                <Button onClick={makePro} variant="default">
                  开启 PRO（开发模式）
                </Button>
              </View>
            </View>
          ) : (
            <View style={{ marginTop: '12px' }}>
              <View className="rowBetween">
                <View className="hintText">根据你近 30 天的比赛与练习生成月度洞察</View>
                <Button onClick={generate} loading={loadingReport} variant="default" size="sm">
                  生成
                </Button>
              </View>
            </View>
          )}
        </View>
      </View>

      {loadingReport && !report ? (
        <View style={{ marginTop: '14px' }} className="skeletonCard">
          <View className="skeleton skeletonLine" style={{ width: '40%' }} />
          <View style={{ marginTop: '12px' }} className="skeleton skeletonLine" />
          <View style={{ marginTop: '10px' }} className="skeleton skeletonSmall" />
        </View>
      ) : null}

      {report ? (
        <View style={{ marginTop: '14px' }} className="stack">
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 900, marginBottom: '8px' }}>本次月报</View>
              <View style={{ lineHeight: '22px' }}>{report.content.total_summary}</View>
            </View>
          </View>
        </View>
      ) : null}

      {reports.length ? (
        <View style={{ marginTop: '14px' }} className="stack">
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 900, marginBottom: '10px' }}>历史月报</View>
              <View className="stack" style={{ gap: '10px' }}>
                {reports.slice(0, 3).map((r: any) => (
                  <View key={r.id} className="card" style={{ padding: '12px', background: 'rgba(255,255,255,0.04)' }}>
                    <View className="rowBetween">
                      <View style={{ fontWeight: 900 }}>{(r.period_label || r.title || '月报').slice(0, 24)}</View>
                      <View className="pill pillNeutral">{(r.created_at || '').slice(0, 10)}</View>
                    </View>
                    <View className="hintText" style={{ marginTop: '8px', lineHeight: '20px' }}>
                      {(r.content?.total_summary || '').slice(0, 60)}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}
