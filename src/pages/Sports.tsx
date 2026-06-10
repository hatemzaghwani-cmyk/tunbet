import {
  Trophy, Search, X, Ticket, CheckCircle, XCircle, Timer,
  RefreshCw, Zap, Calendar, ChevronDown, Radio,
  Globe, Swords, Plus
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import {
  fetchOddsMatches, SPORTS, placeSportsBetBatch, fetchMySportsBets,
  clearSportsbookCache, type OddsMatch,
} from "@/lib/oddsApi";

interface Slip { id: string; matchId: string; match: string; mk: string; sel: string; odds: number; }
interface Bet {
  id: number; event_name: string; selection_name: string;
  odds: number; stake: number; potential_win: number; status: string; created_at: string;
}

type TimeFilter = "all" | "today" | "tomorrow" | "week";

function teamColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h}, 70%, 45%)`;
}
function teamInitials(name: string) {
  return name
    .split(/[\s\-_]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
}
function TeamBadge({ name }: { name: string }) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    const known: Record<string, string> = {
      "Barcelona": "133739", "Real Madrid": "133738", "Arsenal": "133604", "Chelsea": "133610",
      "Liverpool": "133616", "Manchester United": "133618", "Manchester City": "133617",
      "Tottenham Hotspur": "133621", "Bayern Munich": "133724", "Borussia Dortmund": "133731",
      "Juventus": "133676", "Inter Milan": "133667", "AC Milan": "133661", "Napoli": "133688",
      "Paris Saint-Germain": "133702", "Marseille": "133700", "Ajax": "133755", "Benfica": "133778",
      "Porto": "133787", "Sporting CP": "133788", "RB Leipzig": "133665", "Atletico Madrid": "133740",
    };
    const id = known[name] || known[Object.keys(known).find(k => name.toLowerCase().includes(k.toLowerCase())) as any];
    if (id) {
      fetch(`https://www.thesportsdb.com/api/v1/json/3/lookupteam.php?id=${id}`)
        .then(r => r.json())
        .then(d => {
          const badge = d?.teams?.[0]?.strTeamBadge || d?.teams?.[0]?.strTeamLogo;
          if (badge) setImg(badge);
        })
        .catch(() => {});
    }
  }, [name]);
  if (img) {
    return (
      <img
        src={img}
        alt={name}
        className="w-10 h-10 object-contain flex-shrink-0 rounded-full p-0.5"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        loading="lazy"
        onError={() => setImg(null)}
      />
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black uppercase"
      style={{ background: teamColor(name), color: "#fff", border: "2px solid rgba(255,255,255,0.15)" }}
    >
      {teamInitials(name)}
    </div>
  );
}

export default function Sports() {
  const { user, refreshBalance } = useAuth();
  const [matches, setMatches] = useState<OddsMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sport, setSport] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<"live" | "upcoming">("upcoming");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [auth, setAuth] = useState(false);
  const [slip, setSlip] = useState<Slip[]>([]);
  const [stake, setStake] = useState("");
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [tab, setTab] = useState<"m" | "b">("m");
  const [bets, setBets] = useState<Bet[]>([]);
  const [betFilter, setBetFilter] = useState<"all" | "open" | "settled">("all");
  const [ldb, setLdb] = useState(false);
  const [showSlipPanel, setShowSlipPanel] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchOddsMatches(sport);
      setMatches(d);
      setApiConnected(true);
    } catch {
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  }, [sport]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const iv = setInterval(() => fetchOddsMatches(sport).then(setMatches).catch(() => setApiConnected(false)), 35000);
    return () => clearInterval(iv);
  }, [sport]);

  useEffect(() => {
    if (tab !== "b" || !user) return;
    setLdb(true);
    fetchMySportsBets(user.id)
      .then(d => { if (Array.isArray(d)) setBets(d); })
      .catch(() => {})
      .finally(() => setLdb(false));
  }, [tab, user]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday); startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const endOfTomorrow = new Date(startOfTomorrow); endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    const endOfWeek = new Date(startOfToday); endOfWeek.setDate(endOfWeek.getDate() + 7);

    return matches.filter(m => {
      const matchTime = new Date(m.date).getTime();
      if (m.status === "finished") return false;
      if (statusTab === "live" && m.status !== "live") return false;
      if (statusTab === "upcoming" && m.status !== "upcoming") return false;
      if (m.status !== "live" && matchTime < now - 10 * 60_000) return false;
      if (q && !`${m.home} ${m.away} ${m.league}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (leagueFilter !== "all" && m.league !== leagueFilter) return false;
      if (timeFilter === "today" && (matchTime < startOfToday.getTime() || matchTime >= startOfTomorrow.getTime())) return false;
      if (timeFilter === "tomorrow" && (matchTime < startOfTomorrow.getTime() || matchTime >= endOfTomorrow.getTime())) return false;
      if (timeFilter === "week" && matchTime >= endOfWeek.getTime()) return false;
      return true;
    });
  }, [matches, q, leagueFilter, timeFilter, statusTab]);

  const grouped = useMemo(() => {
    const groups: Record<string, OddsMatch[]> = {};
    const now = new Date(); now.setHours(0, 0, 0, 0);
    for (const m of filtered) {
      const d = new Date(m.date); d.setHours(0, 0, 0, 0);
      const diff = Math.round((d.getTime() - now.getTime()) / 86400_000);
      let label = "";
      if (m.status === "live") label = "Live Now";
      else if (diff === 0) label = "Today";
      else if (diff === 1) label = "Tomorrow";
      else if (diff > 1 && diff < 7) label = d.toLocaleDateString("en-GB", { weekday: "long" });
      else label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      if (!groups[label]) groups[label] = [];
      groups[label].push(m);
    }
    const order = ["Live Now", "Today", "Tomorrow"];
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return new Date(groups[a][0].date).getTime() - new Date(groups[b][0].date).getTime();
    });
    return sortedKeys.map(k => ({ label: k, items: groups[k] }));
  }, [filtered]);

  const leagues = useMemo(() => {
    const s = new Set<string>();
    for (const m of matches) s.add(m.league);
    return Array.from(s).sort();
  }, [matches]);

  const liveCount = useMemo(() => matches.filter(m => m.status === "live").length, [matches]);
  const upcomingCount = useMemo(() => matches.filter(m => m.status === "upcoming").length, [matches]);

  const toggleSel = (m: OddsMatch, mk: string, sel: string, odds: number) => {
    const id = `${m.id}::${mk}::${sel}`;
    if (slip.find(s => s.id === id)) { setSlip(slip.filter(s => s.id !== id)); return; }
    setSlip([...slip.filter(s => s.matchId !== m.id), { id, matchId: m.id, match: `${m.home} v ${m.away}`, mk, sel, odds }]);
    setShowSlipPanel(true);
  };

  const totalOdds = slip.reduce((a, b) => a * b.odds, 1);
  const stakeNum = parseFloat(stake) || 0;
  const singleTotalWin = slip.reduce((sum, s) => sum + (stakeNum * s.odds), 0);

  const placeBet = async () => {
    if (!user) { setAuth(true); return; }
    if (!slip.length) return setMsgErr("Select at least one match");
    if (!stakeNum || stakeNum < 0.5) return setMsgErr("Min stake: 0.50 TND");
    if (stakeNum > 5000) return setMsgErr("Max stake: 5000 TND");
    const totalDebit = stakeNum * slip.length;
    if (totalDebit > parseFloat(user.balance)) return setMsgErr(`Insufficient balance (need ${totalDebit.toFixed(2)} TND)`);
    const now = Date.now();
    for (const pick of slip) {
      const m = matches.find(x => x.id === pick.matchId);
      if (!m) return setMsgErr(`Match no longer available: ${pick.match}`);
      if (m.suspended) return setMsgErr(`Markets suspended: ${pick.match}`);
      if (m.status !== "live" && new Date(m.date).getTime() < now - 5 * 60_000) return setMsgErr(`Match started: ${pick.match}`);
    }
    setPlacing(true);
    try {
      const result = await placeSportsBetBatch(user.id, slip.map(pick => ({ eventId: pick.matchId, market: pick.mk, selection: pick.sel, odds: pick.odds })), stakeNum);
      if (!result.success) throw new Error(result.currentOdds ? `Odds changed — current: ${Number(result.currentOdds).toFixed(2)}` : (result.error || "Bet failed"));
      setSlip([]); setStake(""); setShowSlipPanel(false);
      setMsgOk(`${result.count || slip.length} bet${(result.count || slip.length) > 1 ? "s" : ""} placed! Potential win: ${singleTotalWin.toFixed(2)} TND`);
      await refreshBalance();
      if (tab === "b") { const fresh = await fetchMySportsBets(user.id); if (Array.isArray(fresh)) setBets(fresh); }
    } catch (e: any) { setMsgErr(e?.message || "Bet failed"); } finally { setPlacing(false); }
  };

  function setMsgOk(text: string) { setMsg({ text, tone: "ok" }); setTimeout(() => setMsg(null), 4000); }
  function setMsgErr(text: string) { setMsg({ text, tone: "err" }); setTimeout(() => setMsg(null), 3500); }

  const filteredBets = useMemo(() => {
    if (betFilter === "open") return bets.filter(b => b.status === "pending");
    if (betFilter === "settled") return bets.filter(b => b.status !== "pending");
    return bets;
  }, [bets, betFilter]);

  return (
    <div className="pb-32 px-3 pt-2">
      {/* Banner */}
      <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-4" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        <img src="/assets/sports-banner.jpg" alt="El Clásico" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(2,4,8,0.95) 0%, rgba(2,4,8,0.4) 50%, rgba(2,4,8,0.1) 100%)" }} />
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-2 mb-1">
            <Swords className="w-4 h-4" style={{ color: "#00D1FF" }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#00D1FF" }}>El Clásico Special</span>
          </div>
          <h2 className="text-xl font-black text-white leading-tight">Barcelona vs Real Madrid</h2>
          <p className="text-[10px] text-white/50 mt-0.5">Premium odds · Global leagues · Live betting</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: "#00D1FF" }} />
          <h1 className="text-lg font-black tracking-wider">SPORTSBOOK</h1>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-black" style={{ background: "rgba(0,209,255,0.15)", color: "#00D1FF", border: "1px solid rgba(0,209,255,0.35)" }}>GLOBAL</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!apiConnected && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black" style={{ background: "rgba(255,45,85,0.15)", color: "#FF2D55" }}>OFFLINE</span>
          )}
          <button onClick={() => { clearSportsbookCache(); load(); }} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            <RefreshCw className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input type="text" placeholder="Search teams, leagues..." value={q} onChange={e => setQ(e.target.value)}
          className="w-full rounded-xl py-2.5 pl-10 pr-10 text-sm outline-none text-white placeholder-white/30"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
        {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-white/40" /></button>}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1.5 mb-3">
        <button onClick={() => setStatusTab("live")}
          className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          style={{ background: statusTab === "live" ? "rgba(255,45,85,0.12)" : "rgba(255,255,255,0.04)", border: statusTab === "live" ? "1px solid rgba(255,45,85,0.35)" : "1px solid rgba(255,255,255,0.06)", color: statusTab === "live" ? "#FF2D55" : "rgba(255,255,255,0.5)" }}>
          <Radio className="w-3.5 h-3.5" />
          <span className="relative">Live {liveCount > 0 && <span className="absolute -top-2 -right-3 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center" style={{ background: "#FF2D55", color: "#fff" }}>{liveCount}</span>}</span>
        </button>
        <button onClick={() => setStatusTab("upcoming")}
          className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          style={{ background: statusTab === "upcoming" ? "rgba(0,209,255,0.12)" : "rgba(255,255,255,0.04)", border: statusTab === "upcoming" ? "1px solid rgba(0,209,255,0.35)" : "1px solid rgba(255,255,255,0.06)", color: statusTab === "upcoming" ? "#00D1FF" : "rgba(255,255,255,0.5)" }}>
          <Calendar className="w-3.5 h-3.5" /> Upcoming {upcomingCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-black" style={{ background: "rgba(0,209,255,0.15)", color: "#00D1FF" }}>{upcomingCount}</span>}
        </button>
      </div>

      {/* Sports */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide mb-2">
        <button onClick={() => setSport("all")}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap flex-shrink-0 flex items-center gap-1"
          style={{ background: sport === "all" ? "rgba(0,209,255,0.15)" : "rgba(255,255,255,0.04)", border: sport === "all" ? "1px solid rgba(0,209,255,0.4)" : "1px solid rgba(255,255,255,0.06)", color: sport === "all" ? "#00D1FF" : "rgba(255,255,255,0.5)" }}>
          <Globe className="w-3 h-3" /> All
        </button>
        {SPORTS.filter(s => s.slug !== "all").map(s => (
          <button key={s.slug} onClick={() => setSport(s.slug === sport ? "all" : s.slug)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap flex-shrink-0"
            style={{ background: sport === s.slug ? "rgba(0,209,255,0.15)" : "rgba(255,255,255,0.04)", border: sport === s.slug ? "1px solid rgba(0,209,255,0.4)" : "1px solid rgba(255,255,255,0.06)", color: sport === s.slug ? "#00D1FF" : "rgba(255,255,255,0.5)" }}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Time + League */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide">
        {(["all", "today", "tomorrow", "week"] as TimeFilter[]).map(tf => (
          <button key={tf} onClick={() => setTimeFilter(tf)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap"
            style={{ background: timeFilter === tf ? "rgba(255,255,255,0.08)" : "transparent", border: timeFilter === tf ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent", color: timeFilter === tf ? "#fff" : "rgba(255,255,255,0.35)" }}>
            {tf === "all" ? "Any Time" : tf === "today" ? "Today" : tf === "tomorrow" ? "Tomorrow" : "This Week"}
          </button>
        ))}
        {leagues.length > 0 && (
          <select value={leagueFilter} onChange={e => setLeagueFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-transparent outline-none cursor-pointer"
            style={{ border: "1px solid rgba(255,255,255,0.08)", color: leagueFilter !== "all" ? "#00D1FF" : "rgba(255,255,255,0.35)" }}>
            <option value="all" style={{ background: "#020408" }}>All Leagues</option>
            {leagues.map(l => <option key={l} value={l} style={{ background: "#020408" }}>{l}</option>)}
          </select>
        )}
      </div>

      {/* Tab switch */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setTab("m")} className="px-3 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: tab === "m" ? "rgba(0,209,255,0.15)" : "transparent", color: tab === "m" ? "#00D1FF" : "rgba(255,255,255,0.4)" }}>Matches</button>
        <button onClick={() => setTab("b")} className="px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1" style={{ background: tab === "b" ? "rgba(0,209,255,0.15)" : "transparent", color: tab === "b" ? "#00D1FF" : "rgba(255,255,255,0.4)" }}>My Bets {bets.length > 0 && <span className="px-1 py-0.5 rounded text-[8px]" style={{ background: "rgba(0,209,255,0.2)", color: "#00D1FF" }}>{bets.length}</span>}</button>
      </div>

      {/* Toast — lightweight CSS */}
      {msg && (
        <div className="mb-3 p-3 rounded-xl text-sm font-bold text-center transition-opacity duration-300"
          style={{ background: msg.tone === "ok" ? "rgba(0,200,83,0.12)" : "rgba(255,45,85,0.12)", border: msg.tone === "ok" ? "1px solid rgba(0,200,83,0.3)" : "1px solid rgba(255,45,85,0.3)", color: msg.tone === "ok" ? "#00C853" : "#FF2D55" }}>
          {msg.text}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: "rgba(255,255,255,0.04)", height: 120 }} />
          ))}
        </div>
      )}

      {/* Matches */}
      {tab === "m" && !loading && (
        <div className="space-y-4">
          {grouped.map(g => (
            <div key={g.label}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-3 rounded-full" style={{ background: g.label.includes("Live") ? "#FF2D55" : "#00D1FF" }} />
                <h2 className="text-xs font-black uppercase tracking-wider text-white/70">{g.label}</h2>
                <span className="text-[10px] text-white/30">{g.items.length} matches</span>
              </div>
              <div className="space-y-2">
                {g.items.map(m => <MatchCard key={m.id} m={m} slip={slip} onSel={toggleSel} />)}
              </div>
            </div>
          ))}
          {grouped.length === 0 && (
            <div className="text-center py-16 text-white/30">
              <p className="text-sm mb-1">No matches available</p>
              <p className="text-[10px] opacity-70">Try changing filters or check back soon.</p>
            </div>
          )}
        </div>
      )}

      {/* My Bets */}
      {tab === "b" && (
        <div className="space-y-3">
          {ldb && Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: "rgba(255,255,255,0.04)", height: 80 }} />)}
          {!ldb && filteredBets.length === 0 && <div className="text-center py-16 text-white/30"><Ticket className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No bets yet</p></div>}
          {!ldb && filteredBets.map(b => <BetCard key={b.id} b={b} />)}
          {!user && !ldb && <div className="text-center py-10"><button onClick={() => setAuth(true)} className="px-6 py-2.5 rounded-xl text-sm font-bold" style={{ background: "#00D1FF", color: "#020408" }}>Login to view bets</button></div>}
        </div>
      )}

      {/* Sticky Bet Slip */}
      {slip.length > 0 && (
        <div className="fixed bottom-20 left-3 right-3 z-40">
          <BetSlip slip={slip} stake={stake} setStake={setStake} totalOdds={totalOdds} singleTotalWin={singleTotalWin} balance={parseFloat(user?.balance || "0")} show={showSlipPanel} setShow={setShowSlipPanel} onRemove={(id: string) => setSlip(slip.filter(s => s.id !== id))} onClear={() => { setSlip([]); setStake(""); }} onPlace={placeBet} placing={placing} />
        </div>
      )}

      {auth && <AuthModal onClose={() => setAuth(false)} />}
    </div>
  );
}

function MatchCard({ m, slip, onSel }: { m: OddsMatch; slip: Slip[]; onSel: (m: OddsMatch, mk: string, sel: string, odds: number) => void }) {
  const isLive = m.status === "live";
  const dt = new Date(m.date);
  const timeStr = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const mkEntries = Object.entries(m.markets || {});
  const [showMore, setShowMore] = useState(false);
  const visibleMk = showMore ? mkEntries : mkEntries.slice(0, 5);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="p-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/40 font-mono uppercase tracking-wider">{m.league}</span>
            {isLive && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase" style={{ background: "rgba(255,45,85,0.15)", color: "#FF2D55" }}><span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" /> Live</span>}
            {m.suspended && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase" style={{ background: "rgba(255,165,0,0.15)", color: "#FFA500" }}>Suspended</span>}
          </div>
          <span className="text-[9px] text-white/30 font-mono">{isLive ? m.clock || "LIVE" : `${dateStr} ${timeStr}`}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <TeamBadge name={m.home} />
            <div className="min-w-0"><span className="text-sm font-bold text-white truncate block">{m.home}</span></div>
            {isLive && m.homeScore !== undefined && <span className="text-sm font-black" style={{ color: "#FF2D55" }}>{m.homeScore}</span>}
          </div>
          <div className="flex flex-col items-center mx-2 flex-shrink-0"><span className="text-[9px] text-white/20 font-mono uppercase">vs</span></div>
          <div className="flex items-center gap-2.5 flex-1 justify-end min-w-0">
            {isLive && m.awayScore !== undefined && <span className="text-sm font-black" style={{ color: "#FF2D55" }}>{m.awayScore}</span>}
            <div className="min-w-0 text-right"><span className="text-sm font-bold text-white truncate block">{m.away}</span></div>
            <TeamBadge name={m.away} />
          </div>
        </div>
      </div>

      <div className="px-3 pb-3 space-y-2">
        {visibleMk.map(([mkName, mkOdds]) => (
          <div key={mkName}>
            <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">{mkName}</div>
            <OddsGrid m={m} mkName={mkName} mkOdds={mkOdds} slip={slip} onSel={onSel} />
          </div>
        ))}
        {mkEntries.length > 5 && (
          <button onClick={() => setShowMore(!showMore)} className="w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
            {showMore ? <><ChevronDown className="w-3 h-3 rotate-180" /> Less</> : <><Plus className="w-3 h-3" /> +{mkEntries.length - 5} markets</>}
          </button>
        )}
      </div>
    </div>
  );
}

function OddsGrid({ m, mkName, mkOdds, slip, onSel }: { m: OddsMatch; mkName: string; mkOdds: Record<string, number>; slip: Slip[]; onSel: (m: OddsMatch, mk: string, sel: string, odds: number) => void }) {
  const entries = Object.entries(mkOdds);
  const cols = entries.length <= 3 ? entries.length : 3;
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {entries.map(([sel, odds]) => {
        const id = `${m.id}::${mkName}::${sel}`;
        const isSel = slip.some(s => s.id === id);
        return (
          <button key={sel} onClick={() => onSel(m, mkName, sel, odds)} className="py-1.5 px-1 rounded-lg transition-all"
            style={{ background: isSel ? "rgba(0,209,255,0.22)" : "rgba(255,255,255,0.05)", border: isSel ? "1px solid rgba(0,209,255,0.6)" : "1px solid rgba(255,255,255,0.07)", color: isSel ? "#00D1FF" : "rgba(255,255,255,0.9)" }}>
            <div className="text-[8px] uppercase opacity-60 mb-0.5 truncate px-0.5">{sel}</div>
            <div className="font-black text-xs tabular-nums">{odds.toFixed(2)}</div>
          </button>
        );
      })}
    </div>
  );
}

function BetSlip({ slip, stake, setStake, totalOdds, singleTotalWin, balance, show, setShow, onRemove, onClear, onPlace, placing }: any) {
  const stakeNum = parseFloat(stake) || 0;
  const totalDebit = stakeNum * slip.length;
  const insufficient = stakeNum > 0 && totalDebit > balance;
  const invalid = stakeNum > 0 && (stakeNum < 0.5 || stakeNum > 5000);
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: "rgba(2,4,8,0.97)", border: "1px solid rgba(0,209,255,0.4)", backdropFilter: "blur(20px)", boxShadow: "0 -8px 24px rgba(0,209,255,0.25)" }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: "rgba(0,209,255,0.08)" }}>
        <button onClick={() => setShow(!show)} className="flex items-center gap-2">
          <Ticket className="w-4 h-4" style={{ color: "#00D1FF" }} />
          <span className="text-xs font-black uppercase" style={{ color: "#00D1FF" }}>Bet Slip ({slip.length})</span>
          <ChevronDown className={`w-3 h-3 text-white/60 transition-transform ${show ? "" : "rotate-180"}`} />
        </button>
        <button onClick={onClear} className="text-[10px] text-white/40 underline">Clear</button>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${show ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
        {slip.length > 1 && (
          <div className="px-3 pt-2.5">
            <div className="px-3 py-2 rounded-lg text-[10px] font-bold flex items-center justify-between" style={{ background: "rgba(0,209,255,0.08)", border: "1px solid rgba(0,209,255,0.18)", color: "rgba(255,255,255,0.65)" }}>
              <span>Singles mode</span><span style={{ color: "#00D1FF" }}>{slip.length} tickets · stake per pick</span>
            </div>
          </div>
        )}
        <div className="px-3 py-2 space-y-1.5 max-h-48 overflow-y-auto">
          {slip.map((s: Slip) => (
            <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.35)" }}>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-white truncate">{s.match}</div>
                <div className="text-[10px] text-white/50">{s.mk} · <span className="text-white/80">{s.sel}</span></div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-black text-sm tabular-nums" style={{ color: "#00D1FF" }}>{s.odds.toFixed(2)}</span>
                <button onClick={() => onRemove(s.id)}><X className="w-3.5 h-3.5 text-white/40" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-3 pb-2 space-y-2">
          <div className="flex gap-1">
            {[5, 10, 25, 50, 100].map(v => (
              <button key={v} onClick={() => setStake(String(v))} className="flex-1 py-1 rounded text-[10px] font-bold"
                style={{ background: stake === String(v) ? "rgba(0,209,255,0.18)" : "rgba(255,255,255,0.06)", color: stake === String(v) ? "#00D1FF" : "rgba(255,255,255,0.6)" }}>{v}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={stake} onChange={e => setStake(e.target.value)} placeholder="Stake (TND)" inputMode="decimal"
              className="flex-1 px-3 py-2 rounded-lg text-sm font-bold text-white outline-none" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" }} />
            <div className="text-right">
              <div className="text-[9px] text-white/40 uppercase">Win</div>
              <div className="text-sm font-black tabular-nums" style={{ color: "#00C853" }}>{singleTotalWin.toFixed(2)} TND</div>
            </div>
          </div>
          {slip.length > 0 && (
            <div className="text-[10px] text-white/50 px-1">
              Total stake: <span className="font-bold text-white">{totalDebit.toFixed(2)} TND</span>{" · "}Balance: <span className="font-bold" style={{ color: insufficient ? "#FF2D55" : "#00C853" }}>{balance.toFixed(2)} TND</span>
            </div>
          )}
          {insufficient && <div className="text-[10px] font-bold px-1" style={{ color: "#FF2D55" }}>Insufficient balance</div>}
          {invalid && <div className="text-[10px] font-bold px-1" style={{ color: "#FF2D55" }}>Stake must be 0.50–5000 TND</div>}
        </div>
      </div>
      <button onClick={onPlace} disabled={placing || !slip.length || stakeNum <= 0 || insufficient || invalid}
        className="w-full py-3 text-sm font-black tracking-wider disabled:opacity-40 flex items-center justify-center gap-1.5"
        style={{ background: insufficient || invalid ? "rgba(255,45,85,0.3)" : "#00D1FF", color: insufficient || invalid ? "#FF2D55" : "#020408" }}>
        {placing ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" /> PLACING…</>
          : insufficient ? <>INSUFFICIENT BALANCE</>
          : invalid ? <>INVALID STAKE</>
          : <><Zap className="w-3.5 h-3.5" /> PLACE {slip.length > 1 ? `${slip.length} BETS` : "BET"}</>}
      </button>
    </div>
  );
}

function BetCard({ b }: { b: Bet }) {
  const color = b.status === "won" ? "#00C853" : b.status === "lost" ? "#FF2D55" : "#f59e0b";
  const bg = b.status === "won" ? "rgba(0,200,83,0.1)" : b.status === "lost" ? "rgba(255,45,85,0.08)" : "rgba(245,158,11,0.08)";
  const Icon = b.status === "won" ? CheckCircle : b.status === "lost" ? XCircle : Timer;
  return (
    <div className="rounded-xl p-3" style={{ background: bg, border: `1px solid ${color}30` }}>
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <div className="text-xs font-bold text-white flex-1 leading-tight">{b.event_name}</div>
        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase flex-shrink-0 flex items-center gap-1" style={{ background: `${color}30`, color }}>
          <Icon className="w-2.5 h-2.5" />{b.status}
        </span>
      </div>
      <div className="text-[10px] text-white/60 mb-2">{b.selection_name}</div>
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <div><div className="text-white/35 uppercase text-[8px]">Stake</div><div className="font-bold text-white tabular-nums">{b.stake} TND</div></div>
        <div><div className="text-white/35 uppercase text-[8px]">Odds</div><div className="font-bold text-white tabular-nums">{b.odds.toFixed(2)}</div></div>
        <div><div className="text-white/35 uppercase text-[8px]">{b.status === "won" ? "Won" : "Potential"}</div><div className="font-black tabular-nums" style={{ color }}>{b.potential_win.toFixed(2)}</div></div>
      </div>
    </div>
  );
}
