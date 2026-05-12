'use client';

import { Body, SecH } from '@/components/ui/Typography';
import ScriptBlock from '@/components/shared/ScriptBlock';
import OutreachRule from '@/components/shared/OutreachRule';
import SubjectLine from '@/components/shared/SubjectLine';

const EmailPanel = () => (
  <div>
    <div style={{ marginBottom: '6px' }}><span className="tag">11</span></div>
    <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 4px' }}>Email Outreach — 3-Touch Cold Sequence</h2>
    <Body>Cold B2B emails to publicly-listed business addresses are CASL-compliant. Always include your name, company, and opt-out line.</Body>
    <div className="divider" style={{ margin: '16px 0' }} />
    <OutreachRule title="CASL Compliance">Cold B2B emails are permitted under implied consent when the recipient is a business and their email is publicly visible. Always include: your name, company name, and "Reply STOP to be removed."</OutreachRule>
    <OutreachRule title="Subject Lines">Keep them specific and name-dropped. "[Business Name] — I noticed something" outperforms any generic subject. Never use emoji or all-caps in subject lines.</OutreachRule>
    <SecH>Email 1 — Cold Open</SecH>
    <SubjectLine>[Business Name] — I noticed something</SubjectLine>
    <ScriptBlock touch="" timing="">{"Hi [First Name],\n\nI'll keep this short.\n\nI was researching [niche] businesses in [City] and came across [Business Name]. I noticed [specific observation — e.g. \"you're not running any Meta or Google ads\" / \"your website isn't built to capture leads\" / \"you have fewer than 30 Google reviews\"] — and in your market, that's costing you jobs to competitors who are set up properly.\n\nWe work exclusively with Canadian trades businesses — cleaning, plumbing, landscaping, construction — building lead systems that generate 8–15 qualified leads per month.\n\nThe entry point is a $1,500 custom website built specifically for lead capture. No long-term retainer. You pay $500 to start, $1,000 when it's live and you love it.\n\nWorth a 10-minute call this week?\n\nElliott\nPremmisus\n[phone]\n\nReply STOP to be removed."}</ScriptBlock>
    <SecH>Email 2 — Follow-Up</SecH>
    <SubjectLine>Re: [Business Name] — I noticed something</SubjectLine>
    <ScriptBlock touch="" timing="48h, no reply">{"Hey [First Name],\n\nJust bumping this up.\n\nQuick question — is improving your lead flow something you're actively looking at right now, or is it not a priority this season?\n\nEither answer is fine. Just want to make sure I'm reaching out at the right time.\n\nElliott"}</ScriptBlock>
    <SecH>Email 3 — Final</SecH>
    <SubjectLine>Last one from me</SubjectLine>
    <ScriptBlock touch="" timing="72h after Email 2">{"Hey [First Name],\n\nLast email — I know your inbox stays full.\n\nWe're onboarding a couple of Canadian [niche] businesses right now. If you'd like to see what that looks like, happy to share. If not, no worries at all.\n\nGood luck with everything.\n\nElliott\nPremmisus"}</ScriptBlock>
  </div>
);

export default EmailPanel;
