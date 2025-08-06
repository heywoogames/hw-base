
const { EventEmitter } = require( 'node:events' );

/**
 * HwPluginBase 插件基类
 * @class
 * @interface
 */
class HwPluginBase extends EventEmitter
{
  /**
     * 
     * @param { import('../types').HwAppBase } app - app instance
     * @param { import('../types').PluginConfigItem } plugInfo - plugin info
     */
  constructor ( app, plugInfo )
  {
    super();
        
    /** @type {import('../types').HwAppBase} */
    this._app = app;

    /** @type {string} */
    // @ts-ignore
    this._name = /** @type {any} */( plugInfo.name );

    /** @type {string} */
    this._alias = /** @type {any} */( plugInfo.alias );

    /** @type {import('../types').PluginConfigItem} */
    this._info = plugInfo;
  }

  get app () {
    return this._app;
  }

  get name () {
    return this._name;
  }

  get alias () {
    return this?._alias ?? this._name;
  }

  get info () {
    return this._info;
  }

  /**
     * @template T
     * @returns { Promise<T | null> }
     */
  async getConfig () {
    const cfgName = this._info?.cfgName ?? this._name;
    return await this._app.getConfig( cfgName );
  }

  async init () {
    this._app.logger.debug( `[${this._name}] not implement init` );
  }

  async start () {
    this._app.logger.debug( `[${this._name}] not implement start` );
  }

  async stop () {
    this._app.logger.debug( `[${this._name}] not implement stop` );
  }

  /**
     * 所有插件启动后回调
     */
  async afterInitAll () {
    this._app.logger.debug( `[${this._name}] not implement afterInitAll` );
  }

  async beforeStartAll () {
    this._app.logger.debug( `[${this._name}] not implement beforeStartAll` );
  }

  async afterStartAll () {
    this._app.logger.debug( `[${this._name}] not implement afterStartAll` );
  }

  async beforeStopAll () {
    this._app.logger.debug( `[${this._name}] not implement beforeStopAll` );
  }

  async afterStopAll () {
    this._app.logger.debug( `[${this._name}] not implement afterStopAll` );
  }

}

module.exports = { HwPluginBase };
