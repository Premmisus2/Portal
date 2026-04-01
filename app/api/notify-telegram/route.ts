// Premmisus Tracker — Telegram Bot Notification
// Sends formatted Telegram messages for priority alerts

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();

  if (!BOT_TOKEN || !CHAT_ID) {
    return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 });
  }

  const { type, repName, businessName, phone, notes, stats } = await request.json();

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
    default:
      message = `📋 *${type?.toUpperCase() || 'UPDATE'}*\n${repName || 'Rep'}: ${businessName || 'Activity update'}`;
  }

  try {
    const teleRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
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
