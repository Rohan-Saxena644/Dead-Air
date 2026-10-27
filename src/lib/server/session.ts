import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { createSession, getSession } from "../db/store";
export async function session() {
  const jar = await cookies();
  const id = jar.get("dead-air")?.value;
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return null;
  const saved = getSession(id);
  return saved ? { id, ...saved } : null;
}
export async function startSession() {
  const id = randomBytes(32).toString("hex");
  createSession(id);
  (await cookies()).set("dead-air", id, {
    httpOnly: true,
    sameSite: "strict",
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.APP_BASE_URL?.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return session();
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      (origin === process.env.APP_BASE_URL ||
        parsed.host === req.headers.get("host"))
    );
  } catch {
    return false;
  }
}
