const { resolveEnvConfig } = require("../lib/envUtils");

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

console.log("=== resolveEnvConfig unit test ===\n");

console.log("Test 1: host from environment variable");
process.env.ENV_HW_TEST_HOST = "10.0.0.99";
const cfg1 = { host: "ENV_HW_TEST_HOST", port: 6379 };
resolveEnvConfig(cfg1);
assert(cfg1.host === "10.0.0.99", `host resolved to ${cfg1.host}`);

console.log("\nTest 2: password from environment variable");
process.env.ENV_HW_TEST_PASS = "s3cret";
const cfg2 = { host: "localhost", port: 6379, password: "ENV_HW_TEST_PASS" };
resolveEnvConfig(cfg2);
assert(cfg2.password === "s3cret", `password resolved to ${cfg2.password}`);

console.log("\nTest 3: both host and password from environment variables");
process.env.ENV_HW_BOTH_HOST = "192.168.1.1";
process.env.ENV_HW_BOTH_PASS = "bothpass";
const cfg3 = { host: "ENV_HW_BOTH_HOST", port: 6379, password: "ENV_HW_BOTH_PASS" };
resolveEnvConfig(cfg3);
assert(cfg3.host === "192.168.1.1", `host resolved to ${cfg3.host}`);
assert(cfg3.password === "bothpass", `password resolved to ${cfg3.password}`);

console.log("\nTest 4: normal values without ENV_HW_ prefix");
const cfg4 = { host: "localhost", port: 6379, password: "plainpass" };
resolveEnvConfig(cfg4);
assert(cfg4.host === "localhost", `host unchanged: ${cfg4.host}`);
assert(cfg4.password === "plainpass", `password unchanged: ${cfg4.password}`);

console.log("\nTest 5: environment variable not set");
const cfg5 = { host: "ENV_HW_NONEXISTENT_VAR_XYZ", port: 6379 };
resolveEnvConfig(cfg5);
assert(cfg5.host === "ENV_HW_NONEXISTENT_VAR_XYZ", `host kept original: ${cfg5.host}`);

console.log("\nTest 6: null / undefined input");
assert(resolveEnvConfig(null) === null, "null returns null");
assert(resolveEnvConfig(undefined) === undefined, "undefined returns undefined");

console.log("\nTest 7: config without host/password");
const cfg7 = { port: 6379, db: 2 };
resolveEnvConfig(cfg7);
assert(cfg7.port === 6379 && cfg7.db === 2, "other fields unchanged");
delete process.env.ENV_HW_TEST_HOST;
delete process.env.ENV_HW_TEST_PASS;
delete process.env.ENV_HW_BOTH_HOST;
delete process.env.ENV_HW_BOTH_PASS;

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
