# [OPEN] weapp-process-undefined

## 症状
- 微信开发者工具启动时报错：`ReferenceError: process is not defined`
- 同时伴随：`appLaunch with non-empty page stack`
- 后续伴随渲染层错误：`Expected updated data but get first rendering data`

## 当前假设
1. 启动期模块直接读取 `process`
2. 环境配置代码依赖 `process.env`
3. 启动失败引发页面栈异常
4. 第三方依赖注入了 Node/浏览器专属全局
5. 渲染层错误属于连锁异常

## 调试计划
1. 搜索 `process` 与启动路径代码
2. 添加最小运行时插桩
3. 复现并对照证据
4. 实施最小修复
5. 构建验证

## 结论
- 已定位到前端 [api.ts](file:///Users/bytedance/Desktop/球感日记v3.0/client/src/services/api.ts) 中存在 `process.env.TARO_APP_API_BASE_URL || process.env.API_BASE_URL`
- 构建产物 [common.js](file:///Users/bytedance/Desktop/球感日记v3.0/client/dist/common.js) 在修复前残留 `process.env.API_BASE_URL`，与微信运行时 `process is not defined` 直接对应
- 已添加启动期最小插桩到 [app.tsx](file:///Users/bytedance/Desktop/球感日记v3.0/client/src/app.tsx) 与 [api.ts](file:///Users/bytedance/Desktop/球感日记v3.0/client/src/services/api.ts)
- 已改为通过 `globalThis.process?.env` 安全读取环境变量，避免微信运行时直接访问未定义的 `process`
- `npm run build:weapp` 已通过，且产物中已无 `process.env`
