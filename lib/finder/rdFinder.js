
const { RedisNamingCli } = require( './rdNaming' );
const { RedisConfigCli } = require( './rdConfig' );
const { FinderBaseI } = require( './finderBaseI' );
const { Redis } = require( 'ioredis' );


/**
 * @typedef {import('../../plugins/drv/drv_redis').SubStat} SubStat
 */


/**
 * 基于redis的 服务发现与配置管理类
 * 提供类似 nacos的 接口
 * 
 * 
 * @class
 */
class RedisFinder extends FinderBaseI
{
  /** 
   * @type { Redis } 
   * 客户端
   */
  _rd = /**@type {any}*/( null );

  /** 
   * @type {Redis} 
   * 订阅客户端
  */
  _sub = /**@type {any}*/( null );

  /** @type {SubStat} 模式订阅状态*/
  #_psubTa = {
    type: 'psub',
    sub: { },
    subCb: { },
  };

  /** @type {SubStat} 普通订阅状态*/
  #_subTa = {
    type: 'sub',
    sub: { },
    subCb: { },
  };

  /**
   * @param {import('../mservices/finder').HwFinder} finder  finder instance
   * @param {import('../../types/HwBase').FinderConfig} cfg 配置
   * @param {Console} logger 日志对象
   */
  constructor ( finder, cfg, logger  ) {
    super( finder, cfg, logger );

    /** @type { import('types').HwRedisCfg } */
    this._rdCfg = {
      host: 'localhost',
      port: 6379,
      password: '',
      db: 1,
    };

    /** @type {string} 服务分组Key,类型 hash */
    this.groupKey = `nfinder:${this._namespace}:${this._group}`;

    /** @type {string} 服务实例名字，用作 hash Key */
    this.insName = `${this._cfg.naming.serviceName}@${this._defIP}:6379`;

    /** 服务的通道 */
    this.serviceChannel = `${this.groupKey}:${this._cfg.naming.serviceName}`;

    /** @type {RedisNamingCli | null} 命名客户端 */
    this.nameCli = null;

    /** @type {RedisConfigCli | null} 配置客户端 */
    this.configCli = null;

    /** @type {boolean} 是否初始化 */
    this._bInited = false;

    /** @type {boolean} 是否初始化 */
    this._rdInited = false;
    /** @type {boolean} 是否初始化 */
    this._subInited = false;

  }

  /**
   * 初始化, 包括redis 连接
   */
  async init () {
    // 生成redis配置
    const { redis } = this._cfg.base;
    if( redis ) {
      this._rdCfg.host = redis.host;
      this._rdCfg.port = redis.port;
      this._rdCfg.username = redis.username || '';
      this._rdCfg.password = redis.password || '';
      this._rdCfg.db = redis.db || 1;
      // @ts-ignore
      this._rdCfg.retryStrategy = ( times ) => Math.min( times * 100, 2000 );
    }

    // 初始化元数据
    await this.initMetaInfo();

    this.insName = `${this._cfg.naming.serviceName}@${this._nameIns.ip}@${this._nameIns.port}`;

    if( this._cfg.naming.enable === true ) {
      this.nameCli = new RedisNamingCli( this );
    }

    if( this._cfg.config.enable === true ) {
      this.configCli = new RedisConfigCli( this );
    }

    await this.#ready();
  }


  #ready () {
    return new Promise( ( resolve, reject ) =>{
    // 客户端
      const rd = new Redis( this._rdCfg );
      rd.on( "ready",  ( /**@type {any}*/err )=>{
        if( !err ) {
          this._logger.debug( `rdFinder rd Reday!` );
          this._rdInited = true;
          if( this._subInited && this._bInited === false ) {
            this._finder.emit( 'onRdInited' );
          }            
        }
      } );
        
      rd.on( "error", ( err )=>{
        this._logger.warn( `rdFinder error!`, err.toString() );
      } );
        
      rd.on( "reconnecting",  ( /**@type {any}*/_err )=>{
        this._logger.warn( `rdFinder is reconnecting!` );
      } );

      this._rd = rd;
    

      // 订阅客户端
      const rdSub = new Redis( this._rdCfg );
      rdSub.on( "ready",  ( /**@type {any}*/err )=>{
        if( !err ) {
          this._logger.debug( `rdFinder sub is Reday!` );
          this._subInited = true;

          if( this._rdInited && this._bInited === false ) {
            this._finder.emit( 'onRdInited' );
          }
        }
      } );
        
      rdSub.on( "error", ( err )=>{
        this._logger.warn( `rdFinder sub error!`, err.toString() );
      } );
        
      rdSub.on( "reconnecting",  ( /**@type {any}*/_err )=>{
        this._logger.warn( `rdFinder sub is reconnecting!` );
      } );

      rdSub.on( 'pmessage', ( pattern, channel, message )=>{
        this.#on_pmessage( pattern, channel, message );
      } );

      rdSub.on( 'message', ( channel, message )=>{
        this.#on_message( channel, message );
      } );

      this._sub = rdSub;

      this._finder.once( 'onRdInited', async ()=>{
        this._bInited = true;

        if( this.nameCli ) {
          await this.nameCli.registerInstance();
        }
      
        if( this.configCli ) {
          await this.configCli.init();
        }

        resolve( true );
      } );
      
    } );  

  }


  async start () {
    // 其他初始化  
  }



  /**
   * 
   * @param {string} pattern 模式
   * @param {string} channel 通道
   * @param {string} message 消息
   */
  #on_pmessage ( pattern, channel, message ) {
    this._finder.emit( 'pmessage',pattern,channel, message );

    const evtName = `mq:${pattern}`;
    if( this.#_psubTa.subCb[evtName] ) {
      this._finder.emit( evtName,pattern,channel, message );
    }

  }

  /**
   * 
   * @param {string} channel 通道
   * @param {string} message 消息
   */
  #on_message ( channel, message ) {
    this._finder.emit( 'message',channel, message );

    const evtName = `mq:${channel}`;
    if( this.#_subTa.subCb[evtName] ) {
      this._finder.emit( evtName,channel, message );
    }
  }

  async stop () {
    if( this.nameCli ) {
      await this.nameCli.destroy();
    }

    if( this._sub.status === 'ready' ) {
      await this._sub.unsubscribe();
      await this._sub.punsubscribe();
    }

    await this._rd.quit();
    await this._sub.quit();
  }

  /**
   * 获取服务
   * @param {string} serviceName - 服务名称
   * @returns { Promise< import('../../types').HwHost[]  > }
   */
  async getService ( serviceName ) {
    if( !this.nameCli ) {
      this._logger.warn( 'rdFinder naming service not start!' );
      return [];
    }

    const hosts = await this.nameCli.selectInstances( serviceName );

    // @ts-ignore
    return hosts.map( it => {
      return {
        instanceId: `${it.serviceName}@${it.ip}@${it.port}`,
        ip: it.ip,
        port: it.port,
        weight: it.weight,
        healthy: it.healthy,
        enabled: it.enabled,
        ephemeral: false,
        clusterName: '',
        serviceName: it.serviceName,
        metadata: it.metadata,
        instanceHeartBeatInterval: 5000,
        instanceHeartBeatTimeout: 5000,
        instanceIdGenerator: '',
        ipDeleteTimeout: 30000
      };
    } );
  }

  /**
   * 获取配置
   * @template T
   * @param {string} dataId - 数据ID 
   * @returns { Promise< T | null> }
   */
  async getConfig ( dataId ) {
    if( this.configCli === null ) {
      this._logger.warn( 'rdFinder config not start!' );
      return null;
    }

    return await this.configCli.getConfig( dataId );
  }

  /**
   * 
   * @param {SubStat} ta - 订阅状态
   * @param {string} evtStr - 事件名称
   * @param {(...args: any[]) => void} [fun] - 回调函数
   */
  #addSubEvt ( ta, evtStr, fun ) {
    const sb = ta.sub[evtStr];
    if( sb === undefined ) {
      ta.sub[evtStr] = 1;
      switch( ta.type ){
      case 'sub':
        this._sub.subscribe( evtStr );
        break;
      case 'psub':
        this._sub.psubscribe( evtStr );
        break;
      }
    } else {
      ta.sub[evtStr] = sb + 1;
    }

    if( typeof( fun ) === 'function' ){
      const evtName = `mq:${evtStr}`;
      const v = ta.subCb[evtName];
      if( v === undefined ) {
        ta.subCb[evtName] = 1;
      } else {
        ta.subCb[evtName] = v + 1;
      }

      this._finder.on( evtName, fun );
    }
  }

  /**
   * 
   * @param {SubStat} ta - 订阅状态
   * @param {string} evtStr - 事件名称
   * @param {(...args: any[]) => void} [fun] - 回掉函数
   */
  #rmSubEvt ( ta, evtStr, fun ){
    let sb = ta.sub[evtStr];
    if( sb !== undefined ) {
      sb -= 1;
      if( sb <= 0 ) {
        delete ta.sub[evtStr];
        switch( ta.type ){
        case 'sub':
          this._sub.unsubscribe( evtStr );
          break;
        case 'psub':
          this._sub.punsubscribe( evtStr );
          break;
        }
      } else {
        ta.sub[evtStr] = sb;
      }


      if( typeof( fun ) === 'function' ) {
        const evtName = `mq:${evtStr}`;
        this._finder.off( evtName, fun );

        let v = ta.subCb[evtName];
        if( v !== undefined ) {
          v -= 1;
          if( v <= 0 ) {
            delete ta.subCb[evtName];
          }else {
            ta.subCb[evtName] = v;
          }
        } else {
          this._logger.warn( `-- evt subCb ${evtName} cnt error, not find` );
        }
      }
    } else {
      this._logger.warn( `-- evt ${evtStr} cnt error, not find` );
    }
  }

  /** 根据模式订阅消息
   * 
   * @param {string | string[]}  pattern 模式
   * @param {import('types').CbRedisPSubFun} [fun] 回调函数 
   */
  psubscribe ( pattern, fun ){
    if( this._sub === null ) {
      return;
    }

    if( ( pattern instanceof Array ) && typeof( fun ) === 'function' ) {
      this._logger.warn( ` parame fun unsupport for parrern array` );
      return;
    }

    if( typeof pattern === 'string' ) {
      this.#addSubEvt( this.#_psubTa, pattern, fun );
    } else if( pattern instanceof Array ){
      pattern.forEach( ( v ) => this.#addSubEvt( this.#_psubTa, v ) );
    }
  }

  /** 取消指定模式的订阅
   * 
   * @param {string | string[]}  pattern 模式
   * 
   * @param {import('types').CbRedisPSubFun} [fun] 回调函数 
   */
  punsubscribe ( pattern, fun ){
    if( this._sub === null ) {
      return;
    }

    if( ( pattern instanceof Array ) && typeof( fun ) === 'function' ) {
      this._logger.warn( ` parame fun unsupport for parrern array` );
      return;
    }

    if( typeof pattern === 'string' ) {
      this.#rmSubEvt( this.#_psubTa, pattern, fun );
    } else if( pattern instanceof Array ){
      pattern.forEach( ( v ) => this.#rmSubEvt( this.#_psubTa, v ) );
    }
  }

  /** 订阅指定通道的消息
     * 
     * @param {string | string[]} channels  要订阅的通道
     * @param {import('types').CbRedisSub} [fun] 回调函数 
     */
  subscribe ( channels, fun ){
    if( this._sub === null ) {
      return;
    }
    if( ( channels instanceof Array ) && typeof( fun ) === 'function' ) {
      this._logger.warn( ` parame fun unsupport for channels array` );
      return;
    }

    if( typeof channels === 'string' ) {
      this.#addSubEvt( this.#_subTa, channels, fun );
    } else if( channels instanceof Array ){
      channels.forEach( ( v ) => this.#addSubEvt( this.#_subTa, v ) );
    }
  }

  /** 取消指定通道的订阅
   * 
   * @param {string | string[]} channels  要取消订阅的通道
   * @param {import('types').CbRedisSub} [fun] 回调函数 
   */
  unsubscribe ( channels, fun ) {
    if( this._sub === null ) {
      return;
    }

    if( ( channels instanceof Array ) && typeof( fun ) === 'function' ) {
      this._logger.warn( ` parame fun unsupport for channels array` );
      return;
    }

    if( typeof channels === 'string' ) {
      this.#rmSubEvt( this.#_subTa, channels, fun );
    } else if( channels instanceof Array ){
      channels.forEach( ( v ) => this.#rmSubEvt( this.#_subTa, v ) );
    }
  }

  /**
   * 发布消息
   * @param {string} channel 通道名称
   * @param { string | Record<string, any>} message 消息内容
   */
  async publish ( channel, message ){
    if( this._rd === null || this._rd.status !== 'ready' ) {
      this._logger.warn( 'Redis publisher not initialized' );
      return;
    }

    if( typeof message === 'object' ) {
      await this._rd.publish( channel, JSON.stringify( message ) );
    } else {
      await this._rd.publish( channel, message );      
    }
  }

  async onAfterStartAll () {
    if( this.nameCli ) {
      this.nameCli.onAfterStartAll();
    }
  }
  
};


module.exports = { RedisFinder };
