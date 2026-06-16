import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Flame, Gem, Lock, RefreshCw, ShieldCheck, Sparkles, Trophy, Wallet, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";

const ASSET_BASE = "https://raw.githubusercontent.com/Ezechias22/zenyx-games-provider/main/public/assets";
const FALLBACK_GAMES: ZenyxGame[] = [
  { code: "fruit_classic", name: "Fruit Classic", theme: "Classic fruit machine", color: "#f59e0b", volatility: "MEDIUM", cover: `${ASSET_BASE}/fruit_classic/cover.png`, background: `${ASSET_BASE}/fruit_classic/background.jpg`, symbols: ["cherry","lemon","orange","watermelon","bell","bar","wild","scatter"].map(s => ({ key: s, url: `${ASSET_BASE}/fruit_classic/symbols/${s}.png` })) },
  { code: "egypt_riches", name: "Egypt Riches", theme: "Pharaoh bonus reels", color: "#fbbf24", volatility: "HIGH", cover: `${ASSET_BASE}/egypt_riches/cover.png`, background: `${ASSET_BASE}/egypt_riches/background.jpg`, symbols: ["ankh","cobra","coin","pharaoh","pyramid","scarab","wild","scatter"].map(s => ({ key: s, url: `${ASSET_BASE}/egypt_riches/symbols/${s}.png` })) },
  { code: "jungle_wild", name: "Jungle Wild", theme: "Wild jungle adventure", color: "#22c55e", volatility: "MEDIUM", cover: `${ASSET_BASE}/jungle_wild/cover.png`, background: `${ASSET_BASE}/jungle_wild/background.jpg`, symbols: ["banana","coin","leaf","parrot","snake","tiger","wild","scatter"].map(s => ({ key: s, url: `${ASSET_BASE}/jungle_wild/symbols/${s}.png` })) },
  { code: "luxury_gold", name: "Luxury Gold", theme: "VIP gold vault", color: "#eab308", volatility: "MEDIUM", cover: `${ASSET_BASE}/luxury_gold/cover.png`, background: `${ASSET_BASE}/luxury_gold/background.jpg`, symbols: ["briefcase","coins","crown","diamond","gold_bar","ring","wild","scatter"].map(s => ({ key: s, url: `${ASSET_BASE}/luxury_gold/symbols/${s}.png` })) },
  { code: "diamond_rush", name: "Diamond Rush", theme: "Gemstone reels", color: "#38bdf8", volatility: "HIGH", cover: `${ASSET_BASE}/diamond_rush/cover.png`, background: `${ASSET_BASE}/diamond_rush/background.jpg`, symbols: ["blue_sapphire","briefcase","diamond","emerald","ruby","vault_lock","wild","scatter"].map(s => ({ key: s, url: `${ASSET_BASE}/diamond_rush/symbols/${s}.png` })) },
  { code: "fire_reels", name: "Fire Reels", theme: "Hot industrial reels", color: "#f97316", volatility: "HIGH", cover: `${ASSET_BASE}/fire_reels/cover.png`, background: `${ASSET_BASE}/fire_reels/background.jpg`, symbols: ["bell","ember_crystal","explosion","flame_core","gear","steel_bar","wild","scatter"].map(s => ({ key: s, url: `${ASSET_BASE}/fire_reels/symbols/${s}.png` })) },
  { code: "mystic_fortune", name: "Mystic Fortune", theme: "Mystic magic bonus", color: "#a855f7", volatility: "MEDIUM", cover: `${ASSET_BASE}/mystic_fortune/cover.png`, background: `${ASSET_BASE}/mystic_fortune/background.jpg`, symbols: ["amulet","bell","gemstone","key","magic_orb","scroll","wild","scatter"].map(s => ({ key: s, url: `${ASSET_BASE}/mystic_fortune/symbols/${s}.png` })) },
];

type ZenyxGame = {
  code: string;
  name: string;
  theme: string;
  color: string;
  volatility: string;
  cover: string;
  background: string;
  symbols: Array<{ key: string; url: string }>;
};

type SpinResponse = {
  success?: boolean;
  error?: string;
  gameName?: string;
  stake?: number;
  payout?: number;
  profit?: number;
  balance?: number;
  txid?: string;
  result?: {
    grid: string[][];
    wins: Array<{ line: number; symbol: string; count: number; multiplier: number; amount: number; bonus?: string }>;
    totalWin: number;
    seedHash: string;
    paylines: number;
  };
};

function apiBase() {
  const w = window as any;
  return (w.__TUNBET_SPORTSBOOK_API__ || localStorage.getItem("tunbet_sportsbook_api") || "https://tunbet-sportsbook.onrender.com").replace(/\/$/, "");
}
function tnd(v: any) { return `${Number(v || 0).toFixed(2)} TND`; }

export default function Zenyx() {
  const { user, refreshBalance } = useAuth();
  const [games, setGames] = useState<ZenyxGame[]>(FALLBACK_GAMES);
  const [activeCode, setActiveCode] = useState(FALLBACK_GAMES[1].code);
  const [stake, setStake] = useState("1");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResponse | null>(null);
  const [err, setErr] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    fetch(`${apiBase()}/api/zenyx/games`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d?.success && Array.isArray(d.games)) setGames(d.games); })
      .catch(() => {});
  }, []);

  const active = useMemo(() => games.find(g => g.code === activeCode) || games[0], [games, activeCode]);
  const symbolMap = useMemo(() => Object.fromEntries((active?.symbols || []).map(s => [s.key, s.url])), [active]);
  const grid = result?.result?.grid || [["wild","scatter","wild","scatter","wild"],["scatter","wild","scatter","wild","scatter"],["wild","scatter","wild","scatter","wild"]];

  const spin = async () => {
    if (!user) { setShowAuth(true); return; }
    const s = Number(stake);
    if (!Number.isFinite(s) || s < 0.2) { setErr("Minimum spin 0.20 TND"); return; }
    setSpinning(true); setErr(""); setResult(null);
    try {
      const r = await fetch(`${apiBase()}/api/zenyx/spin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, gameCode: active.code, stake: s }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d?.success) throw new Error(d?.error || "Zenyx server is not ready yet");
      setResult(d);
      await refreshBalance();
    } catch (e: any) {
      setErr(e?.message || "Connection error");
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="pb-24 p-4 space-y-4">
      <div className="relative overflow-hidden rounded-3xl p-5" style={{ background: `linear-gradient(135deg, rgba(0,209,255,0.16), ${active.color}22, rgba(2,4,8,0.85))`, border: "1px solid rgba(255,255,255,0.10)" }}>
        <img src={active.background} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(2,4,8,0.96), rgba(2,4,8,0.45))" }} />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider" style={{ background: `${active.color}22`, color: active.color }}>NEW PROVIDER</span>
              <span className="text-[10px] text-white/45">Zenyx raw provider assets · Real TND wallet</span>
            </div>
            <h1 className="text-2xl font-black tracking-wider text-white">Zenyx Premium Slots</h1>
            <p className="text-xs text-white/45 mt-1">7 premium reel games imported into TunBet · 20 paylines · server spin</p>
          </div>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${active.color}18`, border: `1px solid ${active.color}55` }}>
            <Crown className="w-7 h-7" style={{ color: active.color }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {games.map((g, i) => {
          const on = g.code === active.code;
          return (
            <motion.button key={g.code} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
              onClick={() => { setActiveCode(g.code); setResult(null); setErr(""); }}
              className="relative rounded-2xl overflow-hidden text-left min-h-[112px]"
              style={{ border: on ? `1px solid ${g.color}` : "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
              <img src={g.cover} alt={g.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(2,4,8,0.95), rgba(2,4,8,0.10))" }} />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-[9px] font-black" style={{ color: g.color }}>{g.volatility}</p>
                <h3 className="text-sm font-black text-white truncate">{g.name}</h3>
                <p className="text-[10px] text-white/40 truncate">{g.theme}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="relative overflow-hidden rounded-3xl p-4 min-h-[420px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <img src={active.background} className="absolute inset-0 w-full h-full object-cover opacity-25" alt="" />
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 0%, rgba(0,209,255,0.12), rgba(2,4,8,0.84) 56%)" }} />
          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${active.color}18`, border: `1px solid ${active.color}55` }}>
                <Gem className="w-6 h-6" style={{ color: active.color }} />
              </div>
              <div><h2 className="text-xl font-black">{active.name}</h2><p className="text-xs text-white/40">RTP 96% · {active.volatility} volatility · TND</p></div>
            </div>
            <div className="text-right"><p className="text-[10px] text-white/35">Balance</p><p className="text-sm font-black" style={{ color: "#00D1FF" }}>{tnd(user?.balance)}</p></div>
          </div>

          <div className={`relative mx-auto max-w-[760px] rounded-3xl p-3 ${spinning ? "animate-pulse" : ""}`} style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))", border: `1px solid ${active.color}40`, boxShadow: `0 0 40px ${active.color}18` }}>
            <div className="grid grid-rows-3 gap-2">
              {grid.map((row, r) => (
                <div key={r} className="grid grid-cols-5 gap-2">
                  {row.map((cell, c) => (
                    <div key={`${r}-${c}-${cell}`} className="aspect-square rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: "rgba(2,4,8,0.72)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {symbolMap[cell] ? <img src={symbolMap[cell]} alt={cell} className="w-full h-full object-contain p-1" /> : <span className="text-xs text-white/30">{cell}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl p-3" style={{ background: "rgba(2,4,8,0.55)" }}><p className="text-[10px] text-white/35">Last win</p><p className="font-black" style={{ color: (result?.payout || 0) > 0 ? "#22c55e" : "rgba(255,255,255,0.45)" }}>{tnd(result?.payout)}</p></div>
            <div className="rounded-2xl p-3" style={{ background: "rgba(2,4,8,0.55)" }}><p className="text-[10px] text-white/35">Paylines</p><p className="font-black">20</p></div>
            <div className="rounded-2xl p-3" style={{ background: "rgba(2,4,8,0.55)" }}><p className="text-[10px] text-white/35">Wins</p><p className="font-black">{result?.result?.wins?.length || 0}</p></div>
          </div>
        </div>

        <div className="rounded-3xl p-4 space-y-4" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5" style={{ color: active.color }} /><h2 className="text-lg font-black">Spin Panel</h2></div>
          <label className="block space-y-1"><span className="text-xs text-white/45">Stake</span><div className="flex gap-2"><input value={stake} onChange={e => setStake(e.target.value)} inputMode="decimal" className="flex-1 rounded-2xl px-4 py-3 outline-none font-black text-white" style={{ background: "rgba(2,4,8,0.62)", border: "1px solid rgba(255,255,255,0.09)" }} />{[1,5,10].map(v => <button key={v} onClick={() => setStake(String(v))} className="px-3 rounded-2xl text-xs font-black" style={{ background: `${active.color}18`, color: active.color }}>{v}</button>)}</div></label>
          {err && <div className="p-3 rounded-xl text-sm text-center" style={{ background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", color: "#FF2D55" }}>{err}</div>}
          <button disabled={spinning} onClick={spin} className="w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 text-[#020408]" style={{ background: spinning ? "rgba(255,255,255,0.20)" : `linear-gradient(135deg, ${active.color}, #ffffff)` }}>
            {spinning ? <RefreshCw className="w-5 h-5 animate-spin" /> : user ? <Zap className="w-5 h-5" /> : <Lock className="w-5 h-5" />} {spinning ? "SPINNING..." : "SPIN"}
          </button>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Info icon={<Wallet className="w-4 h-4" />} k="Min" v="0.20 TND" />
            <Info icon={<Flame className="w-4 h-4" />} k="Max" v="500 TND" />
            <Info icon={<ShieldCheck className="w-4 h-4" />} k="Engine" v="Server" />
            <Info icon={<Trophy className="w-4 h-4" />} k="RTP" v="96%" />
          </div>
          {result?.result?.wins?.length ? <div className="space-y-2"><p className="text-xs font-black text-white/45">Winning lines</p>{result.result.wins.slice(0, 6).map((w, i) => <div key={i} className="rounded-xl p-2 text-xs flex justify-between" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.16)" }}><span>{w.line ? `Line ${w.line}` : "Scatter"} · {w.symbol} ×{w.count}</span><b style={{ color: "#22c55e" }}>{tnd(w.amount)}</b></div>)}</div> : null}
          {result?.result?.seedHash && <div className="rounded-2xl p-3 text-[10px] break-all" style={{ background: "rgba(2,4,8,0.45)", color: "rgba(255,255,255,0.40)" }}>Seed hash: {result.result.seedHash}</div>}
        </div>
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

function Info({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}><div className="flex items-center gap-1 text-white/35">{icon}<span className="text-[10px]">{k}</span></div><p className="font-black mt-1">{v}</p></div>;
}
