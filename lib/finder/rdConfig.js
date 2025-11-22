/**
 * Redis-based configuration management client
 * Handles configuration storage, retrieval, and updates with Redis pub/sub
 */
class RedisConfigCli {
  /**
   * @param { import('./rdFinder').RedisFinder  } rdFinder 日志对象
   */
  constructor(rdFinder) {
    /** @type {import('./rdFinder').RedisFinder} */
    this._finder = rdFinder;

    this._logger = rdFinder._logger;

    /** @type {string} */
    this._cfgKey = `${this._finder.groupKey}:cfg`;
  }

  /**
   * Initialize Redis connections
   */
  async init() {
    if (!this._finder._app._cfg.deps) {
      this._finder._app._cfg.deps = {};
    }

    // 读取依赖的配置
    const cfgs = this._finder._app._cfg.deps;

    if (this._finder._cfgCfg.dependencies instanceof Array) {
      for (let it of this._finder._cfgCfg.dependencies) {
        const cfgT = await this.getConfig(it);
        if (cfgT !== null) {
          cfgs[it] = cfgT;
        }
      }
    }

    let subs = this._finder._cfgCfg.subscribe;
    if (subs && subs instanceof Array) {
      for (let it of subs) {
        this._finder._app.logger.info(
          `subscribe cfg: ${this._cfgKey}:${it.dataId}`,
        );
        this._finder.subscribe(
          `${this._cfgKey}:${it.dataId}`,
          (channel, msg) => {
            const alias = it.alias || it.dataId;
            try {
              this._finder._app.emit("cfg_change", alias, msg, it.dataId);
            } catch (err) {
              this._logger.warn(`subscribe error ${alias}`, err);
            }
          },
        );
      }
    }
  }

  /**
   * Get configuration
   * @template T
   * @param {string} dataId 配置ID
   * @returns {Promise<T | null>}
   */
  async getConfig(dataId) {
    if (!this._finder._rd) {
      this._logger.warn("Redis client not initialized");
      return null;
    }

    const configStr = await this._finder._rd.hget(this._cfgKey, dataId);
    if (!configStr) {
      this._logger.warn(`Config [${dataId}] not found from ${this._cfgKey}`);
      return null;
    }

    try {
      const configData = JSON.parse(configStr);
      return configData;
    } catch (err) {
      this._logger.error(`Failed to parse config ${dataId}:`, err);
      return null;
    }
  }
}

module.exports = { RedisConfigCli };
