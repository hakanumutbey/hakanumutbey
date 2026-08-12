import { cp, mkdir, rm, access, readFile, writeFile, readdir } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gamesRoot = join(root, "oyunlar");
const distGamesRoot = join(root, "dist", "oyunlar");
const inDocker = process.env.DOCKER_BUILD === "1" || existsSync("/.dockerenv");
// Her build'de degisir: statik oyunlarin js/css URL'lerine ?v= eklenip
// 30 gunluk tarayici onbellegi asilir (sunucu query'yi yok sayar).
const buildId = Date.now().toString(36);

console.log(`[build-games] start (docker=${inDocker})`);
await mkdir(distGamesRoot, { recursive: true });

await buildViteGame("annenden-kac");
await buildViteGame("vale");
await copyStaticGame("bardak");
await copyStaticGame("essiz-zindan", ["dev_server.py", "package.json", "package-lock.json"]);
await copyStaticGame("skeleton-wars", ["remotion/node_modules", "remotion/package.json", "remotion/package-lock.json", "remotion/src", "remotion/out"]);
await copyStaticGame("rhgpo", ["tests"]);
await copyStaticGame("siyah-adam");
await copyStaticGame("birlesim-arenasi");
await copyStaticGame("hentw", ["package.json"]);
await copyStaticGame("hentw2", ["package.json"]);
await copyStaticGame("hentw3", ["package.json"]);
await copyStaticGame("hentw-premium", ["package.json"]);
await copyStaticGame("siber-polis", ["package.json", "js/gameLogic.test.js"]);
await copyStaticGame("space-arena");
await copyStaticGame("2d-car-simulator", ["game.test.mjs"]);
await copyRobotAvcisi();
console.log("[build-games] all games ready");

async function buildViteGame(slug) {
  const cwd = join(gamesRoot, slug);
  console.log(`[build-games] ${slug}: ensure deps + vite build`);
  await ensureNodeModules(cwd);
  run("npx", ["vite", "build", "--base", `/oyunlar/${slug}/`, "--outDir", join(distGamesRoot, slug), "--emptyOutDir"], cwd);
  await injectGameTools(join(distGamesRoot, slug, "index.html"));
  // Free disk/RAM during Coolify/Docker builds (two heavy vite games in a row).
  if (inDocker) {
    await rm(join(cwd, "node_modules"), { recursive: true, force: true });
    console.log(`[build-games] ${slug}: cleaned node_modules`);
  }
  console.log(`[build-games] ${slug}: done`);
}

async function copyStaticGame(slug, excludes = []) {
  const source = join(gamesRoot, slug);
  const target = join(distGamesRoot, slug);
  console.log(`[build-games] ${slug}: static copy`);
  await rm(target, { recursive: true, force: true });
  await cp(source, target, {
    recursive: true,
    filter: (path) => !shouldExclude(path, source, excludes),
  });
  await injectGameToolsInTree(target);
  console.log(`[build-games] ${slug}: done`);
}

async function copyRobotAvcisi() {
  const slug = "robot-avcisi";
  const source = join(gamesRoot, slug);
  const target = join(distGamesRoot, slug);
  const vendorBabylon = join(source, "vendor", "babylon.js");
  const nodeBabylon = join(source, "node_modules", "babylonjs", "babylon.js");

  console.log(`[build-games] ${slug}: start`);
  await copyStaticGame(slug, [
    "node_modules",
    "tests",
    "minik",
    "scripts",
    "package.json",
    "package-lock.json",
    "kod",
  ]);
  await mkdir(join(target, "vendor"), { recursive: true });

  let babylonSource = null;
  if (await exists(vendorBabylon)) {
    babylonSource = vendorBabylon;
    console.log(`[build-games] ${slug}: using vendored babylon.js`);
  } else if (await exists(nodeBabylon)) {
    babylonSource = nodeBabylon;
    console.log(`[build-games] ${slug}: using node_modules babylon.js`);
  } else {
    console.log(`[build-games] ${slug}: npm ci for babylon (fallback)`);
    await ensureNodeModules(source, ["--omit=dev"]);
    babylonSource = nodeBabylon;
  }

  await cp(babylonSource, join(target, "vendor", "babylon.js"));
  if (inDocker && (await exists(join(source, "node_modules")))) {
    await rm(join(source, "node_modules"), { recursive: true, force: true });
  }
  console.log(`[build-games] ${slug}: done`);
}

async function exists(path) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureNodeModules(cwd, extraArgs = []) {
  try {
    await access(join(cwd, "node_modules"), constants.R_OK);
  } catch {
    run("npm", ["ci", ...extraArgs], cwd);
  }
}

function shouldExclude(path, base, excludes) {
  const relative = path.slice(base.length + 1).replaceAll("\\", "/");
  if (!relative) return false;
  return excludes.some((entry) => relative === entry || relative.startsWith(`${entry}/`));
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      // Cap Node heap a bit so one vite game is less likely to OOM-kill the whole build.
      NODE_OPTIONS: process.env.NODE_OPTIONS || (inDocker ? "--max-old-space-size=1536" : undefined),
    },
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed in ${cwd} (status ${result.status})`);
  }
}

async function injectGameToolsInTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await injectGameToolsInTree(path);
    } else if (entry.isFile() && entry.name === "index.html") {
      await injectGameTools(path);
    }
  }
}

async function injectGameTools(filePath) {
  let html = await readFile(filePath, "utf8");
  // Goreceli js/css referanslarina ?v= ekle (30 gunluk onbellegi as).
  // Mutlak (/...), dis (http) ve data URL'lere dokunma.
  html = html.replace(
    /((?:src|href)=")(?!https?:|\/|data:|#)([^"?]+\.(?:js|css))(?:\?[^"]*)?(")/g,
    `$1$2?v=${buildId}$3`
  );
  if (html.includes("/site-game-tools.js")) return;
  html = html.replace("</body>", '  <script type="module" src="/site-game-tools.js"></script>\n  </body>');
  await writeFile(filePath, html, "utf8");
}
