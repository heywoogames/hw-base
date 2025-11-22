"use strict";

const { HwPluginBase } = require("../../lib/pluginBase");
/**
 * @augments {HwPluginBase<import('../app').Main>}
 */
class Rediscli extends HwPluginBase {
  /**
   *
   * @param {import('../app').Main} app - app instance
   * @param {import('../../types').PluginConfigItem} plugInfo - plugin info
   */
  constructor(app, plugInfo) {
    super(app, plugInfo);
    console.log("-- ", this.app.env.serverId);
  }

  async getData() {
    console.log("--- plugin1 getData");
  }

  async init() {
    const cfg = await this.getConfig();
    console.log("---\t redisCli init");
    console.log(cfg);
  }

  async stop() {
    console.log("---\t redisCli stop");
  }

  async start() {
    console.log("---\t redisCli start");
  }

  async afterStartAll() {
    console.log("---\t redisCli start all");
  }
}

module.exports = {
  npluginDefault: Rediscli,
  Rediscli,
};
