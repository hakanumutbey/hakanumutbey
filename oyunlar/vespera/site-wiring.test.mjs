// Ana site, build ve sunucu slug kaydı.
// Çalıştır: node oyunlar/vespera/site-wiring.test.mjs
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const main = read("src/main.js");
assert.match(main, /slug:\s*"vespera"/);
assert.match(main, /path:\s*"\/oyunlar\/vespera\/"/);

const build = read("scripts/build-games.mjs");
assert.match(build, /copyStaticGame\("vespera"/);

const server = read("server.mjs");
assert.match(server, /"vespera"/);

const tools = read("public/site-game-tools.js");
assert.match(tools, /vespera:\s*"Vespera"/);

const extras = read("src/studio-roadmap.js");
assert.match(extras, /vespera:/);

const agents = read("AGENTS.md");
assert.match(agents, /`vespera`/);

console.log("vespera site-wiring ok", {
  card: "/oyunlar/vespera/",
  build: "copyStaticGame",
  server: "vespera",
});
