
const fs = require( 'node:fs' );
const path = require( 'path' );
const express = require( 'express' );
const bodyParser = require( 'body-parser' );

/**
 * @typedef {import('../../types').HwExpressRequest} HwExpressRequest
 * @typedef {import('../../types').HwExpressResponse} HwExpressResponse
 */

/**
 * @typedef {object} HwRouterInfo
 * @property {string} path - 路径
 * @property { {[key:string]: boolean}} methods 支持的方法
 */

/**
 * @param {HwMicroService} ins 实例
 * @param {string} serPath 路径
 */
function loadServices ( ins, serPath ) {
  const servicePath = serPath.replace( /\\/g,'/' ) + '/services';

  if( !fs.existsSync( servicePath ) ) {
    fs.mkdirSync( servicePath, {recursive: true} );
  }

  const files = fs.readdirSync( servicePath );
  for( let it of files ) {
    const serviceFile = require( `${servicePath}/${it}` );
  
    const service = new serviceFile( ins );
    ins._services[`${servicePath}/${it}`] = service;
  }
}

/**
 * 检测对象是否有重复引用
 * @param {any} obj - 检测的对象 
 * @returns {boolean} - 是否存在循环引用
 */
function hasCircularReference ( obj ) {
  const visitedObjects = new WeakSet();

  /**
   * 
   * @param {any} obj - 检测的对象
   * @returns {boolean} - 是否存在循环引用
   */
  function detect ( obj ) {
    if ( obj !== null && typeof obj === 'object' ) { // 确保是可遍历的对象
      if ( visitedObjects.has( obj ) ) {
        // 如果已经访问过这个对象，说明存在循环引用
        return true;
      }
      visitedObjects.add( obj ); // 标记当前对象为已访问
      for ( let key in obj ) {
        if ( Object.prototype.hasOwnProperty.call( obj, key ) && detect( obj[key] ) ) {
          return true;
        }
      }
    }
    return false;
  }

  return detect( obj );
}

/**
 * @class
 */
class HwMicroService
{
  /**
   * 
   * @param {import('../../types').HwAppBase} app - app instance
   */
  constructor ( app ) {

    /** @type {import('../../types').HwAppBase} */
    this._app = app;

    /** @type { {[key:string]:import('../../types').HwMSServiceBase} } */
    this._services = {};

    /** @type {import('../../types').MicroServiceConfig} */
    this._cfg = /**@type {any}*/( null );

    /** @type { import('express').Express } */
    this._eapp = /**@type {any}*/( null );

    this._publicUrl = '';

    /**
     * @type { HwRouterInfo[]}
     */
    this._routes = [];

    this.startTime = Date.now();

    this._dynamicRouterName = '/dynamic';
    this._dynamicRouter = express.Router();
  }

  #extResponse () {
    this._eapp.response.sendHw = function ( code, data, msg ) {  
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
      
      return this.json( resp );
    }; 

    this._eapp.response.sendSucc = function ( data, msg ) {  
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

      let body = {
        code: 0,
        success: true,
        msg: msgT,
        data: /**@type {any}*/( dataT )
      };
      
      return this.json( body );
    }; 

    this._eapp.response.sendFail = function ( code, msg ) {  
      let body = {
        code,
        success: false,
        msg: msg ?? 'failure',
        data: null
      };
      
      return this.json( body );
    }; 

  }

  async init () {
    this._cfg = this._app._cfg.mservice;

    /** @type{ import('express').Express } */
    this._eapp = express();

    /** 允许跨域 */
    if( this._cfg.cors  === true || this._cfg.cors instanceof Array ) {
      const cors = require( 'cors' );
      if( this._cfg.cors === true ) {
        this._eapp.use( cors() );
      } else{
        let origin = [];
        for( let it of this._cfg.cors ) {
          if( it.startsWith( 'regex:' ) ) {
            const szReg = it.substring( 6 ).trim();
            if( szReg.length > 0 ) {
              origin.push( new RegExp( szReg ) );
            }
          } else {
            origin.push( it );
          }
        }

        if( origin.length > 0 ) {
          const corsOptions = {
            origin: origin
          };
          this._eapp.use( cors( corsOptions ) );        
        }
      }
    }

    this.parserJson = bodyParser.json();
    this._eapp.use( this.parserJson );
    
    this.#extResponse();
    

    if( this._app.cmdOpts.ms_prefix && this._app.cmdOpts.ms_prefix.length > 1 ) {
      this._eapp.use( ( req, res, next ) => {
      // 获取原始路由
      /** @type {string} */
        const originalRoute = req.originalUrl;
    
        // 判断原始路由是否 ms_prefix 开头
        if ( this._app.cmdOpts.ms_prefix && 
        originalRoute.startsWith( this._app.cmdOpts.ms_prefix )
        ) {
        // 更改路由，去掉ms_prefix
          req.url = originalRoute.substring( this._app.cmdOpts.ms_prefix.length );
        }
        next();
      } );
    }

    await this._app.onInitExpressMiddlewares( this._eapp );

    if( this._app.cmdOpts.api_doc === true ) {
      const env = this._app.env;
      const apis_base = `${env.PROJ_PATH}/node_modules/@heywoogames/hw-base/types/api.js`;

      const options = {
        definition: {
          openapi: '3.0.0',
          info: {
            title: `${env.serverId} API`,
            version: env.version,
            description: env.description,
          },
        },
        apis: [apis_base], // 这里指定包含 API 路由的文件路径
      };

      const packageJsonPath = path.join( this._app.env.PROJ_PATH, 'package.json' );
      const packageJson = JSON.parse( fs.readFileSync( packageJsonPath, 'utf-8' ) );
      if( packageJson.apiGen?.apis instanceof Array ) {
        options.apis.push( ...packageJson.apiGen.apis );
      } else {
        this._app.logger.warn( '/api-docs error: package.json apiGen.apis is not an array' );
        return;
      }

      const swaggerUi = require( 'swagger-ui-express' );
      const swaggerJSDoc = require( 'swagger-jsdoc' );
      const swaggerSpec = swaggerJSDoc( options );

      this._eapp.use( '/api-docs', swaggerUi.serve, swaggerUi.setup( swaggerSpec ) );
      this._app.logger.warn( `api-docs - http://127.0.0.1:${this._cfg.port}/api-docs` );
    }
    

    const servicePath = this._app.env.PROJ_PATH + '/' +  ( this._cfg.path ?? 'mservices' );

    loadServices( this,servicePath );
  }

  /**
   * 
   * @param {string} path - 静态资源路径
   */
  setStaticPath ( path ) {
    this._eapp.use( '/public',express.static( path ) );
    this._publicUrl = `http://${this._cfg.ip}:${this._cfg.port}/public`;
  }

  /**
   * 计算两个时间点之间的间隔时间
   * @param {number} startTime - 开始时间的毫秒数
   * @param {number} endTime - 结束时间的毫秒数
   * @returns {string} 返回格式化后的间隔时间字符串，格式为"天 数小时:分钟:秒"
   */
  #intervalTime ( startTime,endTime ) {
    let date1 = Math.floor( startTime / 1000 );
    let date2 = Math.floor( endTime / 1000 );
    let date3 =  ( date2 - date1 ); //时间差的毫秒数
    //计算出相差天数
    let days = Math.floor( date3 / ( 24 * 3600 ) );
    //计算出小时数

    let leave1 = date3 % ( 24 * 3600 ); //计算天数后剩余的毫秒数
    let hours = Math.floor( leave1 / 3600 );
    //计算相差分钟数
    let leave2 = leave1 % 3600; //计算小时数后剩余的毫秒数
    let minutes = Math.floor( leave2 / 60 );

    let leave3 = leave2 % ( 60 ); //计算分钟数后剩余的毫秒数
    let seconds = Math.round( leave3 );

    return `${days} days ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 动态注册服务函数
   * @param {'all' | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'} method - 方法
   * @param {string} path - 路径
   * @param {(req: HwExpressRequest, res: HwExpressResponse) => void} cb - 回调函数
   * @returns {boolean} - 是否成功
   */
  registerMethod ( method, path, cb ){
    if( this._eapp && this._eapp[method] ) {
      this._dynamicRouter[method]( path, cb  );

      const dynPath = `${this._dynamicRouterName}${path}`;

      /** @type { null | HwRouterInfo} */
      let item = null;
      for( let it of this._routes )
      {
        if( it.path === dynPath ) {
          item = it;
          break;
        }
      }

      if( item !== null ) {
        item.methods[method] = true;
      }else{
        /** @type {HwRouterInfo} */
        let op = {
          path: dynPath,
          methods:{}
        };
        op.methods[method] = true;
        this._routes.push( op );
      }

      return true;
    }

    return false;
  }

  /**
   * 根据路径获取变量值
   * @param {any} obj - 对象
   * @param {string} path - 路径
   * @returns {any} - 变量值
   */
  #getValueByPath ( obj, path ) {
    const keys = path.split( '.' );
    let current = obj;

    for ( let key of keys ) {
      if ( current[key] === undefined ) {
        return undefined; // 或者任何你认为在找不到属性时应该返回的值
      }
      current = current[key];
    }

    return current;
  }

  async start () {
    this._eapp.listen( this._cfg.port, () => {
      this._app.logger.info( `hw-mservice app listening on port ${this._cfg.port}` );
    } );

    this._eapp.get( '/echo',  ( req, res ) => { 
      res.sendHw( 0, Object.keys( req.query ).length > 0 ? req.query : {null:null} );
    } );
    this._eapp.get( '/api',  ( req, res ) => {
      res.sendHw( 0,this._routes ); 
    } );
    this._eapp.get( '/info',  async ( req, res ) => this.req_info( req, res ) );
    this._eapp.get( '/mcache',  ( req, res ) => this.req_mcacheInfo( req, res )  );
    this._eapp.get( '/varget',  ( req, res ) => this.req_varget( req, res ) );

    this._eapp.use( this._dynamicRouterName, this._dynamicRouter );

    // 增加 404 处理
    this._eapp.use( ( req, res, _next ) => {
      res.status( 404 ).json( {
        code: 404,
        success: false,
        msg: `The requested [ ${req.method} ] ${req.originalUrl} resource could not be found`,  
        data: null
      } );  
    } );

    // @ts-ignore
    this._eapp.use( ( err, req, res, _next ) => {
      this._app.logger.warn( err );
      res.status( 500 ).json( {
        code: 500,
        success: false,
        msg: 'server internal error',
        data: null
      } );
    } );

    this.#updateRouteMap();
  }

  #updateRouteMap () {
    /**
     * @type { HwRouterInfo[]}
     */
    let routes = [];
    this._eapp._router.stack.forEach( ( /**@type {any}*/middleware ) => {
      if( middleware.route ){ // routes registered directly on the app
        const {path,methods} = middleware.route;
        routes.push( {path,methods} );
      } else if( middleware.name === 'router' ){ // router middleware 
        middleware.handle.stack.forEach( ( /**@type {any}*/handler ) =>{
          let route = handler.route;
          if( route ) {
            const {path,methods} = route;
            routes.push( {path,methods} );
          }
        } );
      }
    } );

    this._routes = routes;
  }

  async stop (){

  }

  getAllRoute () {
    return this._routes;
  }

  getPublicUrl () {
    return this._publicUrl;
  }

  /**
   * 获取服务
   * @param {string} serviceName - 服务名 
   * @param {boolean} [_selOne= true] - 是否选择一个,选择权重最高的那一个
   * @returns {Promise<string | string[] | null>} - 服务地址
   */
  async getService ( serviceName, _selOne = true ) {
    return null;
  }

  get cfg () {
    return this._cfg;
  }

  /** 获取本地服务地址 */
  getLocalServiceAddr () {
    return `${this._cfg.ip}:${this._cfg.port}`;
  }

  /**
   * 
   * @param {HwExpressRequest} req 请求
   * @param {HwExpressResponse} res 响应
   */
  async req_info ( req, res ) {
    const mem_info = process.memoryUsage();
    const info = {
      startTime: new Date( this.startTime ).toLocaleString(),
      runTime: this.#intervalTime( this.startTime,Date.now() ),
      time: new Date().toLocaleString(),
      tm: Date.now(),
      mem_info,
      ext_info: undefined
    };


    const extInfo = await this._app.getAppExtInfo();
    if( res ) {
      info.ext_info = extInfo;
    }
      
    res.sendSucc( info ); 
  }

  /**
   * 
   * @param {HwExpressRequest} req 请求
   * @param {HwExpressResponse} res 响应
   */
  req_mcacheInfo ( req, res ) {
    const mc = this._app._mcache;

    const stats = mc.getStats();
    const data = {
      stats,
      keys: mc.keys(),
      data: {},
      help: {}
    };

    if( typeof req.query?.show === 'string' ) {
      let keys = req.query.show.split( ',' );
      let val = mc.mget( keys );
      data.data = val;
    }

    if( req.query?.clearAll === '1' ) {
      mc.flushAll();
    }

    if( req.query?.help === '1' ) {
      data.help = {
        "show": '?show=key1,key2,key3',
        "clearAll": '?clearAll=1',
      };
    }

    res.sendSucc( data );
  }

  /**
   * 
   * @param {HwExpressRequest} req 请求
   * @param {HwExpressResponse} res 响应
   */
  req_varget ( req, res ) {
    if( typeof req.query?.name === 'string' ) {
      const v = this.#getValueByPath( this._app, req.query.name );
      if( v !== undefined ) {
        const type = typeof( v );
        const ret = {
          type,
          value: 'not allowed'
        };
        if( type !== 'function' ) {
          if( hasCircularReference( v ) === true ) { 
            ret.value = 'not allowed';
          }else{
            ret.value = v;
          }
        }

        res.sendSucc( ret );
      } else {
        res.sendFail( 404,'not found' );
      }
    } else {
      res.sendFail( 400,'name is required' );
    }

  }
}

module.exports = { HwMicroService };




