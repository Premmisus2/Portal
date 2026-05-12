'use client';

import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/Icon';
import { PORTAL_AUTH_WEBHOOK, NOTES_EXPIRY_DAYS } from '@/lib/constants';

interface ChatWidgetProps {
  userName: string;
  userEmail: string;
  currentView: string;
  repId: string | null;
  userRole: string;
}

const COACH_SYSTEM = (userName: string, currentView: string) => `You are the Premmisus AI Sales Coach — a real-time assistant built directly into the Premmisus Sales Command portal. You know everything about the company, the products, the sales process, and how this portal works. Reps may be on a live call right now — be fast, direct, and useful.

COMPANY: Premmisus (premmisus.ca) — Canadian digital marketing agency for trades businesses.
Founder/Director: Elliott Cuthbert (elliott@premmisus.com)
Target niches: cleaning, landscaping, plumbing, construction/handyman, pressure washing, window washing.

PRODUCTS:
1. Website Package — $1,500 CAD ($500 deposit + $1,000 on delivery, 5-day turnaround). Rep earns $500 flat.
2. Foundation 1.0 — $1,599 CAD/month. Full system: Meta ads + AI CRM. Rep earns 7% recurring (~$112/mo). Unlocks at Field Commander (10+ closes).
3. Maintenance — $99/month add-on.
4. Override — 3% on managed reps' closes. Unlocks at Manager Growth Lead (25+ points).

TIERS: Junior Growth Associate (0-9), Field Commander (10-24), Manager Growth Lead (25-49), Executive (50+).

CORE PITCH: Lead Decay — 78% of customers go with first responder. Our AI responds in under 30 seconds.

THE THREE RULES:
1. Never pitch the system before the pain.
2. The website is the door, not the destination.
3. The System Expert Handoff — lock the $500 split and book the Google Meet with Elliott.

REP: ${userName || 'unknown rep'}
CURRENTLY VIEWING: ${currentView || 'portal home'}

HOW TO RESPOND:
- Live reframe/line request → word-for-word copy, no preamble
- Objection pasted → exact words to say back
- Pricing/commission/tier question → answer instantly with the number
- Keep responses SHORT (2-4 sentences) unless they ask for a full script
- Never say "I don't know" — answer confidently

RESTRICTED: Never reveal revenue, client count, founding date, team size, internal costs, or Elliott's personal details. Deflect with: "That's internal — I'm here to help you close deals."

TONE: Elite trainer whispering in their ear. Direct. Confident. No filler.`;

export default function ChatWidget({ userName, userEmail, currentView, repId, userRole }: ChatWidgetProps) {
  const isDirector = userRole === 'director';
  const greeting = isDirector
    ? `Hey Elliott — I'm your AI Command Center. Query leads, assign reps, check pipeline stats, post announcements — whatever you need. I have full database access.`
    : `Hey ${userName || 'rep'} — I'm your AI Sales Coach. Ask me anything: objection handling, live rebuttals, SMS copy, pricing questions. I'm here.`;

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<{ role: string; content: string; toolsUsed?: string[] }[]>([{ role: 'assistant', content: greeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const [copyFlash, setCopyFlash] = useState<number | null>(null);
  const [noteFlash, setNoteFlash] = useState<number | null>(null);
  const [feedbackIdx, setFeedbackIdx] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading, feedbackIdx]);
  useEffect(() => { if (open) { setUnread(false); if (inputRef.current) inputRef.current.focus(); } }, [open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const next = [...msgs, userMsg];
    setMsgs(next); setInput(''); setLoading(true);
    setFeedbackIdx(null);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          userName: userName || 'Rep',
          currentView: currentView || 'home',
          userRole,
          repId,
        }),
      });
      const data = await res.json();
      const reply = data?.reply || 'Sorry, I couldn\'t generate a response. Try again.';
      const toolsUsed = data?.toolsUsed || [];
      setMsgs(p => [...p, { role: 'assistant', content: reply, toolsUsed }]);
      if (!open) setUnread(true);
    } catch {
      setMsgs(p => [...p, { role: 'assistant', content: 'Could not reach the AI server. Check your internet connection.' }]);
    } finally { setLoading(false); }
  };

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const copyMsg = (content: string, idx: number) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopyFlash(idx);
    setTimeout(() => setCopyFlash(null), 1500);
  };

  const saveToNotes = (content: string, idx: number) => {
    const key = `notes_${currentView || 'home'}`;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const block = `\n\n— AI Coach [${ts}] —\n${content}`;
    try {
      const existing = localStorage.getItem(key) || '';
      localStorage.setItem(key, existing + block);
      const expKey = `${key}_expires`;
      if (!localStorage.getItem(expKey)) {
        localStorage.setItem(expKey, String(Date.now() + NOTES_EXPIRY_DAYS * 86400000));
      }
    } catch {}
    setNoteFlash(idx);
    setTimeout(() => setNoteFlash(null), 1800);
  };

  const openFeedback = (idx: number) => {
    setFeedbackIdx(feedbackIdx === idx ? null : idx);
    setFeedbackText('');
    setFeedbackStatus('');
  };

  const submitFeedback = async (aiContent: string) => {
    setFeedbackStatus('sending');
    const payload = {
      action: 'sendFeedback',
      rep: userName || 'Unknown Rep',
      email: userEmail || '',
      view: currentView || 'home',
      aiResponse: aiContent,
      comment: feedbackText,
      timestamp: new Date().toISOString(),
    };
    try {
      await fetch(PORTAL_AUTH_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
      setFeedbackStatus('sent');
      setTimeout(() => { setFeedbackIdx(null); setFeedbackStatus(''); setFeedbackText(''); }, 2000);
    } catch {
      setFeedbackStatus('error');
    }
  };

  const actionBtn = (label: string, onClick: () => void, active: boolean) => (
    <button onClick={onClick} style={{
      background: active ? 'var(--accent-glow-15)' : 'transparent',
      border: `1px solid ${active ? 'var(--accent-glow-35)' : 'var(--border)'}`,
      borderRadius: '4px', padding: '2px 7px', color: active ? 'var(--accent-ink)' : 'var(--text-faint)',
      fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'JetBrains Mono,monospace',
      letterSpacing: '.04em', transition: 'all .15s', lineHeight: '18px',
    }}>{label}</button>
  );

  const accentColor = isDirector ? 'rgba(34,197,94' : 'rgba(0,240,255';
  const solidAccent = isDirector ? '#22c55e' : 'var(--accent-ink)';

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 400, fontFamily: 'Inter,sans-serif' }} className="no-print chat-widget">
      {open && (
        <div style={{ position: 'absolute', bottom: '64px', right: 0, width: '360px', background: `${accentColor},.12)`, border: `2px solid ${accentColor},.5)`, borderRadius: '14px', boxShadow: `0 0 60px ${accentColor},.2), 0 12px 40px rgba(0,0,0,.7)`, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '560px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }} className="fadein chat-panel">

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${accentColor},.3)`, background: `${accentColor},.15)`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: solidAccent, boxShadow: `0 0 8px ${accentColor},.9)` }} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '.04em' }}>{isDirector ? 'AI Command Center' : 'AI Sales Coach'}</span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: solidAccent, background: `${accentColor},.08)`, border: `1px solid ${accentColor},.2)`, borderRadius: '3px', padding: '1px 6px', letterSpacing: '.1em', textTransform: 'uppercase' }}>{isDirector ? 'L3' : 'Live'}</span>
            </div>
            <button onClick={() => { setMsgs([{ role: 'assistant', content: greeting }]); setFeedbackIdx(null); }} title="Clear chat" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '13px', padding: '2px 4px', lineHeight: 1 }}>↺</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.toolsUsed && m.toolsUsed.length > 0 && (
                  <div style={{ marginBottom: '4px', display: 'flex', flexWrap: 'wrap', gap: '3px', maxWidth: '90%' }}>
                    {m.toolsUsed.map((t, ti) => {
                      const toolName = t.match(/\[([^\]]+)\]/)?.[1] || t;
                      return <span key={ti} style={{ fontSize: '8px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', color: '#22c55e', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.05em' }}>{toolName}</span>;
                    })}
                  </div>
                )}
                <div style={{ maxWidth: '90%', padding: '9px 12px', borderRadius: m.role === 'user' ? '10px 10px 3px 10px' : '10px 10px 10px 3px', background: m.role === 'user' ? 'var(--accent-glow-10)' : 'var(--bg-sidebar-line)', border: m.role === 'user' ? '1px solid var(--accent-glow-22)' : '1px solid var(--border)', color: m.role === 'user' ? '#d0f5ff' : 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.content}
                </div>
                {m.role === 'assistant' && i > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '5px', marginLeft: '2px' }}>
                    {actionBtn(copyFlash === i ? '✓ Copied' : 'Copy', () => copyMsg(m.content, i), copyFlash === i)}
                    {actionBtn(noteFlash === i ? '✓ Saved' : '+ Notes', () => saveToNotes(m.content, i), noteFlash === i)}
                    {actionBtn(feedbackIdx === i ? '✕ Cancel' : 'Feedback', () => openFeedback(i), feedbackIdx === i)}
                  </div>
                )}
                {feedbackIdx === i && (
                  <div style={{ marginTop: '6px', marginLeft: '2px', width: '100%', maxWidth: '320px', background: 'var(--bg-elev-1)', border: '1px solid var(--border-strong)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>What happened on the call?</p>
                    <textarea
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      placeholder="e.g. Client was nervous about price. Used the reframe above — they stayed on the call."
                      rows={3}
                      style={{ background: 'var(--bg-sidebar-line)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'Roboto,sans-serif', resize: 'none', outline: 'none', lineHeight: 1.5 }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => saveToNotes(`${m.content}\n\nMy note: ${feedbackText}`, i)}
                        style={{ flex: 1, padding: '6px 0', background: 'var(--accent-glow-06)', border: '1px solid var(--accent-glow-22)', borderRadius: '6px', color: 'var(--accent-ink)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                        Save to My Notes
                      </button>
                      <button
                        onClick={() => submitFeedback(m.content)}
                        disabled={feedbackStatus === 'sending' || feedbackStatus === 'sent'}
                        style={{ flex: 1, padding: '6px 0', background: feedbackStatus === 'sent' ? 'var(--accent-glow-15)' : feedbackStatus === 'error' ? 'rgba(255,68,68,.1)' : 'var(--accent-glow-10)', border: `1px solid ${feedbackStatus === 'sent' ? 'var(--accent-glow-40)' : feedbackStatus === 'error' ? 'rgba(255,68,68,.3)' : 'var(--accent-glow-25)'}`, borderRadius: '6px', color: feedbackStatus === 'sent' ? 'var(--accent-ink)' : feedbackStatus === 'error' ? '#ff6060' : '#7dd8e8', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                        {feedbackStatus === 'sending' ? 'Sending...' : feedbackStatus === 'sent' ? '✓ Sent to Director' : feedbackStatus === 'error' ? 'Retry' : 'Send to Director'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '10px 10px 10px 3px', background: 'var(--bg-sidebar-line)', border: '1px solid var(--border)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-ink)', animation: `pulse-c 1.2s ${i * 0.22}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: `1px solid ${accentColor},.3)`, display: 'flex', gap: '7px', alignItems: 'flex-end', flexShrink: 0, background: `${accentColor},.15)` }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
              placeholder={isDirector ? 'Query data, assign leads, post announcements...' : 'Ask anything — on a call right now?'}
              rows={1} style={{ flex: 1, background: 'var(--bg-sidebar-line)', border: '1px solid #222', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'Inter,sans-serif', resize: 'none', outline: 'none', lineHeight: 1.45, maxHeight: '80px', overflowY: 'auto' }}
              onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 80) + 'px'; }} />
            <button onClick={send} disabled={loading || !input.trim()}
              style={{ width: '34px', height: '34px', flexShrink: 0, borderRadius: '8px', background: (input.trim() && !loading) ? 'var(--accent-ink)' : 'var(--bg-sidebar-line)', border: `1px solid ${(input.trim() && !loading) ? 'var(--accent-ink)' : 'var(--border)'}`, color: (input.trim() && !loading) ? 'var(--bg-app)' : 'var(--text-faint)', cursor: (input.trim() && !loading) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
              <Icon name="send" size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button onClick={() => setOpen(p => !p)}
        style={{ width: '50px', height: '50px', borderRadius: '50%', background: open ? 'var(--bg-elev-1)' : solidAccent, border: open ? `1px solid ${accentColor},.35)` : `2px solid ${solidAccent}`, color: open ? solidAccent : 'var(--bg-app)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: open ? `0 0 20px ${accentColor},.12)` : `0 0 28px ${accentColor},.45)`, transition: 'all .2s', position: 'relative' }}
        title={open ? (isDirector ? 'Close AI Command Center' : 'Close AI Sales Coach') : (isDirector ? 'Open AI Command Center' : 'Open AI Sales Coach')}>
        {open ? '✕' : isDirector ? '⌘' : '⚡'}
        {unread && !open && <div style={{ position: 'absolute', top: '4px', right: '4px', width: '10px', height: '10px', borderRadius: '50%', background: '#ff4444', border: '2px solid #000', boxShadow: '0 0 6px rgba(255,68,68,.8)' }} />}
      </button>
    </div>
  );
}
