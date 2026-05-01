// Premmisus Sales Portal — n8n API client
// Thin wrapper for the watchdog to query last execution time of monitored
// Premmisus workflows. TraDelier workflows are explicitly excluded; this
// monitor only covers Premmisus business automation.

export type N8nWorkflowSpec = {
  id: string;
  name: string;
  expectedIntervalHours: number; // alert if last execution older than this
  weekdaysOnly: boolean;
};

export const MONITORED_N8N_WORKFLOWS: N8nWorkflowSpec[] = [
  {
    id: 'MdMpElcMI1D3u9ri',
    name: 'Premmisus Cold SMS — Daily Sender',
    expectedIntervalHours: 28, // daily on weekdays + weekend grace
    weekdaysOnly: true,
  },
  {
    id: 'dIrrgaU6pnxQPKbG',
    name: 'Premmisus Daily Email Outreach',
    expectedIntervalHours: 28,
    weekdaysOnly: true,
  },
];

export type N8nExecutionCheck = {
  spec: N8nWorkflowSpec;
  lastExecutionAt: Date | null;
  ageHours: number | null;
  overdue: boolean;
  detail: string;
};

const DEFAULT_BASE = 'https://elliott-premmisus.app.n8n.cloud';

type FetchOutcome =
  | { kind: 'ok'; startedAt: string; status: string }
  | { kind: 'no_key' }
  | { kind: 'no_data' };

async function fetchLatestExecution(workflowId: string): Promise<FetchOutcome> {
  const apiKey = process.env.N8N_API_KEY;
  const baseUrl = (process.env.N8N_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  if (!apiKey) return { kind: 'no_key' };
  try {
    const res = await fetch(
      `${baseUrl}/api/v1/executions?workflowId=${workflowId}&limit=1`,
      { headers: { 'X-N8N-API-KEY': apiKey, Accept: 'application/json' } },
    );
    if (!res.ok) return { kind: 'no_data' };
    const json = (await res.json()) as { data?: Array<{ startedAt: string; status: string }> };
    const exec = json.data?.[0];
    return exec ? { kind: 'ok', startedAt: exec.startedAt, status: exec.status } : { kind: 'no_data' };
  } catch {
    return { kind: 'no_data' };
  }
}

export async function checkMonitoredN8nWorkflows(now: Date = new Date()): Promise<N8nExecutionCheck[]> {
  const dayUTC = now.getUTCDay(); // 0=Sun, 6=Sat
  const isWeekend = dayUTC === 0 || dayUTC === 6;

  const results: N8nExecutionCheck[] = [];
  for (const spec of MONITORED_N8N_WORKFLOWS) {
    if (spec.weekdaysOnly && isWeekend) {
      results.push({
        spec,
        lastExecutionAt: null,
        ageHours: null,
        overdue: false,
        detail: 'Weekend — not expected to run',
      });
      continue;
    }

    const outcome = await fetchLatestExecution(spec.id);
    if (outcome.kind === 'no_key') {
      // n8n monitoring not configured in this Vercel project — silent skip
      // rather than false-positive alerts.
      results.push({
        spec,
        lastExecutionAt: null,
        ageHours: null,
        overdue: false,
        detail: 'n8n API key not configured — monitoring skipped',
      });
      continue;
    }
    if (outcome.kind === 'no_data') {
      // API responded but no executions exist (or transient error). Treat as
      // overdue so the operator notices, but with a clear detail string.
      results.push({
        spec,
        lastExecutionAt: null,
        ageHours: null,
        overdue: true,
        detail: 'No execution data returned from n8n API',
      });
      continue;
    }

    const startedAt = new Date(outcome.startedAt);
    const ageHours = (now.getTime() - startedAt.getTime()) / 3_600_000;
    const overdue = ageHours > spec.expectedIntervalHours;
    results.push({
      spec,
      lastExecutionAt: startedAt,
      ageHours,
      overdue,
      detail: overdue
        ? `Last run ${ageHours.toFixed(1)}h ago (expected within ${spec.expectedIntervalHours}h)`
        : `Last run ${ageHours.toFixed(1)}h ago`,
    });
  }
  return results;
}
