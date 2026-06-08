import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { User, LogOut, ChevronDown, ShieldCheck, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "./AuthModal";
import { t } from "@/lib/i18n";

export function Header() {
  const { user, logout, refreshBalance } = useAuth();
  const [, navigate] = useLocation();
  const [showAuth, setShowAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside-to-close
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  // Auto-refresh balance every 30s when logged in (passive sync)
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(() => refreshBalance().catch(() => {}), 30000);
    return () => clearInterval(iv);
  }, [user, refreshBalance]);

  const manualRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await refreshBalance(); } catch {}
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <>
      <header
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-40"
        dir="ltr"
        style={{
          background: "rgba(2,4,8,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ border: "1.5px solid #00D1FF", boxShadow: "0 0 12px rgba(0,209,255,0.4)" }}>
            <span className="font-black text-xl leading-none" style={{ color: "#00D1FF" }}>M</span>
          </div>
          <span className="font-black tracking-[0.18em] text-base text-white">MEBET</span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative" ref={menuRef}>
              <div className="flex items-center gap-1 rounded-xl"
                style={{ background: "rgba(0,209,255,0.1)", border: "1px solid rgba(0,209,255,0.2)" }}>
                <button onClick={manualRefresh} title="Refresh balance"
                  className="p-2 hover:bg-white/5 rounded-l-xl transition-colors">
                  <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} style={{ color: "#00D1FF" }} />
                </button>
                <button onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-2 rounded-r-xl">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "#00D1FF", color: "#020408" }}>
                    {user.username[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: "#00D1FF" }}>
                    {parseFloat(user.balance).toFixed(2)} TND
                  </span>
                  <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
                </button>
              </div>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl py-1 z-50"
                  style={{ background: "rgba(2,4,8,0.98)", border: "1px solid rgba(0,209,255,0.2)", backdropFilter: "blur(20px)" }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">{user.username}</div>
                    <div className="font-black text-base tabular-nums" style={{ color: "#00D1FF" }}>
                      {parseFloat(user.balance).toFixed(2)} TND
                    </div>
                  </div>
                  <button onClick={() => { navigate("/vault"); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5">
                    <ShieldCheck className="w-4 h-4" />
                    Vault & History
                  </button>
                  <button onClick={manualRefresh}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh Balance
                  </button>
                  <div className="border-t my-1" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
                  <button onClick={() => { logout(); setShowUserMenu(false); navigate("/"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-500/10"
                    style={{ color: "#FF2D55" }}>
                    <LogOut className="w-4 h-4" />
                    {t("logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#00D1FF", color: "#020408" }}>
              <User className="w-4 h-4" />
              {t("loginBtn")}
            </button>
          )}
        </div>
      </header>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
