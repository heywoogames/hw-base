
const { nnet } = require( '@heywoogames/hw-utils' );

/**
 * finder base interface
 * @interface 
 */
class FinderBaseI
{
  /**
   * 
   * @param {import('../mservices/finder').HwFinder} finder  finder instance
   * @param {import('../../types/HwBase').FinderConfig} cfg 配置
   * @param {Console} logger 日志对象
   */
  constructor ( finder, cfg, logger ) {

    /** @type {import('../mservices/finder').HwFinder} */
    this._finder = finder;

    /** @type {import('../../lib/hwbase').HwAppBase} */
    this._app = finder._app;

    /** @type {import('../../types').FinderConfig} */
    this._cfg = cfg;

    /** @type {Console} */
    this._logger = logger;

    /** @type {import('../../types').FinderNamingConfig} */
    this._cfgNaming = cfg.naming;

    /** @type {import('../../types').FinderConfigConfig} */
    this._cfgCfg = cfg.config;

    /** @type {string} 缺省IP */
    this._defIP = nnet.localIp();

    /** @type {string} 命名空间 */
    this._namespace = this._cfg.base.namespace ?? 'public';

    /** @type {string} 分组 */
    this._group = this._cfg.base.group ?? 'DEFAULT_GROUP';

    const now = Date.now();
    /** @type { import('../../types').Instance} */
    this._nameIns = {
      instanceId: '',
      ip: this._defIP,
      port: 18000,
      healthy: true,
      enabled: true,
      weight: 1,
      metadata: {
        createTm: now,
        updateTm: now,
        appName: this._app.env.serverId
      }
    };
  }


  async init () {
    this._logger.warn( 'finderBaseI init not implement' );
  }

  async start () {
    this._logger.warn( 'finderBaseI start not implement' );
  }

  async stop () {
    this._logger.warn( 'finderBaseI stop not implement' );
  }

  /**
   * 获取服务
   * @param {string} _serviceName - 服务名称
   * @returns { Promise< import('../../types').HwHost[]  > }
   */
  async getService ( _serviceName ) {
    this._logger.warn( 'finderBaseI getService not implement' );
    return [];
  }

  /**
   * 获取配置
   * @template T
   * @param {string} _dataId - 数据ID 
   * @param {string} [_groupName] - 分组名称
   * @returns { Promise< T | null> }
   */
  async getConfig ( _dataId, _groupName ) {
    this._logger.warn( 'finderBaseI getConfig not implement' );
    return null;
  }


  async initMetaInfo () {
    const nameIns = this._nameIns;
    const msCfg = this._finder._cfg;

    // 填充 service 数据
    nameIns.instanceId = this._app.uuid;
    if( msCfg.ip ) {
      nameIns.ip = msCfg.ip;
    }

    nameIns.port = msCfg.port;
    if( this._cfgNaming.weight ) {
      nameIns.weight = this._cfgNaming.weight;
    }

    let appMetaInfo = await this._app.getAppMetaInfo();
    appMetaInfo = appMetaInfo ?? {};

    const now = Date.now();

    nameIns.metadata =  Object.assign( appMetaInfo,  {
      appName: this._app.env.serverId,
      nodeName: this._app._cfg.nodeName,
      rdCfgKey: this._app.rdCfgKey,
      createTm: now,
      updateTm: now,
    } );
  }

  /**
   * 获取 Redis 客户端
   * @returns {import('ioredis').Redis | null}
   */
  getRd () {
    // @ts-ignore
    return this._rd ?? null;
  }

  /**
   * 发布消息
   * @param {string} _channel 通道名称
   * @param { string | Record<string, any>} _message 消息内容
   * @returns { Promise<void> }
   */
  async publish ( _channel, _message ) {
    this._logger.warn( 'finderBaseI publish not implement' );
  }

  async onAfterStartAll () {
    //this._logger.warn( 'finderBaseI onAfterStartAll not implement' );
  }

} // end FinderBaseI


module.exports = { FinderBaseI };
