// Premmisus Sales Portal — n8n API client
// Thin wrapper for the watchdog to detect three failure modes per monitored
// workflow: (1) didn't run on schedule, (2) ran but errored, (3) stuck in
// 'running' for too long. TraDelier workflows are explicitly excluded.

export type N8nWorkflowSpec = {
  id: string;
  name: string;
  expectedIntervalHours: number; // alert if last execution older than this
  weekdaysOnly: boolean;
  // Paused workflows are kept in the monitored list so the Cron Health page
  // can render them with a clear "paused" tile (instead of disappearing).
  // The watchdog skips API checks + skips alerting on them. To resume:
  // set paused=false and reactivate the workflow in n8n.
  paused?: boolean;
  pauseReason?: string;
};

export const MONITORED_N8N_WORKFLOWS: N8nWorkflowSpec[] = [
  {
    id: 'MdMpElcMI1D3u9ri',
    name: 'Premmisus Cold SMS — Daily Sender',
    expectedIntervalHours: 28,
    weekdaysOnly: true,
    paused: true,
    pauseReason: 'Twilio A2P 10DLC registration pending',
  },
  {
    id: 'dIrrgaU6pnxQPKbG',
    name: 'Premmisus Daily Email Outreach',
    expectedIntervalHours: 28,
    weekdaysOnly: true,
    paused: true,
    pauseReason: 'Twilio A2P 10DLC registration pending',
  },
];

// Threshold for stuck-running detection. n8n executions usually finish in
// seconds; 1h is a generous ceiling that catches genuinely hung workflows
// without false-flagging long-running batch jobs.
const STUCK_RUNNING_THRESHOLD_HOURS = 1;

export type N8nExecutionCheck = {
  spec: N8nWorkflowSpec;
  lastExecutionAt: Date | null;
  ageHours: number | null;
  lastStatus: string | null;
  overdue: boolean;
  errored: boolean;
  stuck: boolean;
  paused: boolean;
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

function emptyCheck(spec: N8nWorkflowSpec, detail: string, overdue = false, paused = false): N8nExecutionCheck {
  return {
    spec,
    lastExecutionAt: null,
    ageHours: null,
    lastStatus: null,
    overdue,
    errored: false,
    stuck: false,
    paused,
    detail,
  };
}

export async function checkMonitoredN8nWorkflows(now: Date = new Date()): Promise<N8nExecutionCheck[]> {
  const dayUTC = now.getUTCDay();
  const isWeekend = dayUTC === 0 || dayUTC === 6;

  const results: N8nExecutionCheck[] = [];
  for (const spec of MONITORED_N8N_WORKFLOWS) {
    if (spec.paused) {
      // Paused workflows still appear on the Cron Health page (so it's
      // visually obvious they're intentionally off, not silently broken),
      // but no API call is made and no alert is raised.
      results.push(
        emptyCheck(spec, `Paused — ${spec.pauseReason ?? 'no reason given'}`, false, true),
      );
      continue;
    }
    if (spec.weekdaysOnly && isWeekend) {
      results.push(emptyCheck(spec, 'Weekend — not expected to run'));
      continue;
    }

    const outcome = await fetchLatestExecution(spec.id);
    if (outcome.kind === 'no_key') {
      // Monitoring not configured in this env — silent skip (no false alert).
      results.push(emptyCheck(spec, 'n8n API key not configured — monitoring skipped'));
      continue;
    }
    if (outcome.kind === 'no_data') {
      results.push(emptyCheck(spec, 'No execution data returned from n8n API', true));
      continue;
    }

    const startedAt = new Date(outcome.startedAt);
    const ageHours = (now.getTime() - startedAt.getTime()) / 3_600_000;
    const status = outcome.status;

    // Status taxonomy from n8n: success | error | crashed | running | waiting.
    // 'running' beyond the stuck threshold signals a hung workflow.
    const stuck = status === 'running' && ageHours > STUCK_RUNNING_THRESHOLD_HOURS;
    // 'error' or 'crashed' on the latest execution = a real failure, even if
    // the workflow fired on schedule. The original watchdog only checked age,
    // letting these slip through.
    const errored = status === 'error' || status === 'crashed';
    const overdue = ageHours > spec.expectedIntervalHours;

    let detail = `Last run ${ageHours.toFixed(1)}h ago · status=${status}`;
    if (stuck) detail = `Stuck running for ${ageHours.toFixed(1)}h (threshold ${STUCK_RUNNING_THRESHOLD_HOURS}h)`;
    else if (errored) detail = `Last execution ${ageHours.toFixed(1)}h ago FAILED (status=${status})`;
    else if (overdue) detail = `Last run ${ageHours.toFixed(1)}h ago (expected within ${spec.expectedIntervalHours}h)`;

    results.push({
      spec,
      lastExecutionAt: startedAt,
      ageHours,
      lastStatus: status,
      overdue,
      errored,
      stuck,
      paused: false,
      detail,
    });
  }
  return results;
}
