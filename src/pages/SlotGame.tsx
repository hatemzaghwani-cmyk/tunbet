import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { AMATIC_GAMES, type AmaticGame } from "@/lib/amaticGames";
import { spinSlot, newClientSeed, THEME_REELS, type SpinResult } from "@/lib/slotEngine";
import { ArrowLeft, Wallet, Plus, Minus } from "lucide-react";

export default function SlotGamePage() {
  const [, params] = useRoute("/slot/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [auth, setAuth] = useState(false);

  const game = AMATIC_GAMES.find(g => g.id === params?.id);

  if (!game) {
    return (
      <div className="p-6 text-center text-white/60">
        <p>اللعبة غير موجودة</p>
        <button onClick={() => navigate("/")} className="mt-4 px-4 py-2 rounded-lg bg-white/10">عودة</button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-white/50">سجل دخول لتشغيل {game.name}</p>
        <button onClick={() => setAuth(true)} className="px-5 py-2 rounded-xl text-sm font-black text-black" style={{ background: "#00D1FF" }}>Sign In</button>
        {auth && <AuthModal onClose={() => setAuth(false)} />}
      </div>
    );
  }

  return <SlotRunner game={game} onBack={() => navigate("/")} />;
}

function SlotRunner({ game, onBack }: { game: AmaticGame; onBack: () => void }) {
  const { user, refreshBalance } = useAuth();
  const symbols = THEME_REELS[game.theme];
  const initialGrid = (): string[][] => {
    const g: string[][] = [];
    for (let r = 0; r < game.reels; r++) {
      const col: string[] = [];
      for (let row = 0; row < 3; row++) col.push(symbols[(r + row) % symbols.length].id);
      g.push(col);
    }
    return g;
  };

  const [stake, setStake] = useState("1");
  const [grid, setGrid] = useState<string[][]>(initialGrid());
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState("");
  const [autoSpin, setAutoSpin] = useState(0); // remaining auto-spins
  const [nonce, setNonce] = useState(Math.floor(Math.random() * 1e6));
  const [history, setHistory] = useState<number[]>([]);
  const clientSeed = useRef(newClientSeed());
  const animRef = useRef<NodeJS.Timeout | null>(null);

  if (!user) return null;
  const balance = parseFloat(user.balance);
  const stakeNum = parseFloat(stake) || 0;

  const adjustStake = (delta: number) => {
    const cur = stakeNum;
    const next = Math.max(0.5, Math.min(50, +(cur + delta).toFixed(2)));
    setStake(String(next));
  };

  const spin = async () => {
    if (spinning) return;
    setError(""); setResult(null);
    if (!stakeNum || stakeNum <= 0) { setError("أدخل المبلغ"); return; }
    if (balance < stakeNum) { setError("رصيد غير كافٍ"); return; }

    setSpinning(true);
    // Animation: cycle each reel rapidly
    const animDur = 1100;
    const startT = Date.now();
    const allIds = symbols.map(s => s.id);
    animRef.current = setInterval(() => {
      const g: string[][] = [];
      for (let r = 0; r < game.reels; r++) {
        const col: string[] = [];
        for (let row = 0; row < 3; row++) col.push(allIds[Math.floor(Math.random() * allIds.length)]);
        g.push(col);
      }
      setGrid(g);
      if (Date.now() - startT >= animDur) { if (animRef.current) clearInterval(animRef.current); }
    }, 90);

    const res = await spinSlot(user.id, game, stakeNum, clientSeed.current, nonce);
    setNonce(n => n + 1);

    if (!res.ok) {
      if (animRef.current) clearInterval(animRef.current);
      setError(res.error || "خطأ");
      setSpinning(false);
      setAutoSpin(0);
      return;
    }

    // Wait for animation, then set final grid
    setTimeout(async () => {
      if (animRef.current) clearInterval(animRef.current);
      setGrid(res.grid!);
      setResult(res);
      setHistory(h => [(res.totalPayout || 0), ...h].slice(0, 12));
      await refreshBalance();
      setSpinning(false);
      // Auto-spin queue
      if (autoSpin > 0) {
        setAutoSpin(n => n - 1);
        setTimeout(() => spin(), 500);
      }
    }, animDur);
  };

  useEffect(() => () => { if (animRef.current) clearInterval(animRef.current); }, []);

  // Symbol display: short label with colored gradient
  const symbolColor = (id: string): string => {
    const idx = symbols.findIndex(s => s.id === id);
    const colors = ["#9CA3AF", "#FDE047", "#F87171", "#A78BFA", "#22D3EE", "#FB923C", "#FACC15", "#EF4444", "#FFFFFF", "#E879F9"];
    return colors[idx % colors.length];
  };
  const symbolBg = (id: string): string => {
    const sym = symbols.find(s => s.id === id);
    if (sym?.isScatter) return "linear-gradient(135deg, #fce7f3, #ec4899)";
    if (sym?.isWild) return "linear-gradient(135deg, #fef3c7, #f59e0b)";
    return "linear-gradient(135deg, rgba(20,25,35,0.95), rgba(8,12,20,0.95))";
  };

  // Check if a position is part of a winning combo
  const isWinning = (reel: number, row: number): boolean => {
    if (!result?.wins?.length) return false;
    for (const w of result.wins) {
      if (w.line === 0) {
        // scatter: highlight if this cell is the scatter
        const sym = symbols.find(s => s.id === grid[reel]?.[row]);
        if (sym?.isScatter) return true;
      }
    }
    return false;
  };

  const totalWin = result?.totalPayout || 0;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#020408" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ background: "rgba(8,10,16,0.98)", borderBottom: "1px solid rgba(255,215,0,0.25)" }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <ArrowLeft className="w-4 h-4 text-white/80" />
          </button>
          <div>
            <div className="text-sm font-black text-white tracking-wide leading-tight">{game.name}</div>
            <div className="text-[9px] text-white/40">Amatic • RTP {game.rtp}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
            style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.3)" }}>
            <Wallet className="w-3 h-3 text-green-400" />
            <span className="text-xs font-bold text-green-400">{user.balance} TND</span>
          </div>
        </div>
      </div>

      {/* Game banner (top thin strip with game art) */}
      <div className="relative w-full overflow-hidden flex-shrink-0" style={{ height: 70 }}>
        <img src={game.thumb} alt={game.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy"
          onError={e => { const t = e.target as HTMLImageElement; if (game.thumbFallback && t.src !== game.thumbFallback) t.src = game.thumbFallback; }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,10,16,0.45) 0%, rgba(8,10,16,0.95) 100%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #FFD700cc, transparent)" }} />
      </div>

      {/* Reels area */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 overflow-hidden"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,215,0,0.05), #020408 70%)" }}>

        <div className="rounded-2xl p-2 sm:p-3 w-full max-w-md"
          style={{
            background: "linear-gradient(135deg, #1a1d28, #0a0d14)",
            border: "2px solid rgba(255,215,0,0.4)",
            boxShadow: "inset 0 0 40px rgba(0,0,0,0.7), 0 0 50px rgba(255,215,0,0.15)",
          }}>
          <div className={`grid gap-1 sm:gap-1.5`} style={{ gridTemplateColumns: `repeat(${game.reels}, 1fr)` }}>
            {grid.map((col, ri) => (
              <div key={ri} className="flex flex-col gap-1 sm:gap-1.5">
                {col.map((symId, row) => {
                  const sym = symbols.find(s => s.id === symId);
                  const isWin = !spinning && isWinning(ri, row);
                  return (
                    <motion.div
                      key={row}
                      animate={isWin ? { scale: [1, 1.12, 1] } : {}}
                      transition={{ duration: 0.55, repeat: isWin ? Infinity : 0 }}
                      className="aspect-square rounded-lg flex items-center justify-center text-lg sm:text-2xl font-black"
                      style={{
                        background: isWin
                          ? "linear-gradient(135deg, rgba(255,215,0,0.45), rgba(255,140,0,0.30))"
                          : symbolBg(symId),
                        color: symbolColor(symId),
                        border: isWin ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.06)",
                        textShadow: `0 0 12px ${symbolColor(symId)}90, 0 2px 4px rgba(0,0,0,0.95)`,
                        boxShadow: isWin ? "0 0 22px rgba(255,215,0,0.65)" : "none",
                        letterSpacing: sym?.label?.length === 1 ? "0" : "-0.05em",
                      }}>
                      {sym?.label}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Win display */}
        <div className="mt-3 h-7 flex items-center justify-center">
          {spinning && <span className="text-xs text-yellow-400/70 font-bold tracking-wide animate-pulse">SPINNING...</span>}
          {!spinning && totalWin > 0 && (
            <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-lg font-black tracking-wide"
              style={{ color: "#00C853", textShadow: "0 0 20px #00C85388" }}>
              WIN +{totalWin.toFixed(2)} TND
            </motion.span>
          )}
          {!spinning && result && totalWin === 0 && <span className="text-xs text-white/30 tracking-wide">NO WIN</span>}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-2 flex gap-1 overflow-x-auto scrollbar-hide max-w-full px-1">
            {history.map((p, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-black"
                style={{ background: p > 0 ? "rgba(0,200,83,0.85)" : "rgba(120,120,130,0.5)", color: "#000" }}>
                {p > 0 ? `+${p.toFixed(2)}` : "0"}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="p-3 space-y-2 flex-shrink-0"
        style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(255,215,0,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}

        <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2 items-center">
          {/* Stake controls */}
          <div className="flex items-center gap-1">
            <button onClick={() => adjustStake(-1)} disabled={spinning}
              className="w-8 h-8 rounded text-white/60"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <Minus className="w-3.5 h-3.5 mx-auto" />
            </button>
            <div className="flex-1 px-1 py-1.5 rounded text-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,215,0,0.2)" }}>
              <div className="text-[8px] text-white/40 leading-none mb-0.5 uppercase">BET</div>
              <div className="text-sm font-black text-white leading-none">{stakeNum.toFixed(2)}</div>
            </div>
            <button onClick={() => adjustStake(1)} disabled={spinning}
              className="w-8 h-8 rounded text-white/60"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <Plus className="w-3.5 h-3.5 mx-auto" />
            </button>
          </div>

          {/* SPIN button (big) */}
          <button onClick={spin} disabled={spinning}
            className="py-3 rounded-xl text-base font-black text-black tracking-widest disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              boxShadow: "0 4px 20px rgba(255,215,0,0.4)",
            }}>
            {spinning ? "..." : "SPIN"}
          </button>

          {/* Auto-spin */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { if (!spinning) { setAutoSpin(10); spin(); } }}
              disabled={spinning || autoSpin > 0}
              className="flex-1 py-1.5 rounded text-[10px] font-bold text-white/60 leading-tight"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              {autoSpin > 0 ? `AUTO ${autoSpin}` : "AUTO 10"}
            </button>
          </div>
        </div>

        {/* Quick stake buttons */}
        <div className="flex gap-1">
          {[0.5, 1, 2, 5, 10, 25].map(v => (
            <button key={v} onClick={() => setStake(String(v))} disabled={spinning}
              className="flex-1 py-1 rounded text-[10px] font-bold"
              style={{
                background: Math.abs(stakeNum - v) < 0.01 ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.04)",
                color: Math.abs(stakeNum - v) < 0.01 ? "#FFD700" : "rgba(255,255,255,0.5)",
              }}>
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
