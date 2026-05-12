'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Icon from '@/components/ui/Icon';
import { DIRECTOR_EMAILS, PORTAL_AUTH_WEBHOOK } from '@/lib/constants';
import { audit } from '@/lib/audit';

const Logo = ({ height = 32 }: { height?: number }) => (
  <div style={{height, display:'flex', alignItems:'center'}}>
    <img src="/logo.png" alt="Premmisus" style={{height:'100%', objectFit:'contain'}} />
  </div>
);

export default function LoginView({ onLogin }: { onLogin: any }) {
  // Default to 'signin' if already registered on this device, else 'register'
  const isRegistered = () => { try { return !!localStorage.getItem('pmss_code'); } catch { return false; } };
  const [tab, setTab]         = useState(isRegistered() ? 'signin' : 'register');
  const [regForm, setRegForm] = useState({ name:'', email:'', password:'', code:'' });
  const [sigForm, setSigForm] = useState({
    email:    (() => { try { return localStorage.getItem('pmss_email') || ''; } catch { return ''; } })(),
    password: '',
  });
  const [showRegPass, setShowRegPass] = useState(false);
  const [showSigPass, setShowSigPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // ── Register (Supabase Auth + invite code) ───────────────────
  const handleRegister = async (e: any) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const code = regForm.code.trim().toUpperCase();
    if (!code.startsWith('PMSS-') || code.length < 8) {
      setError('Invalid code format. Codes look like PMSS-YOURNAME-01.');
      setLoading(false); return;
    }
    const repName = regForm.name.trim() || regForm.email.split('@')[0] || 'Rep';
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: regForm.email.trim(),
        password: regForm.password,
      });
      if (authErr) throw authErr;
      const role = DIRECTOR_EMAILS.includes(regForm.email.trim().toLowerCase()) ? 'director' : 'rep';
      const { data: repData, error: repErr } = await supabase.from('reps').insert({
        auth_id: authData.user!.id,
        name: repName,
        email: regForm.email.trim(),
        invite_code: code,
        role: role,
      }).select().single();
      if (repErr) throw repErr;
      try {
        localStorage.setItem('pmss_user', repName);
        localStorage.setItem('pmss_email', regForm.email);
        localStorage.setItem('pmss_code', code);
      } catch {}
      try { fetch(`${PORTAL_AUTH_WEBHOOK}?action=validateCode&code=${encodeURIComponent(code)}&name=${encodeURIComponent(repName)}&email=${encodeURIComponent(regForm.email)}`, { mode:'no-cors' }); } catch {}
      audit({
        actorRepId: repData.id, actorEmail: regForm.email.trim(), actorRole: role,
        actionType: 'auth.registered',
        targetType: 'rep', targetId: repData.id,
        metadata: { invite_code: code, role },
      });
      try {
        fetch('/api/notify-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'auth_signed_up', repName, email: regForm.email.trim() }),
        }).catch(() => {});
      } catch {}
      setLoading(false);
      onLogin(repName, regForm.email, code, repData.id, role);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Try again.');
      setLoading(false);
    }
  };

  // ── Sign In (Supabase Auth) ─────────────────────────────────
  const handleSignIn = async (e: any) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: sigForm.email.trim(),
        password: sigForm.password,
      });
      if (authErr) throw authErr;
      const { data: repData, error: repErr } = await supabase.from('reps')
        .select('*')
        .eq('auth_id', authData.user.id)
        .single();
      if (repErr) throw repErr;
      if (repData.active === false) {
        await supabase.auth.signOut();
        throw new Error('This account has been deactivated. Contact your director to restore access.');
      }
      try {
        localStorage.setItem('pmss_user', repData.name);
        localStorage.setItem('pmss_email', repData.email);
        localStorage.setItem('pmss_code', repData.invite_code);
      } catch {}
      audit({
        actorRepId: repData.id, actorEmail: repData.email, actorRole: repData.role,
        actionType: 'auth.signed_in',
        targetType: 'rep', targetId: repData.id,
      });
      try {
        fetch('/api/notify-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'auth_signed_in', repName: repData.name, email: repData.email }),
        }).catch(() => {});
      } catch {}
      setLoading(false);
      onLogin(repData.name, repData.email, repData.invite_code, repData.id, repData.role);
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Check your email and password.');
      setLoading(false);
    }
  };

  const inputField = ({ label, icon, type, placeholder, value, onChange, autoComplete, upperCase, showToggle, onToggle, showingText }: any) => (
    <div>
      <label style={{display:'block', fontSize:'10px', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'6px', fontFamily:'JetBrains Mono, monospace'}}>{label}</label>
      <div style={{position:'relative'}}>
        <div style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--text-faint)', pointerEvents:'none'}}><Icon name={icon} size={14}/></div>
        <input className="field" style={{paddingLeft:'38px', paddingRight: showToggle?'42px':'16px', textTransform: upperCase?'uppercase':'none', letterSpacing: upperCase?'.08em':'normal'}}
          type={showingText ? 'text' : type} placeholder={placeholder} value={value} autoComplete={autoComplete}
          onChange={onChange} required/>
        {showToggle && (
          <button type="button" onClick={onToggle}
            style={{position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:0, display:'flex'}}>
            <Icon name={showingText?'eyeOff':'eye'} size={14}/>
          </button>
        )}
      </div>
    </div>
  );

  const spinner = <svg style={{animation:'spin 1s linear infinite'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;

  return (
    <div style={{minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg-app)', position:'relative', overflow:'hidden'}}>
      <div className="grid-bg" style={{position:'absolute', inset:0, opacity:.6, pointerEvents:'none'}}/>
      <div className="login-glare" style={{position:'absolute', inset:0, pointerEvents:'none'}}/>
      <div style={{position:'relative', zIndex:10, width:'100%', maxWidth:'420px', padding:'0 24px'}}>

        {/* Logo */}
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'36px'}}>
          <div style={{marginBottom:'16px'}}><Logo height={52}/></div>
          <p style={{fontSize:'10px', fontWeight:700, letterSpacing:'.3em', textTransform:'uppercase', color:'var(--text-faint)', margin:0, fontFamily:'JetBrains Mono, monospace'}}>Sales Operations Portal</p>
          <div className="divider" style={{width:'80px', marginTop:'12px'}}/>
        </div>

        <div className="card-glow" style={{padding:'32px'}}>

          {/* Tabs */}
          <div style={{display:'flex', gap:'4px', marginBottom:'28px', background:'var(--bg-elev-pill)', borderRadius:'8px', padding:'4px'}}>
            {([['signin','Sign In'],['register','Register']] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => { setTab(key); setError(''); }}
                style={{flex:1, padding:'8px 0', borderRadius:'6px', border:'none', cursor:'pointer', fontFamily:'Inter, sans-serif', fontSize:'13px', fontWeight:700, transition:'all .2s',
                  background: tab===key ? 'var(--accent-glow-10)' : 'transparent',
                  color: tab===key ? 'var(--accent-ink)' : 'var(--text-tertiary)',
                  boxShadow: tab===key ? '0 0 0 1px var(--accent-glow-30)' : 'none',
                }}>{label}</button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{background:'rgba(255,68,68,.08)', border:'1px solid rgba(255,68,68,.25)', borderRadius:'8px', padding:'10px 14px', marginBottom:'16px'}}>
              <p style={{margin:0, fontSize:'12px', color:'var(--red)', fontFamily:'Roboto, sans-serif'}}>{error}</p>
            </div>
          )}

          {/* ── SIGN IN TAB ── */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} autoComplete="on" style={{display:'flex', flexDirection:'column', gap:'16px'}}>
              {inputField({ label:'Email Address', icon:'mail', type:'email', placeholder:'you@premmisus.com', value:sigForm.email, onChange:(e: any)=>setSigForm(p=>({...p,email:e.target.value})), autoComplete:'username' })}
              {inputField({ label:'Password', icon:'lock', type:'password', placeholder:'••••••••••', value:sigForm.password, onChange:(e: any)=>setSigForm(p=>({...p,password:e.target.value})), autoComplete:'current-password', showToggle:true, onToggle:()=>setShowSigPass(p=>!p), showingText:showSigPass })}
              <div style={{paddingTop:'4px'}}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <span style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>{spinner} Signing in...</span> : 'Sign In \u2192'}
                </button>
              </div>
              <p style={{margin:0, textAlign:'center', fontSize:'12px', color:'var(--text-faint)', fontFamily:'Roboto, sans-serif'}}>
                New device?{' '}
                <button type="button" onClick={() => { setTab('register'); setError(''); }}
                  style={{background:'none', border:'none', color:'var(--accent-ink)', cursor:'pointer', fontSize:'12px', fontFamily:'Roboto, sans-serif', padding:0, textDecoration:'underline'}}>
                  Register with your invite code
                </button>
              </p>
            </form>
          )}

          {/* ── REGISTER TAB ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} autoComplete="on" style={{display:'flex', flexDirection:'column', gap:'16px'}}>
              {inputField({ label:'Full Name', icon:'user', type:'text', placeholder:'Your full name', value:regForm.name, onChange:(e: any)=>setRegForm(p=>({...p,name:e.target.value})), autoComplete:'name' })}
              {inputField({ label:'Email Address', icon:'mail', type:'email', placeholder:'you@premmisus.com', value:regForm.email, onChange:(e: any)=>setRegForm(p=>({...p,email:e.target.value})), autoComplete:'username' })}
              {inputField({ label:'Password', icon:'lock', type:'password', placeholder:'Create a password', value:regForm.password, onChange:(e: any)=>setRegForm(p=>({...p,password:e.target.value})), autoComplete:'new-password', showToggle:true, onToggle:()=>setShowRegPass(p=>!p), showingText:showRegPass })}
              {inputField({ label:'Invite Code', icon:'key', type:'text', placeholder:'e.g. PMSS-YOURNAME-01', value:regForm.code, onChange:(e: any)=>setRegForm(p=>({...p,code:e.target.value})), autoComplete:'off', upperCase:true })}
              <div style={{paddingTop:'4px'}}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <span style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>{spinner} Verifying...</span> : 'Create Account \u2192'}
                </button>
              </div>
              <p style={{margin:0, textAlign:'center', fontSize:'12px', color:'var(--text-faint)', fontFamily:'Roboto, sans-serif'}}>
                Already registered?{' '}
                <button type="button" onClick={() => { setTab('signin'); setError(''); }}
                  style={{background:'none', border:'none', color:'var(--accent-ink)', cursor:'pointer', fontSize:'12px', fontFamily:'Roboto, sans-serif', padding:0, textDecoration:'underline'}}>
                  Sign in instead
                </button>
              </p>
            </form>
          )}

        </div>
        <p style={{textAlign:'center', color:'var(--text-faint)', fontSize:'11px', marginTop:'20px', letterSpacing:'.15em', textTransform:'uppercase', fontFamily:'JetBrains Mono, monospace'}}>Premmisus · Internal Access Only</p>
      </div>
    </div>
  );
}
