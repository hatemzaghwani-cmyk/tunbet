import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Search, X, Ticket, CheckCircle, XCircle, Timer, RefreshCw, Zap } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { fetchOddsMatches, SPORTS, type OddsMatch } from "@/lib/oddsApi";

const SU = "https://cjzjrnagpsdmolvbkhnu.supabase.co";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqempybmFncHNkbW9sdmJraG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0ODY4NCwiZXhwIjoyMDk1OTI0Njg0fQ.TmowEatc4g2xpD-GT0r-jofX1zCtXjTD-s4LF7JSs6o";
const SH = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

interface Slip { id: string; match: string; mk: string; sel: string; odds: number; }
interface Bet { id: number; event_name: string; selection_name: string; odds: number; stake: number; potential_win: number; status: string; created_at: string; }

export default function Sports() {
  const { user, refreshBalance } = useAuth();
  const [matches, setMatches] = useState<OddsMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sport, setSport] = useState<string>("football");
  const [auth, setAuth] = useState(false);
  const [slip, setSlip] = useState<Slip[]>([]);
  const [stake, setStake] = useState("");
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"m" | "b">("m");
  const [bets, setBets] = useState<Bet[]>([]);
  const [ldb, setLdb] = useState(false);
  const [showSlip, setShowSlip] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchOddsMatches(sport).then(d => { setMatches(d); setLoading(false); });
    const iv = setInterval(() => fetchOddsMatches(sport).then(setMatches), 35000);
    return () => clearInterval(iv);
  }, [sport]);

  useEffect(() => {
    if (tab !== "b" || !user) return;
    setLdb(true);
    fetch(`${SU}/rest/v1/sports_bets?user_id=eq.${user.id}&select=*&order=id.desc`, { headers: SH })
      .then(r => r.json()).then(setBets).catch(() => {}).finally(() => setLdb(false));
  }, [tab, user]);

  const filtered = useMemo(() => {
    return matches.filter(m => {
      if (q && !`${m.home} ${m.away}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [matches, q]);

  const toggleSel = (m: OddsMatch, mk: string, sel: string, odds: number) => {
    const id = `${m.id}::${mk}::${sel}`;
    if (slip.find(s => s.id === id)) { setSlip(slip.filter(s => s.id !== id)); return; }
    // Remove any other selection from same match (single bet per match)
    setSlip([...slip.filter(s => !s.id.startsWith(`${m.id}::`)), { id, match: `${m.home} vs ${m.away}`, mk, sel, odds }]);
    setShowSlip(true);
  };

  const totalOdds = slip.reduce((a, b) => a * b.odds, 1);
  const potentialWin = totalOdds * (parseFloat(stake) || 0);

  const placeBet = async () => {
    if (!user) { setAuth(true); return; }
    if (!slip.length) { setMsg("Select at least one match"); setTimeout(() => setMsg(""), 3000); return; }
    const s = parseFloat(stake);
    if (!s || s < 0.5) { setMsg("Min stake: 0.50 TND"); setTimeout(() => setMsg(""), 3000); return; }
    if (s > parseFloat(user.balance)) { setMsg("Insufficient balance"); setTimeout(() => setMsg(""), 3000); return; }

    setPlacing(true);
    try {
      // Atomic withdraw via RPC
      const wr = await fetch(`${SU}/rest/v1/rpc/update_balance`, {
        method: "POST", headers: SH,
        body: JSON.stringify({ p_user_id: user.id, p_action: "withdraw", p_amount: s }),
      });
      if (!wr.ok) throw new Error("Withdraw failed");

      // Record bet (single or multi-leg)
      const eventName = slip.map(x => x.match).join(" • ");
      const selectionName = slip.map(x => `${x.mk}: ${x.sel} @ ${x.odds.toFixed(2)}`).join(" | ");
      await fetch(`${SU}/rest/v1/sports_bets`, {
        method: "POST", headers: { ...SH, Prefer: "return=minimal" },
        body: JSON.stringify({
          user_id: user.id,
          event_id: slip.map(x => x.id.split("::")[0]).join(","),
          event_name: eventName.slice(0, 250),
          sport, league: "multi", selection: slip.map(x => x.sel).join(","),
          selection_name: selectionName.slice(0, 250),
          odds: totalOdds, stake: s, potential_win: potentialWin, status: "pending",
        }),
      });

      setSlip([]); setStake(""); setShowSlip(false);
      setMsg(`Bet placed! Potential win: ${potentialWin.toFixed(2)} TND`);
      await refreshBalance();
      setTimeout(() => setMsg(""), 4000);
    } catch (e: any) {
      setMsg(e?.message || "Bet failed");
      setTimeout(() => setMsg(""), 3000);
    } finally {
      setPlacing(false);
    }
  };

  // ─── Main Sports UI ───────────────────────────────────────────────────
  return (
    <div className="pb-24 px-3 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: "#00D1FF" }} />
          <h1 className="text-base font-black tracking-wider">SPORTS</h1>
        </div>
        <button onClick={() => { setLoading(true); fetchOddsMatches(sport).then(d => { setMatches(d); setLoading(false); }); }}
          className="p-2 rounded-lg" style={{ background: "rgba(0,209,255,0.1)", border: "1px solid rgba(0,209,255,0.2)" }}>
          <RefreshCw className="w-3.5 h-3.5" style={{ color: "#00D1FF" }} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => setTab("m")}
          className="flex-1 py-2 rounded-xl text-xs font-bold"
          style={{
            background: tab === "m" ? "rgba(0,209,255,0.15)" : "rgba(255,255,255,0.04)",
            border: tab === "m" ? "1px solid rgba(0,209,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
            color: tab === "m" ? "#00D1FF" : "rgba(255,255,255,0.5)",
          }}>
          Matches ({filtered.length})
        </button>
        <button onClick={() => setTab("b")}
          className="flex-1 py-2 rounded-xl text-xs font-bold"
          style={{
            background: tab === "b" ? "rgba(0,209,255,0.15)" : "rgba(255,255,255,0.04)",
            border: tab === "b" ? "1px solid rgba(0,209,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
            color: tab === "b" ? "#00D1FF" : "rgba(255,255,255,0.5)",
          }}>
          My Bets
        </button>
      </div>

      {tab === "m" && (
        <>
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search teams..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-transparent text-white outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>

          {/* Sport filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 mb-3 scrollbar-hide">
            {SPORTS.map(s => (
              <button key={s.slug} onClick={() => setSport(s.slug)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-bold flex-shrink-0"
                style={{
                  background: sport === s.slug ? "rgba(0,209,255,0.15)" : "rgba(255,255,255,0.04)",
                  border: sport === s.slug ? "1px solid rgba(0,209,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
                  color: sport === s.slug ? "#00D1FF" : "rgba(255,255,255,0.4)",
                }}>
                <span>{s.icon}</span>{s.name}
              </button>
            ))}
          </div>

          {/* Matches list */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              No upcoming matches in this sport right now.
              <br /><br />
              <span className="text-[10px]">Odds refresh every 20 minutes. Check back soon.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(m => <MatchRow key={m.id} m={m} slip={slip} onSel={toggleSel} />)}
            </div>
          )}
        </>
      )}

      {tab === "b" && (
        <>
          {ldb ? (
            <div className="text-center py-12 text-white/30">Loading…</div>
          ) : bets.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No bets yet.</div>
          ) : (
            <div className="space-y-2">
              {bets.map(b => (
                <div key={b.id} className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="text-xs font-bold text-white truncate flex-1 pr-2">{b.event_name}</div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase"
                      style={{
                        background: b.status === "won" ? "rgba(0,200,83,0.18)" : b.status === "lost" ? "rgba(255,45,85,0.15)" : "rgba(245,158,11,0.18)",
                        color: b.status === "won" ? "#00C853" : b.status === "lost" ? "#FF2D55" : "#f59e0b",
                      }}>
                      {b.status === "won" ? <CheckCircle className="inline w-2.5 h-2.5 mr-0.5" /> :
                       b.status === "lost" ? <XCircle className="inline w-2.5 h-2.5 mr-0.5" /> :
                       <Timer className="inline w-2.5 h-2.5 mr-0.5" />}
                      {b.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-white/50 mb-1.5">{b.selection_name}</div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/40">Stake: <span className="text-white font-bold">{b.stake} TND</span></span>
                    <span className="text-white/40">Odds: <span className="text-white font-bold">{b.odds.toFixed(2)}</span></span>
                    <span className="text-white/40">Win: <span style={{ color: "#00C853" }} className="font-bold">{b.potential_win.toFixed(2)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bet slip — floating */}
      {slip.length > 0 && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }}
          className="fixed bottom-24 left-3 right-3 rounded-2xl p-3 z-40 max-w-[430px] mx-auto"
          style={{
            background: "rgba(0,209,255,0.08)", border: "1px solid rgba(0,209,255,0.3)",
            backdropFilter: "blur(20px)", boxShadow: "0 8px 24px rgba(0,209,255,0.2)",
          }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4" style={{ color: "#00D1FF" }} />
              <span className="text-xs font-black uppercase" style={{ color: "#00D1FF" }}>Bet Slip ({slip.length})</span>
            </div>
            <button onClick={() => setShowSlip(!showSlip)} className="p-1">
              <span className="text-white/60 text-xs">{showSlip ? "Hide" : "Show"}</span>
            </button>
          </div>

          <AnimatePresence>
            {showSlip && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto">
                  {slip.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-[10px] py-1 px-2 rounded"
                      style={{ background: "rgba(0,0,0,0.3)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-white/80 truncate">{s.match}</div>
                        <div className="text-white/40">{s.mk}: {s.sel}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold" style={{ color: "#00D1FF" }}>{s.odds.toFixed(2)}</span>
                        <button onClick={() => setSlip(slip.filter(x => x.id !== s.id))}>
                          <X className="w-3 h-3 text-white/50" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 mb-2">
            <input type="number" value={stake} onChange={e => setStake(e.target.value)} placeholder="Stake (TND)"
              className="flex-1 px-3 py-2 rounded-lg text-xs text-white bg-black/30 outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
            <div className="text-[10px] text-white/60">
              <div>Total: <span className="font-bold text-white">{totalOdds.toFixed(2)}</span></div>
              <div>Win: <span className="font-bold" style={{ color: "#00C853" }}>{potentialWin.toFixed(2)}</span></div>
            </div>
          </div>

          <button onClick={placeBet} disabled={placing || !slip.length}
            className="w-full py-2.5 rounded-xl text-sm font-black disabled:opacity-50"
            style={{ background: "#00D1FF", color: "#020408" }}>
            {placing ? "Placing…" : <><Zap className="inline w-3.5 h-3.5 mr-1" /> PLACE BET</>}
          </button>
        </motion.div>
      )}

      {msg && (
        <div className="fixed top-20 left-3 right-3 z-50 max-w-[430px] mx-auto p-3 rounded-xl text-xs font-bold text-center"
          style={{ background: "rgba(0,0,0,0.95)", border: "1px solid rgba(0,209,255,0.4)", color: "#00D1FF" }}>
          {msg}
        </div>
      )}

      {auth && <AuthModal onClose={() => setAuth(false)} />}
    </div>
  );
}

// ─── Match Row ────────────────────────────────────────────────────────────
function MatchRow({ m, slip, onSel }: { m: OddsMatch; slip: Slip[]; onSel: (m: OddsMatch, mk: string, sel: string, odds: number) => void }) {
  const dt = new Date(m.date);
  const dateStr = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const timeStr = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const mainMarket = m.markets["Match Winner"] || Object.values(m.markets)[0];
  const mainMarketName = m.markets["Match Winner"] ? "Match Winner" : Object.keys(m.markets)[0];

  return (
    <div className="p-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[9px] text-white/40 uppercase tracking-wide">
          {m.status === "live" && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded font-black"
              style={{ background: "rgba(255,45,85,0.2)", color: "#FF2D55" }}>
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: "#FF2D55" }} />
              LIVE
            </span>
          )}
          <span>{m.league}</span>
          <span className="text-white/30">•</span>
          <span>{dateStr} {timeStr}</span>
        </div>
        <span className="text-[9px] text-white/30">{m.bookmakerCount} bm</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div className="text-xs font-bold text-white truncate">{m.home}</div>
        <div className="text-xs font-bold text-white truncate text-right">{m.away}</div>
      </div>

      {mainMarket && (
        <div>
          <div className="text-[9px] text-white/40 mb-1.5 uppercase">{mainMarketName}</div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Object.keys(mainMarket).length}, 1fr)` }}>
            {Object.entries(mainMarket).map(([sel, odds]) => {
              const selId = `${m.id}::${mainMarketName}::${sel}`;
              const isSelected = slip.some(s => s.id === selId);
              return (
                <button key={sel} onClick={() => onSel(m, mainMarketName, sel, odds)}
                  className="py-2 px-2 rounded-lg text-xs"
                  style={{
                    background: isSelected ? "rgba(0,209,255,0.25)" : "rgba(255,255,255,0.04)",
                    border: isSelected ? "1px solid rgba(0,209,255,0.6)" : "1px solid rgba(255,255,255,0.08)",
                    color: isSelected ? "#00D1FF" : "rgba(255,255,255,0.85)",
                  }}>
                  <div className="text-[9px] uppercase opacity-60">{sel}</div>
                  <div className="font-black text-sm">{odds.toFixed(2)}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

