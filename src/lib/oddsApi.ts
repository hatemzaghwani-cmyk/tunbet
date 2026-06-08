// odds-api.io client — REST API for real bookmaker odds
// Docs: https://docs.odds-api.io
// Account: hatemzaghwani@gmail.com
//
// Usage: set your API key via setOddsApiKey() (admin panel) — then call fetchOddsMatches()

const ODDS_API = "https://api.odds-api.io/v3";
const KEY_STORAGE = "mebet_oddsapi_key";

// Default key (replace via admin localStorage once obtained)
const DEFAULT_KEY = ""; // empty by default — user fills via admin or window override

export function setOddsApiKey(key: string) {
  if (key) localStorage.setItem(KEY_STORAGE, key);
  else localStorage.removeItem(KEY_STORAGE);
}

export function getOddsApiKey(): string {
  return localStorage.getItem(KEY_STORAGE) || DEFAULT_KEY;
}

export function hasOddsApiKey(): boolean {
  return !!getOddsApiKey();
}

export interface OddsMatch {
  id: string;
  sport: string;
  league: string;
  home: string;
  away: string;
  date: string;             // ISO timestamp
  status: "upcoming" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
  markets: Record<string, Record<string, number>>;  // { "Match Winner": { "Home": 1.85, "Draw": 3.4, "Away": 4.2 } }
  bookmakerCount: number;
}

// Sports we support in the UI (slug → display name + icon hint)
export const SPORTS = [
  { slug: "football",          name: "Football",          icon: "⚽" },
  { slug: "basketball",        name: "Basketball",        icon: "🏀" },
  { slug: "tennis",            name: "Tennis",            icon: "🎾" },
  { slug: "american-football", name: "American Football", icon: "🏈" },
  { slug: "baseball",          name: "Baseball",          icon: "⚾" },
  { slug: "ice-hockey",        name: "Ice Hockey",        icon: "🏒" },
  { slug: "mixed-martial-arts",name: "MMA",               icon: "🥊" },
  { slug: "boxing",            name: "Boxing",            icon: "🥊" },
  { slug: "esports",           name: "Esports",           icon: "🎮" },
  { slug: "cricket",           name: "Cricket",           icon: "🏏" },
  { slug: "rugby",             name: "Rugby",             icon: "🏉" },
  { slug: "handball",          name: "Handball",          icon: "🤾" },
  { slug: "volleyball",        name: "Volleyball",        icon: "🏐" },
] as const;

type CacheEntry = { t: number; d: OddsMatch[] };
const _cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30_000; // 30s — respect free tier rate limit (100 req/h)

async function apiGet<T = any>(path: string): Promise<T | null> {
  const key = getOddsApiKey();
  if (!key) return null;
  const sep = path.includes("?") ? "&" : "?";
  try {
    const r = await fetch(`${ODDS_API}${path}${sep}apiKey=${encodeURIComponent(key)}`);
    if (!r.ok) {
      console.warn("[oddsApi]", path, r.status);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.warn("[oddsApi] fetch error", e);
    return null;
  }
}

// Fetch all matches across all sports we care about
export async function fetchOddsMatches(sportSlug?: string): Promise<OddsMatch[]> {
  if (!hasOddsApiKey()) return [];

  const sports = sportSlug ? [sportSlug] : SPORTS.map(s => s.slug);
  const cacheKey = sports.join(",");
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.t < CACHE_TTL) return cached.d;

  const results = await Promise.allSettled(sports.map(s => fetchSport(s)));
  const all: OddsMatch[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) all.push(...r.value);
  }
  // Sort: live first, then by date ascending
  all.sort((a, b) => {
    if (a.status === "live" && b.status !== "live") return -1;
    if (a.status !== "live" && b.status === "live") return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  _cache.set(cacheKey, { t: Date.now(), d: all });
  return all;
}

async function fetchSport(sportSlug: string): Promise<OddsMatch[]> {
  // odds-api.io structure: /v3/{sport}/leagues then /v3/{sport}/leagues/{league}/matches
  // Then /v3/{sport}/matches/{id}/odds
  // For efficiency, use a single endpoint if available
  const leagues = await apiGet<any[]>(`/${sportSlug}/leagues`);
  if (!leagues || !Array.isArray(leagues)) return [];

  // Pick top leagues (limit to first 5 to stay within rate limits)
  const topLeagues = leagues.slice(0, 5);
  const out: OddsMatch[] = [];

  const matchResults = await Promise.allSettled(
    topLeagues.map(lg => apiGet<any[]>(`/${sportSlug}/leagues/${lg.slug || lg.id || lg.name}/matches`))
  );

  for (let i = 0; i < topLeagues.length; i++) {
    const r = matchResults[i];
    if (r.status !== "fulfilled" || !Array.isArray(r.value)) continue;
    const lg = topLeagues[i];
    const lgName = lg.name || lg.slug || "League";

    for (const m of r.value.slice(0, 20)) { // limit per league
      // Match has odds embedded already or we need to fetch
      const odds = m.odds || m.markets || {};
      const markets: Record<string, Record<string, number>> = {};

      // Map common market keys to our standard names
      if (odds.match_winner || odds.moneyline || odds["1x2"] || odds.h2h) {
        const mw = odds.match_winner || odds.moneyline || odds["1x2"] || odds.h2h;
        const obj: Record<string, number> = {};
        if (mw.home || mw["1"]) obj["Home"] = parseFloat(mw.home || mw["1"]);
        if (mw.draw || mw["X"] || mw.x) obj["Draw"] = parseFloat(mw.draw || mw["X"] || mw.x);
        if (mw.away || mw["2"]) obj["Away"] = parseFloat(mw.away || mw["2"]);
        if (Object.keys(obj).length) markets["Match Winner"] = obj;
      }
      if (odds.over_under || odds.totals) {
        const ou = odds.over_under || odds.totals;
        const obj: Record<string, number> = {};
        if (ou.over_2_5) obj["Over 2.5"] = parseFloat(ou.over_2_5);
        if (ou.under_2_5) obj["Under 2.5"] = parseFloat(ou.under_2_5);
        if (Object.keys(obj).length) markets["Total Goals 2.5"] = obj;
      }
      if (odds.btts || odds.both_teams_to_score) {
        const bt = odds.btts || odds.both_teams_to_score;
        const obj: Record<string, number> = {};
        if (bt.yes) obj["Yes"] = parseFloat(bt.yes);
        if (bt.no) obj["No"] = parseFloat(bt.no);
        if (Object.keys(obj).length) markets["Both Teams to Score"] = obj;
      }

      if (Object.keys(markets).length === 0) continue;  // skip matches with no odds

      const status: "upcoming" | "live" | "finished" =
        m.status === "live" || m.status === "in_progress" ? "live" :
        m.status === "finished" || m.status === "ended" ? "finished" : "upcoming";

      if (status === "finished") continue; // hide finished

      out.push({
        id: String(m.id),
        sport: sportSlug,
        league: lgName,
        home: m.home || m.home_team || m.teams?.home || "Home",
        away: m.away || m.away_team || m.teams?.away || "Away",
        date: m.date || m.start_time || m.commence_time || new Date().toISOString(),
        status,
        homeScore: m.home_score,
        awayScore: m.away_score,
        markets,
        bookmakerCount: m.bookmaker_count || (odds.bookmakers?.length || 1),
      });
    }
  }
  return out;
}

// Status check — call to verify the API key actually works
export async function pingOddsApi(): Promise<{ ok: boolean; error?: string }> {
  const key = getOddsApiKey();
  if (!key) return { ok: false, error: "No API key set" };
  try {
    const r = await fetch(`${ODDS_API}/leagues?apiKey=${encodeURIComponent(key)}`);
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: `HTTP ${r.status}: ${t.slice(0, 100)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}
