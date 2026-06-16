import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Gem, Lock, RefreshCw, ShieldCheck, Sparkles, Trophy, Wallet, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";

const SYMBOLS: Record<string, { emoji: string; label: string; color: string }> = {
  lion: { emoji: "🦁", label: "Lion", color: "#fbbf24" },
  crown: { emoji: "👑", label: "Crown", color: "#f59e0b" },
  diamond: { emoji: "💎", label: "Diamond", color: "#38bdf8" },
  gold: { emoji: "🏆", label: "Gold", color: "#fde047" },
  scarab: { emoji: "🧿", label: "Scarab", color: "#22d3ee" },
  snake: { emoji: "🐍", label: "Snake", color: "#22c55e" },
  coin: { emoji: "🪙", label: "Coin", color: "#eab308" },
  wild: { emoji: "🔥", label: "Wild", color: "#fb923c" },
  scatter: { emoji: "⭐", label: "Scatter", color: "#a855f7" },
};

function apiBase() {
  const w = window as any;
  return (w.__TUNBET_SPORTSBOOK_API__ || localStorage.getItem("tunbet_sportsbook_api") || "https://tunbet-sportsbook.onrender.com").replace(/\/$/, "");
}
function tnd(v: any) { return `${Number(v || 0).toFixed(2)} TND`; }

type SpinResult = {
  success?: boolean;
  error?: string;
  stake?: number;
  payout?: number;
  profit?: number;
  balance?: number;
  txid?: string;
  result?: { grid: string[][]; wins: any[]; totalWin: number; seedHash: string; paylines: number };
};

const demoGrid = [["lion", "crown", "diamond", "gold", "scatter"], ["wild", "lion", "coin", "lion", "wild"], ["scarab", "snake", "gold", "diamond", "crown"]];

export default function LionSlot() {
  const { user, refreshBalance } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [stake, setStake] = useState("1");
  const [spinning, setSpinning] = useState(false);
  const [res, setRes] = useState<SpinResult | null>(null);
  const [err, setErr] = useState("");
  const grid = res?.result?.grid || demoGrid;
  const totalWin = Number(res?.payout || 0);
  const winTone = totalWin > 0 ? "#22c55e" : "rgba(255,255,255,0.45)";

  const spin = async () => {
    if (!user) { setShowAuth(true); return; }
    const s = Number(stake);
    if (!Number.isFinite(s) || s < 0.5) { setErr("Minimum spin is 0.50 TND"); return; }
    setSpinning(true); setErr("");
    try {
      const r = await fetch(`${apiBase()}/api/lion-slot/spin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, stake: s }) });
      const d = await r.json().catch(() => ({}));
      if (!d?.success) throw new Error(d?.error || "Spin failed");
      setRes(d);
      await refreshBalance();
    } catch (e: any) {
      setErr(e?.message || "Connection error");
    } finally { setSpinning(false); }
  };

  const wins = useMemo(() => res?.result?.wins || [], [res]);

  return <div className="pb-24 p-4 space-y-4">
    <div className="relative overflow-hidden rounded-3xl p-5" style={{ background: "linear-gradient(135deg, rgba(251,191,36,.18), rgba(0,209,255,.10), rgba(2,4,8,.92))", border: "1px solid rgba(251,191,36,.25)" }}>
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full blur-3xl" style={{ background: "#fbbf24", opacity: .22 }} />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: "rgba(251,191,36,.14)", border: "1px solid rgba(251,191,36,.40)" }}>🦁</div>
          <div><h1 className="text-2xl font-black tracking-wider">TunBet Lion Gold</h1><p className="text-xs text-white/45 mt-1">5 reels · 20 paylines · Wild · Scatter · Real TND balance</p></div>
        </div>
        <div className="text-right"><p className="text-[10px] text-white/35">Balance</p><p className="text-sm font-black" style={{ color: "#00D1FF" }}>{tnd(user?.balance)}</p></div>
      </div>
    </div>

    <div className="grid lg:grid-cols-[1fr_350px] gap-4">
      <div className="relative overflow-hidden rounded-3xl p-4 min-h-[420px]" style={{ background: "radial-gradient(circle at 50% 0%, rgba(251,191,36,.14), rgba(255,255,255,.035) 44%, rgba(2,4,8,.7))", border: "1px solid rgba(255,255,255,.08)" }}>
        <div className={`relative mx-auto max-w-[760px] rounded-3xl p-3 ${spinning ? "animate-pulse" : ""}`} style={{ background: "linear-gradient(180deg, rgba(255,255,255,.11), rgba(255,255,255,.035))", border: "1px solid rgba(251,191,36,.28)", boxShadow: "0 0 45px rgba(251,191,36,.12)" }}>
          <div className="grid grid-rows-3 gap-2">
            {grid.map((row, r) => <div key={r} className="grid grid-cols-5 gap-2">
              {row.map((cell, c) => {
                const s = SYMBOLS[cell] || SYMBOLS.coin;
                return <motion.div key={`${r}-${c}-${cell}-${res?.txid || "demo"}`} initial={{ scale: .84, opacity: .65 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: (r * 5 + c) * .015 }} className="aspect-square rounded-2xl flex flex-col items-center justify-center overflow-hidden" style={{ background: `linear-gradient(145deg, rgba(2,4,8,.86), ${s.color}22)`, border: `1px solid ${s.color}42` }}>
                  <span className="text-4xl md:text-6xl leading-none drop-shadow-lg">{s.emoji}</span><span className="text-[8px] mt-1 font-black uppercase tracking-wider" style={{ color: s.color }}>{s.label}</span>
                </motion.div>;
              })}
            </div>)}
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Last Win" value={tnd(res?.payout)} color={winTone} />
          <Stat label="Paylines" value="20" />
          <Stat label="Wins" value={String(wins.length)} />
        </div>
      </div>

      <div className="rounded-3xl p-4 space-y-4" style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)" }}>
        <div className="flex items-center gap-2"><Sparkles className="w-5 h-5" style={{ color: "#fbbf24" }} /><h2 className="text-lg font-black">Spin Panel</h2></div>
        <label className="block space-y-1"><span className="text-xs text-white/45">Stake</span><div className="flex gap-2"><input value={stake} onChange={e => setStake(e.target.value)} inputMode="decimal" className="flex-1 rounded-2xl px-4 py-3 outline-none font-black text-white" style={{ background: "rgba(2,4,8,.62)", border: "1px solid rgba(255,255,255,.09)" }} />{[1, 5, 10].map(v => <button key={v} onClick={() => setStake(String(v))} className="px-3 rounded-2xl text-xs font-black" style={{ background: "rgba(251,191,36,.14)", color: "#fbbf24" }}>{v}</button>)}</div></label>
        {err && <div className="p-3 rounded-xl text-sm text-center" style={{ background: "rgba(255,45,85,.1)", border: "1px solid rgba(255,45,85,.3)", color: "#FF2D55" }}>{err}</div>}
        <button disabled={spinning} onClick={spin} className="w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 text-[#020408]" style={{ background: spinning ? "rgba(255,255,255,.2)" : "linear-gradient(135deg,#fbbf24,#fff7ad)" }}>{spinning ? <RefreshCw className="w-5 h-5 animate-spin" /> : user ? <Zap className="w-5 h-5" /> : <Lock className="w-5 h-5" />} {spinning ? "SPINNING..." : "SPIN"}</button>
        <div className="grid grid-cols-2 gap-2 text-sm"><Info icon={<Wallet className="w-4 h-4" />} k="Min" v="0.50 TND" /><Info icon={<Trophy className="w-4 h-4" />} k="Max" v="200 TND" /><Info icon={<ShieldCheck className="w-4 h-4" />} k="Engine" v="Server RNG" /><Info icon={<Crown className="w-4 h-4" />} k="Jackpot" v="500x cap" /></div>
        {wins.length ? <div className="space-y-2"><p className="text-xs font-black text-white/45">Winning lines</p>{wins.slice(0, 7).map((w, i) => <div key={i} className="rounded-xl p-2 text-xs flex justify-between" style={{ background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.16)" }}><span>{w.line ? `Line ${w.line}` : "Scatter"} · {w.symbol} ×{w.count}</span><b style={{ color: "#22c55e" }}>{tnd(w.amount)}</b></div>)}</div> : null}
        {res?.result?.seedHash && <div className="rounded-2xl p-3 text-[10px] break-all" style={{ background: "rgba(2,4,8,.45)", color: "rgba(255,255,255,.40)" }}>Seed hash: {res.result.seedHash}</div>}
      </div>
    </div>
    {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
  </div>;
}

function Stat({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) { return <div className="rounded-2xl p-3" style={{ background: "rgba(2,4,8,.55)" }}><p className="text-[10px] text-white/35">{label}</p><p className="font-black" style={{ color }}>{value}</p></div>; }
function Info({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) { return <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.06)" }}><div className="flex items-center gap-1 text-white/35">{icon}<span className="text-[10px]">{k}</span></div><p className="font-black mt-1">{v}</p></div>; }
