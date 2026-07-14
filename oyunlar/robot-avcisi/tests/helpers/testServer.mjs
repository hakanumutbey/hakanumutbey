import { spawn } from "node:child_process";

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withServer(port, fn) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const output = [];
  const server = spawn(process.execPath, ["minik/server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });

  server.stdout.on("data", (chunk) => output.push(chunk.toString()));
  server.stderr.on("data", (chunk) => output.push(chunk.toString()));

  try {
    await waitForServer(baseUrl);
    return await fn({ baseUrl });
  } catch (error) {
    error.message += `\nServer output:\n${output.join("")}`;
    throw error;
  } finally {
    server.kill("SIGTERM");
  }
}

async function waitForServer(baseUrl) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await delay(100);
  }
  throw new Error(`Server did not start on ${baseUrl}`);
}
