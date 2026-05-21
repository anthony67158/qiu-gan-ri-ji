export const OPPONENT_TAGS = {
  serve: ['一发凶猛', '发球稳定', '二发偏弱', 'ACE多', '双误多'],
  baseline: ['正手暴力', '反手切削', '双反稳健', '底线防守型', '喜欢大角度', '上旋强'],
  net: ['常上网', '截击好', '网前手软', '很少上网'],
  movement: ['脚步快', '侧向移动慢', '体能好', '后半段体能下降'],
  mental: ['关键分稳', '容易急躁', '越打越好', '逆风局容易放弃']
} as const

export const SELF_STATE_TAGS = [
  '状态好',
  '心态稳',
  '心态崩了',
  '体力差',
  '失误多',
  '脚步慢',
  '发球差',
  '专注度不够',
  '反手频繁失误',
  '关键分心态崩'
] as const

export const TACTICS_TAGS = [
  '多打反手',
  '发球后抢攻',
  '多上网',
  '多放小球',
  '拉开正手位',
  '多切削拖节奏',
  '压制对方反手',
  '快速结束得分',
  '变速打乱节奏',
  '接发站进半步'
] as const

export const PAINFUL_SCENE_TAGS = [
  '关键分双误',
  '被穿越球打穿',
  '高压球失误',
  '破发点没把握住',
  '抢七关键失误',
  '领先后被翻盘',
  '网前截击下网',
  '接发球完全被压制',
  '体力崩掉开始送分',
  '被对手连续Ace',
  '简单球打飞了'
] as const

export const MATCH_CONDITIONS = {
  surface: ['hard', 'clay', 'grass', 'indoor'] as const,
  weather: ['sunny', 'cloudy', 'windy', 'hot'] as const,
  physical_state: ['good', 'normal', 'injured', 'fatigued'] as const
} as const
