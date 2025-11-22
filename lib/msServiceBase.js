const { validationResult } = require("express-validator");

/**
 * @typedef {import('../types').HwAppBase} HwAppBase
 */

/**
 * 微服务基类
 * @class
 *
 * @template {HwAppBase} TApp
 */
class HwMSServiceBase {
  /** @type {import('express').Express} */
  #_eapp = /**@type {any}*/ (null);

  /** @type {TApp} */
  #_app = /**@type {any}*/ (null);

  /** @type { import('./mservices/index').HwMicroService} */
  #_ms;

  /**
   *
   * @param {import('./mservices/index').HwMicroService} msSer - micro service instance
   */
  constructor(msSer) {
    this.#_ms = msSer;
  }

  get eapp() {
    if (this.#_eapp === null) {
      this.#_eapp = this.#_ms._eapp;
    }
    return this.#_eapp;
  }

  get app() {
    if (this.#_app === null) {
      this.#_app = /**@type {TApp}*/ (this.#_ms._app);
    }
    return this.#_app;
  }

  get ms() {
    return this.#_ms;
  }

  /**
   * 校验web请求参数
   * @param {import('../types').HwExpressRequest} req 请求
   * @param {import('../types').HwExpressResponse} res 响应
   *
   * @returns {boolean} 是否成功
   */
  validRequestPara(req, res) {
    try {
      validationResult(req).throw();
    } catch (/**@type {any}*/ err) {
      const errmsg = new Set();
      for (let it of err.errors) {
        errmsg.add(`${it.param}: ${it.msg}`);
      }
      res.sendFail(500, [...errmsg].join("\n"));
      return false;
    }

    return true;
  }
}

module.exports = { HwMSServiceBase };
