import { useState } from "react";
import { Link } from "wouter";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "./AuthModal";
import { t } from "@/lib/i18n";

export function Header() {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: "rgba(0,209,255,0.1)", border: "1px solid rgba(0,209,255,0.2)" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "#00D1FF", color: "#020408" }}>
                  {user.username[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold" style={{ color: "#00D1FF" }}>
                  {parseFloat(user.balance).toFixed(2)} TND
                </span>
                <ChevronDown className="w-3 h-3 text-white/40" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl py-2 z-50"
                  style={{ background: "rgba(2,4,8,0.98)", border: "1px solid rgba(0,209,255,0.2)", backdropFilter: "blur(20px)" }}>
                  <div className="px-4 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <div className="text-xs text-white/40">{t("balance")}</div>
                    <div className="font-bold" style={{ color: "#00D1FF" }}>{parseFloat(user.balance).toFixed(2)} TND</div>
                  </div>
                  <button onClick={() => { logout(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white">
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

