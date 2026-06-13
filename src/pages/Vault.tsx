import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, ShieldCheck, Clock, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { AuthModal } from "@/components/AuthModal";
import { apiMyTransactions } from "@/lib/localApi";

interface Transaction {
  id: number;
  type: string;
  amount: string;
  balance_after: string;
  description?: string;
  created_at: string;
}

export default function Vault() {
  const { user, token, refreshBalance } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const data = await apiMyTransactions(token);
        setTransactions(data as Transaction[]);
      } catch {}
      setLoading(false);
      refreshBalance();
    })();
  }, [token]);

  const typeColor = (type: string) => {
    if (["deposit", "win"].includes(type)) return "#00D1FF";
    if (["withdraw", "loss", "bet", "reset"].includes(type)) return "#FF2D55";
    return "rgba(255,255,255,0.5)";
  };

  const typeIcon = (type: string) => {
    if (["deposit", "win"].includes(type)) return ArrowDownLeft;
    return ArrowUpRight;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="p-4 space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" style={{ color: "#00D1FF" }} />
          <h1 className="text-xl font-black tracking-wider">YOUR VAULT</h1>
        </div>

        {!user ? (
          <div className="rounded-3xl p-8 text-center glass-card">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3" style={{ color: "#00D1FF", opacity: 0.4 }} />
            <p className="text-white/50 mb-4">Sign in to view your vault</p>
            <button
              onClick={() => setShowAuth(true)}
              className="px-6 py-3 rounded-xl font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #00D1FF 0%, #00D1FF 100%)", color: "#020408" }}
            >
              Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <div
              className="rounded-3xl p-6 relative overflow-hidden"
              style={{ background: "rgba(0,209,255,0.06)", border: "1px solid rgba(0,209,255,0.25)", boxShadow: "0 0 40px rgba(0,209,255,0.08)" }}
            >
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20" style={{ background: "linear-gradient(135deg, #00D1FF 0%, #00D1FF 100%)", marginRight: -40, marginTop: -40 }} />
              <p className="text-sm font-medium text-white/50 mb-1">Total Balance</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-black font-mono" style={{ color: "#00D1FF" }}>
                  {parseFloat(user.balance).toFixed(2)} TND
                </span>
              </div>
              <div className="p-3 rounded-xl text-sm text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-white/40 text-xs">Balance is managed by the casino. Contact support to deposit or withdraw.</p>
              </div>
            </div>

            {/* VIP Status */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-1">VIP STATUS</p>
                  <p className="font-black text-lg" style={{ background: "linear-gradient(to right, #00D1FF, #00ff9d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {parseFloat(user.balance) >= 10000 ? "DIAMOND" : parseFloat(user.balance) >= 1000 ? "GOLD" : parseFloat(user.balance) >= 100 ? "SILVER" : "BRONZE"}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(0,209,255,0.12)", border: "1px solid rgba(0,209,255,0.3)" }}>
                  <TrendingUp className="w-6 h-6" style={{ color: "#00D1FF" }} />
                </div>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (parseFloat(user.balance) / 10000) * 100)}%`,
                    background: "linear-gradient(to right, rgba(0,209,255,0.7), #00D1FF)",
                    boxShadow: "0 0 10px rgba(0,209,255,0.5)"
                  }}
                />
              </div>
            </div>

            {/* Transactions */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold tracking-wider text-white/40 uppercase">RECENT ACTIVITY</h2>
              {loading && (
                <div className="text-center py-8 text-white/30 text-sm">Loading...</div>
              )}
              {!loading && transactions.length === 0 && (
                <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Clock className="w-10 h-10 mx-auto mb-2 text-white/20" />
                  <p className="text-white/30 text-sm">No transactions yet</p>
                </div>
              )}
              {transactions.map((tx, i) => {
                const Icon = typeIcon(tx.type);
                const isPositive = parseFloat(tx.amount) >= 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: isPositive ? "rgba(0,209,255,0.1)" : "rgba(255,45,85,0.1)" }}>
                        <Icon className="w-5 h-5" style={{ color: typeColor(tx.type) }} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm capitalize">{tx.type}</p>
                        <p className="text-xs text-white/40">{tx.description ?? new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono" style={{ color: typeColor(tx.type) }}>
                        {isPositive ? "+" : ""}{Math.abs(parseFloat(tx.amount)).toFixed(2)}
                      </p>
                      <p className="text-xs text-white/30">{parseFloat(tx.balance_after).toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </motion.div>
  );
}
