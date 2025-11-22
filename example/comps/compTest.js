const { HwCompBase } = require("../../lib/hwCompBase");

class CompTest extends HwCompBase {
  /**
   *
   * @param {import('../../lib/hwbase').HwAppBase} app - app instance
   */
  constructor(app) {
    super(app);
    this.name = "CompTest";
  }

  async onInit() {
    console.log(`${this.name}: onInit`);
  }

  /** 启动函数 */
  async onStart() {
    console.log(`${this.name}: onStart`);
  }

  /**
   * 所有组件，插件启动完成后调用
   */
  async onAfterStartAll() {
    console.log(`${this.name}: onAfterStartAll`);
  }

  /**
   * app 的 onBeforeStop 时调用
   */
  async onBeforeStop() {
    console.log(`${this.name}: onBeforeStop`);
  }

  async onAfterStop() {
    console.log(`${this.name}: onAfterStop`);
  }

  async onAfterStopAll() {
    console.log(`${this.name}: onAfterStopAll`);
  }
}

module.exports = {
  ncompDefault: CompTest,
  CompTest,
};
