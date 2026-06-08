import { motion } from "framer-motion";
import { Flame, Shield, Wifi, Clock, MessageCircle, Gamepad2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Live() {
  const [, navigate] = useLocation();

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
              <p className="text-[10px] text-white/40 font-mono">142 TABLES • 6 PROVIDERS</p>
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
                We're finalizing the connection with <span className="text-orange-300 font-semibold">Pragmatic Live</span>, <span className="text-orange-300 font-semibold">Ezugi</span>, <span className="text-orange-300 font-semibold">SA Gaming</span> and <span className="text-orange-300 font-semibold">Dream Gaming</span> live dealer servers.
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

        {/* Provider Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Pragmatic Live", tables: 79, color: "#FF6B35" },
            { name: "Ezugi", tables: 63, color: "#00D1FF" },
            { name: "SA Gaming", tables: 0, color: "#a855f7" },
            { name: "Dream Gaming", tables: 0, color: "#22c55e" },
            { name: "PlayAce", tables: 0, color: "#f59e0b" },
            { name: "Micro Gaming", tables: 0, color: "#ec4899" },
          ].map((provider) => (
            <div key={provider.name}
              className="rounded-xl p-4 text-center relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${provider.color}20` }}>
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-10"
                style={{ background: provider.color, marginRight: -20, marginTop: -20 }} />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center"
                  style={{ background: `${provider.color}15`, border: `1px solid ${provider.color}30` }}>
                  <Flame className="w-5 h-5" style={{ color: provider.color }} />
                </div>
                <p className="text-xs font-bold text-white mb-1">{provider.name}</p>
                <p className="text-[10px] text-white/40">{provider.tables} Tables</p>
                {provider.tables === 0 && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-bold"
                    style={{ background: "rgba(255,165,0,0.15)", color: "#FFA500" }}>
                    COMING SOON
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Available Games Preview */}
        <div className="rounded-xl p-4" style={{ background: "rgba(0,209,255,0.05)", border: "1px solid rgba(0,209,255,0.15)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Gamepad2 className="w-4 h-4" style={{ color: "#00D1FF" }} />
            <h3 className="text-sm font-bold text-white">Available Game Types</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Baccarat", "Roulette", "Blackjack", "Dragon Tiger", "Sic Bo", "Mega Wheel"].map(game => (
              <div key={game} className="py-2 px-1 rounded-lg text-center text-[10px] font-bold"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                {game}
              </div>
            ))}
          </div>
        </div>

        {/* CTA to Casino */}
        <div className="rounded-xl p-5 text-center" style={{ background: "linear-gradient(135deg, rgba(0,209,255,0.08), rgba(0,255,157,0.05))", border: "1px solid rgba(0,209,255,0.15)" }}>
          <MessageCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "#00D1FF", opacity: 0.5 }} />
          <p className="text-xs text-white/60 leading-relaxed mb-3">
            Meanwhile, enjoy <span className="text-[#00D1FF] font-semibold">1,577 slot games</span> in the Casino tab — fully playable with real balance in TND.
          </p>
          <button onClick={() => navigate("/")}
            className="px-6 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "#00D1FF", color: "#020408" }}>
            Play Slots Now →
          </button>
        </div>
      </div>
    </motion.div>
  );
}
