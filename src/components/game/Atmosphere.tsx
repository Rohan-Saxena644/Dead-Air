"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AudioLines, Volume2, VolumeX, Accessibility, X } from "lucide-react";
const Settings = createContext<{
  muted: boolean;
  volume: number;
  comfort: boolean;
  setVolume: (v: number) => void;
  setComfort: (v: boolean) => void;
  toggleAudio: () => Promise<void>;
  playClick: () => void;
} | null>(null);
export function ComfortProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.15);
  const [comfort, setComfort] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  useEffect(() => {
    document.documentElement.dataset.comfort = comfort ? "true" : "false";
  }, [comfort]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (gain.current && audio.current)
      gain.current.gain.setTargetAtTime(
        muted ? 0 : volume * 0.12,
        audio.current.currentTime,
        0.2,
      );
  }, [muted, volume]);
  const playClick = useCallback(() => {
    if (muted || !audio.current || !gain.current) return;
    const ctx = audio.current;
    const click = ctx.createOscillator();
    const envelope = ctx.createGain();
    click.type = "sine";
    click.frequency.value = 640;
    envelope.gain.setValueAtTime(volume * 0.025, ctx.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    click.connect(envelope);
    envelope.connect(ctx.destination);
    click.start();
    click.stop(ctx.currentTime + 0.09);
  }, [muted, volume]);
  async function toggleAudio() {
    if (!audio.current) {
      const ctx = new AudioContext();
      audio.current = ctx;
      gain.current = ctx.createGain();
      gain.current.gain.value = 0;
      gain.current.connect(ctx.destination);
      for (const f of [55, 110]) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        osc.connect(gain.current);
        osc.start();
      }
    }
    await audio.current.resume();
    setMuted((v) => !v);
  }
  return (
    <Settings.Provider
      value={{
        muted,
        volume,
        comfort,
        setVolume,
        setComfort,
        toggleAudio,
        playClick,
      }}
    >
      {children}
    </Settings.Provider>
  );
}
export function Comfort({ eventCount = 0 }: { eventCount?: number }) {
  const [open, setOpen] = useState(false);
  const settings = useContext(Settings);
  const playClick = settings?.playClick;
  useEffect(() => {
    if (eventCount > 0) playClick?.();
  }, [eventCount, playClick]);
  if (!settings)
    throw new Error("Comfort controls need their settings provider.");
  const { muted, volume, comfort, setVolume, setComfort, toggleAudio } =
    settings;
  return (
    <div className="comfort">
      <button
        className="icon-button"
        onClick={() => void toggleAudio()}
        aria-label={muted ? "Enable audio" : "Mute audio"}
        title={muted ? "Sound off" : "Sound on"}
      >
        {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>
      <button
        className="icon-button"
        onClick={() => setOpen(!open)}
        aria-label="Accessibility and comfort"
        aria-expanded={open}
      >
        <Accessibility size={17} />
      </button>
      {open && (
        <div className="comfort-pop">
          <div className="row between">
            <strong>Comfort controls</strong>
            <button
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label="Close comfort controls"
            >
              <X size={15} />
            </button>
          </div>
          <label>
            <input
              type="checkbox"
              checked={comfort}
              onChange={(e) => setComfort(e.target.checked)}
            />{" "}
            Disable interference & motion
          </label>
          <label>
            <AudioLines size={15} /> Volume{" "}
            <input
              aria-label="Ambience volume"
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
          <p>
            Sound is optional. All clues are available as text. Reduced-motion
            settings are respected.
          </p>
        </div>
      )}
    </div>
  );
}
