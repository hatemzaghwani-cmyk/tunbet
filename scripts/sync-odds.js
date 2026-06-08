// Sync odds-api.io → Supabase live_fixtures every 20 minutes
// Strategy: prioritize TOP-tier leagues (World Cup, CL, EPL, NBA, etc.) — not random regional games
// Rate budget: 100 req/h = ~3 runs of 30 events each → max=30 events distributed across sports

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

// Per-sport: max events to fetch odds for, plus league priority keywords
// (Events whose league name matches a priority keyword bubble to the top of the queue)
const SPORTS = [
  {
    slug: "football", max: 40,
    priorities: [
      "world cup", "champions league", "europa league", "uefa nations",
      "premier league", "laliga", "la liga", "serie a", "bundesliga", "ligue 1",
      "uefa", "fifa", "international", "copa", "euros", "european championship",
      "primeira", "eredivisie", "süper lig", "super lig", "mls",
    ],
  },
  { slug: "basketball",         max: 12, priorities: ["nba", "euroleague", "wnba", "fiba", "ncaa"] },
  { slug: "tennis",             max: 10, priorities: ["atp", "wta", "grand slam", "open", "masters", "wimbledon", "roland", "us open"] },
  { slug: "american-football",  max: 6,  priorities: ["nfl", "ncaa", "college"] },
  { slug: "baseball",           max: 6,  priorities: ["mlb", "kbo", "npb"] },
  { slug: "ice-hockey",         max: 6,  priorities: ["nhl", "khl", "shl"] },
  { slug: "mixed-martial-arts", max: 5,  priorities: ["ufc", "bellator", "one"] },
  { slug: "esports",            max: 5,  priorities: ["counter", "cs:go", "cs2", "lol", "league of legends", "dota", "valorant"] },
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
    } else if (name === "Team Total Home") {
      const row = odds.find((o) => parseFloat(o.hdp) === 1.5) || odds[Math.floor(odds.length / 2)];
      if (row?.over && row?.under) {
        out["Home Total 1.5"] = { Over: parseFloat(row.over), Under: parseFloat(row.under) };
      }
    } else if (name === "Team Total Away") {
      const row = odds.find((o) => parseFloat(o.hdp) === 1.5) || odds[Math.floor(odds.length / 2)];
      if (row?.over && row?.under) {
        out["Away Total 1.5"] = { Over: parseFloat(row.over), Under: parseFloat(row.under) };
      }
    }
  }
  return out;
}

// Score events: lower score = higher priority (sort ascending)
function scoreEvent(e, priorities) {
  const lg = (e.league?.name || "").toLowerCase();
  for (let i = 0; i < priorities.length; i++) {
    if (lg.includes(priorities[i])) return i;
  }
  return 999; // unmatched leagues go last
}

async function syncSport(sport) {
  console.log(`\n→ ${sport.slug}`);
  const events = await api(`/events?sport=${sport.slug}`);
  if (!Array.isArray(events)) { console.log("  no events"); return 0; }

  const now = Date.now();
  // Pending events only, within next 14 days
  const pending = events.filter(e =>
    e.status === "pending" &&
    new Date(e.date).getTime() > now - 30 * 60_000 &&
    new Date(e.date).getTime() < now + 14 * 86400_000
  );

  // Sort: priority first (lower score = higher), then by date
  const sorted = pending
    .map(e => ({ e, score: scoreEvent(e, sport.priorities) }))
    .sort((a, b) => a.score - b.score || new Date(a.e.date) - new Date(b.e.date))
    .map(x => x.e)
    .slice(0, sport.max);

  console.log(`  ${pending.length} pending / ${sorted.length} top-priority target`);
  if (!sorted.length) return 0;

  const rows = [];
  for (const e of sorted) {
    const od = await api(`/odds?sport=${sport.slug}&eventId=${e.id}&bookmakers=${BOOKMAKERS}`);
    if (!od) continue;
    const markets = parseMarkets(od.bookmakers);
    if (Object.keys(markets).length === 0) continue;
    rows.push({
      id: String(e.id), sport: sport.slug, league: e.league?.name || "League",
      home_team: e.home, away_team: e.away, commence_time: e.date, status: "upcoming",
      markets_data: JSON.stringify(markets), updated_at: new Date().toISOString(),
    });
  }
  if (!rows.length) return 0;
  const r = await fetch(`${SB_URL}/rest/v1/live_fixtures?on_conflict=id`, {
    method: "POST", headers: SH, body: JSON.stringify(rows),
  });
  if (!r.ok) { console.error(`  ✗ upsert HTTP ${r.status}: ${await r.text()}`); return 0; }
  console.log(`  ✓ ${rows.length} synced (top leagues prioritized)`);
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
  for (const sport of SPORTS) total += await syncSport(sport);
  await prune();
  console.log(`\n=== Done: ${total} fixtures ===`);
})().catch(e => { console.error(e); process.exit(1); });
