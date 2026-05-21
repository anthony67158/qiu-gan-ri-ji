# 🏗 球感日记 · 架构设计文档 ARCHITECTURE v3.0

> 本文档记录项目的技术选型决策、目录结构、模块设计、数据模型与代码规范。  
> 所有设计决策均附带理由，方便后续维护和扩展。  
> **v3.0 核心架构变更**：新增弱点趋势追踪引擎、赛前情报服务、球友圈社交模块、双打数据流、比赛条件分析管线、五维标签体系、WebSocket 实时确认通道。

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
2. **模块自治**：每个业务模块（Match / Opponent / Insight / Trend / Intel / Social）有自己的路由、服务、数据模型，加新功能只需新增模块，不改动其他模块。
3. **配置外置**：所有会变的东西（API Key、数据库地址、AI Prompt、知识库内容、标签枚举）都不写死在代码里，单独管理。

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
- v3.0 新增的五维标签体系、比赛条件枚举、双打数据结构都强依赖类型校验

#### Zustand（状态管理）

选 Zustand 而不是 Redux 的原因：Redux 对这个体量的项目过于重，样板代码多。Zustand API 极简，且完全够处理「用户信息 + 当前记录草稿 + 对手档案列表 + 球友圈状态 + 赛前情报缓存」这几个核心状态。

#### NutUI-React（UI 组件库）

京东出品，专为 Taro + React 设计，与微信小程序兼容性最佳，包含本项目所需的所有移动端组件（表单、标签、弹窗、按钮、雷达图基础绘制）。

#### ECharts-for-WeChat（v3.0 新增）

v3.0 新增弱点雷达图（五轴可视化）和 H2H 趋势折线图，需要轻量级图表库。ECharts 微信版体积可控（按需引入 radar + line 即可），渲染性能在小程序中表现稳定。

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
| WebSocket 支持 | 需要额外库 | `@fastify/websocket` 原生集成 |

AI 调用是 IO 密集型操作，Fastify 的异步处理能力在这个场景下更重要。

#### @fastify/websocket（v3.0 新增）

球友圈比赛双向确认需要实时通信。选 `@fastify/websocket` 而非独立 Socket.IO 的原因：
- 与 Fastify 生态无缝集成，共享路由和中间件（含 JWT 验证）
- 本项目 WebSocket 场景简单（仅比赛确认推送），不需要 Socket.IO 的 room/namespace 复杂特性
- 减少一个外部依赖

#### BullMQ（任务队列）

以下操作**不能阻塞用户响应**，必须异步处理：
- 对手档案重新聚合计算（每次提交 Match 后触发）
- 月度洞察报告生成（AI 调用耗时 3–10 秒）
- AI 对战建议更新
- **弱点趋势检测与告警推送（v3.0 新增）**
- **赛前情报预生成（v3.0 新增）**
- **双打搭档档案更新（v3.0 新增）**
- **球友圈排名重算（v3.0 新增）**

BullMQ 基于 Redis，可靠性高，失败自动重试，是 Node.js 生态最成熟的队列方案。

---
... +9 lines

Show all lines
用户输入（五维标签 + 场景快选 + 文字 + 比赛条件）
↓
knowledge.service：匹配对手类型 / 失误模式 / 训练方案 / 条件影响
↓
trend.service：检测弱点趋势告警（v3.0 新增）
↓
buildPrompt ()：将结构化知识 + 用户数据 + 弱点趋势 + 条件关联 组合成完整 Prompt
↓
Qwen REST API：生成结构化 JSON（v3.1 卡片化分析）
↓
AI 响应写入 Match.ai_analysis（version=v3.1）并缓存

**v3.0 知识库扩展：** 从 4 类扩展到 5 类 JSON 文件：
- `opponent_types.json`：9 → 12 种对手类型
- `failure_patterns.json`：8 → 10 种失误模式
- `training_drills.json`：12 → 15 个训练方案
- `mental_patterns.json`：5 → 6 种心理状态
- `condition_patterns.json`（v3.0 新增）：场地/天气/身体条件对打法的影响规律

**AI Key 安全：** API Key 只存在于后端环境变量，绝不出现在前端代码（小程序代码可被反编译）。

#### Redis AI 响应缓存

相同「对手类型 + 失误模式 + 追问回答 + 条件模式」的组合，AI 建议可以缓存 24 小时，避免重复调用 API 浪费费用。

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

**选 Atlas 而不是微信云开发的核心原因：** v3.0 新增的弱点趋势追踪、球友圈天梯排名、赛前情报聚合都需要复杂的 MongoDB aggregation pipeline，CloudBase 支持有限。

#### Redis（腾讯云版）

三重用途：AI 响应缓存 + BullMQ 依赖存储 + **WebSocket 连接状态管理（v3.0 新增）**。选腾讯云 Redis 是因为与微信生态同区，网络延迟最低。

#### 腾讯云 COS（文件存储）

战报图（Canvas 生成的 PNG）+ 语音文件存储。与微信生态同云，上传下载延迟最低。

#### 知识库 JSON（内存缓存）

知识库文件体积小（v3.0 扩展后仍 < 1.5MB），服务启动时加载到内存，匹配查询无数据库开销。需要更新知识库内容时，只需编辑 JSON 文件并重启服务，无需数据库迁移。

---

### 1.5 部署方案

#### 腾讯云轻量服务器 2C4G + Docker Compose
腾讯云轻量服务器（¥50 / 月）
└── Docker Compose
├── nginx:latest # 80/443，SSL 终止，反向代理，WebSocket 升级
├── node-app:latest # Fastify 业务服务 + WebSocket，端口 3000
├── redis:7-alpine # 仅对内网开放，端口 6379
└── bullmq-worker:latest # 独立 Worker 进程（含趋势检测 + 情报预生成）
外部 SaaS（不用自己运维）：
├── MongoDB Atlas # 主数据库
└── 腾讯云 COS # 文件存储

**v3.0 Nginx 配置变更：** 需新增 WebSocket 升级配置（`proxy_set_header Upgrade $http_upgrade`），用于球友圈比赛确认的实时推送。

选腾讯云的原因：微信小程序合法域名备案在腾讯云最快，且与 COS、Redis 同区网络延迟最低。

---

## 二、项目目录结构
tennis-diary/
│
├── 📁 client/ # 前端（Taro + React）
│ └── src/
│ ├── 📁 pages/ # 页面（一个文件夹 = 一个页面）
│ │ ├── index/ # 首页・比赛记录 feed 流
│ │ ├── record/ # 赛后记录页（核心输入，含场景快选 + 条件标记）
│ │ ├── result/ # AI 战报页（追问 + 三段式输出 + 条件关联提示）
│ │ ├── opponents/ # 对手列表页（含宿敌标记）
│ │ ├── opponent-detail/ # 对手详情页（含弱点雷达图 + H2H 趋势）
│ │ ├── pre-match-intel/ # 赛前情报页（v3.0 新增）
│ │ ├── weakness-trend/ # 弱点趋势页（v3.0 新增）
│ │ ├── friend-circle/ # 球友圈天梯页（v3.0 新增）
│ │ ├── insight/ # 月度洞察页（人格化教练语气）
│ │ ├── profile/ # 个人中心
│ │ └── subscribe/ # 订阅升级页
│ │
│ ├── 📁 components/ # 可复用 UI 组件
│ │ ├── MatchCard/ # 比赛记录卡片
│ │ ├── ScoreInput/ # 逐局比分输入（动态增减局）
│ │ ├── TagGroup/ # 标签多选组件（支持五维分组展示）
│ │ ├── SceneQuickPick/ # 场景快选组件（v3.0 新增）
│ │ ├── ConditionPicker/ # 比赛条件选择器（v3.0 新增）
│ │ ├── WeaknessRadar/ # 弱点雷达图组件（v3.0 新增，ECharts）
│ │ ├── H2HTrendChart/ # H2H 趋势折线图（v3.0 新增，ECharts）
│ │ ├── IntelCard/ # 赛前情报卡片（v3.0 新增）
│ │ ├── TrendAlert/ # 弱点趋势告警组件（v3.0 新增）
│ │ ├── CircleLeaderboard/ # 球友圈排行榜组件（v3.0 新增）
│ │ ├── DoublesPartnerPick/ # 双打搭档选择器（v3.0 新增）
│ │ ├── ShareCard/ # 战报图生成（Canvas）
│ │ ├── OpponentCard/ # 对手档案卡片（含宿敌徽章）
│ │ ├── InsightBlock/ # 洞察文字块
│ │ └── ProGate/ # PRO 功能拦截组件
│ │
│ ├── 📁 store/ # 全局状态（Zustand）
│ │ ├── userStore.ts # 用户信息 + 订阅状态
│ │ ├── matchStore.ts # 当前记录草稿（含条件 + 场景快选）
│ │ ├── opponentStore.ts # 对手档案本地缓存
│ │ ├── intelStore.ts # 赛前情报缓存（v3.0 新增）
│ │ ├── circleStore.ts # 球友圈状态（v3.0 新增）
│ │ └── wsStore.ts # WebSocket 连接状态（v3.0 新增）
│ │
│ ├── 📁 services/ # API 请求封装
│ │ ├── api.ts # 统一 axios 实例 + 拦截器
│ │ └── ws.ts # WebSocket 客户端管理（v3.0 新增）
│ │
│ └── 📁 utils/ # 工具函数
│ ├── canvas.ts # 战报图生成逻辑
│ ├── voice.ts # 语音输入封装（wx.startRecord）
│ ├── score.ts # 比分计算工具（大比分、衍生分析）
│ └── radar.ts # 雷达图数据格式化（v3.0 新增）
│
│
├── 📁 server/ # 后端（Fastify + TypeScript）
│ │
│ ├── 📁 modules/ # ⭐ 业务模块（每个模块独立，互不直接依赖）
│ │ │
│ │ ├── 📁 auth/ # 认证模块
│ │ │ ├── auth.route.ts # 路由定义（POST /auth/login）
│ │ │ ├── auth.service.ts # 业务逻辑（微信登录、JWT 签发）
│ │ │ └── auth.schema.ts # 请求 / 响应 Fastify Schema
│ │ │
│ │ ├── 📁 match/ # 比赛记录模块（最核心）
│ │ │ ├── match.route.ts # 路由定义
│ │ │ ├── match.service.ts # 业务逻辑（创建、查询、触发 AI、条件记录）
│ │ │ ├── match.model.ts # Mongoose Schema（含 doubles_data、match_conditions）
│ │ │ ├── match.schema.ts # Fastify 验证 Schema
│ │ │ └── score.analyzer.ts # 比分衍生分析（独立文件）
│ │ │
│ │ ├── 📁 opponent/ # 对手档案模块
│ │ │ ├── opponent.route.ts
│ │ │ ├── opponent.service.ts # 含弱点雷达计算 calculateWeaknessRadar ()
│ │ │ ├── opponent.model.ts # 含 weakness_radar、is_nemesis 字段
│ │ │ └── opponent.aggregator.ts # 统计聚合逻辑（含五维标签聚合）
│ │ │
│ │ ├── 📁 trend/ # ⭐ 弱点趋势追踪模块（v3.0 新增）
│ │ │ ├── trend.route.ts # GET /api/trend/alerts, GET /api/trend/history
│ │ │ ├── trend.service.ts # detectWeaknessTrends () 核心算法
│ │ │ ├── trend.model.ts # WeaknessTrend Mongoose Schema
│ │ │ └── trend.detector.ts # 多维度趋势检测引擎（独立文件）
│ │ │
│ │ ├── 📁 intel/ # ⭐ 赛前情报模块（v3.0 新增）
│ │ │ ├── intel.route.ts # GET /api/intel/:opponent_id
│ │ │ ├── intel.service.ts # 聚合对手雷达 + 输赢规律 + 生成战术建议
│ │ │ └── intel.builder.ts # 情报卡数据构建器（独立文件）
│ │ │
│ │ ├── 📁 social/ # ⭐ 球友圈模块（v3.0 新增）
│ │ │ ├── social.route.ts # 球友圈 CRUD、排名、邀请
│ │ │ ├── social.service.ts # 天梯排名计算、宿敌标记、双向确认
│ │ │ ├── social.model.ts # FriendCircle Mongoose Schema
│ │ │ └── social.ws.ts # WebSocket 事件处理（比赛确认推送）
│ │ │
│ │ ├── 📁 doubles/ # ⭐ 双打搭档模块（v3.0 新增）
│ │ │ ├── doubles.route.ts # 搭档列表、搭档详情
│ │ │ ├── doubles.service.ts # 搭档档案聚合
│ │ │ └── doubles.model.ts # DoublesPartnerProfile Mongoose Schema
│ │ │
│ │ ├── 📁 insight/ # 月度洞察模块（v3.0 升级：人格化教练语气）
│ │ │ ├── insight.route.ts
│ │ │ ├── insight.service.ts
│ │ │ ├── insight.model.ts
│ │ │ └── insight.calculator.ts # 统计计算（含条件关联洞察 + 弱点趋势曲线）
│ │ │
│ │ └── 📁 subscription/ # 订阅模块
│ │ ├── subscription.route.ts
│ │ └── subscription.service.ts
│ │
│ ├── 📁 services/ # ⭐ 共享服务（跨模块复用，不依赖任何 module）
│ │ ├── ai.service.ts # Qwen REST API 封装 + Redis 缓存
│ │ ├── knowledge.service.ts # 知识库加载 + 标签匹配引擎（含 condition_patterns）
│ │ ├── storage.service.ts # 腾讯云 COS 文件上传
│ │ └── ws.service.ts # WebSocket 连接管理服务（v3.0 新增）
│ │
│ ├── 📁 workers/ # 异步任务（BullMQ Worker，独立进程）
│ │ ├── opponent.worker.ts # 监听队列：对手档案重新聚合 + 雷达图更新
│ │ ├── insight.worker.ts # 监听队列：月度洞察生成（人格化教练语气）
│ │ ├── trend.worker.ts # 监听队列：弱点趋势检测（v3.0 新增）
│ │ ├── intel.worker.ts # 监听队列：赛前情报预生成（v3.0 新增）
│ │ ├── doubles.worker.ts # 监听队列：双打搭档档案更新（v3.0 新增）
│ │ └── social.worker.ts # 监听队列：球友圈排名重算（v3.0 新增）
│ │
│ ├── 📁 prompts/ # AI Prompt 模板（集中管理，便于迭代）
│ │ ├── matchFeedback.prompt.ts # v3.1 单场比赛卡片化 JSON 分析 Prompt
│ │ ├── clarification.prompt.ts # AI 追问生成 Prompt（含风况 + 双打模板）
│ │ ├── opponentAdvice.prompt.ts # 对手档案建议 Prompt
│ │ ├── preMatchIntel.prompt.ts # v3.1 赛前情报卡片化 JSON Prompt
│ │ ├── monthlyInsight.prompt.ts # 月度洞察 Prompt（v3.0 升级：教练人格化语气）
│ │ └── trendAlert.prompt.ts # 弱点趋势告警文案 Prompt（v3.0 新增）
│ │ └── trendAnalysis.prompt.ts # v3.1 弱点趋势卡片化 JSON Prompt
│ │
│ ├── 📁 knowledge/ # 知识库 JSON（启动时加载到内存）
│ │ └── v1/
│ │ ├── opponent_types.json # 12 种对手类型（v3.0：9→12，含典型陷阱和应对策略）
│ │ ├── failure_patterns.json # 10 种失误模式（v3.0：8→10，含心理根源和修正方案）
│ │ ├── training_drills.json # 15 个训练方案（v3.0：12→15，含执行步骤）
│ │ ├── mental_patterns.json # 6 种心理状态（v3.0：5→6，含短期修复方法）
│ │ └── condition_patterns.json # ⭐ 条件影响规律（v3.0 新增：场地 / 天气 / 身体）
│ │
│ ├── 📁 middlewares/ # Fastify 插件 / 中间件
│ │ ├── auth.middleware.ts # JWT 验证（注入 req.user）
│ │ ├── rateLimit.middleware.ts # 限流（AI 接口 10 次 / 分钟）
│ │ ├── wsAuth.middleware.ts # WebSocket JWT 验证（v3.0 新增）
│ │ └── errorHandler.ts # 统一错误响应格式
│ │
│ ├── 📁 config/ # 配置管理
│ │ ├── env.ts # 环境变量校验（缺失则启动报错）
│ │ ├── db.ts # MongoDB + Redis 连接初始化
│ │ └── ws.ts # WebSocket 配置（v3.0 新增）
│ │
│ └── app.ts # Fastify 实例创建 + 插件注册 + 路由挂载 + WebSocket 初始化
│
│
├── 📁 shared/ # ⭐ 前后端共用（类型 + 枚举常量）
│ ├── types.ts # 所有核心 TypeScript 类型定义
│ └── constants.ts # 标签枚举（五维体系 + 场景快选 + 条件选项）、业务常量
│
├── docker-compose.yml # 本地开发（Redis + 可选 MongoDB）
├── docker-compose.prod.yml # 生产环境（Nginx + Node + Redis + Worker）
├── .env.example # 环境变量模板（提交到 Git）
├── .env # 真实配置（写入 .gitignore，不提交）
└── .gitignore

---

## 三、核心模块说明

### 3.1 模块职责边界

> 每个模块只做一件事，职责不交叉。

| 模块 / 服务 | 职责（一句话） | 不做的事 |
|------------|-------------|--------|
| `auth` | 只管"你是谁"：微信登录、JWT 签发、Token 刷新 | 不处理任何业务数据 |
| `match` | 只管"这场球"：记录（含比赛条件 + 场景快选 + 双打数据）、比分分析、触发 AI、入队列 | 不直接更新对手档案 |
| `opponent` | 只管"这个人"：档案查询、统计聚合、对战建议、弱点雷达图 | 不直接读取 Match 数据（通过聚合器） |
| `trend` | 只管"跨场规律"：弱点趋势检测、告警推送、趋势历史查询 | 不做单场分析，不修改 Match 数据 |
| `intel` | 只管"赛前准备"：聚合对手数据、生成赛前情报卡、战术建议 | 不修改任何档案数据 |
| `social` | 只管"圈子"：球友圈管理、天梯排名、宿敌标记、比赛确认 | 不分析比赛内容 |
| `doubles` | 只管"搭档"：双打搭档档案、配合数据聚合 | 不处理单打数据 |
| `insight` | 只管"这个月"：月报触发、统计计算（含条件关联）、AI 教练语气洞察 | 不做单场分析 |
| `subscription` | 只管"钱的事"：订阅状态、微信支付、权限判断 | 不做功能逻辑 |
| `ai.service` | 只管"跟Qwen说话"：封装 REST、缓存、重试 | 不知道业务是什么 |
| `knowledge.service` | 只管"匹配知识库"：标签匹配对手类型、失误模式、条件影响 | 不调用 AI |
| `storage.service` | 只管"存文件"：上传战报图、语音文件到 COS | 不处理业务逻辑 |
| `ws.service` | 只管"实时通道"：WebSocket 连接管理、消息推送 | 不处理业务逻辑 |

### 3.2 模块间通信规则
✅ 允许：
match.service → ai.service (调用共享服务)
match.service → knowledge.service (调用共享服务)
match.route → match.service (同模块内调用)
intel.service → ai.service (调用共享服务)
social.ws → ws.service (调用共享服务)
❌ 禁止（形成循环依赖）：
match.service → opponent.service (模块间不直接调用)
opponent.service → match.service
trend.service → match.service (通过队列解耦)
social.service → match.service
✅ 跨模块通信的正确方式（通过队列解耦）：
match.service 完成后 → 推入 BullMQ 队列：
├── "opponent:recalculate" → opponent.worker 更新对手档案 + 雷达图
├── "trend:detect" → trend.worker 检测弱点趋势（v3.0）
├── "doubles:update" → doubles.worker 更新搭档档案（v3.0，仅双打）
└── "social:rank-update" → social.worker 更新球友圈排名（v3.0）
opponent.worker 完成后 →
└── "intel:pre-generate" → intel.worker 预生成赛前情报

### 3.3 BullMQ 队列任务清单

| 队列名 | 触发时机 | 执行内容 |
|--------|---------|---------|
| `opponent:recalculate` | Match 新增 / 删除后 | 重新聚合对手档案的所有统计数据 + 五维雷达图 + 宿敌判定 |
| `ai:opponent-advice` | 对手档案数据更新后 | 重新调用 AI 生成对战建议 |
| `trend:detect` | Match 新增后 | 弱点趋势检测（4 维度扫描），命中则生成告警（v3.0 新增） |
| `intel:pre-generate` | 对手档案更新后 | 预生成赛前情报卡（含雷达 + 规律 + 建议），写入缓存（v3.0 新增） |
| `doubles:update` | 双打 Match 新增后 | 更新搭档配合档案（v3.0 新增） |
| `social:rank-update` | Match 新增后（需双方确认） | 重算球友圈天梯排名（v3.0 新增） |
| `social:confirm-notify` | 球友提交比赛后 | WebSocket 推送确认请求给对方（v3.0 新增） |
| `insight:generate` | 月底 cron + 用户手动触发 | 统计计算（含条件关联洞察 + 弱点趋势曲线）→ AI 教练语气 → 存储月报 |

### 3.4 知识库匹配流程（v3.0 升级）
输入：opponent_tags (五维) + self_state_tags + painful_scene_tag
most_painful_point + score_analysis + match_conditions
对手类型匹配（opponent_types.json，12 种）
规则：五维标签覆盖率 ≥ 50% 的类型视为命中（按维度加权匹配）
输出：命中的对手类型（含典型陷阱、必须做、必须避免）
失误模式检测（failure_patterns.json，10 种）
规则：标签 + 场景快选标签 + 关键词 + 比分衍生信息 联合判断
输出：命中的失误模式（含心理根源、修正建议）
心理状态匹配（mental_patterns.json，6 种）
规则：self_state_tags 直接映射
输出：对应的身体表现描述 + 短期修复方案
条件影响匹配（condition_patterns.json，v3.0 新增）
规则：match_conditions 的 surface + weather + physical_state 联合匹配
输出：条件对打法的影响规律 + 条件适配建议
训练方案选择（training_drills.json，15 个）
规则：优先 failurePattern 对应 → 次选 opponentType 对应 → 兜底 conditionPattern 对应
输出：1 个可独立完成的训练方案（含步骤、时长、关键提示）
将以上结果 + 弱点趋势数据注入 Prompt，AI 只做 "翻译"，不做 "推理"

### 3.5 弱点趋势检测引擎（v3.0 新增）
输入：用户最近 N 场比赛数据
检测维度（4 维并行扫描）：
┌──────────────────────────────────────────────────────────┐
│ 维度 1：高频自身失误 │
│ 数据源：self_state_tags │
│ 规则：最近 5 场中 ≥ 3 场出现同一标签 → 触发告警 │
├──────────────────────────────────────────────────────────┤
│ 维度 2：高频最难受场景 │
│ 数据源：painful_scene_tag │
│ 规则：最近 5 场中 ≥ 2 场出现同一场景 → 触发告警 │
├──────────────────────────────────────────────────────────┤
│ 维度 3：条件关联弱点 │
│ 数据源：match_conditions + match_result │
│ 规则：某条件下胜率 < 整体胜率 - 20% 且 ≥ 5 场 → 触发告警 │
├──────────────────────────────────────────────────────────┤
│ 维度 4：对手类型弱点 │
│ 数据源：opponent_tags 聚合 + match_result │
│ 规则：某类对手胜率 < 30% 且 ≥ 3 场 → 触发告警 │
└──────────────────────────────────────────────────────────┘
输出：WeaknessTrendAlert []
├── trend_type: "self_state" | "painful_scene" | "condition" | "opponent_type"
├── detail: String（告警描述）
├── frequency: Number（出现频次）
├── suggestion: String（AI 生成的针对性建议）
└── first_detected_at: Date
触发时机：每次新 Match 提交后，由 trend.worker 异步执行
结果存储：WeaknessTrend collection，同时写入 Match 响应的 weakness_trend_alert 字段

### 3.6 赛前情报生成流程（v3.0 新增）
触发：用户打开 "赛前情报" 页面，传入 opponent_id
Step 1：检查 Redis 缓存（key = intel:{user_id}:{opponent_id}，TTL = 24h）
├── 命中 → 直接返回
└── 未命中 → Step 2
Step 2：数据聚合
├── 对手弱点雷达图：opponent.weakness_radar（五维评分）
├── 历史输赢规律：按 match_result 分组聚合，提取 "输的时候共性模式"
├── 条件关联：历史上该对手在不同条件下的胜率差异
└── 近期趋势：最近 3 场的战术演变
Step 3：AI 生成战术建议
输入：聚合数据 → preMatchIntel.prompt.ts
输出：1 条可执行建议（含时机 + 动作 + 落点）
Step 4：组装情报卡
{
opponent_name, h2h_record, weakness_radar,
lose_patterns, win_patterns, condition_insights,
tactical_advice, last_updated
}
Step 5：写入 Redis 缓存，返回前端

### 3.7 球友圈数据流（v3.0 新增）
比赛双向确认流程：
用户 A 提交 Match（标记对手为球友 B）
→ match.service 检测 B 是否为圈内球友
→ 是 → 推入 "social:confirm-notify" 队列
→ social.worker 通过 WebSocket 推送确认请求给 B
→ B 确认 → 该 Match 标记为 confirmed
→ 推入 "social:rank-update" 队列
→ social.worker 重算天梯排名
天梯排名算法：
排名 = 圈内互相交手的胜率（非全局胜率）
最少交手场次 = 3（不足 3 场不参与排名）
宿敌自动标记：total_matches ≥ 3 时判定
WebSocket 事件类型：
├── match:confirm-request # A 请求 B 确认比赛
├── match:confirmed # B 确认了比赛
├── match:rejected # B 拒绝了比赛
└── rank:updated # 排名变化通知

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

// v3.0：五维标签体系（替代原扁平列表）
export const OPPONENT_TAGS = {
  serve:    ['一发凶猛', '发球稳定', '二发偏弱', 'ACE多', '双误多'] as const,
  baseline: ['正手暴力', '反手切削', '双反稳健', '底线防守型', '喜欢大角度', '上旋强'] as const,
  net:      ['常上网', '截击好', '网前手软', '很少上网'] as const,
  movement: ['脚步快', '侧向移动慢', '体能好', '后半段体能下降'] as const,
  mental:   ['关键分稳', '容易急躁', '越打越好', '逆风局容易放弃'] as const,
} as const;
export type OpponentTagDimension = keyof typeof OPPONENT_TAGS;
export type OpponentTag = typeof OPPONENT_TAGS[OpponentTagDimension][number];

export const SELF_STATE_TAGS = [
  '心态稳', '心态崩了', '体力差', '失误多',
  '脚步慢', '发球差', '专注度不够', '状态好',
  '关键分心态崩', '二发没信心'
] as const;
export type SelfStateTag = typeof SELF_STATE_TAGS[number];

export const TACTICS_TAGS = [
  '多打反手', '发球后抢攻', '多上网',
  '多放小球', '拉开正手位', '多切削拖节奏',
  '发球+正手内切', '调动后上网'
] as const;
export type TacticsTag = typeof TACTICS_TAGS[number];

// v3.0 新增：场景快选标签
export const PAINFUL_SCENE_TAGS = [
  '关键分双误', '被穿越球打穿', '高压球失误',
  '破发点没把握住', '抢七关键失误', '领先后被翻盘',
  '网前截击下网', '接发球完全被压制', '体力崩掉开始送分',
  '被对手连续Ace', '简单球打飞了'
] as const;
export type PainfulSceneTag = typeof PAINFUL_SCENE_TAGS[number];

// v3.0 新增：比赛条件枚举
export const MATCH_CONDITIONS = {
  surface:        ['hard', 'clay', 'grass', 'indoor'] as const,
  weather:        ['sunny', 'cloudy', 'windy', 'hot'] as const,
  physical_state: ['good', 'normal', 'injured', 'fatigued'] as const,
} as const;
export type Surface       = typeof MATCH_CONDITIONS.surface[number];
export type Weather       = typeof MATCH_CONDITIONS.weather[number];
export type PhysicalState = typeof MATCH_CONDITIONS.physical_state[number];

export interface MatchConditions {
  surface?: Surface | null;
  weather?: Weather | null;
  physical_state?: PhysicalState | null;
}

// v3.0 新增：双打数据
export interface DoublesData {
  partner_id?: string;
  partner_name_alias: string;
  partner_position?: 'ad_side' | 'deuce_side' | null;
  doubles_tactics_tags?: string[];
}

// v3.0 新增：弱点雷达图
export interface WeaknessRadar {
  serve: number;      // 0-5，数字越高说明对手这个维度越弱（即我方攻击方向）
  baseline: number;
  net: number;
  movement: number;
  mental: number;
}

// v3.0 新增：弱点趋势告警
export type TrendType = 'self_state' | 'painful_scene' | 'condition' | 'opponent_type';
export interface WeaknessTrendAlert {
  trend_type: TrendType;
  detail: string;
  frequency: number;
  suggestion: string;
  first_detected_at: string;
}

// ─── 比分类型 ────────────────────────────────────────────────
export interface SetScore {
  set_number: number;
  score_self: number;
  score_opponent: number;
}

... +119 lines

Show all lines
4.2 Mongoose Schema（服务端）

Match（比赛记录）

// server/modules/match/match.model.ts

const MatchSchema = new Schema({
  user_id:              { type: ObjectId, ref: 'User',            required: true, index: true },
  opponent_id:          { type: ObjectId, ref: 'OpponentProfile' },
  opponent_name_alias:  String,

  match_result: { type: String, enum: ['WIN','LOSE','DRAW','PRACTICE'], required: true },
  match_type:   { type: String, enum: ['SINGLE','DOUBLE','PRACTICE'], default: 'SINGLE' },

  // v3.0 新增：双打数据
  doubles_data: {
    partner_id:            { type: ObjectId, ref: 'DoublesPartnerProfile' },
    partner_name_alias:    String,
    partner_position:      { type: String, enum: ['ad_side', 'deuce_side', null] },
    doubles_tactics_tags:  [String],
  },

  score: {
    sets: [{ set_number: Number, score_self: Number, score_opponent: Number }],
    total_self:     { type: Number, default: 0 },
    total_opponent: { type: Number, default: 0 },
  },
  score_analysis: Mixed,   // 系统自动填充

  // v3.0 新增：比赛条件
  match_conditions: {
    surface:        { type: String, enum: ['hard', 'clay', 'grass', 'indoor', null] },
    weather:        { type: String, enum: ['sunny', 'cloudy', 'windy', 'hot', null] },
    physical_state: { type: String, enum: ['good', 'normal', 'injured', 'fatigued', null] },
  },

  // v3.0 新增：场景快选标签
  painful_scene_tag: String,
  most_painful_point: { type: String, maxlength: 500 },
  voice_input_url:    String,

  opponent_tags:     [String],    // v3.0：五维体系的标签，存储为扁平数组
  self_state_tags:   [String],
  tactics_used_tags: [String],

  ai_clarification: {
    question: String, options: [String],
    selected_option: String, skipped: { type: Boolean, default: false }
  },

  ai_feedback: {
    key_problem: String, next_tactic: String, training_suggestion: String,
    condition_tip: String,   // v3.0 新增
    knowledge_used: {
      opponent_type_id: String, failure_pattern_id: String,
      drill_id: String, condition_pattern_id: String   // v3.0 新增
    },
    is_helpful: Boolean, generated_at: Date
  },

  // v3.0 新增：弱点趋势告警快照
  weakness_trend_alert: Mixed,   // 提交时检测到的趋势告警，可为 null

  // v3.0 新增：球友圈确认状态
  social_confirmation: {
    is_circle_match:  { type: Boolean, default: false },
    confirmed_by_opponent: { type: Boolean, default: false },
    confirmed_at: Date,
  },

  share_image_url: String,
  date_time: { type: Date, default: Date.now, index: true },
  location: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 复合索引
MatchSchema.index({ user_id: 1, date_time: -1 });          // 首页 feed
MatchSchema.index({ user_id: 1, opponent_id: 1 });          // 对手档案关联
MatchSchema.index({ user_id: 1, match_result: 1 });         // 胜负筛选
MatchSchema.index({ user_id: 1, 'match_conditions.surface': 1 });  // v3.0：条件筛选
MatchSchema.index({ user_id: 1, painful_scene_tag: 1 });    // v3.0：场景趋势
OpponentProfile（对手档案）

// server/modules/opponent/opponent.model.ts

const OpponentSchema = new Schema({
  user_id:              { type: ObjectId, required: true },
  opponent_name_alias:  { type: String, required: true },

  total_matches: { type: Number, default: 0 },
  wins:          { type: Number, default: 0 },
  losses:        { type: Number, default: 0 },
  draws:         { type: Number, default: 0 },
  win_rate:      { type: Number, default: 0 },

  // v3.0 新增：弱点雷达图（五维评分，0-5）
  weakness_radar: {
    serve:    { type: Number, default: 0, min: 0, max: 5 },
    baseline: { type: Number, default: 0, min: 0, max: 5 },
    net:      { type: Number, default: 0, min: 0, max: 5 },
    movement: { type: Number, default: 0, min: 0, max: 5 },
    mental:   { type: Number, default: 0, min: 0, max: 5 },
  },

  aggregated_opponent_tags: [{ tag: String, count: Number, ratio: Number }],
  tactics_when_win:         [{ tag: String, count: Number, ratio: Number }],
  patterns_when_lose:       [{ tag: String, count: Number, ratio: Number }],

  score_patterns: {
    avg_sets_per_match:            Number,
    deciding_set_count:            Number,
    deciding_set_win_rate:         Number,
    collapsed_from_leading_count:  Number,
  },

  // v3.0 新增：宿敌标记
  is_nemesis:    { type: Boolean, default: false },     // total_matches >= 3 时自动判定
  nemesis_trend: { type: String, enum: ['improving', 'declining', 'stable', null] },

  ai_opponent_advice: String,
  last_match_date: Date,
}, { timestamps: true });

OpponentSchema.index({ user_id: 1, opponent_name_alias: 1 }, { unique: true });
OpponentSchema.index({ user_id: 1, is_nemesis: 1 });   // v3.0：宿敌快查
WeaknessTrend（弱点趋势，v3.0 新增）

// server/modules/trend/trend.model.ts

const WeaknessTrendSchema = new Schema({
  user_id:     { type: ObjectId, required: true, index: true },
  trend_type:  { type: String, enum: ['self_state', 'painful_scene', 'condition', 'opponent_type'], required: true },
  detail:      { type: String, required: true },     // "最近 6 场中 5 场标记了「关键分心态崩」"
  frequency:   { type: Number, required: true },
  related_tag: String,                                // 关联的标签值
  suggestion:  String,                                // AI 生成的建议
  is_resolved: { type: Boolean, default: false },     // 用户确认已解决
  first_detected_at: Date,
  last_detected_at:  Date,
}, { timestamps: true });

WeaknessTrendSchema.index({ user_id: 1, is_resolved: 1, last_detected_at: -1 });
DoublesPartnerProfile（双打搭档档案，v3.0 新增）

// server/modules/doubles/doubles.model.ts

const DoublesPartnerSchema = new Schema({
  user_id:              { type: ObjectId, required: true },
  partner_id:           ObjectId,
  partner_name_alias:   { type: String, required: true },
  total_matches:        { type: Number, default: 0 },
  wins:                 { type: Number, default: 0 },
  losses:               { type: Number, default: 0 },
  win_rate:             { type: Number, default: 0 },
  preferred_formation:  String,
  common_tactics:       [{ tag: String, count: Number }],
  ai_partnership_advice: String,
  last_match_date:      Date,
}, { timestamps: true });

DoublesPartnerSchema.index({ user_id: 1, partner_name_alias: 1 }, { unique: true });
FriendCircle（球友圈，v3.0 新增）

// server/modules/social/social.model.ts

const FriendCircleSchema = new Schema({
  circle_name: { type: String, required: true },
  creator_id:  { type: ObjectId, required: true },
  members: [{
    user_id:   ObjectId,
    nickname:  String,
    joined_at: { type: Date, default: Date.now },
  }],
  // 天梯排名缓存（定期重算）
  rankings: [{
    user_id:      ObjectId,
    nickname:     String,
    win_rate:     Number,
    total_circle_matches: Number,
    rank:         Number,
    recent_trend: { type: String, enum: ['up', 'down', 'stable'] },
  }],
  last_rank_update: Date,
}, { timestamps: true });

FriendCircleSchema.index({ 'members.user_id': 1 });   // 查"我加入的所有圈子"
InsightReport（月度洞察，v3.0 升级）

// server/modules/insight/insight.model.ts

const InsightSchema = new Schema({
  user_id:      { type: ObjectId, required: true, index: true },
  period_start: Date,
  period_end:   Date,
  matches_count: Number,

  content: {
    total_summary:        String,    // v3.0：教练人格化语气
    failure_patterns:     [String],
    tough_opponent_types: String,
    strength_patterns:    String,
    training_focus:       String,
    condition_insights:   String,    // v3.0 新增：条件关联洞察
    trend_summary:        String,    // v3.0 新增：弱点趋势变化总结
  },

  raw_stats:    Mixed,
  generated_at: Date,
}, { timestamps: true });

InsightSchema.index({ user_id: 1, period_start: -1 });
4.3 数据关系

User ─────────────── Match                  (1 : N)
User ─────────────── OpponentProfile        (1 : N)
User ─────────────── InsightReport          (1 : N)
User ─────────────── WeaknessTrend          (1 : N)    ← v3.0 新增
User ─────────────── DoublesPartnerProfile  (1 : N)    ← v3.0 新增
Match ────────────── OpponentProfile        (N : 1，通过 opponent_id)
Match ────────────── DoublesPartnerProfile  (N : 1，通过 doubles_data.partner_id)  ← v3.0
FriendCircle ─────── User                  (N : M，通过 members[].user_id)         ← v3.0

约束：
  · 所有查询强制带 user_id（用户间数据完全隔离）
  · OpponentProfile 只由 Match 数据聚合生成，禁止手动写入
  · DoublesPartnerProfile 只由双打 Match 数据聚合生成
  · InsightReport 只读，由系统定时或手动触发生成
  · WeaknessTrend 由 trend.worker 自动维护，用户可标记"已解决"
  · FriendCircle.rankings 由 social.worker 异步重算，非实时
  · match.score_analysis 由后端 score.analyzer.ts 自动填充，前端不传
  · match.weakness_trend_alert 由后端 trend.detector.ts 填充，前端只读
  · match.social_confirmation 由 WebSocket 双向确认机制维护
五、代码规范

5.1 文件命名

规则：[模块名].[类型].ts

后端示例：
  match.route.ts          ← 路由
  match.service.ts        ← 业务逻辑
  match.model.ts          ← 数据模型
  match.schema.ts         ← Fastify 验证 Schema
  score.analyzer.ts       ← 独立工具函数（功能描述命名）
  trend.detector.ts       ← v3.0：弱点趋势检测引擎
  intel.builder.ts        ← v3.0：赛前情报构建器
  social.ws.ts            ← v3.0：WebSocket 事件处理

前端示例：
  pages/record/index.tsx  ← 页面主文件
  pages/record/index.less ← 样式
  components/ScoreInput/index.tsx
  components/WeaknessRadar/index.tsx   ← v3.0：雷达图组件
5.2 函数命名

// 路由层：动词 + 名词（描述 HTTP 操作）
async function createMatch(req, reply) {}
async function getMatchById(req, reply) {}
async function listMatches(req, reply) {}
async function getPreMatchIntel(req, reply) {}        // v3.0
async function getWeaknessTrends(req, reply) {}       // v3.0
async function getCircleRankings(req, reply) {}       // v3.0

// 服务层：动词 + 业务术语（描述业务动作）
async function createMatchRecord(dto: CreateMatchDTO, userId: string) {}
async function generateAIFeedback(matchId: string) {}
async function recalculateOpponentStats(opponentId: string) {}
async function detectWeaknessTrends(userId: string) {}          // v3.0
async function buildPreMatchIntel(userId: string, opponentId: string) {}  // v3.0
async function calculateWeaknessRadar(opponentId: string) {}    // v3.0
async function recalculateCircleRanking(circleId: string) {}    // v3.0

// 纯工具函数：动词 + 名词（无副作用，可单元测试）
function analyzeScore(score: MatchScore): ScoreAnalysis {}
function matchOpponentType(tags: string[], kb: KnowledgeBase) {}
function matchConditionPattern(conditions: MatchConditions, kb: KnowledgeBase) {}  // v3.0
function buildMatchFeedbackPrompt(input: MatchFeedbackInput): string {}
function buildPreMatchIntelPrompt(input: IntelInput): string {}   // v3.0
function computeRadarScores(tags: TagStat[], dimension: string): number {}  // v3.0
5.3 统一错误处理

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
if (!circle) throw new AppError('球友圈不存在', 404, 'CIRCLE_NOT_FOUND');           // v3.0

// 3. 统一错误响应（在 errorHandler.ts 中注册）
// 前端永远收到标准格式：
// { success: false, error: "比赛记录不存在", code: "MATCH_NOT_FOUND" }
5.4 数据库查询安全规范

// ✅ 所有查询必须带 user_id（防止越权访问）
Match.findOne({ _id: matchId, user_id: req.user.id });
OpponentProfile.find({ user_id: req.user.id });
WeaknessTrend.find({ user_id: req.user.id, is_resolved: false });  // v3.0

// ✅ 球友圈查询需验证成员身份（v3.0）
FriendCircle.findOne({ _id: circleId, 'members.user_id': req.user.id });

// ❌ 禁止（任何人都能查到这条数据）
Match.findById(matchId);
5.5 环境变量管理

// server/config/env.ts

const REQUIRED_VARS = [
  'MONGODB_URI', 'REDIS_URL', 'JWT_SECRET',
  'QWEN_API_KEY', 'QWEN_BASE_URL',
  'WECHAT_APP_ID', 'WECHAT_APP_SECRET'
];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(`❌ 缺少必要环境变量：${key}，请检查 .env 文件`);
  }
}

export const env = {
  mongoUri:         process.env.MONGODB_URI!,
  redisUrl:         process.env.REDIS_URL!,
  jwtSecret:        process.env.JWT_SECRET!,
  qwenApiKey:    process.env.QWEN_API_KEY!,
  qwenBaseUrl:   process.env.QWEN_BASE_URL!,
  wechatAppId:      process.env.WECHAT_APP_ID!,
  wechatAppSecret:  process.env.WECHAT_APP_SECRET!,
  // v3.0：WebSocket 配置
  wsHeartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000'),
  wsMaxConnections:    parseInt(process.env.WS_MAX_CONNECTIONS || '1000'),
};
5.6 API 响应统一格式

// 后端统一封装（在 reply helper 中注册）
reply.success(data)
reply.fail('错误信息', 404, 'NOT_FOUND')

// 前端统一拦截（services/api.ts）
axiosInstance.interceptors.response.use(
  res => res.data.data,
  err => {
    const code = err.response?.data?.code;
    if (code === 'AUTH_EXPIRED') { /* 跳转登录 */ }
    if (code === 'PRO_REQUIRED') { /* 跳转升级页 */ }
    return Promise.reject(err.response?.data?.error || '网络错误');
  }
);
5.7 AI Prompt 管理规范

// ✅ Prompt 集中在 server/prompts/ 目录，每类一个文件
// 禁止在 service 文件里直接写字符串 Prompt

// server/prompts/matchFeedback.prompt.ts（v3.0 升级版）
export function buildMatchFeedbackPrompt(input: MatchFeedbackInput): string {
  return `
你是专注业余网球玩家（NTRP 2.5–4.5）成长的战术教练。
风格：口语化、直接、具体，不说"保持冷静""继续努力"这类废话。
建议必须包含：时机 + 动作 + 落点/目的。

## 比赛数据
${JSON.stringify(input.matchData, null, 2)}

## 比赛条件（v3.0）
${JSON.stringify(input.matchConditions, null, 2)}

## 知识库匹配结果
${JSON.stringify(input.knowledgeContext, null, 2)}

## 弱点趋势数据（v3.0）
${input.weaknessTrend ? JSON.stringify(input.weaknessTrend, null, 2) : '无历史趋势数据'}

## 输出格式（严格遵守，总字数 ≤ 200）
📋 今天的关键问题
[1–2 行]

💡 下次碰到同类对手，试试这 1 件事
[1–2 行，含具体时机 + 动作 + 落点]

📅 下次训练可以练
[1 行，含训练内容 + 时长 + 关键提示]

${input.matchConditions ? `
🌤 条件提示（选填，仅在条件对结果有明显影响时输出）
[1 行，如"大风天减少高球，多用切削控制"]
` : ''}
  `.trim();
}

// server/prompts/preMatchIntel.prompt.ts（v3.0 新增）
export function buildPreMatchIntelPrompt(input: IntelInput): string {
  return `
你是一位网球战术分析师。根据以下数据，给出 1 条简洁可执行的赛前建议。
要求：不超过 30 字，包含具体时机 + 动作 + 目的。

## 对手弱点雷达
${JSON.stringify(input.weaknessRadar, null, 2)}

## 历史输赢规律
赢的时候：${input.winPatterns.join('、')}
输的时候：${input.losePatterns.join('、')}

## 输出
一句话建议（≤ 30 字）：
  `.trim();
}
5.8 WebSocket 规范（v3.0 新增）

// server/services/ws.service.ts

// 连接管理规范
// 1. 每个用户最多维持 1 条 WebSocket 连接（新连接顶替旧连接）
// 2. 心跳检测：30 秒一次 ping，3 次无响应断开
// 3. 连接状态存储在 Redis（key = ws:conn:{user_id}，存 server instance ID）
// 4. 消息格式统一使用 WSMessage 类型

// WebSocket 认证流程
// 1. 客户端连接时在 URL query 中携带 JWT：ws://host/ws?token=xxx
// 2. wsAuth.middleware.ts 验证 JWT，失败则关闭连接
// 3. 验证通过后注入 connection.user_id

// 事件处理模式
// ✅ 允许：social.ws.ts 通过 ws.service 发送消息
// ❌ 禁止：在 ws handler 中直接操作数据库（应通过队列解耦）
5.9 给 Trae 的分批生成顺序

第 1 批（基础骨架）
  shared/types.ts → shared/constants.ts
  server/config/env.ts → server/config/db.ts → server/config/ws.ts → server/app.ts

第 2 批（认证闭环）
  server/modules/auth/（3 个文件）
  验证：能完成微信登录，拿到 JWT

第 3 批（核心：记录 + AI）
  server/modules/match/（5 个文件，含 match_conditions + painful_scene_tag + doubles_data）
  server/services/ai.service.ts
  server/services/knowledge.service.ts（含 condition_patterns 加载）
  server/prompts/matchFeedback.prompt.ts
  server/prompts/clarification.prompt.ts
  验证：提交一场记录（含条件 + 场景快选），收到 AI 三段式反馈 + 条件提示

第 4 批（对手档案 + 弱点雷达）
  server/modules/opponent/（4 个文件，含 calculateWeaknessRadar + 宿敌判定）
  server/workers/opponent.worker.ts
  验证：提交 3 场记录后，对手档案自动更新，弱点雷达图数据正确

第 5 批（弱点趋势 + 赛前情报）
  server/modules/trend/（4 个文件）
  server/modules/intel/（3 个文件）
  server/workers/trend.worker.ts
  server/workers/intel.worker.ts
  server/prompts/preMatchIntel.prompt.ts
  server/prompts/trendAlert.prompt.ts
  验证：提交 5 场相似失误后触发趋势告警；赛前情报卡数据完整

第 6 批（前端核心页面）
  client/pages/record/（含 SceneQuickPick + ConditionPicker + DoublesPartnerPick）
  client/pages/result/（含条件提示展示 + 趋势告警卡片）
  client/components/ScoreInput/ → TagGroup/ → SceneQuickPick/ → ConditionPicker/
  验证：小程序可完整走完 记录 → AI 反馈 → 趋势告警 流程

第 7 批（对手详情 + 赛前情报页面）
  client/pages/opponent-detail/（含 WeaknessRadar + H2HTrendChart）
  client/pages/pre-match-intel/（含 IntelCard）
  client/pages/weakness-trend/（含 TrendAlert）
  client/components/WeaknessRadar/ → H2HTrendChart/ → IntelCard/ → TrendAlert/
  验证：雷达图正确渲染，赛前情报卡完整展示

第 8 批（球友圈 + 双打 + 社交）
  server/modules/social/（4 个文件，含 WebSocket）
  server/modules/doubles/（3 个文件）
  server/services/ws.service.ts
  server/workers/social.worker.ts → doubles.worker.ts
  client/pages/friend-circle/（含 CircleLeaderboard）
  client/services/ws.ts
  验证：创建球友圈 → 邀请好友 → 提交比赛 → 对方确认 → 排名更新

第 9 批（剩余功能）
  insight 模块（含条件关联洞察 + 弱点趋势曲线 + 教练语气月报）
  subscription 模块 → 其余前端页面 → ShareCard 分享图
  验证：月报生成包含条件洞察 + 趋势总结，教练语气自然
