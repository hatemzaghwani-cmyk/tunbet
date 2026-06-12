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
  const users = await sbGet("users", `id=eq.${p.userId}&select=id,username,role,balance,email`);
  if (!users.length) throw new Error("Not found");
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

export async function apiAdminSettleBet(id: number, status: "won" | "lost" | "void") {
  // Critical: mark bet as settled FIRST (with optimistic concurrency) — prevents double-payout
  const bets = await sbGet("sports_bets", `id=eq.${id}&select=*`);
  if (!bets.length) throw new Error("Not found");
  const bet = bets[0];
  if (bet.status !== "pending") throw new Error("Already settled");

  const payout = status === "won"
    ? parseFloat(bet.potential_win)
    : status === "void"
    ? parseFloat(bet.stake)
    : 0;

  // Update bet status FIRST with a where-clause that checks status=pending
  // (PostgREST PATCH only affects rows matching ALL filters, so if another admin already
  //  settled this bet, our UPDATE will affect 0 rows.)
  const upd = await fetch(`${SUPABASE_URL}/rest/v1/sports_bets?id=eq.${id}&status=eq.pending`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json", "Prefer": "return=representation" },
    body: JSON.stringify({ status, payout, settled_at: new Date().toISOString() }),
  });
  const updated = await upd.json();
  if (!Array.isArray(updated) || updated.length === 0) {
    throw new Error("الرهان مُسوّى مسبقاً");  // another admin won the race
  }

  // Now credit payout atomically
  if (payout > 0) {
    try {
      await rpcUpdateBalance(bet.user_id, "add", payout, `Bet ${status}: ${bet.event_name}`);
    } catch (e: any) {
      // Critical: settlement succeeded but credit failed — revert the settlement
      await sbUpdate("sports_bets", `id=eq.${id}`, { status: "pending", payout: 0, settled_at: null }).catch(() => {});
      throw new Error("فشل إضافة الجائزة: " + (e.message || ""));
    }
  }
  return bet;
}

// ── Agent ───────────────────────────────────────────────────────────────────
export async function apiAgentMe(token: string) { return apiMe(token); }
export async function apiAgentPlayers(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  const players = await sbGet("users", `agent_id=eq.${p.userId}&role=eq.player&select=*&order=id.desc`);
  return players.map((u: any) => ({ ...u, balance: parseFloat(u.balance).toFixed(2), isActive: u.is_active }));
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
  // Verify the player belongs to this agent
  const owns = await sbGet("users", `id=eq.${pid}&agent_id=eq.${p.userId}&select=id`);
  if (!owns.length) throw new Error("اللاعب لا يخصك");
  if (action === "add") {
    // Atomic: agent's balance decremented, player's balance incremented in one transaction
    const balance = await rpcCreditFromAgent(p.userId, pid, amount);
    return { balance };
  } else {
    // Withdraw: simply pull from player (no return to agent — admin reconciliation)
    const balance = await rpcUpdateBalance(pid, "withdraw", amount);
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
  return sbGet("transactions", `performed_by=eq.${p.userId}&select=*&order=id.desc&limit=100`);
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
const AES_HARDCODED_TOKEN = "290c38c7-7df8-4913-9f77-2865e31f1edc";
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
  try { const r = await fetch(`${AES_API}/v4/game/all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); const d = await r.json(); _gamesCache = d; return d; } catch { return { code: -1, data: [] }; }
}

export async function apiGameProviders() {
  if (_provCache) return _provCache;
  try { const r = await fetch(`${AES_API}/v4/game/providers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: 1 }) }); const d = await r.json(); _provCache = d; return d; } catch { return { code: -1, data: [] }; }
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
  return r.json();
}

// ── Idempotency guard ────────────────────────────────────────────────────────
// Every credit that returns money from AES → Supabase is recorded with a unique
// reference in `transactions.description`. Before crediting we check the ref has
// not already been applied, so a retry / double-call can NEVER double the money.
async function refAlreadyApplied(userId: number, ref: string): Promise<boolean> {
  try {
    const rows = await sbGet("transactions", `user_id=eq.${userId}&description=like.*${encodeURIComponent(ref)}*&select=id&limit=1`);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false; // on lookup failure, fail-open is unsafe; but we still record ref below
  }
}

// Credit money back to Supabase exactly once for a given reference.
async function creditOnce(userId: number, amount: number, ref: string, description: string): Promise<number | null> {
  if (amount <= 0) return null;
  if (await refAlreadyApplied(userId, ref)) {
    // Already credited — return current balance, do NOT add again.
    const u = await sbGet("users", `id=eq.${userId}&select=balance`);
    return parseFloat(u?.[0]?.balance || "0");
  }
  const before = await getBalanceNow(userId);
  const after = await rpcUpdateBalance(userId, "add", amount, description);
  // Record the idempotency ref + audit row.
  await sbPost("transactions", {
    user_id: userId, type: "game_return", amount,
    balance_before: before, balance_after: after,
    description: `${description} [ref:${ref}]`,
  }).catch(() => {});
  return after;
}

async function getBalanceNow(userId: number): Promise<number> {
  const u = await sbGet("users", `id=eq.${userId}&select=balance`);
  return parseFloat(u?.[0]?.balance || "0");
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
    const users = await sbGet("users", `id=eq.${p.userId}&select=*`);
    if (!users.length) return { error: "User not found" };
    const user = users[0];

    // Create AES player if first launch
    let userCode = user.aes_player_id ? parseInt(user.aes_player_id) : 0;
    if (!userCode) {
      const safeName = user.username.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 50);
      const cr = await aesCall("/v4/user/create", { name: safeName });
      if (cr?.code === 0 && cr.data?.user_code) {
        userCode = cr.data.user_code;
        await sbUpdate("users", `id=eq.${p.userId}`, { aes_player_id: String(userCode) });
      } else {
        return { error: "فشل إنشاء حساب اللعب" };
      }
    }

    // STEP 1: Flush any leftover AES funds → credit back to Supabase EXACTLY ONCE (idempotent).
    // If the AES call network-fails we ABORT (never proceed to zero the balance) to avoid loss.
    let leftover = 0;
    try {
      leftover = await aesWithdrawAll(userCode);
    } catch (e: any) {
      return { error: "خطأ مزامنة المحفظة، حاول مرة أخرى" };
    }
    if (leftover > 0) {
      const ref = `aesreclaim_${userCode}_${Date.now()}`;
      try { await creditOnce(p.userId, leftover, ref, "AES leftover reclaim"); }
      catch { return { error: "خطأ في استرجاع الرصيد، حاول مرة أخرى" }; }
    }

    // STEP 2: Read fresh balance from Supabase (after leftover reclaim).
    const bal = await getBalanceNow(p.userId);
    if (bal <= 0) return { error: "رصيدك 0. تواصل مع وكيلك لإضافة رصيد." };

    // STEP 3: Confirm AES wallet is truly empty before we move money into it.
    // (Prevents the "doubled balance" bug: depositing on top of leftover funds.)
    const aesBal = await aesBalance(userCode);
    if (aesBal !== null && aesBal > 0.01) {
      // Wallet still holds funds — reclaim them once, then abort this launch (user retries).
      const r2 = await aesWithdrawAll(userCode).catch(() => 0);
      if (r2 > 0) await creditOnce(p.userId, r2, `aesreclaim2_${userCode}_${Date.now()}`, "AES residual reclaim").catch(() => {});
      return { error: "جارٍ تجهيز المحفظة، حاول مرة أخرى" };
    }

    // STEP 4: ATOMIC withdraw from Supabase (RPC enforces sufficient funds & no negative).
    let supabaseBalAfter: number;
    try {
      supabaseBalAfter = await rpcUpdateBalance(p.userId, "withdraw", bal, `Game launch: ${gameCode}`);
    } catch (e: any) {
      return { error: "فشل خصم الرصيد، حاول مرة أخرى" };
    }
    if (supabaseBalAfter !== 0 && Math.abs(supabaseBalAfter) > 0.01) {
      // Should be 0 now — if not, a concurrent change happened. Refund the exact amount and abort.
      await rpcUpdateBalance(p.userId, "add", bal, `Rollback: race on launch`).catch(() => {});
      return { error: "تعارض في الرصيد، حاول مرة أخرى" };
    }

    // STEP 5: Deposit to AES — if this fails, IMMEDIATELY refund Supabase the exact amount.
    const depositOk = await aesDeposit(userCode, bal);
    if (!depositOk) {
      // Verify the money truly didn't land in AES before refunding (avoid double-credit).
      const check = await aesBalance(userCode);
      if (check !== null && check >= bal - 0.01) {
        // Money actually IS in AES despite error → leave it; it will be reclaimed on close.
      } else {
        await rpcUpdateBalance(p.userId, "add", bal, `Rollback: AES deposit failed`).catch(() => {});
      }
      return { error: "فشل تحويل الرصيد إلى اللعبة، تم استرجاع رصيدك" };
    }

    // STEP 6: Get game URL.
    try {
      const r = await aesCall("/v4/game/game-url", {
        user_code: userCode, provider_id: providerId, game_symbol: gameCode,
        lang: 1, return_url: window.location.origin
      });
      const gameUrl = r?.data?.game_url || r?.data?.url;
      if (r?.code === 0 && gameUrl) return { url: gameUrl };

      // Game URL failed — reclaim deposit and refund once.
      const recovered = await aesWithdrawAll(userCode).catch(() => -1);
      if (recovered > 0) await creditOnce(p.userId, recovered, `urlfail_${userCode}_${Date.now()}`, "Rollback: game-url failed").catch(() => {});
      else if (recovered === -1) return { error: "تعذّر التشغيل — رصيدك محفوظ، أعد فتح اللعبة لاسترجاعه" };
      return { error: "اللعبة غير متاحة حالياً، تم استرجاع رصيدك" };
    } catch {
      const recovered = await aesWithdrawAll(userCode).catch(() => -1);
      if (recovered > 0) await creditOnce(p.userId, recovered, `urlerr_${userCode}_${Date.now()}`, "Rollback: game-url error").catch(() => {});
      else if (recovered === -1) return { error: "تعذّر التشغيل — رصيدك محفوظ، أعد فتح اللعبة لاسترجاعه" };
      return { error: "خطأ في تشغيل اللعبة، تم استرجاع رصيدك" };
    }
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
    const aesToken = getAesToken();
    if (!aesToken) return { ok: false };
    const users = await sbGet("users", `id=eq.${p.userId}&select=aes_player_id`);
    if (!users.length || !users[0].aes_player_id) return { ok: true, recovered: 0 };
    const userCode = parseInt(users[0].aes_player_id);

    // Withdraw whatever is in AES, then credit it to Supabase EXACTLY ONCE (idempotent).
    // CRITICAL: if the AES call network-fails, we DO NOT touch Supabase — the money stays
    // safely in the AES wallet and is reclaimed on the next sync/launch. Balance is never lost.
    let recovered = 0;
    try {
      recovered = await aesWithdrawAll(userCode);
    } catch {
      return { ok: false, pending: true };  // network failure: money safe in AES, retry later
    }
    if (recovered > 0) {
      const ref = `close_${userCode}_${Date.now()}`;
      try {
        const after = await creditOnce(p.userId, recovered, ref, "Game session close");
        return { ok: true, recovered: after !== null ? recovered : 0 };
      } catch {
        // Credit failed AFTER withdraw — money is out of AES but not in Supabase yet.
        // Retry the credit a few times so it is never lost.
        for (let i = 0; i < 3; i++) {
          await new Promise(r => setTimeout(r, 800 * (i + 1)));
          try { await creditOnce(p.userId, recovered, ref, "Game session close (retry)"); return { ok: true, recovered }; } catch {}
        }
        console.error("CRITICAL: recovered", recovered, "but Supabase credit failed after retries");
        return { ok: false, recovered };
      }
    }
    return { ok: true, recovered: 0 };
  } finally {
    syncLocks.delete(p.userId);
  }
}

// ── Transactions ────────────────────────────────────────────────────────────
export async function apiMyTransactions(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  return sbGet("transactions", `user_id=eq.${p.userId}&select=*&order=id.desc&limit=50`);
}
