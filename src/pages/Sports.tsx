import { motion } from "framer-motion";
import { Trophy, ArrowLeft, RefreshCw, Maximize2, Activity, Shield, Zap, Wallet } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { oroLaunchGame, isOroAvailable } from "@/lib/oroClient";

// Sportsbook via OroPlay aggregator (vendor #50 "sports")
// When OroPlay activates API access, returns signed URL with seamless wallet
// → all bets debit/credit user's TND balance via callbacks

export default function Sports() {
  const { user, refreshBalance } = useAuth();
  const [auth, setAuth] = useState(false);
  const [oroReady, setOroReady] = useState(false);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [err, setErr] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { isOroAvailable().then(setOroReady); }, []);

  const launch = async () => {
    if (!user) { setAuth(true); return; }
    if (parseFloat(user.balance) <= 0) {
      setErr("رصيدك غير كافٍ. اشحن رصيدك أولاً");
      setTimeout(() => setErr(""), 4000); return;
    }
    if (!oroReady) {
      setErr("⏰ Sports vendor قيد التفعيل من OroPlay - يُنتظر خلال 24 ساعة");
      setTimeout(() => setErr(""), 4500); return;
    }
    setLaunching(true); setErr("");
    try {
      const res = await oroLaunchGame(`tb_${user.id}`, "sports", "sports", "en");
      if (res?.url) {
        setGameUrl(res.url);
      } else {
        setErr(res?.error || "تعذر فتح الرياضة");
        setTimeout(() => setErr(""), 4000);
      }
    } catch {
      setErr("⏰ في انتظار تفعيل API من OroPlay");
      setTimeout(() => setErr(""), 4500);
    }
    setLaunching(false);
  };

  const close = async () => {
    setGameUrl(null);
    if (user) await refreshBalance();
  };

  // Full-screen iframe
  if (gameUrl && user) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col">
        <div className="flex items-center justify-between px-3 py-2"
          style={{ background: "linear-gradient(90deg, rgba(0,209,255,0.15), rgba(0,0,0,0.95))",
                   borderBottom: "1px solid rgba(0,209,255,0.25)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={close} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <ArrowLeft className="w-4 h-4 text-white/70" />
            </button>
            <div className="px-2 py-0.5 rounded text-[9px] font-black flex items-center gap-1 flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#00D1FF,#0066FF)", color: "#000" }}>
              💰 LIVE
            </div>
            <span className="text-xs text-white font-bold truncate">Sportsbook</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{ background: "rgba(0,200,83,0.1)", border: "1px solid rgba(0,200,83,0.25)" }}>
              <Wallet className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-green-400 font-bold">{user.balance} TND</span>
            </div>
            <button onClick={() => { if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; }}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <RefreshCw className="w-3.5 h-3.5 text-white/70" />
            </button>
            <button onClick={() => iframeRef.current?.requestFullscreen?.()}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <Maximize2 className="w-3.5 h-3.5 text-white/70" />
            </button>
          </div>
        </div>
        <iframe ref={iframeRef} src={gameUrl}
          className="flex-1 w-full border-none bg-white"
          allow="fullscreen autoplay payment clipboard-write"
          title="Sportsbook" allowFullScreen />
      </div>
    );
  }

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
                <h1 className="text-xl font-black tracking-wider">SPORTSBOOK</h1>
                <p className="text-[10px] text-white/40 font-mono">LIVE • PRE-MATCH • VIRTUAL</p>
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

          {err && (
            <div className="p-3 rounded-xl text-sm text-center"
              style={{ background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", color: "#FF2D55" }}>
              {err}
            </div>
          )}

          {/* Hero card */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative rounded-2xl overflow-hidden cursor-pointer"
            onClick={launch}
            style={{
              height: 260,
              background: "linear-gradient(135deg, rgba(0,209,255,0.18) 0%, rgba(0,102,255,0.1) 50%, rgba(255,45,85,0.1) 100%)",
              border: "1px solid rgba(0,209,255,0.3)",
            }}>
            <div className="absolute inset-0 opacity-20"
              style={{ background: "radial-gradient(circle at 30% 50%, #00D1FF, transparent 65%)" }} />

            <div className="absolute top-3 right-3 flex gap-1.5 text-2xl">
              <span>⚽</span><span>🏀</span><span>🎾</span><span>🏈</span><span>🥊</span>
            </div>

            <div className="absolute inset-0 flex flex-col justify-center p-5">
              <h2 className="text-3xl font-black tracking-wider text-white mb-1"
                style={{ textShadow: "0 0 20px rgba(0,209,255,0.4)" }}>
                FULL SPORTSBOOK
              </h2>
              <p className="text-xs text-white/60 mb-4 max-w-xs">
                +30 رياضة • Live + Pre-Match • أكثر من 1000 سوق • Cash Out
              </p>

              <div className="flex items-center gap-1.5 flex-wrap mb-4">
                {[
                  { l: "⚽ Football", c: "#00D1FF" },
                  { l: "🏀 Basketball", c: "#FFD700" },
                  { l: "🎾 Tennis", c: "#22c55e" },
                  { l: "🏈 NFL", c: "#a855f7" },
                  { l: "🥊 UFC", c: "#FF2D55" },
                ].map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: `${s.c}20`, color: s.c }}>{s.l}</span>
                ))}
              </div>

              <button
                disabled={launching}
                className="self-start px-5 py-2 rounded-xl text-sm font-black text-black disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #00D1FF, #0066FF)",
                         boxShadow: "0 4px 20px rgba(0,209,255,0.3)" }}>
                {launching ? "Loading..." : oroReady ? "🚀 LAUNCH SPORTSBOOK" : "⏰ COMING SOON"}
              </button>
            </div>
          </motion.div>

          {/* Status banner */}
          <div className="rounded-xl p-3.5"
            style={{
              background: oroReady
                ? "linear-gradient(135deg, rgba(0,200,83,0.06), rgba(0,209,255,0.04))"
                : "linear-gradient(135deg, rgba(255,165,0,0.06), rgba(0,209,255,0.04))",
              border: `1px solid ${oroReady ? "rgba(0,200,83,0.18)" : "rgba(255,165,0,0.18)"}`
            }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: oroReady ? "rgba(0,200,83,0.15)" : "rgba(255,165,0,0.15)" }}>
                {oroReady
                  ? <Zap className="w-4 h-4 text-green-400" />
                  : <Shield className="w-4 h-4 text-orange-400" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white mb-1">
                  {oroReady ? "✅ Real TND Mode Active" : "⏰ في انتظار تفعيل OroPlay API"}
                </p>
                <p className="text-[10px] text-white/55 leading-relaxed">
                  {oroReady
                    ? "Sportsbook متصل برصيدك TND مباشرة عبر Seamless Wallet. كل رهان يخصم تلقائياً، كل ربح يضاف فوراً."
                    : "Sports vendor (id=50) قيد التفعيل من OroPlay. سيتفعل خلال 24 ساعة وسيشتغل تلقائياً برصيدك TND."}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Sports", value: "30+", color: "#00D1FF", icon: "⚽" },
              { label: "Markets", value: "1000+", color: "#FFD700", icon: "📊" },
              { label: "Live 24/7", value: "Yes", color: "#FF2D55", icon: "🔴" },
            ].map((s, i) => (
              <div key={i} className="rounded-xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-xl mb-1">{s.icon}</div>
                <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] text-white/40 uppercase">{s.label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="rounded-xl p-3 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,209,255,0.04), rgba(255,215,0,0.03))",
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
            <p className="text-[10px] text-white/40 leading-relaxed">
              في الانتظار؟ جرّب <span className="text-[#FF2D55] font-semibold">TVBet Live TV</span> في Live Casino، أو <span className="text-[#00D1FF] font-semibold">1577 لعبة كازينو</span> في Casino ←
            </p>
          </div>
        </div>
      </motion.div>

      {auth && <AuthModal onClose={() => setAuth(false)} />}
    </>
  );
}
