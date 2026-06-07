import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { ArrowLeft, Sparkles, Trophy, Wallet, Activity, Plus, Minus } from "lucide-react";
import {
  crashRound, diceRoll, minesStart, minesMultiplier, minesCashout,
  limboRoll, plinkoRound, PLINKO_MULTIPLIERS, generateServerSeed,
  coinFlip, hiloPlay, drawCard, wheelSpin, WHEEL_SEGMENTS,
  kenoPlay, towerStart, towerCashout, towerMultiplier, TOWER_CONFIG,
} from "@/lib/originals";

interface GameMeta {
  id: string;
  name: string;
  arName: string;
  desc: string;
  img: string;
  badge?: string;
  badgeColor?: string;
  accent: string;
}

const GAMES: GameMeta[] = [
  { id: "crash",    name: "Crash",       arName: "كراش",      desc: "اخرج قبل ما تنفجر",       img: "/images/originals/crash.jpg",    badge: "HOT 🔥",   badgeColor: "#FF2D55", accent: "#FF2D55" },
  { id: "mines",    name: "Mines",       arName: "ألغام",     desc: "تجنّب الألغام، احصد الجواهر", img: "/images/originals/mines.jpg",    badge: "POPULAR",  badgeColor: "#FFD700", accent: "#FFD700" },
  { id: "dice",     name: "Dice",        arName: "النرد",     desc: "Over / Under classic",    img: "/images/originals/dice.jpg",     badge: "CLASSIC",  badgeColor: "#00D1FF", accent: "#00D1FF" },
  { id: "plinko",   name: "Plinko",      arName: "بلينكو",    desc: "حتى 1000x من الكرة",      img: "/images/originals/plinko.jpg",   badge: "1000x 💎", badgeColor: "#22c55e", accent: "#22c55e" },
  { id: "limbo",    name: "Limbo",       arName: "ليمبو",     desc: "أعلى من الهدف = ربح",      img: "/images/originals/limbo.jpg",    badge: "∞",        badgeColor: "#a855f7", accent: "#a855f7" },
  { id: "wheel",    name: "Wheel",       arName: "العجلة",    desc: "دوّر العجلة، حتى 50x",     img: "/images/originals/wheel.jpg",    badge: "NEW",      badgeColor: "#FF6B35", accent: "#FF6B35" },
  { id: "hilo",     name: "Hi-Lo",       arName: "أعلى/أقل",  desc: "أعلى أم أقل؟ ورق لعب",     img: "/images/originals/hilo.jpg",     badge: "NEW",      badgeColor: "#ec4899", accent: "#ec4899" },
  { id: "coinflip", name: "Coin Flip",   arName: "ملك/كتابة", desc: "1.98x فوري",              img: "/images/originals/coinflip.jpg", badge: "QUICK",    badgeColor: "#FFD700", accent: "#FFD700" },
  { id: "keno",     name: "Keno",        arName: "كينو",      desc: "اختر 10، اضرب اليانصيب",   img: "/images/originals/keno.jpg",     badge: "1000x",    badgeColor: "#06b6d4", accent: "#06b6d4" },
  { id: "tower",    name: "Tower",       arName: "البرج",     desc: "تسلق 9 مستويات",          img: "/images/originals/tower.jpg",    badge: "NEW",      badgeColor: "#10b981", accent: "#10b981" },
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

  const close = () => { setActive(null); refreshBalance(); };

  if (active === "crash") return <CrashGame onBack={close} />;
  if (active === "dice") return <DiceGame onBack={close} />;
  if (active === "mines") return <MinesGame onBack={close} />;
  if (active === "limbo") return <LimboGame onBack={close} />;
  if (active === "plinko") return <PlinkoGame onBack={close} />;
  if (active === "wheel") return <WheelGame onBack={close} />;
  if (active === "hilo") return <HiloGame onBack={close} />;
  if (active === "coinflip") return <CoinFlipGame onBack={close} />;
  if (active === "keno") return <KenoGame onBack={close} />;
  if (active === "tower") return <TowerGame onBack={close} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="p-4 pb-24 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#a855f7,#FF2D55)" }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider">ORIGINALS</h1>
              <p className="text-[10px] text-white/40 font-mono">{GAMES.length} GAMES • 💰 REAL TND</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: "rgba(0,200,83,0.15)", border: "1px solid rgba(0,200,83,0.3)" }}>
            <Wallet className="w-3 h-3 text-green-400" />
            <span className="text-[10px] font-bold text-green-400">{user.balance} TND</span>
          </div>
        </div>

        {/* Info banner */}
        <div className="rounded-xl p-3"
          style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(255,45,85,0.06))",
                   border: "1px solid rgba(168,85,247,0.2)" }}>
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-white/65 leading-relaxed">
              <b className="text-white">ألعاب أصلية برصيد TND حقيقي</b> — كل رهان يُخصم وكل ربح يُضاف فوراً.
              Provably Fair • RTP 99% • لا تجريبي
            </p>
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((g, i) => (
            <motion.div key={g.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActive(g.id)}
              className="relative rounded-2xl overflow-hidden cursor-pointer group"
              style={{ aspectRatio: "1/1", border: `1px solid ${g.accent}33` }}>

              {/* Background image */}
              <img src={g.img} alt={g.name} loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = "none";
                }} />

              {/* Gradient overlay */}
              <div className="absolute inset-0"
                style={{ background: `linear-gradient(to top, rgba(2,4,8,0.95) 0%, rgba(2,4,8,0.45) 45%, transparent 75%)` }} />

              {/* Glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ boxShadow: `inset 0 0 30px ${g.accent}55` }} />

              {/* Top badge */}
              {g.badge && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[8px] font-black"
                  style={{ background: g.badgeColor, color: "#000" }}>
                  {g.badge}
                </div>
              )}

              {/* LIVE indicator */}
              <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black"
                style={{ background: "rgba(0,200,83,0.85)", color: "#000" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                LIVE
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <h3 className="text-base font-black text-white leading-tight tracking-wide"
                  style={{ textShadow: `0 0 12px ${g.accent}90, 0 2px 4px rgba(0,0,0,0.9)` }}>
                  {g.name}
                </h3>
                <p className="text-[9px] text-white/70 leading-tight mt-0.5">{g.desc}</p>
              </div>

              {/* Hover play button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: g.accent, boxShadow: `0 0 25px ${g.accent}` }}>
                  <span className="text-black font-black text-xl ml-0.5">▶</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━ COMMON UI ━━━━━━━━━━━━━━━━━━

function TopBar({ onBack, title, balance, color = "#00D1FF", img }: { onBack: () => void; title: string; balance: string; color?: string; img?: string }) {
  return (
    <div className="relative flex items-center justify-between px-3 py-2"
      style={{ background: "rgba(2,4,8,0.95)", borderBottom: `1px solid ${color}33` }}>
      {img && (
        <div className="absolute inset-0 opacity-25"
          style={{ background: `url(${img}) center/cover`, filter: "blur(8px)" }} />
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgba(2,4,8,0.85), rgba(2,4,8,0.95))` }} />
      <div className="relative flex items-center gap-2">
        <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <ArrowLeft className="w-4 h-4 text-white/80" />
        </button>
        <span className="text-sm font-black text-white">{title}</span>
      </div>
      <div className="relative flex items-center gap-1 px-2 py-1 rounded-lg"
        style={{ background: "rgba(0,200,83,0.15)", border: "1px solid rgba(0,200,83,0.3)" }}>
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
      <div className="flex justify-between items-center">
        <label className="text-[10px] text-white/40">المبلغ (TND)</label>
        <span className="text-[10px] text-white/30">Max: {max.toFixed(2)}</span>
      </div>
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

// ━━━━━━━━━━━━━━━━━━ CRASH ━━━━━━━━━━━━━━━━━━

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
    if (balance <= 0) { setError("رصيدك 0 — تواصل مع الإدارة"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }

    setPhase("flying"); setMultiplier(1); setWon(null); setPayout(0);

    const res = await crashRound(user.id, s, t, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); setPhase("idle"); return; }
    await refreshBalance();
    const crash = res.crashAt!;
    setCrashAt(crash);

    startTime.current = Date.now();
    const duration = Math.min(15000, Math.max(2000, Math.log(crash) * 3000));
    const animate = () => {
      const elapsed = (Date.now() - startTime.current) / duration;
      if (elapsed >= 1) {
        setMultiplier(crash); setPhase("crashed");
        setWon(res.won!); setPayout(res.payout || 0);
        setHistory(h => [crash, ...h].slice(0, 10));
        refreshBalance();
        return;
      }
      const m = +Math.exp(elapsed * Math.log(crash)).toFixed(2);
      setMultiplier(m);
      animFrame.current = requestAnimationFrame(animate);
    };
    animFrame.current = requestAnimationFrame(animate);
  };

  useEffect(() => () => cancelAnimationFrame(animFrame.current), []);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="🚀 Crash" balance={user.balance} color="#FF2D55" img="/images/originals/crash.jpg" />

      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: `url(/images/originals/crash.jpg) center/cover` }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} />

        {history.length > 0 && (
          <div className="absolute top-3 left-3 right-3 flex gap-1 overflow-x-auto scrollbar-hide z-10">
            {history.map((h, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded-md text-[10px] font-black"
                style={{ background: h >= 2 ? "rgba(0,200,83,0.85)" : "rgba(255,45,85,0.85)", color: "#000" }}>
                {h.toFixed(2)}x
              </div>
            ))}
          </div>
        )}

        <div className="relative text-center z-10">
          {phase === "idle" && <p className="text-7xl font-black text-white/15">1.00x</p>}
          {phase === "flying" && (
            <motion.p animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.3, repeat: Infinity }}
              className="text-7xl font-black"
              style={{ color: multiplier >= parseFloat(target) ? "#00C853" : "#FFD700",
                       textShadow: "0 0 50px currentColor" }}>
              {multiplier.toFixed(2)}x
            </motion.p>
          )}
          {phase === "crashed" && (
            <>
              <motion.p initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-7xl font-black"
                style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 50px currentColor" }}>
                {crashAt!.toFixed(2)}x
              </motion.p>
              <p className="text-sm mt-3 font-black" style={{ color: won ? "#00C853" : "#FF2D55" }}>
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
            <label className="text-[10px] text-white/40">Auto Cashout (x)</label>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)} min="1.01" step="0.1"
              className="w-full px-2 py-2 rounded-lg text-center text-base font-black text-white"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,45,85,0.3)" }} />
            <div className="flex gap-1">
              {["1.5", "2", "3", "5", "10"].map(t => (
                <button key={t} onClick={() => setTarget(t)} className="flex-1 py-1 rounded text-[9px] font-bold text-white/60"
                  style={{ background: "rgba(255,255,255,0.04)" }}>{t}x</button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={play} disabled={phase === "flying"}
          className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#FF2D55,#FF6B35)", boxShadow: "0 4px 20px rgba(255,45,85,0.4)" }}>
          {phase === "flying" ? "✈️ Flying..." : `🚀 Bet ${parseFloat(stake || "0").toFixed(2)} TND`}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ DICE ━━━━━━━━━━━━━━━━━━

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
    if (balance <= 0) { setError("رصيدك 0 — تواصل مع الإدارة"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }
    setRolling(true); setWon(null); setRoll(null);
    const res = await diceRoll(user.id, s, target, isOver, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); setRolling(false); return; }
    await refreshBalance();
    setTimeout(() => {
      setRoll(res.roll!); setWon(res.won!); setPayout(res.payout || 0);
      setHistory(h => [{r: res.roll!, w: res.won!}, ...h].slice(0, 10));
      setRolling(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="🎲 Dice" balance={user.balance} color="#00D1FF" img="/images/originals/dice.jpg" />

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto relative"
        style={{ background: `url(/images/originals/dice.jpg) center/cover` }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.78)" }} />

        <div className="relative text-center py-4">
          {rolling ? (
            <motion.p animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
              className="text-7xl">🎲</motion.p>
          ) : roll !== null ? (
            <>
              <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-7xl font-black"
                style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 40px currentColor" }}>
                {roll.toFixed(2)}
              </motion.p>
              <p className="text-sm mt-2 font-bold" style={{ color: won ? "#00C853" : "#FF2D55" }}>
                {won ? `🎉 ربحت ${payout.toFixed(2)} TND` : "💸 خسرت"}
              </p>
            </>
          ) : (
            <p className="text-7xl font-black text-white/15">--.--</p>
          )}
        </div>

        <div className="relative space-y-2">
          <div className="flex justify-between text-[10px] text-white/70">
            <span>الهدف: <b className="text-white">{target}</b></span>
            <span>فرصة: <b style={{ color: "#00D1FF" }}>{winChance.toFixed(2)}%</b></span>
          </div>
          <input type="range" min="2" max="98" value={target} onChange={e => setTarget(parseInt(e.target.value))}
            className="w-full" style={{ accentColor: "#00D1FF" }} />
          <div className="flex gap-2">
            <button onClick={() => setIsOver(false)} className="flex-1 py-2 rounded-lg text-xs font-black"
              style={{ background: !isOver ? "linear-gradient(135deg,#00D1FF,#0066FF)" : "rgba(255,255,255,0.08)",
                       color: !isOver ? "#000" : "rgba(255,255,255,0.5)" }}>
              ◀ Under {target}
            </button>
            <button onClick={() => setIsOver(true)} className="flex-1 py-2 rounded-lg text-xs font-black"
              style={{ background: isOver ? "linear-gradient(135deg,#00D1FF,#0066FF)" : "rgba(255,255,255,0.08)",
                       color: isOver ? "#000" : "rgba(255,255,255,0.5)" }}>
              Over {target} ▶
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,215,0,0.12)" }}>
            <p className="text-[9px] text-white/60">Multiplier</p>
            <p className="text-base font-black text-yellow-400">{multiplier.toFixed(2)}x</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,200,83,0.12)" }}>
            <p className="text-[9px] text-white/60">Potential Win</p>
            <p className="text-base font-black text-green-400">{potWin.toFixed(2)} TND</p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="relative flex gap-1 overflow-x-auto scrollbar-hide">
            {history.map((h, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-black"
                style={{ background: h.w ? "rgba(0,200,83,0.85)" : "rgba(255,45,85,0.85)", color: "#000" }}>
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

// ━━━━━━━━━━━━━━━━━━ MINES ━━━━━━━━━━━━━━━━━━

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
    if (balance <= 0) { setError("رصيدك 0 — تواصل مع الإدارة"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }
    const res = await minesStart(user.id, s, mineCount, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); return; }
    await refreshBalance();
    setMines(res.mines!); setRevealed(new Set()); setPhase("playing");
  };

  const reveal = async (idx: number) => {
    if (phase !== "playing" || revealed.has(idx)) return;
    const newRevealed = new Set(revealed); newRevealed.add(idx);
    setRevealed(newRevealed);
    if (mines.includes(idx)) { setPhase("ended"); setResultMsg("💥 لغم! خسرت"); }
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
      <TopBar onBack={onBack} title="💣 Mines" balance={user.balance} color="#FFD700" img="/images/originals/mines.jpg" />

      <div className="flex-1 flex flex-col p-4 overflow-y-auto relative"
        style={{ background: `url(/images/originals/mines.jpg) center/cover` }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.78)" }} />

        <div className="relative grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,215,0,0.12)" }}>
            <p className="text-[9px] text-white/60">Multiplier</p>
            <p className="text-base font-black text-yellow-400">{multiplier.toFixed(2)}x</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,200,83,0.12)" }}>
            <p className="text-[9px] text-white/60">Win</p>
            <p className="text-base font-black text-green-400">{currentWin.toFixed(2)}</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,209,255,0.12)" }}>
            <p className="text-[9px] text-white/60">Next</p>
            <p className="text-base font-black text-cyan-400">{nextMultiplier.toFixed(2)}x</p>
          </div>
        </div>

        {resultMsg && (
          <div className="relative p-3 rounded-xl text-sm text-center font-bold mb-3"
            style={{ background: resultMsg.includes("ربحت") ? "rgba(0,200,83,0.2)" : "rgba(255,45,85,0.2)",
                     color: resultMsg.includes("ربحت") ? "#00C853" : "#FF2D55" }}>
            {resultMsg}
          </div>
        )}

        <div className="relative grid grid-cols-5 gap-1.5 max-w-sm mx-auto w-full">
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
                    : "rgba(255,255,255,0.08)",
                  border: `1px solid ${isRevealed || (showAll && isMine) ? "transparent" : "rgba(255,215,0,0.2)"}`,
                  opacity: phase === "ended" && !isRevealed && !isMine ? 0.3 : 1,
                }}>
                {isSafe ? "💎" : (isRevealed && isMine) || (showAll && isMine) ? "💣" : ""}
              </button>
            );
          })}
        </div>

        {phase === "idle" && (
          <div className="relative mt-4 space-y-2">
            <label className="text-[10px] text-white/60">عدد الألغام: <b className="text-white">{mineCount}</b></label>
            <input type="range" min="1" max="24" value={mineCount} onChange={e => setMineCount(parseInt(e.target.value))}
              className="w-full" style={{ accentColor: "#FFD700" }} />
            <div className="flex gap-1">
              {[1, 3, 5, 10, 24].map(n => (
                <button key={n} onClick={() => setMineCount(n)} className="flex-1 py-1 rounded text-[10px] font-bold"
                  style={{ background: mineCount === n ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.08)",
                           color: mineCount === n ? "#FFD700" : "rgba(255,255,255,0.5)" }}>{n}</button>
              ))}
            </div>
            <p className="text-[10px] text-center text-white/60">💣 {mineCount} • 💎 {25 - mineCount}</p>
          </div>
        )}
      </div>

      <div className="p-3 space-y-3" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(255,215,0,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        {phase === "idle" && (<>
          <StakeInput value={stake} onChange={setStake} max={balance} color="#FFD700" />
          <button onClick={start} className="w-full py-3 rounded-xl text-sm font-black text-black"
            style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)" }}>
            💣 Start Game • {parseFloat(stake || "0").toFixed(2)} TND
          </button>
        </>)}
        {phase === "playing" && (
          <button onClick={cashout} disabled={safeRevealed === 0}
            className="w-full py-3 rounded-xl text-sm font-black text-black disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#00C853,#00E676)" }}>
            💰 Cash Out • {currentWin.toFixed(2)} TND
          </button>
        )}
        {phase === "ended" && (
          <button onClick={reset} className="w-full py-3 rounded-xl text-sm font-black text-black"
            style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)" }}>
            🔁 New Game
          </button>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ LIMBO ━━━━━━━━━━━━━━━━━━

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
    if (balance <= 0) { setError("رصيدك 0 — تواصل مع الإدارة"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }
    setRolling(true); setResult(null); setWon(null);
    const res = await limboRoll(user.id, s, t, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); setRolling(false); return; }
    await refreshBalance();
    setTimeout(() => {
      setResult(res.result!); setWon(res.won!); setPayout(res.payout || 0);
      setHistory(h => [{r: res.result!, w: res.won!}, ...h].slice(0, 10));
      setRolling(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="📈 Limbo" balance={user.balance} color="#a855f7" img="/images/originals/limbo.jpg" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative"
        style={{ background: `url(/images/originals/limbo.jpg) center/cover` }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.75)" }} />

        <div className="relative text-center">
          {rolling ? (
            <motion.p animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.4, repeat: Infinity }}
              className="text-7xl font-black text-purple-400/40">?.??x</motion.p>
          ) : result !== null ? (
            <>
              <motion.p initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-7xl font-black"
                style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 50px currentColor" }}>
                {result.toFixed(2)}x
              </motion.p>
              <p className="text-sm mt-2 font-bold" style={{ color: won ? "#00C853" : "#FF2D55" }}>
                {won ? `🎉 ربحت ${payout.toFixed(2)} TND` : "💸 أقل من الهدف"}
              </p>
            </>
          ) : (
            <p className="text-7xl font-black text-white/15">{target}x</p>
          )}
        </div>

        {history.length > 0 && (
          <div className="relative mt-6 flex gap-1 overflow-x-auto scrollbar-hide max-w-full">
            {history.map((h, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-black"
                style={{ background: h.w ? "rgba(0,200,83,0.85)" : "rgba(255,45,85,0.85)", color: "#000" }}>
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
            <label className="text-[10px] text-white/40">Target (x)</label>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)} min="1.01" step="0.1"
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
          style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 4px 20px rgba(168,85,247,0.4)" }}>
          {rolling ? "🎯 Rolling..." : `📈 Bet ${parseFloat(stake || "0").toFixed(2)} TND`}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ PLINKO ━━━━━━━━━━━━━━━━━━

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
    if (balance <= 0) { setError("رصيدك 0 — تواصل مع الإدارة"); return; }
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
      <TopBar onBack={onBack} title="🟢 Plinko" balance={user.balance} color="#22c55e" img="/images/originals/plinko.jpg" />

      <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto relative"
        style={{ background: `url(/images/originals/plinko.jpg) center/cover` }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.78)" }} />

        <div className="relative flex-1 flex flex-col items-center justify-center py-2">
          <div className="space-y-1 mb-3">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex justify-center gap-1.5">
                {Array.from({ length: r + 2 }).map((_, i) => (
                  <div key={i} className="rounded-full"
                    style={{ width: rows === 16 ? 5 : rows === 12 ? 6 : 8, height: rows === 16 ? 5 : rows === 12 ? 6 : 8,
                             background: "rgba(255,255,255,0.5)", boxShadow: "0 0 4px rgba(255,255,255,0.8)" }} />
                ))}
              </div>
            ))}
          </div>

          <div className="flex gap-0.5">
            {mults.map((m, i) => (
              <div key={i}
                className="rounded text-[8px] font-black flex items-center justify-center transition-all"
                style={{
                  width: rows === 16 ? 18 : rows === 12 ? 24 : 32,
                  height: rows === 16 ? 24 : rows === 12 ? 30 : 36,
                  background: lastResult?.bucket === i ? "linear-gradient(135deg,#FFD700,#FFA500)"
                    : m >= 5 ? "rgba(255,45,85,0.4)" : m >= 1 ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)",
                  color: lastResult?.bucket === i ? "#000" : m >= 5 ? "#FFB3C0" : m >= 1 ? "#6EE7B7" : "rgba(255,255,255,0.6)",
                  border: lastResult?.bucket === i ? "2px solid #fff" : "1px solid rgba(255,255,255,0.1)",
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

        <div className="relative grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/60 mb-1 block">Rows</label>
            <div className="flex gap-1">
              {[8, 12, 16].map(r => (
                <button key={r} onClick={() => setRows(r as any)}
                  className="flex-1 py-1.5 rounded text-[10px] font-bold"
                  style={{ background: rows === r ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)",
                           color: rows === r ? "#22c55e" : "rgba(255,255,255,0.5)" }}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-white/60 mb-1 block">Risk</label>
            <div className="flex gap-1">
              {(["low", "med", "high"] as const).map(rk => (
                <button key={rk} onClick={() => setRisk(rk)}
                  className="flex-1 py-1.5 rounded text-[10px] font-bold capitalize"
                  style={{ background: risk === rk ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.08)",
                           color: risk === rk ? "#FFD700" : "rgba(255,255,255,0.5)" }}>{rk}</button>
              ))}
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="relative flex gap-1 overflow-x-auto scrollbar-hide">
            {history.map((m, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-black"
                style={{ background: m >= 1 ? "rgba(0,200,83,0.85)" : "rgba(255,45,85,0.85)", color: "#000" }}>
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
          style={{ background: "linear-gradient(135deg,#22c55e,#10b981)", boxShadow: "0 4px 20px rgba(34,197,94,0.4)" }}>
          {dropping ? "🟢 Dropping..." : `🟢 Drop • ${parseFloat(stake || "0").toFixed(2)} TND`}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ COIN FLIP ━━━━━━━━━━━━━━━━━━

function CoinFlipGame({ onBack }: { onBack: () => void }) {
  const { user, refreshBalance } = useAuth();
  const [stake, setStake] = useState("1");
  const [pick, setPick] = useState<"heads" | "tails">("heads");
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<"heads" | "tails" | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [payout, setPayout] = useState(0);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<{r:"heads"|"tails";w:boolean}[]>([]);
  const [nonce, setNonce] = useState(Math.floor(Math.random() * 1e6));
  const clientSeed = useRef(generateServerSeed().substring(0, 16));

  if (!user) return null;
  const balance = parseFloat(user.balance);

  const flip = async () => {
    setError("");
    const s = parseFloat(stake);
    if (!s || s <= 0) { setError("أدخل المبلغ"); return; }
    if (balance <= 0) { setError("رصيدك 0 — تواصل مع الإدارة"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }
    setFlipping(true); setResult(null); setWon(null);
    const res = await coinFlip(user.id, s, pick, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); setFlipping(false); return; }
    await refreshBalance();
    setTimeout(() => {
      setResult(res.result!); setWon(res.won!); setPayout(res.payout || 0);
      setHistory(h => [{r: res.result!, w: res.won!}, ...h].slice(0, 10));
      setFlipping(false);
    }, 1300);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="🪙 Coin Flip" balance={user.balance} color="#FFD700" img="/images/originals/coinflip.jpg" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 relative"
        style={{ background: `url(/images/originals/coinflip.jpg) center/cover` }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.75)" }} />

        <motion.div animate={flipping ? { rotateY: 1440 } : {}} transition={{ duration: 1.3 }}
          className="relative w-32 h-32 rounded-full flex items-center justify-center text-6xl"
          style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)", boxShadow: "0 0 50px rgba(255,215,0,0.6)" }}>
          {flipping ? "🪙" : result === "heads" ? "👑" : result === "tails" ? "T" : "🪙"}
        </motion.div>

        {result && (
          <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="relative text-2xl font-black"
            style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 20px currentColor" }}>
            {result === "heads" ? "ملك" : "كتابة"} — {won ? `+${payout.toFixed(2)} TND` : "خسرت"}
          </motion.p>
        )}

        <div className="relative flex gap-3">
          <button onClick={() => setPick("heads")} disabled={flipping}
            className="w-32 py-3 rounded-xl text-base font-black"
            style={{ background: pick === "heads" ? "linear-gradient(135deg,#FFD700,#FFA500)" : "rgba(255,255,255,0.08)",
                     color: pick === "heads" ? "#000" : "#fff" }}>
            👑 ملك
          </button>
          <button onClick={() => setPick("tails")} disabled={flipping}
            className="w-32 py-3 rounded-xl text-base font-black"
            style={{ background: pick === "tails" ? "linear-gradient(135deg,#FFD700,#FFA500)" : "rgba(255,255,255,0.08)",
                     color: pick === "tails" ? "#000" : "#fff" }}>
            🔤 كتابة
          </button>
        </div>

        {history.length > 0 && (
          <div className="relative flex gap-1 overflow-x-auto scrollbar-hide">
            {history.map((h, i) => (
              <div key={i} className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: h.w ? "rgba(0,200,83,0.85)" : "rgba(255,45,85,0.85)", color: "#000" }}>
                {h.r === "heads" ? "H" : "T"}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(255,215,0,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <StakeInput value={stake} onChange={setStake} max={balance} color="#FFD700" />
        <button onClick={flip} disabled={flipping}
          className="w-full py-3 rounded-xl text-sm font-black text-black disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)" }}>
          {flipping ? "🪙 Flipping..." : `🪙 Flip • ${parseFloat(stake || "0").toFixed(2)} TND → 1.98x`}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ HI-LO ━━━━━━━━━━━━━━━━━━

function HiloGame({ onBack }: { onBack: () => void }) {
  const { user, refreshBalance } = useAuth();
  const [stake, setStake] = useState("1");
  const [currentCard, setCurrentCard] = useState<{v:number;n:string;s:string} | null>(null);
  const [lastCard, setLastCard] = useState<{v:number;n:string;s:string} | null>(null);
  const [phase, setPhase] = useState<"idle" | "ready" | "guessing" | "ended">("idle");
  const [error, setError] = useState("");
  const [resultMsg, setResultMsg] = useState("");
  const [nonce, setNonce] = useState(Math.floor(Math.random() * 1e6));
  const clientSeed = useRef(generateServerSeed().substring(0, 16));

  if (!user) return null;
  const balance = parseFloat(user.balance);

  const start = async () => {
    setError(""); setResultMsg("");
    const s = parseFloat(stake);
    if (!s || s <= 0) { setError("أدخل المبلغ"); return; }
    if (balance <= 0) { setError("رصيدك 0 — تواصل مع الإدارة"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }
    // Draw initial card (no debit yet, just preview)
    const card = await drawCard(generateServerSeed(), clientSeed.current, nonce);
    setNonce(n => n + 1);
    setCurrentCard(card);
    setLastCard(null);
    setPhase("ready");
  };

  const guess = async (g: "higher" | "lower" | "equal") => {
    if (!currentCard) return;
    const s = parseFloat(stake);
    setPhase("guessing");
    const res = await hiloPlay(user.id, s, currentCard.v, g, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); setPhase("ready"); return; }
    await refreshBalance();
    setTimeout(() => {
      setLastCard(currentCard);
      setCurrentCard(res.newCard!);
      setResultMsg(res.won ? `🎉 ربحت ${res.payout!.toFixed(2)} TND (${res.multiplier!.toFixed(2)}x)` : "💸 خسرت");
      setPhase("ended");
    }, 600);
  };

  const reset = () => { setPhase("idle"); setCurrentCard(null); setLastCard(null); setResultMsg(""); };

  const Card = ({ card, faded }: { card: {v:number;n:string;s:string}; faded?: boolean }) => {
    const isRed = card.s === "♥" || card.s === "♦";
    return (
      <div className="w-28 h-40 rounded-2xl flex flex-col items-center justify-between p-3"
        style={{ background: "linear-gradient(135deg,#fff,#f0f0f0)",
                 boxShadow: faded ? "0 0 15px rgba(255,255,255,0.2)" : "0 0 30px rgba(255,255,255,0.5)",
                 opacity: faded ? 0.5 : 1 }}>
        <div className="self-start text-left">
          <p className="text-3xl font-black" style={{ color: isRed ? "#FF2D55" : "#000" }}>{card.n}</p>
          <p className="text-2xl" style={{ color: isRed ? "#FF2D55" : "#000" }}>{card.s}</p>
        </div>
        <p className="text-6xl" style={{ color: isRed ? "#FF2D55" : "#000" }}>{card.s}</p>
        <div className="self-end text-right transform rotate-180">
          <p className="text-3xl font-black" style={{ color: isRed ? "#FF2D55" : "#000" }}>{card.n}</p>
          <p className="text-2xl" style={{ color: isRed ? "#FF2D55" : "#000" }}>{card.s}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="🃏 Hi-Lo" balance={user.balance} color="#ec4899" img="/images/originals/hilo.jpg" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 relative"
        style={{ background: `url(/images/originals/hilo.jpg) center/cover` }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.78)" }} />

        <div className="relative flex gap-4 items-end">
          {lastCard && <Card card={lastCard} faded />}
          {currentCard ? <Card card={currentCard} /> : (
            <div className="w-28 h-40 rounded-2xl flex items-center justify-center text-6xl"
              style={{ background: "linear-gradient(135deg,#FF2D55,#ec4899)" }}>?</div>
          )}
        </div>

        {resultMsg && (
          <p className="relative text-base font-bold"
            style={{ color: resultMsg.includes("ربحت") ? "#00C853" : "#FF2D55", textShadow: "0 0 15px currentColor" }}>
            {resultMsg}
          </p>
        )}

        {currentCard && phase === "ready" && (
          <div className="relative grid grid-cols-3 gap-2 w-full max-w-sm">
            <button onClick={() => guess("higher")} className="py-3 rounded-xl text-xs font-black"
              style={{ background: "linear-gradient(135deg,#00C853,#00E676)", color: "#000" }}>
              ▲ أعلى<br/><span className="text-[9px] opacity-70">{((13-currentCard.v)/13*100).toFixed(1)}%</span>
            </button>
            <button onClick={() => guess("equal")} className="py-3 rounded-xl text-xs font-black"
              style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)", color: "#000" }}>
              = مساوي<br/><span className="text-[9px] opacity-70">7.7%</span>
            </button>
            <button onClick={() => guess("lower")} className="py-3 rounded-xl text-xs font-black"
              style={{ background: "linear-gradient(135deg,#FF2D55,#ec4899)", color: "#fff" }}>
              ▼ أقل<br/><span className="text-[9px] opacity-70">{((currentCard.v-1)/13*100).toFixed(1)}%</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-3 space-y-3" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(236,72,153,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        {phase === "idle" || phase === "ended" ? (
          <>
            <StakeInput value={stake} onChange={setStake} max={balance} color="#ec4899" />
            <button onClick={phase === "ended" ? reset : start}
              className="w-full py-3 rounded-xl text-sm font-black text-white"
              style={{ background: "linear-gradient(135deg,#ec4899,#FF2D55)" }}>
              🃏 {phase === "ended" ? "New Round" : "اسحب البطاقة"} • {parseFloat(stake || "0").toFixed(2)} TND
            </button>
          </>
        ) : (
          <p className="text-center text-[11px] text-white/40">اختر أعلى أم أقل من البطاقة الحالية</p>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ WHEEL ━━━━━━━━━━━━━━━━━━

function WheelGame({ onBack }: { onBack: () => void }) {
  const { user, refreshBalance } = useAuth();
  const [stake, setStake] = useState("1");
  const [risk, setRisk] = useState<"low" | "med" | "high">("med");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ segment: number; multiplier: number; payout: number; won: boolean } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<number[]>([]);
  const [nonce, setNonce] = useState(Math.floor(Math.random() * 1e6));
  const clientSeed = useRef(generateServerSeed().substring(0, 16));

  if (!user) return null;
  const balance = parseFloat(user.balance);
  const segments = WHEEL_SEGMENTS[risk];

  const spin = async () => {
    setError("");
    const s = parseFloat(stake);
    if (!s || s <= 0) { setError("أدخل المبلغ"); return; }
    if (balance <= 0) { setError("رصيدك 0 — تواصل مع الإدارة"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }
    setSpinning(true); setResult(null);
    const res = await wheelSpin(user.id, s, risk, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); setSpinning(false); return; }
    await refreshBalance();
    const segDeg = 360 / segments.length;
    const targetDeg = res.segment! * segDeg + segDeg / 2;
    setRotation(r => r + 360 * 5 + (360 - targetDeg));
    setTimeout(() => {
      setResult({ segment: res.segment!, multiplier: res.multiplier!, payout: res.payout!, won: res.won! });
      setHistory(h => [res.multiplier!, ...h].slice(0, 10));
      setSpinning(false);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="🎡 Wheel" balance={user.balance} color="#FF6B35" img="/images/originals/wheel.jpg" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 relative overflow-hidden"
        style={{ background: `url(/images/originals/wheel.jpg) center/cover` }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.78)" }} />

        {/* Wheel */}
        <div className="relative w-64 h-64">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-3xl">▼</div>
          <motion.div className="w-full h-full rounded-full"
            style={{
              background: `conic-gradient(${segments.map((m, i) => {
                const start = (i / segments.length) * 360;
                const end = ((i + 1) / segments.length) * 360;
                const color = m === 0 ? "#222" : m >= 10 ? "#FF2D55" : m >= 2 ? "#FFD700" : "#22c55e";
                return `${color} ${start}deg ${end}deg`;
              }).join(",")})`,
              boxShadow: "0 0 60px rgba(255,107,53,0.6)",
            }}
            animate={{ rotate: rotation }}
            transition={{ duration: 3, ease: "easeOut" }} />
          {/* Center label */}
          <div className="absolute inset-1/4 rounded-full flex items-center justify-center text-2xl font-black text-white"
            style={{ background: "rgba(0,0,0,0.9)" }}>
            {result ? `${result.multiplier}x` : "?"}
          </div>
        </div>

        {result && (
          <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="relative text-xl font-black"
            style={{ color: result.won ? "#00C853" : "#FF2D55", textShadow: "0 0 15px currentColor" }}>
            {result.won ? `🎉 +${result.payout.toFixed(2)} TND` : "💸 خسرت"}
          </motion.p>
        )}

        {history.length > 0 && (
          <div className="relative flex gap-1 overflow-x-auto scrollbar-hide max-w-full">
            {history.map((m, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-black"
                style={{ background: m >= 1 ? "rgba(0,200,83,0.85)" : "rgba(255,45,85,0.85)", color: "#000" }}>{m}x</div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(255,107,53,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <div>
          <label className="text-[10px] text-white/40 mb-1 block">Risk</label>
          <div className="flex gap-1">
            {(["low", "med", "high"] as const).map(rk => (
              <button key={rk} onClick={() => setRisk(rk)} disabled={spinning}
                className="flex-1 py-1.5 rounded text-[10px] font-bold capitalize"
                style={{ background: risk === rk ? "rgba(255,107,53,0.3)" : "rgba(255,255,255,0.08)",
                         color: risk === rk ? "#FF6B35" : "rgba(255,255,255,0.5)" }}>{rk}</button>
            ))}
          </div>
        </div>
        <StakeInput value={stake} onChange={setStake} max={balance} color="#FF6B35" />
        <button onClick={spin} disabled={spinning}
          className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#FF6B35,#FF2D55)", boxShadow: "0 4px 20px rgba(255,107,53,0.4)" }}>
          {spinning ? "🎡 Spinning..." : `🎡 Spin • ${parseFloat(stake || "0").toFixed(2)} TND`}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ KENO ━━━━━━━━━━━━━━━━━━

function KenoGame({ onBack }: { onBack: () => void }) {
  const { user, refreshBalance } = useAuth();
  const [stake, setStake] = useState("1");
  const [picks, setPicks] = useState<Set<number>>(new Set());
  const [risk, setRisk] = useState<"low" | "med" | "high">("med");
  const [draws, setDraws] = useState<number[]>([]);
  const [hits, setHits] = useState(0);
  const [payout, setPayout] = useState(0);
  const [won, setWon] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(Math.floor(Math.random() * 1e6));
  const clientSeed = useRef(generateServerSeed().substring(0, 16));

  if (!user) return null;
  const balance = parseFloat(user.balance);

  const togglePick = (n: number) => {
    if (playing) return;
    const ns = new Set(picks);
    if (ns.has(n)) ns.delete(n);
    else if (ns.size < 10) ns.add(n);
    setPicks(ns);
    setDraws([]); setWon(null);
  };

  const play = async () => {
    setError("");
    if (picks.size < 1) { setError("اختر 1-10 أرقام"); return; }
    const s = parseFloat(stake);
    if (!s || s <= 0) { setError("أدخل المبلغ"); return; }
    if (balance <= 0) { setError("رصيدك 0 — تواصل مع الإدارة"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }
    setPlaying(true); setDraws([]); setWon(null);
    const res = await kenoPlay(user.id, s, Array.from(picks), risk, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); setPlaying(false); return; }
    await refreshBalance();
    // Reveal draws one by one
    for (let i = 0; i < res.draws!.length; i++) {
      await new Promise(r => setTimeout(r, 100));
      setDraws(res.draws!.slice(0, i + 1));
    }
    setHits(res.hits!); setWon(res.won!); setPayout(res.payout || 0);
    setPlaying(false);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="🎰 Keno" balance={user.balance} color="#06b6d4" img="/images/originals/keno.jpg" />

      <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto relative"
        style={{ background: `url(/images/originals/keno.jpg) center/cover` }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.85)" }} />

        <div className="relative grid grid-cols-3 gap-2">
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(6,182,212,0.15)" }}>
            <p className="text-[9px] text-white/60">Picks</p>
            <p className="text-base font-black text-cyan-400">{picks.size}/10</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,215,0,0.15)" }}>
            <p className="text-[9px] text-white/60">Hits</p>
            <p className="text-base font-black text-yellow-400">{hits}</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,200,83,0.15)" }}>
            <p className="text-[9px] text-white/60">Win</p>
            <p className="text-base font-black text-green-400">{payout.toFixed(2)}</p>
          </div>
        </div>

        {won !== null && (
          <p className="relative text-center text-sm font-bold"
            style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 15px currentColor" }}>
            {won ? `🎉 ربحت ${payout.toFixed(2)} TND` : `💸 ${hits} hits — حاول مرة أخرى`}
          </p>
        )}

        <div className="relative grid grid-cols-8 gap-1">
          {Array.from({ length: 40 }, (_, i) => i + 1).map(n => {
            const isPicked = picks.has(n);
            const isDrawn = draws.includes(n);
            const isHit = isPicked && isDrawn;
            return (
              <button key={n} onClick={() => togglePick(n)} disabled={playing}
                className="aspect-square rounded text-[10px] font-black flex items-center justify-center transition-all"
                style={{
                  background: isHit ? "linear-gradient(135deg,#FFD700,#FFA500)"
                    : isDrawn ? "rgba(255,255,255,0.25)"
                    : isPicked ? "linear-gradient(135deg,#06b6d4,#0891b2)"
                    : "rgba(255,255,255,0.08)",
                  color: isHit ? "#000" : isPicked ? "#fff" : "rgba(255,255,255,0.6)",
                  transform: isHit ? "scale(1.1)" : "scale(1)",
                  boxShadow: isHit ? "0 0 12px rgba(255,215,0,0.7)" : "none",
                }}>{n}</button>
            );
          })}
        </div>

        <div className="relative">
          <label className="text-[10px] text-white/60 mb-1 block">Risk</label>
          <div className="flex gap-1">
            {(["low", "med", "high"] as const).map(rk => (
              <button key={rk} onClick={() => setRisk(rk)} disabled={playing}
                className="flex-1 py-1.5 rounded text-[10px] font-bold capitalize"
                style={{ background: risk === rk ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.08)",
                         color: risk === rk ? "#06b6d4" : "rgba(255,255,255,0.5)" }}>{rk}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(6,182,212,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <StakeInput value={stake} onChange={setStake} max={balance} color="#06b6d4" />
        <button onClick={play} disabled={playing || picks.size === 0}
          className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)", boxShadow: "0 4px 20px rgba(6,182,212,0.4)" }}>
          {playing ? "🎰 Drawing..." : `🎰 Play • ${parseFloat(stake || "0").toFixed(2)} TND`}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ TOWER ━━━━━━━━━━━━━━━━━━

function TowerGame({ onBack }: { onBack: () => void }) {
  const { user, refreshBalance } = useAuth();
  const [stake, setStake] = useState("1");
  const [mode, setMode] = useState<keyof typeof TOWER_CONFIG>("medium");
  const [mineLayout, setMineLayout] = useState<number[]>([]);
  const [level, setLevel] = useState(0);
  const [revealed, setRevealed] = useState<Record<number, number>>({});
  const [phase, setPhase] = useState<"idle" | "playing" | "ended">("idle");
  const [resultMsg, setResultMsg] = useState("");
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(Math.floor(Math.random() * 1e6));
  const clientSeed = useRef(generateServerSeed().substring(0, 16));

  if (!user) return null;
  const balance = parseFloat(user.balance);
  const cfg = TOWER_CONFIG[mode];
  const currentMultiplier = towerMultiplier(mode, level);
  const currentWin = +(parseFloat(stake || "0") * currentMultiplier).toFixed(2);
  const nextMultiplier = towerMultiplier(mode, level + 1);

  const start = async () => {
    setError(""); setResultMsg("");
    const s = parseFloat(stake);
    if (!s || s <= 0) { setError("أدخل المبلغ"); return; }
    if (balance <= 0) { setError("رصيدك 0 — تواصل مع الإدارة"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }
    const res = await towerStart(user.id, s, mode, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) { setError(res.error || "خطأ"); return; }
    await refreshBalance();
    setMineLayout(res.mineLayout!); setLevel(0); setRevealed({}); setPhase("playing");
  };

  const pick = (col: number) => {
    if (phase !== "playing") return;
    const minePos = mineLayout[level];
    setRevealed(r => ({ ...r, [level]: col }));
    if (col === minePos) {
      setPhase("ended"); setResultMsg("💥 لغم! خسرت الرهان");
    } else {
      if (level + 1 >= 9) {
        // Reached top
        cashout();
      } else {
        setLevel(l => l + 1);
      }
    }
  };

  const cashout = async () => {
    if (phase !== "playing" || level === 0) return;
    const res = await towerCashout(user.id, parseFloat(stake), mode, level);
    if (res.ok) {
      await refreshBalance();
      setPhase("ended");
      setResultMsg(`🎉 ربحت ${res.payout!.toFixed(2)} TND (${currentMultiplier.toFixed(2)}x)`);
    }
  };

  const reset = () => { setPhase("idle"); setLevel(0); setRevealed({}); setMineLayout([]); setResultMsg(""); };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <TopBar onBack={onBack} title="🏯 Tower" balance={user.balance} color="#10b981" img="/images/originals/tower.jpg" />

      <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto relative"
        style={{ background: `url(/images/originals/tower.jpg) center/cover` }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.82)" }} />

        <div className="relative grid grid-cols-3 gap-2">
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(16,185,129,0.15)" }}>
            <p className="text-[9px] text-white/60">Level</p>
            <p className="text-base font-black text-emerald-400">{level}/9</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,215,0,0.15)" }}>
            <p className="text-[9px] text-white/60">Current</p>
            <p className="text-base font-black text-yellow-400">{currentMultiplier.toFixed(2)}x</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,200,83,0.15)" }}>
            <p className="text-[9px] text-white/60">Win</p>
            <p className="text-base font-black text-green-400">{currentWin.toFixed(2)}</p>
          </div>
        </div>

        {resultMsg && (
          <p className="relative text-center text-sm font-bold"
            style={{ color: resultMsg.includes("ربحت") ? "#00C853" : "#FF2D55", textShadow: "0 0 15px currentColor" }}>
            {resultMsg}
          </p>
        )}

        {/* Tower - 9 levels, render top to bottom but level 0 at bottom */}
        <div className="relative space-y-1 flex-1 flex flex-col-reverse justify-end">
          {Array.from({ length: 9 }).map((_, lvl) => {
            const isCurrent = phase === "playing" && lvl === level;
            const isPassed = phase !== "idle" && lvl < level;
            const isFuture = lvl > level && phase === "playing";
            const showAll = phase === "ended";
            const pickedCol = revealed[lvl];
            const mineCol = mineLayout[lvl];
            return (
              <div key={lvl} className="flex justify-center gap-1.5">
                {Array.from({ length: cfg.tilesPerRow }).map((_, col) => {
                  const isMine = col === mineCol;
                  const isPicked = pickedCol === col;
                  const reveal = isPicked || showAll;
                  return (
                    <button key={col} onClick={() => isCurrent && pick(col)} disabled={!isCurrent}
                      className="rounded-lg flex items-center justify-center text-base font-black transition-all"
                      style={{
                        width: 56, height: 32,
                        background: reveal && isMine ? "linear-gradient(135deg,#FF2D55,#FF6B35)"
                          : reveal && !isMine ? "linear-gradient(135deg,#00C853,#00E676)"
                          : isFuture ? "rgba(255,255,255,0.05)"
                          : isCurrent ? "linear-gradient(135deg,#10b981,#22c55e)"
                          : isPassed ? "rgba(0,200,83,0.2)"
                          : "rgba(255,255,255,0.08)",
                        opacity: isFuture ? 0.3 : 1,
                        boxShadow: isCurrent ? "0 0 15px rgba(16,185,129,0.6)" : "none",
                      }}>
                      {reveal ? (isMine ? "💀" : "✓") : isCurrent ? "?" : ""}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {phase === "idle" && (
          <div className="relative">
            <label className="text-[10px] text-white/60 mb-1 block">صعوبة</label>
            <div className="flex gap-1">
              {(Object.keys(TOWER_CONFIG) as (keyof typeof TOWER_CONFIG)[]).map(m => (
                <button key={m} onClick={() => setMode(m)} className="flex-1 py-1.5 rounded text-[9px] font-bold capitalize"
                  style={{ background: mode === m ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)",
                           color: mode === m ? "#10b981" : "rgba(255,255,255,0.5)" }}>{m}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 space-y-3" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(16,185,129,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        {phase === "idle" && (<>
          <StakeInput value={stake} onChange={setStake} max={balance} color="#10b981" />
          <button onClick={start} className="w-full py-3 rounded-xl text-sm font-black text-white"
            style={{ background: "linear-gradient(135deg,#10b981,#22c55e)" }}>
            🏯 Start • {parseFloat(stake || "0").toFixed(2)} TND
          </button>
        </>)}
        {phase === "playing" && level > 0 && (
          <button onClick={cashout} className="w-full py-3 rounded-xl text-sm font-black text-black"
            style={{ background: "linear-gradient(135deg,#00C853,#00E676)" }}>
            💰 Cash Out • {currentWin.toFixed(2)} TND (Next: {nextMultiplier.toFixed(2)}x)
          </button>
        )}
        {phase === "playing" && level === 0 && (
          <p className="text-center text-[11px] text-white/40">اختر بلاطة آمنة في المستوى 1</p>
        )}
        {phase === "ended" && (
          <button onClick={reset} className="w-full py-3 rounded-xl text-sm font-black text-white"
            style={{ background: "linear-gradient(135deg,#10b981,#22c55e)" }}>
            🔁 New Tower
          </button>
        )}
      </div>
    </div>
  );
}
