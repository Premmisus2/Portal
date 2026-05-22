# Event Taxonomy — Premmisus Sales Portal

**Version: 1 (2026-05-21)**
**Owner: rep cockpit build (Slice 1)**
**Locked by: 4-prong audit 2026-05-20 (Gemini, Perplexity, OpenAI, Grok)**

This file is the canonical definition of what counts as a "touch" and a "connect" in the Premmisus Sales Portal. Triggers, dashboards, daily summaries, the Telegram digest, and the "Next Action" sort all key off these definitions. Versioning matters: if you change the meaning, bump the version and migrate the trigger SQL — never silently redefine.

Reason this exists: Perplexity's load-bearing catch from the 2026-05-20 Slice 1 audit. Without a versioned canonical definition, three months from now the daily-summary cron, Elliott's director dashboard, and Isaiah's cockpit will all compute touches differently, reps will lose trust in the counters, and the cockpit's organizing principle ("sort by Next Action") will quietly rot.

---

## Touch (v1)

A **touch** is a rep-driven attempt to engage with a lead. One row per touch. Maintained by Postgres triggers on `call_logs` INSERT and `sms_messages` INSERT.

A row qualifies as a touch when ALL of these are true:

1. The originating action is recorded in `call_logs` OR `sms_messages`.
2. `rep_id IS NOT NULL` on that row.
3. `lead_id IS NOT NULL` on that row.
4. For `sms_messages` specifically: `direction = 'outbound'`.

A row does NOT count as a touch when:

- `outcome = 'ai_receptionist'` on a call_log (Sarah handled it; no rep effort).
- `rep_id IS NULL` (system event, STOP/HELP autoresponder, anonymous inbound).
- `lead_id IS NULL` (inbound from unknown number; the lead row doesn't exist).
- `sms_messages.direction = 'inbound'` (the rep didn't reach out — the lead did).
- View events (drawer-open, row-click, deep-link visit). These are UI telemetry, not touches.

Stored in: `public.leads.touch_count` (int), `public.leads.last_touch_at` (timestamptz).

---

## Connect (v1)

A **connect** is a touch where a live conversation happened. Strict subset of touches. Drives the "Nth call / Mth connect" banner in the drawer and powers rep-performance dashboards.

A row qualifies as a connect when ALL of these are true:

1. The row is already counted as a touch (per above).
2. It is a `call_logs` row (SMS sends are touches but NOT connects).
3. `outcome IN ('callback_requested', 'not_interested', 'booked_call', 'discovery_completed', 'inbound_callback')`.

A row does NOT count as a connect when:

- `outcome IN ('no_answer', 'voicemail_left', 'wrong_number', 'no_show')`. No live conversation occurred.
- `outcome = 'ai_receptionist'`. Already excluded from touches.

Stored in: `public.leads.connect_count` (int).

---

## Outcome-by-outcome reference

| `call_logs.outcome` | Counts as touch? | Counts as connect? | Reasoning |
|---|---|---|---|
| `no_answer` | ✅ yes | ❌ no | Rep dialed; lead unreachable. |
| `voicemail_left` | ✅ yes | ❌ no | Rep dialed; no live conversation. |
| `wrong_number` | ✅ yes | ❌ no | Lead unreachable at this number. |
| `callback_requested` | ✅ yes | ✅ yes | Lead asked rep to call back later. |
| `not_interested` | ✅ yes | ✅ yes | Lead engaged, declined offer. |
| `booked_call` | ✅ yes | ✅ yes | Discovery scheduled on this call. |
| `discovery_completed` | ✅ yes | ✅ yes | Discovery happened. |
| `no_show` | ✅ yes | ❌ no | Discovery booked but lead didn't appear. Touch (rep attempted), not connect (no conversation this row). |
| `inbound_callback` | ✅ yes | ✅ yes | Lead called rep back; bridge connected. |
| `ai_receptionist` | ❌ no | ❌ no | Sarah solo; no rep effort. |

For `sms_messages`:

| `direction` | `rep_id` | Counts as touch? |
|---|---|---|
| `outbound` | not null | ✅ yes |
| `outbound` | null (auto STOP/HELP reply) | ❌ no |
| `inbound` | any | ❌ no |

---

## Change log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-21 | Slice 1 build | Initial taxonomy locked by 4-prong audit. See `/Mafia/handoff/2026-05-19-prompt-sales-portal-rep-cockpit.md` Slice 1 Pre-Audit Verdict. |

**Bumping the version:** if the definition of touch or connect changes (e.g. inbound replies start counting as touches, or `no_show` gets reclassified), bump to v2 here and ship a new migration that drops + recreates the trigger functions with the updated logic. Run a backfill in the same migration. Never silently change the trigger.
