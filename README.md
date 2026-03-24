# 🎾 球感日记 Tennis Sense Diary

> 打完球 30 秒记录，AI 帮你越打越聪明。

业余网球选手的赛后复盘工具。每场球打完，快速记录比分、标签和感受，AI 结合专业知识库即时给出分析——今天为什么输、下次怎么打、本周练什么。随着记录场次增多，对手档案自动沉淀，月度洞察帮你看见固定的失误模式和成长规律。

---

## ✨ 核心功能

- **30 秒赛后秒记** — 比分（逐局小比分）+ 标签 + 一句话描述，支持语音输入
- **AI 三段式复盘** — 今天的关键问题 / 下次怎么打 / 本周练什么，基于专业知识库驱动
- **AI 追问机制** — 提交后 AI 追问 1 个关键问题，补充上下文，让建议更精准
- **对手档案** — 自动沉淀跨场次胜负规律，针对每个对手生成下次对战建议
- **月度洞察** — 累积 10 场后自动生成：固定失误模式、优势球路、本月训练重点
- **战报分享** — 一键生成战报图，分享到球友群

---

## 🛠 技术栈

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| [Taro](https://taro.zone/) | 4.x | 跨端框架，编译到微信小程序 |
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Zustand | 4.x | 轻量全局状态管理 |
| NutUI-React | 3.x | 移动端 UI 组件库 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20 LTS | 运行时 |
| Fastify | 4.x | Web 框架（性能优先） |
| TypeScript | 5.x | 类型安全 |
| BullMQ | 5.x | 异步任务队列（对手档案更新、月报生成） |

### AI 引擎
| 技术 | 用途 |
|------|------|
| 火山引擎 REST API | 大模型调用（三段式复盘、追问、月报） |
| 知识库 JSON | 对手类型库 / 失误模式库 / 训练方案库（本地匹配，不依赖 AI 推理） |

### 数据存储
| 技术 | 用途 |
|------|------|
| MongoDB Atlas | 主数据库（比赛记录、对手档案、月报） |
| Redis | AI 响应缓存 + BullMQ 依赖 |
| 腾讯云 COS | 战报图、语音文件存储 |

### 部署
| 技术 | 用途 |
|------|------|
| Docker Compose | 本地开发环境 |
| Nginx | 反向代理 + HTTPS |
| 腾讯云轻量服务器 | 生产部署（2C4G） |

---

## 📁 项目结构

```
tennis-diary/
├── client/          # 微信小程序前端（Taro + React）
│   └── src/
│       ├── pages/   # 页面（record / result / opponents / insight）
│       ├── components/  # 可复用组件
│       ├── store/   # Zustand 状态
│       └── services/    # API 请求封装
│
├── server/          # 后端（Fastify + TypeScript）
│   ├── modules/     # 业务模块（auth / match / opponent / insight）
│   ├── services/    # 共享服务（AI / 知识库 / 文件存储）
│   ├── workers/     # 异步任务（BullMQ Worker）
│   ├── prompts/     # AI Prompt 模板
│   └── knowledge/   # 知识库 JSON 文件
│
└── shared/          # 前后端共用类型定义
    ├── types.ts
    └── constants.ts
```

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
```

### 2. 配置环境变量

```bash
# 复制模板文件
cp .env.example .env

# 编辑 .env，填入以下配置：
```

```env
# 数据库
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/tennis-diary
REDIS_URL=redis://localhost:6379

# 火山引擎 AI（必填）
VOLCANO_API_URL=https://ark.cn-beijing.volces.com/api/v3/responses
VOLCANO_API_KEY=your_volcano_api_key
VOLCANO_MODEL_ID=your_model_endpoint_id

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
```

### 3. 启动本地依赖（Redis）

```bash
# 用 Docker Compose 启动 Redis
docker-compose up -d redis

# 确认 Redis 正常运行
docker-compose ps
```

### 4. 启动后端

```bash
cd server

# 安装依赖
npm install

# 开发模式启动（支持热重载）
npm run dev

# 后端默认运行在 http://localhost:3000
# 看到以下输出说明启动成功：
# ✅ MongoDB 已连接
# ✅ Redis 已连接
# ✅ 知识库加载完成（4 个分类，共 XX 条）
# 🚀 服务启动于 http://localhost:3000
```

### 5. 启动前端

```bash
cd client

# 安装依赖
npm install

# 编译为微信小程序
npm run dev:weapp
```

然后打开**微信开发者工具**，导入 `client/dist` 目录，即可预览小程序。

> **注意：** 微信小程序调用后端接口需要在微信后台配置合法域名。本地开发时，在微信开发者工具中勾选「不校验合法域名」即可。

### 6. 验证运行

```bash
# 测试后端健康检查
curl http://localhost:3000/health

# 期望响应：
# { "status": "ok", "timestamp": "2026-xx-xx" }

# 测试 AI 接口连通性
curl -X POST http://localhost:3000/api/ai/test \
  -H "Content-Type: application/json"
```

---

## 🧪 开发脚本

```bash
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
```

---

## 🌐 生产部署

```bash
# 1. 服务器上克隆项目
git clone https://github.com/your-username/tennis-diary.git

# 2. 配置 .env（生产环境）

# 3. 一键启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 包含：Nginx + Node.js 后端 + Redis + BullMQ Worker
```

> 详细部署文档见 [docs/deployment.md](./docs/deployment.md)

---

## 🔑 核心设计说明

### AI 建议为什么不是废话？

AI 调用前，后端会先用**知识库匹配引擎**分析用户输入：

1. 根据对手标签匹配「对手类型库」（9 种类型，含典型陷阱和应对策略）
2. 根据状态标签 + 关键词匹配「失误模式库」（8 种模式，含心理根源和修正方案）
3. 将结构化知识注入 Prompt，AI 只做「专业知识 → 个性化表达」的翻译

知识库文件位于 `server/knowledge/v1/`，可以直接编辑 JSON 持续优化。

### 数据安全

- 所有数据库查询强制带 `user_id` 过滤，用户间数据完全隔离
- 火山引擎 API Key 只存在于后端环境变量，不出现在任何前端代码中
- JWT Token 过期时间 7 天，敏感操作需重新验证

---

## 📄 License

MIT © 2026

---

<p align="center">
  打完球，记一下，越打越聪明 🎾
</p>
