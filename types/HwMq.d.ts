import { HwPluginBase } from "../lib/pluginBase";
import { Redis } from "ioredis";
import type { PluginConfigItem } from "./HwBase";
import type { HwAppBase } from "./HwAppBase";

export interface HwMQCfg {
  driver: "redis";
  redis?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
}

interface MqExtCfg {
  /** 是否禁用 发布, @default false */
  enablePub?: boolean;

  /** 是否禁用 订阅, @default true */
  enableSub?: boolean;
}
/**
 * mq 插件配置
 */
export type HwPluginMqCfg = PluginConfigItem<MqExtCfg>;

/** 模式消息回调 */
export type CbPMessage = (
  pattern: string,
  channel: string,
  message: string,
) => void;

/** 消息回调 */
export type CbMessage = (channel: string, message: string) => void;

/**
 * @class HwMqCli Message Queue 客户端
 * @augments {HwPluginBase<HwAppBase>}
 *
 *
 *  支持 redis 驱动，可以通过 插件配置可选依赖 optionalDependencies, 那么重用已有的redis实例，减少redis连接
 *
 *
 * 支持事件
 *   - message ( channel, message)=> {}
 *   - pmessage (pattern, channel, message)=> {}
 */
export class HwMqCli extends HwPluginBase {
  /** 根据模式订阅消息, 通过 回调函数 接收消息
   *
   * @param {string }  pattern 模式
   * @param {CbPMessage} [fun] 回调函数
   */
  psubscribe(pattern: string, fun: CbPMessage): void;

  /** 根据模式订阅消息,通过 pmessage 事件 接收消息
   *
   * @param {string[]}  pattern 模式
   */
  psubscribe(pattern: string[]): void;

  /** 根据模式订阅消息
   *
   * @param pattern 模式
   * @param fun 绑定函数
   */
  psubscribe(
    pattern: string | string[],
    fun?: (pattern: string, channel: string, message: string) => void,
  );

  /** 取消指定模式的订阅
   *
   * @param {string }  pattern 模式
   * @param {CbPMessage} [fun] 回调函数
   */
  punsubscribe(pattern: string, fun: CbPMessage): void;

  /** 取消指定模式的订阅
   *
   * @param {string[]}  pattern 模式
   */
  punsubscribe(pattern: string[]): void;

  /** 取消指定模式的订阅
   *
   * @param pattern 模式
   * @param fun 绑定函数
   */
  punsubscribe(
    pattern: string | string[],
    fun?: (pattern: string, channel: string, message: string) => void,
  );

  /**
   * 订阅指定通道的消息， fun 回调函数接收消息
   * @param channels 通道
   * @param fun 回调函数
   */
  subscribe(channels: string, fun: CbMessage): void;

  /**
   * 订阅指定通道的消息， 通过 message 事件 接收消息
   * @param {string[]} channels 通道数组
   */
  subscribe(channels: string[]): void;

  /** 订阅指定通道的消息
   *
   * @param channels  要订阅的通道
   * @param fun 绑定函数
   */
  subscribe(
    channels: string | string[],
    fun?: (channel: string, message: string) => void,
  );

  /** 取消指定通道的订阅
   *
   * @param {string } channels  要取消订阅的通道
   * @param {CbMessage} [fun] 回调函数
   */
  unsubscribe(channels: string, fun: CbMessage): void;

  /** 取消指定通道的订阅
   *
   * @param { string[]} channels  要取消订阅的通道
   */
  unsubscribe(channels: string[]): void;

  /** 取消指定通道的订阅
   *
   * @param channels  要取消订阅的通道
   * @param fun 绑定函数
   */
  unsubscribe(
    channels: string | string[],
    fun?: (channel: string, message: string) => void,
  );

  /**
   *
   * @param channel 通道
   * @param message 消息
   */
  publish(channel: string | Buffer, message: string | Buffer);
}
