import { motion } from "framer-motion";
import { Trophy, ArrowLeft, RefreshCw, Maximize2, Activity, Shield, Zap } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { oroLaunchGame, isOroAvailable } from "@/lib/oroClient";

// Real sportsbook running through OroPlay aggregator
// vendor: id=50, vendorCode="sports", gameCode="sports"
// Host (preview): sports.eyq8vmw3.com
// When OroPlay activates API, oroLaunchGame returns a signed URL with token
// → seamless wallet automatically debits/credits user's TND balance via callbacks

const PREVIEW_URL = "https://sports.eyq8vmw3.com/";

export default function Sports() {
  const { user, refreshBalance } = useAuth();
  const [auth, setAuth] = useState(false);
  const [oroReady, setOroReady] = useState(false);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [err, setErr] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    isOroAvailable().then(setOroReady);
  }, []);

  const launch = async (forcePreview = false) => {
    if (!user && !forcePreview) { setAuth(true); return; }

    // Preview mode (browse only, no betting)
    if (forcePreview || !oroReady) {
      setPreviewMode(true);
      setGameUrl(PREVIEW_URL);
      return;
    }

    // Real mode — request signed URL from OroPlay
    if (!user) { setAuth(true); return; }
    if (parseFloat(user.balance) <= 0) {
      setErr("رصيدك غير كافٍ. اشحن رصيدك أولاً");
      setTimeout(() => setErr(""), 4000);
      return;
    }
    setLaunching(true); setErr("");
    try {
      const res = await oroLaunchGame(`tb_${user.id}`, "sports", "sports", "en");
      if (res?.url) {
        setPreviewMode(false);
        setGameUrl(res.url);
      } else {
        setErr(res?.error || "تعذر فتح الرياضة");
        setTimeout(() => setErr(""), 4000);
      }
    } catch (e: any) {
      setErr("⏰ في انتظار تفعيل API من OroPlay - جرّب Preview Mode");
      setTimeout(() => setErr(""), 4500);
    }
    setLaunching(false);
  };

  const close = async () => {
    setGameUrl(null);
    setPreviewMode(false);
    if (user) await refreshBalance();
  };

  // Show iframe full-screen when game is launched
  if (gameUrl) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-2"
          style={{ background: "linear-gradient(90deg, rgba(0,209,255,0.12), rgba(0,0,0,0.95))",
                   borderBottom: "1px solid rgba(0,209,255,0.15)" }}>
          <div className="flex items-center gap-2">
            <button onClick={close} className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <ArrowLeft className="w-4 h-4 text-white/70" />
            </button>
            <div className="px-2 py-0.5 rounded text-[9px] font-black flex items-center gap-1"
              style={{
                background: previewMode ? "rgba(255,165,0,0.85)" : "rgba(0,209,255,0.9)",
                color: "#000"
              }}>
              {previewMode ? "👁 PREVIEW" : <><Activity className="w-2.5 h-2.5" />SPORTS</>}
            </div>
            {!previewMode && (
              <span className="text-xs text-white/50 font-mono">
                💰 {user?.balance} TND
              </span>
            )}
            {previewMode && (
              <span className="text-xs text-orange-300 font-medium">
                Browse Only — No Real Bets
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => iframeRef.current?.contentWindow?.location.reload()}
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

        {/* Iframe */}
        <iframe
          ref={iframeRef}
          src={gameUrl}
          className="flex-1 w-full border-none bg-white"
          allow="fullscreen autoplay payment"
          title="Sportsbook"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
        />
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
                <p className="text-[10px] text-white/40 font-mono">
                  LIVE + VIRTUAL + PRE-MATCH
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
                {oroReady ? "LIVE" : "PREVIEW"}
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
            onClick={() => launch(false)}
            style={{
              height: 240,
              background: "linear-gradient(135deg, rgba(0,209,255,0.15) 0%, rgba(0,102,255,0.08) 50%, rgba(255,45,85,0.1) 100%)",
              border: "1px solid rgba(0,209,255,0.25)",
            }}>
            <div className="absolute inset-0 opacity-20"
              style={{ background: "radial-gradient(circle at 30% 50%, #00D1FF66, transparent 60%)" }} />

            {/* Floating sport icons */}
            <div className="absolute top-3 right-3 flex gap-1.5 text-2xl">
              <span>⚽</span><span>🏀</span><span>🎾</span><span>🏈</span>
            </div>

            <div className="absolute inset-0 flex flex-col justify-center p-5">
              <h2 className="text-3xl font-black tracking-wider text-white mb-1"
                style={{ textShadow: "0 0 20px rgba(0,209,255,0.4)" }}>
                FULL SPORTSBOOK
              </h2>
              <p className="text-xs text-white/60 mb-3 max-w-xs">
                +30 رياضة • مباريات حية • Pre-match • Virtual Sports • Mini Games
              </p>

              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: "rgba(0,209,255,0.15)", color: "#00D1FF" }}>⚽ Football</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700" }}>🏀 Basketball</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: "rgba(255,107,53,0.15)", color: "#FF6B35" }}>🏇 Horse Racing</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7" }}>🐕 Dog Racing</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: "rgba(236,72,153,0.15)", color: "#ec4899" }}>🎰 Keno</span>
              </div>

              <button
                disabled={launching}
                className="self-start px-5 py-2 rounded-xl text-sm font-black text-black disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #00D1FF, #0066FF)",
                         boxShadow: "0 4px 20px rgba(0,209,255,0.3)" }}>
                {launching ? "Loading..." : oroReady ? "🚀 LAUNCH SPORTSBOOK" : "👁 LAUNCH PREVIEW"}
              </button>
            </div>
          </motion.div>

          {/* Status info */}
          <div className="rounded-xl p-3.5"
            style={{
              background: oroReady
                ? "linear-gradient(135deg, rgba(0,200,83,0.06), rgba(0,209,255,0.04))"
                : "linear-gradient(135deg, rgba(255,165,0,0.06), rgba(0,209,255,0.04))",
              border: `1px solid ${oroReady ? "rgba(0,200,83,0.15)" : "rgba(255,165,0,0.15)"}`
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
                  {oroReady ? "✅ Real Money Mode Active" : "⏰ في انتظار تفعيل OroPlay API"}
                </p>
                <p className="text-[10px] text-white/55 leading-relaxed">
                  {oroReady
                    ? "Sportsbook متصل برصيدك TND مباشرة. كل رهان يخصم تلقائياً، كل ربح يضاف فوراً."
                    : "Sportsbook كامل متاح حالياً للتصفح فقط (Preview Mode). الرهان الحقيقي سيُفعّل خلال 24 ساعة عند تفعيل OroPlay لـ Sports vendor."}
                </p>
                <div className="flex gap-3 mt-2 flex-wrap">
                  <span className="text-[9px] text-white/40">📊 30+ Sports</span>
                  <span className="text-[9px] text-white/40">⚡ Live Odds</span>
                  <span className="text-[9px] text-white/40">🎯 Bet Slip</span>
                  <span className="text-[9px] text-white/40">📜 Bet History</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats */}
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

          {/* Preview option */}
          {!oroReady && (
            <button onClick={() => launch(true)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,165,0,0.3)",
                color: "#FFA000"
              }}>
              👁 افتح Preview Mode (تصفح فقط، بدون رهان)
            </button>
          )}

          {/* CTA */}
          <div className="rounded-xl p-3 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,209,255,0.04), rgba(255,215,0,0.03))",
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
            <p className="text-[10px] text-white/40 leading-relaxed">
              في الانتظار؟ جرّب <span className="text-[#00D1FF] font-semibold">1577 لعبة كازينو</span> برصيد TND حقيقي ←
            </p>
          </div>
        </div>
      </motion.div>

      {auth && <AuthModal onClose={() => setAuth(false)} />}
    </>
  );
}
