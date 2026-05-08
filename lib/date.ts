const TZ = 'America/Toronto';

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayInToronto(): string {
  return dateFmt.format(new Date());
}

function torontoOffset(instant: Date): string {
  const offsetFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' });
  const part = offsetFmt.formatToParts(instant).find(p => p.type === 'timeZoneName')?.value;
  const m = part?.match(/GMT([+-]\d{2}:\d{2})?/);
  return m?.[1] || '+00:00';
}

export function torontoDayBoundsUTC(ymd?: string): { startUTC: string; endUTC: string } {
  const date = ymd || todayInToronto();
  const probe = new Date(`${date}T12:00:00Z`);
  const offset = torontoOffset(probe);
  const startUTC = new Date(`${date}T00:00:00.000${offset}`).toISOString();
  const endUTC = new Date(`${date}T23:59:59.999${offset}`).toISOString();
  return { startUTC, endUTC };
}

export function weekStartInToronto(): string {
  const todayYMD = todayInToronto();
  const probe = new Date(`${todayYMD}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(probe);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = map[weekday] ?? 0;
  const [y, m, d] = todayYMD.split('-').map(Number);
  const sunday = new Date(Date.UTC(y, m - 1, d - dow));
  const sy = sunday.getUTCFullYear();
  const sm = String(sunday.getUTCMonth() + 1).padStart(2, '0');
  const sd = String(sunday.getUTCDate()).padStart(2, '0');
  return `${sy}-${sm}-${sd}`;
}
