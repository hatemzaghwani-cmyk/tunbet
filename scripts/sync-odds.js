// Fetch live odds from odds-api.io and upsert into Supabase live_fixtures table.
// Runs every 20 minutes via GitHub Actions.
// API budget: free tier = 100 req/h. We use ~25-40 req per run (events + odds for top events).

const ODDS_API = "https://api.odds-api.io/v3";
const BOOKMAKERS = "1xbet,Stake";
const KEY = process.env.ODDS_API_KEY;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!KEY) { console.error("Missing ODDS_API_KEY"); process.exit(1); }
if (!SB_URL || !SB_KEY) { console.error("Missing SUPABASE_URL/KEY"); process.exit(1); }

const SH = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates",
};

// Sports we sync (slug + max events to pull) — total budget ≈ 60 events
const SPORTS = [
  { slug: "football",            max: 25 },
  { slug: "basketball",          max: 10 },
  { slug: "tennis",              max: 8 },
  { slug: "american-football",   max: 5 },
  { slug: "baseball",            max: 5 },
  { slug: "ice-hockey",          max: 5 },
  { slug: "mixed-martial-arts",  max: 5 },
  { slug: "esports",             max: 3 },
];

async function api(path) {
  const sep = path.includes("?") ? "&" : "?";
  try {
    const r = await fetch(`${ODDS_API}${path}${sep}apiKey=${KEY}`);
    if (!r.ok) {
      const t = await r.text();
      console.warn(`  ! ${path} → HTTP ${r.status}: ${t.slice(0, 120)}`);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.warn(`  ! ${path} → ${e.message}`);
    return null;
  }
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
      const o = odds[0];
      const m = {};
      if (o.home) m["Home"] = parseFloat(o.home);
      if (o.draw) m["Draw"] = parseFloat(o.draw);
      if (o.away) m["Away"] = parseFloat(o.away);
      if (Object.keys(m).length) out["Match Winner"] = m;
    } else if (name === "Double Chance") {
      const o = odds[0];
      const m = {};
      if (o["1X"]) m["1X"] = parseFloat(o["1X"]);
      if (o["12"]) m["12"] = parseFloat(o["12"]);
      if (o["X2"]) m["X2"] = parseFloat(o["X2"]);
      if (Object.keys(m).length) out["Double Chance"] = m;
    } else if (name === "Totals") {
      let best = odds.find(o => parseFloat(o.hdp) === 2.5)
              || odds.reduce((a, b) => Math.abs(parseFloat(b.hdp) - 2.5) < Math.abs(parseFloat(a.hdp) - 2.5) ? b : a);
      if (best?.over && best?.under) {
        out[`O/U ${best.hdp}`] = { Over: parseFloat(best.over), Under: parseFloat(best.under) };
      }
    } else if (name === "Both Teams To Score") {
      const o = odds[0];
      if (o?.yes && o?.no) out["Both Teams Score"] = { Yes: parseFloat(o.yes), No: parseFloat(o.no) };
    } else if (name === "Spread") {
      const best = odds.reduce((a, b) => Math.abs(parseFloat(b.hdp)) < Math.abs(parseFloat(a.hdp)) ? b : a);
      if (best?.home && best?.away) {
        out[`Spread ${best.hdp}`] = { Home: parseFloat(best.home), Away: parseFloat(best.away) };
      }
    }
  }
  return out;
}

async function syncSport(sport) {
  console.log(`\n→ ${sport.slug}`);
  const events = await api(`/events?sport=${sport.slug}`);
  if (!Array.isArray(events)) { console.log(`  no events`); return 0; }

  const now = Date.now();
  // Pending only, sorted by start time, capped at max
  const upcoming = events
    .filter(e => e.status === "pending" && new Date(e.date).getTime() > now - 30 * 60_000)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, sport.max);

  console.log(`  ${events.length} total / ${upcoming.length} to fetch odds for`);
  if (!upcoming.length) return 0;

  const rows = [];
  for (const e of upcoming) {
    const od = await api(`/odds?sport=${sport.slug}&eventId=${e.id}&bookmakers=${BOOKMAKERS}`);
    if (!od) continue;
    const markets = parseMarkets(od.bookmakers);
    if (Object.keys(markets).length === 0) continue;

    rows.push({
      id: String(e.id),
      sport: sport.slug,
      league: e.league?.name || "League",
      home_team: e.home,
      away_team: e.away,
      commence_time: e.date,
      status: "upcoming",
      markets_data: JSON.stringify(markets),
      updated_at: new Date().toISOString(),
    });
  }

  if (!rows.length) { console.log(`  no rows produced`); return 0; }

  // Upsert into Supabase (Prefer: resolution=merge-duplicates)
  const r = await fetch(`${SB_URL}/rest/v1/live_fixtures?on_conflict=id`, {
    method: "POST", headers: SH, body: JSON.stringify(rows),
  });
  if (!r.ok) {
    console.error(`  ✗ Supabase upsert HTTP ${r.status}: ${await r.text()}`);
    return 0;
  }
  console.log(`  ✓ upserted ${rows.length} rows`);
  return rows.length;
}

async function pruneStale() {
  // Delete events that started more than 6 hours ago
  const cutoff = new Date(Date.now() - 6 * 3600_000).toISOString();
  const r = await fetch(`${SB_URL}/rest/v1/live_fixtures?commence_time=lt.${cutoff}`, {
    method: "DELETE",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (r.ok) console.log(`\n✓ pruned stale fixtures (older than ${cutoff})`);
}

(async () => {
  let total = 0;
  for (const sport of SPORTS) {
    total += await syncSport(sport);
  }
  await pruneStale();
  console.log(`\n=== Done: ${total} fixtures synced ===`);
})().catch(e => { console.error(e); process.exit(1); });
