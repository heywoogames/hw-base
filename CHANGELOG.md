


# ChangeLog

# 1.1.3 - 1.1.4 / 2025-10-20

* 更新 rdFinder 连接 redis 时，重试策略（ 100 ms 递增，最大 2000 ms）
* 修复 rdNaming  deregisterInstance 方法， 当 redis 没有连接时，推出app一直卡住的Bug
* 修复 启动没有尝试加载 依赖的配置的 Bug


# 1.1.2 / 2025-08-30

* 修复 finder redis 的 记录分组列表名字拼写错误
* _ms增加  publish 方法，用于发布finder消息

# 1.1.1 / 2025-08-28

* 修复 没有配置 finder 时，启动报错问题

# 1.1.0 / 2025-08-28

* hw-redis / hw-mq 作为内置插件，无需安装
* 增加 服务发现 和 配置 发现功能

# 1.0.1 / 2025-08-18

* apiGen 增加参数 `allowedTags: []`, 用于指定允许生成的api标签


