'use client';

interface LogoProps {
  height?: number;
}

const Logo = ({ height = 32 }: LogoProps) => (
  <div style={{height, display:'flex', alignItems:'center'}}>
    <img src="/logo.png" alt="Premmisus" style={{height:'100%', objectFit:'contain'}}
      onError={(e)=>{ (e.target as HTMLImageElement).style.display='none'; ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display='flex'; }} />
    <div style={{display:'none', alignItems:'center', gap:'8px'}}>
      <div style={{width:height, height, borderRadius:'7px', background:'var(--accent-ink)', display:'flex', alignItems:'center', justifyContent:'center'}}>
        <span style={{color:'var(--bg-app)', fontWeight:900, fontSize: height * 0.45 + 'px'}}>P</span>
      </div>
      <span style={{color:'var(--text-primary)', fontWeight:900, fontSize: height * 0.65 + 'px', letterSpacing:'-.01em'}}>PREMMISUS</span>
    </div>
  </div>
);

export default Logo;
