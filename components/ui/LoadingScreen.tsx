'use client';

export default function LoadingScreen() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
      <div style={{textAlign:'center'}}>
        <div className="pulse" style={{width:'12px',height:'12px',margin:'0 auto 16px'}}/>
        <p style={{color:'#333',fontSize:'11px',fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',fontFamily:'Inter,sans-serif'}}>Loading Portal...</p>
      </div>
    </div>
  );
}
