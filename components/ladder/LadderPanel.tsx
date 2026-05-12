'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/Icon';
import SliderInput from '@/components/ui/SliderInput';
import { getTierInfo, fmtCAD, CLOSE_PRODUCTS } from '@/lib/constants';

// ── AI service definitions ──────────────────────────────────────────────────
const AI_SERVICES = [
  { key: 'vapi',  name: 'AI Receptionist (Vapi)', setupRate: 500, mrrRate: 95  },
  { key: 'sms',   name: 'SMS Sequences',           setupRate: 375, mrrRate: 44  },
  { key: 'email', name: 'Email Sequences',          setupRate: 250, mrrRate: 32  },
  { key: 'chat',  name: 'Website Chatbot',          setupRate: 375, mrrRate: 44  },
  { key: 'crm',   name: 'CRM Automation',           setupRate: 375, mrrRate: 44  },
] as const;

type AiKey = typeof AI_SERVICES[number]['key'];
interface AiState { enabled: boolean; newClients: number; retained: number; }

// ── Corner brackets (JARVIS Workshop signature) ─────────────────────────────
const Brackets = ({ color = 'var(--accent-glow-40)', size = 10 }: { color?: string; size?: number }) => {
  const s: React.CSSProperties = { position: 'absolute', width: size, height: size };
  const b = `1px solid ${color}`;
  return (
    <>
      <span style={{ ...s, top: 0, left: 0, borderTop: b, borderLeft: b }} />
      <span style={{ ...s, top: 0, right: 0, borderTop: b, borderRight: b }} />
      <span style={{ ...s, bottom: 0, left: 0, borderBottom: b, borderLeft: b }} />
      <span style={{ ...s, bottom: 0, right: 0, borderBottom: b, borderRight: b }} />
    </>
  );
};

// ── Pulse dot (no emoji) ────────────────────────────────────────────────────
const PulseDot = ({ color = '#F59E0B' }: { color?: string }) => (
  <span style={{ position: 'relative', display: 'inline-block', width: 7, height: 7, flexShrink: 0 }}>
    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: .35, animation: 'pmss-pulse 2s ease infinite' }} />
    <span style={{ position: 'absolute', inset: '2px', borderRadius: '50%', background: color }} />
  </span>
);

// ── Section header ──────────────────────────────────────────────────────────
const SectionHeader = ({ label, sub, addOn }: { label: string; sub?: string; addOn?: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 12px' }}>
    <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--accent-ink)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{label}</span>
    {sub && <span style={{ fontSize: '9px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{sub}</span>}
    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, var(--accent-glow-35), transparent)' }} />
    {addOn}
  </div>
);

// ── Income stream row ───────────────────────────────────────────────────────
const StreamRow = ({ color, name, sub, amt, locked, last }: { color: string; name: string; sub: string; amt: number; locked?: boolean; last?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: last ? 'none' : '1px solid var(--bg-elev-1)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* Square badge instead of circle dot — more technical/command-center */}
      <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: locked ? 'var(--border-soft)' : color, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: '13px', color: locked ? 'var(--border-strong)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {name}
          {locked && <span style={{ fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', background: 'var(--bg-elev-pill)', border: '1px solid var(--border-soft)', borderRadius: '3px', padding: '1px 6px', color: 'var(--text-faint)', letterSpacing: '.08em' }}>LOCKED</span>}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: '1px' }}>{sub}</div>
      </div>
    </div>
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 700, color: locked ? 'var(--border-soft)' : (amt === 0 ? 'var(--border-strong)' : color) }}>
      {locked ? '—' : fmtCAD(amt)}
    </div>
  </div>
);

// ── Close Picker Modal ──────────────────────────────────────────────────────
const ClosePickerModal = ({ onSelect, onClose }: { onSelect: (pts: number, id: string) => void; onClose: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const marketing = CLOSE_PRODUCTS.filter(p => !p.id.startsWith('ai'));
  const ai        = CLOSE_PRODUCTS.filter(p => p.id.startsWith('ai'));

  const Row = ({ prod }: { prod: typeof CLOSE_PRODUCTS[number] }) => (
    <button
      onClick={() => { onSelect(prod.pts, prod.id); onClose(); }}
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '7px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background .15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-glow-04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <div>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{prod.label}</p>
        <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>{prod.price}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {prod.commission && (
          <span style={{ fontSize: '10px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{prod.commission}</span>
        )}
        <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 9px', borderRadius: '20px', background: 'var(--accent-glow-08)', border: '1px solid var(--accent-glow-22)', color: 'var(--accent-ink)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
          +{prod.pts}pt{prod.pts > 1 ? 's' : ''}
        </span>
      </div>
    </button>
  );

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 400, backdropFilter: 'blur(4px)' }} />

      {/* Modal */}
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 401, width: '90%', maxWidth: '460px', background: '#060606', border: '1px solid var(--accent-glow-22)', borderRadius: '16px', boxShadow: '0 24px 64px rgba(0,0,0,.9), 0 0 40px var(--accent-glow-08)', overflow: 'hidden' }}>
        {/* Corner brackets */}
        <Brackets color="var(--accent-glow-50)" size={12} />

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #111' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--accent-ink)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '2px' }}>Log a Close</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>What did you close? Select the product.</div>
            </div>
            <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--bg-elev-1)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '8px' }}>
          {/* Marketing */}
          <div style={{ padding: '8px 4px 4px', fontSize: '9px', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>Marketing</div>
          {marketing.map(p => <Row key={p.id} prod={p} />)}

          {/* Divider */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, var(--accent-glow-15), transparent)', margin: '8px 0' }} />

          {/* AI Services */}
          <div style={{ padding: '4px 4px', fontSize: '9px', fontWeight: 700, color: 'var(--accent-ink)', letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>AI Services</div>
          {ai.map(p => <Row key={p.id} prod={p} />)}
        </div>

        {/* Footer note */}
        <div style={{ padding: '10px 20px 14px', borderTop: '1px solid var(--bg-elev-1)' }}>
          <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>All closes are PENDING until director approves. Points count once approved.</p>
        </div>
      </div>
    </>
  );
};

// ── Main component ──────────────────────────────────────────────────────────
const LadderPanel = ({ totalCloses, totalPoints, addClose, undoClose, closeHistory }: any) => {
  const [mode,        setMode]        = useState<'predict' | 'actuals'>('predict');
  const [pickerOpen,  setPickerOpen]  = useState(false);

  // Marketing sliders
  const [websitePerWeek,    setWebsitePerWeek]    = useState(0);
  const [foundationClients, setFoundationClients] = useState(0);
  const [authorityClients,  setAuthorityClients]  = useState(0);
  const [newRecCloses,      setNewRecCloses]      = useState(0);
  const [managedReps,       setManagedReps]       = useState(2);
  const [repsPerWeek,       setRepsPerWeek]       = useState(4);

  // AI service state
  const [ai, setAi] = useState<Record<AiKey, AiState>>({
    vapi:  { enabled: false, newClients: 1, retained: 1 },
    sms:   { enabled: false, newClients: 1, retained: 1 },
    email: { enabled: false, newClients: 1, retained: 1 },
    chat:  { enabled: false, newClients: 1, retained: 1 },
    crm:   { enabled: false, newClients: 1, retained: 1 },
  });

  const toggleAi = (key: AiKey) =>
    setAi(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  const setAiField = (key: AiKey, field: 'newClients' | 'retained', val: number) =>
    setAi(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));

  const history        = closeHistory || [];
  const pendingCloses  = history.filter((c: any) => c.status === 'pending');
  const approvedCloses = history.filter((c: any) => c.status === 'approved');

  const tier = getTierInfo(totalPoints);

  // ── Income calculations ─────────────────────────────────────────────────
  const closeIncome     = websitePerWeek * 500 * 4;
  const newRecIncome    = newRecCloses * 500;
  const flatTotal       = closeIncome + newRecIncome;
  const recurringIncome = tier.hasRecurring ? (foundationClients * 112) + (authorityClients * 210) : 0;
  const overrideIncome  = tier.hasOverride  ? managedReps * repsPerWeek * 15 * 4 : 0;

  const enabledCount   = AI_SERVICES.filter(s => ai[s.key].enabled).length;
  const bundleDiscount = enabledCount >= 3 ? 17 : 0;

  let aiSetupIncome = 0;
  let aiMrrIncome   = 0;
  AI_SERVICES.forEach(s => {
    if (!ai[s.key].enabled) return;
    aiSetupIncome += ai[s.key].newClients * s.setupRate;
    aiMrrIncome   += ai[s.key].retained  * s.mrrRate;
  });
  aiMrrIncome = Math.max(0, aiMrrIncome - bundleDiscount);

  const totalMonthly  = flatTotal + recurringIncome + overrideIncome + aiSetupIncome + aiMrrIncome;
  const annualRunRate = totalMonthly * 12;
  const pct = (n: number) => totalMonthly > 0 ? (n / totalMonthly) * 100 : 0;

  // Actuals from approved history
  const flatApproved    = approvedCloses.filter((c: any) => c.pts === 1).length * 500;
  const flatRecApproved = approvedCloses.filter((c: any) => c.pts >= 2).length * 500;
  const recurApproved   = approvedCloses.filter((c: any) => c.pts >= 2).reduce(
    (acc: number, c: any) => acc + (c.pts === 2 ? 112 : c.pts === 3 ? 210 : 420), 0
  );

  const goalRows = [
    { goal: '$5K / mo',  closes: 2.5, calls: 35  },
    { goal: '$10K / mo', closes: 5,   calls: 50  },
    { goal: '$15K / mo', closes: 7.5, calls: 75  },
    { goal: '$20K / mo', closes: 10,  calls: 100 },
  ];

  const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' };

  // Marketing section subtotal for header
  const mktSubtotal = flatTotal + recurringIncome + overrideIncome;
  const aiSubtotal  = aiSetupIncome + aiMrrIncome;

  return (
    <>
      {/* Pulse animation for pending dot */}
      <style>{`@keyframes pmss-pulse { 0%,100%{opacity:.35;transform:scale(1)} 50%{opacity:.7;transform:scale(1.8)} }`}</style>

      {/* Close Picker Modal */}
      {pickerOpen && (
        <ClosePickerModal
          onSelect={(pts, id) => addClose(pts, id)}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '42% 58%', height: '100%', minHeight: 0 }}>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LEFT PANEL — controls                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{ overflowY: 'auto', borderRight: '1px solid #111', padding: '24px 24px 64px' }}>

          <div style={{ marginBottom: '6px' }}><span className="tag">08</span></div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 4px' }}>Commission Calculator</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
            Drag sliders to project income. AI income stacks on top.
          </p>
          <div className="divider" style={{ marginBottom: '16px' }} />

          {/* Mode toggle — no emojis, JetBrains Mono uppercase */}
          <div style={{ display: 'flex', background: 'var(--bg-elev-2)', border: '1px solid var(--border-soft)', borderRadius: '8px', padding: '3px', gap: '2px', marginBottom: '20px' }}>
            {(['predict', 'actuals'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px 10px', borderRadius: '6px',
                background: mode === m ? 'var(--accent-glow-08)' : 'transparent',
                border: mode === m ? '1px solid var(--accent-glow-25)' : '1px solid transparent',
                color: mode === m ? 'var(--accent-ink)' : 'var(--text-faint)',
                fontSize: '10px', fontWeight: 800, cursor: 'pointer', transition: 'all .15s',
                fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.14em', textTransform: 'uppercase',
              }}>
                {m === 'predict' ? 'Forecast' : 'My Actuals'}
              </button>
            ))}
          </div>

          {/* ── PREDICT MODE ─────────────────────────────────────────── */}
          {mode === 'predict' && (
            <>
              <SectionHeader
                label="Marketing"
                sub={mktSubtotal > 0 ? `· ${fmtCAD(mktSubtotal)}/mo` : undefined}
              />

              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '12px' }}>
                <SliderInput
                  label="Website Closes / week"
                  sublabel="$500 flat per close — no recurring"
                  value={websitePerWeek} min={0} max={20} onChange={setWebsitePerWeek}
                />
                <div className="divider" />
                <SliderInput
                  label="Foundation 1.0 clients retained"
                  sublabel="$500 flat on close · then ~$112/mo recurring (7%)"
                  value={foundationClients} min={0} max={20} onChange={setFoundationClients}
                  locked={!tier.hasRecurring} lockLabel="Field Commander (10 pts)"
                />
                <div className="divider" />
                <SliderInput
                  label="Authority 2.0 clients retained"
                  sublabel="$500 flat on close · then ~$210/mo recurring (7%)"
                  value={authorityClients} min={0} max={15} onChange={setAuthorityClients}
                  locked={!tier.hasRecurring} lockLabel="Field Commander (10 pts)"
                />
                <div className="divider" />
                <SliderInput
                  label="New 1.0 / 2.0 / 3.0 closes this month"
                  sublabel="$500 flat per close — recurring tracked above"
                  value={newRecCloses} min={0} max={10} onChange={setNewRecCloses}
                />
                <div className="divider" />
                <SliderInput
                  label="Override — Managed Reps"
                  sublabel="3% of junior rep closes"
                  value={managedReps} min={1} max={10} onChange={setManagedReps}
                  locked={!tier.hasOverride} lockLabel="Manager (25 pts)"
                />
                {tier.hasOverride && (
                  <SliderInput
                    label="Rep Closes / Week (avg)"
                    value={repsPerWeek} min={1} max={10} onChange={setRepsPerWeek}
                  />
                )}
              </div>

              {/* AI Services */}
              <SectionHeader
                label="AI Services"
                sub={aiSubtotal > 0 ? `· ${fmtCAD(aiSubtotal)}/mo` : undefined}
                addOn={
                  <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--accent-glow-22)', color: 'var(--accent-ink)', background: 'var(--accent-glow-04)', ...mono, letterSpacing: '.08em', whiteSpace: 'nowrap' }}>
                    ADDITIVE
                  </span>
                }
              />
              <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginBottom: '12px', lineHeight: 1.5 }}>
                Toggle each service you plan to sell. <strong style={{ color: 'var(--text-muted)' }}>Setup = one-time upfront. MRR = monthly while client stays.</strong>
              </p>

              {AI_SERVICES.map(svc => {
                const s = ai[svc.key];
                return (
                  <div key={svc.key} style={{
                    border: `1px solid ${s.enabled ? 'var(--accent-glow-30)' : 'var(--border-soft)'}`,
                    borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', transition: 'border-color .2s',
                  }}>
                    <div
                      onClick={() => toggleAi(svc.key)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: s.enabled ? 'rgba(0,240,255,.03)' : 'var(--bg-elev-2)', transition: 'background .15s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Toggle switch */}
                        <div
                          onClick={e => { e.stopPropagation(); toggleAi(svc.key); }}
                          style={{ position: 'relative', width: '32px', height: '18px', flexShrink: 0, cursor: 'pointer' }}
                        >
                          <div style={{ position: 'absolute', inset: 0, borderRadius: '9px', background: s.enabled ? 'var(--accent-glow-22)' : 'var(--border-soft)', border: `1px solid ${s.enabled ? 'var(--accent-glow-40)' : 'var(--border-strong)'}`, transition: 'background .2s, border-color .2s' }} />
                          <div style={{ position: 'absolute', top: '3px', left: s.enabled ? '17px' : '3px', width: '12px', height: '12px', borderRadius: '50%', background: s.enabled ? 'var(--accent-ink)' : 'var(--text-faint)', boxShadow: s.enabled ? '0 0 6px var(--accent-glow-50)' : 'none', transition: 'left .2s, background .2s' }} />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: s.enabled ? '#e0e0e0' : 'var(--text-muted)', transition: 'color .15s' }}>
                          {svc.name}
                        </div>
                      </div>
                      <span style={{ ...mono, fontSize: '10px', color: s.enabled ? 'var(--text-muted)' : '#2a2a2a' }}>
                        ${svc.setupRate} setup · ${svc.mrrRate}/mo
                      </span>
                    </div>

                    {s.enabled && (
                      <div style={{ padding: '14px', background: 'var(--bg-nav)', borderTop: '1px solid #111' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>New clients / mo</div>
                            <SliderInput label="" value={s.newClients} min={0} max={5} onChange={(v: number) => setAiField(svc.key, 'newClients', v)} />
                            <div style={{ ...mono, fontSize: '10px', fontWeight: 700, color: 'var(--accent-ink)', marginTop: '6px' }}>
                              {s.newClients} × ${svc.setupRate} = {fmtCAD(s.newClients * svc.setupRate)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>Retained clients</div>
                            <SliderInput label="" value={s.retained} min={0} max={10} onChange={(v: number) => setAiField(svc.key, 'retained', v)} />
                            <div style={{ ...mono, fontSize: '10px', fontWeight: 700, color: '#0d9488', marginTop: '6px' }}>
                              {s.retained} × ${svc.mrrRate} = {fmtCAD(s.retained * svc.mrrRate)}/mo
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Bundle banner — no emoji */}
              {enabledCount >= 3 && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: '8px', fontSize: '12px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: '#F59E0B', flexShrink: 0 }} />
                  <span><strong>Bundle discount applied</strong> — $250/mo off client MRR for 3+ services</span>
                </div>
              )}
            </>
          )}

          {/* ── ACTUALS MODE ──────────────────────────────────────────── */}
          {mode === 'actuals' && (
            <>
              <SectionHeader label="Earned To Date" />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>Real data from approved closes. Recurring projected from retained clients.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                {[
                  { lbl: 'Marketing Closes', val: approvedCloses.length, sub: `${approvedCloses.filter((c: any) => c.pts === 1).length} flat · ${approvedCloses.filter((c: any) => c.pts >= 2).length} recurring`, clr: 'var(--text-primary)' },
                  { lbl: 'One-time Earned',  val: fmtCAD(flatApproved + flatRecApproved), sub: 'Flat commissions', clr: 'var(--accent-ink)' },
                  { lbl: 'AI Closes',        val: '—', sub: 'Coming soon', clr: 'var(--text-faint)' },
                  { lbl: 'Active MRR',       val: recurApproved > 0 ? fmtCAD(recurApproved) + '/mo' : '$0/mo', sub: 'Recurring / month', clr: '#22c55e' },
                ].map((item, i) => (
                  <div key={i} style={{ background: 'var(--bg-elev-pill)', border: '1px solid var(--border-soft)', borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ ...mono, fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '4px' }}>{item.lbl}</div>
                    <div style={{ ...mono, fontWeight: 800, fontSize: '18px', color: item.clr }}>{item.val}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.sub}</div>
                  </div>
                ))}
              </div>

              <SectionHeader label="Pending" />
              {pendingCloses.length > 0 ? (
                <div style={{ background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <PulseDot />
                  <span>{pendingCloses.length} close{pendingCloses.length > 1 ? 's' : ''} pending director approval — {pendingCloses.map((c: any) => c.product_label || `${c.pts}pt`).join(', ')}. Points added once approved.</span>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>No pending closes.</div>
              )}
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* RIGHT PANEL — output                                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>

          {/* Sticky output header — cyan top border as panel edge */}
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(0,0,0,.98)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--accent-glow-25)', borderBottom: '1px solid #111', padding: '14px 28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ ...mono, fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>Monthly Income</div>
              <div style={{ ...mono, fontSize: '32px', fontWeight: 800, color: 'var(--accent-ink)', lineHeight: 1 }}>{fmtCAD(totalMonthly)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '22px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...mono, fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', letterSpacing: '.08em', textTransform: 'uppercase' }}>Annual Rate</div>
                <div style={{ ...mono, fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>{fmtCAD(annualRunRate)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...mono, fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', letterSpacing: '.08em', textTransform: 'uppercase' }}>Tier</div>
                <span style={{ ...mono, fontSize: '10px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', letterSpacing: '.1em', textTransform: 'uppercase', display: 'inline-block', whiteSpace: 'nowrap', background: tier.badge.bg, border: `1px solid ${tier.badge.border}`, color: tier.badge.color }}>
                  {tier.name.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Right body */}
          <div style={{ padding: '24px 28px 64px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Tier progress card — with corner brackets */}
            <div style={{ position: 'relative', padding: '16px 20px', borderRadius: '12px', border: `1px solid ${tier.badge.border}`, background: tier.badge.bg }}>
              <Brackets color={tier.badge.border} size={8} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Active Tier</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: tier.color }}>{tier.name}</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(0,0,0,.3)', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ height: '100%', borderRadius: '2px', background: tier.barColor, width: `${tier.at ? Math.min((totalPoints / tier.at) * 100, 100) : 100}%`, transition: 'width .7s ease' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...mono, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{totalCloses}</div>
                    <div style={{ ...mono, fontSize: '8px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: '2px' }}>Closes</div>
                  </div>
                  <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,.1)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...mono, fontSize: '20px', fontWeight: 800, color: tier.badge.color, lineHeight: 1 }}>{totalPoints}</div>
                    <div style={{ ...mono, fontSize: '8px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: '2px' }}>Points</div>
                  </div>
                  {tier.next && (
                    <>
                      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,.1)' }} />
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{tier.at! - totalPoints}</span> pts to {tier.next}
                      </div>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={undoClose} style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'var(--bg-elev-1)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>−</button>
                  <button onClick={() => setPickerOpen(true)} style={{ padding: '6px 14px', borderRadius: '7px', background: 'var(--accent-glow-10)', border: '1px solid var(--accent-glow-35)', color: 'var(--accent-ink)', cursor: 'pointer', fontSize: '11px', fontWeight: 800, letterSpacing: '.05em', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>+ Close</button>
                </div>
              </div>
            </div>

            {/* Pending alert — pulse dot, no emoji */}
            {pendingCloses.length > 0 && (
              <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: '8px', fontSize: '12px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PulseDot />
                <span><strong>{pendingCloses.length} close{pendingCloses.length > 1 ? 's' : ''} pending approval</strong> — {pendingCloses.map((c: any) => c.product_label || `${c.pts}pt`).join(', ')}. Points added once director approves.</span>
              </div>
            )}

            {/* Stacked bar chart */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ ...mono, fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Income Breakdown</div>
                <span style={{ ...mono, fontSize: '9px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', background: 'rgba(107,114,128,.1)', color: '#9ca3af', border: '1px solid rgba(107,114,128,.2)' }}>
                  {mode === 'predict' ? 'Forecast' : 'Confirmed'}
                </span>
              </div>
              <div style={{ height: '28px', background: 'var(--bg-elev-1)', borderRadius: '6px', overflow: 'hidden', display: 'flex', border: '1px solid var(--border-soft)' }}>
                {totalMonthly === 0 ? (
                  <div style={{ width: '100%', background: 'var(--bg-sidebar-line)' }} />
                ) : (
                  <>
                    <div title="Flat Closes"  style={{ width: `${pct(flatTotal)}%`,      height: '100%', background: 'var(--accent-ink)', transition: 'width .45s cubic-bezier(.4,0,.2,1)' }} />
                    <div title="Recurring"    style={{ width: `${pct(recurringIncome)}%`, height: '100%', background: '#22c55e', transition: 'width .45s cubic-bezier(.4,0,.2,1)' }} />
                    <div title="AI Setup"     style={{ width: `${pct(aiSetupIncome)}%`,   height: '100%', background: '#a855f7', transition: 'width .45s cubic-bezier(.4,0,.2,1)' }} />
                    <div title="AI MRR"       style={{ width: `${pct(aiMrrIncome)}%`,     height: '100%', background: '#f59e0b', transition: 'width .45s cubic-bezier(.4,0,.2,1)' }} />
                    <div title="Override"     style={{ width: `${pct(overrideIncome)}%`,  height: '100%', background: '#60a5fa', transition: 'width .45s cubic-bezier(.4,0,.2,1)' }} />
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                {[['var(--accent-ink)','Closes'],['#22c55e','Recurring'],['#a855f7','AI Setup'],['#f59e0b','AI MRR'],['#60a5fa','Override']].map(([color, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: color, flexShrink: 0 }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Income stream rows — with corner brackets on the card */}
            <div className="card" style={{ position: 'relative', padding: '16px 20px' }}>
              <Brackets color="var(--accent-glow-22)" size={8} />
              <StreamRow color="var(--accent-ink)" name="Flat Closes"   sub={`${websitePerWeek}/wk websites + ${newRecCloses} tier closes`}                                                             amt={flatTotal} />
              <StreamRow color="#22c55e" name="Recurring 7%" sub={`${foundationClients} Foundation + ${authorityClients} Authority`}                                                          amt={recurringIncome} locked={!tier.hasRecurring} />
              <StreamRow color="#60a5fa" name="Override 3%"  sub={tier.hasOverride ? `${managedReps} reps × ${repsPerWeek}/wk × $15 × 4` : 'Unlocks at Manager (25 pts)'}                  amt={overrideIncome}  locked={!tier.hasOverride} />
              <StreamRow color="#a855f7" name="AI Setup"     sub={enabledCount > 0 ? `${enabledCount} service${enabledCount > 1 ? 's' : ''} — new client commissions` : 'No AI services active'} amt={aiSetupIncome} />
              <StreamRow color="#f59e0b" name="AI Recurring" sub={enabledCount > 0 ? `${enabledCount} service${enabledCount > 1 ? 's' : ''} MRR${bundleDiscount > 0 ? ' (bundle discount)' : ''}` : 'No retained AI clients'} amt={aiMrrIncome} last />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '12px', borderTop: '1px solid #111', marginTop: '4px' }}>
                <div>
                  <div style={{ ...mono, fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em' }}>Monthly Total</div>
                  <div style={{ ...mono, fontSize: '10px', color: 'var(--border-strong)', marginTop: '2px' }}>{fmtCAD(annualRunRate)} / year</div>
                </div>
                <div style={{ ...mono, fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)' }}>{fmtCAD(totalMonthly)}</div>
              </div>
            </div>

            {/* Goal targets */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Icon name="zap" size={13} style={{ color: 'var(--accent-ink)' }} />
                <span style={{ ...mono, fontSize: '10px', fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--accent-ink)' }}>Goal Targets</span>
              </div>
              <div style={{ border: '1px solid var(--border-soft)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 68px 68px', padding: '8px 16px', background: 'var(--bg-elev-2)', gap: '10px', borderBottom: '1px solid #111' }}>
                  {['Goal', '', 'Closes/wk', 'Calls/day'].map((h, i) => (
                    <span key={i} style={{ ...mono, fontSize: '9px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-faint)', textAlign: i > 1 ? 'right' : 'left' }}>{h}</span>
                  ))}
                </div>
                {goalRows.map((row, i) => {
                  const progress = Math.min((websitePerWeek / row.closes) * 100, 100);
                  const achieved = websitePerWeek >= row.closes;
                  const active   = !achieved && progress > 0;
                  const goalColor = achieved ? '#22c55e' : active ? 'var(--accent-ink)' : '#2a2a2a';
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 68px 68px', alignItems: 'center', padding: '10px 16px', borderBottom: i < 3 ? '1px solid var(--bg-elev-1)' : 'none', background: achieved ? 'rgba(34,197,94,.03)' : active ? 'rgba(0,240,255,.03)' : 'transparent', gap: '10px', transition: 'background .2s' }}>
                      <span style={{ ...mono, fontSize: '12px', fontWeight: 800, color: goalColor }}>{row.goal}</span>
                      <div style={{ height: '4px', background: 'var(--bg-sidebar-line)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '2px', background: achieved ? '#22c55e' : 'var(--accent-ink)', width: `${progress}%`, transition: 'width .45s cubic-bezier(.4,0,.2,1)' }} />
                      </div>
                      <span style={{ ...mono, fontSize: '11px', textAlign: 'right', color: goalColor }}>{row.closes}</span>
                      <span style={{ ...mono, fontSize: '11px', textAlign: 'right', color: 'var(--text-muted)' }}>{row.calls}+</span>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: '10px', color: '#2a2a2a', marginTop: '8px' }}>Recurring and AI income not included. Field Commander+ stacks significantly exceed these figures.</p>
            </div>

            {/* 10K Blueprint */}
            <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'var(--accent-glow-04)', border: '1px solid var(--accent-glow-12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Icon name="zap" size={13} />
                <span style={{ ...mono, fontSize: '10px', fontWeight: 800, color: 'var(--accent-ink)', letterSpacing: '.12em', textTransform: 'uppercase' }}>The 10K Blueprint</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.7, margin: 0 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>$10,000 CAD/mo</span> = 5 closes/week × $500 × 4 weeks.{' '}
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>5 closes/week</span> = ~1 close/day at quota.{' '}
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Add even one AI service</span> and the number grows without extra calls.
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default LadderPanel;
