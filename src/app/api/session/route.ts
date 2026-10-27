import { NextResponse } from "next/server";
import { startSession, session, sameOrigin } from "@/lib/server/session";
import { publicState } from "@/lib/server/projection";
import { configuredMode } from "@/lib/ai/operator";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await session();
  return NextResponse.json(
    s
      ? {
          state: publicState(s.state),
          conversation: s.conversation,
          mode: configuredMode(),
        }
      : { state: null },
  );
}
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const s = await startSession();
  return NextResponse.json({
    state: publicState(s!.state),
    conversation: [],
    mode: configuredMode(),
  });
}
