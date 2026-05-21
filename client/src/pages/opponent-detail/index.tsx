import { View, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'
import Button from '@/components/ui/button'
import Badge from '@/components/ui/badge'
import Status from '@/components/ui/Status'
import { SCORING_METHODS, LOSING_REASONS } from '../../constants'
import Icon from '@/components/Icon'
import IconButton from '@/components/ui/icon-button'

// 雷达图维度标签（兼容旧数据）
const RADAR_DIM_LABEL: Record<string, string> = {
  serve: '发球',
  baseline: '底线',
  net: '网前',
  movement: '移动',
  mental: '心态'
}

function buildRadar(stats: { tag: string; count: number; ratio: number }[]) {
  const total = stats.reduce((acc, s) => acc + s.count, 0) || 1
  
  // 旧标签分组，兼容历史数据
  const tagGroups: Record<string, string[]> = {
    serve: ['一发凶猛', '发球稳定', '二发偏弱', 'ACE多', '双误多'],
    baseline: ['正手暴力', '反手切削', '双反稳健', '底线防守型', '喜欢大角度', '上旋强'],
    net: ['常上网', '截击好', '网前手软', '很少上网'],
    movement: ['脚步快', '侧向移动慢', '体能好', '后半段体能下降'],
    mental: ['关键分稳', '容易急躁', '越打越好', '逆风局容易放弃']
  }

  const score = (tags: readonly string[]) => {
    const hit = stats.filter(s => tags.includes(s.tag)).reduce((acc, s) => acc + s.count, 0)
    return Math.max(0, Math.min(5, Math.round((hit / total) * 5)))
  }
  return {
    serve: score(tagGroups.serve),
    baseline: score(tagGroups.baseline),
    net: score(tagGroups.net),
    movement: score(tagGroups.movement),
    mental: score(tagGroups.mental)
  }
}

export default function OpponentDetailPage() {
  const router = Taro.getCurrentInstance().router
  const alias = useMemo(() => decodeURIComponent(((router?.params as any)?.alias || '') as string), [router?.params])
  const [opponent, setOpponent] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'matches' | 'portrait' | 'me'>('matches')
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null)
  const [analysisByMatchId, setAnalysisByMatchId] = useState<Record<string, any>>({})
  const [analysisLoadingId, setAnalysisLoadingId] = useState<string | null>(null)

  const load = async () => {
    if (!alias) return
    setLoading(true)
    try {
      const data = await apiRequest<{ opponent: any }>({ url: `/api/opponents/${encodeURIComponent(alias)}` })
      setOpponent(data.opponent)
      setNotes(String(data.opponent?.personal_notes || ''))
      const m = await apiRequest<{ items: any[] }>({ url: `/api/match/opponent/${encodeURIComponent(alias)}` })
      setMatches(m.items || [])
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [alias])

  if (!alias) return <View className="container">缺少对手信息</View>
  if (loading)
    return (
      <View className="container">
        <View className="skeletonCard">
          <View className="skeleton skeletonLine" style={{ width: '45%' }} />
          <View style={{ marginTop: '12px' }} className="skeleton skeletonLine" />
          <View style={{ marginTop: '10px' }} className="skeleton skeletonSmall" />
        </View>
      </View>
    )

  const radar = buildRadar(opponent?.aggregated_opponent_tags || [])
  const sortedMatches = (matches || []).slice().sort((a: any, b: any) => {
    const at = new Date(a.date_time || a.created_at || 0).getTime()
    const bt = new Date(b.date_time || b.created_at || 0).getTime()
    return bt - at
  })
  const topCounts = (items: string[]) => {
    const map = new Map<string, number>()
    for (const x of items) map.set(x, (map.get(x) || 0) + 1)
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => ({ k, v }))
  }
  const scoringTop = topCounts(sortedMatches.flatMap((m: any) => (m.post_match_summary?.scoring_methods || []) as string[]))
  const losingTop = topCounts(sortedMatches.flatMap((m: any) => (m.post_match_summary?.losing_reasons || []) as string[]))
  const labelOf = (list: any[], v: string) => list.find((x: any) => x.value === v)?.label || v
  const winRatePct = Math.round((opponent?.win_rate || 0) * 100)
  const lockedIntel = Number(opponent?.total_matches || 0) < 2
  const needMoreIntel = Math.max(0, 2 - Number(opponent?.total_matches || 0))

  const loadMatchAnalysis = async (matchId: string) => {
    if (analysisByMatchId[matchId] !== undefined) return
    if (analysisLoadingId) return
    setAnalysisLoadingId(matchId)
    try {
      const data = await apiRequest<{ analysis: any }>({ url: `/api/match/${matchId}/analysis` })
      setAnalysisByMatchId(prev => ({ ...prev, [matchId]: data.analysis ?? null }))
    } catch {
      setAnalysisByMatchId(prev => ({ ...prev, [matchId]: null }))
    } finally {
      setAnalysisLoadingId(null)
    }
  }

  return (
    <View className="container">
      <View className="pageHeader">
        <View>
          <View className="pageTitle">{alias}</View>
          <View className="pageSubtitle">
            交手 {opponent?.total_matches || 0} 场｜胜 {opponent?.wins || 0} 负 {opponent?.losses || 0}
          </View>
        </View>
        <IconButton icon="refresh" variant="ghost" onClick={load} />
      </View>

      <View className="card bigCard glassCard">
        <View className="cardInner">
          <View className="rowBetween">
            <View style={{ fontWeight: 900 }}>对战档案</View>
            <Badge>胜率 {winRatePct}%</Badge>
          </View>
          <View style={{ marginTop: '12px' }} className="segmented">
            <Button size="sm" variant="ghost" className={`${tab === 'matches' ? 'segItem segActive' : 'segItem'}`} onClick={() => setTab('matches')}>对战记录</Button>
            <Button size="sm" variant="ghost" className={`${tab === 'portrait' ? 'segItem segActive' : 'segItem'}`} onClick={() => setTab('portrait')}>对手画像</Button>
            <Button size="sm" variant="ghost" className={`${tab === 'me' ? 'segItem segActive' : 'segItem'}`} onClick={() => setTab('me')}>我的表现</Button>
          </View>
        </View>
      </View>

      {tab === 'matches' ? (
        <View className="stack" style={{ marginTop: '14px' }}>
          {sortedMatches.map((m: any) => (
            <View
              key={m.id}
              className="card bigCard glassCard pressable"
              hoverClass="pressHover"
              onClick={async () => {
                const next = expandedMatchId === m.id ? null : m.id
                setExpandedMatchId(next)
                if (next) await loadMatchAnalysis(next)
              }}
            >
              <View className="cardInner">
                <View className="rowBetween">
                  <View className="row" style={{ gap: '10px' }}>
                    <Badge variant={m.match_result === 'WIN' ? 'success' : m.match_result === 'LOSE' ? 'destructive' : m.match_result === 'PRACTICE' ? 'practice' : 'default'}>
                      {m.match_result === 'WIN' ? '胜' : m.match_result === 'LOSE' ? '负' : m.match_result === 'PRACTICE' ? '练习' : '平'}
                    </Badge>
                    <View style={{ fontWeight: 900 }}>{(m.date_time || m.created_at || '').slice(0, 10) || '日期未知'}</View>
                  </View>
                  <View className="row" style={{ gap: '8px' }}>
                    <Badge>{m.score_analysis?.score_summary || '未填写比分'}</Badge>
                    <Button size="sm" variant="ghost" onClick={(e: any) => {
                        e?.stopPropagation?.()
                        Taro.navigateTo({ url: `/pages/result/index?id=${m.id}` })
                      }}>详情 →</Button>
                  </View>
                </View>

                {m.post_match_summary?.scoring_methods?.length ? (
                  <View className="hintText" style={{ marginTop: '10px' }}>
                    得分：
                    {(m.post_match_summary.scoring_methods as string[])
                      .map(v => labelOf(SCORING_METHODS as any, v))
                      .join('、')}
                  </View>
                ) : null}
                {m.post_match_summary?.losing_reasons?.length ? (
                  <View className="hintText" style={{ marginTop: '6px' }}>
                    丢分：
                    {(m.post_match_summary.losing_reasons as string[])
                      .map(v => labelOf(LOSING_REASONS as any, v))
                      .join('、')}
                  </View>
                ) : null}
                {m.post_match_summary?.one_line_summary ? (
                  <View className="paraText" style={{ marginTop: '10px' }}>
                    {`💡 ${m.post_match_summary.one_line_summary}`}
                  </View>
                ) : null}

                {expandedMatchId === m.id ? (
                  <View style={{ marginTop: '12px' }}>
                    <View className="divider" />
                    {analysisLoadingId === m.id ? (
                      <Status type="loading" />
                    ) : analysisByMatchId[m.id] ? (
                      <View>
                        <View className="rowBetween" style={{ marginBottom: '8px' }}>
                          <View style={{ fontWeight: 900 }}>AI 分析摘要</View>
                          <View className="pill pillNeutral">{analysisByMatchId[m.id]?.overview?.rating_label || '已生成'}</View>
                        </View>
                        <View className="paraText">{analysisByMatchId[m.id]?.overview?.one_liner || '暂无摘要'}</View>
                        {(analysisByMatchId[m.id]?.highlights?.items || []).length ? (
                          <View style={{ marginTop: '10px' }}>
                            <View className="hintText" style={{ marginBottom: '6px' }}>
                              {analysisByMatchId[m.id]?.highlights?.title || '今天的亮点'}
                            </View>
                            <View className="stack" style={{ gap: '6px' }}>
                              {(analysisByMatchId[m.id]?.highlights?.items || []).slice(0, 3).map((it: any, idx: number) => (
                                <View key={idx} className="bullet">
                                  <View className="bulletIcon">{it.emoji || '•'}</View>
                                  <View className="bulletText">{it.point}</View>
                                </View>
                              ))}
                            </View>
                          </View>
                        ) : null}
                        {(analysisByMatchId[m.id]?.improvements?.items || []).length ? (
                          <View style={{ marginTop: '10px' }}>
                            <View className="hintText" style={{ marginBottom: '6px' }}>
                              {analysisByMatchId[m.id]?.improvements?.title || '下次要注意'}
                            </View>
                            <View className="stack" style={{ gap: '6px' }}>
                              {(analysisByMatchId[m.id]?.improvements?.items || []).slice(0, 3).map((it: any, idx: number) => (
                                <View key={idx} className="bullet">
                                  <View className="bulletIcon">{it.emoji || '•'}</View>
                                  <View className="bulletText">{it.point}</View>
                                </View>
                              ))}
                            </View>
                          </View>
                        ) : null}
                        {(analysisByMatchId[m.id]?.homework?.drills || []).length ? (
                          <View style={{ marginTop: '10px' }}>
                            <View className="hintText" style={{ marginBottom: '6px' }}>练球作业</View>
                            <View className="stack" style={{ gap: '6px' }}>
                              {(analysisByMatchId[m.id]?.homework?.drills || []).slice(0, 2).map((d: any, idx: number) => (
                                <View key={idx} className="pill pillNeutral">{`${d.name}${d.duration ? ` · ${d.duration}` : ''}`}</View>
                              ))}
                            </View>
                          </View>
                        ) : null}
                        {analysisByMatchId[m.id] === null ? <View className="hintText">暂无 AI 分析</View> : null}
                      </View>
                    ) : (
                      <View className="hintText" style={{ padding: '6px 0' }}>
                        暂无 AI 分析
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            </View>
          ))}
          {sortedMatches.length === 0 ? <View className="emptyState">暂无交手记录</View> : null}
        </View>
      ) : null}

      {tab === 'portrait' ? (
        <View className="stack" style={{ marginTop: '14px' }}>
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 900, marginBottom: '10px' }}>基础标签</View>
              <View className="chipRow">
                {opponent?.play_style ? <View className="pill pillNeutral">打法：{opponent.play_style}</View> : null}
                {opponent?.dominant_hand ? <View className="pill pillNeutral">惯用手：{opponent.dominant_hand}</View> : null}
                {(opponent?.main_weapons || []).slice(0, 2).map((x: string) => (
                  <View key={`w-${x}`} className="pill pillNeutral">{`武器：${x}`}</View>
                ))}
                {(opponent?.weaknesses || []).slice(0, 2).map((x: string) => (
                  <View key={`wk-${x}`} className="pill pillNeutral">{`漏洞：${x}`}</View>
                ))}
                {opponent?.clutch_tendency ? <View className="pill pillNeutral">关键分：{opponent.clutch_tendency}</View> : null}
                {(opponent?.mobility || []).slice(0, 2).map((x: string) => (
                  <View key={`m-${x}`} className="pill pillNeutral">{`移动：${x}`}</View>
                ))}
                {!opponent?.play_style && !opponent?.dominant_hand && !(opponent?.main_weapons || []).length && !(opponent?.weaknesses || []).length ? (
                  <View className="hintText">暂无手动标注标签</View>
                ) : null}
              </View>
            </View>
          </View>

          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 900, marginBottom: '10px' }}>弱点雷达（低分=可攻击）</View>
              <View className="stack" style={{ gap: '10px' }}>
                {(Object.keys(radar) as Array<keyof typeof radar>).map(key => (
                  <View key={key}>
                    <View className="rowBetween">
                      <View className="hintText">{RADAR_DIM_LABEL[key]}</View>
                      <View className="pill pillNeutral">{radar[key]} / 5</View>
                    </View>
                    <View style={{ marginTop: '6px' }} className="barTrack">
                      <View className="barFill" style={{ width: `${(radar[key] / 5) * 100}%` }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 900, marginBottom: '10px' }}>高频特点</View>
              <View className="chipRow">
                {(opponent?.aggregated_opponent_tags || []).slice(0, 8).map((t: any) => (
                  <View key={t.tag} className="pill pillNeutral">
                    {t.tag} {Math.round((t.ratio || 0) * 100)}%
                  </View>
                ))}
              </View>
              {(!opponent?.aggregated_opponent_tags || opponent.aggregated_opponent_tags.length === 0) ? <View className="hintText">数据不足</View> : null}
            </View>
          </View>

          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 900, marginBottom: '10px' }}>我的备注</View>
              <Textarea value={notes} onInput={(e: any) => setNotes(e.detail.value)} maxlength={500} placeholder="比如：他热身慢，前3局要咬住；发球前看眼神会暴露方向…" className="textarea" />
              <View style={{ marginTop: '10px' }}>
                <Button
                  loading={savingNotes}
                  disabled={savingNotes}
                  variant="default"
                  onClick={async () => {
                    setSavingNotes(true)
                    try {
                      const data = await apiRequest<{ opponent: any }>({
                        url: `/api/opponents/${encodeURIComponent(alias)}/notes`,
                        method: 'PUT',
                        data: { notes }
                      })
                      setOpponent(data.opponent)
                      setNotes(String(data.opponent?.personal_notes || ''))
                      Taro.showToast({ title: '已保存', icon: 'success' })
                    } catch (e: any) {
                      Taro.showToast({ title: e?.message || '保存失败', icon: 'none' })
                    } finally {
                      setSavingNotes(false)
                    }
                  }}
                >
                  保存备注
                </Button>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {tab === 'me' ? (
        <View className="stack" style={{ marginTop: '14px' }}>
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 900, marginBottom: '10px' }}>最有效的得分方式 Top 3</View>
              {scoringTop.length ? (
                <View className="stack" style={{ gap: '8px' }}>
                  {scoringTop.map((x, idx) => (
                    <View key={x.k} className="rowBetween">
                      <View style={{ fontWeight: 800 }}>{`${idx + 1}. ${x.k}`}</View>
                      <Badge>{x.v} 场</Badge>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="hintText">暂无数据（需要在赛后总结里选择得分方式）</View>
              )}
            </View>
          </View>

          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 900, marginBottom: '10px' }}>最常见的丢分原因 Top 3</View>
              {losingTop.length ? (
                <View className="stack" style={{ gap: '8px' }}>
                  {losingTop.map((x, idx) => (
                    <View key={x.k} className="rowBetween">
                      <View style={{ fontWeight: 800 }}>{`${idx + 1}. ${x.k}`}</View>
                      <View className="pill pillNeutral">{x.v} 场</View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="hintText">暂无数据（需要在赛后总结里选择丢分原因）</View>
              )}
            </View>
          </View>
        </View>
      ) : null}

      <View className="row" style={{ marginTop: '14px' }}>
        <Button
          variant="default"
          style={{ flex: 1 }}
          onClick={() => {
            Taro.setStorageSync('RECORD_PREFILL_ALIAS', alias)
            Taro.switchTab({ url: '/pages/record/index' })
          }}
        >
          记一场
        </Button>
        <Button variant={lockedIntel ? 'secondary' : 'ghost'} style={{ flex: 1 }} onClick={() => {
            if (lockedIntel) {
              Taro.showToast({ title: `再打 ${needMoreIntel} 场解锁赛前情报`, icon: 'none' })
              return
            }
            Taro.navigateTo({ url: `/pages/pre-match-intel/index?alias=${encodeURIComponent(alias)}` })
          }}>
          赛前情报
        </Button>
      </View>
    </View>
  )
}
