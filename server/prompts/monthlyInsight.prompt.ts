import { MonthlyStats } from '../modules/insight/insight.calculator'

export function buildMonthlyInsightPrompt(stats: MonthlyStats) {
  return `
你是网球教练，基于以下已计算好的统计数据，生成月度洞察报告。
你只需要把数字翻译成有洞察力的自然语言，不要发明统计数据里没有的结论。

## 本月统计数据
总场次：${stats.total_matches}，${stats.wins}胜${stats.losses}负，胜率${stats.win_rate_pct}%
关键分问题提及频率：${stats.critical_point_mention_count}/${stats.total_matches}场（${stats.critical_point_ratio}%）
对「${stats.toughest_opponent_type}」类对手胜率：${stats.toughest_win_rate_pct}%（${stats.toughest_match_count}场）
赢球高频战术：${stats.win_tactics.map(t => `${t.tag}(${t.count}次)`).join('、') || '无'}
输球高频状态：${stats.lose_states.map(t => `${t.tag}(${t.count}次)`).join('、') || '无'}
决胜盘胜率：${stats.deciding_set_win_rate_pct}%（共${stats.deciding_set_matches}场打到决胜盘）

## 输出（严格 JSON，每字段 ≤ 80 字）
{
  "total_summary": "...",
  "failure_patterns": ["...", "..."],
  "tough_opponent_types": "...",
  "strength_patterns": "...",
  "training_focus": "..."
}
`.trim()
}
