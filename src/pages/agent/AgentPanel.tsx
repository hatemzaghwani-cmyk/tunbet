import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, DollarSign, LogOut, Plus, Trash2, Key, RefreshCw, Search, CheckCircle, AlertCircle, X, Shield, Eye, EyeOff } from "lucide-react";
import * as localApi from "@/lib/localApi";

interface Player {
  id: number;
  username: string;
  email?: string;
  balance: string;
  is_active: boolean;
  created_at: string;
}

interface Transaction {
  id: number;
  user_id: number;
  type: string;
  amount: string;
  balance_after: string;
  description?: string;
  created_at: string;
}

export default function AgentPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("agent_token");
    if (stored) {
      const p = localApi.verifyToken(stored);
      if (p && p.role === "agent") {
        setToken(stored);
        setShowLogin(false);
        localApi.apiMe(stored).then(u => setUser(u)).catch(() => {
          localStorage.removeItem("agent_token");
          setShowLogin(true);
        });
        return;
      }
    }
    localStorage.removeItem("agent_token");
    setShowLogin(true);
  }, []);

  if (showLogin || !token) {
    return <AgentLogin onLogin={(t, u) => { setToken(t); setUser(u); setShowLogin(false); }} />;
  }

  const logout = () => { localStorage.removeItem("agent_token"); setToken(null); setUser(null); setShowLogin(true); };

  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{background:"#020408"}}><div className="w-8 h-8 rounded-full animate-spin" style={{borderWidth:3,borderStyle:"solid",borderColor:"rgba(168,85,247,0.3)",borderTopColor:"#a855f7"}} /></div>;
  return <AgentDashboard user={user} token={token} logout={logout} />;
}

function AgentLogin({ onLogin }: { onLogin: (t: string, u: any) => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      const data = await localApi.apiLogin(u, p);
      if (data.user.role !== "agent") throw new Error("هذا الحساب ليس حساب وكيل");
      localStorage.setItem("agent_token", data.token);
      onLogin(data.token, data.user);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #020408 0%, #0a1628 50%, #020408 100%)" }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.05))", border: "2px solid rgba(168,85,247,0.3)" }}>
            <Shield className="w-10 h-10" style={{ color: "#a855f7" }} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider">TUNBET</h1>
          <p className="text-white/30 text-sm mt-1">لوحة الوكيل</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <input type="text" placeholder="اسم المستخدم" value={u} onChange={e => setU(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl text-white text-sm outline-none text-right" style={{ background: "transparent" }} />
          </div>
          <div className="rounded-2xl p-1 flex items-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <button type="button" onClick={() => setShowPass(!showPass)} className="px-3 text-white/30">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <input type={showPass ? "text" : "password"} placeholder="كلمة السر" value={p} onChange={e => setP(e.target.value)}
              className="flex-1 px-3 py-4 rounded-2xl text-white text-sm outline-none text-right" style={{ background: "transparent" }} />
          </div>
          {err && <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.2)", color: "#FF2D55" }}>
            <AlertCircle className="w-4 h-4" />{err}
          </div>}
          <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl font-black text-sm"
            style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff" }}>
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function AgentDashboard({ user, token, logout }: { user: any; token: string; logout: () => void }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [agentBalance, setAgentBalance] = useState<string>(user?.balance ?? "0");
  const [activeTab, setActiveTab] = useState<"players" | "transactions">("players");
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showBalance, setShowBalance] = useState<Player | null>(null);
  const [showPassword, setShowPassword] = useState<Player | null>(null);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [p, t, me] = await Promise.all([
        localApi.apiAgentPlayers(token),
        localApi.apiAgentTransactions(token),
        localApi.apiAgentMe(token),
      ]);
      setPlayers(p as Player[]);
      setTransactions(t as Transaction[]);
      setAgentBalance((me as { balance: string }).balance);
    } catch {}
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredPlayers = players.filter(p => p.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen text-white" style={{ background: "#020408", fontFamily: "'Outfit', sans-serif" }}>
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ background: notification.type === "success" ? "rgba(0,209,255,0.15)" : "rgba(255,45,85,0.15)", border: `1px solid ${notification.type === "success" ? "rgba(0,209,255,0.4)" : "rgba(255,45,85,0.4)"}`, color: notification.type === "success" ? "#00D1FF" : "#FF2D55" }}
          >
            {notification.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div>
          <div className="font-black tracking-widest text-sm">TUNBET</div>
          <div className="text-white/40 text-xs">Agent Panel — {user?.username ?? ""}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-white/40 text-xs">Your Credit</div>
            <div className="font-black tabular-nums" style={{ color: "#00D1FF" }}>
              {parseFloat(agentBalance || "0").toFixed(2)} TND
            </div>
          </div>
          <button onClick={logout} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-6" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {[{ id: "players" as const, label: "My Players" }, { id: "transactions" as const, label: "Transactions" }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="py-3 px-4 text-sm font-medium border-b-2 transition-all"
            style={{ borderColor: activeTab === tab.id ? "#00D1FF" : "transparent", color: activeTab === tab.id ? "#00D1FF" : "rgba(255,255,255,0.4)" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === "players" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  placeholder="Search players..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #00D1FF 0%, #00D1FF 100%)", color: "#020408" }}
              >
                <Plus className="w-4 h-4" /> Add Player
              </button>
              <button onClick={loadData} className="p-3 rounded-xl hover:bg-white/5">
                <RefreshCw className="w-4 h-4 text-white/40" />
              </button>
            </div>
            <div className="space-y-2">
              {filteredPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div>
                    <div className="font-semibold">{player.username}</div>
                    <div className="text-xs text-white/40">{player.email ?? "No email"} · Joined {new Date(player.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-white/40">Balance</div>
                      <div className="font-bold" style={{ color: "#00D1FF" }}>{parseFloat(player.balance).toFixed(2)}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setShowBalance(player)} className="p-2 rounded-lg hover:bg-white/10" title="إيداع/سحب">
                        <DollarSign className="w-4 h-4" style={{ color: "#22c55e" }} />
                      </button>
                      <button onClick={() => setShowPassword(player)} className="p-2 rounded-lg hover:bg-white/10" title="Change password">
                        <Key className="w-4 h-4" style={{ color: "#f59e0b" }} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm("Delete player?")) return;
                          try {
                            await localApi.apiAgentDeletePlayer(token!, player.id);
                            loadData();
                            notify("Player deleted");
                          } catch { notify("Failed", "error"); }
                        }}
                        className="p-2 rounded-lg hover:bg-white/10" title="Delete"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: "#FF2D55" }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredPlayers.length === 0 && (
                <div className="text-center py-16 text-white/30">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No players yet. Click "Add Player" to create one.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["User ID", "Type", "Amount", "Balance After", "Description", "Date"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-white/40 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                    <td className="px-4 py-3 text-white/40">#{t.user_id}</td>
                    <td className="px-4 py-3 capitalize">{t.type}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: parseFloat(t.amount) >= 0 ? "#22c55e" : "#FF2D55" }}>
                      {parseFloat(t.amount) >= 0 ? "+" : ""}{Math.abs(parseFloat(t.amount)).toFixed(2)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#00D1FF" }}>{parseFloat(t.balance_after).toFixed(2)}</td>
                    <td className="px-4 py-3 text-white/50">{t.description ?? "-"}</td>
                    <td className="px-4 py-3 text-white/30 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && <div className="text-center py-12 text-white/30">No transactions</div>}
          </div>
        )}
      </div>


      {showBalance && (
        <AgentBalanceModal
          player={showBalance}
          token={token!}
          onClose={() => setShowBalance(null)}
          onDone={async () => { await loadData(); setShowBalance(null); notify("تم تحديث الرصيد"); }}
        />
      )}

      {showCreate && (
        <CreatePlayerModal
          token={token!}
          onClose={() => setShowCreate(false)}
          onDone={async () => { await loadData(); setShowCreate(false); notify("Player created"); }}
        />
      )}

      {showPassword && (
        <ChangePasswordModal
          player={showPassword}
          token={token!}
          onClose={() => setShowPassword(null)}
          onDone={() => { setShowPassword(null); notify("Password changed"); }}
        />
      )}
    </div>
  );
}

function CreatePlayerModal({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await localApi.apiAgentCreatePlayer(token, { username, password, email: email || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="w-full max-w-sm p-6 rounded-2xl" style={{ background: "#0a0e14", border: "1px solid rgba(0,209,255,0.2)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold">Create Player</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-white/40" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" placeholder="Username" required value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <input type="email" placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          {error && <p className="text-sm" style={{ color: "#FF2D55" }}>{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: "linear-gradient(135deg, #00D1FF 0%, #00D1FF 100%)", color: "#020408" }}>
            {loading ? "Creating..." : "Create Player"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({ player, token, onClose, onDone }: { player: Player; token: string; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await localApi.apiAgentChangePassword(token, player.id, password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="w-full max-w-sm p-6 rounded-2xl" style={{ background: "#0a0e14", border: "1px solid rgba(0,209,255,0.2)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold">Change Password: <span style={{ color: "#00D1FF" }}>{player.username}</span></h3>
          <button onClick={onClose}><X className="w-5 h-5 text-white/40" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="password" placeholder="New password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          {error && <p className="text-sm" style={{ color: "#FF2D55" }}>{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: "linear-gradient(135deg, #00D1FF 0%, #00D1FF 100%)", color: "#020408" }}>
            {loading ? "Saving..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}


function AgentBalanceModal({ player, token, onClose, onDone }: { player: Player; token: string; onClose: () => void; onDone: () => void }) {
  const [action, setAction] = useState<"add" | "withdraw">("add");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("أدخل مبلغاً صحيحاً"); return; }
    setLoading(true);
    setError("");
    try {
      // Use the strict, race-safe API function (centralized in supabaseApi.ts)
      await localApi.apiAgentPlayerBalance(token, player.id, action, amt);
      onDone();
    } catch (err: any) {
      setError(err.message || "خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="w-full max-w-sm p-6 rounded-2xl" style={{ background: "#0a0e14", border: "1px solid rgba(0,209,255,0.2)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold">رصيد: <span style={{ color: "#00D1FF" }}>{player.username}</span></h3>
          <button onClick={onClose}><X className="w-5 h-5 text-white/40" /></button>
        </div>
        <div className="mb-4 p-3 rounded-xl text-center" style={{ background: "rgba(0,209,255,0.08)" }}>
          <div className="text-white/40 text-xs">الرصيد الحالي</div>
          <div className="text-2xl font-black" style={{ color: "#00D1FF" }}>{parseFloat(player.balance).toFixed(2)} TND</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(["add", "withdraw"] as const).map(a => (
              <button key={a} type="button" onClick={() => setAction(a)} className="py-2 rounded-xl text-sm font-semibold"
                style={{ background: action === a ? (a === "add" ? "#22c55e" : "#FF2D55") : "rgba(255,255,255,0.05)", color: action === a ? "#fff" : "rgba(255,255,255,0.5)" }}>
                {a === "add" ? "إيداع +" : "سحب −"}
              </button>
            ))}
          </div>
          <input type="number" placeholder="المبلغ" min="0.01" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none text-center text-xl font-bold"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: action === "add" ? "#22c55e" : "#FF2D55" }} />
          {error && <p className="text-sm text-center" style={{ color: "#FF2D55" }}>{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
            style={{ background: action === "add" ? "#22c55e" : "#FF2D55", color: "#fff" }}>
            {loading ? "جاري..." : action === "add" ? `إيداع ${amount || "0"} TND` : `سحب ${amount || "0"} TND`}
          </button>
        </form>
      </div>
    </div>
  );
}
