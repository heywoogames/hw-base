'use strict';

const { MqRedisDrive } = require( './drv/drv_redis' );

const { HwPluginBase } = require( '../lib/pluginBase' );

/**
 * @class HwMqCli Message Queue 客户端
 * 
 *  支持 redis 驱动，可以通过 插件配置可选依赖 optionalDependencies, 那么重用已有的redis实例，减少redis连接
 * 
 *  
 * 支持事件
 *   - message ( channel, message)=> {}
 *   - pmessage (pattern, channel, message)=> {}
 */
class HwMqCli extends HwPluginBase
{

  /** @type {import('./drv/drv_redis').MqRedisDrive} */
  #drv = /**@type {any}*/( null );

  /**
   * 
   * @param {import('../lib/hwbase').HwAppBase} app - app instance
   * @param {import('../types/HwBase').PluginConfigItem} info - 实例配置
   */
  constructor ( app, info ) {
    super( app, info );
  }

  async init ( ) {
    
    /** @type {import('../types/HwMq').HwMQCfg} */
    this.cfg = /**@type {import('../types/HwMq').HwMQCfg}*/( await this.getConfig() );
    const drv = this.cfg.driver ?? 'redis';
    if( drv === 'redis' ) {
      this.#drv = new MqRedisDrive( this, this.cfg );
      await this.#drv.init();
    } else {
      this.app.logger.warn( `[${this.name}] Unsupport driver ${drv}` );
    }
  }


  async start () {
    
  }

  async stop () {
    if( this.#drv ) {
      await this.#drv.stop();
    }
  }


  /** 根据模式订阅消息
   * 
   * @param {string | string[]}  pattern 模式
   * @param {import('../types/HwMq').CbPMessage} [fun] 回调函数 
   */
  psubscribe ( pattern, fun ){
    if( this.#drv ) {
      this.#drv.psubscribe( pattern, fun );
    }
  }

  /** 取消指定模式的订阅
   * 
   * @param {string | string[]}  pattern 模式
   * @param {import('../types/HwMq').CbPMessage} [fun] 回调函数 
   */
  punsubscribe ( pattern, fun ){
    if( this.#drv ) {
      this.#drv.punsubscribe( pattern, fun );
    }
  }

  /** 订阅指定通道的消息
   * 
   * @param {string | string[]} channels  要订阅的通道
   * @param {import('../types/HwMq').CbMessage} [fun] 回调函数 
   */
  subscribe ( channels, fun ){
    if( this.#drv ) {
      this.#drv.subscribe( channels, fun );
    }
  }

  /** 取消指定通道的订阅
   * 
   * @param {string | string[]} channels  要取消订阅的通道
   * @param {import('../types/HwMq').CbMessage} [fun] 回调函数 
   */
  unsubscribe ( channels,fun ) {
    if( this.#drv ) {
      this.#drv.unsubscribe( channels, fun );
    }
  }

  /**
   * 发布消息
   * @param {string | Buffer} channel 通道
   * @param {string | Buffer} message 消息
   */
  publish ( channel, message ) {
    if( this.#drv ) {
      this.#drv.publish( channel, message );
    }
  }
}




module.exports = { 
  npluginDefault: HwMqCli,
  HwMqCli 
};


