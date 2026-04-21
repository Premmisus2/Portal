// Premmisus Sales Portal — Cron Execution Tracker
// Wraps every scheduled job with a start/finish log in the cron_runs table.
// The cron-watchdog route reads this log to detect silent failures.

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

async function sbWrite(path: string, method: 'POST' | 'PATCH', body: unknown) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    try { return await res.json(); } catch { return null; }
  } catch { return null; }
}

export async function startRun(jobName: string): Promise<string | null> {
  const result = await sbWrite('cron_runs', 'POST', {
    job_name: jobName,
    status: 'running',
    started_at: new Date().toISOString(),
  });
  if (Array.isArray(result) && result[0]?.id) return result[0].id;
  return null;
}

type FinishMeta = {
  status?: 'success' | 'failure';
  rowsProcessed?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

export async function finishRun(runId: string | null, meta: FinishMeta = {}): Promise<void> {
  if (!runId) return;
  const body: Record<string, unknown> = {
    finished_at: new Date().toISOString(),
    status: meta.status || 'success',
  };
  if (meta.rowsProcessed !== undefined) body.rows_processed = meta.rowsProcessed;
  if (meta.errorMessage) body.error_message = meta.errorMessage.slice(0, 1000);
  if (meta.metadata) body.metadata = meta.metadata;
  await sbWrite(`cron_runs?id=eq.${runId}`, 'PATCH', body);
}
