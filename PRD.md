# 球感日记 · 完整产品需求文档（PRD v2.0）

**平台**：微信小程序
**版本**：MVP v2.0
**迭代节奏**：6 周

---

## 一、产品定位

### 一句话定位
打完球 30 秒记录，AI 结合专业知识库帮你越打越聪明——一个有记忆的网球私人教练。

### 核心问题与解法
| 问题 | 根因 | 解法 |
|------|------|------|
| 赛后情绪强，记忆 72 小时内消失 | 没有低摩擦出口 | 30 秒极简记录 + 语音输入 |
| AI 建议空泛，说的自己也知道 | 输入主观模糊，无专业知识桥接 | 后端知识库匹配 + AI 追问机制 |
| 每次遇到同类对手重头摸索 | 经验孤立，无法跨场沉淀 | 对手档案 + 同类对手规律聚合 |
| 知道该怎么打，临场做不到 | 没有赛前激活记忆的机制 | 赛前提醒卡调取上次历史 |
| 录像复盘门槛高，持续率 < 10% | 成本太高 | 文字标签方案，门槛降至 30 秒 |

### 目标用户
**核心人群**：每周打 1–3 次、在意输赢、想进步但不会长期录像复盘的业余选手（NTRP 2.5–4.5）。

关键特征：
- 有"我知道该怎么打，但比赛里就是做不到"的真实痛点
- 打完球有倾诉欲，会在球友群分享战绩
- 有固定打球圈子和相对固定的对手

**非目标用户**：以社交和放松为唯一目的的休闲型球友。

---

## 二、用户旅程
| 阶段 | 时间点 | 用户状态 | 产品介入 |
|------|--------|----------|----------|
| 赛前 | 打球前 1 分钟 | "上次输这类对手我该怎么打？" | 赛前提醒卡：上次规律 + 今天 1 条建议 |
| 赛后即刻 | 打完球 0–10 分钟 | 情绪最强，记忆最鲜活 | 30 秒秒记承接情绪 |
| AI 追问 | 提交后 5 秒 | 等待反馈 | AI 追问 1 个封闭选项，补充关键上下文 |
| 复盘反馈 | 追问后立即 | 想知道"为什么" | 三段式 AI 反馈（专业知识库驱动） |
| 社交分享 | 看完反馈 | 想分享今天战绩 | 一键生成战报卡片分享到球友群 |
| 隔天训练 | 训练前 | "该练什么？" | 本周训练主题提醒 |
| 下次对战 | 再遇同类对手 | "上次是不是也这么输的？" | 对手档案 + 可执行建议 |
| 月底 | 累积 ≥ 10 场后 | "我这阶段的瓶颈在哪？" | 自动生成月度洞察报告 |

Generated chart: journey_curve.png

---

## 三、核心功能规格

### 功能一：30 秒赛后秒记
**目标**：在情绪最强烈的 10 分钟内，以最低摩擦完成一次有价值的记录。

#### 区块一：比赛结果（必填）
```text
[赢了 😤]   [输了 😮‍💨]   [平局/练习]
```
单选，点击后高亮。选择后区块二～四自动展开（match_type = PRACTICE 时隐藏比分区块）。

#### 区块二：比分（选填）
支持逐局小比分记录 + 自动聚合大比分，交互如下：
```text
┌──────────────────────────────────┐
│  比分记录（选填）                 │
│                                  │
│  第 1 局   [ 我 6 ]  :  [ 对手 3 ] │
│  第 2 局   [ 我 4 ]  :  [ 对手 6 ] │
│  第 3 局   [ 我 7 ]  :  [ 对手 6 ] │
│                                  │
│        [ + 增加一局 ]             │
│                                  │
│  【大比分】 [ 2 ]  :  [ 1 ]       │
│   （自动根据各局胜负计算，可手动修改）│
└──────────────────────────────────┘
```

**交互细节**：
- 默认展示 1 局，每局输入框为两个数字 Picker（0–7，支持抢七则最大到 7）
- 点击「+ 增加一局」追加一行，最多支持 5 局
- 大比分由系统自动计算（比较每局大比分中各局得胜方），同时允许手动覆盖（适配双打打法/超级抢七等非标准赛制）
- 删除某一局：长按对应行，显示「删除」按钮

**数据结构**：
```js
score: {
  sets: [
    { set_number: 1, score_self: 6, score_opponent: 3 },
    { set_number: 2, score_self: 4, score_opponent: 6 },
    { set_number: 3, score_self: 7, score_opponent: 6 }
  ],
  total_self: 2,        // 大比分，系统自动算或手动填
  total_opponent: 1
}
```

**AI 可用的衍生信息（由比分计算得出）**：
```js
// 后端 scoreAnalyzer.js 自动分析
{
  total_sets: 3,
  went_to_deciding_set: true,       // 是否打了决胜盘
  comeback_win: false,               // 是否逆转
  collapsed_from_leading: true,      // 是否领先后被追平（如 1:0 领先后输掉）
  close_sets: [3],                   // 哪局是紧张局（比分差 ≤ 2 或进入抢七）
  lost_after_winning_first: false,
  score_summary: "2:1（6:3, 4:6, 7:6）"
}
```
这些衍生字段直接注入 AI Prompt，让 AI 能感知"是否逆转""是否领先后崩"等关键比赛走势。

#### 区块三：今天最难受的一球（选填，核心字段）
```text
┌──────────────────────────────────┐
│  🎙 说一下今天最憋屈的球          │
│                                  │
│  [ 语音输入 ]  [ 文字输入 ]       │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 第三盘 5:3 领先，连丢 3 分  │  │
│  │ 被翻盘，接发球全烂掉了…     │  │
│  └────────────────────────────┘  │
│  （最多 200 字）                  │
└──────────────────────────────────┘
```

**Placeholder 随机轮换（4 条）**：
- "5:3 领先被翻盘，关键分全崩了"
- "接发球一直被压反手，跑不到位"
- "对手发球也没多好，但我就是接不好"
- "第三盘体力开始下降，腿都不听使唤了"

**语音输入逻辑**：
- 调用 wx.startRecord → 完成后调用 wx.translateVoice 转文字
- 转写结果填入输入框，用户可修改
- 转写失败时保留语音文件 URL，提示用户"语音已保存，文字转写失败，请手动输入"

#### 区块四：快速标签（选填，多选点击）
```text
┌──────────────────────────────────┐
│  对手特点                        │
│  [正手强] [反手强] [发球好]      │
│  [上网多] [体力好] [打法稳]      │
│                                  │
│  我今天的状态                    │
│  [心态稳] [心态崩了] [体力差]    │
│  [失误多] [脚步慢] [发球差]      │
│                                  │
│  [ 展开：我用的战术 ▼ ]           │
│  （折叠，点击后展开）             │
│  [多打反手] [发球后抢攻] [多上网] │
│  [多放小球] [拉开正手位] [多切削] │
└──────────────────────────────────┘
```

**标签枚举说明**：
```js
OPPONENT_TAGS = [
  "正手强", "反手强", "发球好", "上网多",
  "体力好", "打法稳", "失误多", "节奏快", "节奏慢"
]

SELF_STATE_TAGS = [
  "心态稳", "心态崩了", "体力差", "失误多",
  "脚步慢", "发球差", "专注度不够", "状态好"
]

TACTICS_USED_TAGS = [
  "多打反手", "发球后抢攻", "多上网",
  "多放小球", "拉开正手位", "多切削拖节奏"
]
```

#### 底部提交按钮
```text
[ 提交，看 AI 分析 → ]
```
点击后：显示加载动画（"AI 正在分析这场球..."）。同时后端：① 保存 Match → ② 触发知识库匹配 → ③ 生成追问 → ④ 返回前端展示追问。不等 AI 完整输出，先展示追问页，追问回答后再生成完整三段式反馈。

---

### 功能二：AI 追问机制
**目标**：用 1 个封闭式问题补充 AI 最需要的关键上下文，把模糊输入变成精准输入。

#### 展示形式
```text
┌──────────────────────────────────┐
│  快问一下 🎾                     │
│                                  │
│  你第三盘 5:3 领先后丢分，       │
│  主要是哪种情况？                 │
│                                  │
│  ○ A. 自己主动失误增多           │
│       （打太保守了）               │
│  ○ B. 对手突然打进了             │
│       （我没应对好）               │
│  ○ C. 体力开始下降               │
│       （执行力跟不上）             │
│                                  │
│  [ 跳过，直接看分析 ]             │
└──────────────────────────────────┘
```

#### 追问生成逻辑（后端 clarificationService.js）
后端根据 most_painful_point 关键词 + score_analysis + opponent_tags + self_state_tags 选择最相关的追问模板：

| 触发条件 | 追问问题 | 选项 A | 选项 B | 选项 C |
|----------|----------|--------|--------|--------|
| 文本含"领先/翻盘/被追" | 你领先后丢分，主要是？ | 自己失误增多（打太保守） | 对手突然打进，我没应对好 | 体力下降，执行力跟不上 |
| opponent_tags 含"发球好" + 文本含"接发" | 接发球问题，更像哪种？ | 站位偏后，被压底线角落 | 接上去了但球太短被抢攻 | 心理紧张，动作犹豫 |
| self_state_tags 含"心态崩了" | 心态崩掉是从什么时候？ | 关键分连续失误之后 | 被对手从后面追分翻盘后 | 一开始就没找到感觉 |
| opponent_tags 含"打法稳" + match_result = LOSE | 输给稳定型对手，你当时？ | 一直等他失误，他就不失误 | 开始提高风险，反而失误更多 | 知道要主动，但打不出主动球 |
| 兜底默认 | 今天失分主要是哪种方式？ | 主动失误（自己出界/下网） | 被对手打得太被动 | 关键分心态出了问题 |

#### 追问字段存入 Match：
```js
ai_clarification: {
  question: String,   // 问了什么
  selected_option: String,  // 用户选了 A/B/C
  skipped: Boolean    // 是否跳过
}
```

---

### 功能三：AI 三段式复盘
**目标**：基于知识库，输出 150 字以内、专业但口语化、有具体动作指导的三段式建议。

#### 输出结构展示
```text
┌──────────────────────────────────┐
│ 📋 今天的关键问题                │
│                                  │
│ 第三盘 5:3 领先后你开始减少进攻，│
│ 让对手慢慢把节奏拉回来——典型的  │
│ "领先后怕输"，越保守越被动，关键 │
│ 分主动失误反而升高。              │
│                                  │
│ 💡 下次碰到同类对手，试试这 1 件事│
│                                  │
│ 领先到 5:3 后，发球局第一分主动  │
│ 上网，用快节奏压制，不要等对手   │
│ 出错——进攻节奏比保守等待更安全。  │
│                                  │
│ 📅 下次训练可以练                │
│                                  │
│ 发球上网截击组合，15 分钟。       │
│ 重点不是截击质量，是"发完球向前   │
│ 走"的条件反射。                  │
└──────────────────────────────────┘
```

这条分析对你有帮助吗？
```text
[ 👍 有用 ]   [ 👎 不够准确 ]
```

**AI 建议质量原则**：
- 不重复用户自己说过的话（用户说"关键分崩了"，AI 不说"你今天关键分表现不好"）
- 必须包含：在哪个时机 + 做什么动作 + 目标落点/目的，不能只说方向
- 训练建议必须可以在没有教练的情况下独立完成，时长 ≤ 20 分钟
- 总字数 ≤ 180 字

---

### 功能四：知识库体系（后端核心）
#### 目录结构
```text
server/
└── knowledge/
    ├── v1/
    │   ├── opponent_types.json       # 对手类型库（9 种类型）
    │   ├── failure_patterns.json     # 失误模式库（8 种模式）
    │   ├── training_drills.json      # 训练方案库（12 个方案）
    │   └── mental_patterns.json      # 心理状态库（5 种状态）
    ├── staging/                      # 测试版本
    └── knowledge_config.json         # 版本控制配置
```

#### 四类知识库说明
##### ① 对手类型库（opponent_types.json）
每种对手类型包含：标签组合、典型打法逻辑、用户常见陷阱、必须做的事、必须避免的事、对应训练方向。

示例条目（发球好 + 体力好）：
```json
{
  "type_id": "server_stamina",
  "label": "发球好 + 体力好",
  "tags_combination": ["发球好", "体力好"],
  "how_they_win": "用发球创造第三拍，并把比赛拖进消耗战。",
  "your_trap": "接发保守站太远 → 回球短 → 被抢第三拍 → 越来越被动 → 关键分崩溃",
  "must_do": [
    "接发站进半步，固定打他反手深区，不求质量先求方向",
    "主动压缩回合长度，发球后抢第三拍",
    "发球局第一分主动上网打断他的消耗节奏"
  ],
  "must_avoid": [
    "跟他打超过 5 拍的底线周旋",
    "领先时开始保守等他失误"
  ],
  "training_focus": "接发站位 + 第三拍进攻衔接"
}
```

##### ② 失误模式库（failure_patterns.json）
触发条件：标签组合 + most_painful_point 关键词 + 比分衍生信息（collapsed_from_leading等）联合判断。

核心 8 种模式：
| 模式 ID | 模式名称 | 核心触发条件 |
|---------|----------|--------------|
| leading_conservative | 领先保守病 | 文本含"领先/翻盘" + match_result=LOSE |
| pressure_conservative | 压力下保守失误 | self_state=心态崩了 + 文本含"关键分" |
| return_passive | 接发球被动综合征 | opponent_tags=发球好 + 文本含"接发" |
| momentum_loss | 失去节奏恶性循环 | self_state=心态崩了 + 文本含"越打越差" |
| over_aggressive | 领先时过度进攻 | match_result=LOSE + 文本含"失误太多" |
| deciding_set_collapse | 决胜盘体力崩溃 | went_to_deciding_set=true + self_state=体力差 |
| opponent_adjustment | 对手已调整但自己未改变 | 3 局以上 + 第三局分差大 + match_result=LOSE |
| serve_pressure | 发球局压力失常 | 文本含"发球局/保发" + self_state=失误多 |

每条模式包含：心理根源、战术后果链、3 条具体修正建议。

##### ③ 训练方案库（training_drills.json）
12 个针对性训练，每个包含：目标问题、时长、执行步骤、关键提示、无搭子替代方案。

| 训练 ID | 名称 | 目标问题 | 时长 |
|---------|------|----------|------|
| return_advance_step | 接发站位进步 | 接发被动 | 15 分钟 |
| approach_net_combo | 发球上网截击 | 领先保守/不敢上网 | 15 分钟 |
| backhand_deep_crosscourt | 反手斜线深球 | 正手强对手/中性球稳定 | 20 分钟 |
| critical_point_routine | 关键分执行固化 | 关键分保守/压力下失误 | 10 分钟 |
| short_ball_control | 放短球控制 | 稳定型对手 | 15 分钟 |
| low_ball_pass_net | 低球过网截击防守 | 上网多对手 | 15 分钟 |
| serve_consistency | 发球稳定性 | 发球差/发球压力 | 20 分钟 |
| rhythm_reset | 节奏重建练习 | 失去节奏恶性循环 | 10 分钟 |

##### ④ 心理状态库（mental_patterns.json）
5 种状态对应身体表现 + 短期修复方案 + 禁止做的事。

| 状态标签 | 典型身体表现 | 短期修复 |
|----------|--------------|----------|
| 心态崩了 | 击球节奏加快、引拍不完整、击球点偏晚 | 系鞋带物理切断 + 接下来 3 分只打反手斜线 |
| 脚步慢 | 总是伸手够球，被动启动 | 每拍后默念"回位"，强制往中线走两步 |
| 失误多 | 动作变形、用力方式错误 | 降低击球速度 30%，重建节奏后再提速 |
| 体力差 | 转腰不到位、步法跟不上 | 主动缩短回合，发球后抢攻减少消耗 |
| 专注度不够 | 接球前没有分裂注意力、判断慢 | 每球盯球心而不是球的整体 |

#### 知识库匹配函数（核心逻辑）
```js
// server/services/knowledgeService.js

function buildKnowledgeContext(matchData, scoreAnalysis, opponentProfile, kb) {

  // Step 1：对手类型匹配（标签覆盖率 ≥ 50% 的类型）
  const opponentMatch = matchOpponentType(matchData.opponent_tags, kb.opponent_types);

  // Step 2：失误模式检测
  //   联合：self_state_tags + most_painful_point 关键词 + scoreAnalysis 衍生字段 + match_result
  const failurePattern = detectFailurePattern(
    matchData.self_state_tags,
    matchData.most_painful_point,
    matchData.match_result,
    scoreAnalysis,                   // ← 新增：比分衍生信息
    matchData.ai_clarification,      // ← 新增：AI 追问回答
    kb.failure_patterns
  );

  // Step 3：心理状态匹配
  const mentalPattern = matchMentalState(matchData.self_state_tags, kb.mental_patterns);

  // Step 4：训练方案选择（优先 failurePattern 对应训练，次选 opponentMatch 对应训练）
  const drill = selectDrill(failurePattern?.pattern_id, opponentMatch?.type_id, kb.training_drills);

  return { opponentMatch, failurePattern, mentalPattern, drill };
}
```

---

### 功能五：AI Prompt 完整设计
#### 系统 Prompt（每次调用注入）
```text
你是专注业余网球玩家（NTRP 2.5–4.5）成长的战术教练。

风格要求：
- 口语化、直接，像对球友说话，不像写教材
- 永远不说"保持冷静""继续努力"这类废话
- 建议包含具体的：时机 + 动作 + 落点/目的
  不能只说"打他反手"，要说"接发球站进半步，把回球固定打他反手角深区"
- 不重复用户已经说过的内容

知识背景：
- 业余选手最常见失误不是技术，是战术执行和心理模式问题
- 同一用户会在同类场景下反复犯同样的错误
- 训练建议必须能在无教练情况下独立完成，时间 ≤ 20 分钟

输出格式硬约束：
- 总字数 ≤ 180 字
- 三段，每段最多 2 行
- 不用"建议你""你可以""希望"等客套语，直接说结论
```

#### 单场反馈完整 Prompt
```js
function buildMatchFeedbackPrompt(matchData, scoreAnalysis, opponentProfile, knowledgeContext) {
  return `
## 这场比赛的输入数据

比赛结果：${matchData.match_result === 'WIN' ? '赢了' : matchData.match_result === 'LOSE' ? '输了' : '练习'}
比分：${scoreAnalysis.score_summary || '未填写'}
比赛走势分析：
  - 是否打到决胜盘：${scoreAnalysis.went_to_deciding_set ? '是' : '否'}
  - 是否领先后被追平：${scoreAnalysis.collapsed_from_leading ? '是（关键信号）' : '否'}
  - 是否有紧张局（差 ≤2 或抢七）：${scoreAnalysis.close_sets?.length > 0 ? '第 ' + scoreAnalysis.close_sets.join('、') + ' 局' : '没有'}
  - 是否逆转：${scoreAnalysis.comeback_win ? '是' : '否'}

用户描述：「${matchData.most_painful_point || '未填写'}」
AI 追问回答：${matchData.ai_clarification?.selected_option || '用户跳过'}
对手特点标签：${matchData.opponent_tags?.join('、') || '未标记'}
用户状态标签：${matchData.self_state_tags?.join('、') || '未标记'}
用户使用战术：${matchData.tactics_used_tags?.join('、') || '未填写'}

${opponentProfile ? `
## 与该对手的历史记录
历史战绩：${opponentProfile.wins} 胜 ${opponentProfile.losses} 负
该对手高频特点：${opponentProfile.aggregated_opponent_tags.slice(0, 3).map(t => `${t.tag}(${Math.round(t.ratio * 100)}%)`).join('、')}
你赢他时的战术：${opponentProfile.tactics_when_win.slice(0, 2).map(t => t.tag).join('、') || '暂无'}
你输他时的规律：${opponentProfile.patterns_when_lose.slice(0, 2).map(t => t.tag).join('、') || '暂无'}
` : ''}

## 专业知识参考（直接用于建议，不要照搬原文）

### 对手类型分析
${knowledgeContext.opponentMatch
  ? `对手类型"${knowledgeContext.opponentMatch.label}"：
     他的赢球逻辑：${knowledgeContext.opponentMatch.how_they_win}
     你的典型陷阱：${knowledgeContext.opponentMatch.your_trap}
     必须做：${knowledgeContext.opponentMatch.must_do.join('；')}
     必须避免：${knowledgeContext.opponentMatch.must_avoid.join('；')}`
  : '未匹配到特定对手类型，基于通用知识作答。'}

### 失误模式诊断
${knowledgeContext.failurePattern
  ? `检测到模式"${knowledgeContext.failurePattern.label}"：
     心理根源：${knowledgeContext.failurePattern.psychological_root}
     战术后果链：${knowledgeContext.failurePattern.tactical_consequence}
     修正建议：${knowledgeContext.failurePattern.fix.join('；')}`
  : '未检测到特定失误模式。'}

### 心理状态参考
${knowledgeContext.mentalPattern
  ? `状态"${knowledgeContext.mentalPattern.trigger_tags.join('、')}"的身体表现：${knowledgeContext.mentalPattern.what_happens_physically}
     短期修复：${knowledgeContext.mentalPattern.short_fix}`
  : ''}

### 推荐训练方案
${knowledgeContext.drill
  ? `训练"${knowledgeContext.drill.label}"（${knowledgeContext.drill.duration_minutes}分钟）：
     ${knowledgeContext.drill.execution}
     核心提示：${knowledgeContext.drill.key_reminder}`
  : ''}

## 输出要求（严格按格式）

📋 今天的关键问题
[1–2行：不重复用户说的话，直接给出有因果链的核心原因]

💡 下次碰到同类对手，试试这 1 件事
[1–2行：时机 + 动作 + 落点，极度具体]

📅 下次训练可以练
[1行：训练内容 + 时长 + 最关键的执行提示]
`;
}
```

---

### 功能六：对手档案库
每次提交 Match 后，后端自动更新对手档案（异步，不阻塞响应）。

#### 对手详情页结构
```text
┌──────────────────────────────────┐
│  对手：张XX                      │
│  交手 6 场 | 4 胜 2 负 | 胜率 67% │
│                                  │
│  最近 5 场：● ● ○ ● ○            │
│  （● = 赢，○ = 输）               │
│                                  │
│  他的固定特点                    │
│  正手强  ████████  100%          │
│  发球好  ██████    75%           │
│  打法稳  ████      50%           │
│                                  │
│  你赢他时的规律                  │
│  → 你 3/4 场胜利都多打他反手斜线  │
│  → 发球后上网，你赢球率更高      │
│                                  │
│  你输他时的规律                  │
│  → 你输的 2 场都跟他底线周旋     │
│  → 心态崩了时输球概率接近 100%   │
│                                  │
│  💡 下次对战建议                  │
│  接发站进半步打他反手短角，别    │
│  跟他底线周旋，他比你稳。        │
└──────────────────────────────────┘
```

#### 同类对手规律（PRO 功能）
除了"张三"，系统还识别"发球好 + 体力好"这种对手类型，聚合用户对这类对手的历史规律：
```text
你对「发球好 + 体力好」类型的对手
总交手 5 场 | 1 胜 4 负 | 胜率 20%

你输他们的共同规律：
→ 接发球站太远，总被压到底线角落（4/4场）
→ 比赛拖到第三盘后体力明显下降（3/4场）

💡 针对这类对手的通用建议
接发站进半步 + 主动压缩回合，
避免进入消耗战，尽早结束得分。
```

---

### 功能七：赛前提醒卡
```text
┌──────────────────────────────────┐
│  🎾 打球前看一眼                 │
│                                  │
│  上次你遇到「发球好 + 体力好」的  │
│  对手（2026.3.15）输了 1:2。     │
│                                  │
│  你当时的问题：                  │
│  接发球站太远，总被压底线角落    │
│                                  │
│  今天试试这 1 件事：              │
│  接发站进半步，把回球方向固定    │
│  打他反手，不管质量先执行方向    │
│                                  │
│  [ 记住了，开始打 ✓ ]            │
└──────────────────────────────────┘
```

#### 触发逻辑：
- 用户进入「对手档案详情页」且该对手有 ≥ 2 场记录 → 自动弹出
- 用户点击首页「开始打球」→ 如果最近 7 天有相关对手记录则弹出，否则展示最近一场的训练提醒

---

### 功能八：战报分享卡
Canvas 生成规格（750×1080px）：
```text
┌────────────────────────────┐
│ [深绿色背景 #1a4731]        │
│                             │
│  今天的球                  │  ← 小字，灰白
│  6:3 / 4:6 / 7:6           │  ← 大字，白色，字号96
│       赢了！2:1            │  ← 中字，高亮色
│─────────────────────────── │
│  [白色半透明卡片]           │
│  AI 分析：                  │
│  第三盘领先后变保守，被追    │  ← 正文，2行
│  平，典型"领先后怕输"。     │
│─────────────────────────── │
│  [浅绿色卡片]               │
│  下次试试：                 │
│  领先到 5:3，第一分上网，   │  ← 建议，2行
│  用快节奏压制对手节奏。     │
│─────────────────────────── │
│  球感日记     [小程序码]   │  ← 底部 Logo + 扫码
└────────────────────────────┘
```

---

### 功能九：月度洞察报告
触发条件： PRO 用户 + 最近 30 天 ≥ 10 场记录。

#### 计算层（insightService.js，先统计再交给 AI 翻译）：
```js
function calculateMonthlyStats(matches) {
  return {
    total_matches: matches.length,
    wins: matches.filter(m => m.match_result === 'WIN').length,

    // 关键分问题频率
    critical_point_mention_count: matches.filter(m =>
      /(关键分|30:40|5:5|抢七|决胜盘)/.test(m.most_painful_point)
    ).length,

    // 对各类对手类型的胜率
    win_rate_by_opponent_type: calculateByOpponentType(matches),

    // 赢球时高频战术
    win_tactics: aggregateTagsByResult(matches, 'WIN', 'tactics_used_tags'),

    // 输球时高频状态
    lose_states: aggregateTagsByResult(matches, 'LOSE', 'self_state_tags'),

    // 决胜盘表现
    deciding_set_matches: matches.filter(m => m.score?.sets?.length >= 3),
    deciding_set_win_rate: calculateDecidingSetWinRate(matches)
  };
}
```

#### 月报 AI Prompt：
```js
// AI 只做"统计结论 → 自然语言"的翻译，不做凭空推理
function buildMonthlyInsightPrompt(stats) {
  return `
你是网球教练，基于以下已计算好的统计数据，生成月度洞察报告。
你只需要把数字翻译成有洞察力的自然语言，不要发明统计数据里没有的结论。

## 本月统计数据
总场次：${stats.total_matches}，${stats.wins}胜${stats.losses}负，胜率${stats.win_rate_pct}%
关键分问题提及频率：${stats.critical_point_mention_count}/${stats.total_matches}场（${stats.critical_point_ratio}%）
对「${stats.toughest_opponent_type}」类对手胜率：${stats.toughest_win_rate_pct}%（${stats.toughest_match_count}场）
赢球高频战术：${stats.win_tactics.map(t => `${t.tag}(${t.count}次)`).join('、')}
输球高频状态：${stats.lose_states.map(t => `${t.tag}(${t.count}次)`).join('、')}
决胜盘胜率：${stats.deciding_set_win_rate_pct}%（共${stats.deciding_set_matches}场打到决胜盘）

## 输出（严格 JSON，每字段 ≤ 80 字）
{
  "total_summary": "...",
  "failure_patterns": ["...", "..."],
  "tough_opponent_types": "...",
  "strength_patterns": "...",
  "training_focus": "..."
}
`;
}
```

---

### 功能十：连续记录激励
#### 里程碑设计：
- 首次记录          → 自动开启 7 天 PRO 体验
- 累计记录 3 场      → 解锁「对手档案」功能
- 累计记录 10 场     → 解锁第一份月度洞察
- 连续记录 7 场      → 获得「初级复盘者」徽章
- 累计记录 30 场     → 获得「球场复盘达人」徽章

#### 断档提醒：
3 天未记录 → 推送温和提醒（不说"已中断 XX 天"，说"上次打完球是 3 天前，下次打完别忘记记录"）

---

## 四、完整数据模型

### Match（核心记录表）
```js
{
  _id: ObjectId,
  user_id: ObjectId,
  opponent_id: ObjectId,           // 关联 OpponentProfile，可为 null
  opponent_name_alias: String,

  // 比赛结果
  match_result: String,            // "WIN" | "LOSE" | "DRAW" | "PRACTICE"
  match_type: String,              // "SINGLE" | "DOUBLE" | "PRACTICE"

  // 比分（新增：逐局小比分）
  score: {
    sets: [
      { set_number: Number, score_self: Number, score_opponent: Number }
    ],
    total_self: Number,            // 大比分（自动计算或手动填）
    total_opponent: Number
  },

  // 系统计算的比分衍生字段（后端自动填充）
  score_analysis: {
    total_sets: Number,
    went_to_deciding_set: Boolean,
    collapsed_from_leading: Boolean,
    comeback_win: Boolean,
    close_sets: [Number],
    score_summary: String          // 如 "2:1（6:3, 4:6, 7:6）"
  },

  // 核心自由输入
  most_painful_point: String,      // 今天最难受的一球
  voice_input_url: String,         // 语音文件 URL（如转文字失败则保留）

  // 标签
  opponent_tags: [String],
  self_state_tags: [String],
  tactics_used_tags: [String],

  // AI 追问
  ai_clarification: {
    question: String,
    options: [String],
    selected_option: String,
    skipped: Boolean
  },

  // AI 输出（存储避免重复调用）
  ai_feedback: {
    key_problem: String,
    next_tactic: String,
    training_suggestion: String,
    knowledge_used: {
      opponent_type_id: String,    // 命中了哪个对手类型
      failure_pattern_id: String,  // 命中了哪个失误模式
      drill_id: String             // 推荐了哪个训练
    },
    is_helpful: Boolean,           // 用户反馈：有用/不准确
    generated_at: Date
  },

  // 分享
  share_image_url: String,

  // 元数据
  date_time: Date,
  location: String,
  duration_minutes: Number,
  created_at: Date,
  updated_at: Date
}
```

### OpponentProfile（对手档案）
```js
{
  _id: ObjectId,
  user_id: ObjectId,
  opponent_name_alias: String,
  total_matches: Number,
  wins: Number, losses: Number, draws: Number,
  win_rate: Number,

  aggregated_opponent_tags: [{ tag: String, count: Number, ratio: Number }],
  tactics_when_win: [{ tag: String, count: Number, ratio: Number }],
  patterns_when_lose: [{ tag: String, count: Number, ratio: Number }],

  // 新增：比分走势统计
  score_patterns: {
    avg_sets_per_match: Number,
    deciding_set_count: Number,
    deciding_set_win_rate: Number,
    collapsed_from_leading_count: Number  // 对此对手几次领先后被追
  },

  ai_opponent_advice: String,
  last_match_date: Date,
  created_at: Date, updated_at: Date
}
```

### KnowledgeItem（知识库条目，支持后台更新）
```js
{
  _id: ObjectId,
  category: String,               // "opponent_type" | "failure_pattern" | "training_drill" | "mental_pattern"
  item_id: String,
  content: Object,                // 对应各类库的 JSON 结构
  version: String,
  is_active: Boolean,
  hit_count: Number,              // 被匹配次数（监控用）
  positive_feedback_count: Number, // 用户点"有用"次数
  accuracy_rate: Number,          // positive / hit_count
  updated_at: Date
}
```

---

## 五、API 接口规格

### 5.1 比赛记录接口（含比分逻辑）
```text
POST /api/match
描述：新增记录，自动触发：AI 追问生成 + 对手档案更新 + score_analysis 计算
请求体：MatchCreateDTO
响应：{
  match_id: String,
  clarification: {               // AI 追问，前端展示后用户回答
    question: String,
    options: String[]
  }
}

POST /api/match/:id/clarification
描述：提交 AI 追问回答，触发完整 AI 三段式反馈生成
请求体：{ selected_option: String, skipped: Boolean }
响应：{
  match: MatchObject,            // 含 ai_feedback
  opponent_profile: OpponentProfileObject
}

PATCH /api/match/:id/feedback
描述：用户提交"有用/不准确"反馈
请求体：{ is_helpful: Boolean }
响应：{ success: Boolean }
```

### 5.2 知识库接口
```text
GET /api/knowledge/match
描述：根据 match 数据返回匹配的知识库条目（供调试和内测验证用）
请求体：{ opponent_tags, self_state_tags, most_painful_point, score_analysis }
响应：{
  opponent_match: OpponentTypeObject | null,
  failure_pattern: FailurePatternObject | null,
  mental_pattern: MentalPatternObject | null,
  drill: TrainingDrillObject | null
}
```

---

## 六、技术栈与架构
```text
前端：Taro + React（微信小程序）
  状态管理：Zustand
  比分组件：自定义 ScoreInput 组件（支持动态增减局）
  语音：wx.startRecord + wx.translateVoice
  战报图：wx.createOffscreenCanvas → canvasToTempFilePath

后端：Node.js + Express
  数据库：MongoDB（Mongoose）
  AI 调用：Claude API / OpenAI API（后端统一代理）
  知识库：JSON 文件加载到内存（启动时缓存，变更时热更新）
  任务队列：对手档案更新 + 月报生成为异步任务（Bull Queue）

存储：微信云存储（战报图 + 语音文件）
认证：微信 OAuth（openid 为主键）+ JWT
支付：微信支付
```

---

## 七、功能权限与商业模式
| 功能 | FREE | PRO（¥18/月 或 ¥128/年） |
|------|------|---------------------------|
| 比赛记录（含逐局比分） | ✅ | ✅ |
| AI 三段式复盘 + 追问 | ✅ | ✅ |
| 战报图生成 + 分享 | ✅ | ✅ |
| 对手档案（最近 3 个） | ✅ 限制 | ✅ |
| 对手档案（无限 + 完整分析） | ❌ | ✅ |
| 同类对手规律聚合 | ❌ | ✅ |
| 赛前提醒卡 | ❌ | ✅ |
| 月度瓶颈洞察报告 | ❌ | ✅ |
| 训练计划生成 | ❌ | ✅ |
| 知识库准确性反馈 | ✅ | ✅ |

新用户激励： 首次记录完成后自动开启 7 天 PRO，让用户在 3 场记录后看到对手档案的价值，形成付费动机。

---

## 八、MVP 范围与迭代节奏
| 周次 | 交付内容 | 验证指标 |
|------|----------|----------|
| 第 1–2 周 | 秒记页（含逐局比分）+ AI 追问 + 三段式反馈 | 提交完成率 ≥ 85% |
| 第 3 周 | 战报图生成 + 内测 20 个球友 | 分享率 ≥ 25%，次日打开率 ≥ 30% |
| 第 4 周 | 对手档案（自动建档 + 规律分析） | 有档案用户复访率 vs 无档案用户 |
| 第 5 周 | 赛前提醒卡 + 连续记录激励 | 7 日留存率 ≥ 20% |
| 第 6 周 | 月度洞察 + 订阅付费墙 | 7 天 PRO 到期付费转化 ≥ 8% |

---

## 九、关键成功指标（KPI）
| 指标 | 定义 | 目标 |
|------|------|------|
| D1 留存 | 首次使用次日再次打开 | ≥ 35% |
| D7 留存 | 7 天内再次记录 | ≥ 20% |
| AI 有用率 | 点「有用」/ 总生成次数 | ≥ 60% |
| 知识库命中率 | 有效匹配 / 总调用次数 | ≥ 70% |
| 战报分享率 | 分享 / 战报生成 | ≥ 25% |
| 月均记录场次 | 活跃用户平均记录场次 | ≥ 4 场/月 |
| 付费转化率 | 7 天 PRO 到期后付费比例 | ≥ 8% |

AI 质量持续优化机制： 知识库命中率和 AI 有用率是核心指标，每月根据用户反馈数据识别低命中率的模式条目并优化，形成知识库 → AI 质量 → 用户满意度 → 付费转化的正向飞轮。