const bodyParser = require("body-parser");

/**
 * @typedef {import('../../../types').HwExpressRequest} HwExpressRequest
 * @typedef {import('../../../types').HwExpressResponse} HwExpressResponse
 */

class TestService {
  /**
   *
   * @param {import('../../../lib/mservices/index').HwMicroService} main - micro service instance
   */
  constructor(main) {
    this.parserText = bodyParser.text();

    main._eapp.get("/tm", this.echo);
    main._eapp.post("/add", this.parserText, (req, res) => this.add(req, res));
  }

  /**
   *
   * @param {import('express').Request} req 请求
   * @param {HwExpressResponse} res 响应
   */
  echo(req, res) {
    res.sendSucc({ tm: Date.now() });
  }

  /**
   *
   * @param {HwExpressRequest} req - 请求
   * @param {HwExpressResponse} res - 响应
   */
  add(req, res) {
    res.sendHw(
      0,
      Object.assign({ tm: Date.now(), type: typeof req.body, body: req.body }),
    );
  }
}

module.exports = {
  nserviceDefault: TestService,
  TestService,
};
