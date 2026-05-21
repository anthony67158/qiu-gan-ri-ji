import { KnowledgeContext } from '../services/knowledge.service'
import {
  AIClarification,
  MatchAnalysis,
  MatchConditions,
  MatchResult,
  MatchScore,
  MyInfo,
  OpponentInfo,
  OpponentSnapshot,
  PartnerSnapshot,
  PostMatchSummary,
  ScoreAnalysis
} from '../../shared/types'

export type MatchFeedbackPromptInput = {
  matchData: {
    match_result: MatchResult
    match_type?: string
    score?: MatchScore
    match_date?: string
    most_painful_point?: string
    painful_scene_tag?: string
    opponent_tags?: string[]
    self_state_tags?: string[]
    tactics_used_tags?: string[]
    ai_clarification?: AIClarification
    match_conditions?: MatchConditions
    // v3.1 新增结构化字段
    opponent_info?: OpponentInfo
    opponent_snapshots?: OpponentSnapshot[]
    my_info?: MyInfo
    post_match_summary?: PostMatchSummary
    partner_snapshot?: PartnerSnapshot
    my_court_preference?: 'ad_court' | 'deuce_court' | 'flexible'
  }
  scoreAnalysis: ScoreAnalysis
  knowledgeContext: KnowledgeContext
  h2h?: {
    opponent_name_alias: string
    wins: number
    losses: number
    draws: number
    matches: Array<{
      date: string
      score: string
      scoring: string[]
      losing: string[]
    }>
  } | null
}

function renderIfBlocks(template: string, ctx: Record<string, any>) {
  let out = template
  const re = /\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g
  for (let i = 0; i < 10; i += 1) {
    if (!re.test(out)) break
    re.lastIndex = 0
    out = out.replace(re, (_m, key, body) => (ctx[key] ? body : ''))
  }
  return out
}

export function buildMatchFeedbackPrompt(input: MatchFeedbackPromptInput) {
  const matchType = String(input.matchData.match_type || '').toLowerCase()
  const is_doubles = matchType === 'double' || matchType === 'doubles'
  const is_singles = !is_doubles

  const asStr = (v: any) => (v == null ? '' : String(v))
  const asList = (arr: any) => (Array.isArray(arr) && arr.length ? arr.join('、') : '')

  // v4.1：判断输入信号强弱
  // 弱信号 = 用户走"基础模式提交"，没展开高级折叠区
  // 触发条件：高级字段（场景标签 / 五维标签 / 总结标签 / 一句话）全部为空
  const summary = input.matchData.post_match_summary
  const hasAnyTag =
    Boolean(input.matchData.painful_scene_tag) ||
    (Array.isArray(input.matchData.opponent_tags) && input.matchData.opponent_tags.length > 0) ||
    (Array.isArray(input.matchData.self_state_tags) && input.matchData.self_state_tags.length > 0) ||
    (Array.isArray(input.matchData.tactics_used_tags) && input.matchData.tactics_used_tags.length > 0) ||
    (Array.isArray(summary?.scoring_methods) && (summary?.scoring_methods?.length || 0) > 0) ||
    (Array.isArray(summary?.losing_reasons) && (summary?.losing_reasons?.length || 0) > 0) ||
    (Array.isArray(summary?.key_point_error_reasons) && (summary?.key_point_error_reasons?.length || 0) > 0) ||
    Boolean(summary?.one_line_summary) ||
    Boolean(input.matchData.most_painful_point)
  const is_low_signal = !hasAnyTag

  const opponentSnapshots =
    Array.isArray(input.matchData.opponent_snapshots) && input.matchData.opponent_snapshots.length
      ? input.matchData.opponent_snapshots
      : input.matchData.opponent_info
        ? [input.matchData.opponent_info]
        : []

  const o1 = opponentSnapshots[0]
  const o2 = opponentSnapshots[1]

  const prompt = `
你是一个打了十几年球的业余网球老炮，说话直接、接地气，不要教练或播音员的官方口吻。
请根据以下比赛数据生成分析，严格按 JSON 格式输出。

## 比赛数据
- 比分: ${input.scoreAnalysis.score_summary || '未填写'}
- 日期: ${input.matchData.match_date || '未填写'}

## 对手信息
{{#if is_singles}}
- 昵称: ${o1?.name || input.h2h?.opponent_name_alias || '未填写'}
- 打法: ${o1?.play_style || ''} | 惯用手: ${asStr(o1?.dominant_hand)}
- 武器: ${asList(o1?.main_weapons)} | 漏洞: ${asList(o1?.weaknesses)}
- 关键分: ${asStr(o1?.clutch_tendency)} | 移动: ${asList(o1?.mobility)}
{{/if}}

{{#if is_doubles}}
- 对手 1：${o1?.name || '未填写'} | 打法: ${o1?.play_style || ''} | 手: ${asStr(o1?.dominant_hand)}
  武器: ${asList(o1?.main_weapons)} | 漏洞: ${asList(o1?.weaknesses)}
  关键分: ${asStr(o1?.clutch_tendency)} | 移动: ${asList(o1?.mobility)}
- 对手 2：${o2?.name || '未填写'} | 打法: ${o2?.play_style || ''} | 手: ${asStr(o2?.dominant_hand)}
  武器: ${asList(o2?.main_weapons)} | 漏洞: ${asList(o2?.weaknesses)}
  关键分: ${asStr(o2?.clutch_tendency)} | 移动: ${asList(o2?.mobility)}
{{/if}}

## 我的信息
- 风格: ${input.matchData.my_info?.play_style || ''} | 武器: ${asList(input.matchData.my_info?.main_weapons)}
- 短板: ${asList(input.matchData.my_info?.weaknesses)} | 移动: ${asList(input.matchData.my_info?.mobility)}
- 关键分状态: ${asStr(input.matchData.my_info?.clutch_state)} | 身体: ${input.matchData.my_info?.physical_state || ''}

{{#if is_doubles}}
## 搭档信息
- 昵称: ${input.matchData.partner_snapshot?.nickname || ''}
- 风格: ${asStr(input.matchData.partner_snapshot?.play_style)}
- 武器: ${asList(input.matchData.partner_snapshot?.main_weapons)} | 短板: ${asList(input.matchData.partner_snapshot?.weaknesses)}
- 站位偏好: ${asStr(input.matchData.partner_snapshot?.court_preference)} | 身体: ${asStr(input.matchData.partner_snapshot?.physical_state)}
- 我的站位偏好: ${asStr(input.matchData.my_court_preference)}
{{/if}}

## 比赛条件
- 场地: ${asStr(input.matchData.match_conditions?.surface)}
- 天气: ${asStr(input.matchData.match_conditions?.weather)}

## 赛后总结
- 得分方式: ${asList(input.matchData.post_match_summary?.scoring_methods)}
- 丢分原因: ${asList(input.matchData.post_match_summary?.losing_reasons)}
- 关键分失误: ${asList(input.matchData.post_match_summary?.key_point_error_reasons)}
{{#if is_doubles}}
- 配合问题: ${asList(input.matchData.post_match_summary?.coordination_issues)}
{{/if}}
- 一句话总结: ${input.matchData.post_match_summary?.one_line_summary || input.matchData.most_painful_point || ''}

${input.h2h && input.h2h.matches.length >= 2 ? `
## 历史交手（最近 ${input.h2h.matches.length} 场）
胜负: ${input.h2h.wins}胜 ${input.h2h.losses}负${input.h2h.draws ? ` ${input.h2h.draws}平` : ''}
${input.h2h.matches
  .map(m => `- ${m.date} ${m.score} | 得分: ${(m.scoring || []).join('、') || '无'} | 丢分: ${(m.losing || []).join('、') || '无'}`)
  .join('\n')}
` : ''}

## 输出要求
严格输出以下 JSON，不要输出任何 JSON 以外的内容（不要代码块，不要解释文字）：
未提供的字段请跳过相关分析，不要编造。
禁止凭空写出“第X盘/第X局/某个比分/破发点”等细节；只有当【比分】字段有真实内容时才允许引用盘局表现，否则只能给宏观判断。
如果【得分方式】或【丢分原因】为空：highlights / improvements / homework 不要硬写，items/drills 输出空数组即可，并在 overview.one_liner 里提示用户补齐再生成。

{{#if is_low_signal}}
【极简降级模式 - 重要】
当前用户走的是"基础模式提交"，只提供了胜负 + 比分 + 对手基本信息，未填写任何场景标签 / 五维标签 / 总结标签 / 一句话总结。
请遵守以下硬约束，避免编造：
1) overview 必填，但 one_liner 必须包含一句"展开高级模式（标签 / 总结）可解锁完整复盘"的提示，rating 只允许给宏观档位（A/B/C），禁止 S/D。
2) highlights.items 输出空数组 []
3) improvements.items 只允许输出 1 条 P0 级别的宏观建议（基于胜负 + 比分推断，不要写技术细节如"反手切削"）
4) opponent_read.summary 仅允许写 1 句话宏观印象，next_time_tip 输出空字符串
5) homework.drills 输出空数组 []
6) next_match_tips（如有）的 dos/donts 输出空数组
禁止编造任何具体技术细节、得分原因、关键分失误描述。
{{/if}}

{{#if is_doubles}}
双打模式额外要求：
1) opponent_read 需要解读对手组合：他们谁更强、谁更弱、组合薄弱环节是什么、怎么针对性打（例如“对手1网前弱 + 对手2移动差 = 多打中路/高球调动”）
2) coordination_eval 评估你和搭档的站位配合、抢网效率、沟通/暗号、覆盖空档，并给 2 个能马上做的双打配合练习
{{/if}}

${JSON.stringify(
  (() => {
    const base: any = {
    overview: {
      rating: 'S',
      rating_label: '发挥出色',
      one_liner: '一句话总评（50字以内）',
      tags: ['关键词1', '关键词2', '关键词3']
    },
    highlights: {
      title: '今天的亮点',
      items: [{ emoji: '🔥', point: '一句话亮点（25字以内）', evidence: '数据支撑（30字以内）' }]
    },
    improvements: {
      title: '下次要注意',
      items: [{ emoji: '🔧', point: '[P0]问题（25字以内）', suggestion: '具体怎么改（40字以内）', priority: 'P0' }]
    },
    opponent_read: {
      title: '对手解读',
      summary: '2句话总结对手（60字以内）',
      next_time_tip: '下次碰到TA的一句话建议（40字以内）'
    },
    homework: {
      title: '练球作业',
      drills: [
        { name: '训练名', description: '怎么练（60字以内）', duration: '15分钟', targets: '针对什么（20字以内）' },
        { name: '训练名', description: '怎么练（60字以内）', duration: '15分钟', targets: '针对什么（20字以内）' }
      ]
    },
    next_match_tips: input.h2h && input.h2h.matches.length >= 2 ? { title: '下次交手锦囊', strategy: '一句话战略方向', dos: ['要做的1', '要做的2'], donts: ['别做的1', '别做的2'] } : undefined
    } satisfies MatchAnalysis
    if (is_doubles) {
      base.coordination_eval = {
        title: '配合评估',
        summary: '2-3句话总结配合问题与改进方向（120字以内）',
        drills: [
          { name: '训练名', description: '怎么练（60字以内）', duration: '15分钟', targets: '针对什么（20字以内）' },
          { name: '训练名', description: '怎么练（60字以内）', duration: '15分钟', targets: '针对什么（20字以内）' }
        ]
      }
    }
    return base
  })(),
  null,
  2
)}
`.trim()

  return renderIfBlocks(prompt, { is_doubles, is_singles, is_low_signal }).trim()
}
