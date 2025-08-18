/**
 * @swagger
 * components:
 *   schemas:
 *     HwResponse:
 *       type: object
 *       properties:
 *         code:
 *           type: integer
 *           description: 状态码
 *           default: 0
 *         success:
 *           type: boolean
 *           description: 是否成功
 *           example: true
 *         msg:
 *           type: string
 *           description: 提示信息
 *           example: "操作成功"
 *         data:
 *           type: object
 *           description: 动态数据内容
 *     HwRouterInfo:
 *       type: object
 *       properties:
 *         path:
 *           type: string
 *           description: 路由路径
 *         methods:
 *           type: object
 *           description: 支持的方法
 *     HwResponseSimple:
 *       allOf:
 *         - $ref: '#/components/schemas/HwResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: string
 *               description: 字符串数据
 *               nullable: true
 */

/**
 * @swagger
 * paths:
 *   /echo:
 *     get:
 *       summary: echo测试接口
 *       tags: [hwBase]
 *       parameters:
 *         - in: query
 *           name: time
 *           required: false
 *           schema:
 *             type: string
 *           description: 时间戳
 *       responses:
 *         '200':
 *           description: 成功
 *           content:
 *             application/json:
 *               schema:
  *                 allOf:
 *                   - $ref: '#/components/schemas/HwResponse'
 *                   - type: object
 *                     properties:
 *                       data:
 *                         type: object
 *                         description: 数据内容
 */

/**
 * @swagger
 * paths:
 *   /info:
 *     get:
 *       summary: 获取服务信息
 *       tags: [hwBase]
 *       responses:
 *         '200':
 *           description: 成功
 *           content:
 *             application/json:
 *               schema:
  *                 allOf:
 *                   - $ref: '#/components/schemas/HwResponse'
 *                   - type: object
 *                     properties:
 *                       data:
 *                         type: object
 *                         properties:
 *                           startTime:
 *                             type: string
 *                             description: 服务启动时间
 *                           runTime:
 *                             type: string
 *                             description: 服务运行时间
 *                           time:
 *                             type: string
 *                             description: 当前时间
 *                           tm:
 *                             type: number
 *                             description: 当前时间戳
 *                           mem_info:
 *                             type: object
 *                             description: 内存信息
 *                             properties:
 *                               rss:
 *                                 type: number
 *                                 description: 常驻内存
 *                               heapTotal:
 *                                 type: number
 *                                 description: 堆内存总量
 *                               heapUsed:
 *                                 type: number
 *                                 description: 堆内存使用量
 *                               external:
 *                                 type: number
 *                                 description: 外部内存使用量
 *                               arrayBuffers:
 *                                 type: number
 *                                 description: 数组缓冲区使用量
 *                           ext_info:
 *                             type: object
 *                             description: 扩展信息
 */

/**
 * @swagger
 * paths:
 *   /mcache:
 *     get:
 *       summary: 获取缓存信息
 *       tags: [hwBase]
 *       parameters:
 *         - in: query
 *           name: show
 *           required: false
 *           schema:
 *             type: string
 *           description: 显示的缓存键，多个键用逗号分隔
 *           example: key1,key2,key3
 *         - in: query
 *           name: clearAll
 *           required: false
 *           schema:
 *             type: string
 *           description: 清除所有缓存
 *           example: 1
 *         - in: query
 *           name: help
 *           required: false
 *           schema:
 *             type: string
 *           description: 帮助信息
 *           example: 1
 * 
 *       responses:
 *         '200':
 *           description: 成功
 *           content:
 *             application/json:
 *               schema:
 *                 allOf:
 *                   - $ref: '#/components/schemas/HwResponse'
 *                   - type: object
 *                     properties:
 *                       data:
 *                         type: object
 *                         properties:
 *                           stats:
 *                             type: object
 *                             description: 缓存统计信息
 *                           keys:
 *                             type: array
 *                             description: 缓存键
 *                           data:
 *                             type: object
 *                             description: 缓存数据
 *                           help:
 *                             type: object
 *                             description: 帮助信息
 */


/**
 * @swagger
 * paths:
 *   /varget:
 *     get:
 *       summary: 获取变量
 *       tags: [hwBase]
 *       parameters:
 *         - in: query
 *           name: name
 *           required: true
 *           schema:
 *             type: string
 *           description: 变量基于app
 *           example: _ms._cfg
 *       responses:
 *         '200':
 *           description: 成功
 *           content:
 *             application/json:
 *               schema:
 *                 allOf:
 *                   - $ref: '#/components/schemas/HwResponse'
 *                   - type: object
 *                     properties:
 *                       data:
 *                         type: object
 */

/**
 * @swagger
 * paths:
 *   /api:
 *     get:
 *       summary: 获取api列表
 *       tags: [hwBase]
 *       responses:
 *         '200':
 *           description: 成功
 *           content:
 *             application/json:
 *               schema:
 *                 allOf:
 *                   - $ref: '#/components/schemas/HwResponse'
 *                   - type: object
 *                     properties:
 *                       data:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/HwRouterInfo'
 */
