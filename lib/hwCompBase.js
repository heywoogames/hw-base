const EventEmitter = require("events");

/**
 * @typedef {import('../types').HwAppBase} HwAppBase
 */

/**
 * hw组件基类
 *
 * 包含下列生命周期函数
 *
 *  - onInit(): Promise<void>, HwAppBase 的 onAfterInit 后调用
 *  - onStart(): Promise<void> app 所有插件 start 调用完成之后调用
 *  - onAfterStartAll(): Promise<void>  所有插件 afterStartAll之后， HwAppBase 的 onAfterStart调用之前调用
 *  - onBeforeStop(): Promise<void> HwAppBase 的 beforeStopAll,调用后调用
 *  - onAfterStop(): Promise<void> 所有插件stop,调用后调用
 *  - onAfterStopAll(): Promise<void>  所有插件的 HwAppBase
 *
 * @interface
 * @class
 *
 * @template {HwAppBase} TApp
 */
class HwCompBase extends EventEmitter {
  /** @type {TApp} */
  #_app;

  #_name = "";

  /**
   *
   * @param {TApp} app - app instance
   */
  constructor(app) {
    super();
    this.#_app = app;
  }

  get name() {
    return this.#_name;
  }
  set name(name) {
    this.#_name = name;
  }

  get app() {
    return this.#_app;
  }

  // 初始化函数
  async onInit() {}

  /** 启动函数 */
  async onStart() {}

  /**
   * 所有组件，插件启动完成后调用
   */
  async onAfterStartAll() {}

  /**
   * app 的 onBeforeStop 时调用
   */
  async onBeforeStop() {}

  async onAfterStop() {}

  async onAfterStopAll() {}
}

module.exports = { HwCompBase };
