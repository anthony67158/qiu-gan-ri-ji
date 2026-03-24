# 🏗 球感日记 · 架构设计文档 ARCHITECTURE.md

> 本文档记录项目的技术选型决策、目录结构、模块设计、数据模型与代码规范。  
> 所有设计决策均附带理由，方便后续维护和扩展。

---

## 目录

1. [技术栈选择及原因](#一技术栈选择及原因)
2. [项目目录结构](#二项目目录结构)
3. [核心模块说明](#三核心模块说明)
4. [数据模型设计](#四数据模型设计)
5. [代码规范](#五代码规范)

---

## 一、技术栈选择及原因

### 设计三原则

在所有选型决策之前，先明确三条原则——这三条决定了后面的所有选择：

1. **单向依赖**：上层调用下层，下层不知道上层存在。前端 → 路由 → 业务模块 → 服务层 → 存储层，箭头只向下，不反向。
2. **模块自治**：每个业务模块（Match / Opponent / Insight）有自己的路由、服务、数据模型，加新功能只需新增模块，不改动其他模块。
3. **配置外置**：所有会变的东西（API Key、数据库地址、AI Prompt、知识库内容）都不写死在代码里，单独管理。

---

### 1.1 前端层

#### Taro 4 + React + TypeScript

| 对比项 | 原生微信小程序 | ✅ Taro 4 + React |
|--------|-------------|-----------------|
| 学习曲线 | 需要学 WXML/WXSS 独立语法 | React 生态，Trae 生成质量更高 |
| 未来扩展 | 只能跑微信 | 一套代码可扩展到 H5 / 支付宝 / 抖音 |
| 组件复用 | 有限 | 完整 React 生态可用 |
| AI 代码生成质量 | 一般 | 显著更好（React 训练数据最丰富） |
| 性能 | 原生最优 | 页面切换 ≤ 100ms，完全够用 |

**选 TypeScript 的原因：**
- 类型约束让 AI 代码生成更准确（字段名、类型不会乱）
- PRD 中的数据模型天然适合用 interface 定义
- 配合 `shared/types.ts` 实现前后端类型同步

#### Zustand（状态管理）

选 Zustand 而不是 Redux 的原因：Redux 对这个体量的项目过于重，样板代码多。Zustand API 极简，且完全够处理「用户信息 + 当前记录草稿 + 对手档案列表」这几个核心状态。

#### NutUI-React（UI 组件库）

京东出品，专为 Taro + React 设计，与微信小程序兼容性最佳，包含本项目所需的所有移动端组件（表单、标签、弹窗、按钮）。

---

### 1.2 后端层

#### Node.js 20 LTS + Fastify + TypeScript

**选 Fastify 而不是 Express 的原因：**

| 对比项 | Express | ✅ Fastify |
|--------|---------|----------|
| 性能（req/s） | ~15,000 | ~30,000（约快 2 倍） |
| JSON Schema 验证 | 需要额外中间件 | 内置，直接对应 PRD 的 DTO 字段 |
| TypeScript 支持 | 需要手动配置 | 原生支持，类型推断好 |
| 异步错误处理 | 容易遗漏，需要包装 | 原生 async/await 错误捕获 |
| 日志 | 需要 Morgan 等 | 内置 Pino（极低开销） |

AI 调用是 IO 密集型操作，Fastify 的异步处理能力在这个场景下更重要。

#### BullMQ（任务队列）

以下操作**不能阻塞用户响应**，必须异步处理：
- 对手档案重新聚合计算（每次提交 Match 后触发）
- 月度洞察报告生成（AI 调用耗时 3–10 秒）
- AI 对战建议更新

BullMQ 基于 Redis，可靠性高，失败自动重试，是 Node.js 生态最成熟的队列方案。

---

### 1.3 AI 引擎层

#### 火山引擎 REST API + 知识库 JSON

**核心设计：知识库匹配在前，AI 生成在后。**

AI 调用前，后端先做结构化知识匹配，将匹配结果注入 Prompt，让 AI 只做「专业知识 → 个性化表达」的翻译，而不是凭空推理。

```
用户输入（标签 + 文字）
    ↓
knowledge.service：匹配对手类型 / 失误模式 / 训练方案
    ↓
buildPrompt()：将结构化知识 + 用户数据组合成完整 Prompt
    ↓
火山引擎 REST API：生成自然语言输出
    ↓
AI 响应写入 Match.ai_feedback 并缓存
```

**AI Key 安全：** API Key 只存在于后端环境变量，绝不出现在前端代码（小程序代码可被反编译）。

#### Redis AI 响应缓存

相同「对手类型 + 失误模式 + 追问回答」的组合，AI 建议可以缓存 24 小时，避免重复调用 API 浪费费用。

---

### 1.4 数据存储层

#### MongoDB Atlas（主数据库）

| 对比项 | 微信云数据库 CloudBase | ✅ MongoDB Atlas |
|--------|---------------------|---------------|
| 云函数超时 | 较短，AI 请求易超时 | 无此限制 |
| 复杂聚合查询 | 支持有限 | 聚合管道功能完整 |
| 数据迁移 | 锁定，迁出困难 | 标准协议，可随时迁移 |
| 免费套餐 | 够用 | 512MB 免费，够 MVP |
| 知识库匹配逻辑 | 云函数不适合内存缓存 | 自建服务可常驻内存 |

**选 Atlas 而不是微信云开发的核心原因：** 对手档案的跨场次统计聚合需要 MongoDB aggregation pipeline，CloudBase 支持有限。

#### Redis（腾讯云版）

双重用途：AI 响应缓存 + BullMQ 依赖存储。选腾讯云 Redis 是因为与微信生态同区，网络延迟最低。

#### 腾讯云 COS（文件存储）

战报图（Canvas 生成的 PNG）+ 语音文件存储。与微信生态同云，上传下载延迟最低。

#### 知识库 JSON（内存缓存）

知识库文件体积小（< 1MB），服务启动时加载到内存，匹配查询无数据库开销。需要更新知识库内容时，只需编辑 JSON 文件并重启服务，无需数据库迁移。

---

### 1.5 部署方案

#### 腾讯云轻量服务器 2C4G + Docker Compose

```
腾讯云轻量服务器（¥50/月）
└── Docker Compose
    ├── nginx:latest          # 80/443，SSL 终止，反向代理
    ├── node-app:latest       # Fastify 业务服务，端口 3000
    ├── redis:7-alpine        # 仅对内网开放，端口 6379
    └── bullmq-worker:latest  # 独立 Worker 进程

外部 SaaS（不用自己运维）：
    ├── MongoDB Atlas          # 主数据库
    └── 腾讯云 COS             # 文件存储
```

选腾讯云的原因：微信小程序合法域名备案在腾讯云最快，且与 COS、Redis 同区网络延迟最低。

---

## 二、项目目录结构

```
tennis-diary/
│
├── 📁 client/                          # 前端（Taro + React）
│   └── src/
│       ├── 📁 pages/                   # 页面（一个文件夹 = 一个页面）
│       │   ├── index/                  # 首页 · 比赛记录 feed 流
│       │   ├── record/                 # 赛后记录页（核心输入）
│       │   ├── result/                 # AI 战报页（追问 + 三段式输出）
│       │   ├── opponents/              # 对手列表页
│       │   ├── opponent-detail/        # 对手详情页
│       │   ├── insight/                # 月度洞察页
│       │   ├── profile/                # 个人中心
│       │   └── subscribe/              # 订阅升级页
│       │
│       ├── 📁 components/              # 可复用 UI 组件
│       │   ├── MatchCard/              # 比赛记录卡片
│       │   ├── ScoreInput/             # 逐局比分输入（动态增减局）
│       │   ├── TagGroup/               # 标签多选组件
│       │   ├── ShareCard/              # 战报图生成（Canvas）
│       │   ├── OpponentCard/           # 对手档案卡片
│       │   ├── InsightBlock/           # 洞察文字块
│       │   └── ProGate/                # PRO 功能拦截组件
│       │
│       ├── 📁 store/                   # 全局状态（Zustand）
│       │   ├── userStore.ts            # 用户信息 + 订阅状态
│       │   ├── matchStore.ts           # 当前记录草稿
│       │   └── opponentStore.ts        # 对手档案本地缓存
│       │
│       ├── 📁 services/                # API 请求封装
│       │   └── api.ts                  # 统一 axios 实例 + 拦截器
│       │
│       └── 📁 utils/                   # 工具函数
│           ├── canvas.ts               # 战报图生成逻辑
│           ├── voice.ts                # 语音输入封装（wx.startRecord）
│           └── score.ts                # 比分计算工具（大比分、衍生分析）
│
│
├── 📁 server/                          # 后端（Fastify + TypeScript）
│   │
│   ├── 📁 modules/                     # ⭐ 业务模块（每个模块独立，互不直接依赖）
│   │   │
│   │   ├── 📁 auth/                    # 认证模块
│   │   │   ├── auth.route.ts           # 路由定义（POST /auth/login）
│   │   │   ├── auth.service.ts         # 业务逻辑（微信登录、JWT 签发）
│   │   │   └── auth.schema.ts          # 请求/响应 Fastify Schema
│   │   │
│   │   ├── 📁 match/                   # 比赛记录模块（最核心）
│   │   │   ├── match.route.ts          # 路由定义
│   │   │   ├── match.service.ts        # 业务逻辑（创建、查询、触发 AI）
│   │   │   ├── match.model.ts          # Mongoose Schema
│   │   │   ├── match.schema.ts         # Fastify 验证 Schema
│   │   │   └── score.analyzer.ts       # 比分衍生分析（独立文件）
│   │   │
│   │   ├── 📁 opponent/                # 对手档案模块
│   │   │   ├── opponent.route.ts
│   │   │   ├── opponent.service.ts
│   │   │   ├── opponent.model.ts
│   │   │   └── opponent.aggregator.ts  # 统计聚合逻辑（独立文件）
│   │   │
│   │   ├── 📁 insight/                 # 月度洞察模块
│   │   │   ├── insight.route.ts
│   │   │   ├── insight.service.ts
│   │   │   ├── insight.model.ts
│   │   │   └── insight.calculator.ts   # 统计计算逻辑（独立文件）
│   │   │
│   │   └── 📁 subscription/            # 订阅模块
│   │       ├── subscription.route.ts
│   │       └── subscription.service.ts
│   │
│   ├── 📁 services/                    # ⭐ 共享服务（跨模块复用，不依赖任何 module）
│   │   ├── ai.service.ts               # 火山引擎 REST API 封装 + Redis 缓存
│   │   ├── knowledge.service.ts        # 知识库加载 + 标签匹配引擎
│   │   └── storage.service.ts          # 腾讯云 COS 文件上传
│   │
│   ├── 📁 workers/                     # 异步任务（BullMQ Worker，独立进程）
│   │   ├── opponent.worker.ts          # 监听队列：对手档案重新聚合
│   │   └── insight.worker.ts           # 监听队列：月度洞察生成
│   │
│   ├── 📁 prompts/                     # AI Prompt 模板（集中管理，便于迭代）
│   │   ├── matchFeedback.prompt.ts     # 三段式赛后复盘 Prompt
│   │   ├── clarification.prompt.ts     # AI 追问生成 Prompt
│   │   ├── opponentAdvice.prompt.ts    # 对手档案建议 Prompt
│   │   └── monthlyInsight.prompt.ts    # 月度洞察 Prompt
│   │
│   ├── 📁 knowledge/                   # 知识库 JSON（启动时加载到内存）
│   │   └── v1/
│   │       ├── opponent_types.json     # 9 种对手类型（含典型陷阱和应对策略）
│   │       ├── failure_patterns.json   # 8 种失误模式（含心理根源和修正方案）
│   │       ├── training_drills.json    # 12 个训练方案（含执行步骤）
│   │       └── mental_patterns.json    # 5 种心理状态（含短期修复方法）
│   │
│   ├── 📁 middlewares/                 # Fastify 插件 / 中间件
│   │   ├── auth.middleware.ts          # JWT 验证（注入 req.user）
│   │   ├── rateLimit.middleware.ts     # 限流（AI 接口 10 次/分钟）
│   │   └── errorHandler.ts            # 统一错误响应格式
│   │
│   ├── 📁 config/                      # 配置管理
│   │   ├── env.ts                      # 环境变量校验（缺失则启动报错）
│   │   └── db.ts                       # MongoDB + Redis 连接初始化
│   │
│   └── app.ts                          # Fastify 实例创建 + 插件注册 + 路由挂载
│
│
├── 📁 shared/                          # ⭐ 前后端共用（类型 + 枚举常量）
│   ├── types.ts                        # 所有核心 TypeScript 类型定义
│   └── constants.ts                    # 标签枚举、业务常量
│
├── docker-compose.yml                  # 本地开发（Redis + 可选 MongoDB）
├── docker-compose.prod.yml             # 生产环境（Nginx + Node + Redis + Worker）
├── .env.example                        # 环境变量模板（提交到 Git）
├── .env                                # 真实配置（写入 .gitignore，不提交）
└── .gitignore
```

---

## 三、核心模块说明

### 3.1 模块职责边界

> 每个模块只做一件事，职责不交叉。

| 模块 / 服务 | 职责（一句话） | 不做的事 |
|------------|-------------|--------|
| `auth` | 只管"你是谁"：微信登录、JWT 签发、Token 刷新 | 不处理任何业务数据 |
| `match` | 只管"这场球"：记录、比分分析、触发 AI、入队列 | 不直接更新对手档案 |
| `opponent` | 只管"这个人"：档案查询、统计聚合、对战建议 | 不直接读取 Match 数据（通过聚合器） |
| `insight` | 只管"这个月"：月报触发、统计计算、AI 洞察 | 不做单场分析 |
| `subscription` | 只管"钱的事"：订阅状态、微信支付、权限判断 | 不做功能逻辑 |
| `ai.service` | 只管"跟火山引擎说话"：封装 REST、缓存、重试 | 不知道业务是什么 |
| `knowledge.service` | 只管"匹配知识库"：标签匹配对手类型、失误模式 | 不调用 AI |
| `storage.service` | 只管"存文件"：上传战报图、语音文件到 COS | 不处理业务逻辑 |

### 3.2 模块间通信规则

```
✅ 允许：
   match.service      → ai.service          (调用共享服务)
   match.service      → knowledge.service   (调用共享服务)
   match.route        → match.service       (同模块内调用)

❌ 禁止（形成循环依赖）：
   match.service      → opponent.service    (模块间不直接调用)
   opponent.service   → match.service

✅ 跨模块通信的正确方式（通过队列解耦）：
   match.service 完成后  →  推入 BullMQ 队列："opponent:recalculate"
   opponent.worker       →  从队列取出，调用 opponent.service 更新档案
```

### 3.3 BullMQ 队列任务清单

| 队列名 | 触发时机 | 执行内容 |
|--------|---------|---------|
| `opponent:recalculate` | Match 新增 / 删除后 | 重新聚合对手档案的所有统计数据 |
| `ai:opponent-advice` | 对手档案数据更新后 | 重新调用 AI 生成对战建议 |
| `insight:generate` | 月底 cron + 用户手动触发 | 统计计算 → 调用 AI → 存储月报 |

### 3.4 知识库匹配流程

```
1. 输入：opponent_tags + self_state_tags + most_painful_point + score_analysis

2. 对手类型匹配（opponent_types.json）
   规则：标签覆盖率 ≥ 50% 的类型视为命中
   输出：命中的对手类型（含典型陷阱、必须做、必须避免）

3. 失误模式检测（failure_patterns.json）
   规则：标签 + 关键词 + 比分衍生信息 联合判断
   输出：命中的失误模式（含心理根源、修正建议）

4. 心理状态匹配（mental_patterns.json）
   规则：self_state_tags 直接映射
   输出：对应的身体表现描述 + 短期修复方案

5. 训练方案选择（training_drills.json）
   规则：优先 failurePattern 对应训练，次选 opponentType 对应训练
   输出：1 个可独立完成的训练方案（含步骤、时长、关键提示）

6. 将以上结果注入 Prompt，AI 只做"翻译"，不做"推理"
```

---

## 四、数据模型设计

### 4.1 shared/types.ts（最优先生成，所有文件从这里引入）

```typescript
// shared/types.ts

// ─── 枚举 ────────────────────────────────────────────────────
export type MatchResult = 'WIN' | 'LOSE' | 'DRAW' | 'PRACTICE';
export type MatchType   = 'SINGLE' | 'DOUBLE' | 'PRACTICE';
export type SubPlan     = 'FREE' | 'MONTHLY' | 'YEARLY';
export type SubStatus   = 'ACTIVE' | 'EXPIRED' | 'TRIAL';

// 标签枚举（前后端共用，as const 防止拼写错误）
export const OPPONENT_TAGS = [
  '正手强', '反手强', '发球好', '上网多',
  '体力好', '打法稳', '失误多', '节奏快', '节奏慢'
] as const;
export type OpponentTag = typeof OPPONENT_TAGS[number];

export const SELF_STATE_TAGS = [
  '心态稳', '心态崩了', '体力差', '失误多',
  '脚步慢', '发球差', '专注度不够', '状态好'
] as const;
export type SelfStateTag = typeof SELF_STATE_TAGS[number];

export const TACTICS_TAGS = [
  '多打反手', '发球后抢攻', '多上网',
  '多放小球', '拉开正手位', '多切削拖节奏'
] as const;
export type TacticsTag = typeof TACTICS_TAGS[number];

// ─── 比分类型 ────────────────────────────────────────────────
export interface SetScore {
  set_number: number;         // 第几局（从 1 开始）
  score_self: number;         // 我的分
  score_opponent: number;     // 对手的分
}

export interface MatchScore {
  sets: SetScore[];
  total_self: number;         // 大比分（我）
  total_opponent: number;     // 大比分（对手）
}

// 后端自动计算，前端只读
export interface ScoreAnalysis {
  total_sets: number;
  went_to_deciding_set: boolean;    // 打了决胜盘
  collapsed_from_leading: boolean;  // 领先后被追平
  comeback_win: boolean;            // 逆转赢
  close_sets: number[];             // 紧张局局数（差 ≤ 2 或抢七）
  score_summary: string;            // "2:1（6:3, 4:6, 7:6）"
}

// ─── AI 相关类型 ─────────────────────────────────────────────
export interface AIClarification {
  question: string;
  options: string[];
  selected_option?: string;
  skipped: boolean;
}

export interface AIFeedback {
  key_problem: string;          // 今天的关键问题
  next_tactic: string;          // 下次怎么打
  training_suggestion: string;  // 本周练什么
  knowledge_used: {
    opponent_type_id?: string;
    failure_pattern_id?: string;
    drill_id?: string;
  };
  is_helpful?: boolean;         // 用户反馈
  generated_at: string;
}

export interface TagStat {
  tag: string;
  count: number;
  ratio: number;  // 0–1，出现频率
}

// ─── API DTO ─────────────────────────────────────────────────
export interface CreateMatchDTO {
  opponent_name_alias?: string;
  match_result: MatchResult;
  match_type?: MatchType;
  score?: MatchScore;
  most_painful_point?: string;
  opponent_tags?: OpponentTag[];
  self_state_tags?: SelfStateTag[];
  tactics_used_tags?: TacticsTag[];
  date_time?: string;
  location?: string;
}

export interface SubmitClarificationDTO {
  selected_option: string;
  skipped: boolean;
}

// 统一 API 响应包装
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
```

### 4.2 Mongoose Schema（服务端）

#### Match（比赛记录）

```typescript
// server/modules/match/match.model.ts

const MatchSchema = new Schema({
  user_id:              { type: ObjectId, ref: 'User',            required: true, index: true },
  opponent_id:          { type: ObjectId, ref: 'OpponentProfile' },
  opponent_name_alias:  String,

  match_result: { type: String, enum: ['WIN','LOSE','DRAW','PRACTICE'], required: true },
  match_type:   { type: String, enum: ['SINGLE','DOUBLE','PRACTICE'], default: 'SINGLE' },

  score: {
    sets: [{ set_number: Number, score_self: Number, score_opponent: Number }],
    total_self:     { type: Number, default: 0 },
    total_opponent: { type: Number, default: 0 },
  },
  score_analysis: Mixed,   // 系统自动填充

  most_painful_point: { type: String, maxlength: 500 },
  voice_input_url:    String,

  opponent_tags:     [String],
  self_state_tags:   [String],
  tactics_used_tags: [String],

  ai_clarification: {
    question: String, options: [String],
    selected_option: String, skipped: { type: Boolean, default: false }
  },

  ai_feedback: {
    key_problem: String, next_tactic: String, training_suggestion: String,
    knowledge_used: { opponent_type_id: String, failure_pattern_id: String, drill_id: String },
    is_helpful: Boolean, generated_at: Date
  },

  share_image_url: String,
  date_time: { type: Date, default: Date.now, index: true },
  location: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 复合索引（覆盖最高频的查询场景）
MatchSchema.index({ user_id: 1, date_time: -1 });       // 首页 feed
MatchSchema.index({ user_id: 1, opponent_id: 1 });       // 对手档案关联
MatchSchema.index({ user_id: 1, match_result: 1 });      // 胜负筛选
```

#### OpponentProfile（对手档案）

```typescript
// server/modules/opponent/opponent.model.ts

const OpponentSchema = new Schema({
  user_id:              { type: ObjectId, required: true },
  opponent_name_alias:  { type: String, required: true },

  total_matches: { type: Number, default: 0 },
  wins:          { type: Number, default: 0 },
  losses:        { type: Number, default: 0 },
  draws:         { type: Number, default: 0 },
  win_rate:      { type: Number, default: 0 },  // 自动计算

  aggregated_opponent_tags: [{ tag: String, count: Number, ratio: Number }],
  tactics_when_win:         [{ tag: String, count: Number, ratio: Number }],
  patterns_when_lose:       [{ tag: String, count: Number, ratio: Number }],

  score_patterns: {
    avg_sets_per_match:            Number,
    deciding_set_count:            Number,
    deciding_set_win_rate:         Number,
    collapsed_from_leading_count:  Number,
  },

  ai_opponent_advice: String,
  last_match_date: Date,
}, { timestamps: true });

// 同一用户下，对手昵称唯一
OpponentSchema.index({ user_id: 1, opponent_name_alias: 1 }, { unique: true });
```

#### InsightReport（月度洞察）

```typescript
// server/modules/insight/insight.model.ts

const InsightSchema = new Schema({
  user_id:      { type: ObjectId, required: true, index: true },
  period_start: Date,
  period_end:   Date,
  matches_count: Number,

  content: {
    total_summary:       String,
    failure_patterns:    [String],
    tough_opponent_types: String,
    strength_patterns:   String,
    training_focus:      String,
  },

  raw_stats:    Mixed,   // 原始统计数据，方便重新生成报告
  generated_at: Date,
}, { timestamps: true });

InsightSchema.index({ user_id: 1, period_start: -1 });
```

### 4.3 数据关系

```
User ─────────────── Match           (1 : N)
User ─────────────── OpponentProfile (1 : N)
User ─────────────── InsightReport   (1 : N)
Match ────────────── OpponentProfile (N : 1，通过 opponent_id)

约束：
  · 所有查询强制带 user_id（用户间数据完全隔离）
  · OpponentProfile 只由 Match 数据聚合生成，禁止手动写入
  · InsightReport 只读，由系统定时或手动触发生成
  · match.score_analysis 由后端 score.analyzer.ts 自动填充，前端不传
```

---

## 五、代码规范

### 5.1 文件命名

```
规则：[模块名].[类型].ts

后端示例：
  match.route.ts          ← 路由
  match.service.ts        ← 业务逻辑
  match.model.ts          ← 数据模型
  match.schema.ts         ← Fastify 验证 Schema
  score.analyzer.ts       ← 独立工具函数（功能描述命名）

前端示例：
  pages/record/index.tsx  ← 页面主文件
  pages/record/index.less ← 样式
  components/ScoreInput/index.tsx
```

### 5.2 函数命名

```typescript
// 路由层：动词 + 名词（描述 HTTP 操作）
async function createMatch(req, reply) {}
async function getMatchById(req, reply) {}
async function listMatches(req, reply) {}

// 服务层：动词 + 业务术语（描述业务动作）
async function createMatchRecord(dto: CreateMatchDTO, userId: string) {}
async function generateAIFeedback(matchId: string) {}
async function recalculateOpponentStats(opponentId: string) {}

// 纯工具函数：动词 + 名词（无副作用，可单元测试）
function analyzeScore(score: MatchScore): ScoreAnalysis {}
function matchOpponentType(tags: string[], kb: KnowledgeBase) {}
function buildMatchFeedbackPrompt(input: MatchFeedbackInput): string {}
```

### 5.3 统一错误处理

```typescript
// 1. 自定义错误类（server/utils/AppError.ts）
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) { super(message); }
}

// 2. 使用示例（在 service 层抛出）
if (!match) throw new AppError('比赛记录不存在', 404, 'MATCH_NOT_FOUND');
if (!req.user.isPro) throw new AppError('此功能需要 PRO 会员', 403, 'PRO_REQUIRED');

// 3. 统一错误响应（在 errorHandler.ts 中注册）
// 前端永远收到标准格式：
// { success: false, error: "比赛记录不存在", code: "MATCH_NOT_FOUND" }
```

### 5.4 数据库查询安全规范

```typescript
// ✅ 所有查询必须带 user_id（防止越权访问）
Match.findOne({ _id: matchId, user_id: req.user.id });
OpponentProfile.find({ user_id: req.user.id });

// ❌ 禁止（任何人都能查到这条数据）
Match.findById(matchId);
```

### 5.5 环境变量管理

```typescript
// server/config/env.ts
// 服务启动时校验所有必要变量，缺失则直接报错，不允许带着错误配置启动

const REQUIRED_VARS = [
  'MONGODB_URI', 'REDIS_URL', 'JWT_SECRET',
  'VOLCANO_API_KEY', 'VOLCANO_MODEL_ID',
  'WECHAT_APP_ID', 'WECHAT_APP_SECRET'
];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(`❌ 缺少必要环境变量：${key}，请检查 .env 文件`);
  }
}

export const env = {
  mongoUri:       process.env.MONGODB_URI!,
  redisUrl:       process.env.REDIS_URL!,
  jwtSecret:      process.env.JWT_SECRET!,
  volcanoApiKey:  process.env.VOLCANO_API_KEY!,
  volcanoModelId: process.env.VOLCANO_MODEL_ID!,
  wechatAppId:    process.env.WECHAT_APP_ID!,
  wechatAppSecret: process.env.WECHAT_APP_SECRET!,
};
```

### 5.6 API 响应统一格式

```typescript
// 后端统一封装（在 reply helper 中注册）
reply.success(data)         // → { success: true, data }
reply.fail('错误信息', 404, 'NOT_FOUND') // → { success: false, error, code }

// 前端统一拦截（services/api.ts）
axiosInstance.interceptors.response.use(
  res => res.data.data,   // 成功直接返回 data 字段，业务代码不用每次解包
  err => {
    const code = err.response?.data?.code;
    if (code === 'AUTH_EXPIRED') { /* 跳转登录 */ }
    if (code === 'PRO_REQUIRED') { /* 跳转升级页 */ }
    return Promise.reject(err.response?.data?.error || '网络错误');
  }
);
```

### 5.7 AI Prompt 管理规范

```typescript
// ✅ Prompt 集中在 server/prompts/ 目录，每类一个文件
// 禁止在 service 文件里直接写字符串 Prompt

// server/prompts/matchFeedback.prompt.ts
export function buildMatchFeedbackPrompt(input: MatchFeedbackInput): string {
  return `
你是专注业余网球玩家（NTRP 2.5–4.5）成长的战术教练。
风格：口语化、直接、具体，不说"保持冷静""继续努力"这类废话。
建议必须包含：时机 + 动作 + 落点/目的。

## 比赛数据
${JSON.stringify(input.matchData, null, 2)}

## 知识库匹配结果
${JSON.stringify(input.knowledgeContext, null, 2)}

## 输出格式（严格遵守，总字数 ≤ 180）
📋 今天的关键问题
[1–2 行]

💡 下次碰到同类对手，试试这 1 件事
[1–2 行，含具体时机 + 动作 + 落点]

📅 下次训练可以练
[1 行，含训练内容 + 时长 + 关键提示]
  `.trim();
}
```

### 5.8 给 Trae 的分批生成顺序

按以下顺序生成，每批跑通后再进入下一批：

```
第 1 批（基础骨架）
  shared/types.ts → shared/constants.ts
  server/config/env.ts → server/config/db.ts → server/app.ts

第 2 批（认证闭环）
  server/modules/auth/（3 个文件）
  验证：能完成微信登录，拿到 JWT

第 3 批（核心：记录 + AI）
  server/modules/match/（5 个文件）
  server/services/ai.service.ts
  server/services/knowledge.service.ts
  server/prompts/matchFeedback.prompt.ts
  验证：提交一场记录，收到 AI 三段式反馈

第 4 批（对手档案）
  server/modules/opponent/（4 个文件）
  server/workers/opponent.worker.ts
  验证：提交 3 场记录后，对手档案自动更新

第 5 批（前端核心页面）
  client/pages/record/ → client/pages/result/
  client/components/ScoreInput/ → client/components/TagGroup/
  验证：小程序可以完整走完记录 → 查看 AI 反馈流程

第 6 批（剩余功能）
  insight 模块 → subscription 模块 → 其余前端页面
```

---

*最后更新：2026-03-24*
