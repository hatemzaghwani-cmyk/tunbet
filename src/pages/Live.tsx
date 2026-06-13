import { motion } from "framer-motion";
import { Flame, Search, Wifi, Play, Lock, Crown, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { LIVE_GAMES } from "@/lib/liveGames";
import { t } from "@/lib/i18n";
import { apiLaunchGame } from "@/lib/localApi";

const VENDOR_META: Record<string, { color: string; label: string }> = {
  "casino-pragmatic": { color: "#FF6B35", label: "Pragmatic Live",  },
  "casino-ezugi": { color: "#00D1FF", label: "Ezugi",  },
};

const CATEGORIES = [
  { key: "all", label: "All",  },
  { key: "roulette", label: "Roulette",  },
  { key: "baccarat", label: "Baccarat",  },
  { key: "dragon", label: "Dragon Tiger",  },
  { key: "andar", label: "Andar Bahar",  },
  { key: "sic", label: "Sic Bo",  },
  { key: "lucky", label: "Lucky 7",  },
  { key: "xoc", label: "Xoc Dia",  },
];

function detectCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("roulette")) return "roulette";
  if (n.includes("baccarat")) return "baccarat";
  if (n.includes("dragon tiger")) return "dragon";
  if (n.includes("andar bahar")) return "andar";
  if (n.includes("sic bo")) return "sic";
  if (n.includes("lucky 7")) return "lucky";
  if (n.includes("xoc dia")) return "xoc";
  return "other";
}

export default function Live() {
  const { user, token, refreshBalance } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [vendor, setVendor] = useState<string>("all");
  const [launching, setLaunching] = useState<string | null>(null);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<any>(null);

  const filtered = useMemo(() => {
    return LIVE_GAMES.filter(g => {
      const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase());
      const cat = detectCategory(g.name);
      const matchCat = category === "all" || cat === category || (category === "all" && true);
      const matchVendor = vendor === "all" || g.vendor === vendor;
      return matchSearch && matchCat && matchVendor;
    });
  }, [search, category, vendor]);

  const vendors = useMemo(() => {
    const s = new Set<string>();
    LIVE_GAMES.forEach(g => s.add(g.vendor));
    return Array.from(s);
  }, []);

  const handlePlay = async (game: typeof LIVE_GAMES[0]) => {
    if (!user || !token) { setShowAuth(true); return; }
    setLaunching(game.code);
    try {
      const result = await apiLaunchGame(token, game.code, 1);
      if (result.url) {
        setGameUrl(result.url);
        setActiveGame(game);
        await refreshBalance();
      } else {
        alert(result.error || t("noGames") || "الطاولة غير متاحة حالياً");
      }
    } catch {
      alert("خطأ في الاتصال بمزود البث المباشر");
    } finally {
      setLaunching(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-24">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF2D55, #FF6B35)" }}>
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider">LIVE CASINO</h1>
              <p className="text-[10px] text-white/40 font-mono">{LIVE_GAMES.length} TABLES • {vendors.length} PROVIDERS</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.3)" }}>
            <Wifi className="w-3 h-3 text-green-400" />
            <span className="text-[10px] font-bold text-green-400">LIVE</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search tables..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none text-white placeholder-white/30"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          )}
        </div>

        {/* Vendor filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide mb-2">
          <button
            onClick={() => setVendor("all")}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap flex-shrink-0"
            style={{
              background: vendor === "all" ? "rgba(0,209,255,0.15)" : "rgba(255,255,255,0.04)",
              border: vendor === "all" ? "1px solid rgba(0,209,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
              color: vendor === "all" ? "#00D1FF" : "rgba(255,255,255,0.5)",
            }}
          >
            All Providers
          </button>
          {vendors.map(v => {
            const meta = VENDOR_META[v] || { color: "#00D1FF", label: v,  };
            const active = vendor === v;
            return (
              <button
                key={v}
                onClick={() => setVendor(active ? "all" : v)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap flex-shrink-0 flex items-center gap-1"
                style={{
                  background: active ? `${meta.color}20` : "rgba(255,255,255,0.04)",
                  border: active ? `1px solid ${meta.color}60` : "1px solid rgba(255,255,255,0.06)",
                  color: active ? meta.color : "rgba(255,255,255,0.5)",
                }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {CATEGORIES.map(c => {
            const active = category === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap flex-shrink-0"
                style={{
                  background: active ? "rgba(255,45,85,0.15)" : "rgba(255,255,255,0.04)",
                  border: active ? "1px solid rgba(255,45,85,0.4)" : "1px solid rgba(255,255,255,0.06)",
                  color: active ? "#FF2D55" : "rgba(255,255,255,0.5)",
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Games Grid */}
      <div className="px-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Crown className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tables found</p>
            <p className="text-[10px] mt-1">Try another search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((game, i) => {
              const meta = VENDOR_META[game.vendor] || { color: "#00D1FF", label: game.vendor,  };
              const isLaunching = launching === game.code;
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="relative rounded-xl overflow-hidden cursor-pointer group"
                  style={{
                    aspectRatio: "16/10",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  onClick={() => handlePlay(game)}
                >
                  <img
                    src={game.thumb}
                    alt={game.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    style={{ filter: "brightness(0.85)" }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  {/* Live badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
                    style={{ background: "rgba(0,200,83,0.9)", color: "#fff" }}>
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                  {/* Vendor badge */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[7px] font-black"
                    style={{ background: "rgba(0,0,0,0.6)", color: meta.color, border: `1px solid ${meta.color}40` }}>
                    {meta.label}
                  </div>
                  {/* Gradient overlay */}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(2,4,8,0.95) 0%, rgba(2,4,8,0.3) 50%, transparent 100%)" }} />
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(0,209,255,0.9)" }}>
                      {isLaunching ? (
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(2,4,8,0.4)", borderTopColor: "#020408" }} />
                      ) : user ? (
                        <Play className="w-4 h-4 text-[#020408] fill-current" />
                      ) : (
                        <Lock className="w-4 h-4 text-[#020408]" />
                      )}
                    </div>
                  </div>
                  {/* Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-[10px] font-bold text-white leading-tight truncate">{game.name}</p>
                    <p className="text-[8px] text-white/40 mt-0.5 truncate">{meta.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Table iframe overlay */}
      {gameUrl && (
        <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 9999 }}>
          <div className="flex items-center justify-between p-2 flex-shrink-0 gap-2"
            style={{ background: "#020408", borderBottom: "1px solid rgba(0,209,255,0.2)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-black text-xs tracking-wider flex-shrink-0" style={{ color: "#FF2D55" }}>TUNBET LIVE</span>
              {activeGame && (
                <span className="text-[10px] text-white/60 font-bold truncate">{activeGame.name}</span>
              )}
            </div>
            <button onClick={() => setGameUrl(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: "rgba(255,45,85,0.15)", color: "#FF2D55", border: "1px solid rgba(255,45,85,0.3)" }}>
              {t("closeGame") || "Close"} ✕
            </button>
          </div>
          <div className="flex-1 relative">
            <iframe src={gameUrl} className="w-full h-full border-none absolute inset-0" title="Live Game" allow="fullscreen autoplay" />
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </motion.div>
  );
}
