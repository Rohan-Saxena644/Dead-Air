# Verification — 2026-10-27

Executed locally on Windows with Node.js 22.16.0 and the committed npm dependency graph.

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed, strict TypeScript |
| `npm run lint` | Passed with no lint warnings or errors |
| `npm test` | 20 tests passed in two suites |
| `npm run test:e2e` | Seven Chromium tests passed |
| `npm run build` | Optimized Next.js build and standalone asset/migration packaging passed |
| `npm start` | Packaged standalone server started successfully on a separate local port |
| Production health/session/actions/export/static asset smoke | HTTP 200, saved pause restored, duplicate action UUID did not reapply, undiscovered documents omitted from export, bundled JS served |
| `git diff --check` | Passed |

## Browser coverage

- Preserve ending reached; reload restored both mid-investigation and completed progress.
- Silence ending reached without a worker restart; export offered before confirmation.
- Operator failure fixture left operational actions usable and provided retry.
- Recovery through terminal keyboard input and through actual operational buttons.
- A paused worker restart did not cause another delivery.
- Evidence pinning, notebook, Escape dismissal, and dialog focus wrapping.
- Audio and comfort controls retained their settings when entering the investigation.
- Mobile panel navigation and no horizontal page overflow at 390 × 844.
- Authored scripted response actually returned through the server route.
- Capture run reported no browser console errors or uncaught page errors.

Actual screenshots were captured and visually inspected at 1440px desktop, 1366 × 768 laptop, and 390 × 844 mobile widths, including both final scenes. Inspection caught and corrected a panel overflow and an opening-menu stacking problem. The shell now starts collapsed and the laptop topology compacts on short screens. See `screenshots/`; the ending images contain spoilers.

The seven browser tests use Playwright's installed Chromium. Tests do not make real inference calls. Provider fixtures cover malformed JSON, provider failure, discovery-gated tools, invalid citations/actions, and bounded tool rounds. The pure engine tests cover commit-before-ACK, duplicate retries, both restart modes, idempotency, acknowledgement repair, retained history, prerequisites, and recovery without a restart mistake. SQLite tests cover persistence, action UUID deduplication, and stale version rejection.

## Verification limits

No OpenRouter API key or running Ollama model was supplied. Both real adapters are implemented; **live Gemma inference remains unverified**. Official catalog IDs were checked, which does not establish account access, current price, model quality, native tool support, or successful inference. See `ai-evaluation.md` for live groundedness and spoiler checks.

The Dockerfile and Render instructions are prepared. A Docker image build and external deployment were not run. Persistent-disk behavior on Render has not been tested. Audio activation/muting was tested in Chromium; subjective loudness and physical speaker output were not assessed. Only Chromium was tested; Safari/Firefox and assistive technology require further manual evaluation.
