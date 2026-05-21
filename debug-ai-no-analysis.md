# [OPEN] ai-no-analysis

## 症状
- 小程序提交后，页面没有显示 AI 生成内容（期待出现卡片化 JSON 分析或至少旧版文案）。

## 复现步骤（目标）
1. 登录
2. 提交比赛记录 → 获得 match_id
3. 提交追问（或跳过追问）触发 AI
4. 读取 /api/match/:id 和 /api/match/:id/analysis，确认 analysis 是否生成

## 假设（可证伪）
1. 后端没有拿到 AI 配置（provider / apiKey），导致 AI 调用失败或被跳过
2. AI 有返回但不是纯 JSON（带解释/代码块），解析失败被吞掉或写入为空
3. AI 调用成功但没有写入 match.ai_analysis，导致前端拿不到 analysis
4. 前端只读了 /api/match/:id 但后端返回的 ai_analysis 为空/字段名不匹配
5. 鉴权/路由问题导致实际请求没有触发到 submitClarification 的生成逻辑

## 采证计划
1. 启动 Debug Server 收集后端运行时事件
2. 在 AI 调用、解析、落库、接口返回处增加最小插桩上报
3. 复现一次完整链路并对照日志确定根因

## 结论
- TBD
