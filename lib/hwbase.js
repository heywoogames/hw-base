
const logger = require( '@heywoogames/hw-logger' );
const Path = require( 'node:path' );
const {getDepOrder} = require( './depOrder' );
const { EventEmitter } = require( 'node:events' );
const { Command, Option,InvalidArgumentError } = require( 'commander' );
const YWCache = require( '@heywoogames/hw-cache' );
const { nnet } = require( '@heywoogames/hw-utils' );

/**
 * @typedef {import('../types').HwCompBase } HwCompBase
 * @typedef {import('../types').HwPluginBase} HwPluginBase
 * @typedef {import('../types').HwMsResp} HwMsResp
 * @typedef {import('../types').HwMicroService} HwMicroService
 */


const fs = require( 'node:fs' );
let g_cwd = process.cwd();
g_cwd = g_cwd.replace( /\\/g,'/' ); 

/** @type {import('../types').AppEnv} */
const env = {
  PROJ_PATH: g_cwd,
  CFG_PATH: `${g_cwd}/config`,
  env: 'development',
  serverId: '',
  version: '0.0.0',
  description: '',
};

/**
 *
 */
function loadPackInfo (){
  let con = fs.readFileSync( `${env.PROJ_PATH}/package.json`,'utf-8' );
  const pack = JSON.parse( con );

  let packNames = pack.name.split( '/' );
  env.serverId = packNames.length > 1 ? packNames[1] : packNames[0];
  env.version = pack.version;
  env.description = pack.description ?? '';
}

loadPackInfo();


/**
 * @class
 * @description Hw App 基类
 * 事件
 *    - cfg_change,  (alias: string, content: string, dataId: string): void； 配置文件变化事件, 如果没有配置 alias, alias 则使用 dataId
 * 
 */
class HwAppBase extends EventEmitter
{
  /** @type {import('commander').Command} */
  #_program;

  /** @type { import('../types').HwAppCmdOpt } */
  #_cmdOpts = {
    use_ms_parame: false,
    ms_disable: false
  };

  /** @type {Console} 日志*/
  #_logger = console;

  /** @type {{name:string,  ins:HwCompBase}[]} */
  #_compment = [];

  /** @type { Record<string, HwCompBase>} */
  #_compmentMap = {};

  /** 
     * @type {string} 
     *  - 配置文件 redis 配置 key
     *  - 格式: cfg:${env.serverId}:${this._cfg.nodeName}
    */
  #rdCfgKey = '';

  constructor (){
    super();

    this.#rdCfgKey = `cfg:${env.serverId}:`;

    // init cmd line parse
    const program = new Command();
    program.version( env.version );
    program.name( env.serverId );
    program.description( env.description );

    program.addOption( new Option( '-e, --env <env>', 'app node run env. "development" | "production" | [other custom name]' ).default( 'development' ) )
      .addOption( new Option( '--app_name <app Name>', 'The App Name' ) )
      .addOption( new Option( '-m, --use_ms_parame', 'Use micro service parame, ignore config.json' ).default( false ) )
      .addOption( new Option( '--ms_disable', 'Disable micro service' ).default( false ) )
      .addOption( new Option( '--ms_ip <ip>', 'The service use IP' ).conflicts( 'ms_disable' ) )
      .addOption( new Option( '--ms_port <number>', 'The service port number' ).conflicts( 'ms_disable' ).argParser( HwAppBase.#cmdParsePort ) )
      .addOption( new Option( '--ms_prefix <ip>', 'service router prefix' ).default( '' ) )
      .addOption( new Option( '--node_name <name>', 'Node name' ).default( '' ) )
      .addOption( new Option( '--api_doc', 'enable api doc' ).default( false ) );


    this.#_program = program;

    this.#_program.exitOverride();

    /** @type { {[key:string]:HwPluginBase}} */
    this._plugins = {};

    /** @type { {[key:string]:HwPluginBase}} */
    this._pluginsMap = {};

    process.on( 'SIGINT', async ()=>{
      await this.#terminateApp();
    } );

    process.on( 'SIGTREM', async ()=>{
      await this.#terminateApp();
    } );

    /** @type {import('../types').HwAppConfig} */
    this._cfg = /** @type {any}*/( null );

    // @ts-ignore
    this._pluginLoadOrder = [];

    /** @type {HwMicroService} */
    this._ms = /** @type {any}*/( null );;

    /** @type {YWCache} */
    this._mcache = /** @type {any}*/( null );;

    /** 是否正在退出 */
    this.isStopping = false;

    this.evtRedisCfgChange = this.#loadCfgFromRedis.bind( this );
  }


  /* -----------------------------生命周期函数-------------------------------------- */

  /**
     * 生命周期函数
     *  - 初始化之前调用，用于增加自己的命令行参数
     *  - 框架及所有的插件初始化开始之前调用
     * @abstract
     */
  async onBeforeInit () { }

  /**
     * hook
     * 
     * - `config.json` 读取后,命令行参数解析后调用，提供动态修改配置的机会
     * @abstract
     */
  async onCfgLoad () {} 


  /**
     * hook
     * 
     * 方便app增加特定的 Express 中间件
     * 
     * 
     * @param {import('express').Express} _eapp - express app instance
     * 
     */
  async onInitExpressMiddlewares ( _eapp ) {}

  /**
     * 生命周期函数
     * - 框架及所有的插件初始化完成后调用
     * @abstract
     */
  async onAfterInit () { }

  /**
     * 生命周期函数
     * - 框架及所有的插件启动开始之前调用
     * @abstract
     */
  async onBeforeStart () { }

  /**
     * 生命周期函数
     * - 框架及所有的插件启动完成后调用
     * @abstract
     */
  async onAfterStart () { }

  /**
     * 生命周期函数
     * - 框架及所有的插件停止之前调用
     * @abstract
     */
  async onBeforeStop () { }

  /**
     * 生命周期函数
     * - 框架及所有的插件完全停止后调用
     * @abstract
     */
  async onAfterStop () { }

  /**
     * 令行解析退出的接口回调
     * @param {number} exitCode - 退出码
     */
  async onProgramExit ( exitCode ){
    process.exit( exitCode );
  }

  /** 
     * 获取扩展信息
     * @returns {Promise<any>} - 扩展信息
     */
  async getAppExtInfo () {}

  /**
     * 获取元信息
     * @returns {Promise< Record<string, any> | null >} - 元信息
     */
  async getAppMetaInfo () { return null; }


  /* -------------------------------------------------------------------------- */
  /**
     * 
     * @param {string} value - 传入值 
     * @param {number} _dummyPrevious - 之前的值
     * @returns {number} - 解析后的值
     */
  static #cmdParsePort ( value, _dummyPrevious ) {
    // parseInt 参数为字符串和进制数
    const parsedValue = parseInt( value, 10 );
    if ( isNaN( parsedValue ) ) {
      throw new InvalidArgumentError( 'Not a number.' );
    }

    if( parsedValue <= 0 || parsedValue > 65535 ) {
      throw new InvalidArgumentError( 'port number >0 AND < 65535' );
    }

    return parsedValue;
  }

  /** 返回 UUID, instanceId */
  get uuid () {
    return `${this._cfg.mservice.ip}@${this._cfg.mservice.port}@${this.env.serverId}`;
  }

  /** 返回 redis 配置 key */
  get rdCfgKey () {
    return this.#rdCfgKey;
  }

  async #terminateApp () {
    if( this.isStopping === true ) {
      return;
    }

    this.isStopping = true;
    await this.stop();
    process.exit( 0 );
  }

  /** 根据插件名字获取插件
   * 
   * @param {string} name 插件名称或昵称
   * @returns {HwPluginBase | null}
   */
  getPlugin ( name ) {
    let plug = this._plugins[name] ?? null;
    if( plug !== null ) {
      return plug;
    }

    const nameT = `_${name}`;
    plug = this._plugins[nameT] ?? null;
    if( plug !== null ) {
      return plug;
    }
    
    return this._pluginsMap[nameT] ?? null;
  }

  get cmdlineParser () {
    return this.#_program;
  }

  /**
   * 返回命令行参数
   *
   * @readonly
   * @memberof HwAppBase
   */
  get cmdOpts () {
    return this.#_cmdOpts;
  }

  /** 获取 Hw 系统环境变量
   * 
   * @returns { import('../types').AppEnv } 
   *  - PROJ_PATH 项目根目录
   *  - CFG_PATH 配置文件目录
   *  - env 运行环境 
   *  - serverId 服务器ID
   *  - version 版本        
   */
  get env () {
    return env;
  }

  /** 是否启动的微服务
   * 
   * @returns {boolean}
   */
  hasMicroService (){
    return ( this._ms !== null );
  }
  
  /**
   * 获取配置文件路径
   * @param {string} cfgFile - 配置文件名称 
   * @returns {string} - 配置文件路径
   */
  #getCfgPath ( cfgFile ){
    if( typeof( cfgFile ) !== 'string' ){
      cfgFile = '';
    }

    let envT = env.env;
    if( envT !== 'production' ){
      let cfgPath = env.CFG_PATH + `/${envT}/${cfgFile}`;
      if( fs.existsSync( cfgPath ) )
        return cfgPath;
    }

    return env.CFG_PATH + '/' + cfgFile;
  }

  /**
   * 从本地加载配置文件
   * @template T 返回数据类型
   * @param {string} cfgName 配置名字
   * @returns { Promise<T | null>}
   */
  async #_getConfig ( cfgName ) {
    if( !cfgName.endsWith( '.json' ) ) {
      cfgName += '.json';
    }

    try{
      if( this._cfg?.cfgRedis?.enable === true ) {
        if( cfgName.startsWith( this._cfg.cfgRedis.key ) === true ) {
          // 从 redis 获取
          const cfgT = await this.#loadCfgFromRedisRaw();
          if( cfgT !== null ) {
            return JSON.parse( cfgT );
          }
          this.logger.error( `config [ ${this.rdCfgKey} ] not found in redis` );
          process.exit( 2 );
        }
      }

      let fullPath = this.#getCfgPath( cfgName );
      if( fs.existsSync( fullPath ) ) {
        const con = fs.readFileSync( fullPath, 'utf-8' );
        return JSON.parse( con );
      }
    }catch( /** @type {any} */err ) {
      this.logger.error( `config [ ${cfgName}] load error:`, err.toString() );
    }
    
    return null;
  }

  /**
   * @template T 返回数据类型
   * @param {string} cfgName 配置名字
   * @returns { Promise<T | null>}
   */
  async getConfig ( cfgName ) {
    if( cfgName === 'config' || cfgName === 'config.json' ) {
      if( this._cfg !== null ) {
        // @ts-ignore
        return this._cfg;
      }

      return await this.#_getConfig( cfgName );
    }

    if( this._cfg?.mservice?.enable === true 
        && this._cfg.mservice?.finder?.enable === true
        && this._cfg.mservice?.finder?.config?.enable === true )
    {
      const ncfg = this._cfg.mservice.finder.config;
      let cfgRet = null;

      if( ncfg.dependencies && ncfg.dependencies instanceof Array && ncfg.dependencies.indexOf( cfgName ) >= 0 ) {
        cfgRet = this._cfg.deps ? this._cfg.deps[ cfgName ] : null;
        if( cfgRet === undefined ) {
          cfgRet = null;
        }
      }
      
      if( cfgRet === null ) { // 从 nacos 获取
        cfgRet = await this._ms._finder.getConfig( cfgName );
      }

      if( cfgRet === null ) {
        this.#_logger.error( `Can't find config ${cfgName} from nacos` );
      }

      return cfgRet;
    }

    return await this.#_getConfig( cfgName );
  }


  /** 初始化日志
   * 
   * @param {{serverId: string, base: string}} opts - 可选参数
   *  - serverId 服务的ID，字符串
   *  - base 日志文件保存基本路径 
   */
  #initLogger ( opts ){
    try{
      const opt = opts ?? {};

      if( !opt.serverId ) {
        opt.serverId = env.serverId;
      }

      if( !opt.base ) {
        opt.base = env.PROJ_PATH;
      }

      let cfg = {
        appenders: {
          console: { type: 'console' }
        },
        categories: {
          default: { appenders: ['console'], level: 'info' }
        }
      };

      let cfgT = `${env.CFG_PATH}/log4js.json`;
      if( fs.existsSync( cfgT ) === true ) {
        cfg = JSON.parse( fs.readFileSync( cfgT, "utf8" ) );
      }

      const layout = {
        type: "pattern",
        pattern: "[%d] [%p] [%x{module}] %m",
        tokens: {
          module: function () {
            return env.serverId;
          },
        }
      };

      const layoutConsole = {
        type: "pattern",
        pattern: "%[[%d] [%p] [%x{module}]%] %m",
        tokens: {
          module: function () {
            return env.serverId;
          },
        }
      };
      // @ts-ignore
      if( cfg.appenders['comm-log'] ) {
        // @ts-ignore
        cfg.appenders['comm-log'].layout = layout;
      }
      
      // @ts-ignore
      cfg.appenders['console'].layout = layoutConsole;
      
      // @ts-ignore
      logger.configure( cfg, opt );
    }catch( err ) {
      console.log( '--- initLogger err:', err );
    }
  }

  get logger () {
    return this.#_logger;
  }

  /**
   * 加载插件
   * @param { {[key: string]:import('../types').PluginConfigItem } } cfg - 插件配置
   */
  async #loadPlugins ( cfg ){
    // @ts-ignore
    this._pluginLoadOrder = getDepOrder( cfg,null, this.logger );
    for( let plug of this._pluginLoadOrder ){
      let name = `_${plug.name}`;
      if( typeof( plug.alias ) === 'string' ) {
        name = plug.alias;
      }

      let CompClass = null;
      try{
        let packPath = plug.package ?? null;
        if( packPath === null ) {
          let pathT = Path.join( env.PROJ_PATH, plug.path );
          packPath = pathT;
        } else {
          switch( packPath ) {
          case '@heywoogames/hw-redis':
            packPath = Path.normalize( Path.join( __dirname, '../plugins/hw-redis.js' ) );
            break;
          case '@heywoogames/hw-mq':
            packPath = Path.normalize( Path.join( __dirname, '../plugins/hw-mq.js' ) );
            break;
          }
        }

        CompClass = require( packPath );
      } catch( err ) {
        this.logger.error( 'load component err:', err );
        continue;
      }

      if( CompClass.npluginDefault ) {
        CompClass = CompClass.npluginDefault;
      }

      try{
        const ins = new CompClass( this, plug );
        this._plugins[name] = ins;
        this._pluginsMap[`_${plug.name}`] = ins;
        // @ts-ignore
        this[name] = ins;
        plug._name = name;
      
        await ins.init();
      } catch( err ) {
        this.logger.error( `plugin [${name}] init err:`, err );
        process.exit( 1 );
      }

      this.logger.info( `plugin [${name}] init ok` );
    }
  }

  #checkMsParam () {
    if( this.#_cmdOpts.use_ms_parame === true ) {
      const msCfg = this._cfg.mservice;
      const opts = this.#_cmdOpts;
      msCfg.enable = !opts.ms_disable;
      if( msCfg.enable === true ) {
        if( opts.ms_ip !== undefined ) {
          msCfg.ip = opts.ms_ip;
        }

        if( opts.ms_port !== undefined ) {
          msCfg.port = opts.ms_port;
        }
      }
    }
  }

  async init () {
    await this.onBeforeInit();

    try {
      this.#_program?.parse();
    }catch ( /**@type {any}*/err ) {
      await this.onProgramExit( err.exitCode );
    }

    this.#_cmdOpts = /**@type {any}*/( this.#_program?.opts() );
    if( this.#_cmdOpts?.app_name ) {
      env.serverId = this.#_cmdOpts.app_name;
    }
    env.env = this.#_cmdOpts.env || process.env.NODE_ENV || 'development';

    // 捕获未处理异常
    process.on( 'uncaughtException', ( /**@type {any}*/err ) =>{
      if( this.#_logger !== null ) {
        this.#_logger.warn( `${err.toString()} ${err.stack.toString()}` );
      } else {
        console.error( err );
      }
    } );
    
    /** @type { import('../types').HwAppConfig | null } */
    const cfg = await this.getConfig( 'config' );
    if( cfg === null ) {
      console.error( 'config.json not found, exit' );
      process.exit( 2 );
    }

    this._cfg = cfg;
    if( !this._cfg?.deps ) {
      this._cfg.deps = {};
    }

    if( typeof( this._cfg?.mservice?.ip ) !== 'string' || this._cfg.mservice.ip.length < 8 ) {
      this._cfg.mservice.ip = nnet.localIp();
    }

    if( typeof( this.#_cmdOpts.node_name ) === 'string' && this.#_cmdOpts.node_name.length > 0 ) {
      this._cfg.nodeName = this.#_cmdOpts.node_name;
    }

    if( typeof( this._cfg.nodeName ) !== 'string' ) {
      this._cfg.nodeName = `${this._cfg.mservice.ip}_${this._cfg.mservice.port}`;
      this.logger.info( `nodeName not set, use: ${this._cfg.nodeName}` );
    }

    this.#rdCfgKey = `cfg:${env.serverId}:${this._cfg.nodeName}`;

    if( this._cfg?.cfgRedis?.enable === true ) {
      if( typeof( this._cfg.cfgRedis.key ) !== 'string' || 
          typeof( this._cfg.cfgRedis.mqAlias ) !== 'string' ||
          typeof( this._cfg.cfgRedis.rdAlias ) !== 'string'
      ) {
        this.logger.error( 'xxx key,mqAlias,rdAlias need by cfgRedis in config.json' );
        process.exit( 2 );
      }
    } else {
      this._cfg.cfgRedis = {
        enable: false,
        key: '',
        mqAlias: '',
        rdAlias: ''
      };
    }

    // config.json 读取后,命令行参数解析后调用，提供动态修改配置的机会
    await this.onCfgLoad();
    
    // 填充日志参数
    const loggerOpt = {
      serverId: env.serverId,
      base: env.PROJ_PATH,
      ver: env.version,
      /** @type {number | string} */
      ins: process.pid        
    };

    if( cfg.mservice?.ip && cfg.mservice?.port ) {
      loggerOpt.ins = `${cfg.mservice.ip}:${cfg.mservice.port}`;
    }

    /** @type { import('types/HwAppBase').YWCacheOptions } */
    let mCacheOpt = { checkperiod: 300 };

    if( this._cfg.mcache ) {
      mCacheOpt = this._cfg.mcache;
    }

    this._mcache = new YWCache( mCacheOpt );

    // 初始化日志
    this.#initLogger( loggerOpt );
    this.#_logger = /** @type {any}*/( logger.getLogger( '' ) );

    this.#_logger.info( 'start options:', this.#_cmdOpts );
    this.#checkMsParam();

    // 初始化微服务
    if( this._cfg.mservice && this._cfg.mservice.enable === true ) {
      const {HwMicroService} = require( './mservices' );
      this._ms = new HwMicroService( this );
      await this._ms.init();
    }


    // 加载插件配置文件
    if( cfg.plugins ) {
      await this.#loadPlugins( cfg.plugins );
    }


    // after init all plugin
    await this.#callPluginLifeCycle( 'afterInitAll', 'asc' );

    // 在这里检测插
    if( this._cfg?.cfgRedis?.enable === true ) {
      // 检测订阅插件是否存在

      /** @type {any} */
      const mqIns = this.getPlugin( this._cfg.cfgRedis.mqAlias );
      if( mqIns === null ) {
        this.logger.error( `cfgRedis.mqAlias[ ${this._cfg.cfgRedis.mqAlias} ] not found in plugins` );
        process.exit( 3 );
      }

      // 检测redis插件是否存在
      const rdIns = this.getPlugin( this._cfg.cfgRedis.rdAlias );
      if( rdIns === null ) {
        this.logger.error( `cfgRedis.rdAlias[ ${this._cfg.cfgRedis.rdAlias} ] not found in plugins` );
        process.exit( 3 );
      }

      // 订阅配置变化
      mqIns.subscribe( 'cfg:appnode', this.evtRedisCfgChange );
    }

    await  this.onAfterInit();

    // 调用初始化组件
    await this.#loadComps();
    
  }

  /**
   * 从redis 读取配置
   * @returns { Promise<string | null> }
   */
  async #loadCfgFromRedisRaw () {
    if( this._cfg?.cfgRedis?.enable !== true ) {
      return null;
    }

    /** @type {any} */
    const rdIns = this.getPlugin( this._cfg.cfgRedis.rdAlias );
    if( rdIns === null ) {
      return null;
    }

    const conn = rdIns.getInsByName();
    return await conn.get( this.rdCfgKey );
  }

  /**
   * 从 Redis 中加载配置
   * @param {string} channel - 通道
   * @param {string} msg - 消息
   */
  async #loadCfgFromRedis ( channel, msg ) {
    if( channel !== 'cfg:appnode' || msg !== this.rdCfgKey ) {
      return;
    }

    const cfgT = await this.#loadCfgFromRedisRaw();
    if( cfgT !== null ) {
      // @ts-ignore
      this.emit( 'cfg_change', this._cfg.cfgRedis.key, cfgT, this._cfg.cfgRedis.key );
    }
  }

  async #loadComps () {
    const compsPath = this.env.PROJ_PATH + '/' +  ( this._cfg?.compsPath ?? 'comps' );
    if( !fs.existsSync( compsPath ) ) {
      return;
    }

    const files = fs.readdirSync( compsPath );
    for( let it of files ) {
      let compClass = require( `${compsPath}/${it}` );

      if( compClass.ncompDefault ) {
        compClass = compClass.ncompDefault;
      }

      try{
        /** @type {HwCompBase} */
        const ins = new compClass( this );
        const name = ins.name;
        this.#_compment.push( { name, ins } );

        this.#_compmentMap[ name ] = ins;
      
        await ins.onInit();
      } catch( err ) {
        this.logger.error( `comp [${it}] init err:`, err );
        process.exit( 1 );
      }
    }
  }


  /**
   * 
   * @param {string} lifeCycleFun - 插件生命周期函数名
   * @param { 'asc' | 'desc' } order - 顺序, 缺省 asc
   */
  async #callPluginLifeCycle ( lifeCycleFun, order = 'asc' ) {
    if( order === 'asc' ) {
      const size = this._pluginLoadOrder.length;
      for( let i = 0; i < size; i++ ) {
        let plugInfo = this._pluginLoadOrder[i];
        const ins = this._plugins[plugInfo._name];
        // @ts-ignore
        if( ins && ( typeof( ins[lifeCycleFun] ) === 'function' ) ) {
          // @ts-ignore
          await ins[lifeCycleFun]();
        }
      }
    } else {
      const size = this._pluginLoadOrder.length;
      for( let i = size - 1; i >= 0; i-- ) {
        let plugInfo = this._pluginLoadOrder[i];
  
        const ins = this._plugins[plugInfo._name];
        // @ts-ignore
        if( ins && ( typeof( ins[lifeCycleFun] ) === 'function' ) ) {
          // @ts-ignore
          await ins[lifeCycleFun]();
        }
      }
    }
  }

  /**
   * 
   * @param {string} lifeCycleFun - 组件生命周期函数名 
   */
  async #callCompLifeCycle ( lifeCycleFun ) {
    const size = this.#_compment.length;
    for( let i = 0; i < size; i++ ) {
      let comp = this.#_compment[i];
      const ins = comp.ins;
      // @ts-ignore
      if( ins && ( typeof( ins[lifeCycleFun] ) === 'function' ) ) {
        // @ts-ignore
        await ins[lifeCycleFun]();
      }
    }
  }

  async start () {
    await this.onBeforeStart();
    
    // Before start
    await this.#callPluginLifeCycle( 'beforeStartAll', 'asc' );
    
    // start plugin
    await this.#callPluginLifeCycle( 'start', 'asc' );

    await this.#callCompLifeCycle( 'onStart' );

    // 启动微服务
    if( this._ms ) {
      await this._ms.start();
    }

    // After start all
    await this.#callPluginLifeCycle( 'afterStartAll', 'asc' );

    // 调用组件生命周期函数
    await this.#callCompLifeCycle( 'onAfterStartAll' );
    
    await this.onAfterStart();

    // 不再使用删除释放资源
    this.#_program = /**@type {any}*/( null );
  }


  async stop () {
    await this.onBeforeStop();

    if( this._cfg?.cfgRedis?.enable === true ) {
      /** @type {any} */
      const mqIns = this.getPlugin( this._cfg.cfgRedis.mqAlias );

      if( mqIns !== null ) {
        this.logger.info( `cfg:appnode unsubscribe` );
        mqIns.unsubscribe( 'cfg:appnode',this.evtRedisCfgChange );
      }
    }

    let forceExitTick = 10;
    setInterval( () => {
      forceExitTick--;
      this.#_logger.info( `--- wait exit ${ forceExitTick}` );
      if( forceExitTick <= 0 ) {
        process.exit( 1 );
      }
    }, 1000 );

    // Before stop all
    await this.#callPluginLifeCycle( 'beforeStopAll', 'desc' );

    await this.#callCompLifeCycle( 'onBeforeStop' );

    // 停止微服务
    if( this._ms ) {
      await this._ms.stop();
    }

    // stop all plugin
    await this.#callPluginLifeCycle( 'stop', 'desc' );
    await this.#callCompLifeCycle( 'onAfterStop' );

    // after stop all plugin
    await this.#callPluginLifeCycle( 'afterStopAll', 'desc' );

    await this.#callCompLifeCycle( 'onAfterStopAll' );

    // 框架及所有的插件完全停止后调用
    await this.onAfterStop();
  }

  /**
   * 获取所有组件
   * @param {string} name - 组件名字
   * @returns {HwCompBase}
   */
  getComp ( name ) {
    return this.#_compmentMap[name] ?? null;
  }

  /**
   * 获取所有组件
   * @returns {Record<string, HwCompBase>}
   */
  getComps () {
    return this.#_compmentMap;
  }

  /**
   * 自动注册组件，把组件挂载到 app(this) 下
   */
  mountComps () {
    for( let name in this.#_compmentMap ) {
      // @ts-ignore
      if( this[name] ) {
        this.logger.error( `comp[ ${name} ] already exists, can not mount! Please change the name of the component.` );
        process.exit( 1 );
      }
      // @ts-ignore
      this[name] = this.#_compmentMap[name];

      this.logger.info( `comp mounted: ${name}` );
    }
  }

  /**
   * 获取本地配置文件
   * @template T
   * @param {string} cfgName 配置名字
   * @returns { Promise< T | null >}
   */
  async getLocalConfig ( cfgName ) {
    if( cfgName === 'config' || cfgName === 'config.json' ) {
      if( this._cfg !== null ) {
        // @ts-ignore
        return this._cfg;
      }
    }

    return await this.#_getConfig( cfgName );
  }



  /**
  * 创建微服务响应消息
   * 
   * @example
   *  - makeMSResp(0, { foo: 'bar' }, 'ok');
   *  - makeMSResp(1, null, 'error');
   * 
   * 快捷方式创建成功响应
   * - makeMSRespSucc();
   * - makeMSRespSucc({ foo: 123 });
   * - makeMSRespSucc('操作成功');
   * - makeMSRespSucc({ foo: 123 }, '操作成功');
   * 
   * 快捷方式创建失败响应
   *  - makeMSRespFail(1001, '参数错误');
  * 
  * @param {number|object|string} [code] 响应码/数据/消息
  * @param {object|string} [data] 数据/消息
  * @param {string} [msg] 消息
  * @returns {HwMsResp}
  */
  makeMSResp ( code = 0, data, msg ) { 
    let resp = {
      code: 0,
      msg: 'success',
      /** @type { any } */
      data: null
    };

    if ( arguments.length === 0 ) {
      // sendHw()
      // 默认成功
    } else if ( typeof code === 'object' && code !== null ) {
      // sendHw({ foo: 123 }) 或 sendHw({ foo: 123 }, '操作成功')
      resp.data = code;
      if ( typeof data === 'string' ) resp.msg = data;
    } else if ( typeof code === 'string' ) {
      // sendHw('操作成功')
      resp.msg = code;
    } else if ( typeof code === 'number' ) {
      // sendHw(0, { foo: 'bar' }, 'ok') 或 sendHw(1001, '参数错误')
      resp.code = code;
      if ( typeof data === 'object' && data !== null ) {
        resp.data = data;
        if ( typeof msg === 'string' ) resp.msg = msg;
        else resp.msg = resp.code === 0 ? 'success' : 'failure';
      } else if ( typeof data === 'string' ) {
        resp.msg = data;
        resp.data = null;
      } else {
        resp.data = null;
        resp.msg = resp.code === 0 ? 'success' : 'failure';
      }
    }
    return resp;
  }

  /**
  * 生成微服务成功响应消息
  * 
  * 支持以下调用方式：
  * - makeMSRespSucc()
  * - makeMSRespSucc(data)
  * - makeMSRespSucc(msg)
  * - makeMSRespSucc(data, msg)
  * 
  * @param {object| string | undefined} [data] 数据或字符串消息（当只传一个参数时） 
  * @param {string | undefined} [msg] 可选的消息内容 
  * @returns {HwMsResp}
  */
  makeMSRespSucc ( data, msg ) {  
    let dataT, msgT;

    if ( arguments.length === 1 ) {
      if ( typeof data === 'string' ) {
        msgT = data;
        dataT = null;
      } else {
        dataT = data;
        msgT = 'success';
      }
    } else {
      dataT = data ?? null;
      msgT = msg ?? 'success';
    }

    return {
      code: 0,
      msg: msgT,
      data: /**@type {any}*/( dataT )
    };
  }

  /**
   * 生成微服务失败响应消息
   * @param {number} code - 响应码
   * @param {string | undefined} msg - 消息
   * @returns {HwMsResp}
   */
  makeMSRespFail ( code, msg ) {  
    return {
      code,
      msg: msg ?? 'failure',
      data: null
    };
  }

}

module.exports = { HwAppBase ,env };
