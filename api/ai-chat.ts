// Premmisus AI Command Center — Vercel serverless function
// Director: full Supabase access + actions (Level 3)
// Rep: sales coach only (Level 1)

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

// ── Tool execution ──
async function executeTool(name: string, args: any): Promise<string> {
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
      const closes = await sbQuery('closes?select=id,rep_id,pts,created_at&order=created_at.desc');
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
- 0.5 Offer: $1,000 website ($500/$500 split), 5-day turnaround
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
1. WEBSITE PACKAGE — $1,000 CAD total
   - $500 upfront + $500 on completion
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
Never lead with $1,599/month. Lead with the $1,000 website as a low-risk entry point. Once they're a client and see results, upselling the lead gen system is natural.

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
ACTIVE REP CONTEXT
═══════════════════════════════════════
REP: ${userName || 'unknown rep'}
CURRENTLY VIEWING: ${currentView || 'portal home'}

HOW TO RESPOND:
- If asking for a live reframe or line → give word-for-word copy, no preamble
- If they paste an objection → respond with exact words to say back
- If they ask about pricing, commission, tiers → answer instantly
- Keep responses SHORT (2–4 sentences) unless they ask for a full script
- Never say "I don't know"

═══════════════════════════════════════
RESTRICTED TOPICS
═══════════════════════════════════════
DO NOT reveal: Premmisus revenue, client count, founding date, team size, internal tools, Elliott's personal details.
If asked: "That's internal — I'm here to help you close deals. What do you need for your current call?"

TONE: Elite trainer whispering in their ear. Direct. Confident. No filler. No disclaimers.`;

// ── Main handler ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'Anthropic API key not configured' });

  const { messages, role, userName, currentView } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' });

  const isDirector = role === 'director';
  const systemPrompt = isDirector ? DIRECTOR_SYSTEM : REP_SYSTEM(userName || '', currentView || '');

  // Convert messages to Anthropic format (no system role in messages array)
  const claudeMessages = messages.slice(-20).map((m: any) => ({ role: m.role, content: m.content }));

  try {
    const body: any = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: systemPrompt,
      messages: claudeMessages,
    };
    if (isDirector) body.tools = DIRECTOR_TOOLS;

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

    if (data.error) return res.status(502).json({ error: data.error.message });

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
        const result = await executeTool(block.name, block.input || {});
        toolResults.push(`[${block.name}]`);
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }

      // Add tool results as user message
      claudeMessages.push({ role: 'user', content: toolResultBlocks });

      // Call Claude again with tool results
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
          tools: DIRECTOR_TOOLS,
        }),
      });
      data = await response.json();
    }

    // Extract text from response content blocks
    const textBlocks = (data.content || []).filter((b: any) => b.type === 'text');
    const reply = textBlocks.map((b: any) => b.text).join('\n') || 'No response generated.';

    return res.status(200).json({
      reply,
      toolsUsed: toolResults.length > 0 ? toolResults : undefined,
    });
  } catch (error: any) {
    console.error('AI chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
