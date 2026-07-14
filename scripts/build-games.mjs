import { cp, mkdir, rm, access, readFile, writeFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gamesRoot = join(root, "oyunlar");
const distGamesRoot = join(root, "dist", "oyunlar");

await mkdir(distGamesRoot, { recursive: true });

await buildViteGame("annenden-kac");
await buildViteGame("vale");
await copyStaticGame("bardak");
await copyStaticGame("essiz-zindan", ["dev_server.py", "package.json", "package-lock.json"]);
await copyStaticGame("skeleton-wars", ["remotion/node_modules", "remotion/package.json", "remotion/package-lock.json", "remotion/src"]);
await copyRobotAvcisi();

async function buildViteGame(slug) {
  const cwd = join(gamesRoot, slug);
  await ensureNodeModules(cwd);
  run("npx", ["vite", "build", "--base", `/oyunlar/${slug}/`, "--outDir", join(distGamesRoot, slug), "--emptyOutDir"], cwd);
  await injectGameTools(join(distGamesRoot, slug, "index.html"));
}

async function copyStaticGame(slug, excludes = []) {
  const source = join(gamesRoot, slug);
  const target = join(distGamesRoot, slug);
  await rm(target, { recursive: true, force: true });
  await cp(source, target, {
    recursive: true,
    filter: (path) => !shouldExclude(path, source, excludes),
  });
  await injectGameToolsInTree(target);
}

async function copyRobotAvcisi() {
  const slug = "robot-avcisi";
  const source = join(gamesRoot, slug);
  const target = join(distGamesRoot, slug);
  await ensureNodeModules(source, ["--omit=dev"]);
  await copyStaticGame(slug, ["node_modules", "tests", "minik", "scripts", "package.json", "package-lock.json", "kod"]);
  await mkdir(join(target, "vendor"), { recursive: true });
  await cp(join(source, "node_modules", "babylonjs", "babylon.js"), join(target, "vendor", "babylon.js"));
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
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed in ${cwd}`);
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
  if (html.includes("/site-game-tools.js")) return;
  html = html.replace("</body>", '  <script type="module" src="/site-game-tools.js"></script>\n  </body>');
  await writeFile(filePath, html, "utf8");
}
