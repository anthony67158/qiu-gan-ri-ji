import { View, Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'
import { MATCH_CONDITION_HELP, MATCH_CONDITION_LABELS } from '../../constants'
import Button from '@/components/ui/button'
import Badge from '@/components/ui/badge'
import Status from '@/components/ui/Status'
import useNetworkStatus from '@/hooks/useNetworkStatus'
import { localizeText } from '@/utils/localize'

type MatchAnalysis = {
  overview: { rating: 'S' | 'A' | 'B' | 'C' | 'D'; rating_label: string; one_liner: string; tags: string[] }
  highlights: { title: string; items: Array<{ emoji: string; point: string; evidence: string }> }
  improvements: { title: string; items: Array<{ emoji: string; point: string; suggestion: string; priority: 'P0' | 'P1' | 'P2' }> }
  opponent_read: { title: string; summary: string; next_time_tip: string }
  coordination_eval?: { title: string; summary: string; drills: Array<{ name: string; description: string; duration: string; targets: string }> }
  homework: { title: string; drills: Array<{ name: string; description: string; duration: string; targets: string }> }
  next_match_tips?: { title: string; strategy: string; dos: string[]; donts: string[] }
}

function normalizeLines(text: string) {
  return String(text || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
}

function RenderTextBlock(props: { text: string }) {
  const lines = normalizeLines(props.text)
  if (lines.length === 0) return <View className="hintText">暂无</View>

  return (
    <View className="stack" style={{ gap: '8px' }}>
      {lines.map((raw, idx) => {
        const isBullet = /^[-•]\s+/.test(raw)
        const isOrdered = /^\d+[.)、]\s*/.test(raw)
        if (isBullet || isOrdered) {
          const content = raw.replace(/^[-•]\s+/, '').replace(/^\d+[.)、]\s*/, '')
          return (
            <View key={idx} className="bulletRow">
              <View className="bulletDot" />
              <View className="bulletText">{content}</View>
            </View>
          )
        }
        return (
          <View key={idx} className="paraText">
            {raw}
          </View>
        )
      })}
    </View>
  )
}

function BulletRow(props: { emoji: string; title: string; desc?: string; right?: string }) {
  return (
    <View className="rowBetween" style={{ gap: '12px' }}>
      <View style={{ display: 'flex', gap: '10px', flex: 1, minWidth: 0 }}>
        <View style={{ width: '22px', textAlign: 'center' }}>{props.emoji}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ fontWeight: 700 }}>{props.title}</View>
          {props.desc ? (
            <View className="hintText" style={{ marginTop: '4px' }}>
              {props.desc}
            </View>
          ) : null}
        </View>
      </View>
      {props.right ? <View className="pill pillNeutral">{props.right}</View> : null}
    </View>
  )
}

export default function ResultPage() {
  const router = Taro.getCurrentInstance().router
  const id = useMemo(() => (router?.params as any)?.id || '', [router?.params])
  const { online } = useNetworkStatus()

  const [match, setMatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sharing, setSharing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiRequest<{ match: any }>({ url: `/api/match/${id}` })
      setMatch(data.match)
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) load()
  }, [id])

  const submitClarification = async (selected_option: string) => {
    setSubmitting(true)
    try {
      const data = await apiRequest<{ match: any }>({
        url: `/api/match/${id}/clarification`,
        method: 'POST',
        data: { selected_option, skipped: false }
      })
      setMatch(data.match)
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '提交失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const skipClarification = async () => {
    setSubmitting(true)
    try {
      const data = await apiRequest<{ match: any }>({
        url: `/api/match/${id}/clarification`,
        method: 'POST',
        data: { skipped: true }
      })
      setMatch(data.match)
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '提交失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const regenerate = async () => {
    if (!match?.ai_clarification) {
      Taro.showToast({ title: '请先完成快问', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const data = await apiRequest<{ match: any }>({
        url: `/api/match/${id}/regenerate`,
        method: 'POST'
      })
      setMatch(data.match)
      Taro.showToast({ title: '已重新生成', icon: 'success' })
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '重新生成失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const generateShareImage = async () => {
    if (!match?.ai_feedback) return
    setSharing(true)
    try {
      const ctx = Taro.createCanvasContext('reportCanvas')
      const width = 300
      const height = 420
      ctx.setFillStyle('#0f141b')
      ctx.fillRect(0, 0, width, height)
      ctx.setFillStyle('#c7ff33')
      ctx.fillRect(0, 0, width, 6)

      ctx.setFillStyle('#e7eaee')
      ctx.setFontSize(16)
      ctx.fillText('球感日记 · 战报', 16, 32)

      ctx.setFillStyle('#8b95a5')
      ctx.setFontSize(12)
      ctx.fillText(`比分：${match.score_analysis?.score_summary || '未填写'}`, 16, 52)

      ctx.setFillStyle('#e7eaee')
      ctx.setFontSize(14)
      ctx.fillText('关键问题', 16, 82)
      ctx.setFillStyle('#cbd5e1')
      ctx.setFontSize(12)
      ctx.fillText((match.ai_feedback?.key_problem || '').slice(0, 40), 16, 102)

      ctx.setFillStyle('#e7eaee')
      ctx.setFontSize(14)
      ctx.fillText('下一场执行', 16, 142)
      ctx.setFillStyle('#cbd5e1')
      ctx.setFontSize(12)
      ctx.fillText((match.ai_feedback?.next_tactic || '').slice(0, 40), 16, 162)

      ctx.setFillStyle('#e7eaee')
      ctx.setFontSize(14)
      ctx.fillText('训练建议', 16, 202)
      ctx.setFillStyle('#cbd5e1')
      ctx.setFontSize(12)
      ctx.fillText((match.ai_feedback?.training_suggestion || '').slice(0, 40), 16, 222)

      ctx.setFillStyle('#7d8796')
      ctx.setFontSize(10)
      ctx.fillText('分享这张卡片给球友，下一场一起变强', 16, 392)

      ctx.draw(false, async () => {
        const res = await Taro.canvasToTempFilePath({
          canvasId: 'reportCanvas',
          width,
          height,
          destWidth: width * 2,
          destHeight: height * 2
        })
        await Taro.previewImage({ urls: [res.tempFilePath] })
      })
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '生成失败', icon: 'none' })
    } finally {
      setSharing(false)
    }
  }

  if (!id)
    return (
      <View className="container">
        <View className="emptyState">
          <Status type="error" message="缺少 match_id" />
        </View>
      </View>
    )
  if (loading)
    return (
      <View className="container">
        <View className="skeletonCard">
          <View className="rowBetween">
            <View className="skeleton skeletonLine" style={{ width: '34%' }} />
            <View className="skeleton skeletonLine" style={{ width: '18%' }} />
          </View>
          <View style={{ marginTop: '12px' }} className="skeleton skeletonLine" />
          <View style={{ marginTop: '10px' }} className="skeleton skeletonSmall" />
          <View style={{ marginTop: '10px' }} className="skeleton skeletonSmall" />
          <View style={{ marginTop: '16px' }} className="row">
            <View className="skeleton skeletonLine" style={{ width: '48%' }} />
            <View className="skeleton skeletonLine" style={{ width: '48%' }} />
          </View>
        </View>
      </View>
    )
  if (!match)
    return (
      <View className="container">
        <View className="emptyState">
          <Status type="empty" message="记录不存在" />
        </View>
      </View>
    )

  const clarification = match.ai_clarification
  const feedback = match.ai_feedback
  const analysis = (match?.ai_analysis?.match_analysis || null) as MatchAnalysis | null
  const conditions = match.match_conditions || null
  const isDoubles = String(match?.match_type || '').toLowerCase() === 'doubles'
  const clarificationDone = Boolean(clarification) && (Boolean((clarification as any)?.selected_option) || Boolean((clarification as any)?.skipped))
  const conditionPills = [
    conditions?.surface ? { key: 'surface', label: `场地：${(MATCH_CONDITION_LABELS.surface as any)[conditions.surface] || conditions.surface}`, help: (MATCH_CONDITION_HELP.surface as any)[conditions.surface] || '' } : null,
    conditions?.weather ? { key: 'weather', label: `天气：${(MATCH_CONDITION_LABELS.weather as any)[conditions.weather] || conditions.weather}`, help: (MATCH_CONDITION_HELP.weather as any)[conditions.weather] || '' } : null,
    conditions?.physical_state
      ? {
          key: 'physical',
          label: `身体：${(MATCH_CONDITION_LABELS.physical_state as any)[conditions.physical_state] || conditions.physical_state}`,
          help: (MATCH_CONDITION_HELP.physical_state as any)[conditions.physical_state] || ''
        }
      : null
  ].filter(Boolean) as Array<{ key: string; label: string; help: string }>

  const canRegenerate = online && !submitting && clarificationDone

  const post = (match as any)?.post_match_summary || {}
  const actionKey = localizeText((analysis as any)?.improvements?.items?.[0]?.point || feedback?.key_problem || (post?.losing_reasons?.[0] ? `主要问题：${post.losing_reasons[0]}` : '主要问题：未填写赛后总结'))
  const actionKeyDesc = localizeText((analysis as any)?.improvements?.items?.[0]?.suggestion || '')
  const actionTactic = localizeText((analysis as any)?.next_match_tips?.strategy || feedback?.next_tactic || (post?.scoring_methods?.[0] ? `下场优先：继续放大「${post.scoring_methods[0]}」` : '下场优先：先求稳再提速'))
  const actionDrill = localizeText(
    (analysis as any)?.homework?.drills?.[0]
      ? `${(analysis as any).homework.drills[0].name || '训练'}：${(analysis as any).homework.drills[0].description || ''}（${(analysis as any).homework.drills[0].duration || ''}）`
      : feedback?.training_suggestion ||
          (post?.key_point_error_reasons?.[0] ? `训练重点：针对「${post.key_point_error_reasons[0]}」做 20 分钟固定球+落点约束` : '训练重点：20 分钟稳定性 + 10 分钟发球/接发')
  )

  return (
    <View className="container">
      {submitting ? (
        <View className="aiLoadingOverlay">
          <View className="card bigCard glassCard" style={{ width: '100%', maxWidth: '360px' }}>
            <View className="cardInner" style={{ textAlign: 'center' }}>
              <View className="aiSpinnerWrap">
                <View className="aiSpinner" />
              </View>
              <View style={{ fontWeight: 900, fontSize: '16px', marginTop: '14px' }}>AI 分析中…</View>
              <View className="hintText" style={{ marginTop: '8px', lineHeight: '18px' }}>
                正在提取得失分模式并生成训练作业
              </View>
              <View className="aiDots" style={{ marginTop: '12px' }}>
                <View className="aiDot" />
                <View className="aiDot aiDot2" />
                <View className="aiDot aiDot3" />
              </View>
            </View>
          </View>
        </View>
      ) : null}
      <View className="pageHeader">
        <View>
          <View className="titleRow">
            <View className="tennisBall" />
            <View className="pageTitle">AI 分析</View>
          </View>
          <View className="pageSubtitle">比分：{match.score_analysis?.score_summary || '未填写'}</View>
        </View>
        <View className="row" style={{ gap: '10px' }}>
          <Button size="sm" variant="default" onClick={regenerate} disabled={loading || submitting || !canRegenerate}>
            重新生成
          </Button>
        </View>
      </View>

      {!online ? (
        <View className="card bigCard glassCard" style={{ marginBottom: '12px' }}>
          <View className="cardInner">
            <Status type="offline" message="当前离线，无法刷新/生成 AI 分析" />
          </View>
        </View>
      ) : null}

      {clarificationDone && conditionPills.length > 0 ? (
        <View className="card bigCard glassCard" style={{ marginBottom: '14px' }}>
          <View className="cardInner">
            <View style={{ fontWeight: 800, marginBottom: '8px' }}>比赛条件</View>
            <View className="chipRow">
              {conditionPills.map(p => (
                <Badge key={p.key}>{p.label}</Badge>
              ))}
            </View>
            <View className="stack" style={{ marginTop: '10px', gap: '6px' }}>
              {conditionPills
                .filter(p => p.help)
                .map(p => (
                  <View key={`${p.key}-help`} className="hintText">
                    {p.label}：{p.help}
                  </View>
                ))}
            </View>
          </View>
        </View>
      ) : null}

      {clarificationDone ? (
        <View className="card bigCard glassCard" style={{ marginBottom: '14px' }}>
          <View className="cardInner">
            <View className="rowBetween" style={{ marginBottom: '8px' }}>
              <View style={{ fontWeight: 900 }}>行动方案</View>
              {(clarification as any)?.selected_option ? <View className="pill pillNeutral">基于：{localizeText((clarification as any).selected_option)}</View> : null}
            </View>
            <View className="stack" style={{ gap: '12px' }}>
              <BulletRow emoji="🎯" title={actionKey} desc={actionKeyDesc} />
              <BulletRow emoji="🧠" title={actionTactic} />
              <BulletRow emoji="🏋️" title={actionDrill} />
            </View>
          </View>
        </View>
      ) : null}

      {!analysis && !feedback ? (
        <View className="card bigCard glassCard">
          <View className="cardInner">
            <View style={{ fontWeight: 800, marginBottom: '6px' }}>快问一下</View>
            <View className="hintText" style={{ marginBottom: '12px' }}>
              你回答得越具体，后面的建议越贴近你的真实问题
            </View>
            <View style={{ fontWeight: 700, marginBottom: '10px' }}>{clarification?.question}</View>
            <View className="stack" style={{ gap: '10px' }}>
              {(clarification?.options || []).map((o: string) => (
                <Button key={o} size="default" variant="secondary" disabled={submitting || !online} onClick={() => submitClarification(o)}>
                  {o}
                </Button>
              ))}
              <Button variant="ghost" disabled={submitting || !online} onClick={skipClarification}>
                先跳过，直接生成分析
              </Button>
            </View>
          </View>
        </View>
      ) : analysis ? (
        <View className="stack" style={{ gap: '12px' }}>
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View className="rowBetween" style={{ marginBottom: '10px' }}>
                <View style={{ fontWeight: 800 }}>总评</View>
                <Badge>{analysis.overview?.rating || 'B'}</Badge>
              </View>
              <View style={{ fontWeight: 900, fontSize: '18px', lineHeight: '26px' }}>{analysis.overview?.one_liner}</View>
              {analysis.overview?.tags?.length ? (
                <View className="chipRow" style={{ marginTop: '12px' }}>
                  {analysis.overview.tags.slice(0, 3).map(t => (
                    <Badge key={t}>{localizeText(t)}</Badge>
                  ))}
                </View>
              ) : null}
              {analysis.overview?.rating_label ? (
                <View className="hintText" style={{ marginTop: '10px' }}>
                  {analysis.overview.rating_label}
                </View>
              ) : null}
            </View>
          </View>

          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 800, marginBottom: '10px' }}>{analysis.highlights?.title || '今天的亮点'}</View>
              <View className="stack" style={{ gap: '12px' }}>
                {(analysis.highlights?.items || []).slice(0, 3).map((it, idx) => (
                  <View key={idx}>
                    <BulletRow emoji={it.emoji || '🔥'} title={localizeText(it.point)} desc={localizeText(it.evidence)} />
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 800, marginBottom: '10px' }}>{analysis.improvements?.title || '下次要注意'}</View>
              <View className="stack" style={{ gap: '12px' }}>
                {(analysis.improvements?.items || []).slice(0, 3).map((it, idx) => (
                  <View key={idx}>
                    <BulletRow emoji={it.emoji || '🔧'} title={localizeText(it.point)} desc={localizeText(it.suggestion)} right={localizeText(it.priority)} />
                  </View>
                ))}
              </View>
            </View>
          </View>

          {analysis.coordination_eval ? (
            <View className="card bigCard glassCard">
              <View className="cardInner">
                <View style={{ fontWeight: 800, marginBottom: '10px' }}>{analysis.coordination_eval?.title || '配合评估'}</View>
                <View style={{ lineHeight: '22px' }}>{analysis.coordination_eval?.summary}</View>
                {(analysis.coordination_eval?.drills || []).length ? (
                  <View style={{ marginTop: '12px' }}>
                    <View className="hintText" style={{ marginBottom: '8px' }}>练习建议</View>
                    <View className="stack" style={{ gap: '10px' }}>
                      {(analysis.coordination_eval?.drills || []).slice(0, 2).map((d, idx) => (
                        <View key={idx} className="card" style={{ padding: '12px', background: 'rgba(255,255,255,0.04)' }}>
                          <View className="rowBetween">
                            <View style={{ fontWeight: 900 }}>{`${idx + 1}️⃣ ${d.name}`}</View>
                            {d.duration ? <View className="pill pillNeutral">{d.duration}</View> : null}
                          </View>
                          {d.targets ? <View className="hintText" style={{ marginTop: '6px' }}>{d.targets}</View> : null}
                          <View style={{ marginTop: '8px', lineHeight: '22px' }}>{d.description}</View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {!isDoubles || !analysis.coordination_eval ? (
            <View className="card bigCard glassCard">
              <View className="cardInner">
                <View style={{ fontWeight: 800, marginBottom: '10px' }}>{analysis.opponent_read?.title || '对手解读'}</View>
                <View style={{ lineHeight: '22px' }}>{analysis.opponent_read?.summary}</View>
                {analysis.opponent_read?.next_time_tip ? (
                  <View className="hintText" style={{ marginTop: '10px', lineHeight: '22px' }}>
                    {analysis.opponent_read.next_time_tip}
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 800, marginBottom: '10px' }}>{analysis.homework?.title || '练球作业'}</View>
              <View className="stack" style={{ gap: '12px' }}>
                {(analysis.homework?.drills || []).slice(0, 2).map((d, idx) => (
                  <View key={idx} className="card" style={{ padding: '12px', background: 'rgba(255,255,255,0.04)' }}>
                    <View className="rowBetween">
                      <View style={{ fontWeight: 900 }}>{`${idx + 1}️⃣ ${d.name}`}</View>
                      {d.duration ? <View className="pill pillNeutral">{d.duration}</View> : null}
                    </View>
                    {d.targets ? <View className="hintText" style={{ marginTop: '6px' }}>{d.targets}</View> : null}
                    <View style={{ marginTop: '8px', lineHeight: '22px' }}>{d.description}</View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {analysis.next_match_tips ? (
            <View className="card bigCard glassCard">
              <View className="cardInner">
                <View style={{ fontWeight: 800, marginBottom: '10px' }}>{analysis.next_match_tips.title || '下次交手锦囊'}</View>
                <View style={{ fontWeight: 800, lineHeight: '22px' }}>{analysis.next_match_tips.strategy}</View>
                {analysis.next_match_tips.dos?.length ? (
                  <View style={{ marginTop: '10px' }}>
                    <View className="hintText" style={{ marginBottom: '6px' }}>✅ 要做的</View>
                    <View className="stack" style={{ gap: '6px' }}>
                      {analysis.next_match_tips.dos.slice(0, 2).map((t, i) => (
                        <View key={i} className="paraText">{`· ${t}`}</View>
                      ))}
                    </View>
                  </View>
                ) : null}
                {analysis.next_match_tips.donts?.length ? (
                  <View style={{ marginTop: '10px' }}>
                    <View className="hintText" style={{ marginBottom: '6px' }}>❌ 别做的</View>
                    <View className="stack" style={{ gap: '6px' }}>
                      {analysis.next_match_tips.donts.slice(0, 2).map((t, i) => (
                        <View key={i} className="paraText">{`· ${t}`}</View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 800, marginBottom: '8px' }}>战报分享</View>
              <View className="hintText">生成可分享图片，发到球友群</View>
              <View style={{ marginTop: '10px' }}>
                <Button loading={sharing} className="btnPrimary" hoverClass="btnHover" onClick={generateShareImage} disabled={!feedback}>
                  生成战报卡片
                </Button>
              </View>
            </View>
          </View>

        </View>
      ) : (
        <View className="stack">
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 800, marginBottom: '8px' }}>今天的关键问题</View>
              <RenderTextBlock text={feedback.key_problem} />
            </View>
          </View>
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 800, marginBottom: '8px' }}>下次碰到同类对手，试试这一件事</View>
              <RenderTextBlock text={feedback.next_tactic} />
            </View>
          </View>
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 800, marginBottom: '8px' }}>下次训练可以练</View>
              <RenderTextBlock text={feedback.training_suggestion} />
            </View>
          </View>
          {feedback.condition_tip ? (
            <View className="card bigCard glassCard">
              <View className="cardInner">
                <View style={{ fontWeight: 800, marginBottom: '8px' }}>条件提醒</View>
                <RenderTextBlock text={feedback.condition_tip} />
              </View>
            </View>
          ) : null}
          <View className="card bigCard glassCard">
            <View className="cardInner">
              <View style={{ fontWeight: 800, marginBottom: '8px' }}>战报分享</View>
              <View className="hintText">生成可分享图片，发到球友群</View>
              <View style={{ marginTop: '10px' }}>
                <Button loading={sharing} className="btnPrimary" hoverClass="btnHover" onClick={generateShareImage}>
                  生成战报卡片
                </Button>
              </View>
            </View>
          </View>
        </View>
      )}
      <Canvas canvasId="reportCanvas" style={{ width: '300px', height: '420px', position: 'absolute', left: '-9999px', top: '-9999px' }} />
    </View>
  )
}
