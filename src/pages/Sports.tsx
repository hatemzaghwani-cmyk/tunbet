import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Search, X, Ticket, CheckCircle, XCircle, Timer,
  RefreshCw, Zap, Calendar, ChevronDown, Filter, TrendingUp, Radio,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import {
  fetchOddsMatches, SPORTS, placeSportsBetBatch, fetchMySportsBets,
  getSportsbookApiBase, clearSportsbookCache, type OddsMatch,
} from "@/lib/oddsApi";

const API_HOST = getSportsbookApiBase().replace(/^https?:\/\//, "");

interface Slip { id: string; matchId: string; match: string; mk: string; sel: string; odds: number; }
interface Bet {
  id: number; event_name: string; selection_name: string;
  odds: number; stake: number; potential_win: number; status: string; created_at: string;
}

type TimeFilter = "all" | "today" | "tomorrow" | "week";

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
  const [betMode, setBetMode] = useState<"single" | "multi">("single");
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [tab, setTab] = useState<"m" | "b">("m");
  const [bets, setBets] = useState<Bet[]>([]);
  const [betFilter, setBetFilter] = useState<"all" | "open" | "settled">("all");
  const [ldb, setLdb] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [showSlipPanel, setShowSlipPanel] = useState(false);

  // ─── Fetch matches ─────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchOddsMatches(sport).then(d => { setMatches(d); setLoading(false); });
    const iv = setInterval(() => fetchOddsMatches(sport).then(setMatches), 35000);
    return () => clearInterval(iv);
  }, [sport]);

  // ─── Fetch user bets ───────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "b" || !user) return;
    setLdb(true);
    fetchMySportsBets(user.id)
      .then(d => { if (Array.isArray(d)) setBets(d); })
      .catch(() => {})
      .finally(() => setLdb(false));
  }, [tab, user]);

  // ─── Filter logic ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday); startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const endOfTomorrow = new Date(startOfTomorrow); endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    const endOfWeek = new Date(startOfToday); endOfWeek.setDate(endOfWeek.getDate() + 7);

    return matches.filter(m => {
      // Hide finished/stale matches and apply LIVE/Upcoming professional tabs
      const matchTime = new Date(m.date).getTime();
      if (m.status === "finished") return false;
      if (statusTab === "live" && m.status !== "live") return false;
      if (statusTab === "upcoming" && m.status !== "upcoming") return false;
      if (m.status !== "live" && matchTime < now - 10 * 60_000) return false;
      // Search
      if (q && !`${m.home} ${m.away} ${m.league}`.toLowerCase().includes(q.toLowerCase())) return false;
      // League filter
      if (leagueFilter !== "all" && m.league !== leagueFilter) return false;
      // Time filter
      if (timeFilter === "today" && (matchTime < startOfToday.getTime() || matchTime >= startOfTomorrow.getTime())) return false;
      if (timeFilter === "tomorrow" && (matchTime < startOfTomorrow.getTime() || matchTime >= endOfTomorrow.getTime())) return false;
      if (timeFilter === "week" && matchTime >= endOfWeek.getTime()) return false;
      return true;
    });
  }, [matches, q, leagueFilter, timeFilter, statusTab]);

  // Group by date (Today / Tomorrow / etc)
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
    // Order: Live first, Today, Tomorrow, then chronologically
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

  // Available leagues for active sport
  const leagues = useMemo(() => {
    const s = new Set<string>();
    for (const m of matches) s.add(m.league);
    return Array.from(s).sort();
  }, [matches]);

  // Live count, etc
  const liveCount = useMemo(() => matches.filter(m => m.status === "live").length, [matches]);
  const upcomingCount = useMemo(() => matches.filter(m => m.status === "upcoming").length, [matches]);
  const todayCount = useMemo(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const tom = new Date(t); tom.setDate(tom.getDate() + 1);
    return matches.filter(m => {
      const mt = new Date(m.date).getTime();
      return mt >= t.getTime() && mt < tom.getTime();
    }).length;
  }, [matches]);

  // ─── Bet slip logic ────────────────────────────────────────────────────
  const toggleSel = (m: OddsMatch, mk: string, sel: string, odds: number) => {
    const id = `${m.id}::${mk}::${sel}`;
    if (slip.find(s => s.id === id)) { setSlip(slip.filter(s => s.id !== id)); return; }
    // One pick per match (replace any prior pick from same match)
    setSlip([
      ...slip.filter(s => s.matchId !== m.id),
      { id, matchId: m.id, match: `${m.home} v ${m.away}`, mk, sel, odds },
    ]);
    setShowSlipPanel(true);
  };

  const totalOdds = slip.reduce((a, b) => a * b.odds, 1);
  const stakeNum = parseFloat(stake) || 0;
  const potentialWin = totalOdds * stakeNum;
  const singleTotalWin = slip.reduce((sum, s) => sum + (stakeNum * s.odds), 0);

  const placeBet = async () => {
    if (!user) { setAuth(true); return; }
    if (!slip.length) return setMsgErr("Select at least one match");
    if (!stakeNum || stakeNum < 0.5) return setMsgErr("Min stake: 0.50 TND");
    if (stakeNum > 5000) return setMsgErr("Max stake: 5000 TND");
    if (!Number.isFinite(stakeNum)) return setMsgErr("Invalid stake");

    // Total to debit depends on mode
    const totalDebit = stakeNum * slip.length;
    if (totalDebit > parseFloat(user.balance)) {
      return setMsgErr(`Insufficient balance (need ${totalDebit.toFixed(2)} TND)`);
    }

    // Verify matches haven't started
    const now = Date.now();
    for (const pick of slip) {
      const m = matches.find(x => x.id === pick.matchId);
      if (!m) return setMsgErr(`Match no longer available: ${pick.match}`);
      if (m.suspended) return setMsgErr(`Markets suspended after score change: ${pick.match}`);
      if (m.status !== "live" && new Date(m.date).getTime() < now - 5 * 60_000) {
        return setMsgErr(`Match already started: ${pick.match}`);
      }
    }

    setPlacing(true);
    try {
      const result = await placeSportsBetBatch(
        user.id,
        slip.map(pick => ({
          eventId: pick.matchId,
          market: pick.mk,
          selection: pick.sel,
          odds: pick.odds,
        })),
        stakeNum,
      );

      if (!result.success) {
        throw new Error(result.currentOdds ? `Odds changed — current: ${Number(result.currentOdds).toFixed(2)}` : (result.error || "Bet failed"));
      }

      setSlip([]); setStake(""); setShowSlipPanel(false);
      setMsgOk(`${result.count || slip.length} bet${(result.count || slip.length) > 1 ? "s" : ""} placed! Potential win: ${singleTotalWin.toFixed(2)} TND`);
      await refreshBalance();
      if (tab === "b") {
        const fresh = await fetchMySportsBets(user.id);
        if (Array.isArray(fresh)) setBets(fresh);
      }
    } catch (e: any) {
      setMsgErr(e?.message || "Bet failed");
    } finally {
      setPlacing(false);
    }
  };

  function setMsgOk(text: string) { setMsg({ text, tone: "ok" }); setTimeout(() => setMsg(null), 4000); }
  function setMsgErr(text: string) { setMsg({ text, tone: "err" }); setTimeout(() => setMsg(null), 3500); }

  const filteredBets = useMemo(() => {
    if (betFilter === "open") return bets.filter(b => b.status === "pending");
    if (betFilter === "settled") return bets.filter(b => b.status !== "pending");
    return bets;
  }, [bets, betFilter]);

  // ─── UI ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-32 px-3 pt-2">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: "#00D1FF" }} />
          <h1 className="text-base font-black tracking-wider">SPORTS</h1>
          {liveCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black ml-1"
              style={{ background: "rgba(255,45,85,0.18)", color: "#FF2D55" }}>
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: "#FF2D55" }} />
              {liveCount} LIVE
            </span>
          )}
        </div>
        <button onClick={() => { setLoading(true); clearSportsbookCache(); fetchOddsMatches(sport).then(d => { setMatches(d); setLoading(false); }); }}
          className="p-2 rounded-lg" style={{ background: "rgba(0,209,255,0.1)", border: "1px solid rgba(0,209,255,0.2)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: "#00D1FF" }} />
        </button>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 mb-3 sticky top-0 z-30 pt-1" style={{ background: "linear-gradient(to bottom, #020408 70%, transparent)" }}>
        <button onClick={() => setTab("m")} className="flex-1 py-2.5 rounded-xl text-xs font-black tracking-wide"
          style={{
            background: tab === "m" ? "rgba(0,209,255,0.18)" : "rgba(255,255,255,0.04)",
            border: tab === "m" ? "1px solid rgba(0,209,255,0.45)" : "1px solid rgba(255,255,255,0.06)",
            color: tab === "m" ? "#00D1FF" : "rgba(255,255,255,0.5)",
          }}>
          MATCHES {filtered.length > 0 && <span className="opacity-70">({filtered.length})</span>}
        </button>
        <button onClick={() => setTab("b")} className="flex-1 py-2.5 rounded-xl text-xs font-black tracking-wide"
          style={{
            background: tab === "b" ? "rgba(0,209,255,0.18)" : "rgba(255,255,255,0.04)",
            border: tab === "b" ? "1px solid rgba(0,209,255,0.45)" : "1px solid rgba(255,255,255,0.06)",
            color: tab === "b" ? "#00D1FF" : "rgba(255,255,255,0.5)",
          }}>
          MY BETS
        </button>
      </div>

      {tab === "m" && (
        <>
          {/* LIVE / Upcoming tabs */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {([
              { id: "live", label: "LIVE", count: liveCount, color: "#FF2D55", icon: Radio },
              { id: "upcoming", label: "UPCOMING", count: upcomingCount, color: "#00D1FF", icon: Calendar },
            ] as const).map(x => {
              const Icon = x.icon;
              const active = statusTab === x.id;
              return (
                <button key={x.id} onClick={() => setStatusTab(x.id)}
                  className="py-2.5 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-1.5"
                  style={{
                    background: active ? `${x.color}22` : "rgba(255,255,255,0.04)",
                    border: active ? `1px solid ${x.color}66` : "1px solid rgba(255,255,255,0.06)",
                    color: active ? x.color : "rgba(255,255,255,0.45)",
                  }}>
                  <Icon className={`w-3.5 h-3.5 ${x.id === "live" && x.count > 0 ? "animate-pulse" : ""}`} />
                  {x.label}
                  <span className="opacity-70">({x.count})</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search teams, leagues..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>

          {/* Sport pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 mb-2 scrollbar-hide">
            {SPORTS.map(s => (
              <button key={s.slug} onClick={() => { setSport(s.slug); setLeagueFilter("all"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-bold flex-shrink-0"
                style={{
                  background: sport === s.slug ? "rgba(0,209,255,0.15)" : "rgba(255,255,255,0.04)",
                  border: sport === s.slug ? "1px solid rgba(0,209,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
                  color: sport === s.slug ? "#00D1FF" : "rgba(255,255,255,0.45)",
                }}>
                <span className="text-sm">{s.icon}</span>{s.name}
              </button>
            ))}
          </div>

          {/* Time filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-3 px-3 mb-3 scrollbar-hide">
            {([
              { id: "all", label: "All", count: matches.length, accent: undefined as string | undefined },
              { id: "today", label: "Today", count: todayCount, accent: undefined as string | undefined },
              { id: "tomorrow", label: "Tomorrow", count: undefined as number | undefined, accent: undefined as string | undefined },
              { id: "week", label: "This Week", count: undefined as number | undefined, accent: undefined as string | undefined },
            ]).map(f => (
              <button key={f.id} onClick={() => setTimeFilter(f.id as TimeFilter)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] font-bold flex-shrink-0"
                style={{
                  background: timeFilter === f.id ? `${f.accent || "#00D1FF"}20` : "rgba(255,255,255,0.03)",
                  border: timeFilter === f.id ? `1px solid ${f.accent || "#00D1FF"}60` : "1px solid rgba(255,255,255,0.05)",
                  color: timeFilter === f.id ? (f.accent || "#00D1FF") : "rgba(255,255,255,0.4)",
                }}>
                {f.label}
                {("count" in f && f.count !== undefined) && <span className="opacity-60">({f.count})</span>}
              </button>
            ))}
          </div>

          {/* League filter */}
          {leagues.length > 1 && (
            <details className="mb-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <summary className="px-3 py-2 flex items-center gap-2 cursor-pointer text-[11px] text-white/60">
                <Filter className="w-3 h-3" />
                <span className="font-bold">League:</span>
                <span style={{ color: leagueFilter !== "all" ? "#00D1FF" : "rgba(255,255,255,0.4)" }}>
                  {leagueFilter === "all" ? "All Leagues" : leagueFilter}
                </span>
                <ChevronDown className="w-3 h-3 ml-auto" />
              </summary>
              <div className="px-2 pb-2 flex flex-wrap gap-1.5">
                <button onClick={() => setLeagueFilter("all")} className="px-2 py-1 rounded text-[10px] font-bold"
                  style={{
                    background: leagueFilter === "all" ? "rgba(0,209,255,0.18)" : "rgba(255,255,255,0.04)",
                    color: leagueFilter === "all" ? "#00D1FF" : "rgba(255,255,255,0.5)",
                  }}>All</button>
                {leagues.map(lg => (
                  <button key={lg} onClick={() => setLeagueFilter(lg)} className="px-2 py-1 rounded text-[10px] font-bold"
                    style={{
                      background: leagueFilter === lg ? "rgba(0,209,255,0.18)" : "rgba(255,255,255,0.04)",
                      color: leagueFilter === lg ? "#00D1FF" : "rgba(255,255,255,0.5)",
                    }}>{lg}</button>
                ))}
              </div>
            </details>
          )}

          {/* Data source banner */}
          <div className="mb-3 px-3 py-2 rounded-xl flex items-center gap-2 text-[10px]"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <span className="px-1.5 py-0.5 rounded font-black" style={{ background: "rgba(34,197,94,0.25)", color: "#22c55e" }}>LIVE FEED</span>
            <span className="text-white/70">
ESPN live fixtures + <span className="font-bold text-white">DraftKings</span> odds where available · TunBet math model fallback · backend {API_HOST}
            </span>
          </div>

          {/* Matches */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {grouped.map(group => (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    {group.label === "Live Now" ? (
                      <Radio className="w-3.5 h-3.5 animate-pulse" style={{ color: "#FF2D55" }} />
                    ) : (
                      <Calendar className="w-3.5 h-3.5 text-white/40" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-wider"
                      style={{ color: group.label === "Live Now" ? "#FF2D55" : "rgba(255,255,255,0.5)" }}>
                      {group.label}
                    </span>
                    <span className="text-[10px] text-white/30">· {group.items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {group.items.map(m => (
                      <MatchCard
                        key={m.id} m={m} slip={slip}
                        onSel={toggleSel}
                        expanded={expandedMatch === m.id}
                        onToggle={() => setExpandedMatch(expandedMatch === m.id ? null : m.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "b" && (
        <>
          <div className="flex gap-2 mb-3">
            {(["all", "open", "settled"] as const).map(f => (
              <button key={f} onClick={() => setBetFilter(f)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase"
                style={{
                  background: betFilter === f ? "rgba(0,209,255,0.15)" : "rgba(255,255,255,0.04)",
                  border: betFilter === f ? "1px solid rgba(0,209,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
                  color: betFilter === f ? "#00D1FF" : "rgba(255,255,255,0.45)",
                }}>{f}</button>
            ))}
          </div>
          {ldb ? (
            <div className="text-center py-12 text-white/30">Loading…</div>
          ) : filteredBets.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">
              <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
              No {betFilter !== "all" ? betFilter + " " : ""}bets yet.
            </div>
          ) : (
            <div className="space-y-2">{filteredBets.map(b => <BetCard key={b.id} b={b} />)}</div>
          )}
        </>
      )}

      {/* BET SLIP FAB */}
      {slip.length > 0 && (
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-24 left-3 right-3 max-w-[430px] mx-auto z-40">
          <BetSlip
            slip={slip} stake={stake} setStake={setStake}
            betMode={betMode} setBetMode={setBetMode}
            totalOdds={totalOdds} potentialWin={potentialWin} singleTotalWin={singleTotalWin}
            show={showSlipPanel} setShow={setShowSlipPanel}
            balance={user ? parseFloat(user.balance) : 0}
            onRemove={(id: string) => setSlip(slip.filter(s => s.id !== id))}
            onClear={() => { setSlip([]); setStake(""); }}
            onPlace={placeBet} placing={placing}
          />
        </motion.div>
      )}

      {/* TOAST */}
      <AnimatePresence>
        {msg && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed top-20 left-3 right-3 z-50 max-w-[430px] mx-auto p-3 rounded-xl text-xs font-bold text-center"
            style={{
              background: "rgba(0,0,0,0.95)",
              border: `1px solid ${msg.tone === "ok" ? "rgba(0,200,83,0.5)" : "rgba(255,45,85,0.5)"}`,
              color: msg.tone === "ok" ? "#00C853" : "#FF2D55",
            }}>
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {auth && <AuthModal onClose={() => setAuth(false)} />}
    </div>
  );
}

// ─── Match Card ───────────────────────────────────────────────────────────
function MatchCard({
  m, slip, onSel, expanded, onToggle,
}: {
  m: OddsMatch; slip: Slip[];
  onSel: (m: OddsMatch, mk: string, sel: string, odds: number) => void;
  expanded: boolean; onToggle: () => void;
}) {
  const dt = new Date(m.date);
  const timeStr = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  // Determine main market: 1X2 if available, else first
  const mainMarketName = m.markets["1X2"] ? "1X2" : Object.keys(m.markets)[0];
  const mainMarket = m.markets[mainMarketName];
  const extraMarketsCount = Object.keys(m.markets).length - 1;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: m.status === "live" ? "rgba(255,45,85,0.04)" : "rgba(255,255,255,0.03)",
        border: m.status === "live" ? "1px solid rgba(255,45,85,0.2)" : "1px solid rgba(255,255,255,0.06)",
      }}>
      {/* Header */}
      <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {m.status === "live" && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black flex-shrink-0"
              style={{ background: "rgba(255,45,85,0.2)", color: "#FF2D55" }}>
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: "#FF2D55" }} />
              LIVE
            </span>
          )}
          <span className="text-[10px] text-white/45 truncate">{m.league}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/40 flex-shrink-0">
          <Timer className="w-2.5 h-2.5" />
          {m.status === "live" ? "Now" : `${dateStr} ${timeStr}`}
        </div>
      </div>

      {/* Source attribution */}
      {m.updatedAt && (
        <div className="px-3 pb-1 flex items-center gap-1.5 text-[8px] text-white/30">
          <span className="px-1 py-0.5 rounded font-black" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
            {m.hasRealOdds ? (m.oddsSource || "ESPN DraftKings") : "TunBet Model"}
          </span>
          <span>•</span>
          <span>Updated {timeAgo(m.updatedAt)}</span>
        </div>
      )}

      {/* Teams */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between gap-3 mb-0.5">
          <div className="text-sm font-black text-white truncate flex-1">{m.home}</div>
          {m.status === "live" && m.homeScore !== undefined && (
            <span className="text-base font-black tabular-nums" style={{ color: "#FF2D55" }}>{m.homeScore}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-black text-white truncate flex-1">{m.away}</div>
          {m.status === "live" && m.awayScore !== undefined && (
            <span className="text-base font-black tabular-nums" style={{ color: "#FF2D55" }}>{m.awayScore}</span>
          )}
        </div>
      </div>

      {/* Main market odds */}
      {mainMarket && (
        <div className="px-3 pb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] text-white/35 uppercase tracking-wider font-bold">{mainMarketName}</span>
            {extraMarketsCount > 0 && (
              <button onClick={onToggle} className="flex items-center gap-1 text-[10px] font-bold"
                style={{ color: "#00D1FF" }}>
                {expanded ? "Hide" : `+${extraMarketsCount} markets`}
                <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
          <OddsGrid m={m} mkName={mainMarketName} mkOdds={mainMarket} slip={slip} onSel={onSel} />
        </div>
      )}

      {/* Extra markets */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2.5 border-t pt-2.5"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {Object.entries(m.markets).filter(([k]) => k !== mainMarketName).map(([mk, mkOdds]) => (
                <div key={mk}>
                  <div className="text-[9px] text-white/35 uppercase tracking-wider font-bold mb-1.5">{mk}</div>
                  <OddsGrid m={m} mkName={mk} mkOdds={mkOdds} slip={slip} onSel={onSel} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OddsGrid({
  m, mkName, mkOdds, slip, onSel,
}: {
  m: OddsMatch; mkName: string; mkOdds: Record<string, number>;
  slip: Slip[]; onSel: (m: OddsMatch, mk: string, sel: string, odds: number) => void;
}) {
  const cols = Object.keys(mkOdds).length;
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Object.entries(mkOdds).map(([sel, odds]) => {
        const id = `${m.id}::${mkName}::${sel}`;
        const isSel = slip.some(s => s.id === id);
        return (
          <button key={sel} onClick={() => onSel(m, mkName, sel, odds)}
            className="py-2 px-1 rounded-lg transition-all"
            style={{
              background: isSel ? "rgba(0,209,255,0.22)" : "rgba(255,255,255,0.05)",
              border: isSel ? "1px solid rgba(0,209,255,0.6)" : "1px solid rgba(255,255,255,0.07)",
              color: isSel ? "#00D1FF" : "rgba(255,255,255,0.9)",
            }}>
            <div className="text-[9px] uppercase opacity-60 mb-0.5 truncate px-1">{sel}</div>
            <div className="font-black text-sm tabular-nums">{odds.toFixed(2)}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Bet Slip ─────────────────────────────────────────────────────────────
function BetSlip({
  slip, stake, setStake, betMode, setBetMode,
  totalOdds, potentialWin, singleTotalWin, balance,
  show, setShow, onRemove, onClear, onPlace, placing,
}: any) {
  const stakeNum = parseFloat(stake) || 0;
  const totalDebit = stakeNum * slip.length;
  const insufficient = stakeNum > 0 && totalDebit > balance;
  const invalidStake = stakeNum > 0 && (stakeNum < 0.5 || stakeNum > 5000);
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: "rgba(2,4,8,0.97)",
        border: "1px solid rgba(0,209,255,0.4)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 -8px 24px rgba(0,209,255,0.25)",
      }}>
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between"
        style={{ background: "rgba(0,209,255,0.08)" }}>
        <button onClick={() => setShow(!show)} className="flex items-center gap-2">
          <Ticket className="w-4 h-4" style={{ color: "#00D1FF" }} />
          <span className="text-xs font-black uppercase" style={{ color: "#00D1FF" }}>
            Bet Slip ({slip.length})
          </span>
          <ChevronDown className={`w-3 h-3 text-white/60 transition-transform ${show ? "" : "rotate-180"}`} />
        </button>
        <button onClick={onClear} className="text-[10px] text-white/40 underline">Clear</button>
      </div>

      <AnimatePresence>
        {show && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden">
            {/* Professional singles slip */}
            {slip.length > 1 && (
              <div className="px-3 pt-2.5">
                <div className="px-3 py-2 rounded-lg text-[10px] font-bold flex items-center justify-between"
                  style={{ background: "rgba(0,209,255,0.08)", border: "1px solid rgba(0,209,255,0.18)", color: "rgba(255,255,255,0.65)" }}>
                  <span>Singles mode</span>
                  <span style={{ color: "#00D1FF" }}>{slip.length} tickets · stake per pick</span>
                </div>
              </div>
            )}

            {/* Picks list */}
            <div className="px-3 py-2 space-y-1.5 max-h-48 overflow-y-auto">
              {slip.map((s: Slip) => (
                <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg"
                  style={{ background: "rgba(0,0,0,0.35)" }}>
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

            {/* Stake input + quick stake buttons */}
            <div className="px-3 pb-2 space-y-2">
              <div className="flex gap-1">
                {[5, 10, 25, 50, 100].map(v => (
                  <button key={v} onClick={() => setStake(String(v))}
                    className="flex-1 py-1 rounded text-[10px] font-bold"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="number" value={stake} onChange={e => setStake(e.target.value)}
                  placeholder="Stake (TND)" inputMode="decimal"
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-bold text-white outline-none"
                  style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" }} />
                <div className="text-right">
                  <div className="text-[9px] text-white/40 uppercase">Win</div>
                  <div className="text-sm font-black tabular-nums" style={{ color: "#00C853" }}>
                    {singleTotalWin.toFixed(2)} TND
                  </div>
                </div>
              </div>

              {slip.length > 0 && (
                <div className="text-[10px] text-white/50 px-1">
                  Total stake: <span className="font-bold text-white">{totalDebit.toFixed(2)} TND</span>
                  {" · "}Balance: <span className="font-bold" style={{ color: insufficient ? "#FF2D55" : "#00C853" }}>{balance.toFixed(2)} TND</span>
                </div>
              )}
              {insufficient && (
                <div className="text-[10px] font-bold px-1" style={{ color: "#FF2D55" }}>
                  Insufficient balance ({balance.toFixed(2)} / {totalDebit.toFixed(2)} TND)
                </div>
              )}
              {invalidStake && (
                <div className="text-[10px] font-bold px-1" style={{ color: "#FF2D55" }}>
                  Stake must be between 0.50 and 5000 TND
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Place button */}
      <button onClick={onPlace} disabled={placing || !slip.length || stakeNum <= 0 || insufficient || invalidStake}
        className="w-full py-3 text-sm font-black tracking-wider disabled:opacity-40 flex items-center justify-center gap-1.5"
        style={{
          background: insufficient || invalidStake ? "rgba(255,45,85,0.3)" : "#00D1FF",
          color: insufficient || invalidStake ? "#FF2D55" : "#020408",
        }}>
        {placing ? (
          <><span className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" /> PLACING…</>
        ) : insufficient ? (
          <>INSUFFICIENT BALANCE</>
        ) : invalidStake ? (
          <>INVALID STAKE</>
        ) : (
          <><Zap className="w-3.5 h-3.5" /> PLACE {slip.length > 1 ? `${slip.length} BETS` : "BET"}</>
        )}
      </button>
    </div>
  );
}

// ─── Bet card (history) ───────────────────────────────────────────────────
function BetCard({ b }: { b: Bet }) {
  const color = b.status === "won" ? "#00C853" : b.status === "lost" ? "#FF2D55" : "#f59e0b";
  const bg = b.status === "won" ? "rgba(0,200,83,0.1)" : b.status === "lost" ? "rgba(255,45,85,0.08)" : "rgba(245,158,11,0.08)";
  const Icon = b.status === "won" ? CheckCircle : b.status === "lost" ? XCircle : Timer;
  return (
    <div className="rounded-xl p-3" style={{ background: bg, border: `1px solid ${color}30` }}>
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <div className="text-xs font-bold text-white flex-1 leading-tight">{b.event_name}</div>
        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase flex-shrink-0 flex items-center gap-1"
          style={{ background: `${color}30`, color }}>
          <Icon className="w-2.5 h-2.5" />{b.status}
        </span>
      </div>
      <div className="text-[10px] text-white/60 mb-2">{b.selection_name}</div>
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <div>
          <div className="text-white/35 uppercase text-[8px]">Stake</div>
          <div className="font-bold text-white tabular-nums">{b.stake} TND</div>
        </div>
        <div>
          <div className="text-white/35 uppercase text-[8px]">Odds</div>
          <div className="font-bold text-white tabular-nums">{b.odds.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-white/35 uppercase text-[8px]">{b.status === "won" ? "Won" : "Potential"}</div>
          <div className="font-black tabular-nums" style={{ color }}>{b.potential_win.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-white/30">
      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p className="text-sm mb-1">No matches available</p>
      <p className="text-[10px] opacity-70">Odds refresh every 20 minutes. Pull to refresh or try another sport.</p>
    </div>
  );
}
