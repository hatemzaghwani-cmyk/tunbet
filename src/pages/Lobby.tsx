
import { t } from "@/lib/i18n";
import { Search, LayoutGrid, Gamepad2, Lock, RefreshCw, Flame, Crown, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { apiGames, apiGameProviders, apiLaunchGame, apiSyncBalance } from "@/lib/localApi";
import { useLocation } from "wouter";
import { SLOTOPOL_GAMES, SLOTOPOL_PROVIDER_ID } from "@/lib/slotopolGames";
import { apiSlotopolSpin, type SlotopolSpinResult } from "@/lib/slotopolApi";




const PAGE_SIZE = 60;

const BANNERS = [
  { img: "/images/banner1.jpg", text: "TUNBET CASINO", sub: "1577+ Games • Play & Win" },
  { img: "/images/banner2.jpg", text: "SPORTS BETTING", sub: "Real Odds • Live Matches" },
  { img: "/images/banner3.jpg", text: "LIVE CASINO", sub: "Real Dealers • 24/7" },
];

function BannerSlider() {
  const [idx, setIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setIdx(i => (i + 1) % BANNERS.length), 4000); return () => clearInterval(t); }, []);
  const b = BANNERS[idx];
  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ height: 140 }}>
      <img src={b.img} alt="" className="w-full h-full object-cover" style={{ transition: "opacity 0.5s" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(2,4,8,0.85) 0%, rgba(2,4,8,0.3) 100%)" }} />
      <div className="absolute inset-0 flex flex-col justify-center p-5">
        <h2 className="font-black text-lg tracking-wider" style={{ color: "#00D1FF" }}>{b.text}</h2>
        <p className="text-xs text-white/50 mt-1">{b.sub}</p>
      </div>
      <div className="absolute bottom-3 right-3 flex gap-1">
        {BANNERS.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} className="rounded-full" style={{ width: 6, height: 6, background: i === idx ? "#00D1FF" : "rgba(255,255,255,0.2)", transition: "all 0.3s" }} />
        ))}
      </div>
    </div>
  );
}

interface AesGame {
  provider_id: number;
  game_code: string;
  game_name: string;
  locale_name: string;
  game_image: string;
  game_image_narrow: string;
  launch_enable: boolean;
  category: string;
  source?: "aes" | "slotopol";
  slotopolAlias?: string;
  slotopolProvider?: string;
  slotopolDetails?: string;
  slotopolKind?: "slot" | "keno";
  slotopolDims?: string;
}

interface Provider {
  provider_id: number;
  provider_name: string;
  locale_name: string;
  status: number;
}

const PROVIDER_COLORS: Record<number, string> = {
  1: "#FF6B35", 2: "#00D1FF", 3: "#a855f7", 4: "#22c55e",
  5: "#f59e0b", 7: "#ec4899", 9: "#14b8a6", 12: "#8b5cf6",
  13: "#ef4444", 14: "#06b6d4", 15: "#84cc16", 16: "#f97316",
  20: "#6366f1", 23: "#e11d48",
};

// Popular keywords to sort first
const POPULAR = ['sweet bonanza','gates of olympus','starlight princess','dog house','wolf gold',
  'sugar rush','big bass','fruit party','book of','wild west','money train','wanted dead',
  'aviator','spaceman','mines','plinko','buffalo','zeus','dragon','lucky','fortune','treasure',
  'joker','fire','gold','diamond','wild','magic','king','queen','pharaoh','cleopatra'];

// Pin this game as #1
const FIRST_GAME_CODE = 'vswayslions'; // 5 Lions Megaways

// Pin these games at top after first
const PINNED_CODES = ['vswayslions', 'vs20olympgate', 'bg25plinko'];

export default function Lobby() {
  const { user, token, refreshBalance } = useAuth();
  const [, navigate] = useLocation();
  const [activeProvider, setActiveProvider] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [allGames, setAllGames] = useState<AesGame[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [launchingGame, setLaunchingGame] = useState<string | null>(null);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<AesGame | null>(null);
  const [closingGame, setClosingGame] = useState(false);
  const [slotopolGame, setSlotopolGame] = useState<AesGame | null>(null);
  const [slotopolStake, setSlotopolStake] = useState("1");
  const [slotopolResult, setSlotopolResult] = useState<SlotopolSpinResult | null>(null);
  const [slotopolSpinning, setSlotopolSpinning] = useState(false);

  const [showAuth, setShowAuth] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const [page, setPage] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Removed auto-sync to prevent balance issues
  }, []);

  useEffect(() => {
    setLoadingGames(true);
    Promise.all([apiGames(), apiGameProviders()])
      .then(([gData, pData]) => {
        const gd = gData as { code?: number; data?: AesGame[] };
        const pd = pData as { code?: number; data?: Provider[] };
        if (gd.code === 0 && Array.isArray(gd.data)) setAllGames(gd.data);
        if (pd.code === 0 && Array.isArray(pd.data)) setProviders(pd.data.filter(p => p.status === 1));
      })
      .catch(() => {}).finally(() => setLoadingGames(false));
  }, []);

  // Smart sort: popular first, then interleave providers so no same-provider clusters
  // NOTE: BGaming (20) and Amatic/CQ9 (2) are hidden from the lobby.
  const HIDDEN_PROVIDERS = new Set<number>([20, 2]);
  const games = useMemo(() => {
    const aesGames = allGames
      .filter(g => g.launch_enable && !HIDDEN_PROVIDERS.has(g.provider_id))
      .map(g => ({ ...g, source: "aes" as const }));
    const slotopolGames: AesGame[] = SLOTOPOL_GAMES.map(g => ({
      provider_id: SLOTOPOL_PROVIDER_ID,
      game_code: g.alias,
      game_name: g.name,
      locale_name: g.name,
      game_image: "",
      game_image_narrow: "",
      launch_enable: true,
      category: g.kind,
      source: "slotopol" as const,
      slotopolAlias: g.alias,
      slotopolProvider: g.provider,
      slotopolDetails: g.details,
      slotopolKind: g.kind,
      slotopolDims: g.dims,
    }));
    const enabled = [...slotopolGames, ...aesGames];

    // Score each game: popular games get high score
    const scored = enabled.map(g => {
      const name = g.game_name.toLowerCase();
      let score = 0;
      for (const p of POPULAR) { if (name.includes(p)) { score += 100; break; } }
      // Slotopol + Pragmatic Play bonus
      if (g.provider_id === SLOTOPOL_PROVIDER_ID) score += 35;
      if (g.provider_id === 1) score += 50;
      // Hacksaw, BGaming, Spribe bonus
      if ([15, 16, 20].includes(g.provider_id)) score += 30;
      return { ...g, _score: score };
    });

    // Sort by score desc, then interleave providers to avoid same-provider clusters
    scored.sort((a, b) => b._score - a._score);

    // For non-popular games, interleave by provider
    const popular = scored.filter(g => g._score >= 100);
    const rest = scored.filter(g => g._score < 100);

    // Interleave rest by provider
    const byProvider: Record<number, AesGame[]> = {};
    for (const g of rest) {
      if (!byProvider[g.provider_id]) byProvider[g.provider_id] = [];
      byProvider[g.provider_id].push(g);
    }
    const providerIds = Object.keys(byProvider).map(Number);
    const interleaved: AesGame[] = [];
    let maxLen = Math.max(...providerIds.map(id => byProvider[id].length));
    for (let i = 0; i < maxLen; i++) {
      for (const pid of providerIds) {
        if (byProvider[pid][i]) interleaved.push(byProvider[pid][i]);
      }
    }

    // Interleave popular games too — no same-name games adjacent
    const popularByBase: Record<string, AesGame[]> = {};
    for (const g of popular) {
      // Group by base name (e.g. "The Dog House" variations)
      const base = g.game_name.replace(/\s*(Megaways|Dice|Multihold|Royal Hunt|Muttley|Dog or Alive|Super Scatter|1000|Xmas|™|2).*$/i, '').trim().toLowerCase();
      if (!popularByBase[base]) popularByBase[base] = [];
      popularByBase[base].push(g);
    }
    // Take one from each group in round-robin to spread them out
    const spreadPopular: AesGame[] = [];
    const groups = Object.values(popularByBase);
    const maxGroupLen = Math.max(...groups.map(g => g.length), 0);
    for (let i = 0; i < maxGroupLen; i++) {
      for (const group of groups) {
        if (group[i]) spreadPopular.push(group[i]);
      }
    }

    // Put pinned games first in order
    const all = [...spreadPopular, ...interleaved];
    const pinnedGames: AesGame[] = [];
    for (const code of PINNED_CODES) {
      const idx = all.findIndex(g => g.game_code === code);
      if (idx >= 0) {
        pinnedGames.push(all.splice(idx, 1)[0]);
      }
    }
    return [...pinnedGames, ...all];
  }, [allGames]);

  useEffect(() => { setPage(1); }, [activeProvider, search]);

  const filtered = useMemo(() => {
    return games.filter(g => {
      const matchProv = activeProvider === null || g.provider_id === activeProvider;
      const matchSearch = !search || g.game_name.toLowerCase().includes(search.toLowerCase());
      return matchProv && matchSearch;
    });
  }, [games, activeProvider, search]);

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const allProviders = useMemo(() => {
    const active = providers.filter(p => p.status === 1 && !HIDDEN_PROVIDERS.has(p.provider_id) && games.some(g => g.provider_id === p.provider_id));
    return [
      { provider_id: SLOTOPOL_PROVIDER_ID, provider_name: "slotopol", locale_name: "Slotopol API", status: 1 },
      ...active,
    ];
  }, [providers, games]);
  const getProviderName = (id: number, game?: AesGame) =>
    id === SLOTOPOL_PROVIDER_ID ? (game?.slotopolProvider || "Slotopol API") : (allProviders.find(p => p.provider_id === id)?.locale_name ?? "");

  // Top picks (first 8 from scored popular)
  const topPicks = useMemo(() => games.slice(0, 8), [games]);

  // Launch games via API providers (AES or Slotopol API adapter)
  const launchGame = async (game: AesGame) => {
    if (!user || !token) { setShowAuth(true); return; }
    if (game.source === "slotopol") {
      if (parseFloat(user.balance) < 0.2) {
        setLaunchError(t("insufficientBalance") + " — تواصل مع الإدارة لشحن رصيدك");
        setTimeout(() => setLaunchError(""), 4500); return;
      }
      setSlotopolGame(game);
      setSlotopolResult(null);
      setSlotopolStake("1");
      return;
    }
    // Strict client-side guards (server-side guard in apiLaunchGame is the source of truth)
    if (launchingGame) return;                  // prevent double-click on any card
    if (gameUrl) return;                         // can't launch while another game is open
    if (closingGame) return;                     // can't launch while closing previous
    if (parseFloat(user.balance) <= 0) {
      setLaunchError(t("insufficientBalance") + " — تواصل مع الإدارة لشحن رصيدك");
      setTimeout(() => setLaunchError(""), 4500); return;
    }
    setLaunchingGame(game.game_code); setLaunchError("");
    try {
      const result = await apiLaunchGame(token, game.game_code, game.provider_id);
      if (result.url) {
        setGameUrl(result.url);
        setActiveGame(game);
        await refreshBalance();  // reflects 0 balance during play
      } else {
        setLaunchError(result.error ?? t("noGames"));
        setTimeout(() => setLaunchError(""), 5000);
        await refreshBalance();  // refresh in case rollback happened
      }
    } catch (e: any) {
      setLaunchError(e?.message || "خطأ في الاتصال");
      setTimeout(() => setLaunchError(""), 4000);
      await refreshBalance();
    } finally {
      setLaunchingGame(null);
    }
  };

  const spinSlotopol = async () => {
    if (!slotopolGame || !user) return;
    const amount = parseFloat(slotopolStake);
    if (!Number.isFinite(amount) || amount < 0.2) { setLaunchError("Min spin: 0.20 TND"); setTimeout(() => setLaunchError(""), 3000); return; }
    if (amount > parseFloat(user.balance)) { setLaunchError("Insufficient balance"); setTimeout(() => setLaunchError(""), 3000); return; }
    if (slotopolSpinning) return;
    setSlotopolSpinning(true);
    try {
      const result = await apiSlotopolSpin(user.id, slotopolGame.slotopolAlias || slotopolGame.game_code, amount);
      setSlotopolResult(result);
      if (result.success) await refreshBalance();
      else { setLaunchError(result.error || "Slotopol spin failed"); setTimeout(() => setLaunchError(""), 3500); }
    } finally {
      setSlotopolSpinning(false);
    }
  };

  const closeGame = async () => {
    if (!user || !token) { setGameUrl(null); setActiveGame(null); return; }
    if (closingGame) return;  // prevent double-close
    setClosingGame(true);
    setGameUrl(null); setActiveGame(null);
    try {
      // Wait briefly so AES finalizes round, then sync wallet → Supabase (atomic, locked)
      await new Promise(r => setTimeout(r, 1500));
      await apiSyncBalance(token);
      await refreshBalance();
    } catch {}
    setClosingGame(false);
  };

  const GameCard = ({ game, i, size = "normal" }: { game: AesGame; i: number; size?: "normal" | "large" | "wide" }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(i * 0.005, 0.05) }}
      className={`relative rounded-2xl overflow-hidden cursor-pointer group ${size === "wide" ? "col-span-2" : ""}`}
      style={{ aspectRatio: size === "wide" ? "2/1" : size === "large" ? "1/1" : "3/4", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      onClick={() => launchGame(game)}
    >
      {game.source === "slotopol" ? (
        <div className="absolute inset-0 flex flex-col justify-between p-3"
          style={{ background: "radial-gradient(circle at 30% 15%, rgba(0,209,255,0.28), transparent 35%), radial-gradient(circle at 80% 75%, rgba(255,45,85,0.22), transparent 35%), linear-gradient(135deg,#06111f,#020408)" }}>
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded text-[7px] font-black" style={{ background: "rgba(0,209,255,0.18)", color: "#00D1FF", border: "1px solid rgba(0,209,255,0.35)" }}>SLOTOPOL API</span>
            <span className="text-[8px] text-white/45 font-mono">{game.slotopolDims || "5x3"}</span>
          </div>
          <div className="grid grid-cols-5 gap-1 opacity-70">
            {["7","BAR","★","◆","🍒","🔔","W","SC","💎","🍋"].map((x, idx) => (
              <span key={idx} className="h-7 rounded-md flex items-center justify-center text-[10px] font-black"
                style={{ background: "rgba(0,0,0,0.35)", color: idx % 2 ? "#FF2D55" : "#00D1FF", border: "1px solid rgba(255,255,255,0.08)" }}>{x}</span>
            ))}
          </div>
          <div className="text-[9px] text-white/45 uppercase tracking-wider">{game.slotopolProvider}</div>
        </div>
      ) : (
        <img src={size === "wide" ? game.game_image : (game.game_image_narrow || game.game_image)} alt={game.game_name}
          className="w-full h-full object-cover " loading="lazy" decoding="async"
          onError={e => { const t = e.target as HTMLImageElement; if (t.src !== game.game_image) t.src = game.game_image; else t.style.display = "none"; }} />
      )}
      <div className="absolute inset-0" style={{ background: size === "wide" ? "linear-gradient(to right, rgba(2,4,8,0.9) 0%, rgba(2,4,8,0.3) 100%)" : "linear-gradient(to top, rgba(2,4,8,0.95) 0%, rgba(2,4,8,0.1) 55%, transparent 100%)" }} />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(0,209,255,0.9)" }}>
          {launchingGame === game.game_code
            ? <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(2,4,8,0.4)", borderTopColor: "#020408" }} />
            : user ? <span className="text-[#020408] font-black text-lg">▶</span> : <Lock className="w-5 h-5 text-[#020408]" />}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 p-2.5 ${size === "wide" ? "w-1/2" : "w-full"}`}>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: PROVIDER_COLORS[game.provider_id] ?? "#00D1FF" }} />
          <p className="text-[8px] font-mono truncate" style={{ color: PROVIDER_COLORS[game.provider_id] ?? "#00D1FF", opacity: 0.8 }}>
            {getProviderName(game.provider_id, game)}
          </p>
        </div>
        <h3 className={`font-bold leading-tight truncate text-white ${size === "wide" ? "text-sm" : "text-[11px]"}`}>{game.game_name}</h3>
      </div>
    </motion.div>
  );

  return (
    <>
      <div className="pb-24">
        <div className="p-4 space-y-4">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input type="text" placeholder={t("search")} value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none text-white placeholder-white/30"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }} />
          </div>

          {/* Banner Slider */}
          <BannerSlider />

          {launchError && (
            <div className="p-3 rounded-xl text-sm text-center" style={{ background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", color: "#FF2D55" }}>{launchError}</div>
          )}

          {!user && (
            <div className="p-3 rounded-xl text-sm text-center" style={{ background: "rgba(0,209,255,0.06)", border: "1px solid rgba(0,209,255,0.15)" }}>
              <span className="text-white/50">{t("loginRequired")} • </span>
              <button onClick={() => setShowAuth(true)} style={{ color: "#00D1FF" }} className="font-bold">{t('login')}</button>
            </div>
          )}

          {loadingGames ? (
            <div className="grid grid-cols-3 gap-2.5">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="rounded-2xl animate-pulse" style={{ aspectRatio: "3/4", background: "rgba(255,255,255,0.05)" }} />
              ))}
            </div>
          ) : (
            <>

              {/* ========== TOP: Most Popular (mixed sizes) ========== */}
              {!search && activeProvider === null && topPicks.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="w-4 h-4 animate-pulse" style={{ color: "#FF2D55" }} />
                    <h2 className="text-sm font-black tracking-wider">{t("popular") || "Most Popular"}</h2>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black ml-1"
                      style={{ background: "rgba(0,200,83,0.18)", color: "#00C853" }}>
                      REAL TND
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {topPicks.slice(0, 7).map((g, idx) => (
                      <GameCard key={`top-${g.provider_id}-${g.game_code}`} game={g} i={idx}
                        size={idx === 0 || idx === 6 ? "wide" : "normal"} />
                    ))}
                  </div>
                </div>
              )}

              {/* ========== HOMEPAGE: section-per-provider ========== */}
              {!search && activeProvider === null && (() => {
                // Color/branding per provider (fallback to PROVIDER_COLORS map)
                const PROVIDER_META: Record<number, { label: string; grad: string; ring: string; accent: string }> = {
                  [SLOTOPOL_PROVIDER_ID]: { label: "Slotopol API", grad: "linear-gradient(135deg,#00D1FF,#FF2D55)", ring: "rgba(0,209,255,0.35)", accent: "#00D1FF" },
                  1:  { label: "Pragmatic Play",   grad: "linear-gradient(135deg,#FF6B35,#dc2626)", ring: "rgba(255,107,53,0.35)",  accent: "#FF8159" },
                  3:  { label: "PG Soft",          grad: "linear-gradient(135deg,#a855f7,#7c3aed)", ring: "rgba(168,85,247,0.35)",  accent: "#c084fc" },
                  4:  { label: "Booongo",          grad: "linear-gradient(135deg,#22c55e,#16a34a)", ring: "rgba(34,197,94,0.35)",   accent: "#4ade80" },
                  5:  { label: "Playson",          grad: "linear-gradient(135deg,#f59e0b,#d97706)", ring: "rgba(245,158,11,0.35)",  accent: "#fbbf24" },
                  7:  { label: "Habanero",         grad: "linear-gradient(135deg,#ec4899,#be185d)", ring: "rgba(236,72,153,0.35)",  accent: "#f472b6" },
                  9:  { label: "JiLi Gaming",      grad: "linear-gradient(135deg,#14b8a6,#0d9488)", ring: "rgba(20,184,166,0.35)",  accent: "#2dd4bf" },
                  12: { label: "Tydo",             grad: "linear-gradient(135deg,#8b5cf6,#7c3aed)", ring: "rgba(139,92,246,0.35)",  accent: "#a78bfa" },
                  13: { label: "PlayStar",         grad: "linear-gradient(135deg,#ef4444,#b91c1c)", ring: "rgba(239,68,68,0.35)",   accent: "#f87171" },
                  14: { label: "XGaming",          grad: "linear-gradient(135deg,#06b6d4,#0891b2)", ring: "rgba(6,182,212,0.35)",   accent: "#22d3ee" },
                  15: { label: "Spribe",           grad: "linear-gradient(135deg,#84cc16,#16a34a)", ring: "rgba(132,204,22,0.35)",  accent: "#a3e635" },
                  16: { label: "Hacksaw Gaming",   grad: "linear-gradient(135deg,#f97316,#dc2626)", ring: "rgba(249,115,22,0.35)",  accent: "#fb923c" },
                  23: { label: "TADA Gaming",      grad: "linear-gradient(135deg,#e11d48,#9f1239)", ring: "rgba(225,29,72,0.35)",   accent: "#fb7185" },
                };

                // Featured-first ordering: Slotopol, Pragmatic, PG Soft, Hacksaw, Spribe, Habanero — then the rest by count
                const FEATURED_ORDER = [SLOTOPOL_PROVIDER_ID, 1, 3, 16, 15, 7];
                // Derive provider IDs from the games themselves so this works even if
                // /v4/game/providers fetch failed or hasn't returned yet.
                const idsWithGames = Array.from(new Set(games.map(g => g.provider_id)));
                const rest = idsWithGames
                  .filter(id => !FEATURED_ORDER.includes(id))
                  .sort((a, b) =>
                    games.filter(g => g.provider_id === b).length -
                    games.filter(g => g.provider_id === a).length
                  );
                const orderedIds = [...FEATURED_ORDER.filter(id => idsWithGames.includes(id)), ...rest];

                return (
                  <>
                    {orderedIds.map(pid => {
                      const blockGames = games.filter(g => g.provider_id === pid);
                      if (blockGames.length === 0) return null;
                      const meta = PROVIDER_META[pid] || {
                        label: allProviders.find(p => p.provider_id === pid)?.locale_name || `Provider ${pid}`,
                        grad: "linear-gradient(135deg,#00D1FF,#0284c7)",
                        ring: "rgba(0,209,255,0.35)",
                        accent: PROVIDER_COLORS[pid] || "#00D1FF",
                      };
                      const preview = blockGames.slice(0, 6); // 6 games = 2 rows x 3

                      return (
                        <div key={pid} className="mb-5">
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                                style={{ background: meta.grad }}>
                                <Sparkles className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <h2 className="text-sm font-black tracking-wider text-white uppercase truncate">
                                  {meta.label}
                                </h2>
                                <p className="text-[9px] text-white/40 -mt-0.5">{blockGames.length} games · Real TND</p>
                              </div>
                            </div>
                            <button onClick={() => { setActiveProvider(pid); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                              className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg flex-shrink-0"
                              style={{ color: meta.accent, background: `${meta.accent}15`, border: `1px solid ${meta.accent}40` }}>
                              {t("seeAll") || "See all"} →
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2.5">
                            {preview.map((g, i) => (
                              <GameCard key={`${pid}-${g.game_code}`} game={g} i={i} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}

              {/* Provider filter */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4" style={{ color: "#f59e0b" }} />
                  <h2 className="text-sm font-black tracking-wider">{t("providers")}</h2>
                  <span className="text-[10px] text-white/20 ml-auto"></span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  <button onClick={() => setActiveProvider(null)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap text-xs font-bold flex-shrink-0"
                    style={{
                      background: activeProvider === null ? "rgba(0,209,255,0.15)" : "rgba(255,255,255,0.04)",
                      border: activeProvider === null ? "1px solid rgba(0,209,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
                      color: activeProvider === null ? "#00D1FF" : "rgba(255,255,255,0.4)"
                    }}>
                    <LayoutGrid className="w-3 h-3" /> {t("all")}
                  </button>
                  {allProviders.sort((a, b) => {
                    const ca = games.filter(g => g.provider_id === a.provider_id).length;
                    const cb = games.filter(g => g.provider_id === b.provider_id).length;
                    return cb - ca;
                  }).map(p => {
                    const count = games.filter(g => g.provider_id === p.provider_id).length;
                    if (count === 0) return null;
                    const active = activeProvider === p.provider_id;
                    const color = PROVIDER_COLORS[p.provider_id] ?? "#00D1FF";
                    return (
                      <button key={p.provider_id} onClick={() => setActiveProvider(active ? null : p.provider_id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap text-xs font-bold flex-shrink-0"
                        style={{
                          background: active ? `${color}20` : "rgba(255,255,255,0.04)",
                          border: active ? `1px solid ${color}60` : "1px solid rgba(255,255,255,0.06)",
                          color: active ? color : "rgba(255,255,255,0.4)"
                        }}>
                        {p.locale_name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Flat grid: shown only when a provider is selected OR while searching */}
              {(activeProvider !== null || !!search) && (
                <>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: "#a855f7" }} />
                    <h2 className="text-sm font-black tracking-wider">
                      {activeProvider !== null
                        ? allProviders.find(p => p.provider_id === activeProvider)?.locale_name
                        : t("searchResults") || `Results: "${search}"`}
                    </h2>
                    <span className="text-[10px] text-white/20 ml-auto flex items-center gap-1">
                      <Gamepad2 className="w-3 h-3" /> {filtered.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {paged.map((game, i) => (
                      <GameCard key={`${game.provider_id}-${game.game_code}`} game={game} i={i} />
                    ))}
                  </div>

                  {paged.length < filtered.length && (
                    <button onClick={() => setPage(p => p + 1)}
                      className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                      style={{ background: "rgba(0,209,255,0.08)", border: "1px solid rgba(0,209,255,0.2)", color: "#00D1FF" }}>
                      <Zap className="w-4 h-4" />
                      {t("loadMore")}
                    </button>
                  )}

                  {filtered.length === 0 && (
                    <div className="text-center py-16 text-white/30">{t("noGames")}</div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>


      {/* Slotopol API spin modal */}
      {slotopolGame && (
        <div className="fixed inset-0 bg-black/90 flex flex-col" style={{ zIndex: 9998 }}>
          <div className="flex items-center justify-between p-3 flex-shrink-0" style={{ background: "#020408", borderBottom: "1px solid rgba(0,209,255,0.2)" }}>
            <div className="min-w-0">
              <div className="text-[10px] font-black tracking-[0.18em]" style={{ color: "#00D1FF" }}>SLOTOPOL API</div>
              <div className="text-sm font-black text-white truncate">{slotopolGame.game_name}</div>
              <div className="text-[10px] text-white/35 truncate">{slotopolGame.slotopolProvider} · {slotopolGame.slotopolDetails}</div>
            </div>
            <button onClick={() => setSlotopolGame(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(255,45,85,0.15)", color: "#FF2D55", border: "1px solid rgba(255,45,85,0.3)" }}>Close ✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded-3xl p-4" style={{ background: "radial-gradient(circle at 50% 0%, rgba(0,209,255,0.18), transparent 45%), rgba(255,255,255,0.035)", border: "1px solid rgba(0,209,255,0.18)" }}>
              <div className="grid grid-rows-3 gap-2 mb-4">
                {(slotopolResult?.reels || [["🍒","🍋","🔔","⭐","💎"],["7","BAR","WILD","SCAT","🍒"],["💎","⭐","🔔","🍋","7"]]).map((row, r) => (
                  <div key={r} className="grid grid-cols-5 gap-2">
                    {row.map((sym, c) => (
                      <div key={`${r}-${c}`} className="h-16 rounded-xl flex items-center justify-center text-xl font-black"
                        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.35))", border: r === 1 ? "1px solid rgba(0,209,255,0.45)" : "1px solid rgba(255,255,255,0.08)", color: sym === "WILD" || sym === "SCAT" ? "#00D1FF" : "#fff", boxShadow: r === 1 ? "0 0 16px rgba(0,209,255,0.12)" : "none" }}>
                        {sym}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-[9px] uppercase text-white/35">Last win</div>
                  <div className="text-lg font-black tabular-nums" style={{ color: (slotopolResult?.win || 0) > 0 ? "#00C853" : "#fff" }}>{(slotopolResult?.win || 0).toFixed(2)} TND</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-[9px] uppercase text-white/35">Balance</div>
                  <div className="text-lg font-black tabular-nums" style={{ color: "#00D1FF" }}>{(slotopolResult?.balance ?? parseFloat(user?.balance || "0")).toFixed(2)} TND</div>
                </div>
              </div>

              {slotopolResult?.wins && slotopolResult.wins.length > 0 && (
                <div className="space-y-1 mb-3">
                  {slotopolResult.wins.map((w, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-[11px]" style={{ background: "rgba(0,200,83,0.08)", border: "1px solid rgba(0,200,83,0.16)" }}>
                      <span className="text-white/70">{w.line} · {w.count}× {w.symbol}</span>
                      <span className="font-black" style={{ color: "#00C853" }}>+{w.amount.toFixed(2)} TND</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-1 mb-2">
                {[0.5, 1, 2, 5, 10].map(v => (
                  <button key={v} onClick={() => setSlotopolStake(String(v))} className="flex-1 py-2 rounded-lg text-[11px] font-bold" style={{ background: slotopolStake === String(v) ? "rgba(0,209,255,0.18)" : "rgba(255,255,255,0.06)", color: slotopolStake === String(v) ? "#00D1FF" : "rgba(255,255,255,0.6)" }}>{v}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={slotopolStake} onChange={e => setSlotopolStake(e.target.value)} type="number" min="0.2" step="0.1" className="flex-1 px-3 py-3 rounded-xl text-sm font-bold text-white outline-none" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" }} placeholder="Stake TND" />
                <button onClick={spinSlotopol} disabled={slotopolSpinning} className="px-6 py-3 rounded-xl text-sm font-black disabled:opacity-50 flex items-center gap-2" style={{ background: "#00D1FF", color: "#020408" }}>
                  {slotopolSpinning ? <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" /> : <Zap className="w-4 h-4" />}
                  SPIN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game iframe (AES real-money launch) */}
      {gameUrl && (
        <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 9999 }}>
          <div className="flex items-center justify-between p-2 flex-shrink-0 gap-2"
            style={{ background: "#020408", borderBottom: "1px solid rgba(0,209,255,0.2)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-black text-xs tracking-wider flex-shrink-0" style={{ color: "#00D1FF" }}>TUNBET</span>
              {activeGame && (
                <span className="text-[10px] text-white/60 font-bold truncate">{activeGame.game_name}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={closeGame} disabled={closingGame} className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                style={{ background: "rgba(255,45,85,0.15)", color: "#FF2D55", border: "1px solid rgba(255,45,85,0.3)" }}>
                {closingGame ? "..." : t("closeGame") + " ✕"}
              </button>
            </div>
          </div>
          <div className="flex-1 relative">
            <iframe ref={iframeRef} src={gameUrl} className="w-full h-full border-none absolute inset-0" title="Game" allow="fullscreen autoplay" />
            {closingGame && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", zIndex: 10 }}>
                <div className="text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: "solid", borderColor: "rgba(0,209,255,0.3)", borderTopColor: "#00D1FF" }} />
                  <p className="text-sm font-bold" style={{ color: "#00D1FF" }}>{t("savingBalance")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
