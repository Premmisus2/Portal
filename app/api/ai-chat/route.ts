// Premmisus AI Command Center — Next.js App Router
// Director: full Supabase access + actions (Level 3)
// Rep: sales coach only (Level 1)

import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

// ── Supabase helper (uses service role key to bypass RLS) ──
async function sbQuery(path: string, options: { method?: string; body?: any; params?: Record<string, string> } = {}) {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  if (options.params) Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'PATCH' ? 'return=minimal' : 'return=representation',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (options.method === 'PATCH' || options.method === 'DELETE') return { success: true };
  return res.json();
}

// ── Tool definitions for Anthropic Claude tool use ──
const DIRECTOR_TOOLS = [
  {
    name: 'query_leads',
    description: 'Query leads from the database. Can filter by status, niche, assigned rep, city, or get all leads. Returns lead data including business name, contact, phone, status, niche, city, priority.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: new, contacted, voicemail, callback, not_interested, booked, discovery_completed, no_show, wrong_number' },
        niche: { type: 'string', description: 'Filter by niche (e.g. cleaning, plumbing, landscaping, construction, pressure_washing, window_washing)' },
        assigned_rep_id: { type: 'string', description: 'Filter by assigned rep ID' },
        city: { type: 'string', description: 'Filter by city name (partial match)' },
        limit: { type: 'number', description: 'Max results to return (default 20)' },
      },
    },
  },
  {
    name: 'query_pipeline_stats',
    description: 'Get pipeline statistics — count of leads in each status stage. Returns an object with status counts and conversion rates.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'query_reps',
    description: 'Get all reps and their performance data — closes, points, tier, last close date.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'query_call_logs',
    description: 'Get recent call log entries. Can filter by rep, outcome, or niche.',
    input_schema: {
      type: 'object',
      properties: {
        rep_id: { type: 'string', description: 'Filter by rep ID' },
        outcome: { type: 'string', description: 'Filter by call outcome' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'query_handoffs',
    description: 'Get recent director handoffs with company, niche, pain point, next step, and rep info.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'update_lead_status',
    description: 'Update the status of one or more leads. Use this when the director asks to change a lead status, mark leads as contacted, booked, no-show, etc.',
    input_schema: {
      type: 'object',
      properties: {
        lead_ids: { type: 'array', items: { type: 'string' }, description: 'Array of lead IDs to update' },
        status: { type: 'string', description: 'New status: new, contacted, voicemail, callback, not_interested, booked, discovery_completed, no_show, wrong_number' },
      },
      required: ['lead_ids', 'status'],
    },
  },
  {
    name: 'assign_leads',
    description: 'Assign one or more leads to a specific rep. Use when the director says things like "assign all plumbing leads to Jordan" or "give these to Sarah".',
    input_schema: {
      type: 'object',
      properties: {
        lead_ids: { type: 'array', items: { type: 'string' }, description: 'Array of lead IDs to assign' },
        rep_id: { type: 'string', description: 'The rep ID to assign leads to' },
      },
      required: ['lead_ids', 'rep_id'],
    },
  },
  {
    name: 'bulk_assign_by_filter',
    description: 'Assign all leads matching a filter to a rep. Use when director says "assign all [niche] leads to [rep]" without specifying individual IDs.',
    input_schema: {
      type: 'object',
      properties: {
        niche: { type: 'string', description: 'Filter by niche' },
        status: { type: 'string', description: 'Filter by status (default: new)' },
        city: { type: 'string', description: 'Filter by city' },
        rep_id: { type: 'string', description: 'Rep ID to assign to' },
        rep_name: { type: 'string', description: 'Rep name (used to look up ID if rep_id not known)' },
      },
      required: ['rep_id'],
    },
  },
  {
    name: 'post_announcement',
    description: 'Post a team announcement visible to all reps on the portal home screen. Use when director says "announce to the team" or "post a message for reps".',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Announcement title' },
        message: { type: 'string', description: 'Announcement body text' },
        priority: { type: 'string', enum: ['normal', 'urgent'], description: 'Priority level (default: normal)' },
      },
      required: ['title', 'message'],
    },
  },
];

// ── Rep tools (scoped to the requesting rep's own data) ──
const REP_TOOLS = [
  {
    name: 'get_recent_call_transcript',
    description: "Fetch the requesting rep's recent recorded call transcripts so you can ground coaching on what actually happened on the call. Returns up to N transcripts, each with business_name, outcome, duration_seconds, created_at, and the transcript text (auto-generated by Gemini from the Twilio recording — speaker labels are 'Speaker 1' / 'Speaker 2'; you'll need to infer which is the rep from context). Use this whenever the rep asks for feedback on a specific call, mentions a lead by name, or asks 'how did I do' / 'coach me on my last call'. Don't volunteer transcripts unsolicited — use only when grounding your advice in actual dialogue would be more useful than generic script. Always scoped to the requesting rep's own calls (cannot read other reps' transcripts).",
    input_schema: {
      type: 'object',
      properties: {
        business_name: {
          type: 'string',
          description: 'Optional case-insensitive partial-match filter on the lead\'s business name (e.g. "Smith Plumbing"). Use when the rep mentions a specific lead.',
        },
        outcome: {
          type: 'string',
          description: 'Optional filter by call outcome. Useful for pattern coaching like "review my no-shows". Values: booked_call, callback_requested, no_answer, voicemail_left, not_interested, wrong_number, discovery_completed.',
        },
        limit: {
          type: 'number',
          description: 'Max results, default 5, capped at 10.',
        },
      },
    },
  },
];

// ── Tool execution ──
type ToolCtx = { repId: string | null; isDirector: boolean };

async function executeTool(name: string, args: any, ctx: ToolCtx): Promise<string> {
  switch (name) {
    case 'query_leads': {
      let path = 'leads?select=id,business_name,contact_name,phone,status,niche,city,priority,assigned_rep_id,created_at&order=created_at.desc';
      if (args.status) path += `&status=eq.${args.status}`;
      if (args.niche) path += `&niche=eq.${args.niche}`;
      if (args.assigned_rep_id) path += `&assigned_rep_id=eq.${args.assigned_rep_id}`;
      if (args.city) path += `&city=ilike.*${args.city}*`;
      path += `&limit=${args.limit || 20}`;
      const data = await sbQuery(path);
      return JSON.stringify(data);
    }
    case 'query_pipeline_stats': {
      const data = await sbQuery('leads?select=status');
      const counts: Record<string, number> = {};
      (data as any[]).forEach((l: any) => { counts[l.status] = (counts[l.status] || 0) + 1; });
      const total = (data as any[]).length;
      return JSON.stringify({ total, by_status: counts });
    }
    case 'query_reps': {
      const reps = await sbQuery('reps?select=id,name,email,role,created_at&order=created_at.asc');
      const closes = await sbQuery('closes?select=id,rep_id,pts,status,product_label,created_at&status=eq.approved&order=created_at.desc');
      const closesMap: Record<string, any[]> = {};
      (closes as any[]).forEach((c: any) => {
        if (!closesMap[c.rep_id]) closesMap[c.rep_id] = [];
        closesMap[c.rep_id].push(c);
      });
      const enriched = (reps as any[]).map((r: any) => {
        const rc = closesMap[r.id] || [];
        return {
          ...r,
          totalCloses: rc.length,
          totalPoints: rc.reduce((s: number, c: any) => s + c.pts, 0),
          lastClose: rc.length > 0 ? rc[0].created_at : null,
        };
      });
      return JSON.stringify(enriched);
    }
    case 'query_call_logs': {
      let path = 'call_logs?select=*&order=created_at.desc';
      if (args.rep_id) path += `&rep_id=eq.${args.rep_id}`;
      if (args.outcome) path += `&outcome=eq.${args.outcome}`;
      path += `&limit=${args.limit || 20}`;
      const data = await sbQuery(path);
      return JSON.stringify(data);
    }
    case 'query_handoffs': {
      const data = await sbQuery(`handoffs?select=*,reps(name)&order=created_at.desc&limit=${args.limit || 20}`);
      return JSON.stringify(data);
    }
    case 'update_lead_status': {
      for (const id of args.lead_ids) {
        await sbQuery(`leads?id=eq.${id}`, {
          method: 'PATCH',
          body: { status: args.status, updated_at: new Date().toISOString() },
        });
      }
      return JSON.stringify({ success: true, updated: args.lead_ids.length, new_status: args.status });
    }
    case 'assign_leads': {
      for (const id of args.lead_ids) {
        await sbQuery(`leads?id=eq.${id}`, {
          method: 'PATCH',
          body: { assigned_rep_id: args.rep_id, updated_at: new Date().toISOString() },
        });
      }
      return JSON.stringify({ success: true, assigned: args.lead_ids.length });
    }
    case 'bulk_assign_by_filter': {
      let path = 'leads?select=id&status=eq.' + (args.status || 'new');
      if (args.niche) path += `&niche=eq.${args.niche}`;
      if (args.city) path += `&city=ilike.*${args.city}*`;
      const leads = await sbQuery(path) as any[];
      const ids = leads.map((l: any) => l.id);
      if (ids.length === 0) return JSON.stringify({ success: true, assigned: 0, message: 'No leads matched the filter' });
      for (const id of ids) {
        await sbQuery(`leads?id=eq.${id}`, {
          method: 'PATCH',
          body: { assigned_rep_id: args.rep_id, updated_at: new Date().toISOString() },
        });
      }
      return JSON.stringify({ success: true, assigned: ids.length });
    }
    case 'post_announcement': {
      await sbQuery('announcements', {
        method: 'POST',
        body: {
          title: args.title,
          message: args.message,
          priority: args.priority || 'normal',
          created_at: new Date().toISOString(),
        },
      });
      return JSON.stringify({ success: true, title: args.title });
    }
    case 'get_recent_call_transcript': {
      // Hard-scope to the requesting rep — prevents cross-rep transcript reads via this tool.
      // Note: repId currently comes from client. Hardening (validate via Supabase JWT) is a
      // separate audit item; tracked in BUILD-JOURNAL.md watch-for for #ai-coach-transcript.
      if (!ctx.repId) {
        return JSON.stringify({ error: 'No rep_id in session — cannot fetch transcripts.' });
      }
      const limit = Math.min(Math.max(parseInt(String(args.limit ?? 5), 10) || 5, 1), 10);
      let path = `call_logs?select=id,business_name,outcome,duration_seconds,created_at,transcript,transcript_status&rep_id=eq.${ctx.repId}&order=created_at.desc&limit=${limit}`;
      if (args.business_name) path += `&business_name=ilike.*${encodeURIComponent(args.business_name)}*`;
      if (args.outcome) path += `&outcome=eq.${encodeURIComponent(args.outcome)}`;
      // Only return rows that actually have a transcript — saves Claude tokens on noise
      path += `&transcript_status=eq.completed&transcript=not.is.null`;
      const rows = (await sbQuery(path)) as any[];
      // Truncate each transcript to last 1500 chars to control context cost while keeping
      // recent dialogue (which is usually where the close/objection happens).
      const trimmed = (rows || []).map((r: any) => ({
        id: r.id,
        business_name: r.business_name || 'Unknown',
        outcome: r.outcome,
        duration_seconds: r.duration_seconds,
        created_at: r.created_at,
        transcript_excerpt: typeof r.transcript === 'string' && r.transcript.length > 1500
          ? '…(earlier dialogue truncated)…\n' + r.transcript.slice(-1500)
          : r.transcript,
      }));
      if (trimmed.length === 0) {
        return JSON.stringify({
          results: [],
          message: 'No transcripts found for this rep with those filters. Either the rep has no completed transcripts yet, or the filters returned no matches.',
        });
      }
      return JSON.stringify({ results: trimmed, count: trimmed.length });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ── System prompts ──
const DIRECTOR_SYSTEM = `You are the Premmisus AI Command Center — Elliott's operational assistant built directly into the Director Dashboard.

You have FULL access to the Premmisus database. You can query leads, reps, call logs, handoffs, pipeline stats, and take actions like assigning leads, updating statuses, and posting announcements.

═══════════════════════════════════════
WHO YOU'RE TALKING TO
═══════════════════════════════════════
Elliott Cuthbert — Founder/Director of Premmisus (premmisus.ca)
Canadian digital marketing agency targeting trades businesses (cleaning, landscaping, plumbing, construction/handyman, pressure washing, window washing)

═══════════════════════════════════════
WHAT YOU CAN DO
═══════════════════════════════════════
DATA QUERIES:
- "How many leads are in callback?" → query_pipeline_stats
- "Show me all plumbing leads in Markham" → query_leads with filters
- "Who has the most closes?" → query_reps
- "What calls did we make today?" → query_call_logs
- "Show recent handoffs" → query_handoffs

ACTIONS:
- "Assign all new cleaning leads to Jordan" → bulk_assign_by_filter
- "Mark lead X as no-show" → update_lead_status
- "Post announcement: team meeting tomorrow at 3pm" → post_announcement
- "Move these leads to contacted" → update_lead_status

═══════════════════════════════════════
BUSINESS CONTEXT
═══════════════════════════════════════
OFFER STACK:
- 0.5 Offer: $1,500 website ($500 deposit + $1,000 on delivery), 5-day turnaround
- 1.0: $1,599 USD/mo lead gen (Meta ads + AI CRM)
- 2.0: $2,999/mo lead gen + CRM nurturing
- 3.0: $5,999 full stack (everything except AI automation)
- 4.0: $8K–$15K integrated AI automation + full stack
- Maintenance: $99 CAD/mo

ICP: Canadian trades businesses, under 60 Google reviews, weak/no website
Lead priority: HOT=0-19 reviews, HIGH=20-59, MEDIUM=60-100

PIPELINE STAGES: New → Contacted/Voicemail → Callback → Booked → Discovery Done / No Show
Drop-offs: Not Interested, Wrong Number

GHL LOCATION: "Premmisus Operations" (ugg4v4G1WJMtqGcWFUp5)
Strategy Call Calendar ID: UgbkluKHfhueTcf7vlfT

COMMISSION TIERS:
- Junior (0-9 closes): 7% website packages
- Senior (10-24): + lead gen pitch unlocked, 7% recurring
- Manager (25+): + 3% override on managed reps

═══════════════════════════════════════
HOW TO RESPOND
═══════════════════════════════════════
- Be direct, concise, and operational
- When asked about data, USE YOUR TOOLS — don't guess
- When taking actions, confirm what you did with specifics (e.g. "Assigned 12 cleaning leads to Jordan")
- If Elliott asks something strategic, give a real answer — you know the business
- Format data clearly with counts and key details
- Never say "I don't have access" — you DO have access, use the tools
- If a query returns no results, say so clearly`;

const REP_SYSTEM = (userName: string, currentView: string) => `You are the Premmisus AI Sales Coach — a real-time assistant built directly into the Premmisus Sales Command portal. You know everything about the company, the products, the sales process, and how this portal works. Reps may be on a live call right now — be fast, direct, and useful.

═══════════════════════════════════════
COMPANY OVERVIEW
═══════════════════════════════════════
Company: Premmisus (premmisus.ca)
Founder/Director: Elliott Cuthbert (elliott@premmisus.com)
Type: Canadian digital marketing agency
Market: Blue-collar industrial & trades businesses across ALL of Canada
Target niches: cleaning, landscaping, plumbing, construction/handyman, pressure washing, window washing, and similar trades
Mission: Give Canadian trades businesses a real digital revenue engine — not just a pretty website

═══════════════════════════════════════
THE PRODUCTS
═══════════════════════════════════════
1. WEBSITE PACKAGE — $1,500 CAD total
   - $500 deposit + $1,000 on delivery
   - 5-day turnaround
   - This is the "0.5 Offer" / Entry Offer — a low-risk way for the prospect to test Premmisus before committing to lead gen
   - Rep earns: $500 CAD flat

2. 1.0 LEAD GEN SYSTEM — $1,599 USD/month (~$2,200 CAD/month)
   - Full system: Meta ads + AI CRM that responds to inbound leads in under 30 seconds
   - This solves "Lead Decay"
   - Rep earns: 7% recurring monthly (~$154 CAD/month per active client)
   - Unlocks at Senior tier (10+ closes)

3. MAINTENANCE PLAN — $99 CAD/month

═══════════════════════════════════════
THE CORE PITCH — LEAD DECAY
═══════════════════════════════════════
The single biggest pain point for every trades business: they get leads but lose them because nobody follows up in time. 78% of customers go with the first business that responds. Our AI CRM responds in under 30 seconds, 24/7. That's the hook.

The pitch isn't "we'll build you a website." The pitch is: "Right now, leads are falling through the cracks while you're on a job. Our system captures them, responds instantly, and books them — while you're busy working."

═══════════════════════════════════════
THE 0.5 OFFER (ENTRY STRATEGY)
═══════════════════════════════════════
Never lead with $1,599/month. Lead with the $1,500 website as a low-risk entry point. Once they're a client and see results, upselling the lead gen system is natural.

If they hesitate: "It's $500 to start — less than a single missed job. And it's done in 5 days."

═══════════════════════════════════════
COMMON OBJECTIONS — QUICK ANSWERS
═══════════════════════════════════════
"I already have a website" → "The website isn't the main thing we do. We're solving lead decay — the gap between someone finding you and actually booking. Does that happen to you?"
"Send me more info" → Soft stall. "Totally — what should I highlight, the lead side or the website itself?" Then send Post-Call SMS immediately.
"I'll think about it" → "Totally fair. Just so I can follow up with the right info — is it the price, the timing, or something else?"
"How many clients do you have?" → "We work with trades businesses across Canada building lead systems that convert. What matters for you is whether we can solve YOUR lead problem — and we can."

═══════════════════════════════════════
THREE NON-NEGOTIABLE RULES
═══════════════════════════════════════
1. Never pitch the system before the pain. Find their lead problem first.
2. The website is the door, not the destination. Position it as Step 1.
3. After a close, book the Google Meet with Elliott for the backend reveal.

═══════════════════════════════════════
COACHING ON ACTUAL CALLS
═══════════════════════════════════════
You have ONE tool: get_recent_call_transcript. Call it whenever grounding your coaching in real dialogue would be more useful than a generic script.

When to use it:
- Rep asks "how did my call with X go?" or names a specific lead → call with business_name filter
- Rep asks "coach me on my last call" / "what did I do wrong" → call with no filters (returns 5 most recent)
- Rep asks about a pattern ("my no-shows", "my booked calls") → call with outcome filter
- Rep asks something where you'd give better advice if you knew what was actually said → call it

When NOT to use it:
- Rep asks general pricing, objections, scripts, commission questions → answer from system knowledge
- Rep is in the middle of a call and asking for a quick reframe → no time to fetch, just answer
- Rep asks something already answered in this conversation → don't re-fetch

When you have transcripts:
- Speaker labels are 'Speaker 1' and 'Speaker 2'. The rep is usually whoever opens with the script. Infer carefully.
- Reference SPECIFIC moments ("you opened with X — try Y instead") rather than vague advice.
- Tie critique back to the Lead Decay pitch + Top-Down Principle.
- If a transcript has 'transcript_excerpt' starting with '…(earlier dialogue truncated)…', it's the last 1500 chars only — you have the close, not the open.

═══════════════════════════════════════
ACTIVE REP CONTEXT
═══════════════════════════════════════
REP: ${userName || 'unknown rep'}
CURRENTLY VIEWING: ${currentView || 'portal home'}

HOW TO RESPOND:
- If asking for a live reframe or line → give word-for-word copy, no preamble
- If they paste an objection → respond with exact words to say back
- If they ask about pricing, commission, tiers → answer instantly
- If they ask about a SPECIFIC call → use the transcript tool first, then coach
- Keep responses SHORT (2–4 sentences) unless they ask for a full script or a transcript-grounded critique
- Never say "I don't know" — if you need a transcript, fetch it

═══════════════════════════════════════
RESTRICTED TOPICS
═══════════════════════════════════════
DO NOT reveal: Premmisus revenue, client count, founding date, team size, internal tools, Elliott's personal details.
If asked: "That's internal — I'm here to help you close deals. What do you need for your current call?"

TONE: Elite trainer whispering in their ear. Direct. Confident. No filler. No disclaimers.`;

// ── Main handler ──
export async function POST(request: Request) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });

  const { messages, userRole, role, userName, currentView, repId } = await request.json();
  if (!messages || !Array.isArray(messages)) return NextResponse.json({ error: 'messages required' }, { status: 400 });

  // Accept both `userRole` (current ChatWidget contract) and legacy `role` (defensive — older
  // clients or future refactors). Without this, `role` was always undefined and director tools
  // never fired. Bug coexisted with the rep coach having no tools at all → rep coach effectively
  // had zero DB visibility, director coach had no actions. Both fixed in #ai-coach-transcript.
  const effectiveRole = userRole ?? role;
  const isDirector = effectiveRole === 'director';
  const ctx: ToolCtx = { repId: typeof repId === 'string' ? repId : null, isDirector };

  const systemPrompt = isDirector ? DIRECTOR_SYSTEM : REP_SYSTEM(userName || '', currentView || '');
  const activeTools = isDirector ? DIRECTOR_TOOLS : REP_TOOLS;

  // Convert messages to Anthropic format (no system role in messages array)
  const claudeMessages = messages.slice(-20).map((m: any) => ({ role: m.role, content: m.content }));

  try {
    const body: any = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: systemPrompt,
      messages: claudeMessages,
      tools: activeTools,
    };

    let response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    let data = await response.json();

    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 502 });

    let toolResults: string[] = [];

    // Handle tool use (up to 3 rounds)
    let rounds = 0;
    while (data.stop_reason === 'tool_use' && rounds < 3) {
      rounds++;
      const toolUseBlocks = (data.content || []).filter((b: any) => b.type === 'tool_use');

      // Add assistant response to messages
      claudeMessages.push({ role: 'assistant', content: data.content });

      // Execute tools and build tool_result blocks
      const toolResultBlocks: any[] = [];
      for (const block of toolUseBlocks) {
        const result = await executeTool(block.name, block.input || {}, ctx);
        toolResults.push(`[${block.name}]`);
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }

      // Add tool results as user message
      claudeMessages.push({ role: 'user', content: toolResultBlocks });

      // Call Claude again with tool results — use the SAME tools the role started with
      // (don't accidentally hand reps director tools mid-conversation)
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          system: systemPrompt,
          messages: claudeMessages,
          tools: activeTools,
        }),
      });
      data = await response.json();
    }

    // Extract text from response content blocks
    const textBlocks = (data.content || []).filter((b: any) => b.type === 'text');
    const reply = textBlocks.map((b: any) => b.text).join('\n') || 'No response generated.';

    return NextResponse.json({
      reply,
      toolsUsed: toolResults.length > 0 ? toolResults : undefined,
    });
  } catch (error: any) {
    console.error('AI chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
