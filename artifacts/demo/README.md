# Actual gameplay recording

`dead-air-demo.webm` is the real 1920×1080 browser recording, with concise captions and a visible pointer overlay. It is silent: Playwright records the browser’s video, not its sound. No dialogue or simulator state was fabricated, and no model waiting time was cut. `operator-record.json` retains the actual fictional question, response, and visible provider label from this recording.

`captions.srt` and `transcript.md` match the recorded presentation captions. `youtube.md` contains the upload title, description, and chapters. The video has not been uploaded.

Reproduce from the repository root after moving the previous output aside:

```powershell
npm.cmd run build
node scripts/record-demo.mjs
node scripts/inspect-demo.mjs
```

The script starts and stops its own production server on loopback port 3502, with a fresh temporary SQLite database and browser context. It uses the existing Google configuration; a provider failure remains visibly labeled Scripted fallback. The existing application reads the key from local environment configuration without logging it. The script never records an editor, terminal, or personal browser session. It also captures the actual opening, investigation, and ending screenshots in `docs/screenshots/submission-*.png`.

The verified recording is **2:56.4**, **1920×1080**, **VP9 at 25 fps**, and **32,540,771 bytes**. The inspection script extracts representative frames and aligns the external SRT subtitle track with the completed media clock; it does not cut or alter the footage.

The installed Playwright FFmpeg build has PNG and VP9 encoders but no H.264 encoder, so MP4 conversion is unavailable here. The actual WebM is retained. With a full FFmpeg installation, this exact command produces a compatible H.264 MP4:

```powershell
ffmpeg -i artifacts/demo/dead-air-demo.webm -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -movflags +faststart artifacts/demo/dead-air-demo.mp4
```

Alternatively, set `FFMPEG_PATH` to a full FFmpeg executable before recording; the script attempts that conversion automatically. `properties.json` records the inspected file properties and local conversion limitation.
