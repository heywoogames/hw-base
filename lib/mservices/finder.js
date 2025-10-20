
const { RedisFinder } = require( '../finder/rdFinder' );
const { nnet } = require( '@heywoogames/hw-utils' );
const { EventEmitter } = require( 'node:events' );


class HwFinder extends EventEmitter
{
  /**
   * 
   * @param {import('../../types').HwAppBase} app  - app instance
   */
  constructor (  app ) {
    super();

    /** @type {import('../../types').HwAppBase} */
    this._app = app;

    /** @type {import('../finder/finderBaseI').FinderBaseI | null} */
    this._finders = null;

    /** @type {import('../../types').MicroServiceConfig} */
    this._cfg = /** @type {any} */( null );
  }

  /**
   * 
   * @param {import('../../types').MicroServiceConfig} cfg - micro service config
   * @param { Console } logger - logger instance
   */
  async init ( cfg, logger ) {
    this._cfg = cfg;

    if( this._cfg?.finder?.naming?.serviceName && 
      typeof ( this._cfg.finder.naming.serviceName ) !== 'string' ) {
      this._cfg.finder.naming.serviceName = this._app.env.serverId;
    }

    this._logger = logger ?? console;

    if( typeof( this._cfg.ip ) !== 'string' || this._cfg.ip.length < 8 ) {
      this._cfg.ip = nnet.localIp();
    }

    if( cfg.finder?.enable !== true ) {
      this._logger.info( 'finder disabled' );
      return;
    } 

    this._finders = new RedisFinder( this, cfg.finder, logger );

    if( this._finders ) {
      await this._finders.init();
    }
    
  }

  async start () {
    if( this._finders ) {
      await this._finders.start();
    }
  }

  async onAfterStartAll () {
    if( this._finders ) {
      await this._finders.onAfterStartAll();
    }
  }

  async stop () {
    if( this._finders ) {
      await this._finders.stop();
    }
  }

  /**
   * 获取服务
   * @param {string} serviceName - 服务名称
   * @returns { Promise< import('../../types').HwHost[]  > }
   */
  async getService ( serviceName ) {
    if( this._finders ) {
      return await this._finders.getService( serviceName );
    }
    return [];
  }

  /**
   * 获取配置
   * @template T
   * @param {string} dataId - 数据ID 
   * @param {string} [groupName] - 分组名称
   * @returns { Promise< T | null> }
   */
  async getConfig ( dataId, groupName ) {
    if( this._finders ) {
      return await this._finders.getConfig( dataId, groupName );
    }
    return null;
  }

  /**
   * 获取 Redis 客户端
   * @returns {import('ioredis').Redis | null}
   */
  getRd () {
    if( this._finders ) {
      return this._finders.getRd();
    }
    return null;
  }

} // end class HwFinder

module.exports = { HwFinder };
