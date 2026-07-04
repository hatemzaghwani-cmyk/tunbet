/**
 * Supabase API — Real cloud database. All devices share same data.
 */

const SUPABASE_URL = "https://cjzjrnagpsdmolvbkhnu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqempybmFncHNkbW9sdmJraG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0ODY4NCwiZXhwIjoyMDk1OTI0Njg0fQ.TmowEatc4g2xpD-GT0r-jofX1zCtXjTD-s4LF7JSs6o";

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

// ── Supabase REST helpers ───────────────────────────────────────────────────
async function sbGet(table: string, query = "") {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers });
  return r.json();
}

async function sbPost(table: string, data: any) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST", headers: { ...headers, "Prefer": "return=representation" },
    body: JSON.stringify(data),
  });
  return r.json();
}

async function sbUpdate(table: string, query: string, data: any) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: "PATCH", headers: { ...headers, "Prefer": "return=representation" },
    body: JSON.stringify(data),
  });
  return r.json();
}

async function sbDelete(table: string, query: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { method: "DELETE", headers });
}

// ── Token ───────────────────────────────────────────────────────────────────
export interface TokenPayload { userId: number; username: string; role: string; }
function signToken(p: TokenPayload): string { return btoa(JSON.stringify(p)); }
export function verifyToken(t: string): TokenPayload | null {
  try { return JSON.parse(atob(t)); } catch { return null; }
}

// ── Auth ────────────────────────────────────────────────────────────────────
export async function apiRegister(username: string, password: string, email?: string) {
  const existing = await sbGet("users", `username=eq.${encodeURIComponent(username)}&select=id`);
  if (existing.length > 0) throw new Error("اسم المستخدم موجود مسبقاً");
  const [user] = await sbPost("users", { username, password, email: email || null, role: "player", balance: 0 });
  const token = signToken({ userId: user.id, username: user.username, role: user.role });
  return { token, user: { id: user.id, username: user.username, role: user.role, balance: "0.00" } };
}

export async function apiLogin(username: string, password: string) {
  const users = await sbGet("users", `username=eq.${encodeURIComponent(username)}&is_active=eq.true&select=*`);
  if (!users.length || users[0].password !== password) throw new Error("بيانات خاطئة");
  const u = users[0];
  const token = signToken({ userId: u.id, username: u.username, role: u.role });
  return { token, user: { id: u.id, username: u.username, role: u.role, balance: parseFloat(u.balance).toFixed(2) } };
}

export async function apiAdminLogin(username: string, password: string) {
  const users = await sbGet("users", `username=eq.${encodeURIComponent(username)}&role=eq.superadmin&select=*`);
  if (!users.length || users[0].password !== password) throw new Error("بيانات خاطئة");
  const token = signToken({ userId: users[0].id, username: users[0].username, role: "superadmin" });
  return { token, role: "superadmin" };
}

export async function apiMe(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Invalid token");
  const users = await sbGet("users", `id=eq.${p.userId}&select=id,username,role,balance,email,is_active`);
  if (!users.length) throw new Error("Not found");
  if (users[0].is_active === false) {
    throw new Error("BANNED_USER");
  }
  return { ...users[0], balance: parseFloat(users[0].balance).toFixed(2) };
}

export async function apiBalance(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  const users = await sbGet("users", `id=eq.${p.userId}&select=balance`);
  return { balance: parseFloat(users[0]?.balance || 0).toFixed(2) };
}

// ── Admin Stats ─────────────────────────────────────────────────────────────
export async function apiAdminStats() {
  const [players, agents, txns, bets, pendingBets] = await Promise.all([
    sbGet("users", "role=eq.player&select=id,balance"),
    sbGet("users", "role=eq.agent&select=id"),
    sbGet("transactions", "select=id&limit=1&order=id.desc"),
    sbGet("sports_bets", "select=id&limit=1&order=id.desc"),
    sbGet("sports_bets", "status=eq.pending&select=id,stake,potential_win"),
  ]);
  const totalBal = players.reduce((s: number, u: any) => s + parseFloat(u.balance || 0), 0);
  const pendingStake = pendingBets.reduce((s: number, b: any) => s + parseFloat(b.stake || 0), 0);
  const pendingExposure = pendingBets.reduce((s: number, b: any) => s + parseFloat(b.potential_win || 0), 0);
  return {
    playerCount: players.length, agentCount: agents.length,
    totalBalance: totalBal.toFixed(2),
    txnCount: txns.length ? txns[0].id : 0,
    betCount: bets.length ? bets[0].id : 0,
    pendingBetCount: pendingBets.length,
    pendingStake: pendingStake.toFixed(2),
    pendingExposure: pendingExposure.toFixed(2),
  };
}

// ── Admin Users ─────────────────────────────────────────────────────────────
export async function apiAdminUsers(role?: string) {
  const q = role ? `role=eq.${role}&select=*&order=id.desc` : "select=*&order=id.desc";
  const users = await sbGet("users", q);
  return users.map((u: any) => ({ ...u, balance: parseFloat(u.balance).toFixed(2), isActive: u.is_active }));
}

export async function apiAdminCreateUser(d: { username: string; password: string; email?: string; role?: string; agentId?: number }) {
  const existing = await sbGet("users", `username=eq.${encodeURIComponent(d.username)}&select=id`);
  if (existing.length > 0) throw new Error("اسم المستخدم موجود مسبقاً");
  const [u] = await sbPost("users", { username: d.username, password: d.password, email: d.email || null, role: d.role || "player", balance: 0, agent_id: d.agentId || null });
  return { ...u, balance: "0.00", isActive: true };
}

export async function apiAdminDeleteUser(id: number) {
  await sbDelete("users", `id=eq.${id}`);
}

// ─────────────────────────────────────────────────────────────────────
// STRICT BALANCE SYSTEM
// All balance changes go through Supabase RPC `update_balance` which is
// atomic at the database level (transaction + row lock).
// Never read-then-write from JS — always use RPC.
// ─────────────────────────────────────────────────────────────────────

async function rpcUpdateBalance(userId: number, action: "add" | "withdraw" | "set", amount: number, _description?: string): Promise<number> {
  // NOTE: Supabase RPC signature is (p_action, p_amount, p_user_id) — does NOT accept p_description.
  // Description is kept in JS for caller-side logging/transaction history but never sent to RPC.
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_balance`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ p_user_id: userId, p_action: action, p_amount: amount }),
  });
  const data = await r.json();
  if (r.status >= 400 || (typeof data === "object" && data?.message)) {
    throw new Error(typeof data === "object" ? (data.message || "خطأ في الرصيد") : "خطأ في الرصيد");
  }
  return parseFloat(data);
}

async function rpcUpdateBalanceIdem(userId: number, action: "add" | "withdraw" | "set", amount: number, ref: string): Promise<number> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_balance_idem`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ p_user_id: userId, p_action: action, p_amount: amount, p_ref: ref }),
  });
  const data = await r.json();
  if (r.status >= 400 || (typeof data === "object" && data?.message)) {
    throw new Error(typeof data === "object" ? (data.message || "خطأ في الرصيد") : "خطأ في الرصيد");
  }
  return parseFloat(data);
}

async function rpcCreditFromAgent(agentId: number, userId: number, amount: number): Promise<number> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/credit_user_balance`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ p_agent_id: agentId, p_user_id: userId, p_amount: amount }),
  });
  const data = await r.json();
  if (r.status >= 400 || data?.success === false) {
    throw new Error(data?.error || "خطأ في تحويل الرصيد من الوكيل");
  }
  return parseFloat(data?.balance || data || 0);
}

export async function apiAdminUserBalance(id: number, action: "add" | "withdraw" | "reset", amount?: number) {
  if (action !== "reset" && (!amount || amount <= 0)) throw new Error("المبلغ غير صحيح");
  const rpcAction = action === "reset" ? "set" : action;
  const rpcAmount = action === "reset" ? 0 : (amount as number);
  const balance = await rpcUpdateBalance(id, rpcAction, rpcAmount);
  return { balance };
}

export async function apiAdminTransactions() {
  return sbGet("transactions", "select=*&order=id.desc&limit=200");
}

export async function apiAdminAgents() {
  const agents = await sbGet("users", "role=eq.agent&select=*&order=id.desc");
  return agents.map((a: any) => ({ ...a, balance: parseFloat(a.balance).toFixed(2), isActive: a.is_active }));
}

export async function apiAdminAgentCredit(id: number, action: string, amount: number) {
  if (!amount || amount <= 0) throw new Error("المبلغ غير صحيح");
  // Verify target IS an agent (RPC works on any user but admin UI should only touch agents here)
  const agents = await sbGet("users", `id=eq.${id}&role=eq.agent&select=id`);
  if (!agents.length) throw new Error("الوكيل غير موجود");
  // Use atomic RPC (same one used for players) — guarantees no race condition
  const balance = await rpcUpdateBalance(id, action === "add" ? "add" : "withdraw", amount);
  return { balance };
}

export async function apiAdminBets() {
  return sbGet("sports_bets", "select=*&order=id.desc&limit=200");
}

// ─────────────────────────────────────────────────────────────────────
// MANUAL BET SETTLEMENT — PERMANENTLY DISABLED (2026-07-03)
// Root cause of repeated wrong-payout bugs (5x): this function settled ONE
// bet row in isolation, without ever checking sibling legs of the same
// combo ticket (same user_id + created_at). That let a combo's main leg
// get paid "won" even while another leg in the very same ticket was lost —
// a direct violation of the combo-loss rule (any losing leg voids the
// entire ticket). All settlement must go exclusively through the backend's
// automated ESPN reconciler (settleBetRow/reconcilePendingBets in
// backend/server.js), which is combo-aware and uses real regular-time-only
// scores. This function is kept only to fail loudly if anything still calls it.
export async function apiAdminSettleBet(_id: number, _status: "won" | "lost" | "void"): Promise<never> {
  throw new Error(
    "التسوية اليدوية مُعطّلة نهائيًا لحماية قاعدة الكومبو. النظام يسوّي الرهانات تلقائيًا من نتائج ESPN الحقيقية فقط."
  );
}

// ── Agent ───────────────────────────────────────────────────────────────────
export async function apiAgentMe(token: string) { return apiMe(token); }

// ── Agent Hierarchy (sub-agents) ────────────────────────────────────────────
// A "sub-agent" is just a regular row in `users` with role="agent" and its
// `agent_id` pointing at the parent agent — the exact same ownership column
// already used for players. This lets us reuse almost all existing
// ownership/ atomic-balance logic unchanged.
//
// Funding rule (per business requirement): a newly created sub-agent starts
// with balance 0 and can ONLY receive credit from its direct parent agent
// (via the same atomic `credit_user_balance` RPC used for player top-ups —
// it debits the parent's own balance and credits the sub-agent's, so total
// money in the system is always conserved).
//
// Visibility rule: a parent agent can see ALL players, bets and transactions
// belonging to itself AND every sub-agent beneath it, at any depth.
async function getAgentHierarchyIds(rootAgentId: number): Promise<number[]> {
  let frontier = [rootAgentId];
  const all = new Set<number>([rootAgentId]);
  // Walk the tree level by level (guards against accidental cycles with a hard cap).
  for (let depth = 0; depth < 20 && frontier.length; depth++) {
    const children = await sbGet("users", `agent_id=in.(${frontier.join(",")})&role=eq.agent&select=id`);
    const fresh = (Array.isArray(children) ? children : [])
      .map((c: any) => c.id)
      .filter((id: number) => !all.has(id));
    if (!fresh.length) break;
    fresh.forEach((id: number) => all.add(id));
    frontier = fresh;
  }
  return Array.from(all);
}

export async function apiAgentSubAgents(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  const agents = await sbGet("users", `agent_id=eq.${p.userId}&role=eq.agent&select=*&order=id.desc`);
  return (Array.isArray(agents) ? agents : []).map((a: any) => ({ ...a, balance: parseFloat(a.balance).toFixed(2), isActive: a.is_active }));
}

export async function apiAgentCreateSubAgent(token: string, d: { username: string; password: string; email?: string }) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  // Sub-agent always starts at 0 — it must be funded explicitly by its parent afterwards.
  return apiAdminCreateUser({ ...d, role: "agent", agentId: p.userId });
}

export async function apiAgentDeleteSubAgent(token: string, id: number) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  const rows = await sbGet("users", `id=eq.${id}&agent_id=eq.${p.userId}&role=eq.agent&select=id,balance`);
  if (!rows.length) throw new Error("هذا الوكيل الفرعي لا يخصك");
  const leftover = parseFloat(rows[0].balance || "0");
  if (leftover > 0) {
    // Financial conservation: refund any remaining sub-agent balance back to the parent before deleting.
    await rpcUpdateBalance(p.userId, "add", leftover).catch(() => {});
  }
  await sbDelete("users", `id=eq.${id}`);
}

// Funding a sub-agent works exactly like funding a player: atomic transfer
// between the calling agent's own balance and the target's balance, fully
// reusing the same ownership check (id + agent_id=caller) that already
// works for any role — see apiAgentPlayerBalance below.
export async function apiAgentSubAgentBalance(token: string, subAgentId: number, action: "add" | "withdraw", amount: number) {
  return apiAgentPlayerBalance(token, subAgentId, action, amount);
}

export async function apiAgentPlayers(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  const agentIds = await getAgentHierarchyIds(p.userId);
  const players = await sbGet("users", `agent_id=in.(${agentIds.join(",")})&role=eq.player&select=*&order=id.desc`);
  return (Array.isArray(players) ? players : []).map((u: any) => ({ ...u, balance: parseFloat(u.balance).toFixed(2), isActive: u.is_active }));
}
export async function apiAgentBets(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  const agentIds = await getAgentHierarchyIds(p.userId);
  const players = await sbGet("users", `agent_id=in.(${agentIds.join(",")})&select=id`);
  if (!players.length) return [];
  const pIds = players.map((u: any) => u.id);
  const query = `user_id=in.(${pIds.join(",")})&select=*&order=id.desc&limit=150`;
  return sbGet("sports_bets", query);
}
export async function apiAgentCreatePlayer(token: string, d: { username: string; password: string; email?: string }) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  return apiAdminCreateUser({ ...d, role: "player", agentId: p.userId });
}
export async function apiAgentDeletePlayer(token: string, id: number) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  const players = await sbGet("users", `id=eq.${id}&agent_id=eq.${p.userId}&select=id`);
  if (!players.length) throw new Error("Not found");
  await sbDelete("users", `id=eq.${id}`);
}
export async function apiAgentPlayerBalance(token: string, pid: number, action: "add" | "withdraw", amount: number) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  if (!amount || amount <= 0) throw new Error("المبلغ غير صحيح");
  // Verify the target (player OR direct sub-agent) belongs to this agent
  const owns = await sbGet("users", `id=eq.${pid}&agent_id=eq.${p.userId}&select=id,balance,role`);
  if (!owns.length) throw new Error("هذا الحساب لا يخصك");
  const before = parseFloat(owns[0].balance || "0");

  if (action === "add") {
    // Atomic: agent's balance decremented, target's balance incremented in one transaction
    const balance = await rpcCreditFromAgent(p.userId, pid, amount);
    // Log transaction history
    await sbPost("transactions", {
      user_id: pid, type: owns[0].role === "agent" ? "agent_subagent_deposit" : "agent_deposit", amount,
      balance_before: before, balance_after: balance,
      description: `شحن رصيد من الوكيل: ${p.username}`,
      performed_by: p.userId
    }).catch(() => {});
    return { balance };
  } else {
    // Withdraw: decrease target's balance, AND increase agent balance!
    const balance = await rpcUpdateBalance(pid, "withdraw", amount);
    // Increment the agent's balance with the withdrawn amount
    await rpcUpdateBalance(p.userId, "add", amount).catch(() => {});

    // Log transaction history
    await sbPost("transactions", {
      user_id: pid, type: owns[0].role === "agent" ? "agent_subagent_withdraw" : "agent_withdraw", amount: -amount,
      balance_before: before, balance_after: balance,
      description: `سحب رصيد بواسطة الوكيل: ${p.username}`,
      performed_by: p.userId
    }).catch(() => {});
    return { balance };
  }
}
export async function apiAgentChangePassword(token: string, pid: number, password: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  await sbUpdate("users", `id=eq.${pid}&agent_id=eq.${p.userId}`, { password });
  return { success: true };
}
export async function apiAgentTransactions(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  const agentIds = await getAgentHierarchyIds(p.userId);
  return sbGet("transactions", `performed_by=in.(${agentIds.join(",")})&select=*&order=id.desc&limit=100`);
}


// ── Sports (unchanged - direct API calls) ───────────────────────────────────
const SPORTS_API = "https://www.thesportsdb.com/api/v1/json/3";
const LEAGUES = [
  { id: "4328", name: "English Premier League", sport: "Football", country: "England" },
  { id: "4335", name: "La Liga", sport: "Football", country: "Spain" },
  { id: "4331", name: "Bundesliga", sport: "Football", country: "Germany" },
  { id: "4332", name: "Serie A", sport: "Football", country: "Italy" },
  { id: "4334", name: "Ligue 1", sport: "Football", country: "France" },
  { id: "4346", name: "NBA", sport: "Basketball", country: "USA" },
  { id: "4424", name: "ATP Tour", sport: "Tennis", country: "World" },
];
export async function apiSportsEvents() {
  return Promise.all(LEAGUES.map(async lg => {
    try {
      const r = await fetch(`${SPORTS_API}/eventsnextleague.php?id=${lg.id}`);
      const d = await r.json() as any;
      return { league: lg, events: d.events ?? [] };
    } catch { return { league: lg, events: [] }; }
  }));
}

export function apiSportsBet(token: string, d: { eventId: string; eventName: string; selection: string; selectionName: string; odds: number; stake: number }) {
  // This needs to be async with Supabase
  throw new Error("Use apiSportsBetAsync instead");
}

const betLocks = new Set<number>();

export async function apiSportsBetAsync(token: string, d: { eventId: string; eventName: string; selection: string; selectionName: string; odds: number; stake: number }) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  if (!d.stake || d.stake <= 0) throw new Error("مبلغ الرهان غير صحيح");
  if (d.odds < 1.01) throw new Error("الكوتة غير صحيحة");

  // Prevent double-submission
  if (betLocks.has(p.userId)) throw new Error("جاري معالجة رهان آخر...");
  betLocks.add(p.userId);

  try {
    const pw = Math.round(d.stake * d.odds * 100) / 100;

    // Atomic withdraw — RPC enforces sufficient funds
    const nb = await rpcUpdateBalance(p.userId, "withdraw", d.stake, `Sports bet: ${d.eventName}`);

    // Record the bet — if this fails, we MUST refund
    try {
      const [bet] = await sbPost("sports_bets", {
        user_id: p.userId, event_id: d.eventId, event_name: d.eventName,
        selection: d.selection, selection_name: d.selectionName,
        odds: d.odds, stake: d.stake, potential_win: pw,
      });
      return { bet, newBalance: nb };
    } catch (e: any) {
      // Refund stake (could be transient — bet record failed but money was taken)
      await rpcUpdateBalance(p.userId, "add", d.stake, `Refund: bet record failed`).catch(() => {});
      throw new Error("فشل تسجيل الرهان (تم إرجاع الرصيد)");
    }
  } finally {
    betLocks.delete(p.userId);
  }
}

// ── Games (AES - unchanged) ─────────────────────────────────────────────────
const AES_API = "https://api.aesgamingasia.com";
const AES_HARDCODED_TOKEN = "c441a9f4-0813-4937-90c1-c70d176c48a6";
import { AES_GAMES_LIST } from "./aesGamesList";
import { AES_PROVIDERS_LIST } from "./aesProvidersList";

// Real AES database cache / fallback
let _gamesCache: any = null, _provCache: any = null;

export function setAesToken(t: string) { localStorage.setItem("tb_aes_token", t); }
export function getAesToken(): string | null { return localStorage.getItem("tb_aes_token") || AES_HARDCODED_TOKEN; }

(function initAesToken() {
  if (typeof localStorage !== 'undefined' && !localStorage.getItem("tb_aes_token")) {
    localStorage.setItem("tb_aes_token", AES_HARDCODED_TOKEN);
  }
})();

export async function apiGames() {
  if (_gamesCache) return _gamesCache;
  try {
    const r = await fetch(`${AES_API}/v4/game/all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const d = await r.json();
    if (d?.code === 0 && Array.isArray(d.data)) {
      _gamesCache = d;
      return d;
    }
  } catch {}
  console.warn("[apiGames] Edge fetch failed, serving 100% reliable local database cache");
  const cacheData = { code: 0, message: "OK", data: AES_GAMES_LIST };
  _gamesCache = cacheData;
  return cacheData;
}

export async function apiGameProviders() {
  if (_provCache) return _provCache;
  try {
    const r = await fetch(`${AES_API}/v4/game/providers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: 1 }) });
    const d = await r.json();
    if (d?.code === 0 && Array.isArray(d.data)) {
      _provCache = d;
      return d;
    }
  } catch {}
  console.warn("[apiGameProviders] Edge fetch failed, serving 100% reliable local database cache");
  const cacheData = { code: 0, message: "OK", data: AES_PROVIDERS_LIST };
  _provCache = cacheData;
  return cacheData;
}

// ─────────────────────────────────────────────────────────────────────
// STRICT AES GAME LAUNCH FLOW (race-condition safe)
//
// Invariant: At any moment, balance lives in EXACTLY ONE place:
//   - Either in Supabase (when not playing)
//   - Or in AES wallet  (when playing inside a game iframe)
//
// Launch order (must succeed in this exact order, otherwise rollback):
//   1. AES.withdraw-all  → flush any leftover AES funds → ADD back to Supabase
//   2. Supabase.deduct(bal) atomically  → balance now = 0 in Supabase
//   3. AES.deposit(bal)  → AES now holds full balance
//   4. Get game-url
//
// Close order:
//   1. AES.withdraw-all → returns amount X
//   2. Supabase.set OR add the exact X → balance back in Supabase
// ─────────────────────────────────────────────────────────────────────

const launchLocks = new Set<number>();  // prevent double-launch per user
const syncLocks = new Set<number>();    // prevent double-sync per user

async function aesCall(path: string, body: any): Promise<any> {
  const aesToken = getAesToken();
  if (!aesToken) throw new Error("AES token missing");
  const r = await fetch(`${AES_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${aesToken}` },
    body: JSON.stringify(body),
  });
  try {
    return await r.json();
  } catch {
    return { code: 999, message: "السيرفر الخارجي للألعاب قيد التحديث" };
  }
}

// ── Idempotency guard ────────────────────────────────────────────────────────
// Every credit that returns money from AES → Supabase is recorded with a unique
// reference in `transactions.description`. Before crediting we check the ref has
// not already been applied, so a retry / double-call can NEVER double the money.
//
// TWO-LAYER PROTECTION:
//  (a) in-memory Set — instant, prevents same-tab double-call within ms
//  (b) database check — exact match on description tag, catches cross-tab calls
//
// Both layers are needed because:
//   - Without (a): two near-simultaneous calls in the same tab race the DB query
//   - Without (b): a fresh tab/refresh would re-apply a ref it never saw
const _appliedRefs = new Set<string>();
const _creditLocks = new Map<string, Promise<number | null>>();   // ref → in-flight promise

async function refAlreadyApplied(userId: number, ref: string): Promise<boolean> {
  if (_appliedRefs.has(ref)) return true;
  try {
    // Exact-tag match — far more precise than `like` (no encoding edge cases).
    const tag = `[ref:${ref}]`;
    const rows = await sbGet(
      "transactions",
      `user_id=eq.${userId}&description=like.*${encodeURIComponent(tag)}*&select=id&limit=1`,
    );
    if (Array.isArray(rows) && rows.length > 0) {
      _appliedRefs.add(ref);
      return true;
    }
    return false;
  } catch {
    // On lookup failure, be CONSERVATIVE: assume already applied to avoid risk
    // of double-crediting. The money stays safely in AES and will be reclaimed
    // by the next successful sync.
    return true;
  }
}

// Credit money back to Supabase exactly once for a given reference.
// Concurrent calls with the same ref will share the same promise (no double work).
async function creditOnce(userId: number, amount: number, ref: string, description: string): Promise<number | null> {
  if (amount <= 0) return null;

  // Coalesce concurrent calls with the same ref into one promise.
  const existing = _creditLocks.get(ref);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const before = await getBalanceNow(userId);
      // Use database-enforced atomic idempotency
      const after = await rpcUpdateBalanceIdem(userId, "add", amount, ref);
      
      // Mark applied in memory
      _appliedRefs.add(ref);
      
      // Record player transaction history log (non-critical, swallow errors)
      await sbPost("transactions", {
        user_id: userId, type: "game_return", amount,
        balance_before: before, balance_after: after,
        description: `${description} [ref:${ref}]`,
      }).catch(() => {});
      
      return after;
    } finally {
      _creditLocks.delete(ref);
    }
  })();

  _creditLocks.set(ref, promise);
  return promise;
}

async function getBalanceNow(userId: number): Promise<number> {
  const u = await sbGet("users", `id=eq.${userId}&select=balance`);
  return parseFloat(u?.[0]?.balance || "0");
}

// Build an idempotency ref that's STABLE across short retries.
// We quantize time into 5-second buckets and include the amount so accidental
// double-calls within the same 5s window collapse to the same ref (no doubling),
// but legitimate distinct game sessions over time still get distinct refs.
function buildStableRef(prefix: string, userCode: number, amount: number): string {
  const bucket = Math.floor(Date.now() / 5000);       // 5-second buckets
  const cents = Math.round(amount * 100);             // amount in cents (no float ambiguity)
  return `${prefix}_${userCode}_${cents}_${bucket}`;
}

async function aesWithdrawAll(userCode: number): Promise<number> {
  // Retry up to 4 times; return the amount actually withdrawn (0 if AES wallet was empty).
  // Distinguishes "empty wallet" (safe 0) from "network failure" (throws → caller must NOT zero balance).
  let lastErr: any = null;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await aesCall("/v4/wallet/withdraw-all", { user_code: userCode });
      if (r?.code === 0) return parseFloat(r.data?.amount ?? 0);
      if (r?.code !== undefined) return 0; // wallet already empty
    } catch (e) { lastErr = e; }
    await new Promise(res => setTimeout(res, 500 * (i + 1)));
  }
  throw new Error("AES wallet sync failed" + (lastErr ? `: ${lastErr.message || lastErr}` : ""));
}

async function aesBalance(userCode: number): Promise<number | null> {
  try {
    const r = await aesCall("/v4/wallet/balance", { user_code: userCode });
    if (r?.code === 0) return parseFloat(r.data?.balance ?? r.data?.amount ?? 0);
  } catch {}
  return null;
}

async function aesDeposit(userCode: number, amount: number): Promise<boolean> {
  if (amount <= 0) return true;
  try {
    const r = await aesCall("/v4/wallet/deposit", { user_code: userCode, amount });
    return r?.code === 0;
  } catch { return false; }
}

export async function apiLaunchGame(token: string, gameCode: string, providerId: number): Promise<{ url?: string; error?: string }> {
  const p = verifyToken(token);
  if (!p) return { error: "Unauthorized" };

  // Prevent double-launch race
  if (launchLocks.has(p.userId)) return { error: "اللعبة قيد التحميل، انتظر..." };
  launchLocks.add(p.userId);

  try {
    const baseUrl = getSportsbookApiUrl();
    const r = await fetch(`${baseUrl}/api/aes/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, gameCode, providerId }),
    });
    const res = await r.json();
    if (res && res.url) {
      return { url: res.url };
    }
    return { error: res?.error || "تعذّر فتح اللعبة" };
  } catch (e: any) {
    return { error: e.message || "خطأ في الاتصال بالخادم" };
  } finally {
    launchLocks.delete(p.userId);
  }
}

export async function apiSyncBalance(token: string): Promise<{ ok: boolean; recovered?: number; pending?: boolean } | void> {
  const p = verifyToken(token);
  if (!p) return;

  // Prevent concurrent syncs from doubling money.
  if (syncLocks.has(p.userId)) return { ok: false, pending: true };
  syncLocks.add(p.userId);

  try {
    const baseUrl = getSportsbookApiUrl();
    const r = await fetch(`${baseUrl}/api/aes/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const res = await r.json();
    return { ok: res && res.ok, recovered: res?.recovered || 0 };
  } catch {
    return { ok: false, pending: true };  // network failure: money safe in AES, retry later
  } finally {
    syncLocks.delete(p.userId);
  }
}

// ── Transactions ────────────────────────────────────────────────────────────
export async function apiMyTransactions(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  return sbGet("transactions", `user_id=eq.${p.userId}&select=*&order=id.desc&limit=50`);
}

function getSportsbookApiUrl(): string {
  const envBase = (import.meta as any).env?.VITE_SPORTSBOOK_API as string | undefined;
  const runtimeBase = typeof window !== "undefined" ? (window as any).__TUNBET_SPORTSBOOK_API__ : undefined;
  const storedBase = typeof localStorage !== "undefined" ? localStorage.getItem("tunbet_sportsbook_api") || undefined : undefined;
  return (envBase || runtimeBase || storedBase || "https://tunbet-sportsbook.onrender.com").replace(/\/$/, "");
}

export async function apiLaunchOroGame(token: string, gameCode: string, vendorCode: string, language = 'en'): Promise<{ url?: string; error?: string }> {
  const p = verifyToken(token);
  if (!p) return { error: "Unauthorized" };

  try {
    const userCode = `tb_${p.userId}`;
    const baseUrl = getSportsbookApiUrl();
    const r = await fetch(`${baseUrl}/api/oro/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userCode, gameCode, vendorCode, language }),
    });
    const res = await r.json();
    if (res && res.success && res.url) {
      return { url: res.url };
    }
    return { error: res?.error || "تعذّر فتح اللعبة" };
  } catch (e: any) {
    return { error: e.message || "خطأ في الاتصال بالخادم" };
  }
}

export async function apiLaunchBetnexGame(token: string, gameId: string, balance?: number): Promise<{ url?: string; error?: string }> {
  const p = verifyToken(token);
  if (!p) return { error: "Unauthorized" };

  try {
    const baseUrl = getSportsbookApiUrl();
    const r = await fetch(`${baseUrl}/api/betnex/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: p.userId, gameId, money: balance || 50 }),
    });
    const res = await r.json();
    if (res && res.success && res.url) {
      return { url: res.url };
    }
    return { error: res?.error || "تعذّر فتح اللعبة" };
  } catch (e: any) {
    return { error: e.message || "خطأ في الاتصال بالخادم" };
  }
}
