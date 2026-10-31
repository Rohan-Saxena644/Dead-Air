# Free public beta on Render

The root `render.yaml` prepares one **free** Docker web service, with no persistent disk or paid database. Automatic deploys are disabled so releases can be triggered deliberately. It has not created a Render service yet.

## Prepared configuration

| Setting         | Value                                             |
| --------------- | ------------------------------------------------- |
| Runtime         | Docker / one Node process                         |
| Plan            | Free                                              |
| Health endpoint | `/api/health`                                     |
| Port            | `10000`, bound to `0.0.0.0`                       |
| Database        | `/app/data/dead-air.sqlite`                       |
| Save disclosure | `SAVE_STORAGE=ephemeral`                          |
| Live provider   | Google AI Studio / `gemma-4-26b-a4b-it`           |
| Google key      | Secret environment variable supplied during setup |
| Debug endpoint  | Disabled                                          |

The UI discloses temporary saves before starting, during play, and at the ending. Export is available during an investigation and after completion. Render's [free services cannot attach persistent disks](https://render.com/docs/free), and local SQLite files are lost on restart, redeploy, or idle spin-down. Free services spin down after 15 minutes without incoming traffic; the next visit can take about a minute to wake the service. This is a resettable demo, not durable hosted storage. These hosting details were checked against Render's official documentation on 2026-10-31.

## Publish

1. Push the reviewed commits to `main` on `https://github.com/Rohan-Saxena644/Dead-Air`. In the Render Dashboard choose **New → Blueprint**, connect this GitHub repository, select `main`, and use the root `render.yaml`. The [Blueprint configuration](https://render.com/docs/infrastructure-as-code) creates the Docker web service; do not create a static site.
2. Review that the service plan is **Free**, with no disk or other paid resource. The Blueprint itself requests only that free web service.
3. Set `GEMINI_API_KEY` when prompted. The Blueprint's [`sync: false` setting](https://render.com/docs/blueprint-spec) makes Render request its secret value during initial setup. Do not upload `.env.local`; it is excluded from Git and Docker. Keep `AI_PROVIDER=google`, `GEMINI_MODEL=gemma-4-26b-a4b-it`, `SAVE_STORAGE=ephemeral`, and `DEV_DEMO_DEBUG=false`. The app remains playable with labeled scripted fallback if the key is absent or the Google quota is exhausted.
4. Create/deploy the service. Render supplies `RENDER_EXTERNAL_URL`; the app uses that HTTPS origin for secure session cookies. A custom domain can override this with `APP_BASE_URL`. Do not set `APP_BASE_URL` to localhost on the hosted service.
5. On the actual returned HTTPS URL, verify `/api/health`, the opening notice, start/reload, a real MORA reply, and one complete ending. `/api/debug` must return 404. Confirm the Google mode reflects the actual reply, then share the URL as a public beta. Automatic deploys are disabled in this Blueprint: use **Manual Deploy → Deploy latest commit** for later releases, as described in [Render's deploy documentation](https://render.com/docs/deploys).

After the hosted check, replace `LIVE_GAME_URL` in `docs/dev-submission.md` with the verified URL. Upload `artifacts/demo/dead-air-demo.webm` to YouTube, use `artifacts/demo/youtube.md` for upload copy, and replace `YOUTUBE_VIDEO_URL`. Upload the two article screenshots to DEV and replace their relative image paths. Then paste the finished draft into the official challenge template and preview before publishing. `docs/submission-checklist.md` tracks these remaining human steps.

These steps are the remaining external release verification. No Render account or deployment has been created by the local checks.

## Local container verification

```sh
docker build -t dead-air:beta .
npm run test:docker
# Includes all browser playthroughs; requires Playwright Chromium:
npm run test:docker:browser
```

The check creates and removes its own UUID-named container and volume, uses loopback port 3400, supplies no inference key, and saves a report under ignored `data/docker-smoke.json`. It verifies native SQLite writes, mounted-save restoration after restart, static assets, non-root runtime, absence of the build compiler and local environment file, and the temporary-save notice. The browser variant runs the same gameplay suite against that container rather than disturbing an existing development preview. Override `DOCKER_TEST_PORT` if port 3400 is occupied.

The mounted-volume test proves that SQLite works correctly when storage exists. It does not imply that Render's free filesystem is persistent. The compiled image includes Python/make/g++ only in the build stage; the runtime image has none of that toolchain.
