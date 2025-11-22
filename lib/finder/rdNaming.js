

/**
 * Redis-based service naming client
 * Handles service registration, discovery, and health monitoring
 */
class RedisNamingCli {
  /**
   * @param { import('./rdFinder').RedisFinder  } rdFinder 日志对象
   */
  constructor ( rdFinder ) {

    /** @type {import('./rdFinder').RedisFinder} */
    this._finder = rdFinder;

    this._logger = rdFinder._logger;

    /** @type {Map<string, import('../../types').HwHost[]>} */
    this._serviceCache = new Map();

    /** @type {Set<string>} */
    this._subscribedServices = new Set();


    /** @type {string} */
    //this._channelPrefix = `nfinder:${this._namespace}_${this._group}:`;

    /** @type {NodeJS.Timeout | null} */
    this._heartbeatTimer = null;

    /** 是否注册 */
    this._bHasReg = false;
  }

  /**
   * Initialize Redis connections
   */
  async init () {


  }

  /**
   * Register a service instance
   */
  async registerInstance ( ) {
    if ( !this._finder._rd ) {
      throw new Error( 'Redis client not initialized' );
    }

    const nameIns = this._finder._nameIns;

    await this._finder._rd.pipeline()
      .hset( this._finder.groupKey, this._finder.insName, JSON.stringify( nameIns ) )
      .sadd( 'nfinder:groupList', this._finder.groupKey )
      .exec();

    // Store current instance info for heartbeat
    this._bHasReg = true;

    // Start heartbeat
    this._startHeartbeat();

    // Publish service update
    await this._publishServiceUpdate( 'up' );

    this._logger.info( `Registered instance ${this._finder.insName}` );

    let subs = this._finder._cfgNaming.subscribe;
    if( subs && subs instanceof Array ) {
      subs.push( {
        serviceName: this._finder._cfg.naming.serviceName,
      } );
      for( let it of subs ) {
        const hosts = await this.getAllInstancesFromRedis( it.serviceName );
        this._serviceCache.set( it.serviceName, hosts );
        this._subscribedServices.add( it.serviceName );
        this._finder.subscribe( `${this._finder.groupKey}:${it.serviceName}`, ( channel,msg ) => {
          try{
            const v = JSON.parse( msg );
            this._handleServiceUpdate( it.serviceName, v );
          } catch( err ) {
            this._logger.warn( 'subscribe error', err );
          }
        } );

        if( hosts.length > 0 ) {
          // 触发服务变化通知
          this._finder._app.emit( 'services_change', it.serviceName, hosts );
        }
      }
    }
    
  }

  /**
   * Deregister a service instance
   */
  async deregisterInstance ( ) {
    if ( !this._finder._rd || this._finder._rd.status !== 'ready' ) {
      // throw new Error( 'Redis client not initialized' );
      return;
    }
    
    await this._finder._rd.hdel( this._finder.groupKey, this._finder.insName );
    
    // Stop heartbeat if this is the current instance
    if ( this._bHasReg === true ) {
      this._stopHeartbeat();
    }

    // Publish service update
    await this._publishServiceUpdate( 'down' );

    this._logger.info( `Deregistered instance ${this._finder.insName}` );
  }

  /**
   * Get all instances for a service
   * @param {string} serviceName 服务名称
   * @returns {Promise<import('../../types').HwHost[]>}
   */
  async getAllInstancesFromRedis ( serviceName ) {
    if ( !this._finder._rd ) {
      throw new Error( 'Redis client not initialized' );
    }

    const insKeys = await this._finder._rd.hkeys( this._finder.groupKey );
    /** @type {string[]} */
    const fields = [];
    for( let it of insKeys ) {
      if( it.startsWith( serviceName ) ) {
        fields.push( it );
      }
    }

    if( fields.length === 0 ) {
      return [];
    }

    /** @type {import('../../types').HwHost[]} */
    const res = [];
    const instances = await this._finder._rd.hmget( this._finder.groupKey, ...fields );
    for( let it of instances ) {
      if( it !== null ) {
        /** @type {import('../../types').HwHost} */
        const instance = JSON.parse( it );
        instance.serviceName = serviceName;
        res.push( instance );
      }
    }

    return res;
  }

  /**
   * Get all instances for a service
   * @param {string} serviceName 服务名称
   * @returns {Promise<import('../../types').HwHost[]>}
   */
  async getAllInstances ( serviceName ) {
    
    let bSub = this._subscribedServices.has( serviceName );
    let len = 0; 
    /** @type {import('../../types').HwHost[]} */
    let hosts = [];
    if( bSub === false ) {
      // 没有订阅，从redis中获取
      hosts =  await this.getAllInstancesFromRedis( serviceName );
    } else {
      hosts = this._serviceCache.get( serviceName ) ?? [];
      len = hosts.length;
    }

    const expireTime = Date.now() - 30 * 1000;
    hosts = hosts.filter( ( v ) => {
      return v.healthy !== false && v.enabled !== false && v.metadata.updateTm > expireTime;
    } );

    // 有变化并且订阅了
    if( bSub === true && hosts.length !== len ) {
      this._serviceCache.set( serviceName, hosts );
      this._finder._app.emit( 'services_change', serviceName, hosts );
    }

    return hosts;
  }

  /**
   * Get healthy instances for a service
   * @param {string} serviceName 服务名称
   * @returns {Promise<import('../../types').HwHost[]>}
   */
  async selectInstances ( serviceName ) {
    return this.getAllInstances( serviceName );
  }

  /**
   * @param {string} serviceName 服务名称
   * @param {import('../../types').Instance} instInfo 实例信息
   * @returns {import('../../types').HwHost}
   */
  genHwHostByInstance ( serviceName, instInfo ) {

    /** @type {any} */
    const meta = instInfo.metadata;

    /** @type {import('../../types').HwHost} */
    return {
      serviceName: serviceName,
      ip: instInfo.ip,
      port: instInfo.port,
      weight: instInfo.weight ?? 1,
      healthy: instInfo.healthy,
      enabled: instInfo.enabled,
      metadata: {
        nodeName: meta.nodeName,
        rdCfgKey: meta.rdCfgKey,
        createTm: meta.createTm,
        updateTm: meta.updateTm,
        appName: meta.appName,
      }
    };
  }


  /**
   * Handle service update messages
   * @private
   * @param {string} serviceName 频道名称
   * @param { import('../../types').HwServiceChange} message 消息内容
   */
  async _handleServiceUpdate ( serviceName, message ) {
    try {
      const info = message.info;

      switch( message.act ) {
      case 'up':
        {
          if( this._finder.insName === message.instanceId ) {
            break;
          }

          let hosts = this._serviceCache.get( serviceName );
          if( hosts ) {
            const idx = hosts.findIndex( ( v ) => v.ip === info.ip && v.port === info.port );
            if ( idx !== -1 ) hosts.splice( idx, 1 );

            hosts.push( this.genHwHostByInstance( serviceName, info ) );

            this._finder._app.emit( 'services_change', serviceName, hosts );
          }
        }
        break;
      case 'down':
        {
          if( this._finder.insName === message.instanceId ) {
            break;
          }

          let hosts = this._serviceCache.get( serviceName );
          if( hosts ) {
            const idx = hosts.findIndex( ( v ) => v.ip === info.ip && v.port === info.port );
            if ( idx !== -1 ) {
              hosts.splice( idx, 1 );
              this._finder._app.emit( 'services_change', serviceName, hosts );
            }
          }
        }
        break;
      case 'stat':
        {
          if( this._finder.insName === message.instanceId ) {
            if( typeof info.weight === 'number' ) {
              this._finder._nameIns.weight = info.weight;
            }

            this._finder._nameIns.enabled = info.enabled;
            this._finder._nameIns.healthy = info.healthy;
          }

          let hosts = this._serviceCache.get( serviceName );
          if( hosts ) {
            const v = hosts.find( ( v ) => v.ip === message.info.ip && v.port === message.info.port );
            if ( v ) {
              if( typeof info.weight === 'number' ) {
                v.weight = info.weight;
              }

              v.enabled = info.enabled;
              v.healthy = info.healthy;
            }
          }
        }
        break;
      default:
        break;
      }
      
    } catch ( err ) {
      this._logger.error( 'Error handling service update:', err );
    }
  }

  /**
   * Publish service update notification
   * @private
   * @param {'up'|'down'|'stat'} act 操作
   */
  async _publishServiceUpdate ( act ) {
    this._finder.publish( this._finder.serviceChannel, {
      act,
      instanceId: this._finder.insName,
      info: this._finder._nameIns,
    } );
  }

  /**
   * 更新实例,更新实例的存活时间戳
   */
  async #updateInstance () {
    if ( !this._finder._rd ) {
      throw new Error( 'Redis client not initialized' );
    }

    const nameIns = this._finder._nameIns;
    if ( nameIns.metadata ) {
      // @ts-ignore
      nameIns.metadata.updateTm = Date.now();
    }

    this._finder._rd.hset( this._finder.groupKey, this._finder.insName, JSON.stringify( nameIns ) );
    this._publishServiceUpdate( 'up' );
  }

  /**
   * 启动当前实例的心跳
   * @private
   */
  _startHeartbeat () {
    if ( this._heartbeatTimer ) {
      return;
    }

    this._heartbeatTimer = setInterval( async () => {
      if ( this._bHasReg === true ) {
        try {
          await this.#updateInstance( );
        } catch ( err ) {
          this._logger.error( 'Error sending heartbeat:', err );
        }
      }
    }, 10000 ); // 10 seconds heartbeat
  }

  /**
   * 停止当前实例的心跳
   * @private
   */
  _stopHeartbeat () {
    if ( this._heartbeatTimer ) {
      clearInterval( this._heartbeatTimer );
      this._heartbeatTimer = null;
    }
  }

  /**
   * Clean up resources
   */
  async destroy () {
    try{
      await this.deregisterInstance();
    } catch ( /** @type {any} */err ) {
      this._logger.warn( 'Error destroying RedisNamingCli:', err.toString() );
    }
  }
  
  async onAfterStartAll () {
    if( this._serviceCache.size > 0 ) {
      for( let it of this._serviceCache.keys() ) {
        this._finder._app.emit( 'services_change', it, this._serviceCache.get( it ) ?? [] );
      }
    }
  }

} // end RedisNamingCli

module.exports = { RedisNamingCli };
