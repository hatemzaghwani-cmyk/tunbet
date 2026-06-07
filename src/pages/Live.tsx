import { motion } from "framer-motion";
import { Flame, Shield, Wifi, Clock, MessageCircle } from "lucide-react";
import { LIVE_GAMES, LIVE_VENDORS } from "@/lib/liveGames";
import { useState } from "react";

export default function Live() {
  const [activeVendor, setActiveVendor] = useState("all");

  const filteredGames = activeVendor === "all"
    ? LIVE_GAMES
    : LIVE_GAMES.filter(g => g.vendor === activeVendor);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="p-4 pb-24 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF2D55, #FF6B35)" }}>
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider">LIVE CASINO</h1>
              <p className="text-[10px] text-white/40 font-mono">{LIVE_GAMES.length} TABLES • 6 PROVIDERS</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.3)" }}>
            <Clock className="w-3 h-3 text-orange-400" />
            <span className="text-[10px] font-bold text-orange-400">SOON</span>
          </div>
        </div>

        {/* Status Banner */}
        <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(255,165,0,0.08), rgba(255,45,85,0.08))", border: "1px solid rgba(255,165,0,0.2)" }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(255,165,0,0.15)" }}>
              <Wifi className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Live Dealer Connection in Progress</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                We're finalizing the connection with <span className="text-orange-300 font-semibold">Pragmatic Live</span>, <span className="text-orange-300 font-semibold">Ezugi</span>, <span className="text-orange-300 font-semibold">Sa Gaming</span> and <span className="text-orange-300 font-semibold">Dream Gaming</span> live dealer servers.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-[10px] text-green-400 font-medium">142 Tables Ready</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-[10px] text-orange-400 font-medium">6 Providers</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setActiveVendor("all")}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
            style={{ background: activeVendor === "all" ? "linear-gradient(135deg, #FF2D55, #FF6B35)" : "rgba(255,255,255,0.05)", color: activeVendor === "all" ? "#fff" : "rgba(255,255,255,0.5)" }}>
            All ({LIVE_GAMES.length})
          </button>
          {LIVE_VENDORS.filter(v => v.gameCount > 0).map(v => (
            <button key={v.code} onClick={() => setActiveVendor(v.code)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
              style={{ background: activeVendor === v.code ? "linear-gradient(135deg, #FF2D55, #FF6B35)" : "rgba(255,255,255,0.05)", color: activeVendor === v.code ? "#fff" : "rgba(255,255,255,0.5)" }}>
              <img src={v.logo} alt="" className="w-4 h-4 rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              {v.name} ({v.gameCount})
            </button>
          ))}
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredGames.slice(0, 30).map((game, i) => (
            <motion.div key={game.id}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "4/5", border: "1px solid rgba(255,255,255,0.06)" }}>
              <img src={game.thumb} alt={game.name} className="w-full h-full object-cover opacity-70" loading="lazy"
                onError={e => {
                  (e.target as HTMLImageElement).src = `https://static3.pgf-asu2nd.com/logo/${game.vendor}.png`;
                  (e.target as HTMLImageElement).className = "w-full h-full object-contain p-6 bg-black/50 opacity-70";
                }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="px-3 py-1 rounded-full text-[9px] font-black" style={{ background: "rgba(255,165,0,0.8)", color: "#000" }}>
                  COMING SOON
                </div>
              </div>
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.7)" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#FFA500" }} />
                <span className="text-[8px] font-black text-orange-400">LIVE</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <p className="text-[7px] font-mono text-white/30 uppercase">{game.vendorName}</p>
                <h3 className="text-[11px] font-bold text-white/80 leading-tight line-clamp-2">{game.name}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredGames.length > 30 && (
          <p className="text-center text-xs text-white/30">+{filteredGames.length - 30} more tables</p>
        )}

        {/* CTA */}
        <div className="rounded-xl p-5 text-center" style={{ background: "linear-gradient(135deg, rgba(255,45,85,0.08), rgba(255,165,0,0.08))", border: "1px solid rgba(255,255,255,0.06)" }}>
          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-white/20" />
          <p className="text-xs text-white/40 leading-relaxed">
            Meanwhile, enjoy <span className="text-[#00D1FF] font-semibold">1,577 slot games</span> in the Casino tab — fully playable with real balance.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
