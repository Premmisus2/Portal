'use client';

import { useState } from 'react';
import CopyBtn from '@/components/ui/CopyBtn';

const BookingKit = () => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [meetLink, setMeetLink] = useState('');

  const pad = (n: number) => String(n).padStart(2, '0');

  const calendarUrl = (() => {
    if (!date || !time) return '';
    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const fmt = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const details = meetLink
      ? `Join via Google Meet: ${meetLink}`
      : 'Google Meet link coming — check your SMS';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Strategy+Call+%E2%80%94+Premmisus&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(details)}&sf=true&output=xml`;
  })();

  const fmtDate =
    date && time
      ? new Date(`${date}T${time}`).toLocaleDateString('en-CA', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: 'America/Toronto',
        })
      : '[DATE]';

  const fmtTime =
    time
      ? new Date(`${date || '2000-01-01'}T${time}`).toLocaleTimeString('en-CA', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/Toronto',
        })
      : '[TIME]';

  const firstName = name.trim() || '[Name]';
  const meetDisplay = meetLink.trim() || '[PASTE MEET LINK]';
  const calDisplay = calendarUrl || '[FILL IN DATE + TIME ABOVE]';

  const confirmationSMS =
    `Hey ${firstName}, it's [Your Name] from Premmisus — great talking to you!\n\nHere's everything for our call:\n📅 ${fmtDate} at ${fmtTime}\n📹 Google Meet: ${meetDisplay}\n🗓 Add to your calendar: ${calDisplay}\n\nSee you then!`;

  const morningOfSMS =
    `Morning ${firstName}! Quick reminder — we're on for today at ${fmtTime}.\n\n📹 ${meetDisplay}\n\nSee you in a bit!`;

  const filled = date && time;

  return (
    <div style={{ marginBottom: '32px' }}>
      <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--accent-ink)' }}>
        Booking Confirmation Kit
      </p>
      <p style={{ margin: '0 0 16px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
        Fill in the details below — the SMS templates and calendar link auto-generate. Send both within 2 minutes of hanging up.
      </p>

      {/* Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Prospect First Name</label>
          <input
            className="field"
            placeholder="e.g. Mike"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Meeting Date</label>
          <input
            type="date"
            className="field"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%', colorScheme: 'dark' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Meeting Time</label>
          <input
            type="time"
            className="field"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={{ width: '100%', colorScheme: 'dark' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Google Meet Link</label>
          <input
            className="field"
            placeholder="meet.google.com/..."
            value={meetLink}
            onChange={e => setMeetLink(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Calendar Link */}
      <div style={outputCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <p style={outputLabel}>📅 Add to Calendar Link</p>
          {calendarUrl && <CopyBtn text={calendarUrl} />}
        </div>
        {calendarUrl ? (
          <a href={calendarUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-ink)', fontSize: '12px', wordBreak: 'break-all' }}>
            {calendarUrl}
          </a>
        ) : (
          <p style={{ color: 'var(--text-faint)', fontSize: '12px', margin: 0 }}>Fill in date + time to generate</p>
        )}
      </div>

      {/* Confirmation SMS */}
      <div style={{ ...outputCard, marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <p style={outputLabel}>📱 Confirmation SMS</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: 0 }}>Send immediately after hanging up</p>
          </div>
          <CopyBtn text={confirmationSMS} />
        </div>
        <pre style={preStyle}>{confirmationSMS}</pre>
        {!filled && <p style={hintStyle}>Add date + time to populate</p>}
      </div>

      {/* Morning-of SMS */}
      <div style={{ ...outputCard, marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <p style={outputLabel}>⏰ Morning-Of Reminder</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: 0 }}>Send morning of the call (8–9 AM)</p>
          </div>
          <CopyBtn text={morningOfSMS} />
        </div>
        <pre style={preStyle}>{morningOfSMS}</pre>
        {!filled && <p style={hintStyle}>Add date + time to populate</p>}
      </div>

      <p style={{ color: 'var(--text-faint)', fontSize: '11px', marginTop: '12px' }}>
        Don't have a Meet link yet? Open Google Calendar → create event → add Google Meet conferencing → copy the link → paste above.
      </p>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  color: 'var(--text-faint)',
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '4px',
};

const outputCard: React.CSSProperties = {
  background: 'rgba(0,240,255,.03)',
  border: '1px solid var(--accent-glow-12)',
  borderRadius: '10px',
  padding: '14px 16px',
};

const outputLabel: React.CSSProperties = {
  margin: 0,
  fontWeight: 700,
  color: 'var(--text-primary)',
  fontSize: '13px',
};

const preStyle: React.CSSProperties = {
  margin: 0,
  color: 'var(--text-secondary)',
  fontSize: '12px',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily: 'Roboto, sans-serif',
};

const hintStyle: React.CSSProperties = {
  margin: '8px 0 0',
  color: 'var(--text-faint)',
  fontSize: '11px',
  fontStyle: 'italic',
};

export default BookingKit;
