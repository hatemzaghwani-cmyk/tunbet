import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Search, X, Ticket, CheckCircle, XCircle, Timer, ChevronDown, ChevronUp, RefreshCw, Zap, Clock } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { fetchAllMatches, MARKET_NAMES, placeBetServer, type Match } from "@/lib/sportsEngine";

const SU = "https://cjzjrnagpsdmolvbkhnu.supabase.co";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqempybmFncHNkbW9sdmJraG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0ODY4NCwiZXhwIjoyMDk1OTI0Njg0fQ.TmowEatc4g2xpD-GT0r-jofX1zCtXjTD-s4LF7JSs6o";
const SH = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

interface Slip { id: string; match: string; mk: string; sel: string; odds: number; }
interface Bet { id: number; event_name: string; selection_name: string; odds: number; stake: number; potential_win: number; status: string; created_at: string; }

export default function Sports() {
  const { user, refreshBalance } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [league, setLeague] = useState("all");
  const [filter, setFilter] = useState<"all" | "live" | "upcoming">("all");
  const [auth, setAuth] = useState(false);
  const [slip, setSlip] = useState<Slip[]>([]);
  const [stake, setStake] = useState("");
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"m" | "b">("m");
  const [bets, setBets] = useState<Bet[]>([]);
  const [ldb, setLdb] = useState(false);
  const [exp, setExp] = useState<string | null>(null);
  const [showSlip, setShowSlip] = useState(false);

  // Fetch real matches
  useEffect(() => {
    fetchAllMatches().then(d => { setMatches(d); setLoading(false); });
    const iv = setInterval(() => fetchAllMatches().then(setMatches), 30000);
    return () => clearInterval(iv);
  }, []);

  // My bets
  useEffect(() => {
    if (tab !== "b" || !user) return;
    setLdb(true);
    fetch(`${SU}/rest/v1/sports_bets?user_id=eq.${user.id}&select=*&order=id.desc`, { headers: SH })
      .then(r => r.json()).then(setBets).catch(() => {}).finally(() => setLdb(false));
  }, [tab, user]);

  const liveCount = matches.filter(m => m.status === "live").length;
  const upcomingCount = matches.filter(m => m.status === "upcoming").length;

  const leagues = useMemo(() => {
    const m: Record<string, number> = {};
    matches.filter(x => x.status !== "finished").forEach(f => { m[f.league] = (m[f.league] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [matches]);

  const filtered = useMemo(() => {
    let f = matches.filter(m => m.status !== "finished");
    if (filter === "live") f = f.filter(x => x.status === "live");
    if (filter === "upcoming") f = f.filter(x => x.status === "upcoming");
    if (league !== "all") f = f.filter(x => x.league === league);
    if (q.trim()) { const s = q.toLowerCase(); f = f.filter(x => x.home.toLowerCase().includes(s) || x.away.toLowerCase().includes(s) || x.league.toLowerCase().includes(s)); }
    return f;
  }, [matches, filter, league, q]);

  const grouped = useMemo(() => {
    const g: Record<string, Match[]> = {};
    filtered.forEach(f => { (g[f.league] = g[f.league] || []).push(f); });
    return g;
  }, [filtered]);

  const addSlip = (m: Match, mk: string, sel: string, odds: number) => {
    if (!user) { setAuth(true); return; }
    const i = slip.findIndex(b => b.id === m.id && b.mk === mk);
    const it: Slip = { id: m.id, match: `${m.home} vs ${m.away}`, mk, sel, odds };
    if (i >= 0) setSlip(p => p.map((b, j) => j === i ? it : b)); else setSlip(p => [...p, it]);
    setShowSlip(true);
  };
  const rmSlip = (i: number) => setSlip(p => p.filter((_, j) => j !== i));
  const totOdds = slip.reduce((a, b) => a * b.odds, 1);
  const potWin = totOdds * parseFloat(stake || "0");

  const placeBet = async () => {
    if (!user || !slip.length || !stake || parseFloat(stake) <= 0) return;
    setPlacing(true); setMsg("");
    try {
      // Server-side validation: checks odds, match status, balance
      for (const s of slip) {
        const result = await placeBetServer(user.id, s.id, s.mk, s.sel, s.odds, parseFloat(stake));
        if (result.error) {
          if (result.newOdds) setMsg("⚠️ Odds changed to " + result.newOdds.toFixed(2));
          else setMsg("❌ " + result.error);
          setPlacing(false); return;
        }
      }
      await refreshBalance(); setMsg("✅ Bet placed!"); setSlip([]); setStake(""); setShowSlip(false);
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("❌ Connection error"); }
    setPlacing(false);
  };

  const fmtDate = (d: string) => { const dt = new Date(d), df = dt.getTime() - Date.now(); if (df < 86400000 && df > 0) return dt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }); return dt.toLocaleDateString("en", { month: "short", day: "numeric" }) + " " + dt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }); };

  const OB = ({ l, o, sel, on }: { l: string; o: number; sel: boolean; on: () => void }) => (
    <button onClick={on} className="flex-1 py-1.5 rounded-md text-center transition-all min-w-0"
      style={{ background: sel ? "rgba(0,209,255,0.18)" : "rgba(255,255,255,0.025)", border: `1px solid ${sel ? "rgba(0,209,255,0.4)" : "rgba(255,255,255,0.04)"}` }}>
      <span className="text-[7px] text-white/30 block leading-none truncate px-0.5">{l}</span>
      <span className="text-[12px] font-black leading-tight" style={{ color: sel ? "#00D1FF" : "#fff" }}>{o.toFixed(2)}</span>
    </button>
  );

  const MktRow = ({ title, items, mid, mk }: { title: string; items: [string, number][]; mid: string; mk: string }) => {
    const m = matches.find(x => x.id === mid)!;
    const valid = items.filter(([, o]) => o > 1 && o < 100);
    if (!valid.length) return null;
    return (
      <div className="mb-1.5">
        <p className="text-[7px] text-white/20 uppercase font-bold mb-0.5">{title}</p>
        <div className="flex gap-1 flex-wrap">{valid.map(([l, o]) => <OB key={l} l={l} o={o} sel={slip.some(s => s.id === mid && s.sel === l && s.mk === mk)} on={() => addSlip(m, mk, l, o)} />)}</div>
      </div>
    );
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="p-3 pb-24 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: "#00D1FF" }} />
              <h1 className="text-lg font-black tracking-wider">SPORTS</h1>
            </div>
            <button onClick={() => { localStorage.removeItem("tb_espn_v7"); fetchAllMatches().then(setMatches); }} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}><RefreshCw className="w-3.5 h-3.5 text-white/25" /></button>
          </div>

          {/* Main Tabs */}
          <div className="flex gap-2">
            {([["m", "⚽ Matches"], ["b", "🎫 My Bets"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className="flex-1 py-2 rounded-xl text-xs font-bold"
                style={{ background: tab === k ? (k === "m" ? "rgba(0,209,255,0.1)" : "rgba(255,215,0,0.1)") : "rgba(255,255,255,0.02)", border: `1px solid ${tab === k ? (k === "m" ? "rgba(0,209,255,0.2)" : "rgba(255,215,0,0.2)") : "rgba(255,255,255,0.04)"}`, color: tab === k ? (k === "m" ? "#00D1FF" : "#FFD700") : "rgba(255,255,255,0.3)" }}>{l}</button>
            ))}
          </div>

          {/* MY BETS */}
          {tab === "b" && (
            <div className="space-y-2">
              {!user ? <div className="text-center py-12"><Ticket className="w-8 h-8 mx-auto mb-2 text-white/10" /><p className="text-white/25 text-sm mb-2">Sign in</p><button onClick={() => setAuth(true)} className="px-5 py-1.5 rounded-xl text-xs font-bold" style={{ background: "#00D1FF", color: "#020408" }}>Sign In</button></div>
              : ldb ? <div className="text-center py-12 text-white/25 text-sm">Loading...</div>
              : bets.length === 0 ? <div className="text-center py-12"><Ticket className="w-8 h-8 mx-auto mb-2 text-white/10" /><p className="text-white/25 text-xs">No bets yet</p></div>
              : bets.map(b => (
                <div key={b.id} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-white/70 flex-1 mr-2 truncate">{b.event_name}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[7px] font-black flex items-center gap-0.5"
                      style={{ background: b.status === "won" ? "rgba(0,200,0,0.1)" : b.status === "lost" ? "rgba(255,0,0,0.1)" : "rgba(255,165,0,0.1)", color: b.status === "won" ? "#00C853" : b.status === "lost" ? "#FF1744" : "#FFA000" }}>
                      {b.status === "won" ? <CheckCircle className="w-2.5 h-2.5" /> : b.status === "lost" ? <XCircle className="w-2.5 h-2.5" /> : <Timer className="w-2.5 h-2.5" />}{b.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[8px] text-white/30 mb-1.5">{b.selection_name}</p>
                  <div className="flex gap-3 text-[9px]">
                    <span className="text-white/20">Stake: <b className="text-white">{b.stake.toFixed(2)}</b></span>
                    <span className="text-white/20">Odds: <b style={{ color: "#00D1FF" }}>{b.odds.toFixed(2)}</b></span>
                    <span className="text-white/20">Win: <b style={{ color: "#00C853" }}>{b.potential_win.toFixed(2)}</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MATCHES */}
          {tab === "m" && (
            <>
              {/* LIVE / ALL / UPCOMING filter */}
              <div className="flex gap-1.5">
                {([
                  ["all", `All (${matches.filter(m => m.status !== "finished").length})`, null],
                  ["live", `🔴 Live (${liveCount})`, "#FF2D55"],
                  ["upcoming", `⏰ Upcoming (${upcomingCount})`, "#FFA000"],
                ] as const).map(([k, l, c]) => (
                  <button key={k} onClick={() => setFilter(k as any)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold"
                    style={{ background: filter === k ? `${c ? c : "#00D1FF"}15` : "rgba(255,255,255,0.02)", border: `1px solid ${filter === k ? `${c || "#00D1FF"}30` : "rgba(255,255,255,0.04)"}`, color: filter === k ? (c || "#00D1FF") : "rgba(255,255,255,0.3)" }}>{l}</button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search..."
                  className="w-full pl-8 pr-8 py-1.5 rounded-xl text-[11px] bg-white/4 border border-white/6 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D1FF]/30" />
                {q && <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-white/25" /></button>}
              </div>

              {/* Leagues */}
              <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
                <button onClick={() => setLeague("all")} className="flex-shrink-0 px-2 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap"
                  style={{ background: league === "all" ? "rgba(0,209,255,0.1)" : "rgba(255,255,255,0.015)", border: `1px solid ${league === "all" ? "rgba(0,209,255,0.2)" : "rgba(255,255,255,0.03)"}`, color: league === "all" ? "#00D1FF" : "rgba(255,255,255,0.25)" }}>All</button>
                {leagues.map(([l, c]) => (
                  <button key={l} onClick={() => setLeague(l)} className="flex-shrink-0 px-2 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap"
                    style={{ background: league === l ? "rgba(0,209,255,0.1)" : "rgba(255,255,255,0.015)", border: `1px solid ${league === l ? "rgba(0,209,255,0.2)" : "rgba(255,255,255,0.03)"}`, color: league === l ? "#00D1FF" : "rgba(255,255,255,0.25)" }}>{l}</button>
                ))}
              </div>

              {/* Matches */}
              {loading ? <div className="text-center py-16 text-white/20 text-sm">Loading real matches...</div>
              : filtered.length === 0 ? <div className="text-center py-16"><Trophy className="w-8 h-8 mx-auto mb-2 text-white/10" /><p className="text-white/20 text-xs">{filter === "live" ? "No live matches right now" : "No matches found"}</p></div>
              : Object.entries(grouped).map(([lg, ms]) => (
                <div key={lg}>
                  <div className="flex items-center gap-1.5 py-1 sticky top-0 z-10" style={{ background: "#020408" }}>
                    <span className="text-xs">{ms[0].icon}</span>
                    <span className="text-[9px] font-bold text-white/30 uppercase">{lg}</span>
                  </div>
                  {ms.map(m => {
                    const isE = exp === m.id;
                    const mainMk = ["1X2", "O/U 2.5"];
                    const extraMk = Object.keys(m.markets).filter(k => !mainMk.includes(k));

                    return (
                      <div key={m.id} className="rounded-xl p-2.5 mb-1.5" style={{ background: "rgba(255,255,255,0.012)", border: `1px solid ${m.status === "live" ? "rgba(255,45,85,0.12)" : "rgba(255,255,255,0.03)"}` }}>
                        {/* Header */}
                        {m.suspended && <div className="py-1 px-3 rounded-lg text-[9px] font-black text-center mb-1" style={{background:"rgba(255,165,0,0.15)",color:"#FFA000",border:"1px solid rgba(255,165,0,0.2)"}}>⚠️ MARKETS SUSPENDED - Goal Scored</div>}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {m.status === "live" ? (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black" style={{ background: "rgba(255,45,85,0.12)", color: "#FF2D55" }}>
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#FF2D55]" />LIVE {m.period && <span className="text-white/40 ml-0.5">{m.period}</span>}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[9px] text-white/25"><Clock className="w-3 h-3" />{fmtDate(m.date)}</span>
                            )}
                            {m.hasRealOdds && <span className="px-1 py-0.5 rounded text-[6px] font-black" style={{ background: "rgba(0,200,0,0.1)", color: "#4CAF50" }}>REAL ODDS</span>}
                          </div>
                          {m.status === "live" && <span className="text-lg font-black text-white tracking-widest">{m.homeScore} - {m.awayScore}</span>}
                        </div>

                        {/* Teams with logos */}
                        <div className="mb-2 space-y-0.5">
                          <div className="flex items-center gap-2">
                            {m.homeLogo && <img src={m.homeLogo} className="w-4 h-4" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                            <p className="text-[11px] font-bold text-white">{m.home}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.awayLogo && <img src={m.awayLogo} className="w-4 h-4" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                            <p className="text-[11px] text-white/50">{m.away}</p>
                          </div>
                        </div>

                        {/* Main markets */}
                        {mainMk.map(mk => m.markets[mk] && <MktRow key={mk} title={MARKET_NAMES[mk] || mk} mk={mk} mid={m.id} items={Object.entries(m.markets[mk])} />)}

                        {/* Extra markets */}
                        <AnimatePresence>
                          {isE && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              {extraMk.map(mk => m.markets[mk] && <MktRow key={mk} title={MARKET_NAMES[mk] || mk} mk={mk} mid={m.id} items={Object.entries(m.markets[mk])} />)}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {extraMk.length > 0 && (
                          <button onClick={() => setExp(isE ? null : m.id)} className="w-full flex items-center justify-center gap-0.5 pt-1 text-[8px] text-white/15 hover:text-white/30">
                            {isE ? <><ChevronUp className="w-2.5 h-2.5" /> Less</> : <><ChevronDown className="w-2.5 h-2.5" /> +{extraMk.length} Markets</>}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </motion.div>

      {/* Bet Slip FAB */}
      {slip.length > 0 && !showSlip && tab === "m" && (
        <button onClick={() => setShowSlip(true)} className="fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl"
          style={{ background: "linear-gradient(135deg,#00D1FF,#0066FF)", boxShadow: "0 4px 20px rgba(0,209,255,0.4)" }}>
          <Ticket className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center">{slip.length}</span>
        </button>
      )}

      {/* Bet Slip */}
      <AnimatePresence>
        {showSlip && slip.length > 0 && (
          <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="fixed bottom-16 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="w-full max-w-[420px] mx-3 pointer-events-auto rounded-2xl overflow-hidden" style={{ background: "rgba(2,4,8,0.97)", border: "1px solid rgba(0,209,255,0.12)", backdropFilter: "blur(20px)", boxShadow: "0 -8px 32px rgba(0,0,0,0.6)" }}>
              <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-[11px] font-black" style={{ color: "#00D1FF" }}>BET SLIP ({slip.length})</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setSlip([])} className="text-[8px] text-white/25 px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>Clear</button>
                  <button onClick={() => setShowSlip(false)} className="text-[8px] text-white/25 px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>▼</button>
                </div>
              </div>
              <div className="px-3 py-1.5 max-h-28 overflow-y-auto space-y-1">
                {slip.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-2"><p className="text-[8px] text-white/30 truncate">{s.match}</p><p className="text-[10px] font-bold text-white">{s.mk}: {s.sel}</p></div>
                    <span className="text-[11px] font-black mr-1.5" style={{ color: "#00D1FF" }}>{s.odds.toFixed(2)}</span>
                    <button onClick={() => rmSlip(i)}><X className="w-3 h-3 text-white/20" /></button>
                  </div>
                ))}
              </div>
              <div className="px-3 py-2 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex gap-2 items-center">
                  <input type="number" value={stake} onChange={e => setStake(e.target.value)} placeholder="Stake (TND)"
                    className="flex-1 px-2 py-1.5 rounded-lg text-[11px] bg-white/3 border border-white/6 text-white placeholder:text-white/20 focus:outline-none" />
                  <div className="text-right"><p className="text-[7px] text-white/20">Total</p><p className="text-[11px] font-black" style={{ color: "#FFD700" }}>{totOdds.toFixed(2)}</p></div>
                </div>
                {potWin > 0 && <p className="text-[9px] text-center" style={{ color: "#00C853" }}>Win: <b>{potWin.toFixed(2)} TND</b></p>}
                {msg && <p className="text-[9px] text-center font-bold">{msg}</p>}
                <button onClick={placeBet} disabled={placing || !stake || parseFloat(stake) <= 0}
                  className="w-full py-2 rounded-xl text-[11px] font-black text-white disabled:opacity-25"
                  style={{ background: "linear-gradient(135deg,#00D1FF,#0066FF)" }}>
                  {placing ? "..." : `Place Bet • ${parseFloat(stake || "0").toFixed(2)} TND`}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {auth && <AuthModal onClose={() => setAuth(false)} />}
    </>
  );
}
