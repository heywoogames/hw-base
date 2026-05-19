/**
 * 配置环境变量解析工具
 *
 * 当配置的 host / password 字段的值以 "ENV_HW_" 开头时，
 * 将该值作为环境变量名从 process.env 中读取真实值。
 *
 * @example
 * // redis.json: { "host": "ENV_HW_REDIS_HOST", "password": "ENV_HW_REDIS_PASSWORD" }
 * // 设置环境变量 ENV_HW_REDIS_HOST=10.0.0.1, ENV_HW_REDIS_PASSWORD=secret
 * // 解析后: { "host": "10.0.0.1", "password": "secret" }
 */

/**
 * 解析单个配置值：如果以 "ENV_HW_" 开头，则从环境变量读取
 * @param {string} value - 原始配置值
 * @returns {string} 解析后的值
 */
function resolveEnvValue(value) {
  if (typeof value !== "string" || !value.startsWith("ENV_HW_")) {
    return value;
  }

  const envVal = process.env[value];
  if (envVal === undefined) {
    // 环境变量不存在，返回原值（连接时会报错，由上层处理）
    return value;
  }

  return envVal;
}

/**
 * 解析 Redis / MQ redis 配置中的 host 和 password
 * @param {Partial<{ host?: string, password?: string }>} cfg - 配置对象（HwRedisCfg 或 MQ redis config）
 * @returns {any} 解析后的配置（直接修改原对象返回）
 */
function resolveEnvConfig(cfg) {
  if (!cfg || typeof cfg !== "object") {
    return cfg;
  }

  if (typeof cfg.host === "string") {
    cfg.host = resolveEnvValue(cfg.host);
  }

  if (typeof cfg.password === "string") {
    cfg.password = resolveEnvValue(cfg.password);
  }

  return cfg;
}

module.exports = { resolveEnvConfig };
