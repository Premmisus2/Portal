// Reminders module — Slice 2 placeholder.
//
// Callback scheduling + SMS reminder timing lives here. Schema is already in
// production (callback_tasks, notifications_queue per 2026-05-21 migrations).
// Functions to add in Slice 2:
//
//   - scheduleCallback({ leadId, repId, scheduledLocalTime, scheduledTz, ... })
//     Inserts callback_tasks row + 3 notifications_queue rows (T-60, T-30, T-10)
//     in a single transaction. Also writes audit_log via recordAuditEvent.
//
//   - cancelCallback({ callbackTaskId })
//     Flips callback_tasks.status='cancelled' + flips pending queue rows
//     to status='cancelled' in single transaction.
//
//   - rescheduleCallback({ callbackTaskId, newScheduledLocalTime })
//     Update + cancel-and-reinsert queue rows + audit_log.
//
// See /Mafia/handoff/2026-05-19-prompt-sales-floor.md Slice 2 spec for the
// full flow + the worker cron design that drains notifications_queue.

export const SLICE_2_PLACEHOLDER = 'reminders module ships in Slice 2';
