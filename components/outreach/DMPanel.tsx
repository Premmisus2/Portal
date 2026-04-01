'use client';

import { useState } from 'react';
import { Body, SecH } from '@/components/ui/Typography';
import ScriptBlock from '@/components/shared/ScriptBlock';
import OutreachNote from '@/components/shared/OutreachNote';
import OutreachRule from '@/components/shared/OutreachRule';

const DM_TABS = [
  { id: 'instagram', label: 'Instagram', num: '10A' },
  { id: 'linkedin',  label: 'LinkedIn',  num: '10B' },
  { id: 'facebook',  label: 'Facebook',  num: '10C' },
];

const DMPanel = () => {
  const [activeTab, setActiveTab] = useState('instagram');
  return (
    <div>
      <div style={{ marginBottom: '6px' }}><span className="tag">10</span></div>
      <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#fff', margin: '8px 0 4px' }}>DM Scripts</h2>
      <Body>Research every prospect before messaging. Reference something real and specific — never generic copy-paste.</Body>
      <div className="divider" style={{ margin: '16px 0' }} />
      <OutreachRule title="Rule — Touch 1 Goal">The only goal of Touch 1 is a reply. Do not mention pricing, services, or retainers. One question, then stop.</OutreachRule>
      <OutreachRule title="Rule — Preview Unlocks Your Best Opener">Once a preview exists for a niche, switch to the Preview scripts immediately. They convert faster.</OutreachRule>
      <div style={{ display: 'flex', gap: '6px', margin: '16px 0 20px', borderBottom: '1px solid #1a1a1a', paddingBottom: '12px' }}>
        {DM_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '7px 16px', borderRadius: '7px', cursor: 'pointer', border: '1px solid', fontSize: '12px', fontWeight: 700, fontFamily: 'Inter,sans-serif', transition: 'all .15s', outline: 'none',
              background: activeTab === tab.id ? 'rgba(0,240,255,.08)' : 'transparent',
              borderColor: activeTab === tab.id ? 'rgba(0,240,255,.4)' : '#1e1e1e',
              color: activeTab === tab.id ? '#00F0FF' : '#555',
            }}>
            <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.15em', marginRight: '6px', opacity: .6 }}>{tab.num}</span>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'instagram' && (
        <div className="fadein">
          <SecH>Scenario A — No Preview (Gap / Improvement)</SecH>
          <OutreachNote>Use this tonight. Default until an industry preview is built.</OutreachNote>
          <ScriptBlock touch="Touch 1 — Cold Open" timing="Send now">{"Hey [First Name] — I came across [Business Name] while looking through [niche] companies in [City]. Quick question — is your current website actually pulling in leads, or is it more of a placeholder at this point?"}</ScriptBlock>
          <OutreachNote>Stop there. Wait for a reply before sending Touch 2.</OutreachNote>
          <ScriptBlock touch="Touch 2 — Follow-Up" timing="24h, no reply">{"Hey [First Name] — following up. I specialize in building lead systems for Canadian [niche] businesses — not just websites, but the full engine: ads, CRM, and AI follow-up in under 30 seconds. I noticed a specific gap in your setup I think you'd want to see. Two minutes?"}</ScriptBlock>
          <ScriptBlock touch="Touch 3 — Final" timing="48h after Touch 2">{"Last one from me, [First Name]. Had some specific notes on [Business Name] I thought would be useful — happy to share if the timing's ever right. Good luck either way."}</ScriptBlock>
          <SecH>Scenario B — Preview Available</SecH>
          <OutreachNote>Switch to these immediately once a cleaning / plumbing / landscaping preview is built.</OutreachNote>
          <ScriptBlock touch="Touch 1 — Pre-Built Preview" timing="Send now" variant="preview">{"Hey [First Name] — I actually went ahead and built a custom website preview for [Business Name]. Noticed your current site has a few gaps that are probably costing you leads. No commitment — want me to send it over?"}</ScriptBlock>
          <ScriptBlock touch="Touch 2 — Follow-Up" timing="24h, no reply" variant="preview">{"Hey [First Name] — just checking if you got my last message. The preview is ready. I'm reviewing it with my director tonight and wanted your input before we finalize the local SEO structure for [City]."}</ScriptBlock>
          <ScriptBlock touch="Touch 3 — Final" timing="48h after Touch 2" variant="preview">{"Last message, I promise. Preview's still here if you want it, [First Name]. If not — no worries at all. Good luck this season."}</ScriptBlock>
        </div>
      )}
      {activeTab === 'linkedin' && (
        <div className="fadein">
          <OutreachNote>Send a connection request note first (300 char limit). Message after they accept. If open profile, DM directly.</OutreachNote>
          <ScriptBlock touch="Connection Request Note" timing="300 char limit">{"Hi [First Name] — I work with Canadian trades businesses on lead generation. Noticed [Business Name] while researching your market. Wanted to connect and share a quick observation. No pitch."}</ScriptBlock>
          <ScriptBlock touch="Touch 1 — After Connection Accepted" timing="">{"Hi [First Name], thanks for connecting. I'll get straight to it — I specialize in helping Canadian [niche] businesses build proper lead infrastructure. I was looking at [Business Name]'s online presence and noticed [specific gap — e.g. \"you're not running any Meta ads\" / \"your site isn't built to capture leads\"]. We've built systems for similar businesses generating 8–15 qualified leads per month. Worth a 10-minute call this week?"}</ScriptBlock>
          <ScriptBlock touch="Touch 2 — Follow-Up" timing="48h, no reply">{"Following up, [First Name]. I know you're busy running the business day-to-day — that's exactly why this matters. Most [niche] businesses in Canada are losing high-margin jobs to competitors who simply respond to leads faster. Our system handles that automatically. 10 minutes, no fluff — worth it?"}</ScriptBlock>
          <ScriptBlock touch="Touch 3 — Final" timing="72h after Touch 2">{"Last message from me, [First Name]. Just want to make sure you have the option. If the timing's off, feel free to reach back out when it makes sense."}</ScriptBlock>
        </div>
      )}
      {activeTab === 'facebook' && (
        <div className="fadein">
          <ScriptBlock touch="Touch 1 — Cold Open" timing="Send now">{"Hey [First Name] — came across [Business Name]'s page and had a quick look at your online setup. Honest question: are you happy with the number of quality leads coming through right now? I work with Canadian [niche] businesses on exactly that. Happy to share what I noticed if you're open to it."}</ScriptBlock>
          <ScriptBlock touch="Touch 2 — Follow-Up" timing="24h, no reply">{"Hey [First Name] — just circling back. I had a specific observation about [Business Name]'s setup that I think would be worth 2 minutes of your time. We help Canadian [niche] businesses build lead systems that actually convert — not just websites. Worth a quick look?"}</ScriptBlock>
          <ScriptBlock touch="Touch 3 — Final" timing="48h after Touch 2">{"Last message, [First Name]. Whatever you're doing online, I hope it's working well for you. If you ever want a second set of eyes on your lead setup, I'm here. Good luck with everything."}</ScriptBlock>
        </div>
      )}
    </div>
  );
};

export default DMPanel;
