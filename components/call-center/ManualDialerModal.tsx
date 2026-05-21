'use client';

// Manual Dialer — ad-hoc dial-out for numbers that aren't yet in the leads
// pipeline. Use case: director (or rep) finds a prospect via Google / referral
// and wants to dial without first running the import-as-lead ceremony.
//
// Flow:
//   1. Rep enters phone (required) + optional business_name / niche.
//   2. On Dial: INSERT a stub lead with source='manual_dial' tagged to the
//      current rep, status='contacted', so the call_logs row has somewhere
//      to attach.
//   3. POST /api/initiate-call with the new leadId — Twilio bridge fires
//      via the existing dial path.
//   4. Caller can rename / enrich the lead later via /floor drawer or AllLeads.
//
// Locked 2026-05-21 (Slice 1.6) — Elliott's "let's also have a dialer"
// observation. Schema: leads.source is freeform; call_logs.source enum
// extended to allow 'manual' alongside 'cockpit' / 'coldcall'.

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { recordAuditEvent } from '@/features/audit';

interface ManualDialerModalProps {
  open: boolean;
  onClose: () => void;
  repId: string;
  repPhone?: string;
  onDialed?: (newLeadId: string) => void;
}

function sanitizePhone(raw: string): string {
  // Strip everything except + and digits. Prepend +1 if missing country code
  // and looks like a NANP 10-digit.
  const cleaned = raw.replace(/[^+0-9]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (/^\d{10}$/.test(cleaned)) return `+1${cleaned}`;
  if (/^1\d{10}$/.test(cleaned)) return `+${cleaned}`;
  return cleaned;
}

function isValidPhone(p: string): boolean {
  const s = sanitizePhone(p);
  return /^\+\d{10,15}$/.test(s);
}

export default function ManualDialerModal({ open, onClose, repId, repPhone, onDialed }: ManualDialerModalProps) {
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [niche, setNiche] = useState('');
  const [dialing, setDialing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleDial = async () => {
    setError(null);
    if (!isValidPhone(phone)) {
      setError('Enter a valid phone number (10 digits or E.164 format).');
      return;
    }
    setDialing(true);
    try {
      const normalizedPhone = sanitizePhone(phone);
      const labelName = businessName.trim() || `Manual Dial · ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

      // 1. Create the stub lead.
      const { data: lead, error: leadErr } = await supabase
        .from('leads')
        .insert({
          business_name: labelName,
          phone: normalizedPhone,
          niche: niche.trim() || null,
          status: 'contacted',
          source: 'manual_dial',
          assigned_rep_id: repId,
        })
        .select('id')
        .single();

      if (leadErr || !lead?.id) {
        throw new Error(leadErr?.message || 'Could not create lead');
      }

      // 2. Audit log (fire-and-forget).
      void recordAuditEvent({
        actionType: 'lead.assigned',
        leadId: lead.id,
        payload: { source: 'manual_dial', via: 'ManualDialerModal' },
      });

      // 3. Fire the dial via the existing initiate-call route.
      const res = await fetch('/api/initiate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, repId, phone: normalizedPhone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Dial failed: HTTP ${res.status}`);
      }

      // 4. Done — let parent know + reset modal.
      onDialed?.(lead.id);
      setPhone('');
      setBusinessName('');
      setNiche('');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDialing(false);
    }
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Manual Dialer"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
        zIndex: 1000, backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#080808', border: '1px solid #1e1e1e', borderRadius: 12,
          padding: 24, width: '100%', maxWidth: 420,
          boxShadow: '0 24px 64px rgba(0,0,0,.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: 9,
              letterSpacing: '.18em', textTransform: 'uppercase', color: '#00F0FF',
              marginBottom: 4,
            }}>
              📞 Manual Dial
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>
              Dial a number
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent', border: '1px solid #1e1e1e', borderRadius: 6,
              width: 28, height: 28, color: '#888', cursor: 'pointer', fontSize: 14,
            }}
          >✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.15em', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: 4 }}>
              Phone *
            </span>
            <input
              type="tel"
              autoFocus
              placeholder="+1 416 555 0142"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                width: '100%', background: '#000', border: '1px solid #1e1e1e', borderRadius: 6,
                padding: '10px 12px', color: '#fff', fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          </label>

          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.15em', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: 4 }}>
              Business name <span style={{ color: '#444' }}>(optional)</span>
            </span>
            <input
              type="text"
              placeholder="Acme Co. — fill in later if unknown"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              style={{
                width: '100%', background: '#000', border: '1px solid #1e1e1e', borderRadius: 6,
                padding: '10px 12px', color: '#fff', fontSize: 13,
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </label>

          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.15em', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: 4 }}>
              Niche <span style={{ color: '#444' }}>(optional)</span>
            </span>
            <input
              type="text"
              placeholder="cleaning · plumbing · landscaping…"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              style={{
                width: '100%', background: '#000', border: '1px solid #1e1e1e', borderRadius: 6,
                padding: '10px 12px', color: '#fff', fontSize: 13,
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </label>

          {error && (
            <div style={{
              padding: '8px 12px', background: 'rgba(255,68,68,.06)',
              border: '1px solid rgba(255,68,68,.25)', borderRadius: 6,
              color: '#ff6060', fontSize: 12,
            }}>
              {error}
            </div>
          )}

          <div style={{ fontSize: 11, color: '#555', fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5 }}>
            A stub lead will be created under your name with this phone +{' '}
            <span style={{ color: '#00F0FF' }}>source=manual_dial</span>.
            You can rename and enrich it from /floor after the call.
            {repPhone ? '' : ' (No rep phone set — call will fail. Set in profile first.)'}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, background: 'transparent', color: '#888',
                border: '1px solid #1e1e1e', borderRadius: 8,
                padding: '10px 14px', fontWeight: 700, fontSize: 12,
                letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >Cancel</button>
            <button
              onClick={handleDial}
              disabled={dialing || !phone.trim()}
              style={{
                flex: 2, background: dialing || !phone.trim() ? '#1e1e1e' : '#00F0FF',
                color: dialing || !phone.trim() ? '#555' : '#000', border: 'none',
                borderRadius: 8, padding: '10px 14px', fontWeight: 800, fontSize: 12,
                letterSpacing: '.08em', textTransform: 'uppercase',
                cursor: dialing || !phone.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {dialing ? 'Dialing…' : '☎ Dial Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
