# 球感日记 · 完整产品需求文档（PRD v3.0）

**平台**：微信小程序
**版本**：MVP v3.0
**迭代节奏**：8 周
**v3.0 核心变更**：新增竞品差异化定位、标签体系五维重构、"最难受的一球"场景快选、比赛条件记录、弱点趋势追踪、赛前情报系统升级、对手弱点雷达图、轻社交模块（球友圈天梯/宿敌/双打）、月报人格化重构

---

## 一、产品定位

### 一句话定位
打完球 30 秒记录，AI 结合专业知识库帮你越打越聪明——一个有记忆的网球私人教练。

### 竞品分析与差异化定位（v3.0 新增）

| 竞品 | 定位 | 核心功能 | 局限性 | 我们的差异化 |
|------|------|----------|--------|------------|
| RecAce | 极简比赛记录器 | 10 秒录入比分，自动算胜率/H2H/趋势 | 无打法分析，无 AI 复盘，纯数据统计 | 我们提供"打法标签 + AI 教练式复盘" |
| Match Tennis (Match Book) | 赛事管理 + AI 球探报告 | 自动比赛统计 + 手动观察笔记 + AI 球探报告，带置信度评分 | 面向美国青少年竞技/教练市场，对接 USTA 体系，门槛高 | 我们聚焦中国业余球友，零门槛，中文生态 |
| Tennis Notes | 网球日记本 | 记录比赛、笔记、对手档案、Apple Watch 整合 | 仅 iOS，无 AI 分析，无战术建议 | 我们有 AI 三段式复盘 + 知识库驱动建议 |
| SwingVision | AI 视频分析 | 视频自动识别击球类型、落点、发球速度 | 需架设摄像头，门槛高，持续率 < 10% | 我们用文字标签替代视频，门槛降至 30 秒 |

**核心结论：中文市场基本空白。** 上述竞品全部面向欧美市场（英文界面、对接 USTA/ITF 体系），国内无面向业余球友的"轻记录 + AI 复盘"产品。

**我们的三个独特价值**：
1. **情绪锚点**——"最难受的一球"是竞品完全没有的维度，让 AI 复盘触达真正痛点
2. **教练式 AI 建议**——不只是统计数据，而是"什么时机 + 做什么动作 + 打到哪个落点"的可执行建议
3. **赛前情报**——从"事后复盘"升级为"事前备战"，价值翻倍

### 核心问题与解法
| 问题 | 根因 | 解法 |
|------|------|------|
| 赛后情绪强，记忆 72 小时内消失 | 没有低摩擦出口 | 30 秒极简记录 + 语音输入 + 场景快选 |
| AI 建议空泛，说的自己也知道 | 输入主观模糊，无专业知识桥接 | 后端知识库匹配 + AI 追问机制 |
| 每次遇到同类对手重头摸索 | 经验孤立，无法跨场沉淀 | 对手档案 + 同类对手规律聚合 + 赛前情报 |
| 知道该怎么打，临场做不到 | 没有赛前激活记忆的机制 | 赛前情报卡：上次规律 + 弱点雷达 + 今天 1 条战术 |
| 录像复盘门槛高，持续率 < 10% | 成本太高 | 文字标签方案，门槛降至 30 秒 |
| 不知道自己反复犯同样的错 | 缺乏跨场趋势追踪 | **弱点趋势追踪 + AI 趋势告警（v3.0 新增）** |
| 外部条件影响大但从不记录 | 缺少条件维度 | **比赛条件快速标记：场地/天气/身体（v3.0 新增）** |
| 打完球孤独地优化自己 | 缺少同伴激励和对照 | **球友圈天梯 + 宿敌机制 + 双打支持（v3.0 新增）** |

### 目标用户
**核心人群**：每周打 1–3 次、在意输赢、想进步但不会长期录像复盘的业余选手（NTRP 2.5–4.5）。

关键特征：
- 有"我知道该怎么打，但比赛里就是做不到"的真实痛点
- 打完球有倾诉欲，会在球友群分享战绩
- 有固定打球圈子和相对固定的对手
- 双打频率高（业余圈常态），经常与不同搭档配对

**非目标用户**：以社交和放松为唯一目的的休闲型球友。

---

## 二、用户旅程
| 阶段 | 时间点 | 用户状态 | 产品介入 |
|------|--------|----------|----------|
| 赛前 | 打球前 1 分钟 | "上次输这类对手我该怎么打？" | **赛前情报**：对手弱点雷达 + 历史输赢规律 + 今天 1 条可执行建议 |
| 赛后即刻 | 打完球 0–10 分钟 | 情绪最强，记忆最鲜活 | 30 秒秒记承接情绪（场景快选 + 条件标记） |
| AI 追问 | 提交后 5 秒 | 等待反馈 | AI 追问 1 个封闭选项，补充关键上下文 |
| 复盘反馈 | 追问后立即 | 想知道"为什么" | 三段式 AI 反馈（知识库 + 条件关联分析驱动） |
| 弱点追踪 | 每 5 场自动触发 | "我最近总在犯什么错？" | **弱点趋势告警推送（v3.0 新增）** |
| 社交分享 | 看完反馈 | 想分享今天战绩 | 一键生成战报卡片分享到球友群 |
| 隔天训练 | 训练前 | "该练什么？" | 本周训练主题提醒 |
| 下次对战 | 再遇同类对手 | "上次是不是也这么输的？" | 对手档案 + 赛前情报 + 可执行建议 |
| 月底 | 累积 ≥ 8 场后 | "我这阶段的瓶颈在哪？" | 自动生成月度教练报告（人格化风格） |

---

## 三、核心功能规格

### 功能一：30 秒赛后秒记
**目标**：在情绪最强烈的 10 分钟内，以最低摩擦完成一次有价值的记录。

**核心设计原则**：录入时间必须控制在 60 秒以内。RecAce 的用户数据表明超过 2 分钟用户放弃率陡增，所有字段设计以"点选 > 输入"为原则。

#### 区块一：比赛结果（必填）
```text
[赢了 😤]   [输了 😮‍💨]   [平局/练习]
```
单选，点击后高亮。

**比赛类型选择（结果下方，v3.0 新增双打支持）**：
```text
[单打]  [双打]
```
选择"双打"时，展开搭档选择：
```text
搭档：[ 选择已有球友 ▼ ] 或 [ 输入昵称 ]
```
选择后区块二～五自动展开（match_type = PRACTICE 时隐藏比分区块）。

#### 区块二：比分（选填）
支持逐盘小比分记录 + 自动聚合大比分，交互如下：
```text
┌──────────────────────────────────┐
│  比分记录（选填）                 │
│                                  │
│  第 1 盘   [ 我 6 ]  :  [ 对手 3 ] │
│  第 2 盘   [ 我 4 ]  :  [ 对手 6 ] │
│  第 3 盘   [ 我 7 ]  :  [ 对手 6 ] │
│                                  │
│        [ + 增加一盘 ]             │
│                                  │
│  【大比分】 [ 2 ]  :  [ 1 ]       │
│   （自动根据各盘胜负计算，可手动修改）│
└──────────────────────────────────┘
```

**交互细节**：
- 默认展示 1 盘，每盘输入框为两个数字 Picker（0–7，支持抢七则最大到 7）
- 点击「+ 增加一盘」追加一行，最多支持 5 盘
- 大比分由系统自动计算（比较各盘得胜方），同时允许手动覆盖（适配双打/超级抢七等非标赛制）
- 删除某一盘：长按对应行，显示「删除」按钮

**数据结构**：
```js
score: {
  sets: [
    { set_number: 1, score_self: 6, score_opponent: 3 },
    { set_number: 2, score_self: 4, score_opponent: 6 },
    { set_number: 3, score_self: 7, score_opponent: 6 }
  ],
  total_self: 2,
  total_opponent: 1
}
```

**AI 可用的衍生信息（由比分计算得出）**：
```js
// 后端 scoreAnalyzer.js 自动分析
{
  total_sets: 3,
  went_to_deciding_set: true,
  comeback_win: false,
  collapsed_from_leading: true,
  close_sets: [3],
  lost_after_winning_first: false,
  score_summary: "2:1（6:3, 4:6, 7:6）"
}
```
这些衍生字段直接注入 AI Prompt，让 AI 能感知"是否逆转""是否领先后崩"等关键比赛走势。

#### 区块三：今天最难受的一球（选填，核心差异化字段）

**v3.0 变更**：新增"场景快选"大幅降低输入门槛——用户点一个标签即可完成，最快 3 秒录入。

```text
┌──────────────────────────────────┐
│  🎙 说一下今天最憋屈的球          │
│                                  │
│  快选场景（点一个，可不选）       │
│  [关键分双误]  [被穿越球打穿]     │
│  [高压球失误]  [破发点没把握住]    │
│  [抢七关键失误] [领先后被翻盘]    │
│  [网前截击下网] [接发球完全被压制] │
│  [体力崩掉开始送分] [简单球打飞了] │
│                                  │
│  补充细节（选填）                  │
│  [ 语音输入 🎤 ]  [ 文字输入 ✏️ ] │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 第三盘 5:3 领先，连丢 3 分  │  │
│  │ 被翻盘，接发球全烂掉了…     │  │
│  └────────────────────────────┘  │
│  （最多 200 字）                  │
└──────────────────────────────────┘
```

**场景快选枚举**：
```js
PAINFUL_SCENE_TAGS = [
  "关键分双误", "被穿越球打穿", "高压球失误",
  "破发点没把握住", "抢七关键失误", "领先后被翻盘",
  "网前截击下网", "接发球完全被压制", "体力崩掉开始送分",
  "被对手连续Ace", "简单球打飞了"
]
```

**交互逻辑**：
- 场景快选为**单选标签**，选中后自动填入文本框前缀（如选中"关键分双误"→ 文本框显示"关键分双误，"光标在逗号后）
- 用户可**只点快选不输入文字**（最快 3 秒完成此区块）
- 也可**只写文字不选快选**（与 v2.0 完全兼容）
- 语音输入逻辑不变

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

**v3.0 变更**：标签体系从扁平列表重构为**五维分类**，更贴合实际打法描述维度，同时保持点选交互不增加认知负担。

```text
┌──────────────────────────────────────┐
│  对手特点（多选）                     │
│                                      │
│  发球  [一发凶猛] [发球稳定]         │
│        [二发偏弱] [ACE多] [双误多]   │
│                                      │
│  底线  [正手暴力] [反手切削]         │
│        [双反稳健] [底线防守型]       │
│        [喜欢大角度] [上旋强]         │
│                                      │
│  网前  [常上网] [截击好]             │
│        [网前手软] [很少上网]         │
│                                      │
│  移动  [脚步快] [侧向移动慢]        │
│        [体能好] [后半段体能下降]     │
│                                      │
│  心态  [关键分稳] [容易急躁]        │
│        [越打越好] [逆风局容易放弃]   │
│                                      │
│  ─────────────────────────────────── │
│                                      │
│  我今天的状态（多选）                 │
│  [状态好] [心态稳] [心态崩了]        │
│  [体力差] [失误多] [脚步慢]         │
│  [发球差] [专注度不够]              │
│  [反手频繁失误] [关键分心态崩]      │
│                                      │
│  [ 展开：我用的战术 ▼ ]              │
│  （折叠，点击后展开）                │
│  [多打反手] [发球后抢攻] [多上网]    │
│  [多放小球] [拉开正手位] [多切削]    │
│  [压制对方反手] [快速结束得分]       │
│  [变速打乱节奏] [接发站进半步]      │
└──────────────────────────────────────┘
```

**标签枚举说明**：
```js
// v3.0：五维对手标签体系
OPPONENT_TAGS = {
  serve:     ["一发凶猛", "发球稳定", "二发偏弱", "ACE多", "双误多"],
  baseline:  ["正手暴力", "反手切削", "双反稳健", "底线防守型", "喜欢大角度", "上旋强"],
  net:       ["常上网", "截击好", "网前手软", "很少上网"],
  movement:  ["脚步快", "侧向移动慢", "体能好", "后半段体能下降"],
  mental:    ["关键分稳", "容易急躁", "越打越好", "逆风局容易放弃"]
}
// 前端展示时按分类折叠/展开，存储时打平为一维数组

SELF_STATE_TAGS = [
  "状态好", "心态稳", "心态崩了", "体力差", "失误多",
  "脚步慢", "发球差", "专注度不够",
  "反手频繁失误", "关键分心态崩"      // v3.0 新增：更精准的失误类型标签
]

TACTICS_USED_TAGS = [
  "多打反手", "发球后抢攻", "多上网",
  "多放小球", "拉开正手位", "多切削拖节奏",
  "压制对方反手", "快速结束得分",      // v3.0 新增
  "变速打乱节奏", "接发站进半步"       // v3.0 新增
]
```

#### 区块五：比赛条件（选填，v3.0 新增）

**设计理由**：外部条件对业余选手的影响远大于职业选手。累积记录后 AI 可发现隐藏规律（如"你在大风天的胜率只有 20%"），提供条件适配建议。

```text
┌──────────────────────────────────┐
│  比赛条件（选填）                 │
│                                  │
│  场地  [硬地] [红土] [草地] [室内] │
│  天气  [晴天] [阴天] [风大] [高温] │
│  身体  [状态好] [一般] [带伤] [疲劳] │
└──────────────────────────────────┘
```

**数据结构**：
```js
match_conditions: {
  surface: String,       // "hard" | "clay" | "grass" | "indoor" | null
  weather: String,       // "sunny" | "cloudy" | "windy" | "hot" | null
  physical_state: String // "good" | "normal" | "injured" | "fatigued" | null
}
```

**AI 用法**：当累积 ≥ 10 场带条件记录后，后端自动计算条件关联胜率，注入 AI Prompt：
```text
条件关联发现：你在「风大」条件下的胜率仅 25%（4 场 1 胜），
显著低于整体胜率 58%。
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
后端根据 painful_scene_tag + most_painful_point 关键词 + score_analysis + opponent_tags + self_state_tags + match_conditions 选择最相关的追问模板：

| 触发条件 | 追问问题 | 选项 A | 选项 B | 选项 C |
|----------|----------|--------|--------|--------|
| 文本含"领先/翻盘/被追" | 你领先后丢分，主要是？ | 自己失误增多（打太保守） | 对手突然打进，我没应对好 | 体力下降，执行力跟不上 |
| opponent_tags 含"一发凶猛/发球稳定" + 文本含"接发" | 接发球问题，更像哪种？ | 站位偏后，被压底线角落 | 接上去了但球太短被抢攻 | 心理紧张，动作犹豫 |
| self_state_tags 含"心态崩了/关键分心态崩" | 心态崩掉是从什么时候？ | 关键分连续失误之后 | 被对手从后面追分翻盘后 | 一开始就没找到感觉 |
| opponent_tags 含"底线防守型" + match_result = LOSE | 输给稳定型对手，你当时？ | 一直等他失误，他就不失误 | 开始提高风险，反而失误更多 | 知道要主动，但打不出主动球 |
| match_conditions.weather = "windy" + LOSE **(v3.0)** | 大风天输球主要问题是？ | 上旋球效果变差，经常出界 | 对手切削在风中很难判断 | 抛球不稳导致发球质量下降 |
| match_type = "DOUBLE" **(v3.0)** | 今天双打的问题主要出在？ | 和搭档配合不默契 | 自己负责的区域失误多 | 对方某个人特别难对付 |
| 兜底默认 | 今天失分主要是哪种方式？ | 主动失误（自己出界/下网） | 被对手打得太被动 | 关键分心态出了问题 |

#### 追问字段存入 Match：
```js
ai_clarification: {
  question: String,
  selected_option: String,
  skipped: Boolean
}
```

---

### 功能三：AI 三段式复盘
**目标**：基于知识库 + 条件关联，输出 200 字以内、专业但口语化、有具体动作指导的三段式建议。

**v3.0 变更**：字数上限从 180 → 200 字，新增可选的条件关联提醒段。

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
│                                  │
│ ─────────────────────────────── │
│ ⚡ 条件提醒（仅当有足够数据时显示）│
│ 你在大风天的胜率只有 25%，建议   │
│ 减少上旋球比例，多用平击和切削。  │
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
- 条件关联提醒仅在检测到该条件下胜率异常时展示（≥ 5 场同条件数据 + 胜率偏差 > 15%）
- 总字数 ≤ 200 字

---

### 功能四：知识库体系（后端核心）
#### 目录结构
```text
server/
└── knowledge/
    ├── v2/
    │   ├── opponent_types.json       # 对手类型库（12 种，v3.0 扩展）
    │   ├── failure_patterns.json     # 失误模式库（10 种，v3.0 扩展）
    │   ├── training_drills.json      # 训练方案库（15 个，v3.0 扩展）
    │   ├── mental_patterns.json      # 心理状态库（6 种，v3.0 扩展）
    │   └── condition_patterns.json   # 条件影响库（v3.0 新增）
    ├── staging/
    └── knowledge_config.json
```

#### 五类知识库说明

##### ① 对手类型库（opponent_types.json）
v3.0 从 9 种扩展到 12 种，基于五维标签体系组合匹配。每种对手类型包含：标签组合、典型打法逻辑、用户常见陷阱、必须做的事、必须避免的事、对应训练方向。

示例条目（一发凶猛 + 体能好）：
```json
{
  "type_id": "big_server_stamina",
  "label": "大炮发球 + 体能型",
  "tags_combination": ["一发凶猛", "体能好"],
  "how_they_win": "用发球创造第三拍进攻机会，并把比赛拖入消耗战磨掉你的耐心。",
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

v3.0 新增对手类型（3 种）：
| 类型 ID | 标签组合 | 描述 |
|---------|----------|------|
| slice_disruptor | 反手切削 + 底线防守型 | 切削变速型：用大量切削打乱你节奏 |
| net_charger | 常上网 + 截击好 | 网前攻击型：发球上网 + 随球上网 |
| counter_puncher | 底线防守型 + 脚步快 | 超级防守型：什么球都能捞回来 |

##### ② 失误模式库（failure_patterns.json）
v3.0 从 8 种扩展到 10 种，新增条件关联和趋势型失误模式。

| 模式 ID | 模式名称 | 核心触发条件 |
|---------|----------|--------------|
| leading_conservative | 领先保守病 | 文本含"领先/翻盘" + match_result=LOSE |
| pressure_conservative | 压力下保守失误 | self_state 含"心态崩了/关键分心态崩" + 文本含"关键分" |
| return_passive | 接发球被动综合征 | opponent_tags 含发球相关 + 文本含"接发" |
| momentum_loss | 失去节奏恶性循环 | self_state 含"心态崩了" + 文本含"越打越差" |
| over_aggressive | 领先时过度进攻 | match_result=LOSE + 文本含"失误太多" |
| deciding_set_collapse | 决胜盘体力崩溃 | went_to_deciding_set=true + self_state 含"体力差" |
| opponent_adjustment | 对手已调整但自己未改变 | 3 盘以上 + 第三盘分差大 + match_result=LOSE |
| serve_pressure | 发球局压力失常 | 文本含"发球局/保发" + self_state 含"失误多" |
| **windy_condition_fail** | **大风天适应失败（v3.0）** | match_conditions.weather="windy" + match_result=LOSE |
| **backhand_repeat_error** | **反手习惯性失误（v3.0）** | self_state 含"反手频繁失误" 且近 3 场 ≥ 2 场同标签 |

每条模式包含：心理根源、战术后果链、3 条具体修正建议。

##### ③ 训练方案库（training_drills.json）
v3.0 从 12 个扩展到 15 个，新增条件适应训练和双打配合训练。

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
| **windy_flat_drive** | **大风天平击适应（v3.0）** | 大风天失误率高 | 15 分钟 |
| **speed_change_drill** | **变速节奏训练（v3.0）** | 对手切削多/节奏乱 | 15 分钟 |
| **doubles_poach_drill** | **双打截击偷袭（v3.0）** | 双打配合/网前压迫 | 15 分钟 |

##### ④ 心理状态库（mental_patterns.json）
v3.0 从 5 种扩展到 6 种。

| 状态标签 | 典型身体表现 | 短期修复 |
|----------|--------------|----------|
| 心态崩了 | 击球节奏加快、引拍不完整、击球点偏晚 | 系鞋带物理切断 + 接下来 3 分只打反手斜线 |
| 脚步慢 | 总是伸手够球，被动启动 | 每拍后默念"回位"，强制往中线走两步 |
| 失误多 | 动作变形、用力方式错误 | 降低击球速度 30%，重建节奏后再提速 |
| 体力差 | 转腰不到位、步法跟不上 | 主动缩短回合，发球后抢攻减少消耗 |
| 专注度不够 | 接球前没有分裂注意力、判断慢 | 每球盯球心而不是球的整体 |
| **关键分心态崩（v3.0）** | **仅在大比分关键时刻（30:40/5:5/抢七）紧张** | **关键分前固定发球 routine：拍 3 下球 → 深呼吸 → 发到预定位置，不临时改主意** |

##### ⑤ 条件影响库（condition_patterns.json，v3.0 新增）
基于场地/天气/身体条件提供战术调整建议。

| 条件 | 核心影响 | 战术调整建议 |
|------|----------|-------------|
| 风大 | 上旋球轨迹不稳定、抛球受影响 | 减少上旋，增加平击和切削；发球降低抛球高度 |
| 高温 | 体能消耗加速、注意力下降 | 主动缩短回合，多上网快速得分；换边时补充电解质 |
| 红土 | 弹跳高且慢，利于防守方 | 增加切削和放短球变化，不要期望一拍打死 |
| 带伤 | 移动受限，心理顾虑 | 站位提前，减少大范围移动；发球后立即回到 T 点 |
| 疲劳 | 第二盘后执行力明显下降 | 第一盘就全力争胜，避免拖入决胜盘消耗战 |

#### 知识库匹配函数（核心逻辑）
```js
// server/services/knowledgeService.js

function buildKnowledgeContext(matchData, scoreAnalysis, opponentProfile, kb) {

  // Step 1：对手类型匹配（标签覆盖率 ≥ 50% 的类型）
  const opponentMatch = matchOpponentType(matchData.opponent_tags, kb.opponent_types);

  // Step 2：失误模式检测
  const failurePattern = detectFailurePattern(
    matchData.self_state_tags,
    matchData.most_painful_point,
    matchData.painful_scene_tag,       // ← v3.0 新增：场景快选标签
    matchData.match_result,
    scoreAnalysis,
    matchData.ai_clarification,
    matchData.match_conditions,         // ← v3.0 新增：比赛条件
    kb.failure_patterns
  );

  // Step 3：心理状态匹配
  const mentalPattern = matchMentalState(matchData.self_state_tags, kb.mental_patterns);

  // Step 4：条件影响匹配（v3.0 新增）
  const conditionPattern = matchConditionPattern(matchData.match_conditions, kb.condition_patterns);

  // Step 5：训练方案选择（优先 failurePattern → 次选 opponentMatch → 兜底 conditionPattern）
  const drill = selectDrill(
    failurePattern?.pattern_id,
    opponentMatch?.type_id,
    conditionPattern?.condition_id,
    kb.training_drills
  );

  return { opponentMatch, failurePattern, mentalPattern, conditionPattern, drill };
}
```

---

### 功能五：AI 分析（v3.1 卡片化 JSON 输出）

目标：AI 不再输出“一坨文字”，而是输出结构化 JSON，前端按卡片渲染（信息密度更高，一屏看完，可截图分享）。

#### 单场比赛分析输出结构（前端渲染为 6 张卡片）
```ts
interface MatchAnalysis {
  overview: {
    rating: 'S' | 'A' | 'B' | 'C' | 'D';
    rating_label: string;
    one_liner: string;
    tags: string[];
  };
  highlights: {
    title: '今天的亮点';
    items: Array<{ emoji: string; point: string; evidence: string }>;
  };
  improvements: {
    title: '下次要注意';
    items: Array<{ emoji: string; point: string; suggestion: string; priority: 'P0'|'P1'|'P2' }>;
  };
  opponent_read: {
    title: '对手解读';
    summary: string;
    next_time_tip: string;
  };
  homework: {
    title: '练球作业';
    drills: Array<{ name: string; description: string; duration: string; targets: string }>;
  };
  next_match_tips?: {
    title: '下次交手锦囊';
    strategy: string;
    dos: string[];
    donts: string[];
  };
}
```

#### Prompt 核心要求
```text
你是一个打了十几年球的业余网球老炮，说话直接、接地气，不要教练或播音员的官方口吻。
严格输出 JSON，不要输出任何 JSON 以外的内容（不要代码块，不要解释文字）。
结论先行，证据跟上；每条建议必须可直接执行（时机 + 动作 + 落点/效果）。
```

#### 后端落库与接口
- Match.ai_analysis.version = 'v3.1'
- Match.ai_analysis.match_analysis 存储 MatchAnalysis

API（前端直接按 JSON 渲染卡片）：
- GET /api/match/:id/analysis → { analysis_type: "match", analysis: MatchAnalysis, generated_at }
- GET /api/analysis/trend?last_n=5 → { analysis_type: "trend", analysis: WeaknessTrendAnalysis, generated_at }
- GET /api/intel/:opponentName → 兼容返回 intel（旧结构）+ analysis（PreMatchIntelAnalysis）

---

### 功能六：对手档案库
每次提交 Match 后，后端自动更新对手档案（异步，不阻塞响应）。

#### 对手详情页结构

**v3.0 变更**：新增弱点雷达图、交手趋势可视化。

```text
┌──────────────────────────────────┐
│  对手：张XX                      │
│  交手 6 场 | 4 胜 2 负 | 胜率 67% │
│                                  │
│  最近 5 场：● ● ○ ● ○            │
│  （● = 赢，○ = 输）               │
│                                  │
│  📊 弱点雷达图（v3.0 新增）       │
│  ┌────────────────────┐          │
│  │     发球 4.2        │          │
│  │   /         \       │          │
│  │ 心态 3.1   底线 4.5 │          │
│  │   \         /       │          │
│  │  移动 3.8  网前 2.1  │          │
│  └────────────────────┘          │
│  （越高=对手越强，越低=你的攻击点） │
│                                  │
│  他的固定特点                    │
│  正手暴力  ████████  100%         │
│  一发凶猛  ██████    75%          │
│  底线防守型 ████     50%          │
│                                  │
│  你赢他时的规律                  │
│  → 你 3/4 场胜利都多打他反手斜线  │
│  → 发球后上网，你赢球率更高      │
│                                  │
│  你输他时的规律                  │
│  → 你输的 2 场都跟他底线周旋     │
│  → 心态崩了时输球概率接近 100%   │
│                                  │
│  📈 交手趋势（v3.0 新增）         │
│  3/1 ○ → 3/8 ● → 3/15 ● → 3/22 ○ │
│  （可视化趋势线，看清进步/退步）  │
│                                  │
│  💡 下次对战建议                  │
│  接发站进半步打他反手短角，别    │
│  跟他底线周旋，他比你稳。        │
└──────────────────────────────────┘
```

**弱点雷达图计算逻辑**：
```js
function calculateWeaknessRadar(opponentProfile) {
  // 五维评分：基于对手标签出现频率，0-5 分
  // 分数越高 = 对手该维度越强 = 你越不应该硬碰
  // 分数越低 = 对手该维度越弱 = 你的攻击方向
  const dimensions = {
    serve:    calculateDimensionScore(opponentProfile, OPPONENT_TAGS.serve),
    baseline: calculateDimensionScore(opponentProfile, OPPONENT_TAGS.baseline),
    net:      calculateDimensionScore(opponentProfile, OPPONENT_TAGS.net),
    movement: calculateDimensionScore(opponentProfile, OPPONENT_TAGS.movement),
    mental:   calculateDimensionScore(opponentProfile, OPPONENT_TAGS.mental)
  };
  return dimensions;
}
```

#### 同类对手规律（PRO 功能）
除了"张三"，系统还识别"一发凶猛 + 体能好"这种对手类型，聚合用户对这类对手的历史规律：
```text
你对「大炮发球 + 体能型」类型的对手
总交手 5 场 | 1 胜 4 负 | 胜率 20%

你输他们的共同规律：
→ 接发球站太远，总被压到底线角落（4/4场）
→ 比赛拖到第三盘后体力明显下降（3/4场）

💡 针对这类对手的通用建议
接发站进半步 + 主动压缩回合，
避免进入消耗战，尽早结束得分。
```

---

### 功能七：赛前情报系统（v3.0 重大升级）

**v2.0 → v3.0 变更**：从简单的"赛前提醒卡"升级为完整的"赛前情报系统"——从"事后复盘工具"升级为"事前备战工具"的关键功能。

#### 赛前情报卡展示
```text
┌──────────────────────────────────┐
│  🎾 赛前情报                     │
│                                  │
│  对手：张XX                      │
│  交手 5 次 | 2 胜 3 负            │
│                                  │
│  📊 他的弱点（你的攻击方向）      │
│  网前 ★★☆☆☆  ← 攻击这里         │
│  移动 ★★★☆☆  ← 可以利用          │
│  底线 ★★★★★  ← 别硬碰            │
│                                  │
│  ⚠️ 你过去输他的规律              │
│  → 3 次输球有 2 次标记了"心态崩了" │
│  → 每次都被他拉入底线消耗战       │
│                                  │
│  ✅ 你过去赢他的关键              │
│  → 2 次赢球都使用了"发球后抢攻"  │
│                                  │
│  💡 今天的战术建议                │
│  开局就用发球后抢攻建立节奏，    │
│  多放短球调动他上网——网前是他    │
│  最弱的环节。领先后别减速。       │
│                                  │
│  [ 记住了，开始打 ✓ ]            │
└──────────────────────────────────┘
```

#### 触发逻辑（v3.0 增强）：
- **主动入口**：用户进入「对手档案详情页」且该对手有 ≥ 2 场记录 → 顶部展示"查看赛前情报"按钮
- **智能推送**：用户点击首页「开始记录」时 → 展示最近对手列表，选择对手后自动展示赛前情报
- **同类对手情报**：即使没和某个具体对手打过，只要标记了对手特点标签，系统可基于"同类对手规律"生成通用赛前建议
- **条件适配**：如果用户标记了今天的比赛条件（如"风大"），情报卡追加条件适配建议

---

### 功能八：弱点趋势追踪系统（v3.0 新增）

**目标**：跨多场比赛追踪用户反复出现的弱点模式，在问题形成习惯性错误之前给出告警。

#### 追踪维度
| 追踪项 | 数据来源 | 触发告警条件 |
|--------|----------|-------------|
| 高频自身失误类型 | self_state_tags | 最近 5 场中 ≥ 3 场出现同一标签 |
| 高频最难受场景 | painful_scene_tag | 最近 5 场中 ≥ 2 场出现同一场景 |
| 条件关联弱点 | match_conditions + match_result | 某条件下胜率 < 整体胜率 - 20%，且 ≥ 5 场 |
| 对手类型弱点 | opponent_tags 聚合 + match_result | 某类对手胜率 < 30%，且 ≥ 3 场 |

#### 告警推送展示
```text
┌──────────────────────────────────┐
│  📊 弱点趋势提醒                 │
│                                  │
│  最近 6 场比赛中，你有 5 场标记了 │
│  「关键分心态崩」。这已经不是偶然 │
│  现象，而是需要专项训练的瓶颈。   │
│                                  │
│  💡 建议                          │
│  每次训练花 10 分钟做"关键分执行  │
│  固化"练习：模拟 5:5 / 抢七 /    │
│  30:40 场景，固定发球 routine，   │
│  不临时改变决策。                  │
│                                  │
│  [ 查看详细趋势 ]  [ 知道了 ]    │
└──────────────────────────────────┘
```

#### 后端逻辑（weaknessTrendService.js）
```js
function detectWeaknessTrends(userId, recentMatches) {
  const trends = [];

  // 1. self_state_tags 频率分析
  const stateFreq = countTagFrequency(recentMatches, 'self_state_tags');
  for (const [tag, count] of Object.entries(stateFreq)) {
    if (count >= 3 && recentMatches.length >= 5) {
      trends.push({
        type: 'self_state_repeat', tag, hit_count: count,
        match_count: recentMatches.length,
        severity: count / recentMatches.length
      });
    }
  }

  // 2. painful_scene_tag 频率分析
  const sceneFreq = countTagFrequency(recentMatches, 'painful_scene_tag');
  for (const [tag, count] of Object.entries(sceneFreq)) {
    if (count >= 2 && recentMatches.length >= 5) {
      trends.push({
        type: 'painful_scene_repeat', tag, hit_count: count,
        match_count: recentMatches.length,
        severity: count / recentMatches.length
      });
    }
  }

  // 3. 条件关联弱点
  const conditionWinRates = calculateConditionWinRates(recentMatches);
  const overallWinRate = calculateOverallWinRate(recentMatches);
  for (const [condition, stats] of Object.entries(conditionWinRates)) {
    if (stats.count >= 5 && stats.winRate < overallWinRate - 0.20) {
      trends.push({
        type: 'condition_weakness', condition,
        win_rate: stats.winRate, overall_win_rate: overallWinRate,
        match_count: stats.count,
        severity: (overallWinRate - stats.winRate)
      });
    }
  }

  return trends.sort((a, b) => b.severity - a.severity);
}
```

---

### 功能九：战报分享卡
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

### 功能十：轻社交模块（v3.0 新增）

**设计原则**：工具型社交，不做社交平台。所有社交功能服务于"打得更好"这个核心目标。

#### 10.1 球友圈 H2H 天梯
```text
┌──────────────────────────────────┐
│  🏆 我的球友圈                   │
│                                  │
│  排名  球友    胜率    最近状态   │
│  1.    老王    72%     🔥连胜3场 │
│  2.    我      58%     →         │
│  3.    张三    55%     ↓         │
│  4.    李四    41%     ↑         │
│                                  │
│  [ 邀请球友加入 ]                │
└──────────────────────────────────┘
```

**关键规则**：
- 排名基于圈内互相交手的胜率计算，非全局胜率
- 需要双方都确认比赛结果才计入天梯（防刷）
- 排名数据仅圈内可见，保护隐私
- 邀请机制：分享邀请链接 → 对方加入球友圈 → 关联双方历史对战记录

**增长价值**：邀请球友 = 天然拉新。"老王邀请你加入球友圈，看看你们的交手记录"。

#### 10.2 宿敌机制
与某对手交手 ≥ 3 次后自动标记为"宿敌"：
```text
┌──────────────────────────────────┐
│  ⚔️ 宿敌：老王                   │
│                                  │
│  交手 8 次 | 3 胜 5 负 | 胜率 37% │
│                                  │
│  趋势：最近 3 场你 2 胜 1 负     │
│  📈 胜率在上升，你正在找到他的弱点│
│                                  │
│  [ 查看完整档案 ]  [ 赛前情报 ]   │
└──────────────────────────────────┘
```

**设计意图**：通过"宿敌"叙事增强用户的情感投入和记录动力。

#### 10.3 双打支持
```text
搭档组合分析（PRO 功能）：

你 + 老王：5 场 | 4 胜 1 负 | 胜率 80%
→ 你站反手位、老王站正手位时赢球率最高

你 + 张三：3 场 | 1 胜 2 负 | 胜率 33%
→ 你们都喜欢上网，但网前容易被穿越
```

**数据结构**：
```js
doubles_data: {
  partner_id: ObjectId,
  partner_name_alias: String,
  partner_position: String,      // "ad_side" | "deuce_side" | null
  doubles_tactics_tags: [String] // ["网前双上", "一攻一守", "Australian阵型"]
}
```

---

### 功能十一：月度教练报告（v3.0 人格化重构）

**v3.0 变更**：从冰冷的数据表重构为"教练口吻"的人格化报告，像你的教练在跟你总结这个月的表现。

触发条件：PRO 用户 + 最近 30 天 ≥ 8 场记录（v3.0 门槛从 10 场降至 8 场）。

#### 月报展示（人格化风格）
```text
┌──────────────────────────────────┐
│  📋 3 月训练报告                  │
│  ——你的 AI 教练给你的月度总结     │
│                                  │
│  "这个月你打了 12 场球，赢了 7 场，│
│   胜率 58%——比上个月涨了 12%，   │
│   有明显进步。"                   │
│                                  │
│  🏆 最大进步                     │
│  "反手失误从上月的高频问题变成了  │
│   偶尔出现，说明最近的反手斜线   │
│   训练确实有效果。继续保持。"     │
│                                  │
│  ⚠️ 主要瓶颈                    │
│  "关键分表现仍然不稳定——12 场球  │
│   有 8 场你标记了'关键分心态崩'。 │
│   这是你目前最需要突破的瓶颈。"   │
│                                  │
│  🎯 难缠对手                     │
│  "你对'底线防守型'对手的胜率只有  │
│   25%。他们能把球都捞回来，你急于 │
│   进攻反而失误。下月重点：对稳定  │
│   型对手多用切削变速 + 放短球。"  │
│                                  │
│  🌤️ 条件洞察（v3.0 新增）        │
│  "你在大风天的胜率只有 20%（5 场  │
│   1 胜），远低于整体。建议大风天  │
│   减少上旋，多用平击和切削。"     │
│                                  │
│  📅 下月训练重点                  │
│  "1. 关键分执行固化练习，每次训练  │
│      花 10 分钟（模拟 5:5/抢七）。 │
│   2. 对底线防守型对手的切削变速   │
│      专项训练，15 分钟/次。"      │
│                                  │
│  [ 分享月报 ]  [ 查看详细数据 ]  │
└──────────────────────────────────┘
```

#### 计算层（insightService.js）
```js
function calculateMonthlyStats(matches) {
  return {
    total_matches: matches.length,
    wins: matches.filter(m => m.match_result === 'WIN').length,
    losses: matches.filter(m => m.match_result === 'LOSE').length,

    // 与上月对比（v3.0 新增）
    win_rate_change: calculateWinRateChange(matches, previousMonthMatches),

    // 关键分问题频率
    critical_point_mention_count: matches.filter(m =>
      m.self_state_tags?.includes('关键分心态崩') ||
      /(关键分|30:40|5:5|抢七|决胜盘)/.test(m.most_painful_point)
    ).length,

    // 弱点趋势跨月对比（v3.0 新增）
    improving_weaknesses: detectImprovingWeaknesses(matches, previousMonthMatches),
    persistent_weaknesses: detectPersistentWeaknesses(matches),

    // 对各类对手类型的胜率
    win_rate_by_opponent_type: calculateByOpponentType(matches),

    // 赢球时高频战术
    win_tactics: aggregateTagsByResult(matches, 'WIN', 'tactics_used_tags'),

    // 输球时高频状态
    lose_states: aggregateTagsByResult(matches, 'LOSE', 'self_state_tags'),

    // 条件关联分析（v3.0 新增）
    condition_win_rates: calculateConditionWinRates(matches),
    condition_anomalies: detectConditionAnomalies(matches),

    // 决胜盘表现
    deciding_set_matches: matches.filter(m => m.score_analysis?.went_to_deciding_set),
    deciding_set_win_rate: calculateDecidingSetWinRate(matches),

    // 双打统计（v3.0 新增）
    doubles_stats: calculateDoublesStats(matches.filter(m => m.match_type === 'DOUBLE'))
  };
}
```

#### 月报 AI Prompt：
```js
function buildMonthlyInsightPrompt(stats) {
  return `
你是用户的私人网球教练，用第一人称教练口吻总结这个月的表现。
语气要像真正的教练在和球员 1 对 1 谈话：直接、温暖但不客套，有表扬有批评。
你只需要把统计数据翻译成有洞察力的自然语言，不要发明数据里没有的结论。

## 本月统计数据
总场次：${stats.total_matches}，${stats.wins}胜${stats.losses}负，胜率${stats.win_rate_pct}%
胜率变化：较上月 ${stats.win_rate_change > 0 ? '+' : ''}${stats.win_rate_change}%
关键分问题提及频率：${stats.critical_point_mention_count}/${stats.total_matches}场（${stats.critical_point_ratio}%）
进步的弱点：${stats.improving_weaknesses?.map(w => w.tag).join('、') || '暂无明显改善'}
持续的瓶颈：${stats.persistent_weaknesses?.map(w => w.tag + '(' + w.count + '/' + stats.total_matches + '场)').join('、') || '暂无'}
对「${stats.toughest_opponent_type}」类对手胜率：${stats.toughest_win_rate_pct}%（${stats.toughest_match_count}场）
赢球高频战术：${stats.win_tactics.map(t => t.tag + '(' + t.count + '次)').join('、')}
输球高频状态：${stats.lose_states.map(t => t.tag + '(' + t.count + '次)').join('、')}
条件异常：${stats.condition_anomalies?.map(a => a.condition + '条件胜率' + a.win_rate_pct + '%（' + a.count + '场）').join('；') || '无'}
决胜盘胜率：${stats.deciding_set_win_rate_pct}%（共${stats.deciding_set_matches.length}场打到决胜盘）

## 输出要求
用教练口吻，像在和球员面对面聊天。每段 ≤ 80 字。
{
  "opening_summary": "这个月总体表现 + 胜率变化评价",
  "biggest_improvement": "最大进步点 + 原因分析",
  "main_bottleneck": "最突出的反复出现的问题 + 为什么这是瓶颈",
  "toughest_opponent_type": "最难缠的对手类型 + 建议",
  "condition_insight": "条件关联发现（无则填null）",
  "next_month_focus": "下月 1-2 个训练重点 + 具体练法"
}
`;
}
```

---

### 功能十二：连续记录激励
#### 里程碑设计：
- 首次记录 → 自动开启 7 天 PRO 体验
- 累计记录 3 场 → 解锁「对手档案」功能
- 累计记录 5 场 → 解锁「弱点趋势追踪」（v3.0 新增）
- 累计记录 8 场 → 解锁第一份月度教练报告
- 连续记录 7 场 → 获得「初级复盘者」徽章
- 累计记录 30 场 → 获得「球场复盘达人」徽章

#### 断档提醒：
3 天未记录 → 推送温和提醒（不说"已中断 XX 天"，说"上次打完球是 3 天前，下次打完别忘记记录"）

---

## 四、完整数据模型

### Match（核心记录表）
```js
{
  _id: ObjectId,
  user_id: ObjectId,
  opponent_id: ObjectId,
  opponent_name_alias: String,

  // 比赛结果
  match_result: String,            // "WIN" | "LOSE" | "DRAW" | "PRACTICE"
  match_type: String,              // "SINGLE" | "DOUBLE" | "PRACTICE"

  // 双打数据（v3.0 新增）
  doubles_data: {
    partner_id: ObjectId,
    partner_name_alias: String,
    partner_position: String,      // "ad_side" | "deuce_side" | null
    doubles_tactics_tags: [String]
  },

  // 比分
  score: {
    sets: [
      { set_number: Number, score_self: Number, score_opponent: Number }
    ],
    total_self: Number,
    total_opponent: Number
  },

  // 系统计算的比分衍生字段
  score_analysis: {
    total_sets: Number,
    went_to_deciding_set: Boolean,
    collapsed_from_leading: Boolean,
    comeback_win: Boolean,
    close_sets: [Number],
    score_summary: String
  },

  // 比赛条件（v3.0 新增）
  match_conditions: {
    surface: String,               // "hard" | "clay" | "grass" | "indoor" | null
    weather: String,               // "sunny" | "cloudy" | "windy" | "hot" | null
    physical_state: String         // "good" | "normal" | "injured" | "fatigued" | null
  },

  // 核心自由输入
  painful_scene_tag: String,       // v3.0 新增：场景快选标签
  most_painful_point: String,
  voice_input_url: String,

  // 标签
  opponent_tags: [String],         // v3.0：五维体系
  self_state_tags: [String],       // v3.0：含精准失误类型
  tactics_used_tags: [String],     // v3.0：扩展

  // AI 追问
  ai_clarification: {
    question: String,
    options: [String],
    selected_option: String,
    skipped: Boolean
  },

  // AI 输出
  ai_feedback: {
    key_problem: String,
    next_tactic: String,
    training_suggestion: String,
    condition_tip: String,         // v3.0 新增
    knowledge_used: {
      opponent_type_id: String,
      failure_pattern_id: String,
      drill_id: String,
      condition_pattern_id: String // v3.0 新增
    },
    is_helpful: Boolean,
    generated_at: Date
  },

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

  // v3.0 新增：弱点雷达图数据
  weakness_radar: {
    serve: Number,     // 0-5
    baseline: Number,
    net: Number,
    movement: Number,
    mental: Number
  },

  aggregated_opponent_tags: [{ tag: String, count: Number, ratio: Number }],
  tactics_when_win: [{ tag: String, count: Number, ratio: Number }],
  patterns_when_lose: [{ tag: String, count: Number, ratio: Number }],

  score_patterns: {
    avg_sets_per_match: Number,
    deciding_set_count: Number,
    deciding_set_win_rate: Number,
    collapsed_from_leading_count: Number
  },

  // v3.0 新增：宿敌标记
  is_nemesis: Boolean,             // total_matches >= 3 时自动标记
  nemesis_trend: String,           // "improving" | "declining" | "stable"

  ai_opponent_advice: String,
  last_match_date: Date,
  created_at: Date, updated_at: Date
}
```

### DoublesPartnerProfile（双打搭档档案，v3.0 新增）
```js
{
  _id: ObjectId,
  user_id: ObjectId,
  partner_id: ObjectId,
  partner_name_alias: String,
  total_matches: Number,
  wins: Number, losses: Number,
  win_rate: Number,
  preferred_formation: String,
  common_tactics: [{ tag: String, count: Number }],
  ai_partnership_advice: String,
  last_match_date: Date
}
```

### FriendCircle（球友圈，v3.0 新增）
```js
{
  _id: ObjectId,
  circle_name: String,
  creator_id: ObjectId,
  members: [{
    user_id: ObjectId,
    nickname: String,
    joined_at: Date
  }],
  created_at: Date
}
```

### KnowledgeItem（知识库条目）
```js
{
  _id: ObjectId,
  category: String,               // v3.0：新增 "condition_pattern"
  item_id: String,
  content: Object,
  version: String,
  is_active: Boolean,
  hit_count: Number,
  positive_feedback_count: Number,
  accuracy_rate: Number,
  updated_at: Date
}
```

---

## 五、API 接口规格

### 5.1 比赛记录接口
```text
POST /api/match
描述：新增记录，自动触发：AI 追问生成 + 对手档案更新 + score_analysis 计算 + 弱点趋势检测
请求体：MatchCreateDTO（含 match_conditions、painful_scene_tag、doubles_data）
响应：{
  match_id: String,
  clarification: { question: String, options: String[] },
  weakness_trend_alert: WeaknessTrendObject | null   // v3.0：趋势告警一并返回
}

POST /api/match/:id/clarification
描述：提交 AI 追问回答，触发完整 AI 反馈生成
请求体：{ selected_option: String, skipped: Boolean }
响应：{
  match: MatchObject,
  opponent_profile: OpponentProfileObject
}

PATCH /api/match/:id/feedback
描述：用户提交"有用/不准确"反馈
请求体：{ is_helpful: Boolean }
响应：{ success: Boolean }
```

### 5.2 对手档案接口（v3.0 增强）
```text
GET /api/opponent/:id
描述：获取对手详情（含弱点雷达图）
响应：OpponentProfileObject（含 weakness_radar）

GET /api/opponent/:id/pre-match-intel   （v3.0 新增）
描述：获取赛前情报
请求参数：?conditions=windy（可选，传入今天条件获取条件适配建议）
响应：{
  opponent: OpponentProfileObject,
  h2h_summary: String,
  win_patterns: String[],
  lose_patterns: String[],
  ai_tactical_advice: String,
  condition_advice: String | null
}
```

### 5.3 球友圈接口（v3.0 新增）
```text
POST /api/circle
描述：创建球友圈
请求体：{ circle_name: String }
响应：{ circle_id: String, invite_link: String }

POST /api/circle/:id/join
描述：通过邀请链接加入球友圈
响应：{ success: Boolean }

GET /api/circle/:id/leaderboard
描述：获取天梯排名
响应：{ rankings: [{ user_id, nickname, win_rate, recent_form, rank_change }] }

POST /api/match/:id/confirm
描述：双方确认比赛结果（天梯用）
请求体：{ confirmed: Boolean }
响应：{ success: Boolean }
```

### 5.4 弱点趋势接口（v3.0 新增）
```text
GET /api/weakness-trends
描述：获取当前弱点趋势告警列表
响应：{ trends: WeaknessTrendObject[] }
```

### 5.5 知识库接口
```text
GET /api/knowledge/match
描述：根据 match 数据返回匹配的知识库条目（供调试用）
请求体：{ opponent_tags, self_state_tags, most_painful_point, painful_scene_tag, score_analysis, match_conditions }
响应：{
  opponent_match: OpponentTypeObject | null,
  failure_pattern: FailurePatternObject | null,
  mental_pattern: MentalPatternObject | null,
  condition_pattern: ConditionPatternObject | null,
  drill: TrainingDrillObject | null
}
```

---

## 六、技术栈与架构
```text
前端：Taro + React（微信小程序）
  状态管理：Zustand
  比分组件：自定义 ScoreInput（支持动态增减盘）
  雷达图组件：自定义 Canvas RadarChart（v3.0 新增）
  语音：wx.startRecord + wx.translateVoice
  战报图：wx.createOffscreenCanvas → canvasToTempFilePath

后端：Node.js + Express
  数据库：MongoDB（Mongoose）
  AI 调用：Qwen API（后端统一代理，Base URL + API Key）
  知识库：JSON 文件加载到内存（启动时缓存，变更时热更新）
  任务队列：对手档案更新 + 月报生成 + 弱点趋势分析为异步任务（Bull Queue）
  实时通信：球友圈比赛确认使用 WebSocket（v3.0 新增）

存储：微信云存储（战报图 + 语音文件）
认证：微信 OAuth（openid 为主键）+ JWT
支付：微信支付
```

---

## 七、功能权限与商业模式
| 功能 | FREE | PRO（¥18/月 或 ¥128/年） |
|------|------|---------------------------|
| 比赛记录（含比分 + 条件 + 场景快选） | ✅ | ✅ |
| AI 三段式复盘 + 追问 | ✅ | ✅ |
| 战报图生成 + 分享 | ✅ | ✅ |
| 对手档案（最近 3 个） | ✅ 限制 | ✅ |
| 对手档案（无限 + 弱点雷达图） | ❌ | ✅ |
| 赛前情报系统 | ❌ | ✅ |
| 同类对手规律聚合 | ❌ | ✅ |
| 弱点趋势追踪 + 告警 | ❌ | ✅ |
| 月度教练报告 | ❌ | ✅ |
| 条件关联分析 | ❌ | ✅ |
| 球友圈 H2H 天梯 | ✅（基础排名） | ✅（完整数据） |
| 宿敌机制 | ✅ | ✅ |
| 双打搭档分析 | ❌ | ✅ |
| 训练计划生成 | ❌ | ✅ |
| 知识库准确性反馈 | ✅ | ✅ |

新用户激励：首次记录完成后自动开启 7 天 PRO，让用户在 3 场记录后看到对手档案的价值，形成付费动机。

---

## 八、MVP 范围与迭代节奏

| 周次 | 交付内容 | 验证指标 |
|------|----------|----------|
| 第 1–2 周 | 秒记页（含逐盘比分 + 场景快选 + 五维标签 + 条件记录）+ AI 追问 + 三段式反馈 | 提交完成率 ≥ 85%，**平均录入时间 ≤ 60 秒** |
| 第 3 周 | 战报图生成 + 对手档案（自动建档 + 规律分析）+ 内测 20–30 个球友 | 分享率 ≥ 25%，次日打开率 ≥ 30% |
| 第 4 周 | 弱点雷达图 + 弱点趋势追踪 | 有弱点数据用户 AI 有用率 vs 无弱点数据用户 |
| 第 5 周 | 赛前情报系统 + 连续记录激励 | 使用赛前情报用户的赛后记录率 ≥ 80% |
| 第 6 周 | 球友圈 + 宿敌机制 + 双打支持 | 邀请转化率 ≥ 15%，圈内对战确认率 ≥ 60% |
| 第 7 周 | 月度教练报告 + 条件关联分析 | PRO 报告查看完成率 ≥ 70% |
| 第 8 周 | 订阅付费墙 + 全面内测优化 | 7 天 PRO 到期付费转化 ≥ 8% |

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
| **赛前情报使用率（v3.0）** | 赛前情报查看 / 有对手档案的比赛 | **≥ 40%** |
| **球友圈邀请转化（v3.0）** | 接受邀请 / 发送邀请 | **≥ 15%** |
| **平均录入时间（v3.0）** | 从打开秒记到提交的中位数耗时 | **≤ 60 秒** |

AI 质量持续优化机制：知识库命中率和 AI 有用率是核心指标，每月根据用户反馈数据识别低命中率的模式条目并优化，形成知识库 → AI 质量 → 用户满意度 → 付费转化的正向飞轮。
