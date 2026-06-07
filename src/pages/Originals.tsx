import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { ArrowLeft, Wallet, Plus, Minus, Sparkles, Trophy } from "lucide-react";
import {
  crashRound, diceRoll, minesStart, minesMultiplier, minesCashout,
  limboRoll, plinkoRound, PLINKO_MULTIPLIERS, generateServerSeed,
  coinFlip, hiloPlay, drawCard, wheelSpin, WHEEL_SEGMENTS,
  kenoPlay, towerStart, towerCashout, towerMultiplier, TOWER_CONFIG,
  slotSpin, SLOT_CONFIGS, PAYLINES,
} from "@/lib/originals";

interface GameMeta {
  id: string;
  name: string;
  arName: string;
  desc: string;
  img: string;
  accent: string;
}

const GAMES: GameMeta[] = [
  { id: "crash",         name: "Crash",            arName: "كراش",      desc: "Cash out before it explodes",  img: "/images/originals/crash.jpg",         accent: "#FF2D55" },
  { id: "mines",         name: "Mines",            arName: "ألغام",     desc: "Reveal gems, avoid mines",      img: "/images/originals/mines.jpg",         accent: "#FFD700" },
  { id: "dice",          name: "Dice",             arName: "النرد",     desc: "Over or under target",          img: "/images/originals/dice.jpg",          accent: "#00D1FF" },
  { id: "plinko",        name: "Plinko",           arName: "بلينكو",    desc: "Drop the ball, win big",        img: "/images/originals/plinko.jpg",        accent: "#22c55e" },
  { id: "limbo",         name: "Limbo",            arName: "ليمبو",     desc: "Beat the multiplier",           img: "/images/originals/limbo.jpg",         accent: "#a855f7" },
  { id: "wheel",         name: "Wheel",            arName: "العجلة",    desc: "Spin the wheel of fortune",     img: "/images/originals/wheel.jpg",         accent: "#FF6B35" },
  { id: "hilo",          name: "Hi-Lo",            arName: "أعلى أقل",  desc: "Higher or lower card",          img: "/images/originals/hilo.jpg",          accent: "#ec4899" },
  { id: "coinflip",      name: "Coin Flip",        arName: "ملك كتابة", desc: "Heads or tails",                img: "/images/originals/coinflip.jpg",      accent: "#FFD700" },
  { id: "keno",          name: "Keno",             arName: "كينو",      desc: "Pick numbers, match draws",     img: "/images/originals/keno.jpg",          accent: "#06b6d4" },
  { id: "tower",         name: "Tower",            arName: "البرج",     desc: "Climb 9 levels of fortune",     img: "/images/originals/tower.jpg",         accent: "#10b981" },
  // Native Slots (Amatic-style) — real TND wallet
  { id: "bookoffortune", name: "Book of Fortune",  arName: "سفر الحظ",  desc: "5-reel mystical slot",          img: "/images/originals/bookoffortune.jpg", accent: "#FFD700" },
  { id: "hotfruits",     name: "Hot Fruits",       arName: "فواكه حارة", desc: "Classic fruit slot 5×3",        img: "/images/originals/hotfruits.jpg",     accent: "#FF6B35" },
  { id: "luckyjoker",    name: "Lucky Joker",      arName: "جوكر الحظ", desc: "Wild joker classic",            img: "/images/originals/luckyjoker.jpg",    accent: "#a855f7" },
];

export default function Originals() {
  const { user, refreshBalance } = useAuth();
  const [active, setActive] = useState<string | null>(null);
  const [auth, setAuth] = useState(false);

  if (!user) {
    return (
      <div className="p-6 text-center space-y-3">
        <Trophy className="w-12 h-12 mx-auto text-white/20" />
        <p className="text-white/50">سجل دخول للعب Mebet Originals</p>
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
  if (active === "bookoffortune") return <SlotGame onBack={close} slotId="bookoffortune" />;
  if (active === "hotfruits") return <SlotGame onBack={close} slotId="hotfruits" />;
  if (active === "luckyjoker") return <SlotGame onBack={close} slotId="luckyjoker" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="p-4 pb-24 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#a855f7,#FF2D55)" }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider">ORIGINALS</h1>
              <p className="text-[10px] text-white/40 font-mono uppercase">{GAMES.length} games · TND wallet</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.3)" }}>
            <Wallet className="w-3 h-3 text-green-400" />
            <span className="text-[11px] font-bold text-green-400">{user.balance} TND</span>
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((g, i) => (
            <motion.div key={g.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActive(g.id)}
              className="relative rounded-2xl overflow-hidden cursor-pointer group"
              style={{ aspectRatio: "1/1", border: `1px solid ${g.accent}33` }}>

              <img src={g.img} alt={g.name} loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />

              <div className="absolute inset-0"
                style={{ background: `linear-gradient(to top, rgba(2,4,8,0.96) 0%, rgba(2,4,8,0.45) 45%, rgba(2,4,8,0.05) 80%)` }} />

              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ boxShadow: `inset 0 0 35px ${g.accent}55` }} />

              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-base font-black text-white leading-tight tracking-wide"
                  style={{ textShadow: `0 0 12px ${g.accent}90, 0 2px 4px rgba(0,0,0,0.95)` }}>
                  {g.name}
                </h3>
                <p className="text-[10px] text-white/70 leading-tight mt-0.5">{g.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━ COMMON UI ━━━━━━━━━━━━━━━━━━

function TopBar({ onBack, title, balance, color = "#00D1FF" }: { onBack: () => void; title: string; balance: string; color?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 flex-shrink-0"
      style={{ background: "rgba(8,10,16,0.98)", borderBottom: `1px solid ${color}33` }}>
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <ArrowLeft className="w-4 h-4 text-white/80" />
        </button>
        <span className="text-sm font-black text-white tracking-wide uppercase">{title}</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
        style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.3)" }}>
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
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-[10px] text-white/40 uppercase tracking-wider">المبلغ</label>
        <span className="text-[10px] text-white/30">Max: {max.toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-1.5">
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
            className="flex-1 py-1 rounded text-[9px] font-bold text-white/55"
            style={{ background: "rgba(255,255,255,0.04)" }}>{p}%</button>
        ))}
      </div>
    </div>
  );
}

// Decorative subtle header banner (image at top of game, not full background)
function GameBanner({ img, color, height = 90 }: { img: string; color: string; height?: number }) {
  return (
    <div className="relative w-full overflow-hidden flex-shrink-0" style={{ height }}>
      <img src={img} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(to bottom, rgba(8,10,16,0.45) 0%, rgba(8,10,16,0.92) 100%)` }} />
      <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}99, transparent)` }} />
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
    <div className="fixed inset-0 z-[200] bg-[#080a10] flex flex-col">
      <TopBar onBack={onBack} title="CRASH" balance={user.balance} color="#FF2D55" />
      <GameBanner img="/images/originals/crash.jpg" color="#FF2D55" />

      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,45,85,0.10), #080a10 70%)" }}>
        {history.length > 0 && (
          <div className="absolute top-3 left-3 right-3 flex gap-1 overflow-x-auto scrollbar-hide">
            {history.map((h, i) => (
              <div key={i} className="flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] font-black"
                style={{ background: h >= 2 ? "rgba(0,200,83,0.85)" : "rgba(255,45,85,0.85)", color: "#000" }}>
                {h.toFixed(2)}x
              </div>
            ))}
          </div>
        )}

        <div className="text-center">
          {phase === "idle" && <p className="text-7xl font-black text-white/15">1.00x</p>}
          {phase === "flying" && (
            <motion.p animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 0.3, repeat: Infinity }}
              className="text-8xl font-black"
              style={{ color: multiplier >= parseFloat(target) ? "#00C853" : "#FFD700",
                       textShadow: "0 0 60px currentColor" }}>
              {multiplier.toFixed(2)}x
            </motion.p>
          )}
          {phase === "crashed" && (
            <>
              <motion.p initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-8xl font-black"
                style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 60px currentColor" }}>
                {crashAt!.toFixed(2)}x
              </motion.p>
              <p className="text-sm mt-3 font-bold tracking-wide" style={{ color: won ? "#00C853" : "#FF2D55" }}>
                {won ? `WIN +${payout.toFixed(2)} TND` : "BUST"}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3 flex-shrink-0" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(255,45,85,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <StakeInput value={stake} onChange={setStake} max={balance} color="#FF2D55" />
          <div className="space-y-1.5">
            <label className="text-[10px] text-white/40 uppercase tracking-wider">Auto Cashout</label>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)} min="1.01" step="0.1"
              className="w-full px-2 py-2 rounded-lg text-center text-base font-black text-white"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,45,85,0.3)" }} />
            <div className="flex gap-1">
              {["1.5", "2", "3", "5", "10"].map(t => (
                <button key={t} onClick={() => setTarget(t)} className="flex-1 py-1 rounded text-[9px] font-bold text-white/55"
                  style={{ background: "rgba(255,255,255,0.04)" }}>{t}x</button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={play} disabled={phase === "flying"}
          className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50 tracking-wide"
          style={{ background: "linear-gradient(135deg,#FF2D55,#FF6B35)", boxShadow: "0 4px 20px rgba(255,45,85,0.4)" }}>
          {phase === "flying" ? "FLYING..." : `PLACE BET · ${parseFloat(stake || "0").toFixed(2)} TND`}
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
  const multiplier = winChance > 0 ? +(65 / winChance).toFixed(4) : 0;
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
    <div className="fixed inset-0 z-[200] bg-[#080a10] flex flex-col">
      <TopBar onBack={onBack} title="DICE" balance={user.balance} color="#00D1FF" />
      <GameBanner img="/images/originals/dice.jpg" color="#00D1FF" />

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto"
        style={{ background: "radial-gradient(ellipse at top, rgba(0,209,255,0.06), #080a10 70%)" }}>

        <div className="text-center py-6">
          {rolling ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 mx-auto rounded-2xl border-4 border-cyan-400/40 border-t-cyan-400" />
          ) : roll !== null ? (
            <>
              <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-7xl font-black"
                style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 50px currentColor" }}>
                {roll.toFixed(2)}
              </motion.p>
              <p className="text-sm mt-2 font-bold tracking-wide" style={{ color: won ? "#00C853" : "#FF2D55" }}>
                {won ? `WIN +${payout.toFixed(2)} TND` : "LOSS"}
              </p>
            </>
          ) : (
            <p className="text-7xl font-black text-white/15">--.--</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[11px] text-white/60">
            <span>Target: <b className="text-white">{target}</b></span>
            <span>Win chance: <b style={{ color: "#00D1FF" }}>{winChance.toFixed(2)}%</b></span>
          </div>
          <input type="range" min="2" max="98" value={target} onChange={e => setTarget(parseInt(e.target.value))}
            className="w-full" style={{ accentColor: "#00D1FF" }} />
          <div className="flex gap-2">
            <button onClick={() => setIsOver(false)} className="flex-1 py-2 rounded-lg text-xs font-black tracking-wide"
              style={{ background: !isOver ? "linear-gradient(135deg,#00D1FF,#0066FF)" : "rgba(255,255,255,0.05)",
                       color: !isOver ? "#000" : "rgba(255,255,255,0.5)" }}>
              UNDER {target}
            </button>
            <button onClick={() => setIsOver(true)} className="flex-1 py-2 rounded-lg text-xs font-black tracking-wide"
              style={{ background: isOver ? "linear-gradient(135deg,#00D1FF,#0066FF)" : "rgba(255,255,255,0.05)",
                       color: isOver ? "#000" : "rgba(255,255,255,0.5)" }}>
              OVER {target}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,215,0,0.08)" }}>
            <p className="text-[9px] text-white/50 uppercase">Multiplier</p>
            <p className="text-base font-black text-yellow-400">{multiplier.toFixed(2)}x</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,200,83,0.08)" }}>
            <p className="text-[9px] text-white/50 uppercase">Potential Win</p>
            <p className="text-base font-black text-green-400">{potWin.toFixed(2)} TND</p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {history.map((h, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-black"
                style={{ background: h.w ? "rgba(0,200,83,0.85)" : "rgba(255,45,85,0.85)", color: "#000" }}>
                {h.r.toFixed(0)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3 flex-shrink-0" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(0,209,255,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <StakeInput value={stake} onChange={setStake} max={balance} color="#00D1FF" />
        <button onClick={play} disabled={rolling}
          className="w-full py-3 rounded-xl text-sm font-black text-black disabled:opacity-50 tracking-wide"
          style={{ background: "linear-gradient(135deg,#00D1FF,#0066FF)", boxShadow: "0 4px 20px rgba(0,209,255,0.4)" }}>
          {rolling ? "ROLLING..." : `ROLL · ${parseFloat(stake || "0").toFixed(2)} TND`}
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

  const reveal = (idx: number) => {
    if (phase !== "playing" || revealed.has(idx)) return;
    const newRevealed = new Set(revealed); newRevealed.add(idx);
    setRevealed(newRevealed);
    if (mines.includes(idx)) { setPhase("ended"); setResultMsg("BOOM — Mine hit"); }
  };

  const cashout = async () => {
    if (phase !== "playing" || safeRevealed === 0) return;
    const res = await minesCashout(user.id, parseFloat(stake), mineCount, safeRevealed);
    if (res.ok) {
      await refreshBalance();
      setPhase("ended");
      setResultMsg(`WIN +${res.payout!.toFixed(2)} TND (${multiplier.toFixed(2)}x)`);
    }
  };

  const reset = () => { setPhase("idle"); setRevealed(new Set()); setMines([]); setResultMsg(""); };

  return (
    <div className="fixed inset-0 z-[200] bg-[#080a10] flex flex-col">
      <TopBar onBack={onBack} title="MINES" balance={user.balance} color="#FFD700" />
      <GameBanner img="/images/originals/mines.jpg" color="#FFD700" />

      <div className="flex-1 flex flex-col p-4 overflow-y-auto"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,215,0,0.05), #080a10 70%)" }}>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,215,0,0.08)" }}>
            <p className="text-[9px] text-white/50 uppercase">Multiplier</p>
            <p className="text-base font-black text-yellow-400">{multiplier.toFixed(2)}x</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,200,83,0.08)" }}>
            <p className="text-[9px] text-white/50 uppercase">Current Win</p>
            <p className="text-base font-black text-green-400">{currentWin.toFixed(2)}</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,209,255,0.08)" }}>
            <p className="text-[9px] text-white/50 uppercase">Next</p>
            <p className="text-base font-black text-cyan-400">{nextMultiplier.toFixed(2)}x</p>
          </div>
        </div>

        {resultMsg && (
          <div className="p-3 rounded-xl text-sm text-center font-bold mb-3 tracking-wide"
            style={{ background: resultMsg.includes("WIN") ? "rgba(0,200,83,0.15)" : "rgba(255,45,85,0.15)",
                     color: resultMsg.includes("WIN") ? "#00C853" : "#FF2D55" }}>
            {resultMsg}
          </div>
        )}

        <div className="grid grid-cols-5 gap-1.5 max-w-sm mx-auto w-full">
          {Array.from({ length: 25 }).map((_, idx) => {
            const isRevealed = revealed.has(idx);
            const isMine = mines.includes(idx);
            const isSafe = isRevealed && !isMine;
            const showAll = phase === "ended";
            return (
              <button key={idx} onClick={() => reveal(idx)} disabled={phase !== "playing" || isRevealed}
                className="aspect-square rounded-lg flex items-center justify-center transition-all relative"
                style={{
                  background: isSafe ? "linear-gradient(135deg,#00C853,#00E676)"
                    : (isRevealed && isMine) || (showAll && isMine) ? "linear-gradient(135deg,#FF2D55,#FF6B35)"
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isRevealed || (showAll && isMine) ? "transparent" : "rgba(255,215,0,0.15)"}`,
                  opacity: phase === "ended" && !isRevealed && !isMine ? 0.3 : 1,
                }}>
                {isSafe && (
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>
                  </svg>
                )}
                {((isRevealed && isMine) || (showAll && isMine)) && (
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#000" stroke="#000" strokeWidth="1.5">
                    <circle cx="12" cy="13" r="6"/><line x1="12" y1="3" x2="12" y2="5" stroke="#000" strokeWidth="2"/><line x1="20" y1="13" x2="22" y2="13" stroke="#000" strokeWidth="2"/><line x1="2" y1="13" x2="4" y2="13" stroke="#000" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {phase === "idle" && (
          <div className="mt-4 space-y-2">
            <label className="text-[10px] text-white/60 uppercase tracking-wider">Mines: <b className="text-white">{mineCount}</b></label>
            <input type="range" min="1" max="24" value={mineCount} onChange={e => setMineCount(parseInt(e.target.value))}
              className="w-full" style={{ accentColor: "#FFD700" }} />
            <div className="flex gap-1">
              {[1, 3, 5, 10, 24].map(n => (
                <button key={n} onClick={() => setMineCount(n)} className="flex-1 py-1 rounded text-[10px] font-bold"
                  style={{ background: mineCount === n ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.05)",
                           color: mineCount === n ? "#FFD700" : "rgba(255,255,255,0.5)" }}>{n}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 space-y-3 flex-shrink-0" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(255,215,0,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        {phase === "idle" && (<>
          <StakeInput value={stake} onChange={setStake} max={balance} color="#FFD700" />
          <button onClick={start} className="w-full py-3 rounded-xl text-sm font-black text-black tracking-wide"
            style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)" }}>
            START GAME · {parseFloat(stake || "0").toFixed(2)} TND
          </button>
        </>)}
        {phase === "playing" && (
          <button onClick={cashout} disabled={safeRevealed === 0}
            className="w-full py-3 rounded-xl text-sm font-black text-black disabled:opacity-40 tracking-wide"
            style={{ background: "linear-gradient(135deg,#00C853,#00E676)" }}>
            CASH OUT · {currentWin.toFixed(2)} TND
          </button>
        )}
        {phase === "ended" && (
          <button onClick={reset} className="w-full py-3 rounded-xl text-sm font-black text-black tracking-wide"
            style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)" }}>
            NEW GAME
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
  const winChance = +(65 / t).toFixed(2);
  const potWin = +(parseFloat(stake || "0") * t * 0.65).toFixed(2);

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
    <div className="fixed inset-0 z-[200] bg-[#080a10] flex flex-col">
      <TopBar onBack={onBack} title="LIMBO" balance={user.balance} color="#a855f7" />
      <GameBanner img="/images/originals/limbo.jpg" color="#a855f7" />

      <div className="flex-1 flex flex-col items-center justify-center p-4"
        style={{ background: "radial-gradient(ellipse at center, rgba(168,85,247,0.08), #080a10 70%)" }}>

        <div className="text-center">
          {rolling ? (
            <motion.p animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 0.4, repeat: Infinity }}
              className="text-7xl font-black text-purple-400/30">?.??x</motion.p>
          ) : result !== null ? (
            <>
              <motion.p initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-8xl font-black"
                style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 60px currentColor" }}>
                {result.toFixed(2)}x
              </motion.p>
              <p className="text-sm mt-3 font-bold tracking-wide" style={{ color: won ? "#00C853" : "#FF2D55" }}>
                {won ? `WIN +${payout.toFixed(2)} TND` : "BELOW TARGET"}
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
                style={{ background: h.w ? "rgba(0,200,83,0.85)" : "rgba(255,45,85,0.85)", color: "#000" }}>
                {h.r.toFixed(2)}x
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3 flex-shrink-0" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(168,85,247,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <StakeInput value={stake} onChange={setStake} max={balance} color="#a855f7" />
          <div className="space-y-1.5">
            <label className="text-[10px] text-white/40 uppercase tracking-wider">Target</label>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)} min="1.01" step="0.1"
              className="w-full px-2 py-2 rounded-lg text-center text-base font-black text-white"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(168,85,247,0.3)" }} />
            <div className="flex justify-between text-[9px]">
              <span className="text-white/40">Chance: <b className="text-purple-300">{winChance}%</b></span>
              <span className="text-white/40">Pay: <b className="text-green-400">{potWin.toFixed(2)}</b></span>
            </div>
          </div>
        </div>
        <button onClick={play} disabled={rolling}
          className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50 tracking-wide"
          style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 4px 20px rgba(168,85,247,0.4)" }}>
          {rolling ? "ROLLING..." : `PLACE BET · ${parseFloat(stake || "0").toFixed(2)} TND`}
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
    <div className="fixed inset-0 z-[200] bg-[#080a10] flex flex-col">
      <TopBar onBack={onBack} title="PLINKO" balance={user.balance} color="#22c55e" />
      <GameBanner img="/images/originals/plinko.jpg" color="#22c55e" />

      <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto"
        style={{ background: "radial-gradient(ellipse at top, rgba(34,197,94,0.05), #080a10 70%)" }}>

        <div className="flex-1 flex flex-col items-center justify-center py-2">
          <div className="space-y-1 mb-3">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex justify-center gap-1.5">
                {Array.from({ length: r + 2 }).map((_, i) => (
                  <div key={i} className="rounded-full"
                    style={{ width: rows === 16 ? 5 : rows === 12 ? 6 : 8, height: rows === 16 ? 5 : rows === 12 ? 6 : 8,
                             background: "rgba(255,255,255,0.5)", boxShadow: "0 0 4px rgba(255,255,255,0.6)" }} />
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
                    : m >= 5 ? "rgba(255,45,85,0.3)" : m >= 1 ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.05)",
                  color: lastResult?.bucket === i ? "#000" : m >= 5 ? "#FFB3C0" : m >= 1 ? "#6EE7B7" : "rgba(255,255,255,0.5)",
                  border: lastResult?.bucket === i ? "2px solid #fff" : "1px solid rgba(255,255,255,0.06)",
                  transform: lastResult?.bucket === i ? "scale(1.18)" : "scale(1)",
                }}>
                {m}
              </div>
            ))}
          </div>

          {lastResult && (
            <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="mt-4 text-xl font-black tracking-wide"
              style={{ color: lastResult.won ? "#00C853" : "#FF2D55", textShadow: "0 0 20px currentColor" }}>
              {lastResult.won ? `WIN +${lastResult.payout.toFixed(2)} TND` : `${lastResult.multiplier}x`}
            </motion.p>
          )}
          {dropping && <p className="mt-4 text-sm font-bold text-yellow-400 animate-pulse tracking-wide">DROPPING...</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/50 mb-1 block uppercase tracking-wider">Rows</label>
            <div className="flex gap-1">
              {[8, 12, 16].map(r => (
                <button key={r} onClick={() => setRows(r as any)}
                  className="flex-1 py-1.5 rounded text-[10px] font-bold"
                  style={{ background: rows === r ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.05)",
                           color: rows === r ? "#22c55e" : "rgba(255,255,255,0.5)" }}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-white/50 mb-1 block uppercase tracking-wider">Risk</label>
            <div className="flex gap-1">
              {(["low", "med", "high"] as const).map(rk => (
                <button key={rk} onClick={() => setRisk(rk)}
                  className="flex-1 py-1.5 rounded text-[10px] font-bold capitalize"
                  style={{ background: risk === rk ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.05)",
                           color: risk === rk ? "#FFD700" : "rgba(255,255,255,0.5)" }}>{rk}</button>
              ))}
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {history.map((m, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-black"
                style={{ background: m >= 1 ? "rgba(0,200,83,0.85)" : "rgba(255,45,85,0.85)", color: "#000" }}>{m}x</div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3 flex-shrink-0" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(34,197,94,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <StakeInput value={stake} onChange={setStake} max={balance} color="#22c55e" />
        <button onClick={drop} disabled={dropping}
          className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50 tracking-wide"
          style={{ background: "linear-gradient(135deg,#22c55e,#10b981)", boxShadow: "0 4px 20px rgba(34,197,94,0.4)" }}>
          {dropping ? "DROPPING..." : `DROP BALL · ${parseFloat(stake || "0").toFixed(2)} TND`}
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
    <div className="fixed inset-0 z-[200] bg-[#080a10] flex flex-col">
      <TopBar onBack={onBack} title="COIN FLIP" balance={user.balance} color="#FFD700" />
      <GameBanner img="/images/originals/coinflip.jpg" color="#FFD700" />

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,215,0,0.08), #080a10 70%)" }}>

        <motion.div animate={flipping ? { rotateY: 1440 } : {}} transition={{ duration: 1.3 }}
          className="relative w-36 h-36 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#FFD700 0%,#FFA500 50%,#B8860B 100%)",
                   boxShadow: "0 0 80px rgba(255,215,0,0.55), inset 0 0 25px rgba(0,0,0,0.3)",
                   border: "3px solid rgba(255,255,255,0.4)" }}>
          <span className="text-4xl font-black" style={{ color: "#3D2C00", textShadow: "0 1px 2px rgba(255,255,255,0.5)" }}>
            {flipping ? "" : result === "heads" ? "K" : result === "tails" ? "T" : ""}
          </span>
        </motion.div>

        {result && (
          <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-black tracking-wide"
            style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 30px currentColor" }}>
            {won ? `WIN +${payout.toFixed(2)} TND` : "LOSS"}
          </motion.p>
        )}

        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => setPick("heads")} disabled={flipping}
            className="flex-1 py-3 rounded-xl text-sm font-black tracking-wide"
            style={{ background: pick === "heads" ? "linear-gradient(135deg,#FFD700,#FFA500)" : "rgba(255,255,255,0.05)",
                     color: pick === "heads" ? "#000" : "#fff",
                     boxShadow: pick === "heads" ? "0 4px 15px rgba(255,215,0,0.4)" : "none" }}>
            KING
          </button>
          <button onClick={() => setPick("tails")} disabled={flipping}
            className="flex-1 py-3 rounded-xl text-sm font-black tracking-wide"
            style={{ background: pick === "tails" ? "linear-gradient(135deg,#FFD700,#FFA500)" : "rgba(255,255,255,0.05)",
                     color: pick === "tails" ? "#000" : "#fff",
                     boxShadow: pick === "tails" ? "0 4px 15px rgba(255,215,0,0.4)" : "none" }}>
            TAIL
          </button>
        </div>

        {history.length > 0 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {history.map((h, i) => (
              <div key={i} className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: h.w ? "rgba(0,200,83,0.85)" : "rgba(255,45,85,0.85)", color: "#000" }}>
                {h.r === "heads" ? "K" : "T"}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3 flex-shrink-0" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(255,215,0,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <StakeInput value={stake} onChange={setStake} max={balance} color="#FFD700" />
        <button onClick={flip} disabled={flipping}
          className="w-full py-3 rounded-xl text-sm font-black text-black disabled:opacity-50 tracking-wide"
          style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)" }}>
          {flipping ? "FLIPPING..." : `FLIP COIN · ${parseFloat(stake || "0").toFixed(2)} TND`}
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
      setResultMsg(res.won ? `WIN +${res.payout!.toFixed(2)} TND (${res.multiplier!.toFixed(2)}x)` : "LOSS");
      setPhase("ended");
    }, 600);
  };

  const reset = () => { setPhase("idle"); setCurrentCard(null); setLastCard(null); setResultMsg(""); };

  const Card = ({ card, faded }: { card: {v:number;n:string;s:string}; faded?: boolean }) => {
    const isRed = card.s === "♥" || card.s === "♦";
    return (
      <div className="w-28 h-40 rounded-2xl flex flex-col items-center justify-between p-3"
        style={{ background: "linear-gradient(135deg,#fff,#f0f0f0)",
                 boxShadow: faded ? "0 0 15px rgba(255,255,255,0.2)" : "0 0 30px rgba(255,255,255,0.4), inset 0 0 8px rgba(0,0,0,0.05)",
                 opacity: faded ? 0.5 : 1,
                 border: "1px solid rgba(0,0,0,0.1)" }}>
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
    <div className="fixed inset-0 z-[200] bg-[#080a10] flex flex-col">
      <TopBar onBack={onBack} title="HI-LO" balance={user.balance} color="#ec4899" />
      <GameBanner img="/images/originals/hilo.jpg" color="#ec4899" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4"
        style={{ background: "radial-gradient(ellipse at center, rgba(236,72,153,0.08), #080a10 70%)" }}>

        <div className="flex gap-4 items-end">
          {lastCard && <Card card={lastCard} faded />}
          {currentCard ? <Card card={currentCard} /> : (
            <div className="w-28 h-40 rounded-2xl flex items-center justify-center text-6xl text-white/60 font-black"
              style={{ background: "linear-gradient(135deg,#ec4899,#FF2D55)" }}>?</div>
          )}
        </div>

        {resultMsg && (
          <p className="text-base font-bold tracking-wide"
            style={{ color: resultMsg.includes("WIN") ? "#00C853" : "#FF2D55", textShadow: "0 0 15px currentColor" }}>
            {resultMsg}
          </p>
        )}

        {currentCard && phase === "ready" && (
          <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
            <button onClick={() => guess("higher")} className="py-3 rounded-xl text-xs font-black tracking-wide"
              style={{ background: "linear-gradient(135deg,#00C853,#00E676)", color: "#000" }}>
              HIGHER<br/><span className="text-[9px] opacity-70 font-normal">{((13-currentCard.v)/13*100).toFixed(1)}%</span>
            </button>
            <button onClick={() => guess("equal")} className="py-3 rounded-xl text-xs font-black tracking-wide"
              style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)", color: "#000" }}>
              EQUAL<br/><span className="text-[9px] opacity-70 font-normal">7.7%</span>
            </button>
            <button onClick={() => guess("lower")} className="py-3 rounded-xl text-xs font-black tracking-wide"
              style={{ background: "linear-gradient(135deg,#FF2D55,#ec4899)", color: "#fff" }}>
              LOWER<br/><span className="text-[9px] opacity-70 font-normal">{((currentCard.v-1)/13*100).toFixed(1)}%</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-3 space-y-3 flex-shrink-0" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(236,72,153,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        {phase === "idle" || phase === "ended" ? (
          <>
            <StakeInput value={stake} onChange={setStake} max={balance} color="#ec4899" />
            <button onClick={phase === "ended" ? reset : start}
              className="w-full py-3 rounded-xl text-sm font-black text-white tracking-wide"
              style={{ background: "linear-gradient(135deg,#ec4899,#FF2D55)" }}>
              {phase === "ended" ? "NEW ROUND" : "DRAW CARD"} · {parseFloat(stake || "0").toFixed(2)} TND
            </button>
          </>
        ) : (
          <p className="text-center text-[11px] text-white/40 uppercase tracking-wider">اختر أعلى أم أقل</p>
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
    <div className="fixed inset-0 z-[200] bg-[#080a10] flex flex-col">
      <TopBar onBack={onBack} title="WHEEL" balance={user.balance} color="#FF6B35" />
      <GameBanner img="/images/originals/wheel.jpg" color="#FF6B35" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,107,53,0.08), #080a10 70%)" }}>

        <div className="relative w-64 h-64">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
            style={{ width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "20px solid #FFD700",
                     filter: "drop-shadow(0 0 8px rgba(255,215,0,0.8))" }} />
          <motion.div className="w-full h-full rounded-full"
            style={{
              background: `conic-gradient(${segments.map((m, i) => {
                const start = (i / segments.length) * 360;
                const end = ((i + 1) / segments.length) * 360;
                const color = m === 0 ? "#1a1d28" : m >= 10 ? "#FF2D55" : m >= 2 ? "#FFD700" : "#22c55e";
                return `${color} ${start}deg ${end}deg`;
              }).join(",")})`,
              boxShadow: "0 0 70px rgba(255,107,53,0.5), inset 0 0 30px rgba(0,0,0,0.5)",
              border: "4px solid rgba(255,215,0,0.4)",
            }}
            animate={{ rotate: rotation }}
            transition={{ duration: 3, ease: "easeOut" }} />
          <div className="absolute inset-1/3 rounded-full flex items-center justify-center text-2xl font-black text-white"
            style={{ background: "rgba(0,0,0,0.92)", border: "2px solid rgba(255,215,0,0.4)" }}>
            {result ? `${result.multiplier}x` : "?"}
          </div>
        </div>

        {result && (
          <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-xl font-black tracking-wide"
            style={{ color: result.won ? "#00C853" : "#FF2D55", textShadow: "0 0 20px currentColor" }}>
            {result.won ? `WIN +${result.payout.toFixed(2)} TND` : "NO WIN"}
          </motion.p>
        )}

        {history.length > 0 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide max-w-full">
            {history.map((m, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-black"
                style={{ background: m >= 1 ? "rgba(0,200,83,0.85)" : "rgba(255,45,85,0.85)", color: "#000" }}>{m}x</div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3 flex-shrink-0" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(255,107,53,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <div>
          <label className="text-[10px] text-white/50 mb-1 block uppercase tracking-wider">Risk</label>
          <div className="flex gap-1">
            {(["low", "med", "high"] as const).map(rk => (
              <button key={rk} onClick={() => setRisk(rk)} disabled={spinning}
                className="flex-1 py-1.5 rounded text-[10px] font-bold capitalize"
                style={{ background: risk === rk ? "rgba(255,107,53,0.25)" : "rgba(255,255,255,0.05)",
                         color: risk === rk ? "#FF6B35" : "rgba(255,255,255,0.5)" }}>{rk}</button>
            ))}
          </div>
        </div>
        <StakeInput value={stake} onChange={setStake} max={balance} color="#FF6B35" />
        <button onClick={spin} disabled={spinning}
          className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50 tracking-wide"
          style={{ background: "linear-gradient(135deg,#FF6B35,#FF2D55)", boxShadow: "0 4px 20px rgba(255,107,53,0.4)" }}>
          {spinning ? "SPINNING..." : `SPIN · ${parseFloat(stake || "0").toFixed(2)} TND`}
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
    for (let i = 0; i < res.draws!.length; i++) {
      await new Promise(r => setTimeout(r, 100));
      setDraws(res.draws!.slice(0, i + 1));
    }
    setHits(res.hits!); setWon(res.won!); setPayout(res.payout || 0);
    setPlaying(false);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#080a10] flex flex-col">
      <TopBar onBack={onBack} title="KENO" balance={user.balance} color="#06b6d4" />
      <GameBanner img="/images/originals/keno.jpg" color="#06b6d4" />

      <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto"
        style={{ background: "radial-gradient(ellipse at top, rgba(6,182,212,0.06), #080a10 70%)" }}>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(6,182,212,0.08)" }}>
            <p className="text-[9px] text-white/50 uppercase">Picks</p>
            <p className="text-base font-black text-cyan-400">{picks.size}/10</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,215,0,0.08)" }}>
            <p className="text-[9px] text-white/50 uppercase">Hits</p>
            <p className="text-base font-black text-yellow-400">{hits}</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,200,83,0.08)" }}>
            <p className="text-[9px] text-white/50 uppercase">Win</p>
            <p className="text-base font-black text-green-400">{payout.toFixed(2)}</p>
          </div>
        </div>

        {won !== null && (
          <p className="text-center text-sm font-bold tracking-wide"
            style={{ color: won ? "#00C853" : "#FF2D55", textShadow: "0 0 15px currentColor" }}>
            {won ? `WIN +${payout.toFixed(2)} TND` : `${hits} HITS — TRY AGAIN`}
          </p>
        )}

        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 40 }, (_, i) => i + 1).map(n => {
            const isPicked = picks.has(n);
            const isDrawn = draws.includes(n);
            const isHit = isPicked && isDrawn;
            return (
              <button key={n} onClick={() => togglePick(n)} disabled={playing}
                className="aspect-square rounded text-[10px] font-black flex items-center justify-center transition-all"
                style={{
                  background: isHit ? "linear-gradient(135deg,#FFD700,#FFA500)"
                    : isDrawn ? "rgba(255,255,255,0.20)"
                    : isPicked ? "linear-gradient(135deg,#06b6d4,#0891b2)"
                    : "rgba(255,255,255,0.05)",
                  color: isHit ? "#000" : isPicked ? "#fff" : "rgba(255,255,255,0.6)",
                  transform: isHit ? "scale(1.1)" : "scale(1)",
                  boxShadow: isHit ? "0 0 12px rgba(255,215,0,0.7)" : "none",
                }}>{n}</button>
            );
          })}
        </div>

        <div>
          <label className="text-[10px] text-white/50 mb-1 block uppercase tracking-wider">Risk</label>
          <div className="flex gap-1">
            {(["low", "med", "high"] as const).map(rk => (
              <button key={rk} onClick={() => setRisk(rk)} disabled={playing}
                className="flex-1 py-1.5 rounded text-[10px] font-bold capitalize"
                style={{ background: risk === rk ? "rgba(6,182,212,0.25)" : "rgba(255,255,255,0.05)",
                         color: risk === rk ? "#06b6d4" : "rgba(255,255,255,0.5)" }}>{rk}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3 flex-shrink-0" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(6,182,212,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <StakeInput value={stake} onChange={setStake} max={balance} color="#06b6d4" />
        <button onClick={play} disabled={playing || picks.size === 0}
          className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50 tracking-wide"
          style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)", boxShadow: "0 4px 20px rgba(6,182,212,0.4)" }}>
          {playing ? "DRAWING..." : `PLAY · ${parseFloat(stake || "0").toFixed(2)} TND`}
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
      setPhase("ended"); setResultMsg("BOOM — Mine hit");
    } else {
      if (level + 1 >= 9) cashout();
      else setLevel(l => l + 1);
    }
  };

  const cashout = async () => {
    if (phase !== "playing" || level === 0) return;
    const res = await towerCashout(user.id, parseFloat(stake), mode, level);
    if (res.ok) {
      await refreshBalance();
      setPhase("ended");
      setResultMsg(`WIN +${res.payout!.toFixed(2)} TND (${currentMultiplier.toFixed(2)}x)`);
    }
  };

  const reset = () => { setPhase("idle"); setLevel(0); setRevealed({}); setMineLayout([]); setResultMsg(""); };

  return (
    <div className="fixed inset-0 z-[200] bg-[#080a10] flex flex-col">
      <TopBar onBack={onBack} title="TOWER" balance={user.balance} color="#10b981" />
      <GameBanner img="/images/originals/tower.jpg" color="#10b981" />

      <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto"
        style={{ background: "radial-gradient(ellipse at top, rgba(16,185,129,0.06), #080a10 70%)" }}>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(16,185,129,0.08)" }}>
            <p className="text-[9px] text-white/50 uppercase">Level</p>
            <p className="text-base font-black text-emerald-400">{level}/9</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,215,0,0.08)" }}>
            <p className="text-[9px] text-white/50 uppercase">Current</p>
            <p className="text-base font-black text-yellow-400">{currentMultiplier.toFixed(2)}x</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: "rgba(0,200,83,0.08)" }}>
            <p className="text-[9px] text-white/50 uppercase">Win</p>
            <p className="text-base font-black text-green-400">{currentWin.toFixed(2)}</p>
          </div>
        </div>

        {resultMsg && (
          <p className="text-center text-sm font-bold tracking-wide"
            style={{ color: resultMsg.includes("WIN") ? "#00C853" : "#FF2D55", textShadow: "0 0 15px currentColor" }}>
            {resultMsg}
          </p>
        )}

        <div className="space-y-1 flex-1 flex flex-col-reverse justify-end">
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
                      className="rounded-lg flex items-center justify-center transition-all"
                      style={{
                        width: 56, height: 32,
                        background: reveal && isMine ? "linear-gradient(135deg,#FF2D55,#FF6B35)"
                          : reveal && !isMine ? "linear-gradient(135deg,#00C853,#00E676)"
                          : isFuture ? "rgba(255,255,255,0.05)"
                          : isCurrent ? "linear-gradient(135deg,#10b981,#22c55e)"
                          : isPassed ? "rgba(0,200,83,0.15)"
                          : "rgba(255,255,255,0.05)",
                        opacity: isFuture ? 0.3 : 1,
                        boxShadow: isCurrent ? "0 0 15px rgba(16,185,129,0.6)" : "none",
                      }}>
                      {reveal && isMine && (
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#000"><circle cx="12" cy="13" r="6"/></svg>
                      )}
                      {reveal && !isMine && (
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                      )}
                      {isCurrent && (
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="#fff" stroke="#fff"><circle cx="12" cy="12" r="2"/></svg>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {phase === "idle" && (
          <div>
            <label className="text-[10px] text-white/50 mb-1 block uppercase tracking-wider">Difficulty</label>
            <div className="flex gap-1">
              {(Object.keys(TOWER_CONFIG) as (keyof typeof TOWER_CONFIG)[]).map(m => (
                <button key={m} onClick={() => setMode(m)} className="flex-1 py-1.5 rounded text-[9px] font-bold capitalize"
                  style={{ background: mode === m ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.05)",
                           color: mode === m ? "#10b981" : "rgba(255,255,255,0.5)" }}>{m}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 space-y-3 flex-shrink-0" style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(16,185,129,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        {phase === "idle" && (<>
          <StakeInput value={stake} onChange={setStake} max={balance} color="#10b981" />
          <button onClick={start} className="w-full py-3 rounded-xl text-sm font-black text-white tracking-wide"
            style={{ background: "linear-gradient(135deg,#10b981,#22c55e)" }}>
            START · {parseFloat(stake || "0").toFixed(2)} TND
          </button>
        </>)}
        {phase === "playing" && level > 0 && (
          <button onClick={cashout} className="w-full py-3 rounded-xl text-sm font-black text-black tracking-wide"
            style={{ background: "linear-gradient(135deg,#00C853,#00E676)" }}>
            CASH OUT · {currentWin.toFixed(2)} TND (Next: {nextMultiplier.toFixed(2)}x)
          </button>
        )}
        {phase === "playing" && level === 0 && (
          <p className="text-center text-[11px] text-white/40 uppercase tracking-wider">اختر بلاطة آمنة</p>
        )}
        {phase === "ended" && (
          <button onClick={reset} className="w-full py-3 rounded-xl text-sm font-black text-white tracking-wide"
            style={{ background: "linear-gradient(135deg,#10b981,#22c55e)" }}>
            NEW TOWER
          </button>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━ SLOT SYMBOL ART (premium SVG icons, no text/emoji) ━━━━━━━━━━━━━━━━━━

function SymbolIcon({ id }: { id: string }) {
  const s = "100%";
  const props = { width: s, height: s, viewBox: "0 0 64 64", xmlns: "http://www.w3.org/2000/svg" };
  // Soft drop shadow filter is applied via parent text-shadow

  switch (id) {
    // ─── BOOK OF FORTUNE (Egyptian) ───
    case "10": return ( // Ankh
      <svg {...props}>
        <defs><linearGradient id="g10" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE08A"/><stop offset="1" stopColor="#C99A2E"/></linearGradient></defs>
        <path d="M32 8c-6 0-10 4-10 9 0 5 3 8 7 10v3h-8v6h8v20h6V36h8v-6h-8v-3c4-2 7-5 7-10 0-5-4-9-10-9z M27 17c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5z"
              fill="url(#g10)" stroke="#7A5300" strokeWidth="1"/>
      </svg>
    );
    case "J": return ( // Sun disk
      <svg {...props}>
        <defs><radialGradient id="gJ"><stop offset="0" stopColor="#FFF1A8"/><stop offset="0.6" stopColor="#FFB300"/><stop offset="1" stopColor="#B36300"/></radialGradient></defs>
        {[...Array(8)].map((_,i)=>(
          <rect key={i} x="31" y="6" width="2" height="10" fill="#FFD700" transform={`rotate(${i*45} 32 32)`}/>
        ))}
        <circle cx="32" cy="32" r="14" fill="url(#gJ)" stroke="#7A4800" strokeWidth="1.5"/>
      </svg>
    );
    case "Q": return ( // Eye of Horus
      <svg {...props}>
        <defs><linearGradient id="gQ" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5EE7FF"/><stop offset="1" stopColor="#00709C"/></linearGradient></defs>
        <path d="M8 32 C 18 16, 46 16, 56 32 C 46 48, 18 48, 8 32 Z" fill="#fff" stroke="#000" strokeWidth="2"/>
        <circle cx="32" cy="32" r="9" fill="url(#gQ)" stroke="#000" strokeWidth="1.5"/>
        <circle cx="32" cy="32" r="4" fill="#000"/>
        <path d="M32 41 L36 50 L40 47 M32 41 L26 52" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </svg>
    );
    case "K": return ( // Pyramid
      <svg {...props}>
        <defs><linearGradient id="gK" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F0C76A"/><stop offset="0.5" stopColor="#FFE08A"/><stop offset="1" stopColor="#A37020"/></linearGradient></defs>
        <path d="M32 8 L8 54 L56 54 Z" fill="url(#gK)" stroke="#5C3A00" strokeWidth="1.5"/>
        <path d="M32 8 L32 54" stroke="#7A5300" strokeWidth="1" opacity="0.6"/>
        <circle cx="50" cy="20" r="3" fill="#FFD700"/>
      </svg>
    );
    case "A": return ( // Star (golden)
      <svg {...props}>
        <defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF1A8"/><stop offset="1" stopColor="#B36300"/></linearGradient></defs>
        <path d="M32 6 L38 24 L57 25 L42 37 L48 56 L32 46 L16 56 L22 37 L7 25 L26 24 Z"
              fill="url(#gA)" stroke="#5C3A00" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    );
    case "anu": return ( // Anubis head
      <svg {...props}>
        <defs><linearGradient id="ganu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#222"/><stop offset="1" stopColor="#000"/></linearGradient></defs>
        <path d="M32 8 L20 18 L18 32 L14 36 L18 56 L46 56 L50 36 L46 32 L44 18 Z" fill="url(#ganu)" stroke="#FFD700" strokeWidth="1.5"/>
        <path d="M20 18 L14 6 L24 16 M44 18 L50 6 L40 16" fill="url(#ganu)" stroke="#FFD700" strokeWidth="1.5"/>
        <circle cx="26" cy="32" r="2" fill="#FFD700"/>
        <circle cx="38" cy="32" r="2" fill="#FFD700"/>
        <path d="M28 42 L36 42 L34 46 L30 46 Z" fill="#FFD700"/>
      </svg>
    );
    case "rl": return ( // Pharaoh crown / Nemes
      <svg {...props}>
        <defs><linearGradient id="grl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE08A"/><stop offset="0.5" stopColor="#D49930"/><stop offset="1" stopColor="#7A4800"/></linearGradient></defs>
        <ellipse cx="32" cy="38" rx="20" ry="20" fill="#F0C49A" stroke="#5C3A00" strokeWidth="1.5"/>
        <path d="M12 30 Q 32 6 52 30 L 50 42 Q 32 22 14 42 Z" fill="url(#grl)" stroke="#5C3A00" strokeWidth="1.5"/>
        <path d="M28 34 L 36 34 L 36 38 L 28 38 Z" fill="#D49930" stroke="#5C3A00" strokeWidth="1"/>
        <circle cx="26" cy="40" r="1.5" fill="#000"/>
        <circle cx="38" cy="40" r="1.5" fill="#000"/>
        <path d="M28 48 Q 32 52 36 48" stroke="#A33000" strokeWidth="2" fill="none"/>
      </svg>
    );
    case "sc": return ( // Scarab beetle
      <svg {...props}>
        <defs><radialGradient id="gsc"><stop offset="0" stopColor="#54E89D"/><stop offset="0.6" stopColor="#0E8B43"/><stop offset="1" stopColor="#063A1B"/></radialGradient></defs>
        <ellipse cx="32" cy="36" rx="18" ry="22" fill="url(#gsc)" stroke="#022612" strokeWidth="1.5"/>
        <ellipse cx="32" cy="22" rx="10" ry="6" fill="#0A5C2D" stroke="#022612" strokeWidth="1.5"/>
        <path d="M32 18 L32 58" stroke="#022612" strokeWidth="1.5"/>
        <path d="M14 30 L4 22 M14 38 L4 40 M14 46 L4 54 M50 30 L60 22 M50 38 L60 40 M50 46 L60 54"
              stroke="#022612" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="32" cy="36" r="3" fill="#FFD700" stroke="#022612" strokeWidth="1"/>
      </svg>
    );
    case "bk": return ( // Book of Fortune (wild + scatter)
      <svg {...props}>
        <defs>
          <linearGradient id="gbk1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8B0000"/><stop offset="0.5" stopColor="#C90000"/><stop offset="1" stopColor="#600000"/></linearGradient>
          <linearGradient id="gbk2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE08A"/><stop offset="1" stopColor="#A37020"/></linearGradient>
        </defs>
        <rect x="6" y="10" width="52" height="44" rx="3" fill="url(#gbk1)" stroke="#3A0000" strokeWidth="2"/>
        <rect x="8" y="12" width="48" height="40" rx="2" fill="none" stroke="#FFD700" strokeWidth="1.5"/>
        <circle cx="32" cy="32" r="11" fill="url(#gbk2)" stroke="#5C3A00" strokeWidth="1.5"/>
        <path d="M32 23 L34 30 L41 30 L36 34 L38 41 L32 37 L26 41 L28 34 L23 30 L30 30 Z"
              fill="#3A0000" stroke="#000" strokeWidth="0.5"/>
        <path d="M32 10 L32 54" stroke="#3A0000" strokeWidth="1"/>
      </svg>
    );

    // ─── HOT FRUITS ───
    case "ch": return ( // Cherry
      <svg {...props}>
        <defs><radialGradient id="gch"><stop offset="0" stopColor="#FF6B85"/><stop offset="0.6" stopColor="#D9001C"/><stop offset="1" stopColor="#6B0010"/></radialGradient></defs>
        <path d="M40 10 Q 50 14 50 28 Q 50 36 42 40 M40 10 Q 32 14 26 28 Q 20 38 16 50"
              fill="none" stroke="#0E7A2A" strokeWidth="2.5"/>
        <ellipse cx="42" cy="20" rx="9" ry="6" fill="#22B544" transform="rotate(-30 42 20)"/>
        <circle cx="22" cy="48" r="13" fill="url(#gch)" stroke="#3A0010" strokeWidth="1.5"/>
        <circle cx="44" cy="48" r="13" fill="url(#gch)" stroke="#3A0010" strokeWidth="1.5"/>
        <ellipse cx="18" cy="44" rx="3" ry="2" fill="#FFC0CB" opacity="0.7"/>
        <ellipse cx="40" cy="44" rx="3" ry="2" fill="#FFC0CB" opacity="0.7"/>
      </svg>
    );
    case "lm": return ( // Lemon
      <svg {...props}>
        <defs><radialGradient id="glm"><stop offset="0" stopColor="#FFF59D"/><stop offset="0.7" stopColor="#FFD600"/><stop offset="1" stopColor="#A37500"/></radialGradient></defs>
        <ellipse cx="32" cy="34" rx="20" ry="22" fill="url(#glm)" stroke="#5C3A00" strokeWidth="1.5"/>
        <path d="M16 16 L20 22 M48 16 L44 22" stroke="#5C3A00" strokeWidth="2.5" strokeLinecap="round"/>
        <ellipse cx="32" cy="34" rx="10" ry="12" fill="none" stroke="#FFD700" strokeWidth="1" opacity="0.6"/>
        <ellipse cx="24" cy="28" rx="5" ry="3" fill="#FFF59D" opacity="0.7"/>
      </svg>
    );
    case "or": return ( // Orange
      <svg {...props}>
        <defs><radialGradient id="gor"><stop offset="0" stopColor="#FFC880"/><stop offset="0.7" stopColor="#FF8500"/><stop offset="1" stopColor="#7A3500"/></radialGradient></defs>
        <circle cx="32" cy="36" r="22" fill="url(#gor)" stroke="#5C2700" strokeWidth="1.5"/>
        <circle cx="32" cy="36" r="22" fill="none" stroke="#5C2700" strokeWidth="0.5" opacity="0.6"/>
        <path d="M32 14 L36 8 L40 12 L34 18 Z" fill="#22B544" stroke="#0A5C2D" strokeWidth="1"/>
        <ellipse cx="24" cy="28" rx="6" ry="3" fill="#FFE0B3" opacity="0.6"/>
      </svg>
    );
    case "pl": return ( // Plum
      <svg {...props}>
        <defs><radialGradient id="gpl"><stop offset="0" stopColor="#B89AE0"/><stop offset="0.7" stopColor="#5A2A8C"/><stop offset="1" stopColor="#2A0A4A"/></radialGradient></defs>
        <ellipse cx="32" cy="34" rx="20" ry="22" fill="url(#gpl)" stroke="#1A053A" strokeWidth="1.5"/>
        <path d="M32 14 Q 36 4 42 8" stroke="#22B544" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <ellipse cx="40" cy="11" rx="6" ry="3.5" fill="#22B544" stroke="#0A5C2D" strokeWidth="1" transform="rotate(-20 40 11)"/>
        <ellipse cx="24" cy="26" rx="5" ry="3" fill="#D0B3F0" opacity="0.6"/>
        <path d="M32 14 L 32 56" stroke="#3D1873" strokeWidth="0.5" opacity="0.4"/>
      </svg>
    );
    case "wm": return ( // Watermelon
      <svg {...props}>
        <defs><linearGradient id="gwm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF5A8A"/><stop offset="1" stopColor="#C90031"/></linearGradient></defs>
        <path d="M6 36 Q 32 0, 58 36 L 58 38 Q 32 50, 6 38 Z" fill="url(#gwm)" stroke="#5C0020" strokeWidth="1.5"/>
        <path d="M6 36 Q 32 0, 58 36" fill="none" stroke="#0E7A2A" strokeWidth="4"/>
        <path d="M6 32 Q 32 -4, 58 32" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.7"/>
        {[18,28,38,48].map((x,i)=>(
          <ellipse key={i} cx={x} cy={30 - (i===1||i===2 ? 4 : 0)} rx="2" ry="3" fill="#1A0008"/>
        ))}
      </svg>
    );
    case "gr": return ( // Grape cluster
      <svg {...props}>
        <defs><radialGradient id="ggr"><stop offset="0" stopColor="#B89AE0"/><stop offset="0.7" stopColor="#5A2A8C"/><stop offset="1" stopColor="#2A0A4A"/></radialGradient></defs>
        <path d="M30 8 Q 38 4 44 12" stroke="#22B544" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <ellipse cx="44" cy="14" rx="7" ry="4" fill="#22B544" transform="rotate(-25 44 14)"/>
        {[[20,18,7],[32,16,7],[44,18,7],[26,28,7],[38,28,7],[32,38,7],[20,38,7],[44,38,7],[26,48,7],[38,48,7]].map(([x,y,r],i)=>(
          <circle key={i} cx={x} cy={y} r={r} fill="url(#ggr)" stroke="#1A053A" strokeWidth="1"/>
        ))}
      </svg>
    );
    case "bl": return ( // Bell
      <svg {...props}>
        <defs><linearGradient id="gbl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF1A8"/><stop offset="0.6" stopColor="#FFB300"/><stop offset="1" stopColor="#7A4800"/></linearGradient></defs>
        <path d="M32 8 L 30 12 Q 14 18, 14 38 L 8 46 L 56 46 L 50 38 Q 50 18, 34 12 L 32 8 Z"
              fill="url(#gbl)" stroke="#3D2400" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="32" cy="52" r="5" fill="url(#gbl)" stroke="#3D2400" strokeWidth="1.5"/>
        <ellipse cx="24" cy="22" rx="5" ry="10" fill="#FFFFFF" opacity="0.5" transform="rotate(-20 24 22)"/>
      </svg>
    );
    case "s7": return ( // Lucky Seven
      <svg {...props}>
        <defs>
          <linearGradient id="g7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF5A2A"/><stop offset="0.5" stopColor="#FF2D55"/><stop offset="1" stopColor="#7A0017"/></linearGradient>
          <linearGradient id="g7e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFD700"/><stop offset="1" stopColor="#7A4800"/></linearGradient>
        </defs>
        <path d="M10 12 L 54 12 L 54 22 L 36 56 L 22 56 L 40 22 L 10 22 Z"
              fill="url(#g7)" stroke="url(#g7e)" strokeWidth="2.5" strokeLinejoin="round"/>
        <path d="M14 16 L 50 16 L 50 18 L 14 18 Z" fill="#FFFFFF" opacity="0.4"/>
      </svg>
    );
    case "st": return ( // Star (scatter)
      <svg {...props}>
        <defs>
          <radialGradient id="gst"><stop offset="0" stopColor="#FFFFFF"/><stop offset="0.4" stopColor="#FFF1A8"/><stop offset="1" stopColor="#B36300"/></radialGradient>
          <filter id="gstGlow"><feGaussianBlur stdDeviation="1.5"/></filter>
        </defs>
        <path d="M32 4 L40 24 L62 25 L44 38 L51 60 L32 48 L13 60 L20 38 L2 25 L24 24 Z"
              fill="url(#gst)" stroke="#5C3A00" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="32" cy="32" r="6" fill="#FFFFFF" opacity="0.6"/>
      </svg>
    );

    // ─── LUCKY JOKER ───
    case "jk": return ( // Joker hat / mask
      <svg {...props}>
        <defs><linearGradient id="gjk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FF2D55"/><stop offset="0.5" stopColor="#A855F7"/><stop offset="1" stopColor="#06b6d4"/></linearGradient></defs>
        <path d="M32 4 L 14 30 L 10 36 L 12 40 L 22 38 L 14 50 L 22 48 L 18 56 L 32 46 L 46 56 L 42 48 L 50 50 L 42 38 L 52 40 L 54 36 L 50 30 Z"
              fill="url(#gjk)" stroke="#1A053A" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="12" cy="40" r="2.5" fill="#FFD700"/>
        <circle cx="22" cy="48" r="2.5" fill="#FFD700"/>
        <circle cx="42" cy="48" r="2.5" fill="#FFD700"/>
        <circle cx="52" cy="40" r="2.5" fill="#FFD700"/>
        <circle cx="28" cy="32" r="2" fill="#000"/>
        <circle cx="36" cy="32" r="2" fill="#000"/>
        <path d="M26 40 Q 32 44 38 40" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
    );

    default:
      return <svg {...props}><circle cx="32" cy="32" r="22" fill="#888"/></svg>;
  }
}


function SlotGame({ onBack, slotId }: { onBack: () => void; slotId: string }) {
  const { user, refreshBalance } = useAuth();
  const cfg = SLOT_CONFIGS[slotId];
  const [stake, setStake] = useState("1");
  const [grid, setGrid] = useState<string[][]>([
    [cfg.symbols[0].id, cfg.symbols[1].id, cfg.symbols[2].id],
    [cfg.symbols[2].id, cfg.symbols[3].id, cfg.symbols[1].id],
    [cfg.symbols[1].id, cfg.symbols[0].id, cfg.symbols[3].id],
    [cfg.symbols[3].id, cfg.symbols[2].id, cfg.symbols[0].id],
    [cfg.symbols[0].id, cfg.symbols[1].id, cfg.symbols[2].id],
  ]);
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<{ wins: any[]; totalPayout: number; scatterCount: number } | null>(null);
  const [winningLines, setWinningLines] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<number[]>([]);
  const [nonce, setNonce] = useState(Math.floor(Math.random() * 1e6));
  const clientSeed = useRef(generateServerSeed().substring(0, 16));

  if (!user) return null;
  const balance = parseFloat(user.balance);

  // Color per symbol
  const symbolColor = (id: string) => {
    const idx = cfg.symbols.findIndex(s => s.id === id);
    const colors = ["#94a3b8", "#facc15", "#f87171", "#a78bfa", "#22d3ee", "#FF8C00", "#FFD700", "#FF2D55", "#fff"];
    return colors[Math.min(idx, colors.length - 1)];
  };

  const symbolByid = (id: string) => cfg.symbols.find(s => s.id === id);

  const spin = async () => {
    setError(""); setLastResult(null); setWinningLines([]);
    const s = parseFloat(stake);
    if (!s || s <= 0) { setError("أدخل المبلغ"); return; }
    if (balance <= 0) { setError("رصيدك 0 — تواصل مع الإدارة"); return; }
    if (s > balance) { setError("رصيد غير كافٍ"); return; }

    setSpinning(true);

    // Pre-spin animation: rapidly cycle symbols on each reel
    const animDur = 1200;
    const fps = 80;
    const startT = Date.now();
    const allIds = cfg.symbols.map(x => x.id);
    const anim = setInterval(() => {
      const newGrid: string[][] = [];
      for (let r = 0; r < 5; r++) {
        const col: string[] = [];
        for (let row = 0; row < 3; row++) {
          col.push(allIds[Math.floor(Math.random() * allIds.length)]);
        }
        newGrid.push(col);
      }
      setGrid(newGrid);
      if (Date.now() - startT >= animDur) clearInterval(anim);
    }, fps);

    const res = await slotSpin(user.id, slotId, s, clientSeed.current, nonce);
    setNonce(n => n + 1);
    if (!res.ok) {
      clearInterval(anim);
      setError(res.error || "خطأ");
      setSpinning(false);
      return;
    }
    await refreshBalance();

    // Wait for animation to settle, then set final grid
    setTimeout(() => {
      clearInterval(anim);
      setGrid(res.grid!);
      setLastResult({ wins: res.wins || [], totalPayout: res.totalPayout || 0, scatterCount: res.scatterCount || 0 });
      setWinningLines((res.wins || []).map(w => w.line));
      setHistory(h => [(res.totalPayout || 0), ...h].slice(0, 10));
      setSpinning(false);
    }, animDur);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#080a10] flex flex-col">
      <TopBar onBack={onBack} title={cfg.name.toUpperCase()} balance={user.balance} color="#FFD700" />
      <GameBanner img={`/images/originals/${slotId}.jpg`} color="#FFD700" />

      <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto"
        style={{ background: "radial-gradient(ellipse at top, rgba(255,215,0,0.06), #080a10 70%)" }}>

        {/* Reels 5x3 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-5 gap-1.5 p-3 rounded-2xl w-full max-w-md"
            style={{ background: "linear-gradient(135deg,#1a1d28,#0d0f17)",
                     border: "2px solid rgba(255,215,0,0.3)",
                     boxShadow: "inset 0 0 30px rgba(0,0,0,0.6), 0 0 40px rgba(255,215,0,0.1)" }}>
            {grid.map((col, ri) => (
              <div key={ri} className="flex flex-col gap-1.5">
                {col.map((symId, row) => {
                  const sym = symbolByid(symId);
                  if (!sym) return null;
                  const isWin = (lastResult?.wins || []).some(w => {
                    if (w.line === 0) return symId === cfg.scatterSymbol; // scatter
                    const line = PAYLINES[w.line - 1];
                    return line && line[ri] === row && w.count > ri;
                  });
                  return (
                    <motion.div key={row}
                      animate={isWin ? { scale: [1, 1.12, 1] } : {}}
                      transition={{ duration: 0.5, repeat: isWin ? Infinity : 0 }}
                      className="aspect-square rounded-lg flex items-center justify-center p-1.5"
                      style={{
                        background: isWin
                          ? "linear-gradient(135deg,rgba(255,215,0,0.35),rgba(255,140,0,0.25))"
                          : "linear-gradient(135deg,rgba(255,255,255,0.06),rgba(0,0,0,0.3))",
                        border: isWin ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.05)",
                        boxShadow: isWin ? "0 0 18px rgba(255,215,0,0.5)" : "none",
                        filter: `drop-shadow(0 0 6px ${symbolColor(symId)}80) drop-shadow(0 2px 3px rgba(0,0,0,0.7))`,
                      }}>
                      <SymbolIcon id={symId}/>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Last result */}
        {lastResult && (
          <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="text-center">
            {lastResult.totalPayout > 0 ? (
              <p className="text-xl font-black tracking-wide"
                style={{ color: "#00C853", textShadow: "0 0 20px currentColor" }}>
                WIN +{lastResult.totalPayout.toFixed(2)} TND
              </p>
            ) : (
              <p className="text-sm font-bold text-white/40 tracking-wide">NO WIN</p>
            )}
            {lastResult.wins.length > 0 && (
              <p className="text-[10px] text-white/50 mt-1">
                {lastResult.wins.length} winning line{lastResult.wins.length > 1 ? "s" : ""}
              </p>
            )}
          </motion.div>
        )}

        {/* Symbol payout legend (top symbols) */}
        <div className="grid grid-cols-3 gap-1.5">
          {cfg.symbols.slice(-3).reverse().map(s => (
            <div key={s.id} className="rounded-md p-1.5 flex items-center justify-between gap-1.5"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="w-7 h-7" style={{ filter: `drop-shadow(0 0 4px ${symbolColor(s.id)}90)` }}>
                <SymbolIcon id={s.id}/>
              </div>
              <span className="text-[10px] font-bold text-yellow-400">{s.payout}x</span>
            </div>
          ))}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {history.map((p, i) => (
              <div key={i} className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-black"
                style={{ background: p > 0 ? "rgba(0,200,83,0.85)" : "rgba(120,120,120,0.5)", color: "#000" }}>
                {p > 0 ? `+${p.toFixed(2)}` : "0"}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3 flex-shrink-0"
        style={{ background: "rgba(15,18,28,0.98)", borderTop: "1px solid rgba(255,215,0,0.2)" }}>
        {error && <p className="text-[11px] text-center font-bold text-pink-400">{error}</p>}
        <StakeInput value={stake} onChange={setStake} max={balance} color="#FFD700" />
        <button onClick={spin} disabled={spinning}
          className="w-full py-3 rounded-xl text-sm font-black text-black disabled:opacity-50 tracking-wide"
          style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)",
                   boxShadow: "0 4px 20px rgba(255,215,0,0.4)" }}>
          {spinning ? "SPINNING..." : `SPIN · ${parseFloat(stake || "0").toFixed(2)} TND`}
        </button>
      </div>
    </div>
  );
}
