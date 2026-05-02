'use client';

import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/Icon';
import { getTierInfo } from '@/lib/constants';

export default function ProfileDropdown({ userName, userEmail, totalCloses, totalPoints, onLogout, onShortcuts, onSettings, actuallyDirector, viewAsRep, onToggleView, shadowMode, shadowRepName, allReps, enterShadow, exitShadow }: any) {
  const [shadowListOpen, setShadowListOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const initials = userName ? userName.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '??';
  const code = (() => { try { return localStorage.getItem('pmss_code') || ''; } catch { return ''; } })();
  const tierInfo = getTierInfo(totalPoints);
  const tier = tierInfo.name;
  const tierColor = tierInfo.badge.color;
  const tierBg = tierInfo.badge.bg;
  const tierBorder = tierInfo.badge.border;
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button aria-label="Open profile menu" aria-expanded={open} onClick={() => setOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'transparent', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '4px 10px 4px 4px', cursor: 'pointer', transition: 'border-color .2s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#2e2e2e')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}>
        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(0,240,255,.12)', border: '1px solid rgba(0,240,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#00F0FF', fontFamily: 'Inter,sans-serif', flexShrink: 0 }}>{initials}</div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#888', fontFamily: 'Inter,sans-serif', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</span>
        <span style={{ color: '#333', fontSize: '9px', lineHeight: 1 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '230px', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: '12px', boxShadow: '0 16px 48px rgba(0,0,0,.85)', zIndex: 500, overflow: 'hidden' }} className="fadein">
          <div style={{ padding: '14px', borderBottom: '1px solid #111' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,240,255,.1)', border: '1px solid rgba(0,240,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#00F0FF', fontFamily: 'Inter,sans-serif', flexShrink: 0 }}>{initials}</div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'Inter,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
                <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#444', fontFamily: 'Roboto,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.06em', textTransform: 'uppercase', background: tierBg, color: tierColor, border: `1px solid ${tierBorder}` }}>{tier} Rep</span>
              {code && <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.06em', background: 'rgba(255,255,255,.03)', color: '#333', border: '1px solid #1a1a1a' }}>{code}</span>}
              <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.06em', background: 'rgba(0,240,255,.05)', color: '#555', border: '1px solid #1a1a1a' }}>{totalCloses} closes · {totalPoints} pts</span>
            </div>
          </div>
          <div style={{ padding: '6px' }}>
            <button onClick={() => {
                setOpen(false);
                if (onSettings) onSettings();
                else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pmss:open-settings'));
              }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '7px', background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '12px', fontFamily: 'Inter,sans-serif', textAlign: 'left', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#666'; }}>
              <span style={{ fontSize: '13px', width: '16px', textAlign: 'center' }}>⚙</span> Settings
            </button>
            {onShortcuts && (
              <button onClick={() => { setOpen(false); onShortcuts(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '7px', background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '12px', fontFamily: 'Inter,sans-serif', textAlign: 'left', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#666'; }}>
                <span style={{ fontSize: '13px', width: '16px', textAlign: 'center' }}>⌨</span> Keyboard Shortcuts
              </button>
            )}
            {actuallyDirector && !shadowMode && (
              <button onClick={() => { onToggleView(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '7px', background: viewAsRep ? 'rgba(245,158,11,.07)' : 'none', border: 'none', cursor: 'pointer', color: viewAsRep ? '#F59E0B' : '#666', fontSize: '12px', fontFamily: 'Inter,sans-serif', textAlign: 'left', transition: 'all .15s' }}
                onMouseEnter={e => { if (!viewAsRep) { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={e => { if (!viewAsRep) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#666'; } }}>
                <Icon name={viewAsRep ? 'eye' : 'eyeOff'} size={13} /> {viewAsRep ? 'Rep View Active' : 'Switch to Rep View'}
              </button>
            )}
            {actuallyDirector && (
              <div>
                {shadowMode ? (
                  <button onClick={() => { setOpen(false); exitShadow(); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '7px', background: 'rgba(245,158,11,.1)', border: 'none', cursor: 'pointer', color: '#F59E0B', fontSize: '12px', fontFamily: 'Inter,sans-serif', textAlign: 'left', transition: 'all .15s' }}>
                    <Icon name="eye" size={13} /> Exit Shadow: {shadowRepName}
                  </button>
                ) : (
                  <div>
                    <button onClick={() => setShadowListOpen(s => !s)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '9px 10px', borderRadius: '7px', background: shadowListOpen ? 'rgba(245,158,11,.05)' : 'none', border: 'none', cursor: 'pointer', color: shadowListOpen ? '#F59E0B' : '#666', fontSize: '12px', fontFamily: 'Inter,sans-serif', textAlign: 'left', transition: 'all .15s' }}
                      onMouseEnter={e => { if (!shadowListOpen) { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#fff'; } }}
                      onMouseLeave={e => { if (!shadowListOpen) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#666'; } }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        Shadow View
                      </span>
                      <span style={{ fontSize: '10px', transition: 'transform .15s', transform: shadowListOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▸</span>
                    </button>
                    {shadowListOpen && allReps && allReps.length > 0 && (
                      <div style={{ padding: '4px 0 4px 20px', borderLeft: '2px solid rgba(245,158,11,.2)', marginLeft: '18px', marginTop: '2px' }}>
                        {allReps.map((rep: any) => (
                          <button key={rep.id} onClick={() => { setOpen(false); setShadowListOpen(false); enterShadow(rep.id, rep.name); }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '11px', fontFamily: 'Inter,sans-serif', textAlign: 'left', transition: 'all .15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,.06)'; e.currentTarget.style.color = '#F59E0B'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#888'; }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: '#F59E0B', flexShrink: 0 }}>{rep.name.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}</div>
                            {rep.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div style={{ height: '1px', background: '#111', margin: '4px 2px' }} />
            <button onClick={() => { setOpen(false); onLogout(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '7px', background: 'none', border: 'none', cursor: 'pointer', color: '#ff6060', fontSize: '12px', fontFamily: 'Inter,sans-serif', textAlign: 'left', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,68,68,.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <Icon name="logout" size={13} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
