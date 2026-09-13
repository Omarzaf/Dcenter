import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// Each run owns its temporary compilation and never overwrites another test run.
const directory = mkdtempSync(join(tmpdir(), "core-arcade-tests-"));
const compiler = spawnSync(
  process.execPath,
  [
    "node_modules/typescript/bin/tsc",
    "src/game/engine.ts",
    "src/game/storage.ts",
    "--module",
    "commonjs",
    "--target",
    "ES2020",
    "--skipLibCheck",
    "--outDir",
    directory,
    "--esModuleInterop",
  ],
  { stdio: "inherit" },
);
if (compiler.status !== 0) process.exit(compiler.status ?? 1);
const result = spawnSync(
  process.execPath,
  [
    "--test",
    "tests/firstlight.test.mjs",
    "tests/campaign.test.mjs",
    "tests/narrative.test.mjs",
    "tests/narrative-validation.test.mjs",
    "tests/strategy.test.mjs",
    "tests/arcade.test.cjs",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, ARCADE_TEST_BUILD: directory },
  },
);
process.exit(result.status ?? 1);
