import { HwRedisCfg } from "./HwRedis";

export interface AppEnv {
  /** 工程根路径 */
  PROJ_PATH: string;

  /** 配置文件路径 */
  CFG_PATH: string;

  /** node 启动环境 default: development */
  env?: string;

  /** app ID, 取自 package.json 的 name 字段 */
  serverId: string;

  /** app 版本, 取自 package.json 的 version 字段 */
  version: string;

  /** 描述信息 */
  description: string;
}

export interface PluginConfigItem<T = any> {
  enable: boolean;
  path?: string;
  package?: string;
  alias?: string;
  dependencies?: string[];
  optionalDependencies?: string[];

  /** 配置名字, 不给则使用插件名字作为配置名 */
  cfgName?: string;

  extCfg?: T;
}

/** 所有成员为必填项，并增加 name 属性 */
export interface StrictPluginConfigItem<T = any>
  extends Required<PluginConfigItem<T>> {
  name: string;
}

export interface Logger {
  log(message: any, ...args: any[]): void;
  trace(message: any, ...args: any[]): void;

  debug(message: any, ...args: any[]): void;

  info(message: any, ...args: any[]): void;

  warn(message: any, ...args: any[]): void;

  error(message: any, ...args: any[]): void;

  fatal(message: any, ...args: any[]): void;

  mark(message: any, ...args: any[]): void;
}

export type Instance = {
  /** 实例ID */
  instanceId: string;
  /** 实例IP */
  ip: string;
  /** 实例端口 */
  port: number;
  /** 实例健康状态 */
  healthy: boolean;
  /** 实例启用状态 */
  enabled: boolean;
  /** 实例权重 */
  weight: number;
  /** 实例元数据 */
  metadata?: Record<string, any>;
};

export type FinderBase = {
  serverAddr: string;
  namespace?: string;
  group?: string;
  redis: HwRedisCfg;
};

export type FinderSubConfig = {
  /** Name service name */
  serviceName: string;

  /** group, default use FinderNamingConfig.group */
  group?: string;

  /** 别名 */
  alias?: string;
};

export type FinderNamingConfig = {
  /** 是否开启 nacos 注册 */
  enable: boolean;
  serviceName: string;
  weight?: number;
  subscribe?: FinderSubConfig[];
};

/** group, default use FinderConfigConfig.group */
export type FinderCfgSubConfig = {
  dataId: string;
  group?: string;
  alias: string;
};

export type FinderConfigConfig = {
  /** 是否开启 nacos 配置服务 */
  enable: boolean;
  dependencies?: string[];
  subscribe?: FinderCfgSubConfig[];
};

export type FinderConfig = {
  /** 是否开启 nacos 注册 */
  enable: boolean;

  base: FinderBase;

  naming: FinderNamingConfig;

  config: FinderConfigConfig;
};

export type MicroServiceConfig = {
  /** 是否开启 */
  enable: boolean;

  /** 服务文件路径 缺省在项目根目录下 mservices 下 */
  path?: string;

  /** 使用的IP地址，不跟参数则自动获取本地IP */
  ip?: string;
  port: number;
  /** 跨域处理
   * true，所有源OK
   * string[], 指定源OK
   * undefined, 不处理跨域
   */
  cors?: true | string[];

  /** 服务发现配置 */
  finder: FinderConfig;
};
