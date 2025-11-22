import EventEmitter = require("events");
import { AppEnv, Logger, MicroServiceConfig, PluginConfigItem } from "./HwBase";
import { Express, Response, Request } from "express";
import YWCache = require("@heywoogames/hw-cache");
import { Options as YWCacheOptions } from "@heywoogames/hw-cache/index";
export type { YWCache, YWCacheOptions };

import { HwAppBase } from "../lib/hwbase";
import { HwMicroService } from "../lib/mservices/index";
import { HwMSServiceBase } from "../lib/msServiceBase";
import { HwPluginBase } from "../lib/pluginBase";
import { HwCompBase } from "../lib/hwCompBase";

export { HwAppBase, HwMicroService, HwMSServiceBase, HwPluginBase, HwCompBase };

export interface HwHost {
  serviceName: string;
  ip: string;
  port: number;
  weight: number;
  healthy: boolean;
  enabled: boolean;
  metadata: {
    nodeName: string;
    rdCfgKey: string;
    createTm: string;
    updateTm: number;
    appName: string;
    [key: string]: string;
  };
}

export interface HwAppBaseEvents {
  cfg_change: [name: string, newConfig: any, dataId: string];
  services_change: [serviceName: string, hosts: HwHost[]];
}

declare module "../lib/hwbase" {
  interface HwAppBase {
    emit<K extends keyof HwAppBaseEvents>(
      event: K,
      ...args: HwAppBaseEvents[K]
    ): boolean;

    on<K extends keyof HwAppBaseEvents>(
      event: K,
      listener: (...args: HwAppBaseEvents[K]) => void,
    ): this;
  }
}

export type HwMicroServiceCfg = {
  /** 脚本存放路径 */
  path: String;

  /** 微服务IP */
  ip: String;

  /** 微服务端口 */
  port: number;

  /** 跨域处理
   * true，所有源OK
   * string[], 指定源OK
   * undefined, 不处理跨域
   */
  cors?: true | string[];
};

export interface HwAppConfig {
  mservice: MicroServiceConfig;
  plugins: { [key: string]: PluginConfigItem };
  deps?: { [key: string]: object };

  /** 内存缓存配置 */
  mcache?: YWCacheOptions;

  /** 组件存放路径，缺省 在项目根目录下 comps 下 */
  compsPath?: string;

  /** 节点名称，缺省 在 config.json 里的配置,没有配置会生成一个UUID */
  nodeName?: string;

  cfgRedis?: {
    /** 是否从 redis 获取配置，缺省 false,不从 redis 获取 */
    enable: boolean;

    /** 触发cfg_change事件(配置文件更新事件时,传输的key) */
    key: string;

    /** 使用的订阅插件的别名 */
    mqAlias: string;

    /** 使用的redis插件的别名 */
    rdAlias: string;
  };
}

export interface HwAppCmdOpt {
  /** node 启动环境，default development */
  env?: string;

  /** app 名字 */
  app_name?: string;

  /** 是否使用 微服务 命令行参数 ，缺省 false,不适用*/
  use_ms_parame: boolean;

  /** 是否关闭微服务。 缺省: false 不关闭 */
  ms_disable: boolean;

  /** 微服务绑定IP，没有指定，会获取系统IP */
  ms_ip?: string;

  /** 微服务绑定端口号，没指定，则使用 config.json 里的配置 */
  ms_port?: number;

  /** 微服务请求前缀 */
  ms_prefix?: string;

  /** 是否开启 api doc,缺省: false */
  api_doc?: boolean;

  /** 节点名字 */
  node_name?: string;
}

export interface HwExpressRequest extends Request {}

declare global {
  namespace Express {
    interface Response {
      /**
       * 创建响应消息
       *
       * @example
       *  - sendHw(0, { foo: 'bar' }, 'ok');
       *  - sendHw(1, null, 'error');
       *
       * 快捷方式创建成功响应
       * - sendHw();
       * - sendHw({ foo: 123 });
       * - sendHw('操作成功');
       * - sendHw({ foo: 123 }, '操作成功');
       *
       * 快捷方式创建失败响应
       *  - sendHw(1001, '参数错误');
       *
       * @param {number|object|string} [code] 响应码/数据/消息
       * @param {object|string} [data] 数据/消息
       * @param {string} [msg] 消息
       * @returns {HwMsResp}
       */
      sendHw(code: number = 0, data?: object, msg?: string): HwMsResp;

      /**
       * 发送成功响应
       *
       *支持以下调用方式：
       * - sendSucc()
       * - sendSucc(data)
       * - sendSucc(msg)
       * - sendSucc(data, msg)
       *
       * @param {object| string | undefined} [data] 数据或字符串消息（当只传一个参数时
       * @param {string | undefined} [msg] 可选的消息内容
       * @returns Express 响应对象
       */
      sendSucc(data?: any, msg?: string): HwMsResp;

      /**
       * 发送失败响应
       * @param {number} code  - 错误状态码
       * @param {string | undefined} - 错误消息（默认 "failure"）
       * @returns Express 响应对象
       */
      sendFail(code: number, msg?: string): HwMsResp;
    }
  }
}

export interface HwExpressResponse extends Response {
  /**
   * 发送json响应
   *
   * @example
   *   res.sendHw()
   */
  sendHw(): HwMsResp;

  /**
   * 发送json响应
   *
   *
   * @example
   *   res.sendHw(0,{s:1}, 'okk')
   *   res.sendHw(0)
   *   res.sendHw()
   */
  sendHw(code?: number, data?: object, msg?: string): HwMsResp;

  /**
   * 发送json响应
   *
   *
   * @example
   *   res.sendHw(0,{s:1}, 'okk')
   *   res.sendHw(0)
   *   res.sendHw()
   */
  sendHw(code?: number, data?: object, msg?: string): HwMsResp;

  /**
   * 发送成功json响应
   *
   * @param data
   * @param msg
   *
   * @example
   *   res.sendSucc({s:1}, 'ok1')
   *   res.sendSucc({s:1})
   *   res.sendSucc('okk')
   *   res.sendSucc()
   */
  sendSucc(data?: object | string, msg?: string): HwMsResp;

  /**
   * 发送失败json响应
   *
   * @param code
   * @param msg
   *
   * @example
   *   res.sendFail(500, 'no pri')
   *   res.sendFail(500)
   */
  sendFail(code: number, msg?: string): HwMsResp;
}

/** Hw 微服务响应 */
export type HwMsResp = {
  code: number;
  msg: string;
  data: object | null;
};

export type HwServiceChange = {
  /** 上线/下线 */
  act: "up" | "down" | "stat";

  /** 实例ID */
  instanceId: string;

  /** 实例信息 */
  info: import("./HwBase").Instance;
};
