import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, TrendingUp, DollarSign, Shield, LogOut, Plus, Trash2,
  RefreshCw, X, BarChart3, Settings, UserCheck, Trophy, Search,
  AlertCircle, CheckCircle, Key, ArrowUpRight, ArrowDownLeft,
  Eye, EyeOff, ChevronRight
} from "lucide-react";
import * as api from "@/lib/localApi";

type Tab = "home" | "players" | "agents" | "txns" | "settings";

export default function AdminPanel() {
  // Always require login — clear any stale token on mount
  const [token, setToken] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    // Check if stored token is valid
    const stored = localStorage.getItem("admin_token");
    if (stored) {
      try {
        const p = api.verifyToken(stored);
        if (p && p.role === "superadmin") {
          setToken(stored);
          setShowLogin(false);
          return;
        }
      } catch {}
    }
    // Force login
    localStorage.removeItem("admin_token");
    setToken(null);
    setShowLogin(true);
  }, []);

  if (showLogin || !token) {
    return <LoginScreen onLogin={(t) => { setToken(t); setShowLogin(false); }} />;
  }

  return <AdminDashboard token={token} onLogout={() => { localStorage.removeItem("admin_token"); setToken(null); setShowLogin(true); }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin }: { onLogin: (t: string) => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const submit = async (e: React.FormEvent) => {
    if (loading) return;
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const d = await api.apiAdminLogin(u, p);
      localStorage.setItem("admin_token", d.token);
      onLogin(d.token);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #020408 0%, #0a1628 50%, #020408 100%)" }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(0,209,255,0.2), rgba(0,209,255,0.05))", border: "2px solid rgba(0,209,255,0.3)", boxShadow: "0 0 40px rgba(0,209,255,0.15)" }}
          >
            <Shield className="w-10 h-10" style={{ color: "#00D1FF" }} />
          </motion.div>
          <h1 className="text-2xl font-black text-white tracking-wider">MEBET</h1>
          <p className="text-white/30 text-sm mt-1">لوحة التحكم</p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <input
              type="text"
              placeholder="اسم المستخدم"
              value={u}
              onChange={e => setU(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl text-white text-sm outline-none text-right"
              style={{ background: "transparent" }}
              autoComplete="username"
            />
          </div>

          <div className="rounded-2xl p-1 flex items-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <button type="button" onClick={() => setShowPass(!showPass)} className="px-3 text-white/30">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <input
              type={showPass ? "text" : "password"}
              placeholder="كلمة السر"
              value={p}
              onChange={e => setP(e.target.value)}
              className="flex-1 px-3 py-4 rounded-2xl text-white text-sm outline-none text-right"
              style={{ background: "transparent" }}
              autoComplete="current-password"
            />
          </div>

          <AnimatePresence>
            {err && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.2)", color: "#FF2D55" }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {err}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-sm tracking-wider"
            style={{ background: "linear-gradient(135deg, #00D1FF, #0088aa)", color: "#020408", boxShadow: "0 4px 20px rgba(0,209,255,0.3)" }}
          >
            {loading ? (
              <div className="w-5 h-5 mx-auto rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(2,4,8,0.3)", borderTopColor: "#020408" }} />
            ) : "دخول"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */
function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [note, setNote] = useState<{ msg: string; ok: boolean } | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [search, setSearch] = useState("");


  const notify = (msg: string, ok = true) => { setNote({ msg, ok }); setTimeout(() => setNote(null), 2500); };

  const load = async () => {
    try {
      const [s, u, a, t] = await Promise.all([
        api.apiAdminStats(),
        api.apiAdminUsers("player"),
        api.apiAdminAgents(),
        api.apiAdminTransactions(),
      ]);
      setStats(s);
      setUsers(u);
      setAgents(a);
      setTxns(t);
    } catch {}
  };

  // Load on mount
  useEffect(() => { load(); }, []);

  // Reload data when switching tabs
  const switchTab = (t: Tab) => {
    setTab(t);
    setSearch("");
    load();
  };

  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: "home", icon: BarChart3, label: "الرئيسية" },
    { id: "players", icon: Users, label: "لاعبين" },
    { id: "agents", icon: UserCheck, label: "وكلاء" },
    { id: "txns", icon: TrendingUp, label: "معاملات" },
    { id: "settings", icon: Settings, label: "إعدادات" },
  ];

  const fp = users.filter((u: any) => u.username.toLowerCase().includes(search.toLowerCase()));
  const fa = agents.filter((a: any) => a.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: "#020408" }}>
      {/* Notification */}
      <AnimatePresence>
        {note && (
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            className="fixed top-4 left-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: note.ok ? "rgba(0,209,255,0.15)" : "rgba(255,45,85,0.15)", border: `1px solid ${note.ok ? "rgba(0,209,255,0.3)" : "rgba(255,45,85,0.3)"}`, color: note.ok ? "#00D1FF" : "#FF2D55", backdropFilter: "blur(10px)" }}>
            {note.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {note.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,209,255,0.12)" }}>
            <Shield className="w-5 h-5" style={{ color: "#00D1FF" }} />
          </div>
          <div>
            <div className="font-black text-sm tracking-widest">MEBET</div>
            <div className="text-[10px] text-white/30">Admin</div>
          </div>
        </div>
        <button onClick={onLogout} className="p-2 rounded-xl" style={{ background: "rgba(255,45,85,0.1)" }}>
          <LogOut className="w-4 h-4" style={{ color: "#FF2D55" }} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {/* ── HOME ── */}
        {tab === "home" && stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">لوحة القيادة</h2>
              <button onClick={load} className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                <RefreshCw className="w-4 h-4 text-white/40" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { l: "اللاعبين", v: stats.playerCount, c: "#00D1FF", i: Users },
                { l: "الوكلاء", v: stats.agentCount, c: "#a855f7", i: UserCheck },
                { l: "الأرصدة", v: `TND ${parseFloat(stats.totalBalance).toFixed(0)}`, c: "#22c55e", i: DollarSign },
                { l: "المعاملات", v: stats.txnCount, c: "#f59e0b", i: TrendingUp },
              ].map(c => (
                <div key={c.l} className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <c.i className="w-5 h-5" style={{ color: c.c, opacity: 0.6 }} />
                  </div>
                  <div className="text-2xl font-black" style={{ color: c.c }}>{c.v}</div>
                  <div className="text-[11px] text-white/30 mt-1">{c.l}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 mt-2">
              <h3 className="text-xs font-bold text-white/30 tracking-widest">إجراءات سريعة</h3>
              {[
                { label: "إضافة لاعب", icon: Plus, color: "#00D1FF", action: () => setModal({ type: "create", role: "player" }) },
                { label: "إضافة وكيل", icon: Plus, color: "#a855f7", action: () => setModal({ type: "create", role: "agent" }) },
              ].map(a => (
                <button key={a.label} onClick={a.action} className="w-full flex items-center justify-between p-4 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${a.color}15` }}>
                      <a.icon className="w-4 h-4" style={{ color: a.color }} />
                    </div>
                    <span className="text-sm font-semibold">{a.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── PLAYERS ── */}
        {tab === "players" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">اللاعبين</h2>
              <button onClick={() => setModal({ type: "create", role: "player" })} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: "#00D1FF", color: "#020408" }}>
                <Plus className="w-3.5 h-3.5" /> إضافة
              </button>
            </div>

            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pr-11 pl-4 py-3 rounded-2xl text-white text-sm outline-none text-right"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
            </div>

            {fp.length === 0 ? (
              <div className="text-center py-16 text-white/20">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا يوجد لاعبين</p>
              </div>
            ) : fp.map((u: any) => (
              <div key={u.id} className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black" style={{ background: "rgba(0,209,255,0.1)", color: "#00D1FF" }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{u.username}</div>
                      <div className="text-[10px] text-white/30">{u.isActive ? "نشط" : "محظور"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-lg" style={{ color: "#00D1FF" }}>{parseFloat(u.balance).toFixed(2)} TND</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal({ type: "balance", user: u, action: "add" })} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
                    <ArrowDownLeft className="w-3.5 h-3.5" /> إيداع
                  </button>
                  <button onClick={() => setModal({ type: "balance", user: u, action: "withdraw" })} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.2)", color: "#FF2D55" }}>
                    <ArrowUpRight className="w-3.5 h-3.5" /> سحب
                  </button>
                  <button onClick={async () => { if (confirm("حذف هذا اللاعب؟")) { await api.apiAdminDeleteUser(u.id); await load(); notify("تم الحذف"); } }}
                    className="w-11 flex items-center justify-center py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Trash2 className="w-3.5 h-3.5 text-white/30" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── AGENTS ── */}
        {tab === "agents" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">الوكلاء</h2>
              <button onClick={() => setModal({ type: "create", role: "agent" })} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: "#a855f7", color: "#fff" }}>
                <Plus className="w-3.5 h-3.5" /> إضافة
              </button>
            </div>

            {fa.length === 0 ? (
              <div className="text-center py-16 text-white/20">
                <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا يوجد وكلاء</p>
              </div>
            ) : fa.map((a: any) => (
              <div key={a.id} className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black" style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7" }}>
                      {a.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{a.username}</div>
                      <div className="text-[10px] text-white/30">وكيل</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-lg" style={{ color: "#a855f7" }}>{parseFloat(a.balance).toFixed(2)} TND</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal({ type: "balance", user: { ...a, role: "agent" }, action: "add" })} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
                    <ArrowDownLeft className="w-3.5 h-3.5" /> إيداع
                  </button>
                  <button onClick={() => setModal({ type: "balance", user: { ...a, role: "agent" }, action: "withdraw" })} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.2)", color: "#FF2D55" }}>
                    <ArrowUpRight className="w-3.5 h-3.5" /> سحب
                  </button>
                  <button onClick={async () => { if (confirm("حذف؟")) { await api.apiAdminDeleteUser(a.id); await load(); notify("تم"); } }}
                    className="w-11 flex items-center justify-center py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Trash2 className="w-3.5 h-3.5 text-white/30" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── TRANSACTIONS ── */}
        {tab === "txns" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <h2 className="text-lg font-black">المعاملات</h2>
            {txns.length === 0 ? (
              <div className="text-center py-16 text-white/20"><TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">لا توجد معاملات</p></div>
            ) : txns.slice(0, 50).map((t: any) => {
              const pos = parseFloat(t.amount) >= 0;
              return (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: pos ? "rgba(34,197,94,0.1)" : "rgba(255,45,85,0.1)" }}>
                      {pos ? <ArrowDownLeft className="w-4 h-4" style={{ color: "#22c55e" }} /> : <ArrowUpRight className="w-4 h-4" style={{ color: "#FF2D55" }} />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold capitalize">{t.type}</div>
                      <div className="text-[10px] text-white/30">{t.description || `User #${t.user_id}`}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm" style={{ color: pos ? "#22c55e" : "#FF2D55" }}>
                      {pos ? "+" : ""}{Math.abs(parseFloat(t.amount)).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-white/20">{new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-black">الإعدادات</h2>

            {/* AES Login */}
            <AesLoginSection notify={notify} />

            {/* Logout */}
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold"
              style={{ background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.15)", color: "#FF2D55" }}>
              <LogOut className="w-4 h-4" /> تسجيل خروج
            </button>
          </motion.div>
        )}
      </div>

      {/* ── BOTTOM TABS ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40" style={{ background: "rgba(2,4,8,0.95)", borderTop: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => switchTab(t.id)}
                className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all"
                style={{ background: active ? "rgba(0,209,255,0.1)" : "transparent" }}>
                <t.icon className="w-5 h-5" style={{ color: active ? "#00D1FF" : "rgba(255,255,255,0.25)" }} />
                <span className="text-[10px] font-semibold" style={{ color: active ? "#00D1FF" : "rgba(255,255,255,0.25)" }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {modal?.type === "balance" && (
          <BalanceModal
            user={modal.user}
            initialAction={modal.action}
            onClose={() => setModal(null)}
            onDone={(msg: string) => { load(); setModal(null); notify(msg); }}
          />
        )}
        {modal?.type === "create" && (
          <CreateModal
            role={modal.role}
            onClose={() => setModal(null)}
            onDone={() => { load(); setModal(null); notify(`تم إنشاء ${modal.role === "player" ? "لاعب" : "وكيل"} ✓`); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BALANCE MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
function BalanceModal({ user, initialAction, onClose, onDone }: { user: any; initialAction: "add" | "withdraw"; onClose: () => void; onDone: (msg: string) => void }) {
  const [action, setAction] = useState<"add" | "withdraw">(initialAction);
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");

  const quickAmounts = [10, 50, 100, 500, 1000];

  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    if (loading) return;
    e.preventDefault();
    setLoading(true);
    setErr("");
    const val = parseFloat(amount);
    if (!val || val <= 0) { setErr("أدخل مبلغ صحيح"); setLoading(false); return; }
    try {
      if (user.role === "agent") {
        await api.apiAdminAgentCredit(user.id, action, val);
      } else {
        await api.apiAdminUserBalance(user.id, action, val);
      }
      onDone(`تم ${action === "add" ? "إيداع" : "سحب"} TND ${val.toFixed(2)} ${action === "add" ? "إلى" : "من"} ${user.username}`);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-lg rounded-t-3xl p-6 space-y-5"
        style={{ background: "#0a0e14", border: "1px solid rgba(0,209,255,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black" style={{ background: "rgba(0,209,255,0.1)", color: "#00D1FF" }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold">{user.username}</div>
              <div className="text-xs text-white/30">الرصيد: <span style={{ color: "#00D1FF" }}>{parseFloat(user.balance).toFixed(2)} TND</span></div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        {/* Action Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
          {(["add", "withdraw"] as const).map(a => (
            <button key={a} onClick={() => setAction(a)}
              className="py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background: action === a ? (a === "add" ? "rgba(34,197,94,0.2)" : "rgba(255,45,85,0.2)") : "transparent",
                color: action === a ? (a === "add" ? "#22c55e" : "#FF2D55") : "rgba(255,255,255,0.3)",
                border: action === a ? `1px solid ${a === "add" ? "rgba(34,197,94,0.3)" : "rgba(255,45,85,0.3)"}` : "1px solid transparent"
              }}>
              {a === "add" ? "إيداع +" : "سحب −"}
            </button>
          ))}
        </div>

        {/* Amount */}
        <form onSubmit={submit} className="space-y-4">
          <div className="text-center">
            <div className="text-xs text-white/30 mb-2">المبلغ</div>
            <input
              type="number" min="0.01" step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-center text-4xl font-black w-full outline-none"
              style={{ background: "transparent", color: action === "add" ? "#22c55e" : "#FF2D55" }}
              autoFocus
            />
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickAmounts.map(q => (
              <button key={q} type="button" onClick={() => setAmount(String(q))}
                className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                {q} TND
              </button>
            ))}
          </div>

          {err && <p className="text-sm text-center" style={{ color: "#FF2D55" }}>{err}</p>}

          <button type="submit" className="w-full py-4 rounded-2xl font-black text-sm"
            style={{
              background: action === "add" ? "linear-gradient(135deg, #22c55e, #16a34a)" : "linear-gradient(135deg, #FF2D55, #dc2626)",
              color: "#fff", boxShadow: `0 4px 20px ${action === "add" ? "rgba(34,197,94,0.3)" : "rgba(255,45,85,0.3)"}`
            }}>
            {action === "add" ? `إيداع TND ${amount || "0"}` : `سحب TND ${amount || "0"}`}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CREATE MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
function CreateModal({ role, onClose, onDone }: { role: string; onClose: () => void; onDone: () => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    if (loading) return;
    e.preventDefault();
    try {
      await api.apiAdminCreateUser({ username: u, password: p, email: email || undefined, role });
      onDone();
    } catch (e: any) { setErr(e.message); }
  };

  const isAgent = role === "agent";
  const color = isAgent ? "#a855f7" : "#00D1FF";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}
      onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-lg rounded-t-3xl p-6 space-y-5"
        style={{ background: "#0a0e14", border: "1px solid rgba(0,209,255,0.1)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg">{isAgent ? "وكيل جديد" : "لاعب جديد"}</h3>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input type="text" placeholder="اسم المستخدم" required value={u} onChange={e => setU(e.target.value)}
            className="w-full px-4 py-4 rounded-2xl text-white text-sm outline-none text-right"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          <input type="password" placeholder="كلمة السر" required value={p} onChange={e => setP(e.target.value)}
            className="w-full px-4 py-4 rounded-2xl text-white text-sm outline-none text-right"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          <input type="email" placeholder="البريد (اختياري)" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-4 rounded-2xl text-white text-sm outline-none text-right"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          {err && <p className="text-sm text-center" style={{ color: "#FF2D55" }}>{err}</p>}
          <button type="submit" className="w-full py-4 rounded-2xl font-black text-sm"
            style={{ background: `linear-gradient(135deg, ${color}, ${isAgent ? "#7c3aed" : "#0088aa"})`, color: isAgent ? "#fff" : "#020408" }}>
            إنشاء {isAgent ? "وكيل" : "لاعب"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AES LOGIN SECTION (in Settings)
   ═══════════════════════════════════════════════════════════════════════════ */
function AesLoginSection({ notify }: { notify: (msg: string, ok?: boolean) => void }) {
  const [status, setStatus] = useState<"checking"|"connected"|"error">("checking");
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    // Test the token by calling providers
    (async () => {
      try {
        const t = api.getAesToken();
        if (!t) { setStatus("error"); return; }
        const r = await fetch("https://api.aesgamingasia.com/v4/game/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${t}` },
          body: JSON.stringify({ lang: 1 }),
        });
        const d = await r.json() as any;
        if (d.code === 0) {
          setStatus("connected");
          setInfo({ providers: d.data?.length || 0 });
        } else {
          setStatus("error");
        }
      } catch { setStatus("error"); }
    })();
  }, []);

  return (
    <div className="p-5 rounded-2xl space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: status === "connected" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)" }}>
          <Key className="w-5 h-5" style={{ color: status === "connected" ? "#22c55e" : "#f59e0b" }} />
        </div>
        <div>
          <div className="font-bold text-sm">AES Gaming Asia</div>
          <div className="text-[10px] text-white/30">نظام تشغيل الألعاب</div>
        </div>
      </div>

      {status === "checking" && (
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(0,209,255,0.05)" }}>
          <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#00D1FF" }} />
          <span className="text-sm text-white/50">جاري التحقق من الاتصال...</span>
        </div>
      )}

      {status === "connected" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <CheckCircle className="w-5 h-5" style={{ color: "#22c55e" }} />
            <div>
              <div className="text-sm font-bold" style={{ color: "#22c55e" }}>متصل ✓ الألعاب تعمل 24/7</div>
              <div className="text-[10px] text-white/30">
                {info?.providers} مزود ألعاب • 1577+ لعبة
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Pragmatic Play", "Evolution", "PG Soft"].map(p => (
              <div key={p} className="p-2 rounded-xl text-center text-[10px] text-white/40"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                {p}
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)" }}>
          <AlertCircle className="w-5 h-5" style={{ color: "#FF2D55" }} />
          <div>
            <div className="text-sm font-bold" style={{ color: "#FF2D55" }}>غير متصل</div>
            <div className="text-[10px] text-white/30">تحقق من اتصال الإنترنت</div>
          </div>
        </div>
      )}
    </div>
  );
}
