import { View } from '@tarojs/components'
import { useEffect, useMemo, useState } from 'react'
import {
  OPPONENT_CLUTCH_TENDENCY,
  OPPONENT_DOMINANT_HAND,
  OPPONENT_MAIN_WEAPONS,
  OPPONENT_MOBILITY,
  OPPONENT_PLAY_STYLES,
  OPPONENT_WEAKNESSES
} from '../constants'
import OpponentSearchInput, { OpponentSearchItem } from './OpponentSearchInput'
import { apiRequest } from '../services/api'
import Button from '@/components/ui/button'
import IconButton from '@/components/ui/icon-button'

export type OpponentTraitsForm = {
  play_style?: string
  dominant_hand?: string
  main_weapons: string[]
  weaknesses: string[]
  clutch_tendency?: string
  mobility: string[]
}

export type OpponentForm = {
  id?: string
  nickname: string
  traits: OpponentTraitsForm
}

function nextLimitedMulti(arr: string[], value: string, max: number) {
  if (arr.includes(value)) return arr.filter(v => v !== value)
  if (arr.length >= max) return arr
  return [...arr, value]
}

export default function OpponentInfoCard(props: {
  mode: 'singles' | 'doubles'
  value: OpponentForm[]
  onChange: (next: OpponentForm[]) => void
  onClear: () => void
}) {
  const count = props.mode === 'doubles' ? 2 : 1
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
  const opponents = useMemo(() => {
    const base = emptyOpponent()
    const arr = (props.value || []).slice(0, count)
    while (arr.length < count) arr.push(JSON.parse(JSON.stringify(base)))
    return arr
  }, [props.value, count])

  const [openIdx, setOpenIdx] = useState(0)
  const [frequent, setFrequent] = useState<any[]>([])
  // v4.1：对手画像字段（打法/惯用手/武器/漏洞/关键分/移动）默认折叠
  const [traitsOpen, setTraitsOpen] = useState(false)

  useEffect(() => {
    let canceled = false
    async function load() {
      try {
        const data = await apiRequest<{ items: any[] }>({ url: '/api/opponents?limit=3&offset=0' })
        if (canceled) return
        setFrequent(data.items || [])
      } catch {
        if (canceled) return
        setFrequent([])
      }
    }
    load()
    return () => {
      canceled = true
    }
  }, [])

  const setOpponent = (idx: number, patch: Partial<OpponentForm>) => {
    const next = opponents.map((o, i) => (i === idx ? { ...o, ...patch } : o))
    props.onChange(next)
  }

  const setTraits = (idx: number, patch: Partial<OpponentTraitsForm>) => {
    const next = opponents.map((o, i) => (i === idx ? { ...o, traits: { ...o.traits, ...patch } } : o))
    props.onChange(next)
  }

  const applySearchItem = (idx: number, item: OpponentSearchItem) => {
    const next = opponents.map((o, i) =>
      i === idx
        ? {
            ...o,
            id: item.id || undefined,
            nickname: item.opponent_name_alias,
            traits: {
              ...o.traits,
              play_style: (item.play_style || undefined) as any,
              dominant_hand: (item.dominant_hand || undefined) as any,
              main_weapons: item.main_weapons || [],
              weaknesses: item.weaknesses || [],
              clutch_tendency: (item.clutch_tendency || undefined) as any,
              mobility: item.mobility || []
            }
          }
        : o
    )
    props.onChange(next)
  }

  const applyProfile = (idx: number, item: any) => {
    const next = opponents.map((o, i) =>
      i === idx
        ? {
            ...o,
            id: item.id || undefined,
            nickname: item.opponent_name_alias || '',
            traits: {
              ...o.traits,
              play_style: item.play_style || undefined,
              dominant_hand: item.dominant_hand || undefined,
              main_weapons: item.main_weapons || [],
              weaknesses: item.weaknesses || [],
              clutch_tendency: item.clutch_tendency || undefined,
              mobility: item.mobility || []
            }
          }
        : o
    )
    props.onChange(next)
  }

  const clearCurrent = () => {
    if (props.mode !== 'doubles') return props.onClear()
    const next = opponents.map((o, i) => (i === openIdx ? emptyOpponent() : o))
    props.onChange(next)
  }

  const renderForm = (idx: number) => {
    const o = opponents[idx]
    return (
      <View>
        {frequent.length ? (
          <View style={{ marginBottom: '12px' }}>
            <View className="tagGroupTitle">常打对手</View>
            <View className="chipRow" style={{ marginTop: '10px' }}>
              {frequent.map(it => (
                <Button
                  key={it.id}
                  size="sm"
                  variant="ghost"
                  className="chip"
                  onClick={() => {
                    applyProfile(idx, it)
                  }}
                >
                  {it.opponent_name_alias}
                </Button>
              ))}
            </View>
          </View>
        ) : null}

        <View className="formSection" style={{ marginTop: 0 }}>
          <View className="fieldLabelTight">昵称</View>
          <OpponentSearchInput value={o.nickname} onChange={(v) => setOpponent(idx, { nickname: v, id: undefined })} onSelect={(item) => applySearchItem(idx, item)} />
        </View>

        <View
          className="advancedCollapse"
          style={{ marginTop: '12px' }}
        >
          <View
            className="advancedCollapseHeader"
            hoverClass="advancedCollapseHeaderHover"
            onClick={() => setTraitsOpen(v => !v)}
          >
            <View className="advancedCollapseTitleWrap">
              <View className="advancedCollapseTitle">展开对手画像（打法 / 武器 / 漏洞）</View>
              <View className="advancedCollapseHint">不填也行，AI 会按昵称给通用建议</View>
            </View>
            <View className="advancedCollapseChevron">{traitsOpen ? '收起 ▲' : '展开 ▼'}</View>
          </View>
          {traitsOpen ? (
            <View className="advancedCollapseBody">
        <View style={{ marginTop: '12px' }}>
          <View className="tagGroupTitle">打法类型</View>
          <View className="chipRow" style={{ marginTop: '10px' }}>
            {OPPONENT_PLAY_STYLES.map(item => (
              <Button
                key={item.value}
                size="sm"
                variant="ghost"
                onClick={() => setTraits(idx, { play_style: item.value === o.traits.play_style ? undefined : item.value })}
                className={`${o.traits.play_style === item.value ? 'chip chipActive' : 'chip'}`}
              >
                {item.label}
              </Button>
            ))}
          </View>
        </View>

        <View style={{ marginTop: '12px' }}>
          <View className="tagGroupTitle">惯用手</View>
          <View className="chipRow" style={{ marginTop: '10px' }}>
            {OPPONENT_DOMINANT_HAND.map(item => (
              <Button
                key={item.value}
                size="sm"
                variant="ghost"
                onClick={() => setTraits(idx, { dominant_hand: item.value === o.traits.dominant_hand ? undefined : item.value })}
                className={`${o.traits.dominant_hand === item.value ? 'chip chipActive' : 'chip'}`}
              >
                {item.label}
              </Button>
            ))}
          </View>
        </View>

        <View style={{ marginTop: '12px' }}>
          <View className="tagGroupTitle">主要武器（最多选2个）</View>
          <View className="chipRow" style={{ marginTop: '10px' }}>
            {OPPONENT_MAIN_WEAPONS.map(item => (
              <Button
                key={item.value}
                size="sm"
                variant="ghost"
                onClick={() => setTraits(idx, { main_weapons: nextLimitedMulti(o.traits.main_weapons, item.value, 2) })}
                className={`${o.traits.main_weapons.includes(item.value) ? 'chip chipActive' : 'chip'}`}
              >
                {item.label}
              </Button>
            ))}
          </View>
        </View>

        <View style={{ marginTop: '12px' }}>
          <View className="tagGroupTitle">主要漏洞（最多选3个）</View>
          <View className="chipRow" style={{ marginTop: '10px' }}>
            {OPPONENT_WEAKNESSES.map(item => (
              <Button
                key={item.value}
                size="sm"
                variant="ghost"
                onClick={() => setTraits(idx, { weaknesses: nextLimitedMulti(o.traits.weaknesses, item.value, 3) })}
                className={`${o.traits.weaknesses.includes(item.value) ? 'chip chipActive' : 'chip'}`}
              >
                {item.label}
              </Button>
            ))}
          </View>
        </View>

        <View style={{ marginTop: '12px' }}>
          <View className="tagGroupTitle">关键分倾向</View>
          <View className="chipRow" style={{ marginTop: '10px' }}>
            {OPPONENT_CLUTCH_TENDENCY.map(item => (
              <Button
                key={item.value}
                size="sm"
                variant="ghost"
                onClick={() => setTraits(idx, { clutch_tendency: item.value === o.traits.clutch_tendency ? undefined : item.value })}
                className={`${o.traits.clutch_tendency === item.value ? 'chip chipActive' : 'chip'}`}
              >
                {item.label}
              </Button>
            ))}
          </View>
        </View>

        <View style={{ marginTop: '12px' }}>
          <View className="tagGroupTitle">移动体能（最多选2个）</View>
          <View className="chipRow" style={{ marginTop: '10px' }}>
            {OPPONENT_MOBILITY.map(item => (
              <Button
                key={item.value}
                size="sm"
                variant="ghost"
                onClick={() => setTraits(idx, { mobility: nextLimitedMulti(o.traits.mobility, item.value, 2) })}
                className={`${o.traits.mobility.includes(item.value) ? 'chip chipActive' : 'chip'}`}
              >
                {item.label}
              </Button>
            ))}
          </View>
        </View>
            </View>
          ) : null}
        </View>
      </View>
    )
  }

  return (
    <View className="card bigCard glassCard">
      <View className="cardInner">
        <View className="rowBetween" style={{ marginBottom: '12px' }}>
          <View>
            <View className="fieldLabelTight">对手信息</View>
            <View className="hintText">输入昵称搜索历史对手，自动回填特点</View>
          </View>
          <IconButton icon="clear" variant="secondary" onClick={clearCurrent} />
        </View>

        {props.mode === 'doubles' ? (
          <View className="row" style={{ gap: '10px', marginBottom: '12px' }}>
            {[0, 1].map(idx => (
              <Button
                key={idx}
                size="sm"
                variant={openIdx === idx ? 'default' : 'ghost'}
                className={openIdx === idx ? '' : ''}
                onClick={() => setOpenIdx(idx)}
                style={{ flex: 1, height: '36px', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <View style={{ fontWeight: 900 }}>{`对手 ${idx + 1}`}</View>
              </Button>
            ))}
          </View>
        ) : null}

        {props.mode === 'doubles' ? (
          <View className="hintText" style={{ marginBottom: '8px' }}>
            当前编辑：对手 {openIdx + 1}
            {opponents[openIdx]?.nickname ? `（${opponents[openIdx].nickname}）` : ''}
          </View>
        ) : null}

        {renderForm(props.mode === 'doubles' ? openIdx : 0)}
      </View>
    </View>
  )
}
