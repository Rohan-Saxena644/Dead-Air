import { NextResponse } from "next/server";
import { z } from "zod";
import { session, sameOrigin } from "@/lib/server/session";
import { askOperator, scriptedReply } from "@/lib/ai/operator";
import { releaseAi, reserveAi, saveConversation } from "@/lib/db/store";
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
  const reserved = reserveAi(s.id);
  const result = reserved
    ? await (async () => {
        try {
          return await askOperator(s.state, s.conversation, question);
        } finally {
          releaseAi(s.id);
        }
      })()
    : {
        reply: scriptedReply(s.state, question, s.conversation),
        mode: "Scripted fallback",
        metadata: {
          stateVersion: s.state.version,
          fallbackReason: "Operator busy or usage limit reached.",
          validation: "scripted",
        },
      };
  const assistant = {
    role: "assistant" as const,
    ...result.reply,
    mode: result.mode,
    stateVersion: s.state.version,
  };
  saveConversation(
    s.id,
    { role: "user", message: question },
    assistant,
    result.metadata,
  );
  return NextResponse.json({
    reply: result.reply,
    mode: result.mode,
    assistant,
    retry: result.metadata.fallbackReason !== null,
  });
}
