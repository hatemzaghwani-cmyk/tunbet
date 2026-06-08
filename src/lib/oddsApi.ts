// odds-api.io client — real bookmaker odds (1xbet, Stake on free tier)
// Docs: https://docs.odds-api.io
// Account: hatemzaghwani@gmail.com

const ODDS_API = "https://api.odds-api.io/v3";
const KEY_STORAGE = "mebet_oddsapi_key";

// Pre-filled with user's key — can be overridden via localStorage / Setup screen
const DEFAULT_KEY = "c18282bc3771a4939079a7fcc2ae6b7bc8caf3811ac20506da552accef35abe0";

// Free-tier allowed bookmakers
const BOOKMAKERS = "1xbet,Stake";

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
  date: string;
  status: "upcoming" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
  markets: Record<string, Record<string, number>>;
  bookmakerCount: number;
}

export const SPORTS = [
  { slug: "football",          name: "Football",          icon: "⚽" },
  { slug: "basketball",        name: "Basketball",        icon: "🏀" },
  { slug: "tennis",            name: "Tennis",            icon: "🎾" },
  { slug: "american-football", name: "Am. Football",      icon: "🏈" },
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

// Sport → top leagues (lower-priority leagues skipped — focus on quality)
const TOP_LEAGUES: Record<string, string[]> = {
  football: [
    "international-world-cup",
    "international-euro-championship",
    "international-int-friendly-games",
    "international-uefa-nations-league",
    "international-uefa-champions-league",
    "international-uefa-europa-league",
    "england-premier-league",
    "spain-laliga",
    "italy-serie-a",
    "germany-bundesliga",
    "france-ligue-1",
  ],
  basketball: ["usa-nba", "europe-euroleague"],
  tennis: ["atp-tour", "wta-tour"],
  "american-football": ["usa-nfl"],
  baseball: ["usa-mlb"],
  "ice-hockey": ["usa-nhl"],
  "mixed-martial-arts": ["ufc"],
  boxing: [],
  esports: [],
  cricket: [],
  rugby: [],
  handball: [],
  volleyball: [],
};

type CacheEntry = { t: number; d: OddsMatch[] };
const _cache = new Map<string, CacheEntry>();
const _eventOddsCache = new Map<string, { t: number; data: any }>();
const CACHE_TTL = 60_000;          // 60s for event lists
const ODDS_CACHE_TTL = 45_000;     // 45s for odds (free tier = 100 req/h)

async function apiGet<T = any>(path: string): Promise<T | null> {
  const key = getOddsApiKey();
  if (!key) return null;
  const sep = path.includes("?") ? "&" : "?";
  try {
    const r = await fetch(`${ODDS_API}${path}${sep}apiKey=${encodeURIComponent(key)}`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// Get list of upcoming events (lightweight — 1 req per sport)
async function fetchEvents(sportSlug: string): Promise<any[]> {
  const cached = _cache.get("events_" + sportSlug);
  if (cached && Date.now() - cached.t < CACHE_TTL) return (cached.d as any) as any[];

  // Try with each top league for richer coverage
  const leagueList = TOP_LEAGUES[sportSlug] || [];
  const all: any[] = [];

  if (leagueList.length > 0) {
    // Fetch top 3-5 leagues in parallel
    const results = await Promise.allSettled(
      leagueList.slice(0, 5).map(lg =>
        apiGet<any[]>(`/events?sport=${sportSlug}&league=${lg}`)
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled" && Array.isArray(r.value)) all.push(...r.value);
    }
  }

  // Fallback: fetch all events for sport if leagues returned nothing
  if (all.length === 0) {
    const generic = await apiGet<any[]>(`/events?sport=${sportSlug}`);
    if (Array.isArray(generic)) all.push(...generic);
  }

  _cache.set("events_" + sportSlug, { t: Date.now(), d: all as any });
  return all;
}

// Get odds for a single event (1 req)
async function fetchEventOdds(sportSlug: string, eventId: string | number): Promise<any | null> {
  const key = `${sportSlug}_${eventId}`;
  const cached = _eventOddsCache.get(key);
  if (cached && Date.now() - cached.t < ODDS_CACHE_TTL) return cached.data;

  const data = await apiGet<any>(`/odds?sport=${sportSlug}&eventId=${eventId}&bookmakers=${BOOKMAKERS}`);
  if (data) _eventOddsCache.set(key, { t: Date.now(), data });
  return data;
}

// Parse a single bookmaker's market data into our flat odds structure
function parseMarkets(bookmakers: any): Record<string, Record<string, number>> {
  if (!bookmakers || typeof bookmakers !== "object") return {};
  const out: Record<string, Record<string, number>> = {};

  // Prefer 1xbet (best coverage), fall back to Stake
  const bm = bookmakers["1xbet"] || bookmakers["Stake"];
  if (!Array.isArray(bm)) return out;

  for (const market of bm) {
    const name: string = market.name || "";
    const odds = market.odds;
    if (!Array.isArray(odds) || odds.length === 0) continue;

    // ML = Match Winner (1X2)
    if (name === "ML") {
      const o = odds[0];
      const m: Record<string, number> = {};
      if (o.home) m["Home"] = parseFloat(o.home);
      if (o.draw) m["Draw"] = parseFloat(o.draw);
      if (o.away) m["Away"] = parseFloat(o.away);
      if (Object.keys(m).length) out["Match Winner"] = m;
    }
    // Double Chance
    else if (name === "Double Chance") {
      const o = odds[0];
      const m: Record<string, number> = {};
      if (o["1X"]) m["1X"] = parseFloat(o["1X"]);
      if (o["12"]) m["12"] = parseFloat(o["12"]);
      if (o["X2"]) m["X2"] = parseFloat(o["X2"]);
      if (Object.keys(m).length) out["Double Chance"] = m;
    }
    // Totals (Over/Under goals) — pick the 2.5 line if available else closest to 2.5
    else if (name === "Totals") {
      let best = odds.find((o: any) => parseFloat(o.hdp) === 2.5);
      if (!best) {
        // closest to 2.5
        best = odds.reduce((a: any, b: any) =>
          Math.abs(parseFloat(b.hdp) - 2.5) < Math.abs(parseFloat(a.hdp) - 2.5) ? b : a
        );
      }
      if (best && best.over && best.under) {
        out[`O/U ${best.hdp}`] = {
          Over: parseFloat(best.over),
          Under: parseFloat(best.under),
        };
      }
    }
    // Both Teams To Score
    else if (name === "Both Teams To Score") {
      const o = odds[0];
      if (o && o.yes && o.no) {
        out["Both Teams Score"] = { Yes: parseFloat(o.yes), No: parseFloat(o.no) };
      }
    }
    // Spread (Asian Handicap) — pick line closest to 0
    else if (name === "Spread") {
      const best = odds.reduce((a: any, b: any) =>
        Math.abs(parseFloat(b.hdp)) < Math.abs(parseFloat(a.hdp)) ? b : a
      );
      if (best && best.home && best.away) {
        out[`Spread ${best.hdp}`] = {
          Home: parseFloat(best.home),
          Away: parseFloat(best.away),
        };
      }
    }
  }
  return out;
}

// Main public fetcher: events for sport, with odds attached
export async function fetchOddsMatches(sportSlug: string): Promise<OddsMatch[]> {
  if (!hasOddsApiKey()) return [];

  const events = await fetchEvents(sportSlug);
  if (!events.length) return [];

  // Filter to pending/upcoming only (ignore settled), sort by date, keep top 30 (rate-limit budget)
  const now = Date.now();
  const upcoming = events
    .filter(e => e.status !== "settled" && new Date(e.date).getTime() > now - 3600_000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 30);

  // Fetch odds for each in parallel (with throttle)
  const results: OddsMatch[] = [];
  // Process in batches of 5 to avoid hammering
  for (let i = 0; i < upcoming.length; i += 5) {
    const batch = upcoming.slice(i, i + 5);
    const odds = await Promise.allSettled(batch.map(e => fetchEventOdds(sportSlug, e.id)));
    for (let j = 0; j < batch.length; j++) {
      const e = batch[j];
      const r = odds[j];
      if (r.status !== "fulfilled" || !r.value) continue;
      const markets = parseMarkets(r.value.bookmakers);
      if (Object.keys(markets).length === 0) continue;
      results.push({
        id: String(e.id),
        sport: sportSlug,
        league: e.league?.name || "League",
        home: e.home,
        away: e.away,
        date: e.date,
        status: e.status === "in_progress" || e.status === "live" ? "live" : "upcoming",
        homeScore: e.scores?.home,
        awayScore: e.scores?.away,
        markets,
        bookmakerCount: Object.keys(r.value.bookmakers || {}).length,
      });
    }
  }

  // Sort: live first
  results.sort((a, b) => {
    if (a.status === "live" && b.status !== "live") return -1;
    if (a.status !== "live" && b.status === "live") return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return results;
}

export async function pingOddsApi(): Promise<{ ok: boolean; error?: string }> {
  const key = getOddsApiKey();
  if (!key) return { ok: false, error: "No API key set" };
  try {
    const r = await fetch(`${ODDS_API}/sports?apiKey=${encodeURIComponent(key)}`);
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: `HTTP ${r.status}: ${t.slice(0, 100)}` };
    }
    const d = await r.json();
    if (!Array.isArray(d)) return { ok: false, error: "Unexpected response" };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}
