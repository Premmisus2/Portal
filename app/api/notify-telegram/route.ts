// Premmisus Tracker — Telegram Bot Notification
// Sends formatted Telegram messages for priority alerts.
//
// Routing: looks up notification_routes by alert_type. If a row exists and
// is enabled, uses its chat_id (+ optional topic_id). Otherwise falls back
// to TELEGRAM_CHAT_ID env var. See lib/notification-routes.ts.

import { NextResponse } from 'next/server';
import { resolveRoute } from '@/lib/notification-routes';

// Map the legacy `type` values used by callers to the canonical alert_type
// values stored in the notification_routes table. Keeps existing callers
// working unchanged while letting the routing UI use stable identifiers.
const TYPE_TO_ALERT_TYPE: Record<string, string> = {
  booked: 'booked_call',
  idle: 'idle',
  daily_summary: 'daily_summary',
  close_approved: 'close_approved',
  close_rejected: 'close_rejected',
  client_error: 'client_error',
};

export async function POST(request: Request) {
  const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 });
  }

  const { type, repName, businessName, phone, notes, stats, journalTag } = await request.json();
  const alertType = TYPE_TO_ALERT_TYPE[type] || type || 'unknown';
  const route = await resolveRoute(alertType);
  if (!route.chatId) {
    return NextResponse.json({ error: 'No chat id resolved (no route + TELEGRAM_CHAT_ID unset)' }, { status: 500 });
  }

  let message = '';
  switch (type) {
    case 'booked':
      message = `🟢 *BOOKED CALL*\nRep: ${repName || 'Unknown'}\nBusiness: ${businessName || 'Unknown'}${phone ? '\nPhone: ' + phone : ''}${notes ? '\nNotes: ' + notes.slice(0, 200) : ''}\n\n_Check portal for details_`;
      break;
    case 'idle':
      message = `🔴 *IDLE ALERT*\nNo rep activity for 2+ hours during business hours.\n\n_Check portal.premmisus.ca_`;
      break;
    case 'daily_summary':
      message = `📊 *DAILY SUMMARY*\n${stats || 'No stats available.'}`;
      break;
    case 'close_approved':
      message = `✅ *CLOSE APPROVED*\nRep: ${repName || 'Unknown'}\nProduct: ${businessName || 'Close'}\n\n_Points have been added to their account._`;
      break;
    case 'close_rejected':
      message = `❌ *CLOSE REJECTED*\nRep: ${repName || 'Unknown'}\nProduct: ${businessName || 'Close'}\n\n_No points added. Rep has been notified._`;
      break;
    case 'client_error': {
      const journalLine = journalTag ? `\n_See journal: #${journalTag}_` : '';
      message = `🐛 *CLIENT ERROR*\nWho: ${repName || 'unknown'}\nWhere: ${businessName || 'unknown'}\nWhat: ${notes ? notes.slice(0, 500) : 'no details'}${journalLine}\n\n_Reported from portal browser. Check console for full stack._`;
      break;
    }
    default:
      message = `📋 *${type?.toUpperCase() || 'UPDATE'}*\n${repName || 'Rep'}: ${businessName || 'Activity update'}`;
  }

  try {
    const tgBody: Record<string, unknown> = {
      chat_id: route.chatId,
      text: message,
      parse_mode: 'Markdown',
    };
    if (route.topicId) tgBody.message_thread_id = Number(route.topicId);

    const teleRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tgBody),
    });

    const data = await teleRes.json();

    if (!data.ok) {
      return NextResponse.json({ error: data.description || 'Telegram send failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message_id: data.result?.message_id });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
