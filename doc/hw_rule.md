# HW 框架开发规范

> 📋 **适用范围**：本文档适用于所有基于 HW 框架开发的 Node.js 应用程序

## 📚 目录

- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [插件开发规范](#插件开发规范)
- [组件开发规范](#组件开发规范)
- [微服务开发规范](#微服务开发规范)
- [数据库表微服务实现](#数据库表微服务实现)
- [类型定义](#类型定义)
- [最佳实践](#最佳实践)

## 🚀 快速开始

### 核心概念

| 概念 | 说明 | 示例 | 重点 |
|---|---|---|---|
| **插件** | 外部功能模块 | Redis、MQ、数据库连接 | 🔌 **通过配置自动挂载** |
| **组件** | 业务功能封装 | 用户管理、数据处理 | 🧩 **通过继承实现** |
| **微服务** | HTTP API 接口 | RESTful API 端点 | 🌐 **基于 Express 路由** |

## 🏗️ 项目结构

```
project-root/
├── comps/                 # 🔧 组件目录 - 业务逻辑封装
├── mservices/            # 🌐 微服务目录 - HTTP API
├── config/               # ⚙️ 配置文件
├── doc/                  # 📖 文档目录
└── index.d.ts           # 📝 TypeScript 类型定义
```

## 🔌 插件开发规范

### ⚠️ 重点规则：插件挂载名称

**核心规则**：插件通过 `config.json` 配置，挂载名称遵循：

1. **有 `alias` 字段** → 使用 `alias` 值
2. **无 `alias` 字段** → 使用 `_插件名` （下划线前缀）

**实际示例**：
```json
{
  "plugins": {
    "redis": { "alias": "_rd" },      // 挂载为：app._rd
    "database": {}                     // 挂载为：app._database
  }
}
```

## 🧩 组件开发规范

### ⚠️ 命名规范（重点）

| 项目 | 规范 | 示例 |
|---|---|---|
| **文件名** | 首字母小写 + 驼峰 | `userData.js` |
| **类名** | 驼峰 + `Comp` 后缀 | `UserDataComp` |
| **挂载名** | `comp` + 文件名驼峰 | `compUserData` |

### 🎯 完整组件模板

```javascript
// comps/userData.js - 注意文件名规范
const { HwCompBase } = require("@heywoogames/hw-base");

class UserDataComp extends HwCompBase {
  /**
   * ⚠️ 构造函数必须包含：
   * 1. super(app) 调用
   * 2. this.name 设置（格式：comp + 文件名驼峰）
   * 3. 包含下面的jsdoc 描述
   * 
   *  @param {import('@heywoogames/hw-base').HwAppBase} app - app instance
   */
  constructor(app) {
    super(app);
    this.name = 'compUserData'; // ⚠️ 固定格式！
  }

  // ⚠️ 必须实现的生命周期函数
  async onInit() { }
  async onStart() { }
  async onAfterStartAll() { }
  async onBeforeStop() { }
  async onAfterStop() { }
  async onAfterStopAll() { }
}

// ⚠️ 固定导出格式
module.exports = {
  ncompDefault: UserDataComp,
  UserDataComp
};
```

### 📝 创建组件步骤

1. **创建文件**：在 `comps/` 目录下创建文件
   ```
   comps/userData.js
   ```

2. **复制模板**：使用上面的完整组件模板

3. **修改命名**：
   - 文件名：`userData.js`（首字母小写 + 驼峰）
   - 类名：`UserDataComp`（驼峰 + Comp后缀）
   - 挂载名：`compUserData`（comp + 文件名驼峰）

4. **实现业务逻辑**：在生命周期函数中添加具体业务代码

## 🌐 微服务开发规范

### ⚠️ 命名规范（重点区分）

| 微服务类型 | 文件命名 | 类命名 | 说明 |
|---|---|---|---|
| **通用微服务** | 功能名 + `Ctl.js` | 功能名 + `Service` | 无数据库表 |
| **数据库表微服务** | **表名驼峰 + `Ctl.js`** | **表名驼峰 + `Service`** | ⚠️ **仅当有数据库表时** |

**示例对比**：
- 通用：`authCtl.js` → `AuthService`（无数据库表）
- 数据库：`userCtl.js` → `UserService`（操作 user 表）

### 🎯 微服务模板

```javascript
// mservices/services/authCtl.js - 通用微服务示例
const { body } = require('express-validator');
const { HwMSServiceBase } = require('@heywoogames/hw-base');

class AuthService extends HwMSServiceBase {
  #verRules = {
    login: [
      body('username').notEmpty().withMessage('用户名不能为空'),
      body('password').notEmpty().withMessage('密码不能为空')
    ]
  };

  constructor(web) {
    super(web);
    
    // ⚠️ 路由定义格式
    this.eapp.post('/auth/login', this.#verRules.login, this.login.bind(this));
  }

  /**
   * ⚠️ 所有处理函数必须是 async
   * 1. 包含下列jsdoc 描述
   * 
   * @param {import('@heywoogames/hw-base').HwExpressRequest} req
   * @param {import('@heywoogames/hw-base').HwExpressResponse} res
   */
  async login(req, res) {
    if (!this.validRequestPara(req, res)) return;
    
    // 业务逻辑
    const { username, password } = req.body;
    const token = await this.app.compAuth.authenticate(username, password);
    
    res.sendSucc({ token });
  }
}

module.exports = {
  nserviceDefault: AuthService,
  AuthService
};
```

### 📝 创建微服务步骤

1. **确定类型**：判断是否需要操作数据库表
   - 需要操作表 → 使用表名驼峰命名
   - 不需要操作表 → 使用功能名命名

2. **创建文件**：在 `mservices/services/` 目录下创建文件
   ```
   mservices/services/userCtl.js    # 数据库表微服务
   mservices/services/authCtl.js    # 通用微服务
   ```

3. **复制模板**：使用上面的微服务模板

4. **修改命名**：
   - 文件名：`userCtl.js` 或 `authCtl.js`
   - 类名：`UserService` 或 `AuthService`

5. **添加路由**：在构造函数中定义 API 路由

6. **实现方法**：添加具体的业务处理函数

## 🗄️ 数据库表微服务实现

### ⚠️ 重点：仅数据库相关微服务适用

**标准实现模式**（仅当微服务操作数据库表时）：

#### 1. 组件层（数据操作）
```javascript
// comps/user.js - 操作 user 表的组件
class UserComp extends HwCompBase {
  constructor(app) {
    super(app);
    this.name = 'compUser'; // 对应 user 表
  }

  // ⚠️ 标准 CRUD 方法命名
  async createUser(data) {
    const result = await this.app._db.insert('user', data);
    return result.insertId; // ⚠️ 必须返回自增ID
  }

  async updateUser(id, data) {
    await this.app._db.update('user', data, { id });
  }

  async deleteUser(id) {
    await this.app._db.delete('user', { id });
  }

  async getUserById(id) {
    return await this.app._db.query('SELECT * FROM user WHERE id = ?', [id]);
  }
}
```

#### 2. 微服务层（API 接口）
```javascript
// mservices/services/userCtl.js - 对应 user 表
class UserService extends HwMSServiceBase {
  constructor(web) {
    super(web);
    
    // ⚠️ 标准 RESTful 路由
    this.eapp.post('/user', this.createUser.bind(this));
    this.eapp.put('/user/:id', this.updateUser.bind(this));
    this.eapp.delete('/user/:id', this.deleteUser.bind(this));
    this.eapp.get('/user/:id', this.getUser.bind(this));
  }

  async createUser(req, res) {
    const id = await this.app.compUser.createUser(req.body);
    res.sendSucc({ id });
  }
}
```

## 📋 类型定义

### ⚠️ 必须声明的类型

```typescript
// index.d.ts
export module "@heywoogames/hw-base" {
  export interface HwAppBase {
    // ⚠️ 插件声明（必须与实际挂载名一致）
    _rd: HwRedisCli;      // 对应 redis 插件
    _db: any;              // 数据库插件
    
    // ⚠️ 组件声明（必须与实际组件名一致）
    compUserData: InstanceType<typeof UserDataComp>;
    compUser: InstanceType<typeof UserComp>;
  }
}
```

## ✅ 最佳实践（重点提醒）

### 1. 🚨 常见错误

| 错误类型 | 错误示例 | 正确做法 |
|---|---|---|
| **命名错误** | `UserService.js` | `userCtl.js` |
| **挂载名错误** | `this.name = 'UserComp'` | `this.name = 'compUserData'` |
| **文件位置错误** | `/services/user.js` | `/mservices/services/userCtl.js` |
| **文件名规范错误** | `UserData.js` | `userData.js`（首字母小写） |

### 2. ✅ 检查清单

**创建组件时检查**：
- [ ] 文件名是否首字母小写 + 驼峰（如：`userData.js`）
- [ ] 类名是否驼峰 + `Comp` 后缀
- [ ] `this.name` 是否为 `comp` + 文件名驼峰
- [ ] 是否导出 `ncompDefault` 和类名
- [ ] 是否在 `index.d.ts` 中声明组件类型（如：`compUserData: InstanceType<typeof UserDataComp>`）

**创建微服务时检查**：
- [ ] 有数据库表 → 表名驼峰 + `Ctl.js`
- [ ] 无数据库表 → 功能名 + `Ctl.js`
- [ ] 类名是否 + `Service` 后缀
- [ ] 是否导出 `nserviceDefault` 和类名
- [ ] 是否在 `index.d.ts` 中声明相关组件和插件类型

---

> 🚨 **重要提醒**：
> 1. **数据库表相关**的微服务才使用表名驼峰命名
> 2. **通用微服务**使用功能名命名，与数据库无关
> 3. 所有命名规范必须严格遵守，否则会导致挂载失败