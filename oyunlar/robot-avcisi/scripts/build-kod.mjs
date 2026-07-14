import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const outputFile = "kod";
const checkOnly = process.argv.includes("--check");
const header = [
  "Robot Avcisi - tum proje kodlari",
  "Olusturma notu: Bu dosyada proje kaynaklari birlestirildi. node_modules, gorsel/binary assetler ve gecici dosyalar eklenmedi.",
  ""
];

const fixedFiles = [
  "package.json",
  "index.html",
  "style.css",
  "minik/README.md",
  "minik/server.js"
];

const content = await buildKodContent();
if (checkOnly) {
  await checkKodContent(content);
} else {
  await writeFile(outputFile, content, "utf8");
}
const lineCount = content.split("\n").length - 1;
console.log(`${lineCount} ${outputFile}`);

async function buildKodContent() {
  const generatedFiles = [
    ...fixedFiles,
    ...await filesUnder("scripts"),
    ...await filesUnder("shared"),
    ...await filesUnder("src"),
    ...await filesUnder("tests")
  ];

  let content = `${header.join("\n")}\n`;
  for (const file of generatedFiles) {
    content += `\n===== ${file} =====\n`;
    content += await readFile(file, "utf8");
    content += "\n";
  }
  return content;
}

async function checkKodContent(expected) {
  let current = "";
  try {
    current = await readFile(outputFile, "utf8");
  } catch {
    throw new Error(`${outputFile} dosyasi yok. npm run build:kod calistir.`);
  }
  if (current !== expected) {
    throw new Error(`${outputFile} guncel degil. npm run build:kod calistir.`);
  }
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await filesUnder(path));
      continue;
    }
    if (!entry.isFile()) continue;
    if (await isTextFile(path)) files.push(path);
  }
  return files.sort();
}

async function isTextFile(path) {
  const info = await stat(path);
  return info.size < 1_000_000;
}
