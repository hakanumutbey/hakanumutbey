// window var, module/require yokken logic.js + game.js yüklenir.
// Çalıştır: node oyunlar/vespera/browser-load.test.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { strict as assert } from "node:assert";

const here = dirname(fileURLToPath(import.meta.url));
const logicSrc = readFileSync(join(here, "logic.js"), "utf8");
const gameSrc = readFileSync(join(here, "game.js"), "utf8");

assert.doesNotMatch(logicSrc, /\bimport\s+|export\s+/);
assert.doesNotMatch(gameSrc, /\bimport\s+|export\s+/);

const windowObj = {
  addEventListener() {},
};
const sandbox = {
  window: windowObj,
  document: {
    getElementById() {
      return null;
    },
    location: { protocol: "http:" },
    addEventListener() {},
  },
  performance: { now: () => 0 },
  requestAnimationFrame() {
    return 0;
  },
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {},
  },
};
Object.defineProperty(sandbox, "module", { value: undefined });
Object.defineProperty(sandbox, "require", { value: undefined });
vm.createContext(sandbox);
vm.runInContext(logicSrc, sandbox, { filename: "logic.js" });
vm.runInContext(gameSrc, sandbox, { filename: "game.js" });

assert.ok(sandbox.window.Vespera, "Vespera yok");
assert.ok(sandbox.window.VesperaGame, "VesperaGame yok");
assert.equal(sandbox.window.VesperaGame.ready, true);
assert.ok(Array.isArray(sandbox.window.Vespera.REGIONS));
assert.ok(sandbox.window.Vespera.createState);
assert.equal(typeof sandbox.module, "undefined");
assert.equal(typeof sandbox.require, "undefined");

console.log("vespera browser-load ok", {
  ready: sandbox.window.VesperaGame.ready,
  mode: sandbox.window.VesperaGame.mode,
  regions: sandbox.window.Vespera.REGIONS.length,
});
