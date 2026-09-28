#!/usr/bin/env node
/**
 * Domain test runner.
 *
 * Node 20 lacks `--experimental-strip-types`, and the domain imports are
 * extensionless TypeScript — so this runner bundles each `*.test.ts` with
 * esbuild (already in node_modules via Vite) into a self-contained ESM file
 * and executes it with `node --test`. Pass `--coverage` to enable Node's
 * experimental coverage reporter.
 */
import { build } from "esbuild";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const domainDir = join(process.cwd(), "src", "lib", "domain");
if (!existsSync(domainDir)) {
  console.error("No src/lib/domain directory found");
  process.exit(1);
}

const tests = (await readdir(domainDir)).filter((f) => f.endsWith(".test.ts"));
if (tests.length === 0) {
  console.error("No domain tests found");
  process.exit(1);
}

const outDir = await mkdtemp(join(tmpdir(), "trailguard-domain-tests-"));

try {
  await build({
    entryPoints: tests.map((t) => join(domainDir, t)),
    outdir: outDir,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    sourcemap: "inline",
  });

  const args = ["--test"];
  if (process.argv.includes("--coverage")) args.push("--experimental-test-coverage");
  args.push(...tests.map((t) => join(outDir, t.replace(/\.ts$/, ".js"))));

  const res = spawnSync(process.execPath, args, { stdio: "inherit" });
  process.exit(res.status ?? 1);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
