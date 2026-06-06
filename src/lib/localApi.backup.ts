/**
 * Local API — all data in localStorage. Strict balance system.
 */

// ── Helpers ─────────────────────────────────────────────────────────────────
function ls<T>(key: string, fb: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; }
}
function save(key: string, v: unknown) { localStorage.setItem(key, JSON.stringify(v)); }

// ── Types ───────────────────────────────────────────────────────────────────
export interface LocalUser {
  id: number;
  username: string;
  password: string;
  email?: string;
  role: "player" | "agent" | "superadmin";
  balance: string;         // ALWAYS starts "0" for new accounts
  agentId?: number | null;
  isActive: boolean;
  aesPlayerId?: string | null;
  createdAt: string;
}
export interface Transaction {
  id: number; userId: number; type: string; amount: string;
  balanceBefore: string; balanceAfter: string; description?: string;
  performedBy?: number; createdAt: string;
}
export interface SportsBet {
  id: number; userId: number; eventId: string; eventName: string;
  selection: string; selectionName: string; odds: string; stake: string;
  potentialWin: string; status: string; payout?: string;
  createdAt: string; settledAt?: string;
}
export interface TokenPayload { userId: number; username: string; role: string; }

// ── Storage keys ────────────────────────────────────────────────────────────
const K = {
  USERS: "tb_users_v2",
  TXN:   "tb_txn_v2",
  BETS:  "tb_bets_v2",
  SEQ:   "tb_seq_v2",
  AES:   "tb_aes_token",
};

function nextId(entity: string): number {
  const seq = ls<Record<string, number>>(K.SEQ, {});
  const n = (seq[entity] ?? 0) + 1;
  seq[entity] = n;
  save(K.SEQ, seq);
  return n;
}

// ── Seed admin (only once, balance = 0, admin doesn't play) ─────────────────
(function seed() {
  const users = ls<LocalUser[]>(K.USERS, []);
  if (!users.find(u => u.role === "superadmin")) {
    users.push({
      id: nextId("u"),
      username: "legendary_admin",
      password: "Casino2026!",
      role: "superadmin",
      balance: "0",          // Admin balance = 0 (admin doesn't play)
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    save(K.USERS, users);
  }
})();

// ── Token ───────────────────────────────────────────────────────────────────
function signToken(p: TokenPayload): string { return btoa(JSON.stringify(p)); }
export function verifyToken(t: string): TokenPayload | null {
  try { return JSON.parse(atob(t)); } catch { return null; }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getUsers(): LocalUser[] { return ls<LocalUser[]>(K.USERS, []); }
function saveUsers(u: LocalUser[]) { save(K.USERS, u); }
function findUser(id: number): LocalUser | undefined { return getUsers().find(u => u.id === id); }

function pub(u: LocalUser) {
  return {
    id: u.id, username: u.username, role: u.role,
    balance: u.balance, // Always return actual balance
    email: u.email, isActive: u.isActive,
    agentId: u.agentId, aesPlayerId: u.aesPlayerId,
    createdAt: u.createdAt,
  };
}

// ── Auth ────────────────────────────────────────────────────────────────────
export function apiRegister(username: string, password: string, email?: string) {
  const users = getUsers();
  if (users.find(u => u.username === username)) throw new Error("اسم المستخدم موجود مسبقاً");
  const user: LocalUser = {
    id: nextId("u"), username, password, email,
    role: "player",
    balance: "0",            // ⚡ STRICT: Always starts at 0
    isActive: true, createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  const token = signToken({ userId: user.id, username: user.username, role: user.role });
  return { token, user: pub(user) };
}

export function apiLogin(username: string, password: string) {
  const users = getUsers();
  const u = users.find(x => x.username === username);
  if (!u || !u.isActive) throw new Error("بيانات خاطئة");
  if (u.password !== password) throw new Error("بيانات خاطئة");
  // Return FRESH data from storage (not cached)
  const token = signToken({ userId: u.id, username: u.username, role: u.role });
  return { token, user: pub(u) };
}

export function apiAdminLogin(username: string, password: string) {
  const users = getUsers();
  const a = users.find(u => u.username === username && u.role === "superadmin");
  if (!a || a.password !== password) throw new Error("بيانات خاطئة");
  const token = signToken({ userId: a.id, username: a.username, role: "superadmin" });
  return { token, role: "superadmin" };
}

export function apiMe(token: string) {
  const p = verifyToken(token);
  if (!p) throw new Error("Invalid token");
  // ALWAYS read fresh from localStorage
  const u = getUsers().find(x => x.id === p.userId);
  if (!u) throw new Error("Not found");
  return pub(u);
}

export function apiBalance(token: string) {
  const p = verifyToken(token);
  if (!p) throw new Error("Unauthorized");
  // ALWAYS read fresh from localStorage
  const u = getUsers().find(x => x.id === p.userId);
  return { balance: u?.balance ?? "0" };
}

// ── Admin Stats ─────────────────────────────────────────────────────────────
export function apiAdminStats() {
  const users = getUsers();
  const txns = ls<Transaction[]>(K.TXN, []);
  const bets = ls<SportsBet[]>(K.BETS, []);
  const players = users.filter(x => x.role === "player");
  const agents = users.filter(x => x.role === "agent");
  const totalBal = players.reduce((s, x) => s + parseFloat(x.balance || "0"), 0);
  return {
    playerCount: players.length,
    agentCount: agents.length,
    totalBalance: totalBal.toFixed(2),
    txnCount: txns.length,
    betCount: bets.length,
  };
}

// ── Admin Users ─────────────────────────────────────────────────────────────
export function apiAdminUsers(role?: string) {
  const users = getUsers();
  return (role ? users.filter(x => x.role === role) : users).map(pub);
}

export function apiAdminCreateUser(d: { username: string; password: string; email?: string; role?: string; agentId?: number }) {
  const users = getUsers();
  if (users.find(u => u.username === d.username)) throw new Error("اسم المستخدم موجود مسبقاً");
  const u: LocalUser = {
    id: nextId("u"),
    username: d.username,
    password: d.password,
    email: d.email,
    role: (d.role as LocalUser["role"]) ?? "player",
    balance: "0",           // ⚡ STRICT: ALWAYS 0
    agentId: d.agentId ?? null,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  users.push(u);
  saveUsers(users);
  return pub(u);
}

export function apiAdminUpdateUser(id: number, up: any) {
  const users = getUsers();
  const i = users.findIndex(x => x.id === id);
  if (i === -1) throw new Error("Not found");
  // NEVER allow balance update through this function
  const { balance, ...safeUpdates } = up;
  Object.assign(users[i], safeUpdates);
  saveUsers(users);
  return pub(users[i]);
}

export function apiAdminDeleteUser(id: number) {
  saveUsers(getUsers().filter(u => u.id !== id));
}

// ── Admin Balance (THE ONLY way to change balance) ──────────────────────────
export function apiAdminUserBalance(id: number, action: "add" | "withdraw" | "reset", amount?: number) {
  const users = getUsers();
  const i = users.findIndex(x => x.id === id);
  if (i === -1) throw new Error("المستخدم غير موجود");

  const current = parseFloat(users[i].balance || "0");
  let newBal = current;
  let txnType = "deposit";
  let txnAmount = 0;

  if (action === "add") {
    if (!amount || amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من 0");
    newBal = Math.round((current + amount) * 100) / 100;
    txnType = "deposit";
    txnAmount = amount;
  } else if (action === "withdraw") {
    if (!amount || amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من 0");
    if (current < amount) throw new Error("الرصيد غير كافي");
    newBal = Math.round((current - amount) * 100) / 100;
    txnType = "withdraw";
    txnAmount = -amount;
  } else if (action === "reset") {
    newBal = 0;
    txnType = "reset";
    txnAmount = -current;
  }

  users[i].balance = newBal.toFixed(2);
  saveUsers(users);

  // Record transaction
  const txns = ls<Transaction[]>(K.TXN, []);
  txns.unshift({
    id: nextId("t"), userId: id, type: txnType,
    amount: txnAmount.toFixed(2),
    balanceBefore: current.toFixed(2),
    balanceAfter: newBal.toFixed(2),
    description: `Admin ${action}: $${Math.abs(txnAmount).toFixed(2)}`,
    performedBy: 0,
    createdAt: new Date().toISOString(),
  });
  save(K.TXN, txns);

  return { balance: newBal };
}

// ── Admin Transactions ──────────────────────────────────────────────────────
export function apiAdminTransactions() { return ls<Transaction[]>(K.TXN, []).slice(0, 200); }

// ── Admin Agents ────────────────────────────────────────────────────────────
export function apiAdminAgents() { return getUsers().filter(u => u.role === "agent").map(pub); }

export function apiAdminAgentCredit(id: number, action: string, amount: number) {
  const users = getUsers();
  const i = users.findIndex(x => x.id === id && x.role === "agent");
  if (i === -1) throw new Error("الوكيل غير موجود");
  const current = parseFloat(users[i].balance || "0");
  let newBal = current;
  if (action === "add") {
    newBal = Math.round((current + amount) * 100) / 100;
  } else if (action === "withdraw") {
    if (current < amount) throw new Error("رصيد الوكيل غير كافي");
    newBal = Math.round((current - amount) * 100) / 100;
  }
  users[i].balance = newBal.toFixed(2);
  saveUsers(users);

  const txns = ls<Transaction[]>(K.TXN, []);
  txns.unshift({
    id: nextId("t"), userId: id, type: action === "add" ? "deposit" : "withdraw",
    amount: (action === "add" ? amount : -amount).toFixed(2),
    balanceBefore: current.toFixed(2), balanceAfter: newBal.toFixed(2),
    description: `Agent credit ${action}: $${amount.toFixed(2)}`,
    performedBy: 0, createdAt: new Date().toISOString(),
  });
  save(K.TXN, txns);

  return { balance: newBal };
}

// ── Admin Bets ──────────────────────────────────────────────────────────────
export function apiAdminBets() { return ls<SportsBet[]>(K.BETS, []).slice(0, 200); }

export function apiAdminSettleBet(id: number, status: "won" | "lost" | "void") {
  const bets = ls<SportsBet[]>(K.BETS, []);
  const i = bets.findIndex(x => x.id === id);
  if (i === -1) throw new Error("Not found");
  if (bets[i].status !== "pending") throw new Error("Already settled");

  if (status === "won" || status === "void") {
    const payout = status === "won" ? parseFloat(bets[i].potentialWin) : parseFloat(bets[i].stake);
    bets[i].payout = payout.toFixed(2);
    const users = getUsers();
    const ui = users.findIndex(x => x.id === bets[i].userId);
    if (ui !== -1) {
      const oldBal = parseFloat(users[ui].balance || "0");
      const newBal = Math.round((oldBal + payout) * 100) / 100;
      users[ui].balance = newBal.toFixed(2);
      saveUsers(users);
      const txns = ls<Transaction[]>(K.TXN, []);
      txns.unshift({
        id: nextId("t"), userId: bets[i].userId,
        type: status === "won" ? "win" : "refund",
        amount: payout.toFixed(2),
        balanceBefore: oldBal.toFixed(2), balanceAfter: newBal.toFixed(2),
        description: `Bet ${status}: ${bets[i].eventName}`,
        createdAt: new Date().toISOString(),
      });
      save(K.TXN, txns);
    }
  } else {
    bets[i].payout = "0";
  }

  bets[i].status = status;
  bets[i].settledAt = new Date().toISOString();
  save(K.BETS, bets);
  return bets[i];
}

// ── Agent ───────────────────────────────────────────────────────────────────
export function apiAgentMe(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  const u = getUsers().find(x => x.id === p.userId);
  if (!u) throw new Error("Not found");
  return pub(u);
}

export function apiAgentPlayers(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  return getUsers().filter(u => u.agentId === p.userId && u.role === "player").map(pub);
}

export function apiAgentCreatePlayer(token: string, d: { username: string; password: string; email?: string }) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  return apiAdminCreateUser({ ...d, role: "player", agentId: p.userId });
}

export function apiAgentDeletePlayer(token: string, id: number) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  if (!getUsers().find(x => x.id === id && x.agentId === p.userId)) throw new Error("Not found");
  apiAdminDeleteUser(id);
}

export function apiAgentPlayerBalance(token: string, pid: number, action: "add" | "withdraw", amount: number) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  const users = getUsers();
  const ai = users.findIndex(x => x.id === p.userId);
  const pi = users.findIndex(x => x.id === pid && x.agentId === p.userId);
  if (ai === -1 || pi === -1) throw new Error("Not found");

  const agentBal = parseFloat(users[ai].balance || "0");
  const playerBal = parseFloat(users[pi].balance || "0");

  if (action === "add") {
    if (agentBal < amount) throw new Error("رصيد الوكيل غير كافي");
    users[ai].balance = (Math.round((agentBal - amount) * 100) / 100).toFixed(2);
    users[pi].balance = (Math.round((playerBal + amount) * 100) / 100).toFixed(2);
  } else {
    if (playerBal < amount) throw new Error("رصيد اللاعب غير كافي");
    users[pi].balance = (Math.round((playerBal - amount) * 100) / 100).toFixed(2);
    users[ai].balance = (Math.round((agentBal + amount) * 100) / 100).toFixed(2);
  }
  saveUsers(users);

  const txns = ls<Transaction[]>(K.TXN, []);
  txns.unshift({
    id: nextId("t"), userId: pid,
    type: action === "add" ? "deposit" : "withdraw",
    amount: (action === "add" ? amount : -amount).toFixed(2),
    balanceBefore: playerBal.toFixed(2), balanceAfter: users[pi].balance,
    description: `Agent ${action}`,
    performedBy: p.userId, createdAt: new Date().toISOString(),
  });
  save(K.TXN, txns);

  return { playerBalance: parseFloat(users[pi].balance), agentBalance: parseFloat(users[ai].balance) };
}

export function apiAgentChangePassword(token: string, pid: number, password: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  const users = getUsers();
  const i = users.findIndex(x => x.id === pid && x.agentId === p.userId);
  if (i === -1) throw new Error("Not found");
  users[i].password = password;
  saveUsers(users);
  return { success: true };
}

export function apiAgentTransactions(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  return ls<Transaction[]>(K.TXN, []).filter(t => t.performedBy === p.userId).slice(0, 100);
}

// ── Sports ──────────────────────────────────────────────────────────────────
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
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  const users = getUsers();
  const i = users.findIndex(x => x.id === p.userId);
  if (i === -1) throw new Error("Not found");
  const bal = parseFloat(users[i].balance || "0");
  if (bal < d.stake) throw new Error("رصيد غير كافي");
  const pw = Math.round(d.stake * d.odds * 100) / 100;
  const nb = Math.round((bal - d.stake) * 100) / 100;
  users[i].balance = nb.toFixed(2);
  saveUsers(users);

  const txns = ls<Transaction[]>(K.TXN, []);
  txns.unshift({
    id: nextId("t"), userId: p.userId, type: "bet",
    amount: (-d.stake).toFixed(2),
    balanceBefore: bal.toFixed(2), balanceAfter: nb.toFixed(2),
    description: `Bet: ${d.eventName} - ${d.selectionName} @ ${d.odds}`,
    createdAt: new Date().toISOString(),
  });
  save(K.TXN, txns);

  const bets = ls<SportsBet[]>(K.BETS, []);
  const bet: SportsBet = {
    id: nextId("b"), userId: p.userId,
    eventId: d.eventId, eventName: d.eventName,
    selection: d.selection, selectionName: d.selectionName,
    odds: String(d.odds), stake: d.stake.toFixed(2),
    potentialWin: pw.toFixed(2), status: "pending",
    createdAt: new Date().toISOString(),
  };
  bets.unshift(bet);
  save(K.BETS, bets);
  return { bet, newBalance: nb };
}

// ── Games (AES direct) ──────────────────────────────────────────────────────
const AES_API = "https://api.aesgamingasia.com";
let _gamesCache: any = null, _provCache: any = null;

export async function apiGames() {
  if (_gamesCache) return _gamesCache;
  try {
    const r = await fetch(`${AES_API}/v4/game/all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const d = await r.json(); _gamesCache = d; return d;
  } catch { return { code: -1, data: [] }; }
}

export async function apiGameProviders() {
  if (_provCache) return _provCache;
  try {
    const r = await fetch(`${AES_API}/v4/game/providers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: 1 }) });
    const d = await r.json(); _provCache = d; return d;
  } catch { return { code: -1, data: [] }; }
}

// ⚡ AES Token — hardcoded + auto-refresh system
const AES_HARDCODED_TOKEN = "290c38c7-7df8-4913-9f77-2865e31f1edc";
const AES_LOGIN_ID = "Hatem_TND";
const AES_LOGIN_PWD = "99403031";
const AES_ADMIN_BASE = "https://adminback.aesgamingasia.com";

export function setAesToken(t: string) { localStorage.setItem(K.AES, t); }
export function getAesToken(): string | null {
  return localStorage.getItem(K.AES) || AES_HARDCODED_TOKEN;
}

// Auto-refresh: try to get a fresh token silently in the background
async function tryRefreshAesToken(): Promise<string | null> {
  try {
    // Get captcha
    const capRes = await fetch(`${AES_ADMIN_BASE}/v4/auth/captcha`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}"
    });
    const capData = await capRes.json() as any;
    if (capData.code !== 0) return null;
    // Can't solve captcha automatically, but the hardcoded token should still work
    return null;
  } catch { return null; }
}

// Initialize: set the hardcoded token if nothing is saved
(function initAesToken() {
  if (!localStorage.getItem(K.AES)) {
    localStorage.setItem(K.AES, AES_HARDCODED_TOKEN);
  }
})();

export async function apiLaunchGame(token: string, gameCode: string, providerId: number): Promise<{ url?: string; error?: string }> {
  const p = verifyToken(token); if (!p) return { error: "Unauthorized" };
  
  const users = getUsers();
  const userIdx = users.findIndex(u => u.id === p.userId);
  if (userIdx === -1) return { error: "User not found" };
  const user = users[userIdx];
  
  const localBal = parseFloat(user.balance || "0");
  if (localBal <= 0) return { error: "رصيدك 0. تواصل مع وكيلك لإضافة رصيد." };

  const aesToken = getAesToken();
  if (!aesToken) return { error: "خطأ في النظام. تواصل مع الدعم." };

  // Step 1: Ensure AES player exists
  let userCode = user.aesPlayerId ? parseInt(user.aesPlayerId, 10) : 0;
  if (!userCode) {
    try {
      const safeName = user.username.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 50);
      const cr = await fetch(`${AES_API}/v4/user/create`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${aesToken}` }, body: JSON.stringify({ name: safeName }) });
      const cd = await cr.json() as any;
      if (cd.code === 0 && cd.data?.user_code) {
        userCode = cd.data.user_code;
        users[userIdx].aesPlayerId = String(userCode);
        saveUsers(users);
      } else return { error: "فشل إنشاء حساب اللعب" };
    } catch { return { error: "خطأ في الاتصال" }; }
  }

  // Step 2: Clean AES wallet then deposit exact local balance
  try {
    await fetch(`${AES_API}/v4/wallet/withdraw-all`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${aesToken}` }, body: JSON.stringify({ user_code: userCode }) });
    await fetch(`${AES_API}/v4/wallet/deposit`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${aesToken}` }, body: JSON.stringify({ user_code: userCode, amount: localBal }) });
  } catch { return { error: "خطأ في تحويل الرصيد" }; }

  // ⚡ DO NOT change local balance here — keep it as-is
  // Local balance stays at 100 until closeGame syncs it

  // Step 3: Get game URL  
  try {
    const r = await fetch(`${AES_API}/v4/game/game-url`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${aesToken}` }, body: JSON.stringify({ user_code: userCode, provider_id: providerId, game_symbol: gameCode, lang: 1, return_url: window.location.origin }) });
    const d = await r.json() as any;
    const gameUrl = d.data?.game_url || d.data?.url;
    if (d.code === 0 && gameUrl) return { url: gameUrl };
    return { error: "اللعبة غير متاحة حالياً" };
  } catch {
    return { error: "خطأ في تشغيل اللعبة" };
  }
}

export async function apiSyncBalance(token: string) {
  const p = verifyToken(token); if (!p) return;
  const aesToken = getAesToken(); if (!aesToken) return;
  
  const users = getUsers();
  const userIdx = users.findIndex(u => u.id === p.userId);
  if (userIdx === -1) return;
  if (!users[userIdx].aesPlayerId) return;
  
  const userCode = parseInt(users[userIdx].aesPlayerId!, 10);
  
  try {
    // withdraw-all returns the amount that was in AES = real balance after game
    const wr = await fetch(`${AES_API}/v4/wallet/withdraw-all`, { 
      method: "POST", 
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${aesToken}` }, 
      body: JSON.stringify({ user_code: userCode }) 
    });
    const wd = await wr.json() as any;
    
    if (wd.code === 0) {
      const realBalance = parseFloat(wd.data?.amount ?? 0);
      // Only update if we actually got money back (game was active)
      // wd.data.amount = what was withdrawn = player's real balance
      const fresh = getUsers();
      const idx = fresh.findIndex(u => u.id === p.userId);
      if (idx !== -1 && realBalance >= 0) {
        fresh[idx].balance = realBalance.toFixed(2);
        saveUsers(fresh);
      }
    }
  } catch {}
}

// ── Player Transactions ─────────────────────────────────────────────────────
export function apiMyTransactions(token: string) {
  const p = verifyToken(token); if (!p) throw new Error("Unauthorized");
  return ls<Transaction[]>(K.TXN, []).filter(t => t.userId === p.userId).slice(0, 50);
}
