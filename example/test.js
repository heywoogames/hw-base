const { Main } = require("./app");

(async () => {
  const main = new Main();
  await main.init();
  await main.start();
})();
