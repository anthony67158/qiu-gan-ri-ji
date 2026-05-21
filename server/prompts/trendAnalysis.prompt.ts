export function buildTrendAnalysisPrompt(input: {
  play_style?: string
  weaknesses?: string[]
  matches: Array<{
    date: string
    opponent: string
    score: string
    losing_reasons: string[]
    key_point_errors: string[]
    physical_state?: string
  }>
}) {
  return `
你是业余网球数据分析师，说话直白，不要官方腔。
请根据球员最近多场比赛数据，分析弱点趋势并给出训练建议。

## 球员基础信息
- 比赛风格: ${input.play_style || '未填'} | 短板: ${(input.weaknesses || []).join('、') || '无'}

## 最近 ${input.matches.length} 场比赛数据
${input.matches
  .map(
    (m, idx) => `第 ${idx + 1} 场 | ${m.date} vs ${m.opponent} | ${m.score}
  丢分原因: ${(m.losing_reasons || []).join('、') || '无'}
  关键分失误: ${(m.key_point_errors || []).join('、') || '无'}
  身体状态: ${m.physical_state || '未填'}`
  )
  .join('\n')}

## 输出 JSON（严格按此格式）
{
  "trend_overview": {
    "total_matches": ${input.matches.length},
    "period": "时间跨度",
    "trend_verdict": "一句话趋势判断，30字内"
  },
  "weakness_ranking": [
    {
      "rank": 1,
      "weakness": "弱点名称",
      "frequency": "N 场中出现 M 场",
      "trend": "worsening",
      "trend_icon": "📈",
      "severity": "P0",
      "quick_fix": "一句话建议"
    }
  ],
  "stamina_insight": {
    "finding": "体能关联发现",
    "advice": "建议"
  },
  "training_plan": {
    "title": "本周训练重点",
    "focus_area": "重点方向",
    "sessions": [
      { "day": "第1次", "drill_name": "名称", "detail": "怎么练", "duration": "时长" },
      { "day": "第2次", "drill_name": "名称", "detail": "怎么练", "duration": "时长" }
    ]
  }
}

## 规则
- weakness_ranking 按出现频率降序，最多 5 条
- trend 判断：连续 3 场出现=worsening，最近 2 场消失=improving，其余=stable
- severity：出现率 ≥80% = P0，≥50% = P1，其余 P2
- stamina_insight 仅在发现体能和丢分有明显关联时才输出
- training_plan 固定给 2-3 次训练，要具体到球数和时长
- 语言风格：球友聊天式，不要教科书式
`.trim()
}

