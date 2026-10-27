import { NextResponse } from "next/server";
import { z } from "zod";
import { session, sameOrigin } from "@/lib/server/session";
import { askOperator } from "@/lib/ai/operator";
import { reserveAi, saveConversation } from "@/lib/db/store";
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const s = await session();
  if (!s)
    return NextResponse.json(
      { error: "Start an investigation first." },
      { status: 401 },
    );
  let question: string;
  try {
    question = z
      .object({ question: z.string().trim().min(1).max(1200) })
      .parse(await req.json()).question;
  } catch {
    return NextResponse.json(
      { error: "Use a question between 1 and 1200 characters." },
      { status: 400 },
    );
  }
  if (!reserveAi(s.id))
    return NextResponse.json(
      {
        error:
          "Operator request limit reached. Wait a moment, or continue using the runbook.",
      },
      { status: 429 },
    );
  const result = await askOperator(s.state, s.conversation, question);
  const assistant = {
    role: "assistant" as const,
    ...result.reply,
    mode: result.mode,
  };
  saveConversation(
    s.id,
    { role: "user", message: question },
    assistant,
    result.metadata,
  );
  return NextResponse.json({
    ...result,
    assistant,
    retry: result.metadata.fallbackReason !== null,
  });
}
