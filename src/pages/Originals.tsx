import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { ArrowLeft, Sparkles, Trophy, Wallet, TrendingUp, Bomb, Dice5, Activity, Plus, Minus } from "lucide-react";
import { crashRound, diceRoll, minesStart, minesMultiplier, minesCashout, limboRoll, plinkoRound, PLINKO_MULTIPLIERS, generateServerSeed } from "@/lib/originals";

const GAMES = [
  { id: "crash", name: "Crash", desc: "اخرج قبل ما تنفجر", icon: "🚀", color: "#FF2D55", grad: "linear-gradient(135deg,#FF2D55,#FF6B35)" },
  { id: "mines", name: "Mines", desc: "تجنّب الألغام", icon: "💣", color: "#FFD700", grad: "linear-gradient(135deg,#FFD700,#FFA500)" },
  { id: "dice", name: "Dice", desc: "Over / Under", icon: "🎲", color: "#00D1FF", grad: "linear-gradient(135deg,#00D1FF,#0066FF)" },
  { id: "plinko", name: "Plinko", desc: "Drop the ball", icon: "🟢", color: "#22c55e", grad: "linear-gradient(135deg,#22c55e,#10b981)" },
  { id: "limbo", name: "Limbo", desc: "أعلى من الهدف", icon: "📈", color: "#a855f7", grad: "linear-gradient(135deg,#a855f7,#7c3aed)" },
];

export default function Originals() {
  const { user, refreshBalance } = useAuth();
  const [active, setActive] = useState<string | null>(null);
  const [auth, setAuth] = useState(false);

  if (!user) {
    return (
      <div className="p-6 text-center space-y-3">
        <Trophy className="w-12 h-12 mx-auto text-white/20" />
        <p className="text-white/50">سجل دخول للعب TunBet Originals</p>
        <button onClick={() => setAuth(true)} className="px-5 py-2 rounded-xl text-sm font-black text-black"
          style={{ background: "#00D1FF" }}>Sign In</button>
        {auth && <AuthModal onClose={() => setAuth(false)} />}
      </div>
    );
  }

  if (active === "crash") return <CrashGame onBack={() => { setActive(null); refreshBalance(); }} />;
  if (active === "dice") return <DiceGame onBack={() => { setActive(null); refreshBalance(); }} />;
  if (active === "mines") return <MinesGame onBack={() => { setActive(null); refreshBalance(); }} />;
  if (active === "limbo") return <LimboGame onBack={() => { setActive(null); refreshBalance(); }} />;
  if (active === "plinko") return <PlinkoGame onBack={() => { setActive(null); refreshBalance(); }} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="p-4 pb-24 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#a855f7,#FF2D55)" }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider">ORIGINALS</h1>
              <p className="text-[10px] text-white/40 font-mono">💰 REAL TND • PROVABLY FAIR</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: "rgba(0,200,83,0.15)", border: "1px solid rgba(0,200,83,0.3)" }}>
            <Wallet className="w-3 h-3 text-green-400" />
            <span className="text-[10px] font-bold text-green-400">{user.balance} TND</span>
          </div>
        </div>

        <div className="rounded-xl p-3.5"
          style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(255,45,85,0.06))",
                   border: "1px solid rgba(168,85,247,0.2)" }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(168,85,247,0.15)" }}>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white mb-1">✅ ألعاب حقيقية برصيد TND</p>
              <p className="text-[10px] text-white/55 leading-relaxed">
                كل رهان يُخصم مباشرة من رصيدك، كل ربح يُضاف فوراً. لا demos، لا sessions — تجربة حقيقية كاملة مع Provably Fair.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((g) => (
            <motion.div key={g.id}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setActive(g.id)}
              className="relative rounded-2xl overflow-hidden cursor-pointer aspect-square"
              style={{ background: g.grad, border: `1px solid ${g.color}40` }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <div className="text-6xl mb-2">{g.icon}</div>
                <h3 className="text-lg font-black text-white">{g.name}</h3>
                <p className="text-[10px] text-white/70">{g.desc}</p>
              </div>
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-black"
                style={{ background: "rgba(255,255,255,0.95)", color: "#000" }}>
                💰 LIVE
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━ Common helpers ━━━━━━━━━━━━━━━━━━

function TopBar({ onBack, title, balance, color = "#00D1FF" }: { onBack: () => void; title: string; balance: string; color?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2"
      style={{ background: "rgba(2,4,8,0.95)", borderBottom: `1px solid ${color}33` }}>
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <ArrowLeft className="w-4 h-4 text-white/70" />
        </button>
        <span className="text-sm font-black text-white">{title}</span>
      </div>
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
        style={{ background: "rgba(0,200,83,0.1)", border: "1px solid rgba(0,200,83,0.25)" }}>
        <Wallet className="w-3 h-3 text-green-400" />
        <span className="text-xs font-bold text-green-400">{balance} TND</span>
      </div>
    </div>
  );
}

function StakeInput({ value, onChange, max, color = "#00D1FF" }: { value: string; onChange: (v: string) => void; max: number; color?: string }) {
  const adjust = (delta: number) => {
    const cur = parseFloat(value) || 0;
    const next = Math.max(0.5, Math.min(max, +(cur + delta).toFixed(2)));
    onChange(String(next));
  };
  const setPercent = (pct: number) => {
    const next = +(max * pct / 100).toFixed(2);
    onChange(String(Math.max(0.5, next)));
  };
  return (
    <div className="space-y-2">
      <label className="text-[10px] text-white/40">المبلغ (TND)</label>
      <div className="flex items-center gap-1">
        <button onClick={() => adjust(-1)} className="w-9 h-9 rounded-lg text-white/60"
          style={{ background: "rgba(255,255,255,0.05)" }}><Minus className="w-3.5 h-3.5 mx-auto" /></button>
        <input type="number" value={value} onChange={e => onChange(e.target.value)} min="0.5" step="0.5" max={max}
          className="flex-1 px-2 py-2 rounded-lg text-center text-base font-black text-white"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${color}30` }} />
        <button onClick={() => adjust(1)} className="w-9 h-9 rounded-lg text-white/60"
          style={{ background: "rgba(255,255,255,0.05)" }}><Plus className="w-3.5 h-3.5 mx-auto" /></button>
      </div>
      <div className="flex gap-1">
        {[10, 25, 50, 100].map(p => (
          <button key={p} onClick={() => setPercent(p)}
            className="flex-1 py-1 rounded text-[9px] font-bold text-white/60"
            style={{ background: "rgba(255,255,255,0.04)" }}>{p}%</button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ CRASH GAME ━━━━━━━━━━━━━━━━━━

function CrashGame({ onBack }: { onBack: () => void }) {
  const { user, refreshBalance } = useAuth();
  const [stake, setStake] = useState("1");
  const [target, setTarget] = useState("2.00");
  const [phase, setPhase] = useState<"idle" | "flying" | "crashed">("idle");
  const [multiplier, setMultiplier] = useState(1);
  const [crashAt, setCrashAt] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [payout, setPayout] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(Math.floor(Math.random() * 1e6));
  const clientSeed = useRef(generateServerSeed().substring(0, 16));
  const startTime = useRef(0);
  const animFrame = useRef(0);

  if (!user) return null;
  const balance = parseFloat(user.balance);

  const play = async () => {
    setError("");
    const s = parseFloat(stake);
    const t = parseFloat(target);
    if (!s || s <= 0) { setError("أدخل المبلغ"); return; }
    if (!t || t < 1.01) { setError("الهدف 1.01x أو أكثر"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }

    setPhase("flying");
    setMultiplier(1);
    setWon(null);
    setPayout(0);

    const res = await crashRound(user.id, s, t, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); setPhase("idle"); return; }
    await refreshBalance();

    const crash = res.crashAt!;
    setCrashAt(crash);

    // Animate multiplier from 1 to crash
    startTime.current = Date.now();
    const duration = Math.min(15000, Math.log(crash) * 3000); // log scale duration
    const animate = () => {
      const elapsed = (Date.now() - startTime.current) / duration;
      if (elapsed >= 1) {
        setMultiplier(crash);
        setPhase("crashed");
        setWon(res.won!);
        setPayout(res.payout || 0);
        setHistory(h => [crash, ...h].slice(0, 10));
        refreshBalance();
        return;
      }
      // Exponential growth like Aviator
      const m = +Math.exp(elapsed * Math.log(crash)).toFixed(2);
      setMultiplier(m);
      animFrame.current = requestAnimationFrame(animate);
    };
    animFrame.current = requestAnimationFrame(animate);
  };

  useEffect(() => () => { cancelAnimationFrame(animFrame.current); }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="🚀 Crash" balance={user.balance} color="#FF2D55" />

      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "radial-gradient(circle at center, rgba(255,45,85,0.1), transparent 70%)" }}>
        {/* History strip */}
        {history.length > 0 && (
          <div className="absolute top-3 left-3 right-3 flex gap-1 overflow-x-auto scrollbar-hide">
            {history.map((h, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded-md text-[10px] font-black"
                style={{ background: h >= 2 ? "rgba(0,200,83,0.15)" : "rgba(255,45,85,0.15)",
                         color: h >= 2 ? "#00C853" : "#FF2D55" }}>
                {h.toFixed(2)}x
              </div>
            ))}
          </div>
        )}

        <div className="text-center">
          {phase === "idle" && <p className="text-7xl font-black text-white/15">1.00x</p>}
          {phase === "flying" && (
            <motion.p animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.3, repeat: Infinity }}
              className="text-7xl font-black"
              style={{ color: multiplier >= parseFloat(target) ? "#00C853" : "#FFD700",
                       textShadow: "0 0 40px currentColor" }}>
              {multiplier.toFixed(2)}x
            </motion.p>
          )}
          {phase === "crashed" && (
            <>
              <motion.p initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-7xl font-black"
                style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 40px currentColor" }}>
                {crashAt!.toFixed(2)}x
              </motion.p>
              <p className="text-xs mt-2 font-bold"
                style={{ color: won ? "#00C853" : "#FF2D55" }}>
                {won ? `🎉 ربحت ${payout.toFixed(2)} TND` : "💥 انفجرت!"}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(255,45,85,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <StakeInput value={stake} onChange={setStake} max={balance} color="#FF2D55" />
          <div className="space-y-2">
            <label className="text-[10px] text-white/40">الهدف (Auto Cashout)</label>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)}
              min="1.01" step="0.1"
              className="w-full px-2 py-2 rounded-lg text-center text-base font-black text-white"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,45,85,0.3)" }} />
            <div className="flex gap-1">
              {["1.5", "2", "3", "5", "10"].map(t => (
                <button key={t} onClick={() => setTarget(t)}
                  className="flex-1 py-1 rounded text-[9px] font-bold text-white/60"
                  style={{ background: "rgba(255,255,255,0.04)" }}>{t}x</button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={play} disabled={phase === "flying"}
          className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#FF2D55,#FF6B35)",
                   boxShadow: "0 4px 20px rgba(255,45,85,0.4)" }}>
          {phase === "flying" ? "✈️ Flying..." : `🚀 Bet ${parseFloat(stake || "0").toFixed(2)} TND`}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ DICE GAME ━━━━━━━━━━━━━━━━━━

function DiceGame({ onBack }: { onBack: () => void }) {
  const { user, refreshBalance } = useAuth();
  const [stake, setStake] = useState("1");
  const [target, setTarget] = useState(50);
  const [isOver, setIsOver] = useState(true);
  const [roll, setRoll] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [payout, setPayout] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<{r:number;w:boolean}[]>([]);
  const [nonce, setNonce] = useState(Math.floor(Math.random() * 1e6));
  const clientSeed = useRef(generateServerSeed().substring(0, 16));

  if (!user) return null;
  const balance = parseFloat(user.balance);
  const winChance = isOver ? 100 - target : target;
  const multiplier = winChance > 0 ? +(99 / winChance).toFixed(4) : 0;
  const potWin = +(parseFloat(stake || "0") * multiplier).toFixed(2);

  const play = async () => {
    setError("");
    const s = parseFloat(stake);
    if (!s || s <= 0) { setError("أدخل المبلغ"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }
    setRolling(true); setWon(null); setRoll(null);

    const res = await diceRoll(user.id, s, target, isOver, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); setRolling(false); return; }
    await refreshBalance();
    setTimeout(() => {
      setRoll(res.roll!);
      setWon(res.won!);
      setPayout(res.payout || 0);
      setHistory(h => [{r: res.roll!, w: res.won!}, ...h].slice(0, 10));
      setRolling(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="🎲 Dice" balance={user.balance} color="#00D1FF" />

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Roll display */}
        <div className="text-center py-4">
          {rolling ? (
            <motion.p animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
              className="text-7xl font-black text-white/40">🎲</motion.p>
          ) : roll !== null ? (
            <>
              <p className="text-7xl font-black"
                style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 30px currentColor" }}>
                {roll.toFixed(2)}
              </p>
              <p className="text-xs mt-2 font-bold" style={{ color: won ? "#00C853" : "#FF2D55" }}>
                {won ? `🎉 ربحت ${payout.toFixed(2)} TND` : "💸 خسرت"}
              </p>
            </>
          ) : (
            <p className="text-7xl font-black text-white/15">--.--</p>
          )}
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-white/40">
            <span>الهدف: <b className="text-white">{target}</b></span>
            <span>فرصة الربح: <b style={{ color: "#00D1FF" }}>{winChance.toFixed(2)}%</b></span>
          </div>
          <input type="range" min="2" max="98" value={target} onChange={e => setTarget(parseInt(e.target.value))}
            className="w-full" style={{ accentColor: "#00D1FF" }} />
          <div className="flex gap-2">
            <button onClick={() => setIsOver(false)}
              className="flex-1 py-2 rounded-lg text-xs font-black"
              style={{ background: !isOver ? "linear-gradient(135deg,#00D1FF,#0066FF)" : "rgba(255,255,255,0.04)",
                       color: !isOver ? "#000" : "rgba(255,255,255,0.5)" }}>
              ◀ Under {target}
            </button>
            <button onClick={() => setIsOver(true)}
              className="flex-1 py-2 rounded-lg text-xs font-black"
              style={{ background: isOver ? "linear-gradient(135deg,#00D1FF,#0066FF)" : "rgba(255,255,255,0.04)",
                       color: isOver ? "#000" : "rgba(255,255,255,0.5)" }}>
              Over {target} ▶
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,215,0,0.06)" }}>
            <p className="text-[9px] text-white/40">Multiplier</p>
            <p className="text-base font-black text-yellow-400">{multiplier.toFixed(2)}x</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,200,83,0.06)" }}>
            <p className="text-[9px] text-white/40">Potential Win</p>
            <p className="text-base font-black text-green-400">{potWin.toFixed(2)} TND</p>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {history.map((h, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-black"
                style={{ background: h.w ? "rgba(0,200,83,0.15)" : "rgba(255,45,85,0.15)",
                         color: h.w ? "#00C853" : "#FF2D55" }}>
                {h.r.toFixed(0)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(0,209,255,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <StakeInput value={stake} onChange={setStake} max={balance} color="#00D1FF" />
        <button onClick={play} disabled={rolling}
          className="w-full py-3 rounded-xl text-sm font-black text-black disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#00D1FF,#0066FF)", boxShadow: "0 4px 20px rgba(0,209,255,0.4)" }}>
          {rolling ? "🎲 Rolling..." : `🎲 Roll • ${parseFloat(stake || "0").toFixed(2)} TND`}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ MINES GAME ━━━━━━━━━━━━━━━━━━

function MinesGame({ onBack }: { onBack: () => void }) {
  const { user, refreshBalance } = useAuth();
  const [stake, setStake] = useState("1");
  const [mineCount, setMineCount] = useState(3);
  const [mines, setMines] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<"idle" | "playing" | "ended">("idle");
  const [error, setError] = useState("");
  const [resultMsg, setResultMsg] = useState("");
  const [nonce, setNonce] = useState(Math.floor(Math.random() * 1e6));
  const clientSeed = useRef(generateServerSeed().substring(0, 16));

  if (!user) return null;
  const balance = parseFloat(user.balance);
  const safeRevealed = Array.from(revealed).filter(i => !mines.includes(i)).length;
  const multiplier = minesMultiplier(mineCount, safeRevealed);
  const currentWin = +(parseFloat(stake || "0") * multiplier).toFixed(2);
  const nextMultiplier = minesMultiplier(mineCount, safeRevealed + 1);

  const start = async () => {
    setError(""); setResultMsg("");
    const s = parseFloat(stake);
    if (!s || s <= 0) { setError("أدخل المبلغ"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }

    const res = await minesStart(user.id, s, mineCount, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); return; }
    await refreshBalance();
    setMines(res.mines!);
    setRevealed(new Set());
    setPhase("playing");
  };

  const reveal = async (idx: number) => {
    if (phase !== "playing" || revealed.has(idx)) return;
    const newRevealed = new Set(revealed); newRevealed.add(idx);
    setRevealed(newRevealed);
    if (mines.includes(idx)) {
      setPhase("ended");
      setResultMsg("💥 لغم! خسرت الرهان");
    }
  };

  const cashout = async () => {
    if (phase !== "playing" || safeRevealed === 0) return;
    const res = await minesCashout(user.id, parseFloat(stake), mineCount, safeRevealed);
    if (res.ok) {
      await refreshBalance();
      setPhase("ended");
      setResultMsg(`🎉 ربحت ${res.payout!.toFixed(2)} TND (${multiplier.toFixed(2)}x)`);
    }
  };

  const reset = () => { setPhase("idle"); setRevealed(new Set()); setMines([]); setResultMsg(""); };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="💣 Mines" balance={user.balance} color="#FFD700" />

      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,215,0,0.06)" }}>
            <p className="text-[9px] text-white/40">Multiplier</p>
            <p className="text-base font-black text-yellow-400">{multiplier.toFixed(2)}x</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,200,83,0.06)" }}>
            <p className="text-[9px] text-white/40">Current Win</p>
            <p className="text-base font-black text-green-400">{currentWin.toFixed(2)}</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,209,255,0.06)" }}>
            <p className="text-[9px] text-white/40">Next</p>
            <p className="text-base font-black text-cyan-400">{nextMultiplier.toFixed(2)}x</p>
          </div>
        </div>

        {resultMsg && (
          <div className="p-3 rounded-xl text-sm text-center font-bold mb-3"
            style={{ background: resultMsg.includes("ربحت") ? "rgba(0,200,83,0.1)" : "rgba(255,45,85,0.1)",
                     color: resultMsg.includes("ربحت") ? "#00C853" : "#FF2D55" }}>
            {resultMsg}
          </div>
        )}

        {/* Grid 5x5 */}
        <div className="grid grid-cols-5 gap-1.5 max-w-sm mx-auto w-full">
          {Array.from({ length: 25 }).map((_, idx) => {
            const isRevealed = revealed.has(idx);
            const isMine = mines.includes(idx);
            const isSafe = isRevealed && !isMine;
            const showAll = phase === "ended";
            return (
              <button key={idx} onClick={() => reveal(idx)} disabled={phase !== "playing" || isRevealed}
                className="aspect-square rounded-lg text-2xl font-black flex items-center justify-center transition-all"
                style={{
                  background: isSafe ? "linear-gradient(135deg,#00C853,#00E676)"
                    : (isRevealed && isMine) || (showAll && isMine) ? "linear-gradient(135deg,#FF2D55,#FF6B35)"
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isRevealed || (showAll && isMine) ? "transparent" : "rgba(255,215,0,0.15)"}`,
                  opacity: phase === "ended" && !isRevealed && !isMine ? 0.3 : 1,
                }}>
                {isSafe ? "💎" : (isRevealed && isMine) || (showAll && isMine) ? "💣" : ""}
              </button>
            );
          })}
        </div>

        {/* Mine count selector (only in idle) */}
        {phase === "idle" && (
          <div className="mt-4 space-y-2">
            <label className="text-[10px] text-white/40">عدد الألغام (1-24)</label>
            <input type="range" min="1" max="24" value={mineCount} onChange={e => setMineCount(parseInt(e.target.value))}
              className="w-full" style={{ accentColor: "#FFD700" }} />
            <div className="flex gap-1">
              {[1, 3, 5, 10, 24].map(n => (
                <button key={n} onClick={() => setMineCount(n)}
                  className="flex-1 py-1 rounded text-[10px] font-bold"
                  style={{ background: mineCount === n ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.04)",
                           color: mineCount === n ? "#FFD700" : "rgba(255,255,255,0.5)" }}>{n}</button>
              ))}
            </div>
            <p className="text-[10px] text-center text-white/40">💣 {mineCount} • 💎 {25 - mineCount}</p>
          </div>
        )}
      </div>

      <div className="p-3 space-y-3" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(255,215,0,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}

        {phase === "idle" && (
          <>
            <StakeInput value={stake} onChange={setStake} max={balance} color="#FFD700" />
            <button onClick={start}
              className="w-full py-3 rounded-xl text-sm font-black text-black"
              style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)" }}>
              💣 Start Game • {parseFloat(stake || "0").toFixed(2)} TND
            </button>
          </>
        )}

        {phase === "playing" && (
          <button onClick={cashout} disabled={safeRevealed === 0}
            className="w-full py-3 rounded-xl text-sm font-black text-black disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#00C853,#00E676)" }}>
            💰 Cash Out • {currentWin.toFixed(2)} TND
          </button>
        )}

        {phase === "ended" && (
          <button onClick={reset}
            className="w-full py-3 rounded-xl text-sm font-black text-white"
            style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)", color: "#000" }}>
            🔁 New Game
          </button>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ LIMBO GAME ━━━━━━━━━━━━━━━━━━

function LimboGame({ onBack }: { onBack: () => void }) {
  const { user, refreshBalance } = useAuth();
  const [stake, setStake] = useState("1");
  const [target, setTarget] = useState("2.00");
  const [result, setResult] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [payout, setPayout] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<{r:number;w:boolean}[]>([]);
  const [nonce, setNonce] = useState(Math.floor(Math.random() * 1e6));
  const clientSeed = useRef(generateServerSeed().substring(0, 16));

  if (!user) return null;
  const balance = parseFloat(user.balance);
  const t = parseFloat(target) || 1;
  const winChance = +(99 / t).toFixed(2);
  const potWin = +(parseFloat(stake || "0") * t).toFixed(2);

  const play = async () => {
    setError("");
    const s = parseFloat(stake);
    if (!s || s <= 0) { setError("أدخل المبلغ"); return; }
    if (t < 1.01) { setError("الهدف 1.01x أو أكثر"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }
    setRolling(true); setResult(null); setWon(null);

    const res = await limboRoll(user.id, s, t, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); setRolling(false); return; }
    await refreshBalance();
    setTimeout(() => {
      setResult(res.result!);
      setWon(res.won!);
      setPayout(res.payout || 0);
      setHistory(h => [{r: res.result!, w: res.won!}, ...h].slice(0, 10));
      setRolling(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="📈 Limbo" balance={user.balance} color="#a855f7" />

      <div className="flex-1 flex flex-col items-center justify-center p-4"
        style={{ background: "radial-gradient(circle at center, rgba(168,85,247,0.1), transparent 70%)" }}>
        <div className="text-center">
          {rolling ? (
            <motion.p animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.4, repeat: Infinity }}
              className="text-7xl font-black text-purple-400/40">?.??x</motion.p>
          ) : result !== null ? (
            <>
              <motion.p initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-7xl font-black"
                style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 40px currentColor" }}>
                {result.toFixed(2)}x
              </motion.p>
              <p className="text-xs mt-2 font-bold" style={{ color: won ? "#00C853" : "#FF2D55" }}>
                {won ? `🎉 ربحت ${payout.toFixed(2)} TND` : "💸 أقل من الهدف"}
              </p>
            </>
          ) : (
            <p className="text-7xl font-black text-white/15">{target}x</p>
          )}
        </div>

        {history.length > 0 && (
          <div className="mt-6 flex gap-1 overflow-x-auto scrollbar-hide max-w-full">
            {history.map((h, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-black"
                style={{ background: h.w ? "rgba(0,200,83,0.15)" : "rgba(255,45,85,0.15)",
                         color: h.w ? "#00C853" : "#FF2D55" }}>
                {h.r.toFixed(2)}x
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(168,85,247,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <StakeInput value={stake} onChange={setStake} max={balance} color="#a855f7" />
          <div className="space-y-2">
            <label className="text-[10px] text-white/40">Target Multiplier</label>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)}
              min="1.01" step="0.1"
              className="w-full px-2 py-2 rounded-lg text-center text-base font-black text-white"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(168,85,247,0.3)" }} />
            <div className="flex justify-between text-[9px]">
              <span className="text-white/40">Win: <b className="text-purple-300">{winChance}%</b></span>
              <span className="text-white/40">Pay: <b className="text-green-400">{potWin.toFixed(2)}</b></span>
            </div>
          </div>
        </div>

        <button onClick={play} disabled={rolling}
          className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)",
                   boxShadow: "0 4px 20px rgba(168,85,247,0.4)" }}>
          {rolling ? "🎯 Rolling..." : `📈 Bet ${parseFloat(stake || "0").toFixed(2)} TND`}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ PLINKO GAME ━━━━━━━━━━━━━━━━━━

function PlinkoGame({ onBack }: { onBack: () => void }) {
  const { user, refreshBalance } = useAuth();
  const [stake, setStake] = useState("1");
  const [rows, setRows] = useState<8 | 12 | 16>(8);
  const [risk, setRisk] = useState<"low" | "med" | "high">("med");
  const [dropping, setDropping] = useState(false);
  const [lastResult, setLastResult] = useState<{ bucket: number; multiplier: number; payout: number; won: boolean } | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<number[]>([]);
  const [nonce, setNonce] = useState(Math.floor(Math.random() * 1e6));
  const clientSeed = useRef(generateServerSeed().substring(0, 16));

  if (!user) return null;
  const balance = parseFloat(user.balance);
  const mults = PLINKO_MULTIPLIERS[`${rows}-${risk}`];

  const drop = async () => {
    setError("");
    const s = parseFloat(stake);
    if (!s || s <= 0) { setError("أدخل المبلغ"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }
    setDropping(true); setLastResult(null);

    const res = await plinkoRound(user.id, s, rows, risk, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); setDropping(false); return; }
    await refreshBalance();

    setTimeout(() => {
      setLastResult({ bucket: res.bucket!, multiplier: res.multiplier!, payout: res.payout!, won: res.won! });
      setHistory(h => [res.multiplier!, ...h].slice(0, 10));
      setDropping(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="🟢 Plinko" balance={user.balance} color="#22c55e" />

      <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
        {/* Pyramid visualization */}
        <div className="flex-1 flex flex-col items-center justify-center py-2">
          <div className="space-y-1 mb-3">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex justify-center gap-1.5">
                {Array.from({ length: r + 2 }).map((_, i) => (
                  <div key={i} className="rounded-full"
                    style={{ width: rows === 16 ? 5 : rows === 12 ? 6 : 8, height: rows === 16 ? 5 : rows === 12 ? 6 : 8,
                             background: "rgba(255,255,255,0.3)" }} />
                ))}
              </div>
            ))}
          </div>

          {/* Buckets */}
          <div className="flex gap-0.5">
            {mults.map((m, i) => (
              <div key={i}
                className="rounded text-[8px] font-black flex items-center justify-center transition-all"
                style={{
                  width: rows === 16 ? 18 : rows === 12 ? 24 : 32,
                  height: rows === 16 ? 24 : rows === 12 ? 30 : 36,
                  background: lastResult?.bucket === i ? "linear-gradient(135deg,#FFD700,#FFA500)"
                    : m >= 5 ? "rgba(255,45,85,0.25)" : m >= 1 ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.04)",
                  color: lastResult?.bucket === i ? "#000" : m >= 5 ? "#FF6B85" : m >= 1 ? "#22c55e" : "rgba(255,255,255,0.4)",
                  border: lastResult?.bucket === i ? "2px solid #fff" : "1px solid rgba(255,255,255,0.05)",
                  transform: lastResult?.bucket === i ? "scale(1.15)" : "scale(1)",
                }}>
                {m}
              </div>
            ))}
          </div>

          {lastResult && (
            <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="mt-4 text-xl font-black"
              style={{ color: lastResult.won ? "#00C853" : "#FF2D55", textShadow: "0 0 20px currentColor" }}>
              {lastResult.won ? `🎉 ${lastResult.payout.toFixed(2)} TND` : `${lastResult.multiplier}x`}
            </motion.p>
          )}
          {dropping && <p className="mt-4 text-sm font-bold text-yellow-400 animate-pulse">🟢 Dropping...</p>}
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Rows</label>
            <div className="flex gap-1">
              {[8, 12, 16].map(r => (
                <button key={r} onClick={() => setRows(r as any)}
                  className="flex-1 py-1.5 rounded text-[10px] font-bold"
                  style={{ background: rows === r ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.04)",
                           color: rows === r ? "#22c55e" : "rgba(255,255,255,0.5)" }}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-white/40 mb-1 block">Risk</label>
            <div className="flex gap-1">
              {(["low", "med", "high"] as const).map(rk => (
                <button key={rk} onClick={() => setRisk(rk)}
                  className="flex-1 py-1.5 rounded text-[10px] font-bold capitalize"
                  style={{ background: risk === rk ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.04)",
                           color: risk === rk ? "#FFD700" : "rgba(255,255,255,0.5)" }}>{rk}</button>
              ))}
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {history.map((m, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-black"
                style={{ background: m >= 1 ? "rgba(0,200,83,0.15)" : "rgba(255,45,85,0.15)",
                         color: m >= 1 ? "#00C853" : "#FF2D55" }}>
                {m}x
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(34,197,94,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <StakeInput value={stake} onChange={setStake} max={balance} color="#22c55e" />
        <button onClick={drop} disabled={dropping}
          className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#22c55e,#10b981)",
                   boxShadow: "0 4px 20px rgba(34,197,94,0.4)" }}>
          {dropping ? "🟢 Dropping..." : `🟢 Drop • ${parseFloat(stake || "0").toFixed(2)} TND`}
        </button>
      </div>
    </div>
  );
}
