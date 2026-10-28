# DEAD AIR

**02:13 AM. Meridian Systems ceased operations seven years ago. One connection is still active.**

*The Last Acknowledgement* is a complete browser investigation played through a forgotten operations dashboard. Follow an old voice through three simulated services, diagnose a real distributed-systems failure, recover nine documents, and choose between preserving the archive and finishing its shutdown. Intended play time: 10–15 minutes, including reading and investigation.

The industrial console uses local CSS, system fonts, SVG/Lucide icons, optional Web Audio ambience, reduced-motion support, and mobile panel navigation. There is no countdown. All commands are parsed fictional actions; no shell, real service, or user file is controlled by the terminal.

For a first playthrough, use **Open incident notebook** beside the current objective. Its investigation plan reveals the recovery checklist after you read the recovered runbook, tracks the actual machine state, and offers a legal next action. Completed steps restore from your save. Operational reports show whether your last control changed attempts, added archive records, or drained the queue; repairing a route alone is never reported as a completed delivery.

![The DEAD AIR investigation console, captured from the running application](docs/screenshots/console-desktop.png)

## Run locally

Requires Node.js 22 LTS and npm. From this directory:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` and `npm.cmd` if script execution policy blocks `npm.ps1`. Open http://127.0.0.1:3000. No inference account is needed: the default is visibly labeled **Scripted fallback**.

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm start
```

The lockfile fixes the dependency graph. `better-sqlite3` uses native binaries; a platform without a matching prebuild needs its normal C++ build toolchain. SQLite migrations apply automatically on the first server request. Migration SQL is versioned in `src/lib/db/migrations`; the migration ledger and application are transactional. The default database is `data/dead-air.sqlite`, ignored by Git.

`npm run build` also packages static assets and SQL migrations into Next's standalone output. `npm start` loads local production environment files and starts that server, resolving relative database paths against the project root. Set the `PORT` environment variable to change the production port.

## What is real

LISTENER, RELAY, VAULT, their queue, messages, timestamps, records, and all employee material are fictional simulation entities. Mechanics are real typed code: at-least-once delivery commits before a lost acknowledgement, retries duplicate writes, idempotency reuses a committed result, and a repaired acknowledgement drains the queue. Both endings require recovery and reading the final request.

The server actually persists anonymous sessions, versioned states, action/event records, conversation, and inference metadata in SQLite. Reload and choose Continue to restore. An HttpOnly anonymous cookie identifies the investigation; it is not an account. Replay creates a new session. JSON exports include only discovered documents and, after completion, that ending's scene.

MORA's scripted mode uses authored responses selected from actual investigation state and question topics. It is useful without credentials, but is **not model inference**. OpenRouter and Ollama modes make actual server-side HTTP inference calls. A failed call uses labeled scripted assistance and offers retry; controls remain independent.

## Hosted Gemma

Set in `.env.local` or your deployment's environment, then restart:

```dotenv
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=google/gemma-3-27b-it
```

The [Gemma 3 27B model ID](https://openrouter.ai/google/gemma-3-27b-it) was checked against the official catalog during implementation. Availability and pricing depend on the provider. No free tier is assumed. The adapter uses the [OpenRouter chat API](https://openrouter.ai/docs/api/reference/overview) with a validated JSON protocol, avoiding assumptions about native tools or strict structured-output support on a particular route.

Hosted inference sends discovered fictional game evidence and the relevant recent conversation to OpenRouter and its selected provider. It is not offline or automatically private. Do not enter personal information into the fictional console.

## Local Gemma

Install Ollama separately, then:

```sh
ollama pull gemma3:4b
ollama serve
```

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
```

The tag is listed in the [official Ollama Gemma 3 library](https://ollama.com/library/gemma3); the implementation uses its [chat endpoint](https://docs.ollama.com/api/chat). Local inference requires suitable memory/hardware. Actual inference on this machine has not been verified. Docker's loopback points inside the container; use an appropriate host address when Ollama runs on the host. No provider secret is exposed to the client.

Gemma is an **open-weight** model under the [Gemma terms](https://ai.google.dev/gemma/terms), not a claim of unrestricted open-source licensing. Inference is not automatically cost-free. Prompts are inspectable in `src/lib/ai/operator.ts`; model IDs and adapters are replaceable. No weights are distributed with this project.

## Deployment

One Node process/container, one SQLite database. Build the supplied Dockerfile or use `npm ci && npm run build`, then `npm start`. Set `APP_BASE_URL` to the exact public HTTPS origin, `NODE_ENV=production`, and `DATABASE_PATH` to a writable persistent location. The anonymous cookie is Secure for an HTTPS base URL.

On Render, create one Docker web service, set a health check at `/api/health`, and attach a persistent disk mounted at `/app/data`. Set `DATABASE_PATH=/app/data/dead-air.sqlite` and the public HTTPS `APP_BASE_URL`. Persistent disks depend on your Render plan. Keep one instance: this SQLite implementation does not coordinate multiple replicas. Back up the SQLite database with its WAL-aware backup facility or while the app is stopped. The Docker image includes migrations and runs as the non-root `node` user; ensure the mount is writable by that user.

An ephemeral demo may run without a disk, but **saves can reset on redeploy/restart**. Disclose that on any public demo. A browser cookie does not make an ephemeral filesystem durable. No external deployment or paid service was created by this implementation.

## Limits and verification

See [verification results](docs/verification.md), [architecture](docs/architecture.md), [AI evaluation](docs/ai-evaluation.md), [demo script](docs/demo-script.md), and [challenge notes](docs/challenge-notes.md). Schema, citation, and action validation reduce specific risks; they do not prove model factual correctness. Live providers require separate evaluation. No Sentry integration is claimed. Debug metadata is available only at `/api/debug` when `DEV_DEMO_DEBUG=true` and only for the current session.

The simulation advances at most one bounded step per active-tab tick; closed tabs do not accumulate catch-up work. Reading a document suspends automatic ticks. Long sessions retain a full event timeline; the UI shows recent logs. This is a single episode, not a general simulator or an actual archive storage product.

## Credits and licensing

Game code and original episode text: MIT, see [LICENSE](LICENSE). Third-party packages retain their own licenses: Next.js/React/Tailwind/Vitest/Zod/better-sqlite3 (MIT), Playwright (Apache-2.0), Lucide (ISC). See [third-party notices](docs/third-party-notices.md). No remote fonts, stock media, analytics, model weights, or audio files are bundled.
