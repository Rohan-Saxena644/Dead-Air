# Submission pass — 2026-10-31

Checks performed for this pass:

- `npm.cmd test`: **56 tests in 7 files passed**, including the new custody branch, four outcome persistence paths, progressive scripted hints, whole-turn deadline with a noncooperative provider fixture, per-session lease, global concurrency, and shared usage budget.
- `npm.cmd run typecheck`: passed. The final production build also completed TypeScript validation after the later UI changes.
- `npm.cmd run lint`: passed, including the recording script.
- Scanned all 10 generated client JavaScript files against the configured Google key without printing the key: absent from every file.
- `npm.cmd run build`: passed. A subsequent affected rebuild passed after changing the archive’s hardcoded nine-file counter to the actual evidence count.
- `npx.cmd playwright test --config playwright.production.config.ts`: **16 scenarios covered against production**, using a temporary SQLite database and scripted inference. The first run passed 13; the remaining three passed with `--last-failed` after fixing test startup synchronization and selectors for the new evidence count / full control labels. No application behavior was weakened to satisfy these checks.
- Browser coverage includes all four variations, wrong and correct custody interpretations, scripted evidence comparison, mid-game and ending reloads, replay, local badges, storage exceptions, missing-session recovery, stale suggestions, terminal and button recovery, mobile overflow, focus, and comfort controls.

The demo is a separate real Google call in an isolated production session, with the local `DEV_DEMO_DEBUG=false` configuration. Its visible provider label and actual response are saved in `artifacts/demo/operator-record.json`. This is a functional sample, not a latency or general model-quality benchmark. Opening, investigation, and ending screenshots were captured from the same real recording session. Video properties and representative extracted frames are recorded under `artifacts/demo/`. The completed file is 176.4 seconds, 1920 by 1080, VP9 at 25 fps, and 32,540,771 bytes. Four extracted frames were visually inspected. H.264 encoding is unavailable in the installed FFmpeg, so the actual WebM and an exact conversion command are provided.

The earlier Google evaluations and Docker checks in `docs/verification.md` remain historical records. Docker was not rebuilt or retested in this submission pass. No external deployment, DEV publication, YouTube upload, public user test, or external receipt of an archive was performed or asserted.

Reproduce browser checks after building:

```powershell
npx.cmd playwright test --config playwright.production.config.ts
```

This configuration owns loopback port 3501 and a fresh temporary database; it does not reuse or stop the developer’s existing server. Recording uses a separate owned server on port 3502. Chromium is the tested browser; other browsers and assistive technology remain outside this verification scope.
