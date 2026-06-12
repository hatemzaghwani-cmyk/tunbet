// TunBet Sportsbook client
// Primary data source: TunBet Node backend (/api/matches) fed by ESPN scoreboards and
// DraftKings odds exposed by ESPN where available. If the backend/tunnel is unreachable,
// the UI falls back to Supabase live_fixtures cache.

const SB_URL = "https://cjzjrnagpsdmolvbkhnu.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqempybmFncHNkbW9sdmJraG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0ODY4NCwiZXhwIjoyMDk1OTI0Njg0fQ.TmowEatc4g2xpD-GT0r-jofX1zCtXjTD-s4LF7JSs6o";
const SH = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

// Render.com backend (free permanent URL) — update after deploying backend
const RENDER_BACKEND = "https://tunbet-sportsbook.onrender.com";

const DEFAULT_SPORTSBOOK_API = RENDER_BACKEND;
const FRONT_CACHE_TTL = 15_000;

declare global {
  interface Window { __TUNBET_SPORTSBOOK_API__?: string; }
}

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
  homeLogo?: string;
  awayLogo?: string;
  clock?: string;
  period?: string;
  suspended?: boolean;
  markets: Record<string, Record<string, number>>;
  bookmakerCount: number;
  updatedAt?: string;
  oddsSource?: string;
  hasRealOdds?: boolean;
  source?: string;
}

export interface SportsBetPick {
  eventId: string;
  market: string;
  selection: string;
  odds: number;
}

export interface PlaceBetResult {
  success?: boolean;
  error?: string;
  count?: number;
  totalStake?: number;
  newBalance?: number;
  bets?: any[];
  currentOdds?: number;
}

export const SPORTS = [
  { slug: "all",                  name: "All" },
  { slug: "football",             name: "Football" },
  { slug: "basketball",           name: "Basketball" },
  { slug: "baseball",             name: "Baseball" },
  { slug: "american-football",    name: "NFL" },
  { slug: "ice-hockey",           name: "Ice Hockey" },
  { slug: "mixed-martial-arts",   name: "UFC" },
  { slug: "tennis",               name: "Tennis" },
] as const;

const _cache = new Map<string, { t: number; d: OddsMatch[] }>();

function apiBase(): string {
  const envBase = (import.meta as any).env?.VITE_SPORTSBOOK_API as string | undefined;
  const runtimeBase = typeof window !== "undefined" ? window.__TUNBET_SPORTSBOOK_API__ : undefined;
  const storedBase = typeof localStorage !== "undefined" ? localStorage.getItem("tunbet_sportsbook_api") || undefined : undefined;
  return (envBase || runtimeBase || storedBase || DEFAULT_SPORTSBOOK_API).replace(/\/$/, "");
}

function normalizeMarkets(raw: any): Record<string, Record<string, number>> {
  const markets: Record<string, Record<string, number>> = {};
  const parsed = typeof raw === "string" ? safeJson(raw) : raw;
  for (const [mk, sels] of Object.entries(parsed || {})) {
    const clean: Record<string, number> = {};
    for (const [sel, odd] of Object.entries(sels as any)) {
      const n = parseFloat(odd as any);
      if (Number.isFinite(n) && n > 1) clean[sel] = +n.toFixed(2);
    }
    if (Object.keys(clean).length) markets[mk] = clean;
  }
  return markets;
}

function safeJson(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}

function normalizeBackendMatch(m: any): OddsMatch {
  return {
    id: String(m.id),
    sport: m.sport || "football",
    league: m.league || "League",
    home: m.home || m.home_team || "Home",
    away: m.away || m.away_team || "Away",
    date: m.date || m.commence_time || new Date().toISOString(),
    status: m.status === "live" ? "live" : m.status === "finished" ? "finished" : "upcoming",
    homeScore: numericOrUndefined(m.homeScore ?? m.home_score),
    awayScore: numericOrUndefined(m.awayScore ?? m.away_score),
    homeLogo: m.homeLogo || m.home_logo,
    awayLogo: m.awayLogo || m.away_logo,
    clock: m.clock,
    period: m.period,
    suspended: !!m.suspended,
    markets: normalizeMarkets(m.markets || m.markets_data),
    bookmakerCount: m.hasRealOdds ? 1 : 0,
    updatedAt: m.updatedAt || m.updated_at,
    oddsSource: m.oddsSource || (m.hasRealOdds ? "ESPN DraftKings" : "TunBet mathematical model"),
    hasRealOdds: !!m.hasRealOdds,
    source: "backend",
  };
}

function normalizeSupabaseRow(row: any): OddsMatch {
  return {
    id: String(row.id).replace(/^espn_/, ""),
    sport: row.sport || "football",
    league: row.league || "League",
    home: row.home_team,
    away: row.away_team,
    date: row.commence_time,
    status: row.status === "live" ? "live" : row.status === "finished" ? "finished" : "upcoming",
    homeScore: numericOrUndefined(row.home_score),
    awayScore: numericOrUndefined(row.away_score),
    markets: normalizeMarkets(row.markets_data),
    bookmakerCount: 1,
    updatedAt: row.updated_at,
    oddsSource: "Supabase ESPN cache",
    hasRealOdds: false,
    source: "supabase",
  };
}

function numericOrUndefined(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function sortMatches(out: OddsMatch[]): OddsMatch[] {
  return out
    .filter(m => Object.keys(m.markets).length > 0)
    // Strict logo policy: only show matches where BOTH teams have a real logo.
    .filter(m => !!m.homeLogo && !!m.awayLogo)
    .filter(m => m.status !== "finished")
    .sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (a.status !== "live" && b.status === "live") return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
}

async function fetchFromBackend(sportSlug: string): Promise<OddsMatch[] | null> {
  const r = await fetch(`${apiBase()}/api/matches?sport=${encodeURIComponent(sportSlug)}&limit=300`, { cache: "no-store" });
  if (!r.ok) return null;
  const data = await r.json();
  if (!data?.success || !Array.isArray(data.matches)) return null;
  return sortMatches(data.matches.map(normalizeBackendMatch));
}

async function fetchFromSupabase(sportSlug: string): Promise<OddsMatch[]> {
  const cutoff = new Date(Date.now() - 60 * 60_000).toISOString();
  const sportFilter = sportSlug === "all" ? "" : `sport=eq.${encodeURIComponent(sportSlug)}&`;
  const url = `${SB_URL}/rest/v1/live_fixtures?${sportFilter}commence_time=gte.${cutoff}&order=commence_time.asc&limit=180`;
  const r = await fetch(url, { headers: SH });
  if (!r.ok) return [];
  const rows: any[] = await r.json();
  return sortMatches(rows.map(normalizeSupabaseRow));
}

export async function fetchOddsMatches(sportSlug: string): Promise<OddsMatch[]> {
  const cacheKey = sportSlug || "all";
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.t < FRONT_CACHE_TTL) return cached.d;

  try {
    const backend = await fetchFromBackend(cacheKey);
    if (backend && backend.length) {
      _cache.set(cacheKey, { t: Date.now(), d: backend });
      return backend;
    }
  } catch (e) {
    console.warn("[sportsbook] backend unavailable, falling back to Supabase", e);
  }

  try {
    const fallback = await fetchFromSupabase(cacheKey);
    _cache.set(cacheKey, { t: Date.now(), d: fallback });
    return fallback;
  } catch {
    return [];
  }
}

export async function placeSportsBetBatch(userId: number, picks: SportsBetPick[], stake: number): Promise<PlaceBetResult> {
  try {
    const r = await fetch(`${apiBase()}/api/betbatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, picks, stake }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { error: data?.error || `Bet failed (${r.status})` };
    return data;
  } catch {
    return { error: "Sportsbook backend is offline" };
  }
}

export async function fetchMySportsBets(userId: number): Promise<any[] | null> {
  try {
    const r = await fetch(`${apiBase()}/api/mybets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return Array.isArray(data) ? data : (Array.isArray(data?.bets) ? data.bets : null);
  } catch {
    return null;
  }
}

export function getSportsbookApiBase(): string {
  return apiBase();
}

export function clearSportsbookCache() {
  _cache.clear();
}
