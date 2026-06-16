import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bomb, CircleDollarSign, Dice5, Gem, Rocket, ShieldCheck, Sparkles, Target, Wallet, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";

const API_BASE = () => {
  const w = window as any;
  return (w.__TUNBET_SPORTSBOOK_API__ || localStorage.getItem("tunbet_sportsbook_api") || "https://tunbet-sportsbook.onrender.com").replace(/\/$/, "");
};

type GameKey = "dice" | "mines" | "plinko" | "limbo" | "keno";

type PlayResult = {
  success?: boolean;
  error?: string;
  stake?: number;
  payout?: number;
  profit?: number;
  balance?: number;
  outcome?: any;
  txid?: string;
};

const GAMES: Array<{ key: GameKey; name: string; ar: string; icon: any; color: string; sub: string }> = [
  { key: "dice", name: "Dice", ar: "النرد", icon: Dice5, color: "#00D1FF", sub: "Over / Under · up to 19.8x" },
  { key: "mines", name: "Mines", ar: "الألغام", icon: Bomb, color: "#f59e0b", sub: "Pick safe tiles · dynamic odds" },
  { key: "plinko", name: "Plinko", ar: "بلينكو", icon: Gem, color: "#a855f7", sub: "Low / Medium / High risk" },
  { key: "limbo", name: "Limbo", ar: "ليمبو", icon: Rocket, color: "#22c55e", sub: "Choose target multiplier" },
  { key: "keno", name: "Keno", ar: "كينو", icon: Target, color: "#FF2D55", sub: "10-ball draw · up to 250x" },
];

function money(n: any) { return `${Number(n || 0).toFixed(2)} TND`; }
function n2(n: any) { return Number(n || 0).toFixed(2); }

export default function Originals() {
  const { user, refreshBalance } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [game, setGame] = useState<GameKey>("dice");
  const [stake, setStake] = useState("1");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [err, setErr] = useState("");
  const [buyOpen, setBuyOpen] = useState(false);

  // Game params
  const [diceMode, setDiceMode] = useState<"over" | "under">("over");
  const [diceTarget, setDiceTarget] = useState(50);
  const [mines, setMines] = useState(5);
  const [minePicks, setMinePicks] = useState(5);
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [limboTarget, setLimboTarget] = useState(2);
  const [kenoPicks, setKenoPicks] = useState(6);

  const active = GAMES.find(g => g.key === game)!;

  const preview = useMemo(() => {
    if (game === "dice") {
      const chance = diceMode === "over" ? 100 - diceTarget : diceTarget;
      return `${(99 / chance).toFixed(2)}x`;
    }
    if (game === "limbo") return `${Number(limboTarget).toFixed(2)}x`;
    if (game === "mines") return `${mines} mines · ${minePicks} picks`;
    if (game === "plinko") return `${risk.toUpperCase()} risk`;
    return `${kenoPicks} picks`;
  }, [game, diceMode, diceTarget, limboTarget, mines, minePicks, risk, kenoPicks]);

  const params = () => {
    if (game === "dice") return { mode: diceMode, target: diceTarget };
    if (game === "mines") return { mines, picks: minePicks };
    if (game === "plinko") return { risk };
    if (game === "limbo") return { target: limboTarget };
    return { picks: kenoPicks };
  };

  const play = async () => {
    if (!user) { setShowAuth(true); return; }
    const s = Number(stake);
    if (!Number.isFinite(s) || s < 0.1) { setErr("Minimum bet is 0.10 TND"); return; }
    setBusy(true); setErr(""); setResult(null);
    try {
      const r = await fetch(`${API_BASE()}/api/originals/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, game, stake: s, params: params() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d?.success) throw new Error(d?.error || "Game server unavailable");
      setResult(d);
      await refreshBalance();
    } catch (e: any) {
      setErr(e?.message || "Connection error");
    } finally {
      setBusy(false);
    }
  };

  const o = result?.outcome || {};
  const Icon = active.icon;

  return (
    <div className="pb-24 p-4 space-y-4">
      <div className="relative overflow-hidden rounded-3xl p-5" style={{ background: "linear-gradient(135deg, rgba(0,209,255,0.18), rgba(168,85,247,0.12), rgba(255,45,85,0.08))", border: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl" style={{ background: active.color, opacity: 0.25 }} />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${active.color}22`, border: `1px solid ${active.color}55` }}>
            <Sparkles className="w-6 h-6" style={{ color: active.color }} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider">TunBet Originals</h1>
            <p className="text-xs text-white/45">ألعاب أصلية مثل Stake بدون أي مزود مدفوع · رصيد TND حقيقي</p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl p-3" style={{ background: "rgba(2,4,8,0.45)" }}><p className="text-[10px] text-white/40">Balance</p><p className="text-sm font-black" style={{ color: "#00D1FF" }}>{money(user?.balance)}</p></div>
          <div className="rounded-2xl p-3" style={{ background: "rgba(2,4,8,0.45)" }}><p className="text-[10px] text-white/40">Engine</p><p className="text-sm font-black">Server RNG</p></div>
          <button onClick={() => setBuyOpen(true)} className="rounded-2xl p-3" style={{ background: "rgba(34,197,94,0.13)", border: "1px solid rgba(34,197,94,0.35)" }}><Wallet className="w-4 h-4 mx-auto mb-1" style={{ color: "#22c55e" }} /><p className="text-xs font-black" style={{ color: "#22c55e" }}>شراء رصيد</p></button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {GAMES.map((g, i) => {
          const I = g.icon; const on = g.key === game;
          return <motion.button key={g.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => { setGame(g.key); setResult(null); setErr(""); }}
            className="rounded-2xl p-2 min-h-[74px] flex flex-col items-center justify-center gap-1"
            style={{ background: on ? `${g.color}20` : "rgba(255,255,255,0.04)", border: on ? `1px solid ${g.color}80` : "1px solid rgba(255,255,255,0.07)" }}>
            <I className="w-5 h-5" style={{ color: on ? g.color : "rgba(255,255,255,0.45)" }} />
            <span className="text-[10px] font-black" style={{ color: on ? g.color : "rgba(255,255,255,0.55)" }}>{g.name}</span>
          </motion.button>;
        })}
      </div>

      <div className="grid md:grid-cols-[1fr_1.25fr] gap-4">
        <div className="rounded-3xl p-4 space-y-4" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" style={{ color: active.color }} />
            <div><h2 className="text-lg font-black">{active.name} <span className="text-white/35 text-sm">/ {active.ar}</span></h2><p className="text-xs text-white/40">{active.sub}</p></div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-white/45">Stake / الرهان</span>
            <div className="flex gap-2">
              <input value={stake} onChange={e => setStake(e.target.value)} inputMode="decimal" className="flex-1 rounded-2xl px-4 py-3 outline-none text-white font-black" style={{ background: "rgba(2,4,8,0.65)", border: "1px solid rgba(255,255,255,0.09)" }} />
              {[1, 5, 10].map(v => <button key={v} onClick={() => setStake(String(v))} className="px-3 rounded-2xl text-xs font-black" style={{ background: "rgba(0,209,255,0.10)", color: "#00D1FF" }}>{v}</button>)}
            </div>
          </label>

          {game === "dice" && <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2"><button onClick={() => setDiceMode("over")} className="py-2 rounded-xl font-black" style={{ background: diceMode === "over" ? "rgba(0,209,255,0.18)" : "rgba(255,255,255,0.05)", color: diceMode === "over" ? "#00D1FF" : "#fff" }}>Roll Over</button><button onClick={() => setDiceMode("under")} className="py-2 rounded-xl font-black" style={{ background: diceMode === "under" ? "rgba(0,209,255,0.18)" : "rgba(255,255,255,0.05)", color: diceMode === "under" ? "#00D1FF" : "#fff" }}>Roll Under</button></div>
            <label className="text-xs text-white/45">Target: {diceTarget}</label><input type="range" min="5" max="95" value={diceTarget} onChange={e => setDiceTarget(Number(e.target.value))} className="w-full" />
          </div>}

          {game === "mines" && <div className="grid grid-cols-2 gap-3"><label className="space-y-1"><span className="text-xs text-white/45">Mines</span><input value={mines} onChange={e => setMines(Number(e.target.value))} type="number" min="1" max="20" className="w-full rounded-xl p-3 bg-black/30" /></label><label className="space-y-1"><span className="text-xs text-white/45">Safe picks</span><input value={minePicks} onChange={e => setMinePicks(Number(e.target.value))} type="number" min="1" max="20" className="w-full rounded-xl p-3 bg-black/30" /></label></div>}

          {game === "plinko" && <div className="grid grid-cols-3 gap-2">{(["low", "medium", "high"] as const).map(r => <button key={r} onClick={() => setRisk(r)} className="py-3 rounded-xl font-black uppercase text-xs" style={{ background: risk === r ? `${active.color}25` : "rgba(255,255,255,0.05)", color: risk === r ? active.color : "#fff" }}>{r}</button>)}</div>}

          {game === "limbo" && <label className="block space-y-1"><span className="text-xs text-white/45">Target multiplier</span><input value={limboTarget} onChange={e => setLimboTarget(Number(e.target.value))} type="number" min="1.1" max="100" step="0.1" className="w-full rounded-xl p-3 bg-black/30" /></label>}

          {game === "keno" && <label className="block space-y-1"><span className="text-xs text-white/45">Numbers picked: {kenoPicks}</span><input type="range" min="3" max="10" value={kenoPicks} onChange={e => setKenoPicks(Number(e.target.value))} className="w-full" /></label>}

          <div className="rounded-2xl p-3 flex items-center justify-between" style={{ background: "rgba(2,4,8,0.45)" }}><span className="text-xs text-white/45">Setup</span><span className="text-sm font-black" style={{ color: active.color }}>{preview}</span></div>
          {err && <div className="p-3 rounded-xl text-sm text-center" style={{ background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", color: "#FF2D55" }}>{err}</div>}
          <button disabled={busy} onClick={play} className="w-full py-4 rounded-2xl font-black text-[#020408] flex items-center justify-center gap-2" style={{ background: busy ? "rgba(255,255,255,0.18)" : `linear-gradient(135deg, ${active.color}, #ffffff)` }}>
            {busy ? <span className="w-5 h-5 rounded-full border-2 border-black/40 border-t-transparent animate-spin" /> : <Zap className="w-5 h-5" />} PLAY NOW
          </button>
        </div>

        <div className="rounded-3xl p-4 min-h-[360px] flex flex-col" style={{ background: "radial-gradient(circle at 50% 0%, rgba(0,209,255,0.12), rgba(255,255,255,0.035) 45%, rgba(2,4,8,0.55))", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-black tracking-wider">RESULT</h2><ShieldCheck className="w-5 h-5" style={{ color: "#22c55e" }} /></div>
          {!result ? <div className="flex-1 flex items-center justify-center text-center text-white/35"><div><CircleDollarSign className="w-16 h-16 mx-auto mb-3 opacity-30" /><p>Choose a game and press PLAY</p><p className="text-xs mt-1">النتائج من السيرفر وليست من المتصفح</p></div></div> : <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 space-y-4">
            <div className="rounded-3xl p-5 text-center" style={{ background: result.payout && result.payout > 0 ? "rgba(34,197,94,0.12)" : "rgba(255,45,85,0.10)", border: `1px solid ${result.payout && result.payout > 0 ? "rgba(34,197,94,0.35)" : "rgba(255,45,85,0.30)"}` }}>
              <p className="text-xs text-white/45">{o.win ? "WIN" : "LOSS"}</p>
              <p className="text-4xl font-black my-2" style={{ color: o.win ? "#22c55e" : "#FF2D55" }}>{money(result.payout)}</p>
              <p className="text-xs text-white/45">Profit: {money(result.profit)} · x{n2(o.multiplier)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {o.roll !== undefined && <Stat k="Roll" v={n2(o.roll)} />}
              {o.crash !== undefined && <Stat k="Crash" v={`${n2(o.crash)}x`} />}
              {o.slot !== undefined && <Stat k="Slot" v={o.slot} />}
              {o.hits !== undefined && <Stat k="Hits" v={`${o.hits}/${o.picks}`} />}
              <Stat k="New Balance" v={money(result.balance)} />
              <Stat k="TX" v={String(result.txid || "").slice(-10)} />
            </div>
            {o.player && <div className="text-xs text-white/45">Keno picks: {o.player.join(", ")}<br />Drawn: {o.drawn.join(", ")}</div>}
            <div className="p-3 rounded-2xl text-[10px] break-all" style={{ background: "rgba(2,4,8,0.45)", color: "rgba(255,255,255,0.42)" }}>Server seed hash: {o.serverSeedHash}</div>
          </motion.div>}
        </div>
      </div>

      {buyOpen && <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={() => setBuyOpen(false)}>
        <div className="w-full max-w-md rounded-3xl p-5" style={{ background: "#070B14", border: "1px solid rgba(0,209,255,0.25)" }} onClick={e => e.stopPropagation()}>
          <h2 className="text-lg font-black mb-2">شراء رصيد TND</h2>
          <p className="text-sm text-white/55 leading-6">لإضافة رصيد حقيقي إلى حسابك، تواصل مع الوكيل أو الإدارة. بعد الدفع يقوم الوكيل بإضافة الرصيد فوراً من لوحة Agent/Admin.</p>
          <div className="mt-4 grid grid-cols-2 gap-2"><a href="/agent" className="text-center rounded-2xl py-3 font-black" style={{ background: "rgba(0,209,255,0.15)", color: "#00D1FF" }}>Agent Panel</a><button onClick={() => setBuyOpen(false)} className="rounded-2xl py-3 font-black bg-white/5">إغلاق</button></div>
        </div>
      </div>}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: any }) {
  return <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}><p className="text-[10px] text-white/35">{k}</p><p className="font-black truncate">{v}</p></div>;
}
