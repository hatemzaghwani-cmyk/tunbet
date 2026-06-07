import { isOroAvailable } from "@/lib/oroClient";
import { t } from "@/lib/i18n";
import { Search, LayoutGrid, Gamepad2, Lock, RefreshCw, Flame, Crown, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { apiGames, apiGameProviders, apiLaunchGame, apiSyncBalance } from "@/lib/localApi";
import { getDemoUrl, getDemoThumb, hasFreeDemo } from "@/lib/freeDemos";
import { openEscrow, closeEscrow } from "@/lib/escrowWallet";




const PAGE_SIZE = 60;

const BANNERS = [
  { img: "/images/banner1.jpg", text: "MEBET CASINO", sub: "1500+ Games • Play & Win" },
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
  const [activeProvider, setActiveProvider] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [allGames, setAllGames] = useState<AesGame[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [launchingGame, setLaunchingGame] = useState<string | null>(null);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<AesGame | null>(null);
  const [sessionAmt, setSessionAmt] = useState<number>(0);
  const [pendingGame, setPendingGame] = useState<AesGame | null>(null);
  const [stakeInput, setStakeInput] = useState("10");
  const [closeInput, setCloseInput] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingGame, setClosingGame] = useState(false);
  const [amaticUrl, setAmaticUrl] = useState<string | null>(null);
  const [oroReady, setOroReady] = useState(false);
  
  // Auto-detect OroPlay API availability
  useEffect(() => {
    isOroAvailable().then(ok => { setOroReady(ok); if(ok) console.log("🎰 AMATIC REAL MONEY MODE!"); });
  }, []);
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
  const games = useMemo(() => {
    const enabled = allGames.filter(g => g.launch_enable);

    // Score each game: popular games get high score
    const scored = enabled.map(g => {
      const name = g.game_name.toLowerCase();
      let score = 0;
      for (const p of POPULAR) { if (name.includes(p)) { score += 100; break; } }
      // Pragmatic Play bonus
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
  const getProviderName = (id: number) => providers.find(p => p.provider_id === id)?.locale_name ?? "";

  // Top picks (first 8 from scored popular)
  const topPicks = useMemo(() => games.slice(0, 8), [games]);

  const launchGame = async (game: AesGame) => {
    if (!user) { setShowAuth(true); return; }
    // If provider has a free public demo → open directly (no session, demo credits only)
    const directUrl = (game as any)._amaticUrl || getDemoUrl(game.provider_id, game.game_code);
    if (directUrl) {
      setActiveGame(game);
      setSessionAmt(0); // no escrow - browsing only
      setGameUrl(directUrl);
      return;
    }
    // Show "TND only available in Originals" notice for non-demo providers
    setLaunchError("هذه اللعبة تجريبية فقط. للرهان الحقيقي بـ TND، جرّب Originals (Crash, Mines, Dice, Plinko, Limbo) ←");
    setTimeout(() => setLaunchError(""), 5500);
  };

  const confirmLaunchWithSession = async () => {
    if (!user || !pendingGame) return;
    const amt = parseFloat(stakeInput);
    if (!amt || amt <= 0) { setLaunchError("أدخل مبلغاً صالحاً"); return; }
    setLaunchingGame(pendingGame.game_code); setLaunchError("");
    const res = await openEscrow(user.id, amt, pendingGame.game_name, "Free Demo");
    if (!res.ok) { setLaunchError(res.error || "خطأ"); setLaunchingGame(null); return; }
    await refreshBalance();
    // Support: 1) Amatic direct URL (via _amaticUrl), 2) Pragmatic free demo via mapping
    const amaticUrl = (pendingGame as any)._amaticUrl;
    const url = amaticUrl || getDemoUrl(pendingGame.provider_id, pendingGame.game_code);
    if (url) {
      setGameUrl(url);
      setActiveGame(pendingGame);
      setSessionAmt(amt);
    }
    setPendingGame(null);
    setLaunchingGame(null);
  };

  const closeGame = async () => {
    setGameUrl(null);
    setActiveGame(null);
    setSessionAmt(0);
    if (user) await refreshBalance();
  };

  const confirmCloseSession = async () => {
    if (!user) return;
    const amt = parseFloat(closeInput);
    if (isNaN(amt) || amt < 0) { setLaunchError("أدخل المبلغ المتبقي"); return; }
    setClosingGame(true);
    const res = await closeEscrow(user.id, amt);
    if (!res.ok) { setLaunchError(res.error || "خطأ"); setClosingGame(false); return; }
    await refreshBalance();
    const pnl = res.pnl || 0;
    setLaunchError(pnl >= 0 ? `🎉 ربحت ${pnl.toFixed(2)} TND` : `💸 خسرت ${Math.abs(pnl).toFixed(2)} TND`);
    setGameUrl(null);
    setActiveGame(null);
    setSessionAmt(0);
    setShowCloseModal(false);
    setClosingGame(false);
    setTimeout(() => setLaunchError(""), 4500);
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
      <img src={size === "wide" ? game.game_image : (game.game_image_narrow || game.game_image)} alt={game.game_name}
        className="w-full h-full object-cover " loading="lazy" decoding="async"
        onError={e => { const t = e.target as HTMLImageElement; if (t.src !== game.game_image) t.src = game.game_image; else t.style.display = "none"; }} />
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
            {getProviderName(game.provider_id)}
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
              {/* Featured - Top picks with mixed sizes */}
              {!search && activeProvider === null && topPicks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="w-4 h-4 animate-pulse" style={{ color: "#FF2D55" }} />
                    <h2 className="text-sm font-black tracking-wider">${t("popular")}</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* First: 1 wide card + 2 normal */}
                    <GameCard game={topPicks[0]} i={0} size="wide" />
                    <GameCard game={topPicks[1]} i={1} />
                    {/* Next row: 3 normal */}
                    <GameCard game={topPicks[2]} i={2} />
                    <GameCard game={topPicks[3]} i={3} />
                    <GameCard game={topPicks[4]} i={4} />
                    {/* Last: 2 normal + 1 wide */}
                    <GameCard game={topPicks[5]} i={5} />
                    <GameCard game={topPicks[6]} i={6} size="wide" />
                  </div>
                </div>
              )}



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
                  {providers.sort((a, b) => {
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

              {/* Section title */}
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "#a855f7" }} />
                <h2 className="text-sm font-black tracking-wider">
                  {activeProvider !== null ? providers.find(p => p.provider_id === activeProvider)?.locale_name : t("allGames")}
                </h2>
                <span className="text-[10px] text-white/20 ml-auto flex items-center gap-1">
                  <Gamepad2 className="w-3 h-3" /> 
                </span>
              </div>

              {/* Games grid */}
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
        </div>
      </div>

      {/* Game iframe (DEMO mode for browsing 3rd party games) */}
      {gameUrl && (
        <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 9999 }}>
          <div className="flex items-center justify-between p-2 flex-shrink-0 gap-2"
            style={{ background: "#020408", borderBottom: "1px solid rgba(255,165,0,0.25)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-black text-xs tracking-wider flex-shrink-0" style={{ color: "#00D1FF" }}>MEBET</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-black"
                style={{ background: "rgba(255,165,0,0.85)", color: "#000" }}>🎮 DEMO</span>
              {activeGame && (
                <span className="text-[10px] text-white/60 font-bold truncate">{activeGame.game_name}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a href="/originals" onClick={(e) => { e.preventDefault(); window.location.hash="#/originals"; window.location.pathname="/originals"; }}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                style={{ background: "linear-gradient(135deg,#a855f7,#FF2D55)", color: "#fff" }}>
                💰 Real TND → Originals
              </a>
              <button onClick={closeGame} className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: "rgba(255,45,85,0.15)", color: "#FF2D55", border: "1px solid rgba(255,45,85,0.3)" }}>
                ✕ Close
              </button>
            </div>
          </div>
          <div className="flex-1 relative">
            <iframe ref={iframeRef} src={gameUrl} className="w-full h-full border-none absolute inset-0" title="Game" allow="fullscreen autoplay" />
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
