'use client';

import { Body, SecH } from '@/components/ui/Typography';
import ScriptBlock from '@/components/shared/ScriptBlock';
import OutreachRule from '@/components/shared/OutreachRule';

const SMSPanel = () => (
  <div>
    <div style={{ marginBottom: '6px' }}><span className="tag">12</span></div>
    <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 4px' }}>SMS Sequences — Warm Leads</h2>
    <Body>SMS is for warm leads only. Never cold-SMS a prospect who hasn't heard of Premmisus.</Body>
    <div className="divider" style={{ margin: '16px 0' }} />
    <OutreachRule title="When to Use SMS">Only for leads you've already spoken with, who showed interest, or who were referred. Cold SMS violates CASL and destroys trust.</OutreachRule>
    <SecH>Sequence A — Reconnect (3+ days since last contact)</SecH>
    <ScriptBlock touch="SMS 1 — Reconnect" timing="Send now">{"Hey [First Name], it's Elliott from Premmisus. Following up from [context — e.g. \"our call last week\" / \"when we connected on Instagram\"]. I've put some specific thoughts together for [Business Name] — do you have 10 minutes this week for a quick call?"}</ScriptBlock>
    <ScriptBlock touch="SMS 2 — Value Add" timing="24h, no reply">{"Hey [First Name] — quick one. I was looking at [Business Name]'s online footprint and noticed [specific observation]. Our system typically adds 8–15 qualified leads/month for businesses in your space. Honestly worth a 10-minute conversation."}</ScriptBlock>
    <ScriptBlock touch="SMS 3 — Final" timing="48h after SMS 2">{"Last follow-up from me, [First Name]. If the timing's off, I completely get it. When you're ready to look at your lead setup, just text me back. Door's open."}</ScriptBlock>
    <SecH>Sequence B — Post-Call ("Send me more info")</SecH>
    <ScriptBlock touch="SMS 1 — The Link Drop" timing="Send immediately after call">{"Hey [First Name], it's Elliott from Premmisus. Here's that info I mentioned on the call: [link or details]. The piece I'd focus on is [specific thing, e.g. \"the AI follow-up section\"] — that's what closes the gap on missed leads. Let me know when you've had a look."}</ScriptBlock>
    <ScriptBlock touch="SMS 2 — Nudge" timing="4–6h later, no reply">{"Just making sure you got that, [First Name]. I'm reviewing this with my director tonight — wanted to see if you had any questions before we move forward on your end."}</ScriptBlock>
    <ScriptBlock touch="SMS 3 — Final" timing="Next morning, no reply">{"Morning [First Name] — last nudge from me. Happy to jump on a 10-minute call today or tomorrow to walk through it live if that's easier than reading. Just say the word."}</ScriptBlock>
  </div>
);

export default SMSPanel;
