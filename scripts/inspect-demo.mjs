import { spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
const directory = resolve("artifacts/demo");
const input = join(directory, "dead-air-demo.webm");
const cache = join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
const bundled = existsSync(cache)
  ? readdirSync(cache)
      .filter((name) => name.startsWith("ffmpeg-"))
      .sort()
      .reverse()
      .map((name) => join(cache, name, "ffmpeg-win64.exe"))
      .find(existsSync)
  : undefined;
const ffmpeg = process.env.FFMPEG_PATH || bundled || "ffmpeg";
const info = spawnSync(ffmpeg, ["-hide_banner", "-i", input], {
  encoding: "utf8",
  windowsHide: true,
});
if (info.error) throw info.error;
const duration = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(info.stderr);
const stream = info.stderr.split("\n").find((line) => line.includes("Video:"));
const size = /(\d{3,5})x(\d{3,5})/.exec(stream ?? "");
const codec = /Video: ([^, ]+)/.exec(stream ?? "")?.[1];
if (!duration || !size || !codec)
  throw new Error(`Cannot verify video properties: ${info.stderr}`);
const seconds =
  Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
if (
  seconds < 120 ||
  seconds > 180 ||
  Number(size[1]) !== 1920 ||
  Number(size[2]) !== 1080
)
  throw new Error("Video does not meet the requested duration/resolution.");
// Align external subtitles to the recorder's first captured frame, without editing footage.
const timingPath = join(directory, "caption-timing.json");
if (!existsSync(timingPath)) {
  const blocks = readFileSync(join(directory, "captions.srt"), "utf8")
    .trim()
    .split(/\r?\n\r?\n/);
  const parse = (stamp) => {
    const [h, m, s] = stamp.replace(",", ".").split(":").map(Number);
    return h * 3600 + m * 60 + s;
  };
  const captions = blocks.map((block) => {
    const [, range, ...text] = block.split(/\r?\n/);
    return { start: parse(range.split(" --> ")[0]), text: text.join("\n") };
  });
  const range = blocks.at(-1).split(/\r?\n/)[1];
  writeFileSync(
    timingPath,
    JSON.stringify({ end: parse(range.split(" --> ")[1]), captions }, null, 2),
  );
}
const timing = JSON.parse(readFileSync(timingPath, "utf8"));
const subtitleOffsetSeconds = Math.max(0, timing.end - seconds);
const aligned = timing.captions.map((caption) => ({
  ...caption,
  start: Math.max(0, caption.start - subtitleOffsetSeconds),
}));
const stamp = (value, separator = ",") => {
  const ms = Math.round(value * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${separator}${String(ms % 1000).padStart(3, "0")}`;
};
writeFileSync(
  join(directory, "captions.srt"),
  aligned
    .map(
      (caption, i) =>
        `${i + 1}\n${stamp(caption.start)} --> ${stamp(aligned[i + 1]?.start ?? seconds)}\n${caption.text}\n`,
    )
    .join("\n"),
);
const mode = JSON.parse(
  readFileSync(join(directory, "operator-record.json"), "utf8"),
).mode;
writeFileSync(
  join(directory, "transcript.md"),
  `# DEAD AIR — actual gameplay captions\n\nSilent browser recording; no fabricated dialogue or gameplay. Actual operator mode: ${mode}. No waiting time was cut. Timestamps use the completed video's media clock.\n\n` +
    aligned
      .map((caption) => `- ${stamp(caption.start, ".")} — ${caption.text}`)
      .join("\n") +
    "\n",
);
const encoders = spawnSync(ffmpeg, ["-hide_banner", "-encoders"], {
  encoding: "utf8",
  windowsHide: true,
});
const hasH264Encoder = /\blibx264\b/.test(encoders.stdout);
const frames = [
  [5, "preview-opening.png"],
  [70, "preview-investigation.png"],
  [108, "preview-recovery.png"],
  [158, "preview-outcome.png"],
];
for (const [time, name] of frames) {
  const extracted = spawnSync(
    ffmpeg,
    [
      "-y",
      "-hide_banner",
      "-ss",
      String(time),
      "-i",
      input,
      "-frames:v",
      "1",
      join(directory, name),
    ],
    { encoding: "utf8", windowsHide: true },
  );
  if (extracted.status !== 0)
    throw new Error(`Frame extraction failed: ${extracted.stderr}`);
}
const properties = {
  file: "dead-air-demo.webm",
  durationSeconds: seconds,
  width: Number(size[1]),
  height: Number(size[2]),
  codec,
  bytes: statSync(input).size,
  audio: "Silent browser recording",
  source:
    "Actual Playwright production gameplay; no cuts or reconstructed responses",
  hasH264Encoder,
  subtitleOffsetSeconds,
  conversion: hasH264Encoder
    ? "Full H.264 encoder available"
    : "Installed FFmpeg has no H.264 encoder; original WebM retained",
  inspectedFrames: frames.map(([seconds, file]) => ({ seconds, file })),
  stream: stream.trim(),
};
writeFileSync(
  join(directory, "properties.json"),
  JSON.stringify(properties, null, 2) + "\n",
);
console.log(JSON.stringify(properties, null, 2));
