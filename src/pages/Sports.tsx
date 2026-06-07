import { motion } from "framer-motion";
import { Trophy, ArrowLeft, RefreshCw, Maximize2, Activity, Shield, Zap, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { oroLaunchGame, isOroAvailable } from "@/lib/oroClient";

// ─────────────────────────────────────────────────────────────────────────────
// Sportsbook providers — all are iframe-embeddable (no X-Frame-Options)
// ─────────────────────────────────────────────────────────────────────────────
// 1. TVBET (BetCore vertical) - public demo server clientId=9999 → INSTANT PLAY
//    Demo balance, fully interactive, real games (Poker, Blackjack, Lucky6, Wheelbet, 1Bet, 5Bet, 7Bet, Keno, War of Elements)
// 2. Sports (OroPlay vendor #50) - full pre-match + live betting sportsbook
//    Preview mode now, REAL MONEY (TND) when OroPlay activates API
// ─────────────────────────────────────────────────────────────────────────────

interface Provider {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  gradient: string;
  type: "tvbet" | "iframe" | "oro";
  url?: string;
  mode: "demo" | "preview" | "real";
  features: string[];
}

const PROVIDERS: Provider[] = [
  {
    id: "tvbet",
    name: "TVBet Live Games",
    desc: "Poker • Blackjack • Lucky6 • Keno • Wheelbet • 1Bet • 5Bet",
    icon: "🎲",
    color: "#FF2D55",
    gradient: "linear-gradient(135deg, rgba(255,45,85,0.18), rgba(255,107,53,0.1))",
    type: "tvbet",
    url: "https://tvbetframe.com/?clientId=9999&lng=en",
    mode: "demo",
    features: ["24/7 Live", "9 Games", "Instant Play", "Demo Balance"],
  },
  {
    id: "sportsbook",
    name: "Pre-Match & Live Sports",
    desc: "Football • Basketball • Tennis • UFC • +30 sports • Bet Slip + History",
    icon: "⚽",
    color: "#00D1FF",
    gradient: "linear-gradient(135deg, rgba(0,209,255,0.18), rgba(0,102,255,0.1))",
    type: "oro",
    url: "https://sports.eyq8vmw3.com/",
    mode: "preview",
    features: ["Pre-Match", "Live Odds", "Cash Out", "Bet Slip"],
  },
];

export default function Sports() {
  const { user, refreshBalance } = useAuth();
  const [auth, setAuth] = useState(false);
  const [oroReady, setOroReady] = useState(false);
  const [active, setActive] = useState<Provider | null>(null);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { isOroAvailable().then(setOroReady); }, []);

  const launch = async (p: Provider) => {
    if (!user) { setAuth(true); return; }
    setLaunching(p.id); setErr("");

    try {
      if (p.type === "tvbet") {
        // TVBet demo - works instantly
        setActive(p);
        setGameUrl(p.url!);
      } else if (p.type === "oro") {
        // OroPlay sportsbook
        if (oroReady) {
          // Real money mode - get signed launch URL
          const res = await oroLaunchGame(`tb_${user.id}`, "sports", "sports", "en");
          if (res?.url) {
            setActive({ ...p, mode: "real" });
            setGameUrl(res.url);
          } else {
            setErr(res?.error || "تعذر فتح الرياضة");
            setTimeout(() => setErr(""), 4000);
          }
        } else {
          // Preview mode - browse only
          setActive(p);
          setGameUrl(p.url!);
        }
      }
    } catch (e: any) {
      setErr("⏰ سيتفعل قريباً عبر OroPlay. جرّب TVBet الآن");
      setTimeout(() => setErr(""), 4500);
    }
    setLaunching(null);
  };

  const close = async () => {
    setGameUrl(null);
    setActive(null);
    if (user) await refreshBalance();
  };

  // ───────────── Full-screen iframe view ─────────────
  if (gameUrl && active) {
    const modeColor = active.mode === "real" ? "#00C853" :
                      active.mode === "preview" ? "#FFA000" : "#FF2D55";
    const modeText = active.mode === "real" ? "💰 REAL TND" :
                     active.mode === "preview" ? "👁 PREVIEW" : "🎮 DEMO";
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col">
        <div className="flex items-center justify-between px-3 py-2"
          style={{ background: "linear-gradient(90deg, rgba(0,209,255,0.12), rgba(0,0,0,0.95))",
                   borderBottom: `1px solid ${active.color}40` }}>
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={close} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <ArrowLeft className="w-4 h-4 text-white/70" />
            </button>
            <div className="px-2 py-0.5 rounded text-[9px] font-black flex items-center gap-1 flex-shrink-0"
              style={{ background: modeColor, color: "#000" }}>
              {modeText}
            </div>
            <span className="text-xs text-white/60 font-bold truncate">{active.name}</span>
            {active.mode === "real" && (
              <span className="text-xs text-white/50 font-mono flex-shrink-0">
                💰 {user?.balance} TND
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
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

        <iframe
          ref={iframeRef}
          src={gameUrl}
          className="flex-1 w-full border-none bg-white"
          allow="fullscreen autoplay payment clipboard-write"
          title={active.name}
          allowFullScreen
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
                  LIVE • PRE-MATCH • VIRTUAL • TV GAMES
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full"
              style={{
                background: oroReady ? "rgba(0,200,83,0.15)" : "rgba(255,45,85,0.15)",
                border: `1px solid ${oroReady ? "rgba(0,200,83,0.3)" : "rgba(255,45,85,0.3)"}`
              }}>
              <Activity className={`w-3 h-3 ${oroReady ? "text-green-400" : "text-pink-400"}`} />
              <span className="text-[10px] font-bold"
                style={{ color: oroReady ? "#00C853" : "#FF2D55" }}>
                {oroReady ? "LIVE" : "DEMO READY"}
              </span>
            </div>
          </div>

          {err && (
            <div className="p-3 rounded-xl text-sm text-center"
              style={{ background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", color: "#FF2D55" }}>
              {err}
            </div>
          )}

          {/* Providers list */}
          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const isOroReal = p.type === "oro" && oroReady;
              const badgeMode = p.type === "tvbet" ? "demo" : (isOroReal ? "real" : "preview");

              return (
                <motion.div
                  key={p.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => launch(p)}
                  className="relative rounded-2xl overflow-hidden cursor-pointer"
                  style={{
                    background: p.gradient,
                    border: `1px solid ${p.color}40`,
                  }}>
                  <div className="absolute inset-0 opacity-15"
                    style={{ background: `radial-gradient(circle at 20% 50%, ${p.color}, transparent 65%)` }} />

                  <div className="relative p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-4xl flex-shrink-0">{p.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-base font-black text-white">{p.name}</h3>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
                            style={{
                              background: badgeMode === "real" ? "rgba(0,200,83,0.85)" :
                                          badgeMode === "preview" ? "rgba(255,165,0,0.85)" :
                                          "rgba(255,45,85,0.85)",
                              color: "#000"
                            }}>
                            {badgeMode === "real" ? "💰 REAL TND" :
                             badgeMode === "preview" ? "👁 PREVIEW" : "🎮 DEMO"}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/55 mb-2 leading-snug">{p.desc}</p>

                        <div className="flex gap-1.5 flex-wrap mb-3">
                          {p.features.map((f, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                              style={{ background: `${p.color}20`, color: p.color }}>
                              {f}
                            </span>
                          ))}
                        </div>

                        <button
                          disabled={launching === p.id}
                          className="px-4 py-1.5 rounded-lg text-xs font-black text-black inline-flex items-center gap-1.5 disabled:opacity-50"
                          style={{ background: p.color }}>
                          {launching === p.id ? "Loading..." : "Launch"}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Info banner */}
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
                  {oroReady ? "✅ Real TND Mode Active على Pre-Match Sports" : "⏰ Pre-Match Sports: في انتظار تفعيل API"}
                </p>
                <p className="text-[10px] text-white/55 leading-relaxed">
                  <strong className="text-pink-300">TVBet</strong>: شغّال الآن — 9 ألعاب TV حية (Poker, Blackjack, Lucky6, Keno...) برصيد demo<br/>
                  <strong className="text-cyan-300">Pre-Match Sports</strong>: {oroReady ? "متصل برصيدك TND مباشرة" : "Preview الآن، Real Money بكرة لما OroPlay يفعّل API"}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "TV Games", value: "9", color: "#FF2D55", icon: "🎲" },
              { label: "Sports", value: "30+", color: "#00D1FF", icon: "⚽" },
              { label: "Markets", value: "1000+", color: "#FFD700", icon: "📊" },
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
              عاوز كازينو؟ جرّب <span className="text-[#00D1FF] font-semibold">1577 لعبة AES</span> برصيد TND حقيقي ←
            </p>
          </div>
        </div>
      </motion.div>

      {auth && <AuthModal onClose={() => setAuth(false)} />}
    </>
  );
}
