export function buildPreMatchIntelPrompt(input: {
  is_doubles?: boolean
  opponent: {
    nickname: string
    play_style?: string
    dominant_hand?: string
    main_weapons?: string[]
    weaknesses?: string[]
    clutch_tendency?: string
    mobility?: string[]
  }
  my: {
    play_style?: string
    main_weapons?: string[]
    weaknesses?: string[]
    mobility?: string[]
    clutch_state?: string
  }
  h2h?: {
    wins: number
    losses: number
    draws: number
    history: Array<{ date: string; score: string; scoring: string[]; losing: string[] }>
  }
}) {
  const is_doubles = Boolean(input.is_doubles)
  // v4.1：判断 h2h 数据是否稀疏（少于 2 场），稀疏时强制 AI 走通用打法画像，禁止编造历史细节
  const h2h_thin = !input.h2h || (input.h2h.history?.length || 0) < 2
  const renderIfBlocks = (template: string, ctx: Record<string, any>) => {
    let out = template
    const re = /\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g
    for (let i = 0; i < 10; i += 1) {
      if (!re.test(out)) break
      re.lastIndex = 0
      out = out.replace(re, (_m, key, body) => (ctx[key] ? body : ''))
    }
    return out
  }

  const prompt = `
你是赛前军师，说话简短有力，像队友在赛前给你支招。

## 对手信息
- 昵称: ${input.opponent.nickname}
- 打法: ${input.opponent.play_style || '未填'} | 手: ${input.opponent.dominant_hand || '未填'}
- 武器: ${(input.opponent.main_weapons || []).join('、') || '无'} | 漏洞: ${(input.opponent.weaknesses || []).join('、') || '无'}
- 关键分: ${input.opponent.clutch_tendency || '未填'} | 移动: ${(input.opponent.mobility || []).join('、') || '无'}

## 我的信息
- 风格: ${input.my.play_style || '未填'} | 武器: ${(input.my.main_weapons || []).join('、') || '无'}
- 短板: ${(input.my.weaknesses || []).join('、') || '无'} | 移动: ${(input.my.mobility || []).join('、') || '无'}
- 关键分: ${input.my.clutch_state || '未填'}

${input.h2h && input.h2h.history.length ? `
## 历史交手
胜负: ${input.h2h.wins}胜 ${input.h2h.losses}负${input.h2h.draws ? ` ${input.h2h.draws}平` : ''}
${input.h2h.history.map(h => `- ${h.date} ${h.score} | 得分: ${(h.scoring || []).join('、') || '无'} | 丢分: ${(h.losing || []).join('、') || '无'}`).join('\n')}
` : ''}

{{#if is_doubles}}
## 双打额外要求
如果历史交手信息足够，请额外分析对手可能的固定配合模式（发球局套路、抢网时机、站位习惯），并指出可攻击的站位空档（例如“对手A网前压得太深 + 对手B移动慢 = 多打中路和高球调动”）。
{{/if}}

{{#if h2h_thin}}
## 数据稀疏警告（重要）
当前历史交手不足 2 场，禁止使用"上次/上回/历史上"等回顾型措辞。
所有战术建议只能基于【对手打法 / 武器 / 漏洞】等画像字段推断；
若对手画像字段也大部分为空，one_liner 必须明确告诉用户"信息有限，建议先按通用打法应对"，
danger_rating 给 3（中性），game_plan.tactics 不超过 2 条，warnings 不超过 1 条。
{{/if}}

## 输出 JSON
严格输出 JSON，不要输出任何 JSON 以外的内容：

{
  "opponent_portrait": {
    "nickname": "${input.opponent.nickname}",
    "one_liner": "一句话人物速写",
    "danger_rating": 3,
    "h2h_record": "你赢X场，输Y场"
  },
  "game_plan": {
    "title": "今天的打法",
    "core_strategy": "一句话核心战略",
    "tactics": [
      { "emoji": "🎯", "tactic": "具体战术", "reason": "为什么" },
      { "emoji": "🎯", "tactic": "具体战术", "reason": "为什么" },
      { "emoji": "🎯", "tactic": "具体战术", "reason": "为什么" }
    ]
  },
  "watch_out": {
    "title": "小心这些",
    "warnings": [
      { "emoji": "⚡", "warning": "注意事项" },
      { "emoji": "🚨", "warning": "注意事项" }
    ]
  },
  "clutch_script": {
    "title": "关键分这样打",
    "when_leading": "领先时怎么打",
    "when_trailing": "落后时怎么打",
    "break_point": "破发点/被破发点怎么打"
  }
}
`.trim()

  return renderIfBlocks(prompt, { is_doubles, h2h_thin }).trim()
}
