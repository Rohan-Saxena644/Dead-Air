# DEAD AIR — complete walkthrough

**Spoilers.** The actual 2:56 captioned video is `artifacts/demo/dead-air-demo.webm`. It shows one full fresh investigation through the organized Preserve variation and then a clean replay. Other variations share the same central mystery.

1. Start an investigation. You are the incoming archive operator. Read the old message, then inspect the message or queue. Its origin is 2019; current delivery attempts are later.
2. Follow a delivery trace. VAULT committed a record before RELAY failed to receive its receipt. A restart is optional: while delivery is active it causes another attempt, and without idempotency another stored record. It does not fix the return path.
3. Pause delivery to contain retries without deleting anything. Ask MORA to compare a failed write with a failed confirmation. Live mode uses Google; clearly labeled scripted fallback also works. Ask again for an evidence pointer, or explicitly request exact repair steps.
4. Read **When a receipt never arrives** in recovered evidence. Enable **Idempotency**, repair the **ACK route**, then **Resume delivery**. Check the feedback: one attempt, zero added records, empty queue, healthy acknowledgement route. Earlier duplicate records remain historical evidence. Repair-first play is also recoverable; enable idempotency before the final choice.
5. Open VAULT / Archive. Read **An inventory of ordinary things**, then **Until someone can take over**. The manifest identifies an old family recording, and Elena's request is about preservation. MORA's interpretation changes. Both main endings require resolving delivery and reading that final request.
6. Optional: open **Read custody comparison** beneath the console. Compare the manifest's speaker/depositor distinction with the unsigned replacement label. Using the delivery account as the speaker fails verification and supplies corrective feedback; required clues remain accessible. Credit the original speaker and depositor, then choose **Prepare verified handover index**. Alternatively leave uncertain attribution sealed. You can revisit the choice before ending.
7. Choose **Preserve archive** or **Finish shutdown**, read the consequence preview, then confirm. Preparation is a canonical game flag, not evidence of downloading audio or another custodian accepting anything. The investigation remains exportable after either ending.

| Final choice | Custody decision                            | Outcome                      |
| ------------ | ------------------------------------------- | ---------------------------- |
| Preserve     | Verified index prepared                     | A place for what remains.    |
| Preserve     | No prepared index / attribution kept sealed | The box without a new label. |
| Silence      | Verified index prepared                     | An address for the morning.  |
| Silence      | No prepared index                           | Nothing left waiting.        |

The ending explains your actual choices and retained records. **Replay episode** starts a new server session. Completion badges stay in the same browser when local storage works; they unlock nothing. Free Render saves are temporary, and an investigation JSON export cannot restore playable progress.
