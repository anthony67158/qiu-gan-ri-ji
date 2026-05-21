import { View, Textarea, Picker } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'
import Button from '@/components/ui/button'
import Status from '@/components/ui/Status'
import useNetworkStatus from '@/hooks/useNetworkStatus'
import IconButton from '@/components/ui/icon-button'
import {
  KEY_POINT_ERROR_REASONS,
  LOSING_REASONS,
  MATCH_CONDITION_HELP,
  MATCH_CONDITION_LABELS,
  MATCH_CONDITIONS,
  SCORING_METHODS,
  PRACTICE_DURATIONS,
  PRACTICE_TYPES,
  PRACTICE_FOCUS,
  PRACTICE_GAINS,
  PRACTICE_ISSUES
} from '../../constants'
import { MY_PHYSICAL_STATE } from '../../constants'
import CoordinationIssuesTag from '../../components/CoordinationIssuesTag'
import MyInfoCard, { MyInfoForm, PartnerForm } from '../../components/MyInfoCard'
import OpponentInfoCard, { OpponentForm } from '../../components/OpponentInfoCard'
import PartnerSearchInput from '../../components/PartnerSearchInput'
import AdvancedModeCollapse from '../../components/AdvancedModeCollapse'

type RecordType = 'match' | 'practice'

const SCORE_RANGE = Array.from({ length: 8 }).map((_, i) => String(i))

type SetScoreDraft = { score_self: number; score_opponent: number }

function formatLocalDateYYYYMMDD(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function calcTotals(sets: SetScoreDraft[]) {
  return sets.reduce(
    (acc, s) => {
      if (s.score_self > s.score_opponent) acc.self += 1
      if (s.score_opponent > s.score_self) acc.opp += 1
      return acc
    },
    { self: 0, opp: 0 }
  )
}

export default function RecordPage() {
  const { online } = useNetworkStatus()
  const [recordType, setRecordType] = useState<RecordType>('match')
  const [mode, setMode] = useState<'singles' | 'doubles'>('singles')
  const [matchDate, setMatchDate] = useState(() => formatLocalDateYYYYMMDD(new Date()))

  const emptyOpponent = (): OpponentForm => ({
    id: undefined,
    nickname: '',
    traits: {
      play_style: undefined,
      dominant_hand: undefined,
      main_weapons: [],
      weaknesses: [],
      clutch_tendency: undefined,
      mobility: []
    }
  })

  const [opponents, setOpponents] = useState<OpponentForm[]>([emptyOpponent(), emptyOpponent()])

  const [myInfo, setMyInfo] = useState<MyInfoForm>({
    play_style: undefined,
    main_weapons: [],
    weaknesses: [],
    mobility: [],
    clutch_state: undefined,
    physical_state: undefined
  })

  const emptyPartner = (): PartnerForm => ({
    id: undefined,
    nickname: '',
    play_style: undefined,
    main_weapons: [],
    weaknesses: [],
    court_preference: undefined,
    physical_state: undefined
  })

  const [partner, setPartner] = useState<PartnerForm>(emptyPartner())
  const [myCourtPreference, setMyCourtPreference] = useState<'ad_court' | 'deuce_court' | 'flexible' | undefined>(undefined)

  const [postMatchSummary, setPostMatchSummary] = useState({
    scoring_methods: [] as string[],
    losing_reasons: [] as string[],
    key_point_error_reasons: [] as string[],
    coordination_issues: [] as string[],
    one_line_summary: ''
  })

  const [sets, setSets] = useState<SetScoreDraft[]>([{ score_self: 0, score_opponent: 0 }])
  const [submitting, setSubmitting] = useState(false)
  const [surfaceIndex, setSurfaceIndex] = useState(-1)
  const [weatherIndex, setWeatherIndex] = useState(-1)
  const [physicalIndex, setPhysicalIndex] = useState(-1)

  const [practiceInfo, setPracticeInfo] = useState({
    date_time: formatLocalDateYYYYMMDD(new Date()),
    duration: '',
    practice_type: '',
    focus_areas: [] as string[],
    practice_partner_id: '',
    practice_partner_nickname: ''
  })
  const [practiceSummary, setPracticeSummary] = useState({
    gains: [] as string[],
    unresolved: [] as string[],
    one_line_note: ''
  })

  useEffect(() => {
    let canceled = false
    async function loadLast() {
      try {
        const params = Taro.getCurrentInstance().router?.params as any
        const alias = params?.alias ? decodeURIComponent(params.alias) : ''
        const data = await apiRequest<{ items: any[] }>({ url: '/api/match?limit=1&offset=0' })
        const last = data.items?.[0]
        if (!last || canceled) return
        if (last.my_info) {
          setMyInfo({
            play_style: last.my_info.play_style || undefined,
            main_weapons: last.my_info.main_weapons || [],
            weaknesses: last.my_info.weaknesses || [],
            mobility: last.my_info.mobility || [],
            clutch_state: last.my_info.clutch_state || undefined,
            physical_state: last.my_info.physical_state || undefined
          })
        }
        if (last.partner_snapshot) {
          setPartner({
            id: last.partner_snapshot.id,
            nickname: last.partner_snapshot.nickname || '',
            play_style: last.partner_snapshot.play_style || undefined,
            main_weapons: last.partner_snapshot.main_weapons || [],
            weaknesses: last.partner_snapshot.weaknesses || [],
            court_preference: last.partner_snapshot.court_preference || undefined,
            physical_state: last.partner_snapshot.physical_state || undefined
          })
        }
        if (last.my_court_preference) {
          setMyCourtPreference(last.my_court_preference)
        }
        if (alias) {
          try {
            const detail = await apiRequest<{ opponent: any }>({ url: `/api/opponents/${encodeURIComponent(alias)}` })
            const opp = detail.opponent
            if (opp) {
              setOpponents(prev => [
                {
                  id: opp.id,
                  nickname: opp.opponent_name_alias,
                  traits: {
                    play_style: opp.play_style || undefined,
                    dominant_hand: opp.dominant_hand || undefined,
                    main_weapons: opp.main_weapons || [],
                    weaknesses: opp.weaknesses || [],
                    clutch_tendency: opp.clutch_tendency || undefined,
                    mobility: opp.mobility || []
                  }
                },
                prev[1]
              ])
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }
    loadLast()
    return () => {
      canceled = true
    }
  }, [])

  useDidShow(() => {
    const aliasRaw = Taro.getStorageSync('RECORD_PREFILL_ALIAS')
    const alias = typeof aliasRaw === 'string' ? aliasRaw.trim() : ''
    if (!alias) return
    Taro.removeStorageSync('RECORD_PREFILL_ALIAS')
    void (async () => {
      try {
        const detail = await apiRequest<{ opponent: any }>({ url: `/api/opponents/${encodeURIComponent(alias)}` })
        const opp = detail.opponent
        if (!opp) return
        setOpponents(prev => [
          {
            id: opp.id,
            nickname: opp.opponent_name_alias,
            traits: {
              play_style: opp.play_style || undefined,
              dominant_hand: opp.dominant_hand || undefined,
              main_weapons: opp.main_weapons || [],
              weaknesses: opp.weaknesses || [],
              clutch_tendency: opp.clutch_tendency || undefined,
              mobility: opp.mobility || []
            }
          },
          prev[1]
        ])
      } catch {}
    })()
  })

  useDidShow(() => {
    const updated = Taro.getStorageSync('MY_PLAYINFO_UPDATED')
    if (!updated) return
    Taro.removeStorageSync('MY_PLAYINFO_UPDATED')
    void (async () => {
      try {
        const data = await apiRequest<{ play_info: any }>({ url: '/api/user/play-info' })
        const p = data.play_info
        if (!p) return
        setMyInfo(prev => ({
          ...prev,
          play_style: p.play_style || undefined,
          main_weapons: p.main_weapons || [],
          weaknesses: p.weaknesses || [],
          mobility: p.mobility || [],
          clutch_state: p.clutch_state || undefined
        }))
      } catch {
        // ignore
      }
    })()
  })

  const totals = calcTotals(sets)
  const scoreFilled = sets.some(s => (s.score_self || 0) > 0 || (s.score_opponent || 0) > 0)
  const matchResultDerived =
    !scoreFilled || recordType !== 'match'
      ? null
      : totals.self > totals.opp
        ? 'WIN'
        : totals.self < totals.opp
          ? 'LOSE'
          : 'DRAW'
  const matchResultLabel = matchResultDerived === 'WIN' ? '赢了' : matchResultDerived === 'LOSE' ? '输了' : matchResultDerived === 'DRAW' ? '平局' : ''
  const matchResultPillClass =
    matchResultDerived === 'WIN'
      ? 'pill pillWin'
      : matchResultDerived === 'LOSE'
        ? 'pill pillLose'
        : matchResultDerived === 'DRAW'
          ? 'pill pillNeutral'
          : 'pill pillNeutral'

  const analysisGate = (() => {
    const missing: string[] = []
    if (recordType === 'match') {
      if (!String(matchDate || '').trim()) missing.push('比赛日期')
      if (!scoreFilled) missing.push('比分（至少填 1 盘）')

      const o1 = opponents[0]
      if (!String(o1?.nickname || '').trim()) missing.push('对手昵称')
      if (!String(o1?.traits?.play_style || '').trim()) missing.push('对手打法类型')

      if (mode === 'doubles') {
        const o2 = opponents[1]
        if (!String(o2?.nickname || '').trim()) missing.push('对手2昵称')
        if (!String(o2?.traits?.play_style || '').trim()) missing.push('对手2打法类型')
        if (!String(partner?.nickname || '').trim()) missing.push('搭档昵称')
      }

      if (!String(myInfo.play_style || '').trim()) missing.push('我的比赛风格')
      if (!String(myInfo.physical_state || '').trim()) missing.push('我的身体状态')
      if ((postMatchSummary.scoring_methods || []).length < 1) missing.push('得分方式（至少选 1 个）')
      if ((postMatchSummary.losing_reasons || []).length < 1) missing.push('丢分原因（至少选 1 个）')
    } else {
      if (!String(practiceInfo.date_time || '').trim()) missing.push('练习日期')
      if (!String(practiceInfo.practice_type || '').trim()) missing.push('练习类型')
      if ((practiceInfo.focus_areas || []).length < 1) missing.push('练习重点（至少选 1 个）')
      if (!String(myInfo.physical_state || '').trim()) missing.push('我的身体状态')
      const hasSummary = (practiceSummary.gains || []).length >= 1 || (practiceSummary.unresolved || []).length >= 1
      if (!hasSummary) missing.push('练习总结（收获或没解决的问题至少选 1 个）')
    }
    return { ready: missing.length === 0, missing }
  })()

  const switchMode = async (next: 'singles' | 'doubles') => {
    if (next === mode) return
    const res = await Taro.showModal({
      title: '切换模式',
      content: `切换到${next === 'doubles' ? '双打' : '单打'}会清空已填写的对手与搭档信息，是否继续？`,
      confirmText: '继续',
      cancelText: '取消'
    })
    if (!res.confirm) return
    setMode(next)
    setOpponents([emptyOpponent(), emptyOpponent()])
    setPartner(emptyPartner())
    setMyCourtPreference(undefined)
    setPostMatchSummary(prev => ({ ...prev, coordination_issues: [] }))
  }

  const switchRecordType = async (next: RecordType) => {
    if (next === recordType) return
    const res = await Taro.showModal({
      title: '切换记录类型',
      content: '切换将清空已填写的内容，是否继续？',
      confirmText: '继续',
      cancelText: '取消'
    })
    if (!res.confirm) return
    setRecordType(next)
    // 清空所有与类型相关的数据
    setMatchDate(formatLocalDateYYYYMMDD(new Date()))
    setSets([{ score_self: 0, score_opponent: 0 }])
    setOpponents([emptyOpponent(), emptyOpponent()])
    setPartner(emptyPartner())
    setMyCourtPreference(undefined)
    setPostMatchSummary({ scoring_methods: [], losing_reasons: [], key_point_error_reasons: [], coordination_issues: [], one_line_summary: '' })
    setPracticeInfo({
      date_time: formatLocalDateYYYYMMDD(new Date()),
      duration: '',
      practice_type: '',
      focus_areas: [],
      practice_partner_id: '',
      practice_partner_nickname: ''
    })
    setPracticeSummary({ gains: [], unresolved: [], one_line_note: '' })
  }

  const submit = async () => {
    if (!analysisGate.ready) {
      const tip = analysisGate.missing.length ? `还需填写：${analysisGate.missing.join('、')}` : '信息未填写完整'
      Taro.showToast({ title: tip, icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const totals = calcTotals(sets)
      const matchResult =
        recordType === 'practice'
          ? 'PRACTICE'
          : totals.self > totals.opp
            ? 'WIN'
            : totals.self < totals.opp
              ? 'LOSE'
              : 'DRAW'

      const data = await apiRequest<{ match_id: string; clarification: any }>({
        url: '/api/match',
        method: 'POST',
        data: {
          date_time: recordType === 'practice' ? practiceInfo.date_time || undefined : matchDate || undefined,
          match_result: matchResult,
          match_type: recordType === 'practice' ? 'singles' : mode,
          score:
            recordType === 'practice'
              ? undefined
              : {
                  sets: sets.map((s, idx) => ({
                    set_number: idx + 1,
                    score_self: s.score_self,
                    score_opponent: s.score_opponent
                  })),
                  total_self: totals.self,
                  total_opponent: totals.opp
                },
          opponent_snapshots: recordType === 'practice' ? undefined : (mode === 'doubles' ? opponents.slice(0, 2) : opponents.slice(0, 1)).map(o => ({
            id: o.id,
            name: o.nickname || undefined,
            play_style: o.traits.play_style,
            dominant_hand: o.traits.dominant_hand,
            main_weapons: o.traits.main_weapons,
            weaknesses: o.traits.weaknesses,
            clutch_tendency: o.traits.clutch_tendency,
            mobility: o.traits.mobility
          })),
          my_info: {
            play_style: myInfo.play_style,
            main_weapons: myInfo.main_weapons,
            weaknesses: myInfo.weaknesses,
            mobility: myInfo.mobility,
            clutch_state: myInfo.clutch_state,
            physical_state: myInfo.physical_state
          },
          post_match_summary:
            recordType === 'practice'
              ? undefined
              : {
                  scoring_methods: postMatchSummary.scoring_methods,
                  losing_reasons: postMatchSummary.losing_reasons,
                  key_point_error_reasons: postMatchSummary.key_point_error_reasons,
                  coordination_issues: mode === 'doubles' ? postMatchSummary.coordination_issues : undefined,
                  one_line_summary: postMatchSummary.one_line_summary || undefined
                },
          my_court_preference: recordType === 'practice' ? undefined : mode === 'doubles' ? myCourtPreference : undefined,
          partner_snapshot:
            recordType === 'practice'
              ? undefined
              : mode === 'doubles'
                ? {
                    id: partner.id,
                    nickname: partner.nickname || undefined,
                    play_style: partner.play_style,
                    main_weapons: partner.main_weapons,
                    weaknesses: partner.weaknesses,
                    court_preference: partner.court_preference,
                    physical_state: partner.physical_state
                  }
                : undefined,
          match_conditions: {
            surface: surfaceIndex >= 0 ? MATCH_CONDITIONS.surface[surfaceIndex] : null,
            weather: weatherIndex >= 0 ? MATCH_CONDITIONS.weather[weatherIndex] : null,
            physical_state: physicalIndex >= 0 ? MATCH_CONDITIONS.physical_state[physicalIndex] : null
          },
          practice_info:
            recordType === 'practice'
              ? {
                  duration: practiceInfo.duration || undefined,
                  practice_type: practiceInfo.practice_type || undefined,
                  focus_areas: practiceInfo.focus_areas,
                  practice_partner_id: practiceInfo.practice_partner_id || undefined,
                  practice_partner_nickname: practiceInfo.practice_partner_nickname || undefined,
                  date_time: practiceInfo.date_time || undefined
                }
              : undefined,
          practice_summary:
            recordType === 'practice'
              ? {
                  gains: practiceSummary.gains,
                  unresolved: practiceSummary.unresolved,
                  one_line_note: practiceSummary.one_line_note || undefined
                }
              : undefined
        }
      })
      Taro.navigateTo({ url: `/pages/result/index?id=${data.match_id}` })
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '提交失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="container">
      <View className="heroCard">
        <View className="accentLine" />
        <View style={{ marginTop: '12px' }}>
          <View className="titleRow">
            <View className="tennisBall" />
            <View className="pageTitle">记录类型</View>
          </View>
          <View className="pageSubtitle">选择记录比赛或练习，填写关键信息</View>
        </View>

        <View style={{ marginTop: '12px' }}>
          <View className="row" style={{ gap: '10px' }}>
            <Button
              variant={recordType === 'match' ? 'default' : 'ghost'}
              onClick={() => switchRecordType('match')}
              style={{ flex: 1, padding: '12px 14px' }}
            >
              🏆 记录比赛
            </Button>
            <Button
              variant={recordType === 'practice' ? 'default' : 'ghost'}
              onClick={() => switchRecordType('practice')}
              style={{ flex: 1, padding: '12px 14px' }}
            >
              🎾 记录练习
            </Button>
          </View>
        </View>
        {recordType === 'practice' ? null : (
          <View style={{ marginTop: '10px' }}>
            <View className="segmented">
              <Button
                size="sm"
                variant="ghost"
                className={`${mode === 'singles' ? 'segItem segActive' : 'segItem'}`}
                onClick={() => switchMode('singles')}
              >
                单打
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`${mode === 'doubles' ? 'segItem segActive' : 'segItem'}`}
                onClick={() => switchMode('doubles')}
              >
                双打
              </Button>
            </View>
            <View className="hintText" style={{ marginTop: '8px' }}>切换会清空对手与搭档信息</View>
          </View>
        )}
      </View>

      {recordType === 'practice' ? null : (
        <View className="section">
          <View className="fieldLabel">比分记录</View>
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View className="formSection" style={{ marginTop: 0 }}>
                <View className="fieldLabelTight">比赛日期</View>
                <Picker mode="date" onChange={(e: any) => setMatchDate(e.detail.value)}>
                  <View className="input inputDisplay">
                    {matchDate || '选择日期'}
                  </View>
                </Picker>
              </View>
              <View className="hintText" style={{ marginTop: '10px' }}>
                需要填写至少 1 盘比分，才能生成 AI 分析
              </View>
              <View className="scoreHelp">操作提示：点数字选择比分（0–7），最多 5 局。</View>
              <View className="divider" />
              {sets.map((s, idx) => (
                <View key={idx} className="scoreRow">
                  <View className="scoreBadge">第 {idx + 1} 局</View>
                  <Picker
                    mode="selector"
                    range={SCORE_RANGE}
                    value={s.score_self}
                    onChange={(e: any) => {
                      const v = Number(e.detail.value)
                      setSets(prev => prev.map((x, i) => (i === idx ? { ...x, score_self: v } : x)))
                    }}
                  >
                    <View className="scorePick">
                      <View className="scorePickInner">
                        <View className="pill">我</View>
                        <View className="scorePickValue">{s.score_self}</View>
                      </View>
                    </View>
                  </Picker>
                  <View className="mutedText">:</View>
                  <Picker
                    mode="selector"
                    range={SCORE_RANGE}
                    value={s.score_opponent}
                    onChange={(e: any) => {
                      const v = Number(e.detail.value)
                      setSets(prev => prev.map((x, i) => (i === idx ? { ...x, score_opponent: v } : x)))
                    }}
                  >
                    <View className="scorePick">
                      <View className="scorePickInner">
                        <View className="pill">对</View>
                        <View className="scorePickValue">{s.score_opponent}</View>
                      </View>
                    </View>
                  </Picker>
                  <IconButton
                    icon="delete"
                    variant="secondary"
                    disabled={sets.length <= 1}
                    onClick={() => setSets(prev => prev.filter((_, i) => i !== idx))}
                  />
                </View>
              ))}

              <View className="scoreActions">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={sets.length >= 5}
                  onClick={() => setSets(prev => [...prev, { score_self: 0, score_opponent: 0 }])}
                >
                  + 增加一局
                </Button>
                <View className="row" style={{ gap: '8px' }}>
                  <View className="scoreTotalPill">大比分 {totals.self}:{totals.opp}</View>
                  {matchResultDerived ? <View className={matchResultPillClass}>{matchResultLabel}</View> : null}
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      <View className="section">
        {recordType === 'practice' ? null : (
          <OpponentInfoCard mode={mode} value={opponents} onChange={setOpponents} onClear={() => setOpponents([emptyOpponent(), emptyOpponent()])} />
        )}
      </View>

      <View className="section">
        <MyInfoCard
          mode={mode}
          editableMe={false}
          onEditMe={() => {
            Taro.setStorageSync('MY_OPEN_EDIT_PLAYINFO', '1')
            Taro.setStorageSync('MY_EDIT_RETURN_TO_RECORD', '1')
            Taro.switchTab({ url: '/pages/insight/index' })
          }}
          myInfo={myInfo}
          setMyInfo={setMyInfo}
          myCourtPreference={myCourtPreference}
          setMyCourtPreference={setMyCourtPreference}
          partner={partner}
          setPartner={setPartner}
          onClearMy={() =>
            setMyInfo({
              play_style: undefined,
              main_weapons: [],
              weaknesses: [],
              mobility: [],
              clutch_state: undefined,
              physical_state: undefined
            })
          }
          onClearPartner={() => setPartner(emptyPartner())}
        />
      </View>

      <View className="section">
        <View className="fieldLabel">{recordType === 'practice' ? '练习条件（可选）' : '比赛条件（可选）'}</View>
        {recordType === 'practice' ? (
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View className="stack" style={{ gap: '12px' }}>
                <View>
                  <View className="fieldLabelTight">场地</View>
                  <View className="chipRow" style={{ marginTop: '10px' }}>
                    {MATCH_CONDITIONS.surface.map((v, idx) => (
                      <Button
                        key={v}
                        size="sm"
                        variant="ghost"
                        className={`${idx === surfaceIndex ? 'chip chipActive' : 'chip'}`}
                        onClick={() => setSurfaceIndex(idx)}
                      >
                        {MATCH_CONDITION_LABELS.surface[v]}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`${surfaceIndex === -1 ? 'chip chipActive' : 'chip'}`}
                      onClick={() => setSurfaceIndex(-1)}
                    >
                      不填
                    </Button>
                  </View>
                  <View className="hintText" style={{ marginTop: '8px' }}>
                    {surfaceIndex >= 0 ? MATCH_CONDITION_HELP.surface[MATCH_CONDITIONS.surface[surfaceIndex]] : '不填：这场不记录场地'}
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {recordType === 'practice' ? null : (
        <AdvancedModeCollapse
          title="展开高级模式（条件 / 总结标签）"
          hint="不填也能提交，AI 会按基础信息出简版分析"
        >
          <View className="section" style={{ marginTop: 0 }}>
            <View className="fieldLabel">比赛条件（可选）</View>
            <View className="card bigCard glassCard">
              <View className="cardInner">
                <View className="stack" style={{ gap: '12px' }}>
                  <View>
                    <View className="fieldLabelTight">场地</View>
                    <View className="chipRow" style={{ marginTop: '10px' }}>
                      {MATCH_CONDITIONS.surface.map((v, idx) => (
                        <Button
                          key={v}
                          size="sm"
                          variant="ghost"
                          className={`${idx === surfaceIndex ? 'chip chipActive' : 'chip'}`}
                          onClick={() => setSurfaceIndex(idx)}
                        >
                          {MATCH_CONDITION_LABELS.surface[v]}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`${surfaceIndex === -1 ? 'chip chipActive' : 'chip'}`}
                        onClick={() => setSurfaceIndex(-1)}
                      >
                        不填
                      </Button>
                    </View>
                    <View className="hintText" style={{ marginTop: '8px' }}>
                      {surfaceIndex >= 0 ? MATCH_CONDITION_HELP.surface[MATCH_CONDITIONS.surface[surfaceIndex]] : '不填：这场不记录场地'}
                    </View>
                  </View>

                  <View>
                    <View className="fieldLabelTight">天气</View>
                    <View className="chipRow" style={{ marginTop: '10px' }}>
                      {MATCH_CONDITIONS.weather.map((v, idx) => (
                        <Button
                          key={v}
                          size="sm"
                          variant="ghost"
                          className={`${idx === weatherIndex ? 'chip chipActive' : 'chip'}`}
                          onClick={() => setWeatherIndex(idx)}
                        >
                          {MATCH_CONDITION_LABELS.weather[v]}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`${weatherIndex === -1 ? 'chip chipActive' : 'chip'}`}
                        onClick={() => setWeatherIndex(-1)}
                      >
                        不填
                      </Button>
                    </View>
                    <View className="hintText" style={{ marginTop: '8px' }}>
                      {weatherIndex >= 0 ? MATCH_CONDITION_HELP.weather[MATCH_CONDITIONS.weather[weatherIndex]] : '不填：这场不记录天气'}
                    </View>
                  </View>

                  <View>
                    <View className="fieldLabelTight">我的身体状态</View>
                    <View className="chipRow" style={{ marginTop: '10px' }}>
                      {MY_PHYSICAL_STATE.map((item, idx) => (
                        <Button
                          key={item.value}
                          size="sm"
                          variant="ghost"
                          className={`${idx === physicalIndex ? 'chip chipActive' : 'chip'}`}
                          onClick={() => {
                            const nextIdx = idx === physicalIndex ? -1 : idx
                            setPhysicalIndex(nextIdx)
                            const val = nextIdx === -1 ? undefined : item.value
                            setMyInfo(prev => ({ ...prev, physical_state: val }))
                          }}
                        >
                          {item.label}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`${physicalIndex === -1 ? 'chip chipActive' : 'chip'}`}
                        onClick={() => {
                          setPhysicalIndex(-1)
                          setMyInfo(prev => ({ ...prev, physical_state: undefined }))
                        }}
                      >
                        不填
                      </Button>
                    </View>
                    <View className="hintText" style={{ marginTop: '8px' }}>
                      {physicalIndex >= 0
                        ? MATCH_CONDITION_HELP.physical_state[MATCH_CONDITIONS.physical_state[physicalIndex]]
                        : '不填：这场不记录身体状态'}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View className="section">
            <View className="fieldLabel">赛后快速总结</View>
            <View className="card bigCard glassCard">
              <View className="cardInner">
                <View className="rowBetween" style={{ marginBottom: '12px' }}>
                  <View className="hintText">总结关键点，让 AI 分析更准</View>
                  <IconButton
                    icon="clear"
                    variant="secondary"
                    onClick={() => {
                      setPostMatchSummary({
                        scoring_methods: [],
                        losing_reasons: [],
                        key_point_error_reasons: [],
                        coordination_issues: [],
                        one_line_summary: ''
                      })
                    }}
                  />
                </View>

                {mode === 'doubles' ? (
                  <View style={{ marginBottom: '12px' }}>
                    <CoordinationIssuesTag value={postMatchSummary.coordination_issues} onChange={(v) => setPostMatchSummary(prev => ({ ...prev, coordination_issues: v }))} />
                  </View>
                ) : null}

                <View style={{ marginBottom: '12px' }}>
                  <View className="tagGroupTitle">得分方式（最多选3个）</View>
                  <View className="chipRow" style={{ marginTop: '10px' }}>
                    {SCORING_METHODS.map(item => (
                      <Button
                        key={item.value}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newArr = postMatchSummary.scoring_methods.includes(item.value)
                            ? postMatchSummary.scoring_methods.filter(v => v !== item.value)
                            : postMatchSummary.scoring_methods.length < 3
                              ? [...postMatchSummary.scoring_methods, item.value]
                              : postMatchSummary.scoring_methods
                          setPostMatchSummary(prev => ({ ...prev, scoring_methods: newArr }))
                        }}
                        className={`${postMatchSummary.scoring_methods.includes(item.value) ? 'chip chipActive' : 'chip'}`}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </View>
                </View>

                <View style={{ marginBottom: '12px' }}>
                  <View className="tagGroupTitle">丢分原因（最多选3个）</View>
                  <View className="chipRow" style={{ marginTop: '10px' }}>
                    {LOSING_REASONS.map(item => (
                      <Button
                        key={item.value}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newArr = postMatchSummary.losing_reasons.includes(item.value)
                            ? postMatchSummary.losing_reasons.filter(v => v !== item.value)
                            : postMatchSummary.losing_reasons.length < 3
                              ? [...postMatchSummary.losing_reasons, item.value]
                              : postMatchSummary.losing_reasons
                          setPostMatchSummary(prev => ({ ...prev, losing_reasons: newArr }))
                        }}
                        className={`${postMatchSummary.losing_reasons.includes(item.value) ? 'chip chipActive' : 'chip'}`}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </View>
                </View>

                <View style={{ marginBottom: '12px' }}>
                  <View className="tagGroupTitle">关键分失误原因（最多选2个）</View>
                  <View className="chipRow" style={{ marginTop: '10px' }}>
                    {KEY_POINT_ERROR_REASONS.map(item => (
                      <Button
                        key={item.value}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newArr = postMatchSummary.key_point_error_reasons.includes(item.value)
                            ? postMatchSummary.key_point_error_reasons.filter(v => v !== item.value)
                            : postMatchSummary.key_point_error_reasons.length < 2
                              ? [...postMatchSummary.key_point_error_reasons, item.value]
                              : postMatchSummary.key_point_error_reasons
                          setPostMatchSummary(prev => ({ ...prev, key_point_error_reasons: newArr }))
                        }}
                        className={`${postMatchSummary.key_point_error_reasons.includes(item.value) ? 'chip chipActive' : 'chip'}`}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </View>
                </View>

                <Textarea
                  value={postMatchSummary.one_line_summary}
                  onInput={(e: any) => setPostMatchSummary(prev => ({ ...prev, one_line_summary: e.detail.value }))}
                  maxlength={200}
                  placeholder="用一句话总结这场比赛，例如：正手发挥稳定，反手失误太多..."
                  className="textarea"
                />
              </View>
            </View>
          </View>
        </AdvancedModeCollapse>
      )}

      {recordType === 'practice' ? (
        <View className="section">
          <View className="fieldLabel">练习信息</View>
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View className="formSection" style={{ marginTop: 0 }}>
                <View className="fieldLabelTight">练习日期</View>
                <Picker mode="date" onChange={(e: any) => setPracticeInfo(prev => ({ ...prev, date_time: e.detail.value }))}>
                  <View className="input inputDisplay">
                    {practiceInfo.date_time || '选择日期'}
                  </View>
                </Picker>
              </View>

              <View style={{ marginTop: '12px' }}>
                <View className="tagGroupTitle">练习时长</View>
                <View className="chipRow" style={{ marginTop: '10px' }}>
                  {PRACTICE_DURATIONS.map(item => (
                    <Button
                      key={item.value}
                      size="sm"
                      variant="ghost"
                      onClick={() => setPracticeInfo(prev => ({ ...prev, duration: item.value === prev.duration ? '' : item.value }))}
                      className={`${practiceInfo.duration === item.value ? 'chip chipActive' : 'chip'}`}
                    >
                      {item.label}
                    </Button>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: '12px' }}>
                <View className="tagGroupTitle">练习类型</View>
                <View className="chipRow" style={{ marginTop: '10px' }}>
                  {PRACTICE_TYPES.map(item => (
                    <Button
                      key={item.value}
                      size="sm"
                      variant="ghost"
                      onClick={() => setPracticeInfo(prev => ({ ...prev, practice_type: item.value === prev.practice_type ? '' : item.value }))}
                      className={`${practiceInfo.practice_type === item.value ? 'chip chipActive' : 'chip'}`}
                    >
                      {item.label}
                    </Button>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: '12px' }}>
                <View className="tagGroupTitle">练习重点（最多选3个）</View>
                <View className="chipRow" style={{ marginTop: '10px' }}>
                  {PRACTICE_FOCUS.map(item => (
                    <Button
                      key={item.value}
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const arr = practiceInfo.focus_areas.includes(item.value)
                          ? practiceInfo.focus_areas.filter(v => v !== item.value)
                          : practiceInfo.focus_areas.length < 3
                            ? [...practiceInfo.focus_areas, item.value]
                            : practiceInfo.focus_areas
                        setPracticeInfo(prev => ({ ...prev, focus_areas: arr }))
                      }}
                      className={`${practiceInfo.focus_areas.includes(item.value) ? 'chip chipActive' : 'chip'}`}
                    >
                      {item.label}
                    </Button>
                  ))}
                </View>
              </View>

              <View className="formSection" style={{ marginTop: '12px' }}>
                <View className="fieldLabelTight">练习伙伴（选填）</View>
                <PartnerSearchInput
                  value={practiceInfo.practice_partner_nickname}
                  onChange={(v) => setPracticeInfo(prev => ({ ...prev, practice_partner_nickname: v, practice_partner_id: '' }))}
                  onSelect={(item) => setPracticeInfo(prev => ({ ...prev, practice_partner_nickname: item.nickname, practice_partner_id: item.id }))}
                />
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {recordType === 'practice' ? (
        <View className="section">
          <View className="fieldLabel">练习总结</View>
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ marginBottom: '12px' }}>
                <View className="tagGroupTitle">今天的收获（最多选3个）</View>
                <View className="chipRow" style={{ marginTop: '10px' }}>
                  {PRACTICE_GAINS.map(item => (
                    <Button
                      key={item.value}
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const arr = practiceSummary.gains.includes(item.value)
                          ? practiceSummary.gains.filter(v => v !== item.value)
                          : practiceSummary.gains.length < 3
                            ? [...practiceSummary.gains, item.value]
                            : practiceSummary.gains
                        setPracticeSummary(prev => ({ ...prev, gains: arr }))
                      }}
                      className={`${practiceSummary.gains.includes(item.value) ? 'chip chipActive' : 'chip'}`}
                    >
                      {item.label}
                    </Button>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: '12px' }}>
                <View className="tagGroupTitle">还没解决的（最多选3个）</View>
                <View className="chipRow" style={{ marginTop: '10px' }}>
                  {PRACTICE_ISSUES.map(item => (
                    <Button
                      key={item.value}
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const arr = practiceSummary.unresolved.includes(item.value)
                          ? practiceSummary.unresolved.filter(v => v !== item.value)
                          : practiceSummary.unresolved.length < 3
                            ? [...practiceSummary.unresolved, item.value]
                            : practiceSummary.unresolved
                        setPracticeSummary(prev => ({ ...prev, unresolved: arr }))
                      }}
                      className={`${practiceSummary.unresolved.includes(item.value) ? 'chip chipActive' : 'chip'}`}
                    >
                      {item.label}
                    </Button>
                  ))}
                </View>
              </View>

              <Textarea
                value={practiceSummary.one_line_note}
                onInput={(e: any) => setPracticeSummary(prev => ({ ...prev, one_line_note: e.detail.value }))}
                maxlength={200}
                placeholder="今天练球最大的感受…"
                className="textarea"
              />
            </View>
          </View>
        </View>
      ) : null}

      <View className="section">
        {!online ? (
          <View className="card bigCard glassCard" style={{ marginBottom: '12px' }}>
            <View className="cardInner">
              <Status type="offline" message="当前离线，无法提交生成 AI 分析" />
            </View>
          </View>
        ) : null}
        <Button loading={submitting} disabled={submitting || !analysisGate.ready || !online} variant="default" onClick={submit}>
          {submitting ? 'AI 分析生成中…' : '提交并生成 AI 分析'}
        </Button>
        {!analysisGate.ready ? <View className="hintText" style={{ marginTop: '10px' }}>{`还需填写：${analysisGate.missing.join('、')}`}</View> : null}
      </View>
    </View>
  )
}
