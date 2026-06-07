import { motion, AnimatePresence } from "framer-motion";
import { Flame, Shield, Wifi, Clock, ArrowLeft, RefreshCw, Maximize2, Wallet, X, Sparkles, Trophy } from "lucide-react";
import { LIVE_GAMES, LIVE_VENDORS } from "@/lib/liveGames";
import { TVBET_GAMES, buildTvbetUrl, type TvbetGame } from "@/lib/tvbetGames";
import { openEscrow, closeEscrow, getActiveEscrow } from "@/lib/escrowWallet";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";

interface ActiveGame {
  game: TvbetGame;
  url: string;
  sessionAmount: number;
}

export default function Live() {
  const { user, refreshBalance } = useAuth();
  const [activeVendor, setActiveVendor] = useState("all");
  const [auth, setAuth] = useState(false);
  const [selected, setSelected] = useState<TvbetGame | null>(null);
  const [active, setActive] = useState<ActiveGame | null>(null);
  const [stake, setStake] = useState("10");
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeAmt, setCloseAmt] = useState("");
  const [showClose, setShowClose] = useState(false);
  const [msg, setMsg] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const filteredGames = activeVendor === "all"
    ? LIVE_GAMES
    : LIVE_GAMES.filter(g => g.vendor === activeVendor);

  // Restore active escrow on mount
  useEffect(() => {
    const s = getActiveEscrow();
    if (s && user && s.userId === user.id) {
      const g = TVBET_GAMES.find(x => x.name === s.gameName);
      if (g) setActive({ game: g, url: buildTvbetUrl(g.id), sessionAmount: s.amount });
    }
  }, [user]);

  const openGame = async () => {
    if (!user || !selected) return;
    const amt = parseFloat(stake);
    if (!amt || amt <= 0) { setMsg("أدخل مبلغاً صالحاً"); return; }
    setOpening(true); setMsg("");

    const res = await openEscrow(user.id, amt, selected.name, "TVBet");
    if (!res.ok) {
      setMsg(res.error || "خطأ");
      setOpening(false);
      return;
    }
    await refreshBalance();
    setActive({ game: selected, url: buildTvbetUrl(selected.id), sessionAmount: amt });
    setSelected(null);
    setOpening(false);
    setMsg("");
  };

  const requestClose = () => {
    setCloseAmt(active?.sessionAmount.toString() || "");
    setShowClose(true);
  };

  const confirmClose = async () => {
    if (!user || !active) return;
    const amt = parseFloat(closeAmt);
    if (isNaN(amt) || amt < 0) { setMsg("أدخل المبلغ المتبقي"); return; }
    setClosing(true); setMsg("");
    const res = await closeEscrow(user.id, amt);
    if (!res.ok) { setMsg(res.error || "خطأ"); setClosing(false); return; }
    await refreshBalance();
    const pnl = res.pnl || 0;
    setMsg(pnl >= 0 ? `🎉 ربحت ${pnl.toFixed(2)} TND` : `💸 خسرت ${Math.abs(pnl).toFixed(2)} TND`);
    setActive(null);
    setShowClose(false);
    setClosing(false);
    setTimeout(() => setMsg(""), 4000);
  };

  // ━━━━━━━━━━━━ Active TVBet iframe ━━━━━━━━━━━━
  if (active && user) {
    return (
      <>
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-3 py-2"
            style={{ background: "linear-gradient(90deg, rgba(255,45,85,0.15), rgba(0,0,0,0.95))",
                     borderBottom: "1px solid rgba(255,45,85,0.25)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={requestClose} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <ArrowLeft className="w-4 h-4 text-white/70" />
              </button>
              <div className="px-2 py-0.5 rounded text-[9px] font-black flex items-center gap-1 flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#FF2D55,#FF6B35)", color: "#fff" }}>
                💰 LIVE
              </div>
              <span className="text-xs text-white font-bold truncate">{active.game.name}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: "rgba(0,200,83,0.1)", border: "1px solid rgba(0,200,83,0.25)" }}>
                <Wallet className="w-3 h-3 text-green-400" />
                <span className="text-[10px] text-green-400 font-bold">{user.balance} TND</span>
              </div>
              <button onClick={() => { if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; }}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <RefreshCw className="w-3.5 h-3.5 text-white/70" />
              </button>
              <button onClick={() => iframeRef.current?.requestFullscreen?.()}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <Maximize2 className="w-3.5 h-3.5 text-white/70" />
              </button>
            </div>
          </div>

          {/* Session info bar */}
          <div className="px-3 py-1.5 flex items-center justify-between text-[10px]"
            style={{ background: "rgba(0,0,0,0.8)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="text-white/40">Session: <b className="text-white">{active.sessionAmount.toFixed(2)} TND</b></span>
            <span className="text-white/40">RTP: <b className="text-yellow-400">{active.game.rtp}%</b></span>
            <button onClick={requestClose} className="px-2.5 py-0.5 rounded-full text-[9px] font-black"
              style={{ background: "linear-gradient(135deg,#00C853,#00E676)", color: "#000" }}>
              💰 Cash Out
            </button>
          </div>

          {/* Iframe */}
          <iframe
            ref={iframeRef}
            src={active.url}
            className="flex-1 w-full border-none bg-black"
            allow="fullscreen autoplay clipboard-write"
            title={active.game.name}
            allowFullScreen
          />
        </div>

        {/* Cashout modal */}
        <AnimatePresence>
          {showClose && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-sm rounded-2xl overflow-hidden"
                style={{ background: "rgba(15,18,28,0.98)", border: "1px solid rgba(0,200,83,0.3)" }}>
                <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <h3 className="text-lg font-black text-white mb-1">💰 Cash Out Session</h3>
                  <p className="text-[11px] text-white/40">أدخل رصيدك المتبقي من اللعبة لإعادته لمحفظتك</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,45,85,0.08)" }}>
                    <p className="text-[10px] text-white/40 mb-1">Session opened with</p>
                    <p className="text-2xl font-black text-white">{active.sessionAmount.toFixed(2)} <span className="text-sm text-white/40">TND</span></p>
                  </div>

                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">رصيدك الحالي في اللعبة (TND)</label>
                    <input type="number" value={closeAmt} onChange={e => setCloseAmt(e.target.value)}
                      step="0.01" min="0" placeholder="0.00"
                      className="w-full px-3 py-2.5 rounded-xl text-lg font-black text-white text-center"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  </div>

                  {closeAmt && !isNaN(parseFloat(closeAmt)) && (
                    <div className="rounded-lg p-2.5 text-center"
                      style={{ background: parseFloat(closeAmt) >= active.sessionAmount ? "rgba(0,200,83,0.1)" : "rgba(255,45,85,0.1)" }}>
                      <p className="text-[10px] text-white/40">Net Result</p>
                      <p className="text-lg font-black"
                        style={{ color: parseFloat(closeAmt) >= active.sessionAmount ? "#00C853" : "#FF2D55" }}>
                        {parseFloat(closeAmt) >= active.sessionAmount ? "+" : ""}{(parseFloat(closeAmt) - active.sessionAmount).toFixed(2)} TND
                      </p>
                    </div>
                  )}

                  {msg && <p className="text-[11px] text-center font-bold text-pink-400">{msg}</p>}

                  <div className="flex gap-2">
                    <button onClick={() => { setShowClose(false); setMsg(""); }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white/60"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      إلغاء
                    </button>
                    <button onClick={confirmClose} disabled={closing || !closeAmt}
                      className="flex-1 py-2.5 rounded-xl text-xs font-black text-black disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#00C853,#00E676)" }}>
                      {closing ? "..." : "تأكيد"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="p-4 pb-24 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF2D55, #FF6B35)" }}>
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider">LIVE CASINO</h1>
              <p className="text-[10px] text-white/40 font-mono">TVBET • {LIVE_GAMES.length} TABLES</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: "rgba(0,200,83,0.15)", border: "1px solid rgba(0,200,83,0.3)" }}>
            <Wifi className="w-3 h-3 text-green-400" />
            <span className="text-[10px] font-bold text-green-400">LIVE</span>
          </div>
        </div>

        {msg && (
          <div className="p-3 rounded-xl text-sm text-center font-bold"
            style={{ background: msg.includes("ربحت") ? "rgba(0,200,83,0.1)" : "rgba(255,45,85,0.1)",
                     border: `1px solid ${msg.includes("ربحت") ? "rgba(0,200,83,0.3)" : "rgba(255,45,85,0.3)"}`,
                     color: msg.includes("ربحت") ? "#00C853" : "#FF2D55" }}>
            {msg}
          </div>
        )}

        {/* TVBet Hero Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #FF2D55, #FFD700)" }}>
                <Trophy className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-black tracking-wider text-white uppercase">TVBet Live TV</h2>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-black"
                style={{ background: "rgba(0,200,83,0.18)", color: "#00C853" }}>💰 REAL TND</span>
            </div>
            <span className="text-[10px] text-white/30">{TVBET_GAMES.length} games</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {TVBET_GAMES.map((g, i) => (
              <motion.div key={g.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => user ? setSelected(g) : setAuth(true)}
                className="relative rounded-xl overflow-hidden cursor-pointer group"
                style={{ aspectRatio: "3/4", border: "1px solid rgba(255,45,85,0.15)",
                         background: "linear-gradient(135deg, rgba(255,45,85,0.08), rgba(255,107,53,0.04))" }}>
                <img src={g.thumb} alt={g.name} loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)" }} />

                {/* Live indicator */}
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(255,45,85,0.95)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[7px] font-black text-white">LIVE</span>
                </div>

                {/* RTP badge */}
                <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[7px] font-black"
                  style={{ background: "rgba(255,215,0,0.9)", color: "#000" }}>
                  {g.rtp}%
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-[10px] font-bold text-white leading-tight">{g.name}</p>
                  <p className="text-[8px] text-white/40 leading-tight">{g.desc}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Wallet className="w-2.5 h-2.5 text-green-400" />
                    <span className="text-[8px] text-green-400 font-bold">{g.minBet}-{g.maxBet} TND</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Live Dealer Tables (Coming Soon) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black tracking-wider text-white/60 uppercase">Live Dealer Tables</h2>
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black"
              style={{ background: "rgba(255,165,0,0.18)", color: "#FFA500" }}>SOON</span>
          </div>
          <p className="text-[11px] text-white/40 mb-3 leading-relaxed">
            Pragmatic Live, Ezugi, Sa Gaming و Dream Gaming قيد التفعيل. {LIVE_GAMES.length} طاولة جاهزة.
          </p>

          {/* Vendor Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setActiveVendor("all")}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
              style={{ background: activeVendor === "all" ? "linear-gradient(135deg, #FF2D55, #FF6B35)" : "rgba(255,255,255,0.05)",
                       color: activeVendor === "all" ? "#fff" : "rgba(255,255,255,0.5)" }}>
              All ({LIVE_GAMES.length})
            </button>
            {LIVE_VENDORS.filter(v => v.gameCount > 0).map(v => (
              <button key={v.code} onClick={() => setActiveVendor(v.code)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                style={{ background: activeVendor === v.code ? "linear-gradient(135deg, #FF2D55, #FF6B35)" : "rgba(255,255,255,0.05)",
                         color: activeVendor === v.code ? "#fff" : "rgba(255,255,255,0.5)" }}>
                <img src={v.logo} alt="" className="w-4 h-4 rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                {v.name} ({v.gameCount})
              </button>
            ))}
          </div>

          {/* Games Grid - Preview Only */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
            {filteredGames.slice(0, 12).map((game, i) => (
              <motion.div key={game.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="relative rounded-xl overflow-hidden"
                style={{ aspectRatio: "4/5", border: "1px solid rgba(255,255,255,0.06)" }}>
                <img src={game.thumb} alt={game.name}
                  className="w-full h-full object-cover opacity-60"
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).src = `https://static3.pgf-asu2nd.com/logo/${game.vendor}.png`; }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="px-3 py-1 rounded-full text-[9px] font-black" style={{ background: "rgba(255,165,0,0.85)", color: "#000" }}>
                    SOON
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-[7px] font-mono text-white/30 uppercase">{game.vendorName}</p>
                  <h3 className="text-[11px] font-bold text-white/70 leading-tight line-clamp-2">{game.name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
          {filteredGames.length > 12 && (
            <p className="text-center text-xs text-white/30 mt-3">+{filteredGames.length - 12} more tables</p>
          )}
        </div>
      </div>

      {/* Game launch dialog */}
      <AnimatePresence>
        {selected && user && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-3"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}
            onClick={() => setSelected(null)}>
            <motion.div initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: "rgba(15,18,28,0.98)", border: "1px solid rgba(255,45,85,0.3)" }}>
              <div className="relative h-32 overflow-hidden">
                <img src={selected.thumb} alt={selected.name} className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,18,28,0.98), transparent 60%)" }} />
                <button onClick={() => setSelected(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.6)" }}>
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-2 left-3 right-3">
                  <h3 className="text-lg font-black text-white">{selected.name}</h3>
                  <p className="text-[10px] text-white/60">{selected.desc}</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg p-2" style={{ background: "rgba(255,215,0,0.08)" }}>
                    <p className="text-[9px] text-white/40">RTP</p>
                    <p className="text-sm font-black text-yellow-400">{selected.rtp}%</p>
                  </div>
                  <div className="rounded-lg p-2" style={{ background: "rgba(0,200,83,0.08)" }}>
                    <p className="text-[9px] text-white/40">Min</p>
                    <p className="text-sm font-black text-green-400">{selected.minBet} TND</p>
                  </div>
                  <div className="rounded-lg p-2" style={{ background: "rgba(255,45,85,0.08)" }}>
                    <p className="text-[9px] text-white/40">Max</p>
                    <p className="text-sm font-black text-pink-400">{selected.maxBet} TND</p>
                  </div>
                </div>

                <div className="rounded-lg p-2.5 flex items-center gap-2" style={{ background: "rgba(0,209,255,0.06)" }}>
                  <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <p className="text-[10px] text-white/60 leading-tight">
                    رصيدك الحالي: <b className="text-white">{user.balance} TND</b><br/>
                    يُخصم مبلغ الجلسة من رصيدك ويُعاد عند الإنهاء حسب نتيجتك
                  </p>
                </div>

                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">مبلغ الجلسة (TND)</label>
                  <input type="number" value={stake} onChange={e => setStake(e.target.value)}
                    min={selected.minBet} max={Math.min(selected.maxBet, parseFloat(user.balance))}
                    className="w-full px-3 py-2.5 rounded-xl text-lg font-black text-white text-center"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,45,85,0.25)" }} />
                  <div className="flex gap-1.5 mt-2">
                    {[5, 10, 20, 50].map(v => (
                      <button key={v} onClick={() => setStake(String(v))}
                        className="flex-1 py-1 rounded-md text-[10px] font-bold text-white/60"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {msg && <p className="text-[11px] text-center font-bold text-pink-400">{msg}</p>}

                <button onClick={openGame} disabled={opening || !stake}
                  className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #FF2D55, #FF6B35)", boxShadow: "0 4px 20px rgba(255,45,85,0.35)" }}>
                  {opening ? "Loading..." : `🎰 Open Session • ${parseFloat(stake || "0").toFixed(2)} TND`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {auth && <AuthModal onClose={() => setAuth(false)} />}
    </motion.div>
  );
}
