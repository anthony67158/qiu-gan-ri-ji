import { View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import { COURT_PREFERENCES, MY_CLUTCH_STATE, MY_MAIN_WEAPONS, MY_MOBILITY, MY_PHYSICAL_STATE, MY_PLAY_STYLES, MY_WEAKNESSES } from '../constants'
import PartnerSearchInput, { PartnerSearchItem } from './PartnerSearchInput'
import { useMyPlayInfo } from '../hooks/useMyPlayInfo'
import Button from '@/components/ui/button'
import IconButton from '@/components/ui/icon-button'

export type MyInfoForm = {
  play_style?: string
  main_weapons: string[]
  weaknesses: string[]
  mobility: string[]
  clutch_state?: string
  physical_state?: string
}

export type PartnerForm = {
  id?: string
  nickname: string
  play_style?: string
  main_weapons: string[]
  weaknesses: string[]
  court_preference?: 'ad_court' | 'deuce_court' | 'flexible'
  physical_state?: string
}

function nextLimitedMulti(arr: string[], value: string, max: number) {
  if (arr.includes(value)) return arr.filter(v => v !== value)
  if (arr.length >= max) return arr
  return [...arr, value]
}

export default function MyInfoCard(props: {
  mode: 'singles' | 'doubles'
  editableMe?: boolean
  onEditMe?: () => void
  myInfo: MyInfoForm
  setMyInfo: (v: MyInfoForm) => void
  myCourtPreference?: 'ad_court' | 'deuce_court' | 'flexible'
  setMyCourtPreference?: (v: 'ad_court' | 'deuce_court' | 'flexible' | undefined) => void
  partner?: PartnerForm
  setPartner?: (v: PartnerForm) => void
  onClearMy: () => void
  onClearPartner: () => void
}) {
  const [open, setOpen] = useState<'me' | 'partner'>('me')
  const [bodyOpen, setBodyOpen] = useState(false)
  const { playInfo, loaded, updateField } = useMyPlayInfo()
  const editableMe = props.editableMe !== false

  useEffect(() => {
    if (!loaded) return
    if (playInfo) {
      props.setMyInfo({
        play_style: playInfo.play_style,
        main_weapons: playInfo.main_weapons || [],
        weaknesses: playInfo.weaknesses || [],
        mobility: playInfo.mobility || [],
        clutch_state: playInfo.clutch_state,
        physical_state: props.myInfo.physical_state
      })
    }
  }, [loaded, playInfo])

  const setField = (field: keyof MyInfoForm, value: any) => {
    if (!editableMe && field !== 'physical_state') return
    const next = { ...props.myInfo, [field]: value }
    props.setMyInfo(next)
    if (field !== 'physical_state') {
      updateField(field as any, value)
    }
  }

  const applyPartnerItem = (item: PartnerSearchItem) => {
    if (!props.partner || !props.setPartner) return
    props.setPartner({
      id: item.id,
      nickname: item.nickname,
      play_style: (item.play_style || undefined) as any,
      main_weapons: item.main_weapons || [],
      weaknesses: item.weaknesses || [],
      court_preference: (item.court_preference || undefined) as any,
      physical_state: (item.physical_state || undefined) as any
    })
  }

  return (
    <View className="card bigCard glassCard">
      <View className="cardInner">
        <View className="rowBetween" style={{ marginBottom: '12px' }}>
          <View>
            <View className="fieldLabelTight">我的信息</View>
            {editableMe ? (
              <View className="hintText">{props.mode === 'doubles' ? '双打会同时记录搭档信息' : '你的个人比赛信息'}</View>
            ) : null}
          </View>
          {editableMe ? (
            <IconButton icon="clear" variant="secondary" onClick={props.onClearMy} />
          ) : (
            <IconButton icon="edit" variant="ghost" onClick={() => props.onEditMe?.()} />
          )}
        </View>

        {props.mode === 'doubles' ? (
          <View className="row" style={{ gap: '10px', marginBottom: '10px' }}>
            <Button
              size="sm"
              variant={open === 'me' ? 'default' : 'ghost'}
              onClick={() => setOpen('me')}
              style={{ flex: 1 }}
            >
              我
            </Button>
            <Button
              size="sm"
              variant={open === 'partner' ? 'default' : 'ghost'}
              onClick={() => setOpen('partner')}
              style={{ flex: 1 }}
            >
              搭档
            </Button>
          </View>
        ) : null}

        {props.mode === 'singles' || open === 'me' ? (
          <View>
            {!editableMe ? (
              <View className="card" style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', marginBottom: '12px' }}>
                <View className="stack" style={{ gap: '6px' }}>
                  <View className="hintText">{`比赛风格：${props.myInfo.play_style ? (MY_PLAY_STYLES.find(x => x.value === props.myInfo.play_style)?.label || props.myInfo.play_style) : '未填写'}`}</View>
                  <View className="hintText">{`主要武器：${props.myInfo.main_weapons?.length ? props.myInfo.main_weapons.map(v => MY_MAIN_WEAPONS.find(x => x.value === v)?.label || v).join('、') : '未填写'}`}</View>
                  <View className="hintText">{`主要短板：${props.myInfo.weaknesses?.length ? props.myInfo.weaknesses.map(v => MY_WEAKNESSES.find(x => x.value === v)?.label || v).join('、') : '未填写'}`}</View>
                  <View className="hintText">{`移动体能：${props.myInfo.mobility?.length ? props.myInfo.mobility.map(v => MY_MOBILITY.find(x => x.value === v)?.label || v).join('、') : '未填写'}`}</View>
                  <View className="hintText">{`关键分状态：${props.myInfo.clutch_state ? (MY_CLUTCH_STATE.find(x => x.value === props.myInfo.clutch_state)?.label || props.myInfo.clutch_state) : '未填写'}`}</View>
                </View>
                <View className="hintText" style={{ marginTop: '10px', lineHeight: '20px' }}>
                  身体状态是每场单独填写（在“比赛条件”里选）
                </View>
              </View>
            ) : (
              <View className="advancedCollapse" style={{ marginTop: '4px' }}>
                <View
                  className="advancedCollapseHeader"
                  hoverClass="advancedCollapseHeaderHover"
                  onClick={() => setBodyOpen(v => !v)}
                >
                  <View className="advancedCollapseTitleWrap">
                    <View className="advancedCollapseTitle">展开我的画像（风格 / 武器 / 短板）</View>
                    <View className="advancedCollapseHint">不填也行，AI 会按昵称给通用建议</View>
                  </View>
                  <View className="advancedCollapseChevron">{bodyOpen ? '收起 ▲' : '展开 ▼'}</View>
                </View>
                {bodyOpen ? (
                  <View className="advancedCollapseBody">
                {props.mode === 'doubles' ? (
                  <View style={{ marginBottom: '12px' }}>
                    <View className="tagGroupTitle">我的站位偏好</View>
                    <View className="chipRow" style={{ marginTop: '10px' }}>
                      {COURT_PREFERENCES.map(item => (
                        <Button
                          key={item.value}
                          size="sm"
                          variant="ghost"
                          onClick={() => props.setMyCourtPreference?.(item.value === props.myCourtPreference ? undefined : item.value)}
                          className={`${props.myCourtPreference === item.value ? 'chip chipActive' : 'chip'}`}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={{ marginBottom: '12px' }}>
                  <View className="tagGroupTitle">我的比赛风格</View>
                  <View className="chipRow" style={{ marginTop: '10px' }}>
                    {MY_PLAY_STYLES.map(item => (
                      <Button
                        key={item.value}
                        size="sm"
                        variant="ghost"
                        onClick={() => setField('play_style', item.value === props.myInfo.play_style ? undefined : item.value)}
                        className={`${props.myInfo.play_style === item.value ? 'chip chipActive' : 'chip'}`}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </View>
                </View>

                <View style={{ marginBottom: '12px' }}>
                  <View className="tagGroupTitle">我的主要武器（最多选2个）</View>
                  <View className="chipRow" style={{ marginTop: '10px' }}>
                    {MY_MAIN_WEAPONS.map(item => (
                      <Button
                        key={item.value}
                        size="sm"
                        variant="ghost"
                        onClick={() => setField('main_weapons', nextLimitedMulti(props.myInfo.main_weapons, item.value, 2))}
                        className={`${props.myInfo.main_weapons.includes(item.value) ? 'chip chipActive' : 'chip'}`}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </View>
                </View>

                <View style={{ marginBottom: '12px' }}>
                  <View className="tagGroupTitle">我的主要短板（最多选2个）</View>
                  <View className="chipRow" style={{ marginTop: '10px' }}>
                    {MY_WEAKNESSES.map(item => (
                      <Button
                        key={item.value}
                        size="sm"
                        variant="ghost"
                        onClick={() => setField('weaknesses', nextLimitedMulti(props.myInfo.weaknesses, item.value, 2))}
                        className={`${props.myInfo.weaknesses.includes(item.value) ? 'chip chipActive' : 'chip'}`}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </View>
                </View>

                <View style={{ marginBottom: '12px' }}>
                  <View className="tagGroupTitle">我的移动体能（最多选2个）</View>
                  <View className="chipRow" style={{ marginTop: '10px' }}>
                    {MY_MOBILITY.map(item => (
                      <Button
                        key={item.value}
                        size="sm"
                        variant="ghost"
                        onClick={() => setField('mobility', nextLimitedMulti(props.myInfo.mobility, item.value, 2))}
                        className={`${props.myInfo.mobility.includes(item.value) ? 'chip chipActive' : 'chip'}`}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </View>
                </View>

                <View style={{ marginBottom: '12px' }}>
                  <View className="tagGroupTitle">我的关键分状态</View>
                  <View className="chipRow" style={{ marginTop: '10px' }}>
                    {MY_CLUTCH_STATE.map(item => (
                      <Button
                        key={item.value}
                        size="sm"
                        variant="ghost"
                        onClick={() => setField('clutch_state', item.value === props.myInfo.clutch_state ? undefined : item.value)}
                        className={`${props.myInfo.clutch_state === item.value ? 'chip chipActive' : 'chip'}`}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </View>
                </View>

                {/* 身体状态移至"比赛/练习条件"卡片 */}
                  </View>
                ) : null}
              </View>
            )}
          </View>
        ) : null}

        {props.mode === 'doubles' && open === 'partner' ? (
          <View>
            <View className="rowBetween" style={{ marginBottom: '12px' }}>
              <View style={{ fontWeight: 900 }}>搭档信息</View>
              <IconButton icon="clear" variant="secondary" onClick={props.onClearPartner} />
            </View>

            <View className="formSection" style={{ marginTop: 0 }}>
              <View className="fieldLabelTight">搭档昵称</View>
              <PartnerSearchInput
                value={props.partner?.nickname || ''}
                onChange={(v) => props.setPartner?.({ ...(props.partner as any), nickname: v, id: undefined })}
                onSelect={applyPartnerItem}
              />
            </View>

            <View style={{ marginTop: '12px' }}>
              <View className="tagGroupTitle">搭档比赛风格</View>
              <View className="chipRow" style={{ marginTop: '10px' }}>
                {MY_PLAY_STYLES.map(item => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant="ghost"
                    onClick={() => props.setPartner?.({ ...(props.partner as any), play_style: item.value === props.partner?.play_style ? undefined : item.value })}
                    className={`${props.partner?.play_style === item.value ? 'chip chipActive' : 'chip'}`}
                  >
                    {item.label}
                  </Button>
                ))}
              </View>
            </View>

            <View style={{ marginTop: '12px' }}>
              <View className="tagGroupTitle">搭档主要武器（最多选2个）</View>
              <View className="chipRow" style={{ marginTop: '10px' }}>
                {MY_MAIN_WEAPONS.map(item => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      props.setPartner?.({
                        ...(props.partner as any),
                        main_weapons: nextLimitedMulti(props.partner?.main_weapons || [], item.value, 2)
                      })
                    }
                    className={`${(props.partner?.main_weapons || []).includes(item.value) ? 'chip chipActive' : 'chip'}`}
                  >
                    {item.label}
                  </Button>
                ))}
              </View>
            </View>

            <View style={{ marginTop: '12px' }}>
              <View className="tagGroupTitle">搭档主要短板（最多选2个）</View>
              <View className="chipRow" style={{ marginTop: '10px' }}>
                {MY_WEAKNESSES.map(item => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      props.setPartner?.({
                        ...(props.partner as any),
                        weaknesses: nextLimitedMulti(props.partner?.weaknesses || [], item.value, 2)
                      })
                    }
                    className={`${(props.partner?.weaknesses || []).includes(item.value) ? 'chip chipActive' : 'chip'}`}
                  >
                    {item.label}
                  </Button>
                ))}
              </View>
            </View>

            <View style={{ marginTop: '12px' }}>
              <View className="tagGroupTitle">搭档站位偏好</View>
              <View className="chipRow" style={{ marginTop: '10px' }}>
                {COURT_PREFERENCES.map(item => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant="ghost"
                    onClick={() => props.setPartner?.({ ...(props.partner as any), court_preference: item.value === props.partner?.court_preference ? undefined : item.value })}
                    className={`${props.partner?.court_preference === item.value ? 'chip chipActive' : 'chip'}`}
                  >
                    {item.label}
                  </Button>
                ))}
              </View>
            </View>

            <View style={{ marginTop: '12px' }}>
              <View className="tagGroupTitle">搭档身体状态</View>
              <View className="chipRow" style={{ marginTop: '10px' }}>
                {MY_PHYSICAL_STATE.map(item => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant="ghost"
                    onClick={() => props.setPartner?.({ ...(props.partner as any), physical_state: item.value === props.partner?.physical_state ? undefined : item.value })}
                    className={`${props.partner?.physical_state === item.value ? 'chip chipActive' : 'chip'}`}
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
