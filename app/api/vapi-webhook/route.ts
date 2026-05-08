// Vapi end-of-call webhook.
// Receives end-of-call-report after every Sarah conversation.
// Logs the call to Supabase + Telegrams a summary to Elliott.

import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

type VapiWebhookBody = {
  message?: {
    type?: string;
    endedReason?: string;
    durationSeconds?: number;
    summary?: string;
    transcript?: string;
    recordingUrl?: string;
    cost?: number;
    call?: {
      id?: string;
      customer?: { number?: string; name?: string };
      assistantOverrides?: { variableValues?: Record<string, string> };
    };
    analysis?: { summary?: string; structuredData?: Record<string, unknown>; successEvaluation?: string };
  };
};

export async function POST(req: Request) {
  // Vapi signs webhooks with a secret too — same env var pattern
  const expected = (process.env.VAPI_WEBHOOK_SECRET || process.env.VAPI_TOOL_SECRET || '').trim();
  const got = (req.headers.get('x-vapi-secret') || '').trim();
  if (expected && got !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as VapiWebhookBody;
  const m = body.message || {};

  // Only act on end-of-call reports — ignore status/tool-call messages
  if (m.type !== 'end-of-call-report') {
    return NextResponse.json({ ok: true, ignored: m.type });
  }

  const SB_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const TELEGRAM_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const TELEGRAM_CHAT = (process.env.TELEGRAM_CHAT_ID || '').trim();

  const callerPhone = m.call?.customer?.number || '';
  const variables = m.call?.assistantOverrides?.variableValues || {};
  const businessName = (variables as Record<string, string>).businessName || m.call?.customer?.name || 'Unknown';
  const leadId = (variables as Record<string, string>).leadId || null;
  const summary = m.analysis?.summary || m.summary || '(no summary)';
  const transcript = m.transcript || '';
  const success = m.analysis?.successEvaluation || 'unknown';
  const durationSec = m.durationSeconds || 0;
  const cost = m.cost || 0;

  // 1. Log to Supabase call_logs
  if (SB_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          rep_id: null,
          outcome: 'ai_receptionist',
          call_type: 'inbound_sarah',
          call_sid: m.call?.id || null,
          business_name: businessName,
          recording_url: m.recordingUrl || null,
          transcript: transcript || null,
          notes: summary,
          duration_seconds: Math.round(durationSec),
          metadata: { ended_reason: m.endedReason, success_eval: success, cost_usd: cost },
        }),
      });
    } catch (e) {
      console.error('[vapi-webhook] supabase log failed', e);
    }
  }

  // 2. Telegram summary to Elliott
  if (TELEGRAM_TOKEN && TELEGRAM_CHAT) {
    const lines = [
      `🤖 *Sarah call wrapped*`,
      `*Caller:* ${businessName}${callerPhone ? ` (${callerPhone})` : ''}`,
      `*Outcome:* ${success}`,
      `*Duration:* ${Math.round(durationSec)}s`,
      cost ? `*Cost:* $${cost.toFixed(3)}` : null,
      ``,
      `*Summary:*`,
      summary.slice(0, 800),
      m.recordingUrl ? `\n[🎧 Recording](${m.recordingUrl})` : null,
    ].filter(Boolean);

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT,
          text: lines.join('\n'),
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        }),
      });
    } catch (e) {
      console.error('[vapi-webhook] telegram failed', e);
    }
  }

  return NextResponse.json({ ok: true });
}
