import { motion } from "framer-motion";
import { Trophy, Clock, Zap, Shield, Activity, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { oroLaunchGame, isOroAvailable } from "@/lib/oroClient";

// Virtual Sports / Sportsbook vendors available through OroPlay aggregator.
// They will auto-activate when OroPlay enables API access on the agent account.
const VIRTUAL_SPORTS = [
  { id: "leap-football", vendor: "virtual-leap", code: "virtual-football",
    name: "Virtual Football", icon: "⚽",
    desc: "24/7 instant football matches with real odds",
    color: "#00D1FF" },
  { id: "leap-horse", vendor: "virtual-leap", code: "virtual-horse-racing",
    name: "Horse Racing", icon: "🐎",
    desc: "Live horse races every 3 minutes",
    color: "#FFD700" },
  { id: "leap-greyhound", vendor: "virtual-leap", code: "virtual-greyhound",
    name: "Greyhound Racing", icon: "🐕",
    desc: "Greyhound races on demand",
    color: "#FF6B35" },
  { id: "leap-tennis", vendor: "virtual-leap", code: "virtual-tennis",
    name: "Virtual Tennis", icon: "🎾",
    desc: "Tennis matches every 2 minutes",
    color: "#22c55e" },
  { id: "betgames-lucky6", vendor: "live-betgames", code: "lucky6",
    name: "Lucky 6", icon: "🎰",
    desc: "Live lottery — 6/48 draw",
    color: "#a855f7" },
  { id: "betgames-wheel", vendor: "live-betgames", code: "wheel-of-fortune",
    name: "Wheel of Fortune", icon: "🎡",
    desc: "Live spinning wheel — instant wins",
    color: "#ec4899" },
];

export default function Sports() {
  const { user } = useAuth();
  const [auth, setAuth] = useState(false);
  const [oroReady, setOroReady] = useState(false);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    isOroAvailable().then(setOroReady);
  }, []);

  const launch = async (g: typeof VIRTUAL_SPORTS[0]) => {
    if (!user) { setAuth(true); return; }
    if (parseFloat(user.balance) <= 0) {
      setErr("رصيدك غير كافٍ"); setTimeout(() => setErr(""), 3000); return;
    }
    if (!oroReady) {
      setErr("⏰ سيتفعل قريباً جداً — OroPlay يكمل التفعيل");
      setTimeout(() => setErr(""), 4000); return;
    }
    setLaunching(g.id); setErr("");
    try {
      const res = await oroLaunchGame(`tb_${user.id}`, g.vendor, g.code, "en");
      if (res?.url) setGameUrl(res.url);
      else { setErr(res?.error || "تعذر فتح اللعبة"); setTimeout(() => setErr(""), 4000); }
    } catch { setErr("خطأ في الاتصال"); setTimeout(() => setErr(""), 4000); }
    setLaunching(null);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="p-4 pb-24 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #00D1FF, #0066FF)" }}>
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-wider">SPORTS</h1>
                <p className="text-[10px] text-white/40 font-mono">
                  VIRTUAL SPORTS • LIVE BETTING
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full"
              style={{
                background: oroReady ? "rgba(0,200,83,0.15)" : "rgba(255,165,0,0.15)",
                border: `1px solid ${oroReady ? "rgba(0,200,83,0.3)" : "rgba(255,165,0,0.3)"}`
              }}>
              <Activity className={`w-3 h-3 ${oroReady ? "text-green-400" : "text-orange-400"}`} />
              <span className="text-[10px] font-bold"
                style={{ color: oroReady ? "#00C853" : "#FFA000" }}>
                {oroReady ? "LIVE" : "SOON"}
              </span>
            </div>
          </div>

          {/* Status Banner */}
          {!oroReady && (
            <div className="rounded-xl p-4"
              style={{
                background: "linear-gradient(135deg, rgba(255,165,0,0.08), rgba(0,209,255,0.06))",
                border: "1px solid rgba(255,165,0,0.18)"
              }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(255,165,0,0.15)" }}>
                  <Clock className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white mb-1">
                    Sportsbook Activation in Progress
                  </h3>
                  <p className="text-xs text-white/55 leading-relaxed">
                    رياضات افتراضية وLive Betting من <span className="text-orange-300 font-semibold">Leap Gaming</span>{" "}
                    و <span className="text-orange-300 font-semibold">BetGames TV</span> — في طور التفعيل عبر OroPlay.
                    سيتم التفعيل خلال 24 ساعة.
                  </p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-[10px] text-green-400 font-medium">Seamless Wallet</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[10px] text-cyan-400 font-medium">Real TND Balance</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-pink-400" />
                      <span className="text-[10px] text-pink-400 font-medium">24/7 Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {err && (
            <div className="p-3 rounded-xl text-sm text-center"
              style={{
                background: "rgba(255,45,85,0.1)",
                border: "1px solid rgba(255,45,85,0.3)",
                color: "#FF2D55"
              }}>{err}</div>
          )}

          {/* Virtual Sports Grid */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 animate-pulse" style={{ color: "#00D1FF" }} />
              <h2 className="text-sm font-black tracking-wider">VIRTUAL SPORTS & LIVE</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {VIRTUAL_SPORTS.map((g, i) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => launch(g)}
                  className="relative rounded-2xl overflow-hidden cursor-pointer group"
                  style={{
                    aspectRatio: "4/5",
                    background: "rgba(255,255,255,0.025)",
                    border: `1px solid ${oroReady ? `${g.color}33` : "rgba(255,255,255,0.06)"}`
                  }}>
                  {/* Background gradient */}
                  <div className="absolute inset-0" style={{
                    background: `radial-gradient(circle at top, ${g.color}22, transparent 70%)`
                  }} />

                  {/* Coming Soon Overlay */}
                  {!oroReady && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <div className="px-3 py-1 rounded-full text-[9px] font-black"
                        style={{ background: "rgba(255,165,0,0.85)", color: "#000" }}>
                        ⏰ SOON
                      </div>
                    </div>
                  )}

                  {/* Icon */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <div className="text-5xl mb-2"
                      style={{ filter: oroReady ? "none" : "grayscale(0.5) opacity(0.6)" }}>
                      {launching === g.id ? "⏳" : g.icon}
                    </div>
                    <h3 className="text-sm font-black text-center mb-1"
                      style={{ color: oroReady ? g.color : "rgba(255,255,255,0.5)" }}>
                      {g.name}
                    </h3>
                    <p className="text-[9px] text-center text-white/40 leading-tight">
                      {g.desc}
                    </p>
                  </div>

                  {oroReady && (
                    <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: g.color }}>
                      <ChevronRight className="w-4 h-4 text-black" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-xl p-4 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,209,255,0.06), rgba(255,215,0,0.04))",
              border: "1px solid rgba(255,255,255,0.06)"
            }}>
            <Trophy className="w-7 h-7 mx-auto mb-2 text-white/20" />
            <p className="text-xs text-white/45 leading-relaxed">
              في الانتظار؟ جرّب{" "}
              <span className="text-[#00D1FF] font-semibold">1577 لعبة كازينو</span>{" "}
              في تبويب Casino — كلها برصيد حقيقي TND!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Game iframe */}
      {gameUrl && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
          <div className="flex items-center justify-between px-3 py-2"
            style={{ background: "linear-gradient(90deg, rgba(0,209,255,0.12), rgba(0,0,0,0.9))" }}>
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded text-[9px] font-black"
                style={{ background: "rgba(0,209,255,0.9)", color: "#000" }}>SPORTS</div>
              <span className="text-xs text-white/50 font-mono">💰 Real Money</span>
            </div>
            <button onClick={() => setGameUrl(null)}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-black"
              style={{ background: "linear-gradient(135deg, #00D1FF, #0066FF)" }}>
              ✕ Close
            </button>
          </div>
          <iframe src={gameUrl} className="flex-1 w-full border-none"
            allow="fullscreen autoplay" title="Sports" />
        </div>
      )}

      {auth && <AuthModal onClose={() => setAuth(false)} />}
    </>
  );
}
