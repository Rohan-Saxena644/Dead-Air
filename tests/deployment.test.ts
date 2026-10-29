import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  appBaseUrl,
  saveNotice,
  secureSessionCookie,
} from "../src/lib/server/deployment";
afterEach(() => vi.unstubAllEnvs());
describe("public beta configuration", () => {
  it("uses Render HTTPS for secure cookies when no custom URL is configured", () => {
    vi.stubEnv("APP_BASE_URL", "");
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://dead-air-beta.onrender.com/");
    vi.stubEnv("NODE_ENV", "production");
    expect(appBaseUrl()).toBe("https://dead-air-beta.onrender.com");
    expect(secureSessionCookie()).toBe(true);
  });
  it("prefers an explicit custom domain and supports local HTTP testing", () => {
    vi.stubEnv("APP_BASE_URL", "https://game.example/");
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://dead-air-beta.onrender.com");
    vi.stubEnv("NODE_ENV", "production");
    expect(appBaseUrl()).toBe("https://game.example");
    vi.stubEnv("APP_BASE_URL", "http://127.0.0.1:3400");
    expect(secureSessionCookie()).toBe(false);
  });
  it("discloses resettable storage only for an ephemeral deployment", () => {
    vi.stubEnv("SAVE_STORAGE", "ephemeral");
    expect(saveNotice()).toMatch(/saves are temporary.*reset/i);
    vi.stubEnv("SAVE_STORAGE", "local");
    expect(saveNotice()).toBeNull();
  });
});
