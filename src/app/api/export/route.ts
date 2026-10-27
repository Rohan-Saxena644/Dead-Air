import { NextResponse } from "next/server";
import { session } from "@/lib/server/session";
import { publicState } from "@/lib/server/projection";
export const runtime = "nodejs";
export async function GET() {
  const s = await session();
  if (!s)
    return NextResponse.json({ error: "No investigation." }, { status: 401 });
  return new Response(
    JSON.stringify(
      {
        title: "DEAD AIR / The Last Acknowledgement",
        fictional: true,
        ...publicState(s.state),
        conversation: s.conversation,
      },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition":
          'attachment; filename="dead-air-investigation.json"',
        "Cache-Control": "no-store",
      },
    },
  );
}
