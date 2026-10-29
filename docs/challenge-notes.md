# Ghost in the Machine — factual submission material

This is preparation material, not a published DEV post. Challenge eligibility, deadlines, judging rules, and partner credit requirements have not been independently verified.

## Interpretation

The ghost is an unresolved obligation kept alive by a failed acknowledgement. A sentence sounds like a person trapped in a machine; its origin is a mundane, affectionate recording. The machine did not become human. It kept doing a job after its humans left. The two endings honor different ways of finishing that job.

## Actual technologies

Next.js App Router, React, strict TypeScript, Tailwind CSS with custom authored console styling, Lucide SVG icons, Zod, better-sqlite3 and versioned SQL, Vitest, and Playwright. Optional Web Audio synthesizes a hum and small event tones locally. No separate backend or real microservices. A Google AI Studio adapter serves configurable Gemma 4 models; scripted operator is the credential-free mode. Google is the only live provider. Sentry is not integrated.

Gemma 4 is open-weight and its official model card specifies Apache 2.0. Source prompts, the knowledge projection, and all tools are inspectable. The inference adapter can be replaced. Hosted inference sends discovered context to Google. Local inference is not integrated. No claim of free inference or universal privacy is made.

## Technical discoveries and tradeoffs

- Delivery succeeded before confirmation failed: an error does not imply rollback. The implementation preserves that distinction in attempt records and UI history.
- A restart can worsen a data problem by retrying a non-idempotent write. Pausing matters; it is not merely a visual status.
- Idempotency and acknowledgement repair solve different problems. Neither deletes earlier duplicates. The episode remains solvable without making a mistake first.
- The engine owns narrative unlocks. Model tool access is restricted to player-visible knowledge and cannot unlock an ending or execute an action.
- A JSON protocol works without assuming native tool or schema support for every hosted Gemma route. Validation and bounded repair are necessary, but factual faithfulness still needs live review.
- SQLite is deliberately single-instance. A persistent mount is required for durable hosted saves. The selected free beta uses an ephemeral filesystem and displays a save-reset notice; its Blueprint declares no paid disk.

## Unverified

No external deployment, judge response, testimonials, cost measurements, play-time study, Sentry spans, or benchmark comparisons. Live Gemma responses and provider-reported token counts are recorded in the explicit Google evaluation; these are a small verification sample, not a quality benchmark. Actual local check results and captures are recorded separately in `verification.md` after execution.
