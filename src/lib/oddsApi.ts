// Sports odds — read from Supabase live_fixtures table.
// Source of truth: GitHub Actions cron syncs odds-api.io → Supabase every 20 minutes.
// Frontend NEVER calls odds-api.io directly (no API key in browser, no rate limits for users).

const SB_URL = "https://cjzjrnagpsdmolvbkhnu.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqempybmFncHNkbW9sdmJraG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0ODY4NCwiZXhwIjoyMDk1OTI0Njg0fQ.TmowEatc4g2xpD-GT0r-jofX1zCtXjTD-s4LF7JSs6o";
const SH = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

export interface OddsMatch {
  id: string;
  sport: string;
  league: string;
  home: string;
  away: string;
  date: string;
  status: "upcoming" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
  markets: Record<string, Record<string, number>>;
  bookmakerCount: number;
}

export const SPORTS = [
  { slug: "football",          name: "Football",     icon: "⚽" },
  { slug: "basketball",        name: "Basketball",   icon: "🏀" },
  { slug: "tennis",            name: "Tennis",       icon: "🎾" },
  { slug: "american-football", name: "Am. Football", icon: "🏈" },
  { slug: "baseball",          name: "Baseball",     icon: "⚾" },
  { slug: "ice-hockey",        name: "Ice Hockey",   icon: "🏒" },
  { slug: "mixed-martial-arts",name: "MMA",          icon: "🥊" },
  { slug: "esports",           name: "Esports",      icon: "🎮" },
] as const;

const _cache = new Map<string, { t: number; d: OddsMatch[] }>();
const CACHE_TTL = 30_000;

export async function fetchOddsMatches(sportSlug: string): Promise<OddsMatch[]> {
  const cached = _cache.get(sportSlug);
  if (cached && Date.now() - cached.t < CACHE_TTL) return cached.d;

  try {
    const nowIso = new Date(Date.now() - 60 * 60_000).toISOString();
    const url = `${SB_URL}/rest/v1/live_fixtures?sport=eq.${encodeURIComponent(sportSlug)}&commence_time=gte.${nowIso}&order=commence_time.asc&limit=80`;
    const r = await fetch(url, { headers: SH });
    if (!r.ok) return [];
    const rows: any[] = await r.json();

    const out: OddsMatch[] = rows.map(row => {
      let markets: Record<string, Record<string, number>> = {};
      try {
        const parsed = typeof row.markets_data === "string" ? JSON.parse(row.markets_data) : row.markets_data;
        // Normalize: ensure all values are numbers
        for (const [mk, sels] of Object.entries(parsed || {})) {
          const clean: Record<string, number> = {};
          for (const [sel, odd] of Object.entries(sels as any)) {
            const n = parseFloat(odd as any);
            if (!isNaN(n) && n > 1) clean[sel] = n;
          }
          if (Object.keys(clean).length) markets[mk] = clean;
        }
      } catch { markets = {}; }

      return {
        id: String(row.id),
        sport: row.sport,
        league: row.league || "League",
        home: row.home_team,
        away: row.away_team,
        date: row.commence_time,
        status: row.status === "live" ? "live" : row.status === "finished" ? "finished" : "upcoming",
        homeScore: row.home_score,
        awayScore: row.away_score,
        markets,
        bookmakerCount: 2,
      };
    }).filter(m => Object.keys(m.markets).length > 0);

    // Sort: live first
    out.sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (a.status !== "live" && b.status === "live") return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    _cache.set(sportSlug, { t: Date.now(), d: out });
    return out;
  } catch {
    return [];
  }
}

// Legacy API surface (kept so Sports.tsx doesn't break)
export function hasOddsApiKey() { return true; }
export function setOddsApiKey(_k: string) {}
export function getOddsApiKey() { return ""; }
export async function pingOddsApi() { return { ok: true }; }
