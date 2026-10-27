# Architecture

The browser renders a public projection. Route handlers load canonical SQLite state and invoke a pure TypeScript transition. Neither a client request nor an AI output supplies canonical state.

## Boundaries

- `lib/game/engine.ts`: explicit game, action, attempt, record, service, event, milestone, and ending types; deterministic elapsed simulation time; command parser. No React, database, scenario text, randomness, or wall-clock reads. Timestamp formatting uses a fixed fictional epoch.
- `lib/scenarios/episode.ts`: server-only evidence and final scenes. Data-driven nine-item episode. Only discovered bodies and the chosen completed scene pass the projection.
- `lib/server/projection.ts`: public state and explicit MORA knowledge projection. Discovery-gated read tools. The projection includes observed events, public topology, discovered evidence, legal actions, recent conversation, and unlocked facts.
- `lib/db/store.ts`: better-sqlite3, WAL, versioned SQL migrations, transactional state changes, action/event audit, conversation, invocation metadata. One transaction checks the action UUID, then the expected version, then applies the action and persists it.
- `lib/ai/operator.ts`: small provider interface, server-side fetch, bounded JSON protocol, schema/citation/legal-action validation, single repair attempt, scripted fallback. No simulator mutation authority.
- `components/game`: separate topology, evidence workspace, terminal, operator notebook, ambience/comfort, opening and final scenes.

## Recovery

Each active delivery commits a VAULT record, then tries the receipt route. A broken acknowledgement retains the pending message. Retry and active restart repeat the write. Paused restart respects pause. Stable message identity with idempotency reuses the committed result. Repair routes acknowledgements to `/v2/ack`. Resume or the next active tick then acknowledges and drains the queue. Past duplicate records remain. Repairing first is recoverable; enabling idempotency afterward satisfies the final safe configuration. No action destroys a clue.

## HTTP surface

| Route | Behavior |
| --- | --- |
| GET /api/session | Restore public state and conversation, or no save |
| POST /api/session | Start/replay with a new cryptographically random cookie |
| POST /api/action | Validate action, UUID, and expected state version |
| POST /api/operator | Validate question, reserve rate budget, infer/fallback, persist metadata |
| GET /api/export | Download discovered archive, timeline, and chosen final scene |
| GET /api/health | Minimal database liveness, no secrets |
| GET /api/debug | Current-session metadata only; 404 unless explicit demo setting |

Mutations check Origin when present. SameSite=Strict HttpOnly cookie; Secure when configured with a public HTTPS origin. All SQLite and AI routes use Node runtime. Request schemas use Zod. Sessions use 256-bit random IDs. Action version conflicts return refreshed state with 409; the player can retry intentionally. Duplicate UUID submissions do not reapply an action. UI action submission has an immediate ref lock; automatic ticks pause while another action is pending or a document is open. Multi-tab conflicts are resolved by the database, not browser state.

## Inference limits

Two tool rounds, at most two tools each; final structured answer; one repair; at most four completions. Each HTTP call has a 12-second timeout, 650-token generation budget, and 128KB response byte ceiling. Final text is limited to 1,800 characters. Questions are 1–1,200 characters; recent conversation is bounded to eight entries in context, 80 in storage. At most 100 requests per session and one accepted reservation per 1.2 seconds. Token usage is recorded only if actually returned. Metadata does not contain full prompts or keys. These are application limits, not a substitute for infrastructure abuse protection for a large public deployment.

## Storage and deployment

SQLite migrations run once transactionally under a migration ledger. State schema is version 1. New breaking schema versions need a corresponding state migration; no legacy schema exists yet. Docker explicitly copies migration SQL into the standalone runtime. One process/instance with a persistent writable disk is the supported deployment. Backups, expiry, and server-level request controls are operator responsibilities; anonymous historical sessions currently have no automatic expiry cleanup.
