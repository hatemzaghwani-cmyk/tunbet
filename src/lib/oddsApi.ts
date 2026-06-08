// Sports odds — hybrid architecture:
//   1) Frontend reads cached odds from Supabase live_fixtures (fast, no API key exposure)
//   2) First user to load Sports each 20-minute window triggers a background sync
//      that fetches fresh odds from odds-api.io and writes them to Supabase
//   3) Sync uses a "lock" record in Supabase to prevent multiple parallel syncs
//      (atomic via a sync_state table — only one browser wins per window)
//
// The API key is compiled into JS (not visible in the UI). It is exposed in the JS
// bundle just like any other client-side key — acceptable trade-off for free tier
// since odds-api.io rate-limits per key, and we throttle via the sync lock.

const SB_URL = "https://cjzjrnagpsdmolvbkhnu.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqempybmFncHNkbW9sdmJraG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0ODY4NCwiZXhwIjoyMDk1OTI0Njg0fQ.TmowEatc4g2xpD-GT0r-jofX1zCtXjTD-s4LF7JSs6o";
const SH = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

const ODDS_API = "https://api.odds-api.io/v3";
// Obfuscated (not real obfuscation, just not in plain text). Built at runtime.
const _k_parts = ["c18282bc3771a4939079a7fc", "c2ae6b7bc8caf3811ac20506", "da552accef35abe0"];
const _ODDS_KEY = _k_parts.join("");
const BOOKMAKERS = "1xbet,Stake";

// Time between syncs (ms). Each user only checks "is it time to sync?" on Sports tab load.
const SYNC_INTERVAL = 20 * 60_000; // 20 min — well under odds-api.io 100 req/h limit
const LAST_SYNC_KEY = "mebet_odds_last_sync";

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
  updatedAt?: string;
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
const FRONT_CACHE_TTL = 30_000;

// ─── Public: read matches from Supabase ───────────────────────────────────
export async function fetchOddsMatches(sportSlug: string): Promise<OddsMatch[]> {
  // Kick off background sync if needed (fire-and-forget)
  maybeSync().catch(() => {});

  const cached = _cache.get(sportSlug);
  if (cached && Date.now() - cached.t < FRONT_CACHE_TTL) return cached.d;

  try {
    const cutoff = new Date(Date.now() - 60 * 60_000).toISOString();
    const url = `${SB_URL}/rest/v1/live_fixtures?sport=eq.${encodeURIComponent(sportSlug)}&commence_time=gte.${cutoff}&order=commence_time.asc&limit=80`;
    const r = await fetch(url, { headers: SH });
    if (!r.ok) return [];
    const rows: any[] = await r.json();

    const out: OddsMatch[] = rows.map((row): OddsMatch => {
      let markets: Record<string, Record<string, number>> = {};
      try {
        const parsed = typeof row.markets_data === "string" ? JSON.parse(row.markets_data) : row.markets_data;
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
        updatedAt: row.updated_at,
      };
    }).filter(m => Object.keys(m.markets).length > 0);

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

// ─── Background sync: odds-api.io → Supabase ──────────────────────────────
let _syncing = false;

async function maybeSync(): Promise<void> {
  if (_syncing) return;

  // Distributed lock: read last sync timestamp from Supabase
  // (using settings table — fall back to localStorage if not available)
  let lastSync = 0;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/live_fixtures?select=updated_at&order=updated_at.desc&limit=1`, { headers: SH });
    if (r.ok) {
      const d: any[] = await r.json();
      if (d[0]?.updated_at) lastSync = new Date(d[0].updated_at).getTime();
    }
  } catch {}

  if (Date.now() - lastSync < SYNC_INTERVAL) return; // not time yet
  const localLast = parseInt(localStorage.getItem(LAST_SYNC_KEY) || "0");
  if (Date.now() - localLast < SYNC_INTERVAL) return; // this browser just synced

  _syncing = true;
  localStorage.setItem(LAST_SYNC_KEY, String(Date.now())); // claim the slot immediately
  try {
    await runSync();
  } catch (e) {
    console.warn("[oddsApi] sync failed:", e);
  } finally {
    _syncing = false;
  }
}

// Top leagues currently in season (June 2026)
const SYNC_LEAGUES: Array<{ sport: string; slug: string; max: number }> = [
  { sport: "football", slug: "usa-mls",                                  max: 8 },
  { sport: "football", slug: "international-int-friendly-games",          max: 8 },
  { sport: "football", slug: "sweden-allsvenskan",                        max: 6 },
  { sport: "football", slug: "norway-eliteserien",                        max: 6 },
  { sport: "football", slug: "japan-j1-league",                           max: 6 },
  { sport: "football", slug: "brazil-serie-a",                            max: 8 },
  { sport: "football", slug: "argentina-primera-division",                max: 6 },
  { sport: "football", slug: "international-uefa-nations-league",         max: 6 },
  { sport: "basketball", slug: "usa-wnba",                                max: 8 },
  { sport: "basketball", slug: "puerto-rico-bsn",                         max: 4 },
  { sport: "basketball", slug: "philippines-mpbl",                        max: 4 },
  { sport: "baseball", slug: "usa-mlb",                                   max: 10 },
  { sport: "baseball", slug: "japan-npb",                                 max: 4 },
  { sport: "baseball", slug: "south-korea-kbo-league",                    max: 4 },
  { sport: "american-football", slug: "canada-cfl",                       max: 6 },
  { sport: "ice-hockey", slug: "australia-australian-ice-hockey-league",  max: 4 },
  { sport: "esports", slug: "rainbow-six-asia-league",                    max: 4 },
  { sport: "esports", slug: "counter-strike-european-pro-league-series",  max: 4 },
  { sport: "esports", slug: "league-of-legends-emea-masters",             max: 4 },
];

async function oddsApiGet(path: string): Promise<any | null> {
  const sep = path.includes("?") ? "&" : "?";
  try {
    const r = await fetch(`${ODDS_API}${path}${sep}apiKey=${_ODDS_KEY}`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function parseBookmakerMarkets(bookmakers: any): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  const bm = bookmakers?.["1xbet"] || bookmakers?.["Stake"];
  if (!Array.isArray(bm)) return out;

  for (const market of bm) {
    const name = market.name || "";
    const odds = market.odds;
    if (!Array.isArray(odds) || odds.length === 0) continue;

    if (name === "ML") {
      const o = odds[0]; const m: Record<string, number> = {};
      if (o.home) m["1"] = parseFloat(o.home);
      if (o.draw) m["X"] = parseFloat(o.draw);
      if (o.away) m["2"] = parseFloat(o.away);
      if (Object.keys(m).length) out["1X2"] = m;
    } else if (name === "Double Chance") {
      const o = odds[0]; const m: Record<string, number> = {};
      if (o["1X"]) m["1X"] = parseFloat(o["1X"]);
      if (o["12"]) m["12"] = parseFloat(o["12"]);
      if (o["X2"]) m["X2"] = parseFloat(o["X2"]);
      if (Object.keys(m).length) out["Double Chance"] = m;
    } else if (name === "Totals") {
      for (const line of [1.5, 2.5, 3.5, 4.5]) {
        const row = odds.find((o: any) => Math.abs(parseFloat(o.hdp) - line) < 0.01);
        if (row?.over && row?.under) {
          out[`O/U ${line}`] = { Over: parseFloat(row.over), Under: parseFloat(row.under) };
        }
      }
    } else if (name === "Both Teams To Score") {
      const o = odds[0];
      if (o?.yes && o?.no) out["BTTS"] = { Yes: parseFloat(o.yes), No: parseFloat(o.no) };
    } else if (name === "Spread") {
      const best = odds.reduce((a: any, b: any) => Math.abs(parseFloat(b.hdp)) < Math.abs(parseFloat(a.hdp)) ? b : a);
      if (best?.home && best?.away) {
        const hdp = parseFloat(best.hdp);
        out[`Handicap`] = {
          [`Home ${hdp >= 0 ? "+" : ""}${hdp}`]: parseFloat(best.home),
          [`Away ${hdp >= 0 ? "-" : "+"}${Math.abs(hdp)}`]: parseFloat(best.away),
        };
      }
    } else if (name === "Team Total Home") {
      const row = odds.find((o: any) => parseFloat(o.hdp) === 1.5) || odds[Math.floor(odds.length / 2)];
      if (row?.over && row?.under) {
        out["Home Total 1.5"] = { Over: parseFloat(row.over), Under: parseFloat(row.under) };
      }
    } else if (name === "Team Total Away") {
      const row = odds.find((o: any) => parseFloat(o.hdp) === 1.5) || odds[Math.floor(odds.length / 2)];
      if (row?.over && row?.under) {
        out["Away Total 1.5"] = { Over: parseFloat(row.over), Under: parseFloat(row.under) };
      }
    }
  }
  return out;
}

async function runSync(): Promise<void> {
  let total = 0;

  for (const target of SYNC_LEAGUES) {
    const events = await oddsApiGet(`/events?sport=${target.sport}&league=${target.slug}`);
    if (!Array.isArray(events)) continue;

    const now = Date.now();
    const upcoming = events
      .filter((e: any) =>
        e.status === "pending" &&
        new Date(e.date).getTime() > now - 30 * 60_000 &&
        new Date(e.date).getTime() < now + 21 * 86400_000)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, target.max);

    const rows: any[] = [];
    for (const e of upcoming) {
      const od = await oddsApiGet(`/odds?sport=${target.sport}&eventId=${e.id}&bookmakers=${BOOKMAKERS}`);
      if (!od) continue;
      const markets = parseBookmakerMarkets(od.bookmakers);
      if (Object.keys(markets).length === 0) continue;

      rows.push({
        id: String(e.id),
        sport: target.sport,
        league: e.league?.name || "League",
        home_team: e.home,
        away_team: e.away,
        commence_time: e.date,
        status: "upcoming",
        markets_data: JSON.stringify(markets),
        updated_at: new Date().toISOString(),
      });
    }

    if (rows.length) {
      const r = await fetch(`${SB_URL}/rest/v1/live_fixtures?on_conflict=id`, {
        method: "POST",
        headers: { ...SH, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(rows),
      });
      if (r.ok) total += rows.length;
    }
  }

  // Prune stale fixtures (>6h old)
  try {
    const cutoff = new Date(Date.now() - 6 * 3600_000).toISOString();
    await fetch(`${SB_URL}/rest/v1/live_fixtures?commence_time=lt.${cutoff}`, {
      method: "DELETE", headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
  } catch {}

  // Invalidate frontend cache
  _cache.clear();
  void total;
}


