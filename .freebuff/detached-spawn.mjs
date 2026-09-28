#!/usr/bin/env node
/**
 * Detached server launcher — the macOS equivalent of `setsid`.
 *
 * The tool runner reaps its process group after each command, which kills
 * `nohup ... &` children. spawn(…, { detached: true }) puts the child in a
 * NEW session with its own process group, and unref() lets this helper exit
 * immediately — the server keeps running, owned by launchd/init.
 *
 * Writes the server pid to .freebuff/preview.pid for later health checks.
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logPath = process.argv[2] ?? join(root, ".freebuff", "preview.log");

const child = spawn("npm", ["run", "dev"], {
  cwd: root,
  detached: true,
  stdio: ["ignore", "ignore", "ignore"],
  env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}` },
});

writeFileSync(join(root, ".freebuff", "preview.pid"), String(child.pid), "utf8");
console.log(`pid=${child.pid} log=${logPath}`);
child.unref();
