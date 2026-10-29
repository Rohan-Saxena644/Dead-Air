# Free public beta on Render

The root `render.yaml` prepares one **free** Docker web service, with no persistent disk or paid database. Automatic deploys are disabled so releases can be triggered deliberately. It has not created a Render service yet.

## Prepared configuration

| Setting | Value |
| --- | --- |
| Runtime | Docker / one Node process |
| Plan | Free |
| Health endpoint | `/api/health` |
| Port | `10000`, bound to `0.0.0.0` |
| Database | `/app/data/dead-air.sqlite` |
| Save disclosure | `SAVE_STORAGE=ephemeral` |
| Live provider | Google AI Studio / `gemma-4-26b-a4b-it` |
| Google key | Secret environment variable supplied during setup |
| Debug endpoint | Disabled |

The UI discloses temporary saves before starting, during play, and at the ending. Export is available during an investigation and after completion. Render's [free services cannot attach persistent disks](https://render.com/docs/free), and their files can be lost on restart/redeploy. This is a demo, not durable hosted storage. Free services can also spin down after 15 minutes without incoming traffic, so the first visit after inactivity may take longer.

## Publish

1. Add/connect the Render integration and authorize the GitHub repository, or import this repository as a Blueprint in your Render dashboard. The tested deployment changes must be pushed to the selected branch first.
2. Review that the service plan is **Free**, with no disk or other paid resource. The Blueprint itself requests only that free web service.
3. Set `GEMINI_API_KEY` in Render's secret environment field. Do not upload `.env.local`; it is excluded from Git and Docker. The app remains playable with labeled scripted fallback if the key is absent or the Google quota is exhausted.
4. Create/deploy the service. Render supplies `RENDER_EXTERNAL_URL`; the app uses that HTTPS origin for secure session cookies. A custom domain can override this with `APP_BASE_URL`. Do not set `APP_BASE_URL` to localhost on the hosted service.
5. On the returned URL, verify health, opening notice, start/reload, a real MORA reply, and one complete ending. Confirm the Google mode reflects the actual reply, then share the URL as a public beta.

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
