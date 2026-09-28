# TrailGuard — Run Doc

TanStack Start (Vite 8 + Nitro) app. Dev server binds `0.0.0.0:8080` (the live-preview
contract baked into `vite.config.ts` with `strictPort: true`).

## Reproduce artifacts

Nothing uncommitted is required to run:

- **Env files** — the project intentionally has **no `.env`**: `DATABASE_URL` is unset in
  dev and `src/lib/db.ts` falls back to embedded PGLite. Auth creds are injected by the
  platform on deploy, never stored locally. **Copy nothing.**
- **Dependencies** — npm with lockfile:
  ```sh
  npm install --no-audit --no-fund
  ```
  (`node_modules/` already present in this checkout; re-run only if `package-lock.json`
  changed.) Two dev-only additions from the A02 test work: `esbuild`, `tsx`.
- **Generated route tree** — `src/routeTree.gen.ts` is checked in; the Vite plugin
  regenerates it on boot if routes change.

## Run the server

```sh
nohup npm run dev > .freebuff/preview.log 2>&1 < /dev/null &
```

- `npm run dev` = `node scripts/with-app-env.mjs vite dev --host 0.0.0.0 --port 8080`
  (the wrapper injects `.grok/app-env.json` → `VITE_AUTH_ENABLED`; do not invoke
  `vite` directly).
- Port **8080** is fixed by `vite.config.ts` (`server.port` + `strictPort`). If taken,
  stop the holder rather than moving the port: `node scripts/preview.mjs stop`.
- Readiness: `curl -sf http://127.0.0.1:8080/` returns 200 with HTML containing
  `Field desk`.
- A production build check, if needed: `npm run build` then `npm run preview:restart`
  (that one serves loopback `127.0.0.1:8081`).

## Tests (domain + backend)

- Web domain: `npm run test:domain` (runner: `node --import tsx --test` over
  `src/lib/domain/*.test.ts`; `--coverage` variant: `npm run test:domain:coverage`).
- FastAPI services: `cd artifacts/TrailGuard/backend && ./.venv/bin/python -m pytest tests -q`
  (venv at `artifacts/TrailGuard/backend/.venv`, Python 3.11).
