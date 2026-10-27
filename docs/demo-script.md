# A short recording walkthrough

Spoilers follow. Allow reading time for a complete episode; this compressed recording can be roughly 3–5 minutes. No timed performance claim has been measured.

1. Show the opening: company closed in 2019, one active connection. Start investigation. Point out Scripted fallback unless you actually configured live inference.
2. Inspect Queue. Note original 2019 timestamp beside simulated 2026 attempts. Open a delivery trace. Read “A delivery that succeeded” and “The missing return path.”
3. Optional mistake: restart the active worker once. Show two committed records and another failed ACK. The voice has not spoken again; the machine replayed it.
4. Read the old runbook. Pause delivery, enable idempotency, repair the ACK route, resume. Queue drains without a new duplicate. Existing duplicates remain.
5. Ask MORA to explain idempotency. Show its evidence citation and the actual provider label. Only claim live Gemma if a real call succeeded.
6. Open Archive. Read Elena’s correspondence and the manifest. MORA revises its interpretation. Read the optional kitchen transcript, then the final request.
7. Show both final choices and the export offered before shutdown. Confirm Preserve for one distinct ending; export its timeline. Replay and choose Silence to show the second final scene.

Terminal equivalent for the mechanical recovery:

```text
queue inspect
trace inspect TRC-0001
delivery pause
relay idempotency enable
relay ack-route repair
delivery resume
archive inspect
```

The manifest and final request still need to be opened in the Archive. At any time use help in the shell, the header help button, or MORA’s Explain this button. Reload mid-investigation and use Continue to demonstrate actual persistence.
