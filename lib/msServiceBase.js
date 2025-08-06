
/**
 * 微服务基类
 * @class
 */
class HwMSServiceBase
{
  /** @type {import('express').Express} */
  #_eapp = /**@type {any}*/( null );

  /** @type {import('../types').HwAppBase} */
  #_app = /**@type {any}*/( null );

  /** @type { import('./mservices/index').HwMicroService} */
  #_ms;

  /**
   * 
   * @param {import('./mservices/index').HwMicroService} msSer - micro service instance
   */
  constructor ( msSer ){
    this.#_ms = msSer;
  }

  get eapp () {
    if( this.#_eapp === null ) {
      this.#_eapp = this.#_ms._eapp;
    }
    return this.#_eapp;
  }

  get app () {
    if( this.#_app === null ) {
      this.#_app = this.#_ms._app;
    }
    return this.#_app;
  }

  get ms () {
    return this.#_ms;
  }

}

module.exports = { HwMSServiceBase };
