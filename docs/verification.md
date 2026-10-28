# Verification — 2026-10-28

Executed locally on Windows with Node.js 22.16.0 and the committed npm dependency graph.

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed, strict TypeScript |
| `npm run lint` | Passed with no lint warnings or errors |
| `npm test` | 45 tests passed in five suites |
| `npm run test:e2e` | Nine Chromium fixture tests passed, with isolated scripted server/database |
| `npm run test:ai:live` | Four real Google/Gemma operator evaluations passed, including a native evidence-tool round trip |
| `npm run test:ai:browser` | One real Google-backed browser/session evaluation passed |
| `npm run build` | Optimized Next.js build and standalone asset/migration packaging passed |
| `npm start` | Passed on 2026-10-29; final Google-enabled standalone package started on loopback with an isolated temporary database |
| Production health/session/actions/export/static asset smoke | Passed: health/session HTTP 200, saved conversation, duplicate action deduplication, stale-version 409, discovered-only export, hidden debug route, and seven served JavaScript assets |
| Production Google inference | Passed with provider validation and no fallback; key absent from served JavaScript |
| `git diff --check` | Passed |

## Google migration ? 2026-10-29

The live adapter now uses Google generateContent with server-side header authentication, a configurable Gemma 4 model, minimal thinking, and bounded responses. Old provider configuration and adapters were removed. The local key was preserved in ignored `.env.local`. No inference key is included in source, screenshots, metadata, or sanitized evaluation artifacts. Provider-reported usage is retained per successful call and aggregated without inventing missing counts.

The native adapter and its failure paths have deterministic tests. The scripted operator was corrected to distinguish a reused commit from a delivery acknowledged before idempotency was enabled. The game and both endings remain unchanged.

## Browser coverage

The 2026-10-28 feature checks add the guided incident notebook and operational consequence reports. Desktop and mobile playthroughs verify discovery-gated instructions, recovery through notebook action buttons, restoring a partly completed checklist after reload, and an acknowledged retry that adds zero archive records. Reopening the notebook resets its scroll position. The objective and shortcut were visually checked at 390px width after correcting a narrow text layout. New captures: `notebook-desktop.png`, `notebook-mobile.png`, and `recovery-feedback-*.png`.

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

The nine browser tests use Playwright's installed Chromium. Tests do not make real inference calls. Provider fixtures cover malformed JSON, provider failure, discovery-gated tools, invalid citations/actions, and bounded tool rounds. The pure engine tests cover commit-before-ACK, duplicate retries, both restart modes, idempotency, acknowledgement repair, retained history, prerequisites, and recovery without a restart mistake. SQLite tests cover persistence, action UUID deduplication, and stale version rejection. Notebook tests cover source-gated instructions, a complete legal route, repair-first recovery, restoring derived progress, and accurate operational deltas.

## Verification limits

Google is the only live provider. The supplied Google AI Studio key successfully listed both supported Gemma 4 models, and the default model completed the explicit operator and browser checks. The five sampled replies were manually reviewed for grounding and undiscovered-story spoilers. See `ai-evaluation.md` and its sanitized sample artifacts. The final production server also completed a real Google reply; its [smoke report](evaluations/google-production-2026-10-29.json) records actual metadata and HTTP checks. This small sample does not establish general model correctness or universal account access. The native discovered-evidence read was verified live; invalid/undiscovered tool requests and provider ID/signature round trips are covered by fixtures. Broader adversarial prompt resistance and changing production quota require further evaluation.

The Dockerfile and Render instructions are prepared. A Docker image build and external deployment were not run. Persistent-disk behavior on Render has not been tested. Audio activation/muting was tested in Chromium; subjective loudness and physical speaker output were not assessed. Only Chromium was tested; Safari/Firefox and assistive technology require further manual evaluation.
