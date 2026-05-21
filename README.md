# 🎾 球感日记 Tennis Sense Diary

> 打完球 30 秒记录，AI 结合专业知识库帮你越打越聪明——一个有记忆的网球私人教练。

业余网球选手的赛后复盘 + 赛前备战工具。每场球打完，快速记录比分、五维标签、比赛条件和"最难受的一球"，AI 结合专业知识库即时给出分析——今天为什么输、下次怎么打、本周练什么。随着记录场次增多，对手档案自动沉淀弱点雷达图，弱点趋势追踪帮你发现反复犯的错，赛前情报系统让你打之前就有策略，球友圈天梯让进步不再孤独。

---

## ✨ 核心功能

- **30 秒赛后秒记** — 比分（逐局小比分）+ 对手信息 + 我的信息 + 比赛条件 + 赛后总结，目标录入 ≤ 60 秒
- **场景快选** — 11 个高频"最难受的一球"场景标签（关键分双误、被穿越球打穿……），3 秒点选替代打字
- **AI 卡片化复盘（v3.1）** — AI 返回结构化 JSON，前端渲染为 5–6 张卡片（总评/亮点/改进/对手解读/练球作业/下次锦囊），一屏看完可截图分享
- **AI 追问机制** — 提交后 AI 追问 1 个关键问题，补充上下文，让建议更精准
- **对手档案 + 弱点雷达图** — 五维弱点可视化（发球/底线/网前/移动/心理），宿敌标记，H2H 趋势折线
- **赛前情报系统** — 打球前 1 分钟查看：对手弱点雷达 + 历史输赢规律 + 今天 1 条可执行战术建议
- **弱点趋势追踪** — 跨多场比赛追踪反复出现的弱点模式（4 维度扫描），在问题形成习惯前告警
- **球友圈天梯** — 轻社交：圈内 H2H 排名、宿敌机制、比赛双向确认，让进步有对照
- **双打支持** — 记录双打比赛，沉淀搭档配合档案，AI 分析双打配合建议
- **月度洞察** — AI 教练人格化语气月报：固定失误模式、条件关联洞察、弱点趋势曲线、本月训练重点
- **战报分享** — 一键生成战报图，分享到球友群

---

## 🛠 技术栈

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| [Taro](https://taro.zone/) | 4.x | 跨端框架，编译到微信小程序 |
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全（五维标签体系、条件枚举强依赖类型校验） |
| Zustand | 4.x | 轻量全局状态管理 |
| NutUI-React | 3.x | 移动端 UI 组件库 |
| ECharts-for-WeChat | - | 弱点雷达图（五轴）+ H2H 趋势折线图 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20 LTS | 运行时 |
| Fastify | 4.x | Web 框架（性能优先） |
| TypeScript | 5.x | 类型安全 |
| BullMQ | 5.x | 异步任务队列（8 类队列：档案更新、趋势检测、情报预生成、排名重算等） |
| @fastify/websocket | - | 球友圈比赛双向确认实时通道 |

### AI 引擎
| 技术 | 用途 |
|------|------|
| Qwen REST API | 大模型调用（v3.1 卡片化 JSON 复盘/趋势分析/赛前情报 + 追问 + 月报） |
| 知识库 JSON（5 类） | 对手类型库（12 种）/ 失误模式库（10 种）/ 训练方案库（15 个）/ 心理状态库（6 种）/ 条件影响库（本地匹配，不依赖 AI 推理） |

### 数据存储
| 技术 | 用途 |
|------|------|
| MongoDB Atlas | 主数据库（比赛记录、对手档案、弱点趋势、双打搭档、球友圈、月报） |
| Redis | AI 响应缓存 + BullMQ 依赖 + WebSocket 连接状态 |
| 腾讯云 COS | 战报图存储 |

### 部署
| 技术 | 用途 |
|------|------|
| Docker Compose | 本地开发环境 |
| Nginx | 反向代理 + HTTPS + WebSocket 升级 |
| 腾讯云轻量服务器 | 生产部署（2C4G） |

---

## 📁 项目结构
tennis-diary/
├── client/ # 微信小程序前端（Taro + React）
│ └── src/
│ ├── pages/ # 页面
│ │ ├── record/ # 赛后记录（含场景快选 + 条件标记）
│ │ ├── result/ # AI 战报（含条件提示 + 趋势告警）
│ │ ├── opponents/ # 对手列表（含宿敌标记）
│ │ ├── opponent-detail/ # 对手详情（弱点雷达 + H2H 趋势）
│ │ ├── pre-match-intel/ # 赛前情报
│ │ ├── weakness-trend/ # 弱点趋势
│ │ ├── friend-circle/ # 球友圈天梯
│ │ ├── insight/ # 月度洞察
│ │ └── ...
│ ├── components/ # 可复用组件（WeaknessRadar / SceneQuickPick / IntelCard 等）
│ ├── store/ # Zustand 状态（含 intelStore /circleStore/wsStore）
│ └── services/ # API 请求 + WebSocket 客户端
│
├── server/ # 后端（Fastify + TypeScript）
│ ├── modules/ # 业务模块（8 个）
│ │ ├── auth/ # 认证
│ │ ├── match/ # 比赛记录（含双打 + 条件 + 场景快选）
│ │ ├── opponent/ # 对手档案（含弱点雷达 + 宿敌判定）
│ │ ├── trend/ # 弱点趋势追踪（4 维度扫描引擎）
│ │ ├── intel/ # 赛前情报（聚合 + AI 生成建议）
│ │ ├── social/ # 球友圈（天梯 + 确认 + WebSocket）
│ │ ├── doubles/ # 双打搭档档案
│ │ └── insight/ # 月度洞察（教练人格化语气）
│ ├── services/ # 共享服务（AI / 知识库 / 文件存储 / WebSocket）
│ ├── workers/ # 异步任务（8 类 BullMQ Worker）
│ ├── prompts/ # AI Prompt 模板（6 个）
│ └── knowledge/ # 知识库 JSON 文件（5 类）
│
└── shared/ # 前后端共用类型定义
├── types.ts # 五维标签 + 条件枚举 + 雷达图 + 趋势告警 + WebSocket 事件
└── constants.ts

---

## 🚀 如何运行

### 环境准备

确保本地已安装：
- Node.js >= 20
- Docker & Docker Compose
- 微信开发者工具（[下载地址](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)）

### 1. 克隆项目

```bash
git clone https://github.com/your-username/tennis-diary.git
cd tennis-diary
2. 配置环境变量

# 复制模板文件
cp .env.example .env

# 编辑 .env，填入以下配置：
# 数据库
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/tennis-diary
REDIS_URL=redis://localhost:6379

# Qwen AI（必填）
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_API_KEY=your_qwen_api_key
QWEN_BASE_URL=your_model_endpoint_id

# JWT
JWT_SECRET=your_jwt_secret_at_least_32_chars
JWT_EXPIRES_IN=7d

# 微信小程序
WECHAT_APP_ID=your_wechat_appid
WECHAT_APP_SECRET=your_wechat_app_secret

# 腾讯云 COS（战报图存储）
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_BUCKET=tennis-diary-xxxxxxxx
COS_REGION=ap-guangzhou

# WebSocket（可选，有默认值）
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS=1000
3. 启动本地依赖（Redis）

# 用 Docker Compose 启动 Redis
docker-compose up -d redis

# 确认 Redis 正常运行
docker-compose ps
4. 启动后端

cd server

# 安装依赖
npm install

# 开发模式启动（支持热重载）
npm run dev

# 后端默认运行在 http://localhost:3000
# 看到以下输出说明启动成功：
# ✅ MongoDB 已连接
# ✅ Redis 已连接
# ✅ WebSocket 服务已启动
# ✅ 知识库加载完成（5 个分类，共 49 条）
# 🚀 服务启动于 http://localhost:3000
5. 启动前端

cd client

# 安装依赖
npm install

# 编译为微信小程序
npm run dev:weapp
然后打开微信开发者工具，导入 client/dist 目录，即可预览小程序。
注意： 微信小程序调用后端接口需要在微信后台配置合法域名。本地开发时，在微信开发者工具中勾选「不校验合法域名」即可。
6. 验证运行

# 测试后端健康检查
curl http://localhost:3000/health

# 期望响应：
# { "status": "ok", "timestamp": "2026-xx-xx" }

# 测试 AI 接口连通性
curl -X POST http://localhost:3000/api/ai/test \
  -H "Content-Type: application/json"
🧪 开发脚本

# 后端
npm run dev          # 开发模式（热重载）
npm run build        # 编译 TypeScript
npm run start        # 生产模式启动
npm run lint         # ESLint 检查
npm run typecheck    # TypeScript 类型检查

# 前端
npm run dev:weapp    # 编译微信小程序（监听模式）
npm run build:weapp  # 生产构建
npm run lint         # ESLint 检查
🌐 生产部署

# 1. 服务器上克隆项目
git clone https://github.com/your-username/tennis-diary.git

# 2. 配置 .env（生产环境）

# 3. 一键启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 包含：Nginx（含 WebSocket 升级配置）+ Node.js 后端 + Redis + BullMQ Worker
详细部署文档见 docs/deployment.md
🔑 核心设计说明

AI 建议为什么不是废话？

AI 调用前，后端会先用知识库匹配引擎分析用户输入：
根据五维对手标签匹配「对手类型库」（12 种类型，含典型陷阱和应对策略）
根据状态标签 + 场景快选标签 + 关键词匹配「失误模式库」（10 种模式，含心理根源和修正方案）
根据比赛条件匹配「条件影响库」（场地 / 天气 / 身体对打法的影响规律）
注入弱点趋势数据（如 "最近 5 场中 4 场出现关键分心态崩"）
将结构化知识 + 趋势数据注入 Prompt，AI 只做「专业知识 → 个性化表达」的翻译
知识库文件位于 server/knowledge/v1/，可以直接编辑 JSON 持续优化。
从 "事后复盘" 到 "事前备战"

赛前情报系统是 v3.0 的核心升级 —— 不只是打完球分析，打之前就给你策略：
弱点雷达图：五轴可视化对手弱点（发球 / 底线 / 网前 / 移动 / 心理），一眼看出攻击方向
输赢规律提取：从历史数据中提取 "你赢他的时候通常做了什么" 和 "输的时候犯了什么错"
1 条可执行建议：AI 生成含 "时机 + 动作 + 落点" 的具体战术（如 "接发球多打他反手短球"）
弱点趋势追踪

弱点追踪引擎在每次提交比赛后异步运行，4 个维度并行扫描：
维度	数据源	告警规则
高频自身失误	self_state_tags	最近 5 场 ≥ 3 场同一标签
高频难受场景	painful_scene_tag	最近 5 场 ≥ 2 场同一场景
条件关联弱点	match_conditions + 胜率	某条件下胜率低于整体 20%+
对手类型弱点	对手标签聚合 + 胜率	某类对手胜率 < 30%
数据安全

所有数据库查询强制带 user_id 过滤，用户间数据完全隔离
球友圈查询需验证成员身份，非成员无法查看圈内数据
Qwen API Key 只存在于后端环境变量，不出现在任何前端代码中
WebSocket 连接需 JWT 认证，未认证连接立即断开
JWT Token 过期时间 7 天，敏感操作需重新验证
📐 架构概览

┌─────────────────────────────────────────────────────────┐
│                    微信小程序（Taro + React）              │
│  记录页 · 战报页 · 对手详情 · 赛前情报 · 球友圈 · 月报    │
└──────────┬──────────────────────────────────┬────────────┘
           │ HTTPS REST API                   │ WebSocket
┌──────────▼──────────────────────────────────▼────────────┐
│                    Fastify + TypeScript                    │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  业务模块（8 个，互不直接依赖）                       │  │
│  │  auth · match · opponent · trend · intel             │  │
│  │  social · doubles · insight                          │  │
│  └────────────────────────┬────────────────────────────┘  │
│                           │                               │
│  ┌────────────────────────▼────────────────────────────┐  │
│  │  共享服务层                                          │  │
│  │  ai.service · knowledge.service · ws.service        │  │
│  └────────────────────────┬────────────────────────────┘  │
└───────────────────────────┼───────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
   MongoDB Atlas        Redis            腾讯云 COS
   （主数据库）       （缓存+队列+WS）     （文件存储）
                            │
                ┌───────────▼───────────┐
                │   BullMQ Workers（8 类）│
                │   对手聚合 · 趋势检测   │
                │   情报预生成 · 排名重算  │
                │   双打更新 · 月报生成   │
                └───────────────────────┘
