// Premmisus Sales Portal — Build Journal Reader
//
// Director-only. Reads deploy/BUILD-JOURNAL.md from disk, parses it into
// discrete entries, and returns them as JSON for the in-portal viewer.
//
// File-tracing: see next.config.mjs `outputFileTracingIncludes['/api/journal']`
// — without that, the markdown file is dropped from the serverless bundle.
//
// Entry format expected (newest first, the same convention the file already
// uses):
//
//   <a id="2026-05-02-some-tag"></a>
//   ## 2026-05-02 #some-tag — Title text
//
//   **Status:** ✅ Shipped
//   ...body...
//
//   ---  (entries separated by markdown horizontal rules)
//
// We split on `^## YYYY-MM-DD ` headers, then peel out date · tag · title ·
// status from the header + first ~10 lines of each body.

import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { requireDirector } from '@/lib/api-auth';
import { reportServerError } from '@/lib/server-error';

export const dynamic = 'force-dynamic';

type JournalStatus = 'shipped' | 'stub' | 'pending' | 'unknown';

type Entry = {
  id: string;          // url-safe slug for anchor / React key
  date: string;        // YYYY-MM-DD
  tag: string | null;  // hash-tag without the leading '#'
  title: string;       // header text after the dash
  status: JournalStatus;
  body: string;        // full markdown body (without the ## header line)
};

const HEADER_REGEX = /^##\s+(\d{4}-\d{2}-\d{2})\b\s*(?:#([\w-]+))?\s*(?:[—\-:]\s*(.+))?$/;

function parseStatus(body: string): JournalStatus {
  const head = body.slice(0, 600);
  if (/Status:\s*✅|Shipped to main|✅\s*Shipped/i.test(head)) return 'shipped';
  if (/🟡\s*STUB|Status:\s*🟡/i.test(head)) return 'stub';
  if (/⏸|Pending|Status:\s*Pending/i.test(head)) return 'pending';
  return 'unknown';
}

function slugify(date: string, tag: string | null, idx: number): string {
  return `${date}-${(tag || `entry-${idx}`).toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
}

function parseJournal(raw: string): Entry[] {
  // Strip everything before the first `## ` header — the file has a preamble.
  const firstHeader = raw.search(/^##\s+\d{4}-\d{2}-\d{2}/m);
  const body = firstHeader === -1 ? '' : raw.slice(firstHeader);
  if (!body) return [];

  // Split on markdown horizontal rule between entries. Each chunk should
  // start with a `## YYYY-MM-DD ...` header.
  const chunks = body.split(/\n---+\n/);
  const entries: Entry[] = [];
  let idx = 0;
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const lines = trimmed.split('\n');
    const headerLine = lines[0] || '';
    const match = HEADER_REGEX.exec(headerLine);
    if (!match) continue;
    const [, date, tag, titleRaw] = match;
    const title = (titleRaw || '').trim() || '(untitled)';
    const entryBody = lines.slice(1).join('\n').trim();
    entries.push({
      id: slugify(date, tag || null, idx),
      date,
      tag: tag || null,
      title,
      status: parseStatus(entryBody),
      body: entryBody,
    });
    idx += 1;
  }
  return entries;
}

export async function GET(request: Request) {
  const auth = await requireDirector(request);
  if (auth.ok !== true) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const journalPath = path.join(process.cwd(), 'BUILD-JOURNAL.md');
  let raw = '';
  try {
    raw = await fs.readFile(journalPath, 'utf8');
  } catch (err) {
    await reportServerError('journal/read', err, { path: journalPath }, 'settings-portal-health');
    return NextResponse.json({
      entries: [],
      error: 'BUILD-JOURNAL.md not bundled with this deployment. Check next.config outputFileTracingIncludes.',
    }, { status: 500 });
  }

  const entries = parseJournal(raw);
  const tags = Array.from(new Set(entries.map((e) => e.tag).filter((t): t is string => Boolean(t)))).sort();

  return NextResponse.json({
    entries,
    tags,
    total: entries.length,
    read_at: new Date().toISOString(),
  });
}
