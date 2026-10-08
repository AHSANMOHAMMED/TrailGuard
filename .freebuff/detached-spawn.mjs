#!/usr/bin/env node
/** Detached server launcher — macOS equivalent of setsid.

The tool runner reaps its process group after each command, which kills
nohup ... & children. spawn(…, { detached: true }) puts the child in a NEW
session with its own process group, and unref() lets this helper exit right
away — the server keeps running, owned by launchd.

Writes the server pid to .freebuff/preview.pid for health checks.
*/
import { spawn } from "node:child_process";
import { openSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logPath = process.argv[2] ?? join(root, ".freebuff", "preview.log");

// npm resolves `vite` by name only if node_modules/.bin is on PATH.
// The wrapper spawns `vite`; without the bin dir, spawn vite => ENOENT even
// though `node ./node_modules/.bin/vite` works directly.
const npmBin = join(root, "node_modules", ".bin");
const logFd = openSync(logPath, "a");
const child = spawn("npm", ["run", "dev"], {
  cwd: root,
  detached: true,
  stdio: ["ignore", logFd, logFd],
  env: { ...process.env, PATH: `${npmBin}:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}` },
});

writeFileSync(join(root, ".freebuff", "preview.pid"), String(child.pid), "utf8");
console.error(`pid=${child.pid} log=${logPath}`);
child.unref();
