// Sync odds-api.io → Supabase live_fixtures
// Strategy: pull events from a fixed list of TOP leagues directly (not generic sport feed)
// This guarantees quality (no obscure 5th-tier regional games)
// Rate budget: ~50-60 req per run (events + odds for ~50 events)

const ODDS_API = "https://api.odds-api.io/v3";
const BOOKMAKERS = "1xbet,Stake";
const KEY = process.env.ODDS_API_KEY;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!KEY || !SB_URL || !SB_KEY) { console.error("Missing env"); process.exit(1); }

const SH = {
  apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
};

// Top-tier leagues currently in season (auto-discovered via /v3/leagues sorted by events count)
// Updated for June 2026 season — EPL/CL/NBA off-season, focus on summer leagues
const TARGET_LEAGUES = [
  // Football (summer leagues + intl friendlies + youth tournaments)
  { sport: "football", slug: "usa-mls",                                  max: 8 },
  { sport: "football", slug: "international-int-friendly-games",          max: 8 },
  { sport: "football", slug: "sweden-allsvenskan",                        max: 6 },
  { sport: "football", slug: "norway-eliteserien",                        max: 6 },
  { sport: "football", slug: "finland-veikkausliiga",                     max: 4 },
  { sport: "football", slug: "japan-j1-league",                           max: 6 },
  { sport: "football", slug: "south-korea-k-league-1",                    max: 4 },
  { sport: "football", slug: "brazil-serie-a",                            max: 8 },
  { sport: "football", slug: "argentina-primera-division",                max: 6 },
  { sport: "football", slug: "international-uefa-nations-league",         max: 6 },
  { sport: "football", slug: "international-int-friendly-games-women",    max: 4 },
  // Basketball (summer)
  { sport: "basketball", slug: "usa-wnba",                                max: 8 },
  { sport: "basketball", slug: "puerto-rico-bsn",                         max: 4 },
  { sport: "basketball", slug: "australia-nbl1-south",                    max: 4 },
  { sport: "basketball", slug: "philippines-mpbl",                        max: 4 },
  // Baseball (full season)
  { sport: "baseball", slug: "usa-mlb",                                   max: 10 },
  { sport: "baseball", slug: "japan-npb",                                 max: 4 },
  { sport: "baseball", slug: "south-korea-kbo-league",                    max: 4 },
  // American football (off-season but CFL/UFL run)
  { sport: "american-football", slug: "canada-cfl",                       max: 6 },
  { sport: "american-football", slug: "usa-arena-football-one",           max: 4 },
  // Ice hockey (summer leagues)
  { sport: "ice-hockey", slug: "australia-australian-ice-hockey-league",  max: 4 },
  { sport: "ice-hockey", slug: "new-zealand-nzihl",                       max: 4 },
  // Esports
  { sport: "esports", slug: "rainbow-six-asia-league",                    max: 4 },
  { sport: "esports", slug: "rainbow-six-europe-league",                  max: 4 },
  { sport: "esports", slug: "counter-strike-european-pro-league-series",  max: 4 },
  { sport: "esports", slug: "league-of-legends-emea-masters",             max: 4 },
];

async function api(path) {
  const sep = path.includes("?") ? "&" : "?";
  try {
    const r = await fetch(`${ODDS_API}${path}${sep}apiKey=${KEY}`);
    if (!r.ok) { console.warn(`  ! ${path} → HTTP ${r.status}`); return null; }
    return await r.json();
  } catch (e) { console.warn(`  ! ${path} → ${e.message}`); return null; }
}

function parseMarkets(bookmakers) {
  const out = {};
  const bm = bookmakers?.["1xbet"] || bookmakers?.["Stake"];
  if (!Array.isArray(bm)) return out;

  for (const market of bm) {
    const name = market.name || "";
    const odds = market.odds;
    if (!Array.isArray(odds) || odds.length === 0) continue;

    if (name === "ML") {
      const o = odds[0]; const m = {};
      if (o.home) m["1"] = parseFloat(o.home);
      if (o.draw) m["X"] = parseFloat(o.draw);
      if (o.away) m["2"] = parseFloat(o.away);
      if (Object.keys(m).length) out["1X2"] = m;
    } else if (name === "Double Chance") {
      const o = odds[0]; const m = {};
      if (o["1X"]) m["1X"] = parseFloat(o["1X"]);
      if (o["12"]) m["12"] = parseFloat(o["12"]);
      if (o["X2"]) m["X2"] = parseFloat(o["X2"]);
      if (Object.keys(m).length) out["Double Chance"] = m;
    } else if (name === "Totals") {
      for (const line of [1.5, 2.5, 3.5, 4.5]) {
        const row = odds.find((o) => Math.abs(parseFloat(o.hdp) - line) < 0.01);
        if (row?.over && row?.under) {
          out[`O/U ${line}`] = { Over: parseFloat(row.over), Under: parseFloat(row.under) };
        }
      }
    } else if (name === "Both Teams To Score") {
      const o = odds[0];
      if (o?.yes && o?.no) out["BTTS"] = { Yes: parseFloat(o.yes), No: parseFloat(o.no) };
    } else if (name === "Spread") {
      const best = odds.reduce((a, b) => Math.abs(parseFloat(b.hdp)) < Math.abs(parseFloat(a.hdp)) ? b : a);
      if (best?.home && best?.away) {
        const hdp = parseFloat(best.hdp);
        out[`Handicap`] = {
          [`Home ${hdp >= 0 ? "+" : ""}${hdp}`]: parseFloat(best.home),
          [`Away ${hdp >= 0 ? "-" : "+"}${Math.abs(hdp)}`]: parseFloat(best.away),
        };
      }
    }
  }
  return out;
}

async function syncLeague(target) {
  console.log(`\n→ ${target.sport}/${target.slug}`);
  const events = await api(`/events?sport=${target.sport}&league=${target.slug}`);
  if (!Array.isArray(events)) { console.log("  no events"); return 0; }

  const now = Date.now();
  const upcoming = events
    .filter(e => e.status === "pending" &&
      new Date(e.date).getTime() > now - 30 * 60_000 &&
      new Date(e.date).getTime() < now + 21 * 86400_000)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, target.max);

  console.log(`  ${events.length} total / ${upcoming.length} target`);
  if (!upcoming.length) return 0;

  const rows = [];
  for (const e of upcoming) {
    const od = await api(`/odds?sport=${target.sport}&eventId=${e.id}&bookmakers=${BOOKMAKERS}`);
    if (!od) continue;
    const markets = parseMarkets(od.bookmakers);
    if (Object.keys(markets).length === 0) continue;
    rows.push({
      id: String(e.id), sport: target.sport, league: e.league?.name || target.slug,
      home_team: e.home, away_team: e.away, commence_time: e.date, status: "upcoming",
      markets_data: JSON.stringify(markets), updated_at: new Date().toISOString(),
    });
  }
  if (!rows.length) { console.log("  no markets"); return 0; }
  const r = await fetch(`${SB_URL}/rest/v1/live_fixtures?on_conflict=id`, {
    method: "POST", headers: SH, body: JSON.stringify(rows),
  });
  if (!r.ok) { console.error(`  ✗ upsert HTTP ${r.status}: ${await r.text()}`); return 0; }
  console.log(`  ✓ ${rows.length} synced`);
  return rows.length;
}

async function prune() {
  const cutoff = new Date(Date.now() - 6 * 3600_000).toISOString();
  await fetch(`${SB_URL}/rest/v1/live_fixtures?commence_time=lt.${cutoff}`, {
    method: "DELETE", headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  console.log(`✓ pruned older than ${cutoff}`);
}

(async () => {
  let total = 0;
  for (const target of TARGET_LEAGUES) total += await syncLeague(target);
  await prune();
  console.log(`\n=== Done: ${total} fixtures ===`);
})().catch(e => { console.error(e); process.exit(1); });
