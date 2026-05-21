// ========== 对手信息 ==========

/** 对手打法类型（单选） */
export const OPPONENT_PLAY_STYLES = [
  { value: 'baseline_offensive', label: '底线进攻' },
  { value: 'baseline_defensive', label: '底线防守' },
  { value: 'all_court',          label: '全场型' },
  { value: 'serve_volley',       label: '发上型' },
] as const;

/** 对手惯用手（单选） */
export const OPPONENT_DOMINANT_HAND = [
  { value: 'left',  label: '左手' },
  { value: 'right', label: '右手' },
] as const;

/** 对手主要武器（多选，最多 2） */
export const OPPONENT_MAIN_WEAPONS = [
  { value: 'forehand', label: '正手' },
  { value: 'backhand', label: '反手' },
  { value: 'serve',    label: '发球' },
  { value: 'return',   label: '接发' },
  { value: 'net_play',  label: '网前' },
] as const;

/** 对手主要漏洞（多选，最多 3） */
export const OPPONENT_WEAKNESSES = [
  { value: 'forehand_errors',      label: '正手失误多' },
  { value: 'backhand_under_pressure', label: '反手怕压' },
  { value: 'afraid_lob',           label: '怕高球' },
  { value: 'afraid_dropshot',      label: '怕小球' },
  { value: 'afraid_net',           label: '怕上网' },
  { value: 'afraid_long_rally',    label: '怕长回合' },
] as const;

/** 对手关键分倾向（单选） */
export const OPPONENT_CLUTCH_TENDENCY = [
  { value: 'conservative',  label: '保守' },
  { value: 'normal',        label: '正常' },
  { value: 'aggressive',    label: '激进' },
  { value: 'pattern_play',  label: '爱打固定套路' },
] as const;

/** 对手移动体能（多选，最多 2） */
export const OPPONENT_MOBILITY = [
  { value: 'good_lateral',     label: '横移好' },
  { value: 'poor_forward_back', label: '前后差' },
  { value: 'slow_start',       label: '启动慢' },
  { value: 'fades_long_rally', label: '长回合掉速' },
  { value: 'stamina_stable',   label: '体能稳' },
] as const;

// ========== 我的信息 ==========

/** 我的比赛风格（单选） */
export const MY_PLAY_STYLES = [
  { value: 'offensive',      label: '进攻型' },
  { value: 'defensive',      label: '防守型' },
  { value: 'all_court',      label: '全场型' },
  { value: 'counter_puncher', label: '反击型' },
] as const;

/** 我的主要武器（多选，最多 2） */
export const MY_MAIN_WEAPONS = [
  { value: 'serve',    label: '发球' },
  { value: 'forehand', label: '正手' },
  { value: 'backhand', label: '反手' },
  { value: 'return',   label: '接发' },
  { value: 'net_play',  label: '网前' },
] as const;

/** 我的主要短板（多选，最多 2） */
export const MY_WEAKNESSES = [
  { value: 'second_serve_unstable', label: '二发不稳' },
  { value: 'backhand_vulnerable',   label: '反手易丢' },
  { value: 'forehand_errors',       label: '正手失误多' },
  { value: 'weak_net',              label: '网前弱' },
  { value: 'afraid_long_rally',     label: '怕长回合' },
] as const;

/** 我的移动体能（多选，最多 2） */
export const MY_MOBILITY = [
  { value: 'good_lateral',       label: '横移好' },
  { value: 'slow_start',         label: '启动慢' },
  { value: 'average_forward_back', label: '前后一般' },
  { value: 'long_rally_stable',  label: '长回合稳定' },
  { value: 'fades_late',         label: '后程掉速' },
] as const;

/** 我的关键分状态（单选） */
export const MY_CLUTCH_STATE = [
  { value: 'stable',      label: '稳定' },
  { value: 'nervous',     label: '易紧张' },
  { value: 'conservative', label: '保守' },
  { value: 'aggressive',  label: '爱搏杀' },
] as const;

/** 我的身体状态（单选） */
export const MY_PHYSICAL_STATE = [
  { value: 'good',     label: '状态好' },
  { value: 'average',  label: '一般' },
  { value: 'injured',  label: '带伤' },
  { value: 'fatigued', label: '疲劳' },
] as const;

// ========== 赛后快速总结 ==========

/** 得分方式（多选，最多 3） */
export const SCORING_METHODS = [
  { value: 'forehand_winner',      label: '正手制胜' },
  { value: 'backhand_winner',      label: '反手制胜' },
  { value: 'ace',                  label: '发球直得' },
  { value: 'volley_winner',        label: '网前截击' },
  { value: 'overhead_winner',      label: '高压球' },
  { value: 'return_attack',        label: '接发抢攻' },
  { value: 'opponent_unforced_error', label: '对手失误' },
] as const;

/** 丢分原因（多选，最多 3） */
export const LOSING_REASONS = [
  { value: 'forehand_unforced',   label: '正手失误' },
  { value: 'backhand_unforced',   label: '反手失误' },
  { value: 'double_fault',       label: '双误' },
  { value: 'net_error',          label: '网前失误' },
  { value: 'poor_movement',      label: '移动不到位' },
  { value: 'overpowered',        label: '被对手打穿' },
  { value: 'serve_pressure',     label: '被发球压制' },
  { value: 'weak_ball_attacked', label: '回球浅被进攻' },
] as const;

/** 关键分失误原因（多选，最多 2） */
export const KEY_POINT_ERROR_REASONS = [
  { value: 'nervous',            label: '心态紧张' },
  { value: 'wrong_tactics',      label: '战术选择错误' },
  { value: 'technique_breakdown', label: '动作变形' },
  { value: 'stamina_drop',       label: '体力下降' },
  { value: 'opponent_clutch',    label: '对手发挥出色' },
  { value: 'inexperience',       label: '经验不足' },
] as const;

export const DOUBLES_COORDINATION_ISSUES = [
  { value: 'poach_timing', label: '抢网时机差' },
  { value: 'coverage_gap', label: '中路空档多' },
  { value: 'signal_miss', label: '暗号不统一' },
  { value: 'return_formation', label: '接发站位混乱' },
  { value: 'serving_pattern', label: '发球配合单一' },
  { value: 'court_switch', label: '换位不及时' }
] as const

export const COURT_PREFERENCES = [
  { value: 'ad_court', label: '左区（AD）' },
  { value: 'deuce_court', label: '右区（DEUCE）' },
  { value: 'flexible', label: '灵活换位' }
] as const

export const MATCH_CONDITIONS = {
  surface: ['hard', 'clay', 'grass', 'indoor'] as const,
  weather: ['sunny', 'cloudy', 'windy', 'hot'] as const,
  physical_state: ['good', 'normal', 'injured', 'fatigued'] as const
} as const

export const MATCH_CONDITION_LABELS = {
  surface: { hard: '硬地', clay: '红土', grass: '草地', indoor: '室内' },
  weather: { sunny: '晴天', cloudy: '阴天', windy: '风大', hot: '高温' },
  physical_state: { good: '状态好', normal: '一般', injured: '带伤', fatigued: '疲劳' }
} as const

export const MATCH_CONDITION_HELP = {
  surface: {
    hard: '常见塑胶硬地/硬地球场',
    clay: '红土：球速慢、弹跳高、回合更长',
    grass: '草地：球速快、弹跳低（较少见）',
    indoor: '室内：几乎无风雨影响，节奏更稳定'
  },
  weather: {
    sunny: '晴天：光照强，注意眩光与补水',
    cloudy: '阴天：温度更舒适，球速更稳定',
    windy: '风大：明显影响抛球与球路判断',
    hot: '高温：体感很热/出汗多，体能消耗更快'
  },
  physical_state: {
    good: '状态好：不疲劳、不带伤，身体感觉顺',
    normal: '一般：有点累但能正常打',
    injured: '带伤：有疼痛/不敢发力/移动受限',
    fatigued: '疲劳：明显跑不动或后半段崩得快'
  }
} as const

// ========== 练习模式 ==========

export const PRACTICE_DURATIONS = [
  { value: '30min', label: '30分钟' },
  { value: '1h', label: '1小时' },
  { value: '1.5h', label: '1.5小时' },
  { value: '2h', label: '2小时' },
  { value: '2h_plus', label: '2小时+' }
] as const

export const PRACTICE_TYPES = [
  { value: 'rally', label: '对练' },
  { value: 'serve_practice', label: '发球练习' },
  { value: 'return_practice', label: '接发练习' },
  { value: 'net_practice', label: '网前练习' },
  { value: 'baseline_rally', label: '底线拉球' },
  { value: 'fitness', label: '体能训练' },
  { value: 'match_simulation', label: '实战模拟' },
  { value: 'wall_practice', label: '单独打墙' },
  { value: 'multi_ball', label: '多球训练' }
] as const

export const PRACTICE_FOCUS = [
  { value: 'forehand', label: '正手' },
  { value: 'backhand', label: '反手' },
  { value: 'serve', label: '发球' },
  { value: 'return', label: '接发' },
  { value: 'net_play', label: '网前' },
  { value: 'footwork', label: '移动步伐' },
  { value: 'fitness', label: '体能' },
  { value: 'mental', label: '比赛心态' }
] as const

export const PRACTICE_GAINS = [
  { value: 'technique_breakthrough', label: '某个技术有突破' },
  { value: 'good_feel', label: '手感好' },
  { value: 'fitness_improved', label: '体能有进步' },
  { value: 'tactics_executed', label: '战术执行到位' },
  { value: 'learned_new', label: '新学了一招' },
  { value: 'rhythm_control', label: '节奏控制好' }
] as const

export const PRACTICE_ISSUES = [
  { value: 'old_habit', label: '老毛病还在' },
  { value: 'new_technique_shaky', label: '新动作不稳定' },
  { value: 'fitness_gap', label: '体能跟不上' },
  { value: 'focus_lost', label: '注意力不集中' },
  { value: 'specific_shot_stuck', label: '特定球路不会处理' },
  { value: 'power_mechanics', label: '发力方式不对' }
] as const
