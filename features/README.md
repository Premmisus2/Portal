# features/

Business logic modules for the Sales Floor build. Pure TypeScript — no React, no JSX.

## Why this exists

Logic was previously inline inside React components (CallLogger, LeadRow, QuickLogForm, etc.) which meant three components each had a slightly different version of "log a call." Touch-count math drifted. Legacy ColdCallView and the new `/floor` would have shipped diverging code paths.

Modules centralize business logic so:
- One source of truth per operation
- Both legacy + new UIs call the same function → audit_log + touch_count stay consistent
- When a bug surfaces, one place to fix it

Locked by 2026-05-19 audit Round 2 decision #8.

## Modules

| Module | Responsibility |
|---|---|
| `audit/` | Single point for `audit_log` writes. Wraps `lib/audit.ts` with a cleaner shape. |
| `leads/` | Call logging, status changes, timeline fetch. Drives the sheet view + drawer. |
| `messaging/` | SMS send. Thin client wrapper over `/api/send-sms`. |
| `reminders/` | Callback scheduling + notifications_queue. Ships in Slice 2 — placeholder for now. |

## Import pattern

Always use the barrel export:

```ts
import { logCall, getLeadTimeline } from '@/features/leads';
import { recordAuditEvent } from '@/features/audit';
import { sendSms } from '@/features/messaging';
```

Never import directly from a feature's internal files. Those are implementation details.

## Adding a new feature function

1. Write it in `features/<module>/<functionName>.ts`
2. Export from `features/<module>/index.ts`
3. The function should:
   - Be fully typed (inputs + outputs)
   - Throw on hard failure, return result on success
   - Call `recordAuditEvent` for any state change
   - Comment side effects in order at the top of the file
