// Premmisus Sales Portal — Cron Alert Deduplication
// Watchdog uses this to suppress repeat alerts and trigger escalations.
//
// Flow per (job, reason) pair:
//   1. shouldSendAlert() — checks for an unresolved row within 12h.
//      Returns 'skip' | 'first' | 'escalate'.
//   2. recordAlert() — writes the row after the SMS goes out.
//   3. resolveAlerts() — called after every watchdog sweep; closes any open
//      alerts whose underlying cron has now had a fresh successful run.

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

const DEDUPE_WINDOW_HOURS = 12;
const ESCALATION_HOURS = 24;

export type AlertReason = 'no_recent_success' | 'stuck_running' | 'n8n_overdue';

export type AlertDecision =
  | { action: 'skip'; reason: string }
  | { action: 'first' }
  | { action: 'escalate'; openAlertId: string; ageHours: number };

type OpenAlert = {
  id: string;
  alerted_at: string;
  escalated: boolean;
};

async function sbGet(path: string): Promise<unknown[]> {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function sbWrite(
  path: string,
  method: 'POST' | 'PATCH',
  body: unknown,
): Promise<unknown[]> {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function shouldSendAlert(
  jobName: string,
  reason: AlertReason,
): Promise<AlertDecision> {
  const rows = (await sbGet(
    `cron_alerts?select=id,alerted_at,escalated&job_name=eq.${encodeURIComponent(jobName)}&alert_reason=eq.${reason}&resolved_at=is.null&order=alerted_at.desc&limit=1`,
  )) as OpenAlert[];

  if (rows.length === 0) {
    return { action: 'first' };
  }

  const open = rows[0];
  const ageHours = (Date.now() - new Date(open.alerted_at).getTime()) / 3_600_000;

  if (!open.escalated && ageHours >= ESCALATION_HOURS) {
    return { action: 'escalate', openAlertId: open.id, ageHours };
  }

  if (ageHours < DEDUPE_WINDOW_HOURS) {
    return { action: 'skip', reason: `Already alerted ${ageHours.toFixed(1)}h ago` };
  }

  // Already escalated and beyond dedupe window — stay quiet to avoid daily spam
  // on a long-running incident. Operator must resolve to re-arm.
  return { action: 'skip', reason: `Already escalated ${ageHours.toFixed(1)}h ago` };
}

export async function recordAlert(args: {
  jobName: string;
  reason: AlertReason;
  message: string;
  smsSid?: string | null;
  escalation?: { openAlertId: string };
}): Promise<void> {
  if (args.escalation) {
    await sbWrite(`cron_alerts?id=eq.${args.escalation.openAlertId}`, 'PATCH', {
      escalated: true,
      message: args.message,
      sms_sid: args.smsSid ?? null,
    });
    return;
  }
  await sbWrite('cron_alerts', 'POST', {
    job_name: args.jobName,
    alert_reason: args.reason,
    message: args.message,
    sms_sid: args.smsSid ?? null,
  });
}

// Mark any open alerts resolved for jobs whose latest run is success.
// Called once per watchdog sweep after detection.
export async function resolveAlertsForHealthyJobs(
  healthyJobNames: string[],
): Promise<number> {
  if (healthyJobNames.length === 0) return 0;
  const filter = `job_name=in.(${healthyJobNames.map(encodeURIComponent).join(',')})`;
  const rows = await sbWrite(
    `cron_alerts?${filter}&resolved_at=is.null`,
    'PATCH',
    { resolved_at: new Date().toISOString() },
  );
  return rows.length;
}

export const _alertConfig = {
  DEDUPE_WINDOW_HOURS,
  ESCALATION_HOURS,
};
