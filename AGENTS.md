# AGENTS.md — @heywoogames/hw-base

HW 框架基础库。纯 JS (CommonJS) + JSDoc 类型标注。**无构建步骤**，文件原样发布。

## 核心架构

三类基类按序加载：`HwAppBase`(入口) → `HwPluginBase`(插件，有依赖排序) → `HwCompBase`(组件，无排序)。

### 生命周期顺序（调试关键）

```
启动: onBeforeInit → onCfgLoad → Plugin.init(依赖序) → afterInitAll → onAfterInit
     → Comp.onInit → onBeforeStart → beforeStartAll → start → onStart
     → afterStartAll → onAfterStartAll → onAfterStart

停止（逆序 desc）: onBeforeStop → beforeStopAll → onBeforeStop → stop(desc)
     → onAfterStop → afterStopAll(desc) → onAfterStopAll → onAfterStop
```

## 关键陷阱

- **插件内部用 `_` 前缀**：`_plugins['_name']`。内置 `@heywoogames/hw-redis` / `hw-mq` 会映射到本地 `plugins/` 文件。
- **组件名冲突直接 `process.exit(1)`**——`mountComps()` 挂载时检测。
- **框架多处调用 `process.exit()`**（配置加载失败、插件初始化错误等），不要拦截。
- **`env.serverId`** 取自 `package.json` 的 name，可被 `--app_name` CLI 覆盖。

## 配置加载

- 主配置：`{CFG_PATH}/config.json`，非 production 环境优先读取 `{CFG_PATH}/{env}/config.json`。
- Redis 配置（`cfgRedis.enable: true`）：key 格式 `cfg:{serverId}:{nodeName}`，监听 `cfg:appnode` 频道。

## 代码风格

- CommonJS (`require`/`module.exports`) + JSDoc 类型标注
- oxlint (`.oxlintrc.json`)：correctness=error, suspicious=warn, style/pedantic=off。JSDoc 插件强制 param/return，`swagger` 为自定义 tag
- oxfmt (`.oxfmtrc.json`)：2空格，双引号，分号，LF，printWidth=100

## 命令

```bash
npm install   # 需 GitHub Packages 认证 (@heywoogames scope)
npm test      # example/test.js，无测试框架
npm run lint  # oxlint
npm run format # oxfmt
```

CI 需要 Redis 容器 + `NODE_AUTH_TOKEN`。`example/` 不发布（`.npmignore`）。
