# Ghost in the Machine — factual submission material

This is preparation material, not a published DEV post. Challenge eligibility, deadlines, judging rules, and partner credit requirements have not been independently verified.

## Interpretation

The ghost is an unresolved obligation kept alive by a failed acknowledgement. A sentence sounds like a person trapped in a machine; its origin is a mundane, affectionate recording. The machine did not become human. It kept doing a job after its humans left. The two endings honor different ways of finishing that job.

## Actual technologies

Next.js App Router, React, strict TypeScript, Tailwind CSS with custom authored console styling, Lucide SVG icons, Zod, better-sqlite3 and versioned SQL, Vitest, and Playwright. Optional Web Audio synthesizes a hum and small event tones locally. No separate backend or real microservices. OpenRouter and local Ollama adapters support configurable Gemma models; scripted operator is the credential-free mode. Sentry is not integrated.

Gemma is open-weight; its model terms apply. Source prompts, the knowledge projection, and all tools are inspectable. The inference adapter can be replaced. Hosted inference sends context to a remote provider; local inference is optional and not verified on this machine. No claim of free inference or universal privacy is made.

## Technical discoveries and tradeoffs

- Delivery succeeded before confirmation failed: an error does not imply rollback. The implementation preserves that distinction in attempt records and UI history.
- A restart can worsen a data problem by retrying a non-idempotent write. Pausing matters; it is not merely a visual status.
- Idempotency and acknowledgement repair solve different problems. Neither deletes earlier duplicates. The episode remains solvable without making a mistake first.
- The engine owns narrative unlocks. Model tool access is restricted to player-visible knowledge and cannot unlock an ending or execute an action.
- A JSON protocol works without assuming native tool or schema support for every hosted Gemma route. Validation and bounded repair are necessary, but factual faithfulness still needs live review.
- SQLite is deliberately single-instance. A persistent mount is required for durable hosted saves; an ephemeral demo must disclose reset behavior.

## Unverified

No external deployment, judge response, testimonials, live Gemma calls, token/cost measurements, play-time study, Sentry spans, or benchmark comparisons. Actual local check results and captures are recorded separately in `verification.md` after execution.
