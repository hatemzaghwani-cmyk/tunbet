import { Link, useLocation } from "wouter";
import { Gamepad2, Trophy, Flame, Vault } from "lucide-react";
import { motion } from "framer-motion";
import { t, isRTL } from "@/lib/i18n";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: t("casino"), icon: Gamepad2 },
    { path: "/sports", label: t("sports"), icon: Trophy },
    { path: "/live", label: t("live"), icon: Flame },
    { path: "/vault", label: t("vault"), icon: Vault },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      dir={isRTL() ? "rtl" : "ltr"}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
    >
      <div className="w-full pointer-events-auto px-3 pb-3">
        <nav
          className="flex justify-around items-center rounded-2xl relative"
          style={{
            background: "rgba(2,4,8,0.94)",
            border: "1px solid rgba(155,80,255,0.18)",
            backdropFilter: "blur(24px)",
            padding: "12px 6px",
          }}
        >
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path}
                className="relative flex flex-col items-center justify-center z-10"
                style={{ minWidth: 76, paddingTop: 4, paddingBottom: 2 }}>
                {isActive && (
                  <motion.div layoutId="nav-active-bg" className="absolute inset-0 rounded-xl -z-10"
                    style={{ background: "rgba(155,80,255,0.13)" }} initial={false}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                )}
                {isActive && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-full"
                    style={{ width: 36, height: 3, background: "#9B50FF", boxShadow: "0 0 12px rgba(155,80,255,0.9)" }} />
                )}
                <item.icon style={{
                  width: 30, height: 30, marginBottom: 5,
                  color: isActive ? "#9B50FF" : "rgba(255,255,255,0.35)",
                  filter: isActive ? "drop-shadow(0 0 8px rgba(155,80,255,0.8))" : "none",
                  transition: "all 0.3s",
                }} />
                <span style={{
                  fontSize: 12, fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#9B50FF" : "rgba(255,255,255,0.35)",
                  transition: "all 0.3s", letterSpacing: "0.03em",
                }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
