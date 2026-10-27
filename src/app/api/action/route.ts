import { NextResponse } from "next/server";
import { z } from "zod";
import { session, sameOrigin } from "@/lib/server/session";
import { submitAction, Conflict } from "@/lib/db/store";
import { evidenceIds, type Action } from "@/lib/game/engine";
import { publicState } from "@/lib/server/projection";
export const runtime = "nodejs";
const actions = [
  "status",
  "logs",
  "queue",
  "message",
  "trace",
  "restart",
  "pause",
  "resume",
  "idempotency",
  "repair",
  "archive",
  "advance",
  "preserve",
  "silence",
  ...evidenceIds.flatMap((id) => [`read:${id}`, `pin:${id}`]),
];
const schema = z.object({
  action: z
    .string()
    .refine((a) => actions.includes(a) || /^trace:TRC-\d{4}$/.test(a)),
  actionId: z.string().uuid(),
  version: z.number().int().nonnegative(),
});
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const s = await session();
  if (!s)
    return NextResponse.json(
      { error: "Start an investigation first." },
      { status: 401 },
    );
  try {
    const body = schema.parse(await req.json());
    const next = submitAction(
      s.id,
      body.actionId,
      body.version,
      body.action as Action,
    );
    return NextResponse.json({ state: publicState(next.state) });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Action failed.",
        ...(e instanceof Conflict
          ? { state: publicState((await session())!.state) }
          : {}),
      },
      { status: e instanceof Conflict ? 409 : 400 },
    );
  }
}
