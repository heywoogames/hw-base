"use strict";

const { Redis } = require("ioredis");

const { HwPluginBase } = require("../lib/pluginBase");
/**
 * @augments {HwPluginBase<import('../lib/hwbase').HwAppBase>}
 */
class RedisCli extends HwPluginBase {
  /** 包含的 redis  实例
   * @type {Record<string, import('ioredis').Redis>}
   *
   */
  #_ins = {};

  /** 实例映射 key 是 ip和端口的组合
   * @type {Record<string, import('ioredis').Redis>}
   *
   */
  #insMap = {};

  /** 包含的 订阅类型 redis  实例
   * @type {Record<string, import('ioredis').Redis>}
   *
   */
  #subIns = {};

  /** 订阅实例映射 key 是 ip和端口的组合
   * @type {Record<string, import('ioredis').Redis>}
   *
   */
  #subInsMap = {};

  /**
   *
   * @param {import('../lib/hwbase').HwAppBase} app - app instance
   * @param {import('../types/HwBase').PluginConfigItem} info - 实例配置
   */
  constructor(app, info) {
    super(app, info);

    /** @type { import('../types/HwRedis').HwRedisPluginCfg } */
    this._cfg = /**@type {any}*/ (null);
  }

  /**
   * 生成实例映射 key
   * @param {string} ip - ip 地址
   * @param {number} port - 端口
   * @param {number} db - 数据库
   * @returns {string} 实例映射 key
   */
  #getMapKey(ip, port, db) {
    return `${ip}:${port}:${db ?? 0}`;
  }

  get _() {
    return this.#_ins;
  }

  /**
   *
   * @param {string} name 实例名字
   * @param {import('../types/HwRedis').HwRedisCfg} cfg - 实例配置
   * @param {boolean} isSub 是否是订阅类型
   * @returns {Redis | null}
   */
  #makeIns(name, cfg, isSub) {
    const key = this.#getMapKey(cfg.host, cfg.port, cfg.db ?? -1);
    if (isSub === false) {
      const insT = this.#insMap[key];
      if (insT !== undefined) {
        this.app.logger.info(
          `reuse normal redis: ${cfg.host}:${cfg.port}:${cfg.db}`,
        );
        return insT;
      }

      if (this.#_ins[name]) {
        const err = `redis normal [ ${name} ] instance has exist!`;
        this.app.logger.warn(err);
        throw new Error(err);
      }
    } else {
      const insT = this.#subInsMap[key];
      if (insT !== undefined) {
        this.app.logger.info(
          `reuse sub redis: ${cfg.host}:${cfg.port}:${cfg.db}`,
        );
        return insT;
      }

      if (this.#subIns[name]) {
        const err = `redis sub [ ${name} ] instance has exist!`;
        this.app.logger.warn(err);
        throw new Error(err);
      }
    }

    const ins = new Redis(cfg);
    ins.on("ready", (/**@type {any}*/ err) => {
      if (!err) {
        this.app.logger.info(`redis ${name} is Reday!`);
      }
    });

    ins.on("error", (err) => {
      this.app.logger.warn(`redis ${name} error!`, err.toString());
    });

    ins.on("reconnecting", (/**@type {any}*/ _err) => {
      this.app.logger.warn(`redis ${name} is reconnecting!`);
    });

    // 添加到映射表里面方便重用
    if (isSub === false) {
      this.#insMap[key] = ins;
    } else {
      this.#subInsMap[key] = ins;
    }

    return ins;
  }

  /** 根据名字获取redis实例
   *
   * @param {string?} name 实例名字,不跟使用缺省的
   * @returns {import('ioredis').Redis}
   */
  getInsByName(name) {
    let nameT = name === undefined || name === null ? this._cfg.default : name;
    return this.#_ins[nameT] ?? null;
  }

  /**
   * 根据IP和端口号获取实例
   * @param {string} ip - ip 地址
   * @param {number} port - 端口
   * @param {number?} db - DB 索引
   * @returns {import('ioredis').Redis}
   */
  getInsByAddr(ip, port, db) {
    const key = this.#getMapKey(ip, port, db ?? -1);
    return this.#insMap[key] ?? null;
  }

  /** 获取实例
   *
   * @param {string} name 实例名字
   * @param {import('../types/HwRedis').HwRedisCfg} cfg 实例配置
   * @param {boolean} isSub - 是否订阅类型
   *    - false， 不是， 如果实例不存在，会创建新的，如果存在，重用
   *    - true,  是， 对于订阅类型的，就创建一个新的实例
   * @returns { Promise<Redis>}
   */
  async getIns(name, cfg, isSub = false) {
    const ins = this.#makeIns(name, cfg, isSub);
    if (ins === null) {
      throw new Error(`redis instance [ ${name} ] not found or create failed!`);
    }

    if (isSub === false) {
      this.#_ins[name] = ins;
      if (this._cfg?.default === undefined) {
        this._cfg.default = name;
      }
    } else {
      this.#subIns[name] = ins;
    }

    return ins;
  }

  /**
   * 初始化插件
   */
  async init() {
    /** @type { import('../types/HwRedis').HwRedisPluginCfg } */
    this._cfg = /** @type { import('../types/HwRedis').HwRedisPluginCfg } */ (
      await this.getConfig()
    );
    if (!this._cfg) {
      throw new Error("xxx not find redis.json");
    }

    const insNames = Object.keys(this._cfg.instance);
    if (
      this._cfg?.default === undefined ||
      insNames.indexOf(this._cfg.default) === -1
    ) {
      if (insNames.length > 0) {
        this._cfg.default = insNames[0];
      }
    }

    for (let insName in this._cfg.instance) {
      insNames.push(insName);
      const cfg = this._cfg.instance[insName];
      await this.getIns(insName, cfg, false);
    }
  }

  async start() {}

  async stop() {
    for (let insName in this.#insMap) {
      const ins = this.#insMap[insName];
      await ins.quit();
    }

    for (let insName in this.#subInsMap) {
      const ins = this.#subInsMap[insName];
      await ins.quit();
    }
  }
}

module.exports = {
  npluginDefault: RedisCli,
  RedisCli,
};
