import { NextResponse } from "next/server";
import { session } from "@/lib/server/session";
import { invocations } from "@/lib/db/store";
export const runtime = "nodejs";
export async function GET() {
  if (process.env.DEV_DEMO_DEBUG !== "true")
    return new Response(null, { status: 404 });
  const s = await session();
  return s
    ? NextResponse.json({ invocations: invocations(s.id) })
    : new Response(null, { status: 401 });
}
