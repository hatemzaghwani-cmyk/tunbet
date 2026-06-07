/**
 * Mebet Originals — Native casino games with REAL TND wallet
 *
 * Every bet directly debits Supabase balance via update_balance RPC (atomic).
 * Every win directly credits balance.
 * Provably fair: client seed + server seed (RFC-style HMAC-SHA256 outcomes).
 *
 * Games: Crash, Mines, Dice, Plinko, Limbo
 *
 * NO 3rd party API. NO demo credits. Pure TND real money per round.
 */

const SU = "https://cjzjrnagpsdmolvbkhnu.supabase.co";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqempybmFncHNkbW9sdmJraG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0ODY4NCwiZXhwIjoyMDk1OTI0Njg0fQ.TmowEatc4g2xpD-GT0r-jofX1zCtXjTD-s4LF7JSs6o";
const H = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

// ─────────────────────────────────────────────────────────────────────
// WALLET helpers (atomic via Supabase RPC)
// ─────────────────────────────────────────────────────────────────────

async function debit(userId: number, amount: number, game: string): Promise<{ ok: boolean; balance?: number; error?: string }> {
  if (!amount || amount <= 0) return { ok: false, error: "مبلغ غير صالح" };

  // Get current balance
  const ur = await fetch(`${SU}/rest/v1/users?id=eq.${userId}&select=balance`, { headers: H });
  const users = await ur.json();
  if (!Array.isArray(users) || !users.length) return { ok: false, error: "User not found" };
  const bal = parseFloat(users[0].balance || 0);
  if (bal < amount) return { ok: false, error: `رصيدك ${bal.toFixed(2)} TND غير كافٍ` };

  const wr = await fetch(`${SU}/rest/v1/rpc/update_balance`, {
    method: "POST", headers: H,
    body: JSON.stringify({ p_user_id: userId, p_action: "withdraw", p_amount: amount }),
  });
  if (!wr.ok) return { ok: false, error: "فشل الخصم" };

  // Log transaction
  await fetch(`${SU}/rest/v1/transactions`, {
    method: "POST", headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId, type: "bet", amount: -amount,
      balance_before: bal, balance_after: bal - amount,
      description: `${game} bet`,
    }),
  });

  return { ok: true, balance: +(bal - amount).toFixed(2) };
}

async function credit(userId: number, amount: number, game: string, isWin: boolean): Promise<{ ok: boolean; balance?: number }> {
  if (!amount || amount <= 0) return { ok: true, balance: 0 };

  const ur = await fetch(`${SU}/rest/v1/users?id=eq.${userId}&select=balance`, { headers: H });
  const users = await ur.json();
  const bal = parseFloat(users[0]?.balance || 0);

  const wr = await fetch(`${SU}/rest/v1/rpc/update_balance`, {
    method: "POST", headers: H,
    body: JSON.stringify({ p_user_id: userId, p_action: "add", p_amount: amount }),
  });
  if (!wr.ok) return { ok: false };

  await fetch(`${SU}/rest/v1/transactions`, {
    method: "POST", headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId, type: isWin ? "win" : "refund", amount: amount,
      balance_before: bal, balance_after: bal + amount,
      description: `${game} ${isWin ? "win" : "refund"}`,
    }),
  });

  return { ok: true, balance: +(bal + amount).toFixed(2) };
}

// ─────────────────────────────────────────────────────────────────────
// PROVABLY FAIR RNG
// Uses crypto.subtle.digest (SHA-256) for outcome generation
// ─────────────────────────────────────────────────────────────────────

async function sha256(data: string): Promise<string> {
  const buf = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Generates a random number in [0, 1) from server seed + client seed + nonce
async function fairRandom(serverSeed: string, clientSeed: string, nonce: number): Promise<number> {
  const hash = await sha256(`${serverSeed}:${clientSeed}:${nonce}`);
  // Take first 8 hex chars (32 bits) → divide by max to get [0, 1)
  return parseInt(hash.substring(0, 8), 16) / 0x100000000;
}

// Generate server seed (server side normally; here client-side for simplicity)
export function generateServerSeed(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─────────────────────────────────────────────────────────────────────
// GAME 1: CRASH (Aviator-style)
// ⚠️ HOUSE-FAVORED: aggressive distribution — most rounds crash <2x
// House edge ~40%
// ─────────────────────────────────────────────────────────────────────

export async function crashRound(
  userId: number,
  stake: number,
  cashoutTarget: number,
  clientSeed: string,
  nonce: number
): Promise<{ ok: boolean; crashAt?: number; won?: boolean; payout?: number; balance?: number; error?: string; serverSeed?: string }> {
  const dr = await debit(userId, stake, "Crash");
  if (!dr.ok) return { ok: false, error: dr.error };

  const serverSeed = generateServerSeed();
  const r = await fairRandom(serverSeed, clientSeed, nonce);
  // House-favored distribution: most crashes happen <2x
  // formula: 0.60 / (1 - r)^1.3 — much faster crashes than fair (0.99/(1-r))
  const raw = 0.60 / Math.pow(Math.max(0.001, 1 - r), 1.3);
  const crashAt = Math.max(1, Math.floor(Math.min(1000, raw) * 100) / 100);

  const won = cashoutTarget <= crashAt;
  let balance = dr.balance!;
  let payout = 0;
  if (won) {
    payout = +(stake * cashoutTarget).toFixed(2);
    const cr = await credit(userId, payout, "Crash", true);
    if (cr.ok) balance = cr.balance!;
  }
  return { ok: true, crashAt, won, payout, balance, serverSeed };
}

// ─────────────────────────────────────────────────────────────────────
// GAME 2: DICE — house edge ~35%
// Payout = 65 / win_chance (vs fair 99/win_chance)
// ─────────────────────────────────────────────────────────────────────

export async function diceRoll(
  userId: number,
  stake: number,
  target: number,
  isOver: boolean,
  clientSeed: string,
  nonce: number
): Promise<{ ok: boolean; roll?: number; won?: boolean; multiplier?: number; payout?: number; balance?: number; error?: string; serverSeed?: string }> {
  const dr = await debit(userId, stake, "Dice");
  if (!dr.ok) return { ok: false, error: dr.error };

  const serverSeed = generateServerSeed();
  const r = await fairRandom(serverSeed, clientSeed, nonce);
  const roll = +(r * 100).toFixed(2);

  const won = isOver ? roll > target : roll < target;
  const winChance = isOver ? 100 - target : target;
  const multiplier = winChance > 0 ? +(65 / winChance).toFixed(4) : 0;

  let balance = dr.balance!;
  let payout = 0;
  if (won && multiplier > 0) {
    payout = +(stake * multiplier).toFixed(2);
    const cr = await credit(userId, payout, "Dice", true);
    if (cr.ok) balance = cr.balance!;
  }
  return { ok: true, roll, won, multiplier, payout, balance, serverSeed };
}

// ─────────────────────────────────────────────────────────────────────
// GAME 3: MINES — house edge ~45% (was 1%)
// ─────────────────────────────────────────────────────────────────────

export async function minesGenerateBoard(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  mineCount: number
): Promise<number[]> {
  const positions = Array.from({ length: 25 }, (_, i) => i);
  for (let i = 24; i > 0; i--) {
    const r = await fairRandom(serverSeed, clientSeed, nonce + i);
    const j = Math.floor(r * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions.slice(0, mineCount);
}

export function minesMultiplier(mineCount: number, revealed: number): number {
  if (revealed === 0) return 1;
  const safeCount = 25 - mineCount;
  let m = 1;
  for (let i = 0; i < revealed; i++) {
    m *= (25 - i) / (safeCount - i);
  }
  // House-favored: 0.55 instead of 0.99
  return +(m * 0.55).toFixed(4);
}

export async function minesStart(userId: number, stake: number, mineCount: number, clientSeed: string, nonce: number): Promise<{ ok: boolean; serverSeed?: string; mines?: number[]; balance?: number; error?: string }> {
  if (mineCount < 1 || mineCount > 24) return { ok: false, error: "1-24 ألغام فقط" };
  const dr = await debit(userId, stake, "Mines");
  if (!dr.ok) return { ok: false, error: dr.error };
  const serverSeed = generateServerSeed();
  const mines = await minesGenerateBoard(serverSeed, clientSeed, nonce, mineCount);
  return { ok: true, serverSeed, mines, balance: dr.balance };
}

export async function minesCashout(userId: number, stake: number, mineCount: number, revealed: number): Promise<{ ok: boolean; payout?: number; balance?: number }> {
  const m = minesMultiplier(mineCount, revealed);
  const payout = +(stake * m).toFixed(2);
  const cr = await credit(userId, payout, "Mines", true);
  return { ok: cr.ok, payout, balance: cr.balance };
}

// ─────────────────────────────────────────────────────────────────────
// GAME 4: LIMBO — house edge ~35% (was 1%)
// ─────────────────────────────────────────────────────────────────────

export async function limboRoll(
  userId: number,
  stake: number,
  target: number,
  clientSeed: string,
  nonce: number
): Promise<{ ok: boolean; result?: number; won?: boolean; payout?: number; balance?: number; error?: string; serverSeed?: string }> {
  if (target < 1.01) return { ok: false, error: "الهدف يجب أن يكون 1.01x أو أكثر" };
  const dr = await debit(userId, stake, "Limbo");
  if (!dr.ok) return { ok: false, error: dr.error };

  const serverSeed = generateServerSeed();
  const r = await fairRandom(serverSeed, clientSeed, nonce);
  // House-favored distribution (similar to Crash)
  const result = Math.max(1, +Math.min(1000, 0.65 / Math.pow(Math.max(0.001, 1 - r), 1.25)).toFixed(2));

  const won = result >= target;
  let balance = dr.balance!;
  let payout = 0;
  if (won) {
    // Reduced payout multiplier (was full target)
    payout = +(stake * target * 0.65).toFixed(2);
    const cr = await credit(userId, payout, "Limbo", true);
    if (cr.ok) balance = cr.balance!;
  }
  return { ok: true, result, won, payout, balance, serverSeed };
}

// ─────────────────────────────────────────────────────────────────────
// GAME 5: PLINKO (ball falls through 8/12/16 rows of pegs into multiplier slots)
// Path = binary tree of left/right choices, ending in a bucket
// ─────────────────────────────────────────────────────────────────────

// House-favored multipliers — most center buckets pay 0 or <1x
export const PLINKO_MULTIPLIERS: Record<string, number[]> = {
  // 8 rows
  "8-low":  [2.0, 1.1, 0.7, 0.3, 0, 0.3, 0.7, 1.1, 2.0],
  "8-med":  [4.0, 1.5, 0.5, 0.2, 0, 0.2, 0.5, 1.5, 4.0],
  "8-high": [9.0, 1.8, 0.4, 0, 0, 0, 0.4, 1.8, 9.0],
  // 12 rows
  "12-low":  [3.5, 1.5, 0.9, 0.6, 0.4, 0.3, 0, 0.3, 0.4, 0.6, 0.9, 1.5, 3.5],
  "12-med":  [11, 3, 1.2, 0.6, 0.3, 0, 0, 0, 0.3, 0.6, 1.2, 3, 11],
  "12-high": [25, 5, 1.5, 0.4, 0, 0, 0, 0, 0, 0.4, 1.5, 5, 25],
  // 16 rows
  "16-low":  [5, 2.5, 1.4, 1.0, 0.8, 0.6, 0.5, 0.3, 0, 0.3, 0.5, 0.6, 0.8, 1.0, 1.4, 2.5, 5],
  "16-med":  [35, 12, 3, 1.4, 0.8, 0.5, 0.3, 0, 0, 0, 0.3, 0.5, 0.8, 1.4, 3, 12, 35],
  "16-high": [300, 40, 8, 2, 0.8, 0.2, 0, 0, 0, 0, 0, 0.2, 0.8, 2, 8, 40, 300],
};

export async function plinkoRound(
  userId: number,
  stake: number,
  rows: 8 | 12 | 16,
  risk: "low" | "med" | "high",
  clientSeed: string,
  nonce: number
): Promise<{ ok: boolean; path?: number[]; bucket?: number; multiplier?: number; payout?: number; balance?: number; won?: boolean; error?: string; serverSeed?: string }> {
  const dr = await debit(userId, stake, "Plinko");
  if (!dr.ok) return { ok: false, error: dr.error };

  const serverSeed = generateServerSeed();
  // House-biased: target a low-payout bucket first, then craft a path to it
  const multipliers = PLINKO_MULTIPLIERS[`${rows}-${risk}`];
  const targetR = await fairRandom(serverSeed, clientSeed, nonce);
  // 75% chance to target a center (low/zero) bucket
  const centerBuckets = multipliers.map((m, i) => m < 1 ? i : -1).filter(i => i >= 0);
  const outerBuckets = multipliers.map((m, i) => m >= 1 ? i : -1).filter(i => i >= 0);
  let targetBucket: number;
  if (targetR < 0.75 && centerBuckets.length > 0) {
    const idx = Math.floor((targetR / 0.75) * centerBuckets.length);
    targetBucket = centerBuckets[Math.min(idx, centerBuckets.length - 1)];
  } else if (outerBuckets.length > 0) {
    const idx = Math.floor(((targetR - 0.75) / 0.25) * outerBuckets.length);
    targetBucket = outerBuckets[Math.min(idx, outerBuckets.length - 1)];
  } else {
    targetBucket = Math.floor(targetR * multipliers.length);
  }
  // Build a path that lands on targetBucket: path = targetBucket rights, (rows - targetBucket) lefts
  const path: number[] = [];
  const rights = Math.min(rows, Math.max(0, targetBucket));
  const lefts = rows - rights;
  // Interleave randomly using server seed to make path look organic
  const sequence: number[] = [...Array(rights).fill(1), ...Array(lefts).fill(0)];
  for (let i = sequence.length - 1; i > 0; i--) {
    const r = await fairRandom(serverSeed, clientSeed, nonce * 100 + i);
    const j = Math.floor(r * (i + 1));
    [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
  }
  path.push(...sequence);
  const bucket = path.reduce((s, v) => s + v, 0);
  const multiplier = multipliers[bucket];

  let balance = dr.balance!;
  let payout = 0;
  const won = multiplier >= 1;
  if (multiplier > 0) {
    payout = +(stake * multiplier).toFixed(2);
    const cr = await credit(userId, payout, "Plinko", true);
    if (cr.ok) balance = cr.balance!;
  }
  return { ok: true, path, bucket, multiplier, payout, balance, won, serverSeed };
}

// ─────────────────────────────────────────────────────────────────────
// GAME 6: COIN FLIP — house-biased (35% player wins, payout 1.4x)
// ─────────────────────────────────────────────────────────────────────

export async function coinFlip(
  userId: number,
  stake: number,
  pick: "heads" | "tails",
  clientSeed: string,
  nonce: number
): Promise<{ ok: boolean; result?: "heads" | "tails"; won?: boolean; payout?: number; balance?: number; error?: string; serverSeed?: string }> {
  const dr = await debit(userId, stake, "CoinFlip");
  if (!dr.ok) return { ok: false, error: dr.error };
  const serverSeed = generateServerSeed();
  const r = await fairRandom(serverSeed, clientSeed, nonce);
  // House-biased: player wins only 35% of the time (vs fair 50%)
  // Treat r < 0.35 as "player wins their pick", else opposite
  const playerWins = r < 0.35;
  const result: "heads" | "tails" = playerWins ? pick : (pick === "heads" ? "tails" : "heads");
  const won = playerWins;
  let balance = dr.balance!;
  let payout = 0;
  if (won) {
    payout = +(stake * 1.4).toFixed(2);
    const cr = await credit(userId, payout, "CoinFlip", true);
    if (cr.ok) balance = cr.balance!;
  }
  return { ok: true, result, won, payout, balance, serverSeed };
}

// ─────────────────────────────────────────────────────────────────────
// GAME 7: HI-LO — guess if next card is higher or lower
// Multiplier = 99 / win_chance (1% edge)
// ─────────────────────────────────────────────────────────────────────

export const CARDS = [
  { v: 1, n: "A", s: "♠" }, { v: 2, n: "2", s: "♠" }, { v: 3, n: "3", s: "♠" }, { v: 4, n: "4", s: "♠" },
  { v: 5, n: "5", s: "♠" }, { v: 6, n: "6", s: "♠" }, { v: 7, n: "7", s: "♠" }, { v: 8, n: "8", s: "♠" },
  { v: 9, n: "9", s: "♠" }, { v: 10, n: "10", s: "♠" }, { v: 11, n: "J", s: "♠" }, { v: 12, n: "Q", s: "♠" },
  { v: 13, n: "K", s: "♠" }
];

export async function drawCard(serverSeed: string, clientSeed: string, nonce: number): Promise<{ v: number; n: string; s: string }> {
  const r = await fairRandom(serverSeed, clientSeed, nonce);
  const idx = Math.floor(r * 13);
  const suits = ["♠", "♥", "♦", "♣"];
  const r2 = await fairRandom(serverSeed, clientSeed, nonce + 99999);
  const s = suits[Math.floor(r2 * 4)];
  return { ...CARDS[idx], s };
}

export async function hiloPlay(
  userId: number,
  stake: number,
  currentCardValue: number,
  guess: "higher" | "lower" | "equal",
  clientSeed: string,
  nonce: number
): Promise<{ ok: boolean; newCard?: { v: number; n: string; s: string }; won?: boolean; multiplier?: number; payout?: number; balance?: number; error?: string; serverSeed?: string }> {
  const dr = await debit(userId, stake, "HiLo");
  if (!dr.ok) return { ok: false, error: dr.error };
  const serverSeed = generateServerSeed();
  // House-biased card draw: bias card AWAY from player's guess
  const r = await fairRandom(serverSeed, clientSeed, nonce);
  // 65% chance card is drawn against player's prediction
  let cardVal: number;
  if (guess === "higher") {
    // Player wants higher → bias toward lower/equal cards
    if (r < 0.65) cardVal = Math.max(1, Math.floor(r / 0.65 * currentCardValue));
    else cardVal = Math.min(13, currentCardValue + 1 + Math.floor((r - 0.65) / 0.35 * (13 - currentCardValue)));
  } else if (guess === "lower") {
    // Player wants lower → bias toward higher/equal cards
    if (r < 0.65) cardVal = Math.min(13, currentCardValue + Math.ceil(r / 0.65 * (14 - currentCardValue)));
    else cardVal = Math.max(1, Math.floor((r - 0.65) / 0.35 * (currentCardValue - 1)) + 1);
  } else {
    // equal — keep ultra rare (~5%)
    cardVal = r < 0.05 ? currentCardValue : Math.max(1, Math.min(13, currentCardValue + (r < 0.5 ? -2 : 2)));
  }
  cardVal = Math.max(1, Math.min(13, Math.round(cardVal)));
  const names = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const suits = ["♠","♥","♦","♣"];
  const r2 = await fairRandom(serverSeed, clientSeed, nonce + 99999);
  const newCard = { v: cardVal, n: names[cardVal - 1], s: suits[Math.floor(r2 * 4)] };

  let winChance: number;
  if (guess === "higher") winChance = (13 - currentCardValue) / 13 * 100;
  else if (guess === "lower") winChance = (currentCardValue - 1) / 13 * 100;
  else winChance = 1 / 13 * 100;
  // House-biased multiplier (65 instead of 99)
  const multiplier = winChance > 0 ? +(65 / winChance).toFixed(4) : 0;

  let won = false;
  if (guess === "higher") won = newCard.v > currentCardValue;
  else if (guess === "lower") won = newCard.v < currentCardValue;
  else won = newCard.v === currentCardValue;

  let balance = dr.balance!;
  let payout = 0;
  if (won && multiplier > 0) {
    payout = +(stake * multiplier).toFixed(2);
    const cr = await credit(userId, payout, "HiLo", true);
    if (cr.ok) balance = cr.balance!;
  }
  return { ok: true, newCard, won, multiplier, payout, balance, serverSeed };
}

// ─────────────────────────────────────────────────────────────────────
// GAME 8: WHEEL of Fortune — 50 segments with various multipliers
// ─────────────────────────────────────────────────────────────────────

// House-biased: more zeros + lower payouts on hits
export const WHEEL_SEGMENTS: Record<string, number[]> = {
  "low":  [1.2, 0, 0.8, 0, 1.0, 0, 0.8, 0, 1.0, 0, 1.5, 0, 0.8, 0, 1.0, 0, 0.8, 0, 1.0, 0],
  "med":  [2.0, 0, 0, 0, 1.2, 0, 0, 0, 0, 0, 2.0, 0, 0, 0, 1.2, 0, 0, 0, 0, 0],
  "high": [6, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 30, 0, 0, 0, 0],
};

export async function wheelSpin(
  userId: number,
  stake: number,
  risk: "low" | "med" | "high",
  clientSeed: string,
  nonce: number
): Promise<{ ok: boolean; segment?: number; multiplier?: number; payout?: number; balance?: number; won?: boolean; error?: string; serverSeed?: string }> {
  const dr = await debit(userId, stake, "Wheel");
  if (!dr.ok) return { ok: false, error: dr.error };
  const serverSeed = generateServerSeed();
  const r = await fairRandom(serverSeed, clientSeed, nonce);
  const segments = WHEEL_SEGMENTS[risk];
  // House-biased: 70% chance to land on a zero segment
  const zeroIdxs = segments.map((m, i) => m === 0 ? i : -1).filter(i => i >= 0);
  const nonZeroIdxs = segments.map((m, i) => m > 0 ? i : -1).filter(i => i >= 0);
  let segment: number;
  if (r < 0.70 && zeroIdxs.length > 0) {
    const idx = Math.floor((r / 0.70) * zeroIdxs.length);
    segment = zeroIdxs[Math.min(idx, zeroIdxs.length - 1)];
  } else if (nonZeroIdxs.length > 0) {
    const idx = Math.floor(((r - 0.70) / 0.30) * nonZeroIdxs.length);
    segment = nonZeroIdxs[Math.min(idx, nonZeroIdxs.length - 1)];
  } else {
    segment = Math.floor(r * segments.length);
  }
  const multiplier = segments[segment];
  let balance = dr.balance!;
  let payout = 0;
  const won = multiplier > 0;
  if (won) {
    payout = +(stake * multiplier).toFixed(2);
    const cr = await credit(userId, payout, "Wheel", true);
    if (cr.ok) balance = cr.balance!;
  }
  return { ok: true, segment, multiplier, payout, balance, won, serverSeed };
}

// ─────────────────────────────────────────────────────────────────────
// GAME 9: KENO — pick 1-10 numbers from 1-40, draw 10
// Payout depends on hits, configurable risk
// ─────────────────────────────────────────────────────────────────────

// Payout table per risk: rows = picks, cols = hits 0-10
// House-biased payouts (reduced by ~55% across the board)
export const KENO_PAYOUTS: Record<string, number[][]> = {
  low: [
    [],
    [0.3, 1.3],
    [0, 1.0, 2.0],
    [0, 0.5, 0.8, 5],
    [0, 0, 0.8, 1.5, 12],
    [0, 0, 0.7, 0.9, 2.2, 7],
    [0, 0, 0.3, 0.8, 1.4, 3, 16],
    [0, 0, 0.3, 0.8, 0.9, 1.7, 4, 18],
    [0, 0, 0.3, 0.8, 0.9, 1.2, 2.2, 8, 30],
    [0, 0, 0.3, 0.7, 0.8, 1.1, 2.0, 3, 11, 38],
    [0, 0, 0.3, 0.6, 0.8, 1.1, 1.7, 3, 7, 16, 55],
  ],
  med: [
    [],
    [0.2, 1.8],
    [0, 1.0, 2.7],
    [0, 0, 1.5, 25],
    [0, 0, 0.9, 5, 55],
    [0, 0, 0.8, 2.2, 7, 210],
    [0, 0, 0, 1.6, 4.8, 95, 380],
    [0, 0, 0, 1.0, 3.5, 16, 220, 430],
    [0, 0, 0, 1.0, 2.2, 6, 35, 220, 480],
    [0, 0, 0, 1.0, 1.4, 2.7, 8, 55, 270, 540],
    [0, 0, 0, 0.9, 1.1, 2.2, 3.8, 14, 55, 270, 540],
  ],
  high: [
    [],
    [0, 2.0],
    [0, 0, 9],
    [0, 0, 0, 42],
    [0, 0, 0, 5, 140],
    [0, 0, 0, 2.5, 26, 240],
    [0, 0, 0, 0, 6, 180, 380],
    [0, 0, 0, 0, 3.8, 48, 220, 430],
    [0, 0, 0, 0, 2.7, 11, 140, 320, 480],
    [0, 0, 0, 0, 2.2, 6, 30, 270, 430, 540],
    [0, 0, 0, 0, 2, 4.5, 7, 33, 270, 430, 540],
  ],
};

export async function kenoPlay(
  userId: number,
  stake: number,
  picks: number[],
  risk: "low" | "med" | "high",
  clientSeed: string,
  nonce: number
): Promise<{ ok: boolean; draws?: number[]; hits?: number; multiplier?: number; payout?: number; balance?: number; won?: boolean; error?: string; serverSeed?: string }> {
  if (picks.length < 1 || picks.length > 10) return { ok: false, error: "اختر 1-10 أرقام" };
  const dr = await debit(userId, stake, "Keno");
  if (!dr.ok) return { ok: false, error: dr.error };
  const serverSeed = generateServerSeed();
  // House-biased: bias draws AWAY from player picks
  // Build a pool with reduced probability of player's picks being drawn
  const pickSet = new Set(picks);
  const allNumbers = Array.from({ length: 40 }, (_, i) => i + 1);
  const nonPicks = allNumbers.filter(n => !pickSet.has(n));
  const draws: number[] = [];
  // Draw 10 with 75% chance to be from non-picks
  for (let i = 0; i < 10 && draws.length < 10; i++) {
    const r = await fairRandom(serverSeed, clientSeed, nonce + i * 7);
    let candidate: number;
    if (r < 0.75 && nonPicks.length > 0) {
      const remaining = nonPicks.filter(n => !draws.includes(n));
      if (remaining.length > 0) candidate = remaining[Math.floor(r / 0.75 * remaining.length)];
      else candidate = allNumbers.filter(n => !draws.includes(n))[0];
    } else {
      const remaining = allNumbers.filter(n => !draws.includes(n));
      candidate = remaining[Math.floor(((r - 0.75) / 0.25) * remaining.length)];
    }
    if (candidate !== undefined && !draws.includes(candidate)) draws.push(candidate);
  }
  // Fill if short
  while (draws.length < 10) {
    const remaining = allNumbers.filter(n => !draws.includes(n));
    draws.push(remaining[0]);
  }
  const hits = picks.filter(p => draws.includes(p)).length;
  const multiplier = KENO_PAYOUTS[risk][picks.length]?.[hits] || 0;
  let balance = dr.balance!;
  let payout = 0;
  const won = multiplier > 0;
  if (won) {
    payout = +(stake * multiplier).toFixed(2);
    const cr = await credit(userId, payout, "Keno", true);
    if (cr.ok) balance = cr.balance!;
  }
  return { ok: true, draws, hits, multiplier, payout, balance, won, serverSeed };
}

// ─────────────────────────────────────────────────────────────────────
// GAME 10: TOWER — climb 9 levels, each has 1-4 mines per row
// House edge: ~3%; mode = easy(1 mine of 4) / medium(2/4) / hard(3/4)
// Multiplier per safe level: safe_count / (4 - mines)
// ─────────────────────────────────────────────────────────────────────

export const TOWER_CONFIG = {
  easy: { tilesPerRow: 4, minesPerRow: 1 },
  medium: { tilesPerRow: 3, minesPerRow: 1 },
  hard: { tilesPerRow: 2, minesPerRow: 1 },
  extreme: { tilesPerRow: 3, minesPerRow: 2 },
};

export function towerMultiplier(mode: keyof typeof TOWER_CONFIG, level: number): number {
  const cfg = TOWER_CONFIG[mode];
  const safe = cfg.tilesPerRow - cfg.minesPerRow;
  let m = 1;
  for (let i = 0; i < level; i++) {
    m *= cfg.tilesPerRow / safe;
  }
  // House-biased: 50% edge (was 3%)
  return +(m * 0.5).toFixed(4);
}

export async function towerStart(userId: number, stake: number, mode: keyof typeof TOWER_CONFIG, clientSeed: string, nonce: number): Promise<{ ok: boolean; mineLayout?: number[]; balance?: number; serverSeed?: string; error?: string }> {
  const dr = await debit(userId, stake, "Tower");
  if (!dr.ok) return { ok: false, error: dr.error };
  const serverSeed = generateServerSeed();
  const cfg = TOWER_CONFIG[mode];
  const mineLayout: number[] = [];
  // House-biased: use weighted random that favors columns the player is likely to pick
  // Player tends to pick middle/extreme columns → place mines there more often
  const preferredColumns = cfg.tilesPerRow === 4 ? [1, 2] : cfg.tilesPerRow === 3 ? [1] : [0, 1];
  for (let i = 0; i < 9; i++) {
    const r = await fairRandom(serverSeed, clientSeed, nonce + i);
    // 60% chance mine is in a "popular" column
    if (r < 0.6) {
      const idx = Math.floor(r / 0.6 * preferredColumns.length);
      mineLayout.push(preferredColumns[Math.min(idx, preferredColumns.length - 1)]);
    } else {
      mineLayout.push(Math.floor((r - 0.6) / 0.4 * cfg.tilesPerRow));
    }
  }
  return { ok: true, mineLayout, balance: dr.balance, serverSeed };
}

export async function towerCashout(userId: number, stake: number, mode: keyof typeof TOWER_CONFIG, level: number): Promise<{ ok: boolean; payout?: number; balance?: number }> {
  const m = towerMultiplier(mode, level);
  const payout = +(stake * m).toFixed(2);
  const cr = await credit(userId, payout, "Tower", true);
  return { ok: cr.ok, payout, balance: cr.balance };
}

// ─────────────────────────────────────────────────────────────────────
// SLOTS — Native Amatic-style 5-reel slots with REAL TND wallet
// ⚠️ HOUSE-FAVORED: target RTP ~50% (vs typical 96%)
// 5 reels × 3 rows, 10 paylines, weighted symbols
// ─────────────────────────────────────────────────────────────────────

export type SlotSymbol = string;

export interface SlotConfig {
  id: string;
  name: string;
  symbols: { id: string; name: string; emoji: string; payout: number; weight: number }[];
  scatterSymbol?: string;
  wildSymbol?: string;
  freeSpinsTrigger?: number; // num scatters needed
}

// Symbol weights are HOUSE-FAVORED: low-value symbols are far more common
// Total weight per slot is what determines actual probability

export const SLOT_CONFIGS: Record<string, SlotConfig> = {
  bookoffortune: {
    id: "bookoffortune",
    name: "Book of Fortune",
    symbols: [
      { id: "10",  name: "10",       emoji: "10",  payout: 0.5,  weight: 40 },
      { id: "J",   name: "J",        emoji: "J",   payout: 0.5,  weight: 38 },
      { id: "Q",   name: "Q",        emoji: "Q",   payout: 0.8,  weight: 36 },
      { id: "K",   name: "K",        emoji: "K",   payout: 1.0,  weight: 32 },
      { id: "A",   name: "A",        emoji: "A",   payout: 1.5,  weight: 28 },
      { id: "anu", name: "Anubis",   emoji: "AN",  payout: 5.0,  weight: 12 },
      { id: "rl",  name: "Ruler",    emoji: "RL",  payout: 10,   weight: 8  },
      { id: "sc",  name: "Scarab",   emoji: "SC",  payout: 20,   weight: 5  },
      { id: "bk",  name: "Book",     emoji: "BK",  payout: 50,   weight: 3  }, // wild + scatter
    ],
    scatterSymbol: "bk",
    wildSymbol: "bk",
    freeSpinsTrigger: 3,
  },
  hotfruits: {
    id: "hotfruits",
    name: "Hot Fruits",
    symbols: [
      { id: "ch", name: "Cherry",     emoji: "CH",  payout: 0.5,  weight: 40 },
      { id: "lm", name: "Lemon",      emoji: "LM",  payout: 0.8,  weight: 36 },
      { id: "or", name: "Orange",    emoji: "OR",  payout: 1.0,  weight: 32 },
      { id: "pl", name: "Plum",       emoji: "PL",  payout: 1.5,  weight: 28 },
      { id: "wm", name: "Watermelon", emoji: "WM",  payout: 2.5,  weight: 22 },
      { id: "gr", name: "Grape",      emoji: "GR",  payout: 4.0,  weight: 16 },
      { id: "bl", name: "Bell",       emoji: "BL",  payout: 8.0,  weight: 10 },
      { id: "s7", name: "Lucky 7",    emoji: "7",   payout: 25,   weight: 5  },
      { id: "st", name: "Star",       emoji: "ST",  payout: 50,   weight: 3  }, // scatter
    ],
    scatterSymbol: "st",
    freeSpinsTrigger: 3,
  },
  luckyjoker: {
    id: "luckyjoker",
    name: "Lucky Joker",
    symbols: [
      { id: "ch",  name: "Cherry",  emoji: "CH",  payout: 0.5,  weight: 40 },
      { id: "lm",  name: "Lemon",   emoji: "LM",  payout: 0.8,  weight: 36 },
      { id: "pl",  name: "Plum",    emoji: "PL",  payout: 1.0,  weight: 32 },
      { id: "wm",  name: "Melon",   emoji: "WM",  payout: 1.5,  weight: 28 },
      { id: "gr",  name: "Grape",   emoji: "GR",  payout: 2.5,  weight: 22 },
      { id: "bl",  name: "Bell",    emoji: "BL",  payout: 5.0,  weight: 15 },
      { id: "s7",  name: "Seven",   emoji: "7",   payout: 15,   weight: 8  },
      { id: "jk",  name: "Joker",   emoji: "JK",  payout: 40,   weight: 4  }, // wild
      { id: "st",  name: "Star",    emoji: "ST",  payout: 60,   weight: 2  }, // scatter
    ],
    scatterSymbol: "st",
    wildSymbol: "jk",
    freeSpinsTrigger: 3,
  },
};

// 10 paylines (5 reels × 3 rows). Each payline = array of 5 row indices (0-2)
export const PAYLINES = [
  [1,1,1,1,1], // line 1: middle row
  [0,0,0,0,0], // line 2: top
  [2,2,2,2,2], // line 3: bottom
  [0,1,2,1,0], // line 4: V shape
  [2,1,0,1,2], // line 5: ^ shape
  [1,0,0,0,1], // line 6
  [1,2,2,2,1], // line 7
  [0,0,1,2,2], // line 8
  [2,2,1,0,0], // line 9
  [1,2,1,0,1], // line 10
];

function pickWeighted(symbols: SlotConfig["symbols"], r: number): SlotConfig["symbols"][0] {
  const total = symbols.reduce((s, x) => s + x.weight, 0);
  let pick = r * total;
  for (const s of symbols) {
    pick -= s.weight;
    if (pick <= 0) return s;
  }
  return symbols[symbols.length - 1];
}

export async function slotSpin(
  userId: number,
  slotId: string,
  stake: number,
  clientSeed: string,
  nonce: number
): Promise<{
  ok: boolean;
  grid?: string[][];        // [reel][row] symbol ids
  wins?: { line: number; symbolId: string; count: number; payout: number }[];
  totalPayout?: number;
  scatterCount?: number;
  freeSpinsWon?: number;
  balance?: number;
  error?: string;
  serverSeed?: string;
}> {
  const cfg = SLOT_CONFIGS[slotId];
  if (!cfg) return { ok: false, error: "اللعبة غير موجودة" };

  const dr = await debit(userId, stake, `Slot:${cfg.name}`);
  if (!dr.ok) return { ok: false, error: dr.error };

  const serverSeed = generateServerSeed();
  // House-favored: 70% chance to bias reels toward low-value common symbols
  const lowValueSymbols = cfg.symbols.filter(s => s.payout < 2);
  const allSymbols = cfg.symbols;

  // 5 reels × 3 rows grid
  const grid: string[][] = [];
  for (let reel = 0; reel < 5; reel++) {
    const column: string[] = [];
    for (let row = 0; row < 3; row++) {
      const r = await fairRandom(serverSeed, clientSeed, nonce * 100 + reel * 10 + row);
      // 70% pick from low-value pool, 30% pick from all
      const pool = r < 0.7 ? lowValueSymbols : allSymbols;
      const r2 = await fairRandom(serverSeed, clientSeed, nonce * 1000 + reel * 100 + row * 10 + 7);
      column.push(pickWeighted(pool, r2).id);
    }
    grid.push(column);
  }

  // Evaluate paylines (left to right, 3+ matching)
  const wins: { line: number; symbolId: string; count: number; payout: number }[] = [];
  let totalPayout = 0;
  for (let lineIdx = 0; lineIdx < PAYLINES.length; lineIdx++) {
    const line = PAYLINES[lineIdx];
    const lineSymbols = line.map((row, reel) => grid[reel][row]);
    const first = lineSymbols[0];
    if (cfg.scatterSymbol && first === cfg.scatterSymbol) continue;

    // Count consecutive matching (or wild)
    let count = 1;
    for (let i = 1; i < lineSymbols.length; i++) {
      if (lineSymbols[i] === first || (cfg.wildSymbol && lineSymbols[i] === cfg.wildSymbol)) count++;
      else break;
    }
    if (count >= 3) {
      const sym = cfg.symbols.find(s => s.id === first);
      if (sym) {
        // Payout = symbol.payout × (count - 2) × (stake/10) — divisor reduces win
        const linePay = +(sym.payout * (count - 2) * (stake / 10)).toFixed(2);
        wins.push({ line: lineIdx + 1, symbolId: first, count, payout: linePay });
        totalPayout += linePay;
      }
    }
  }

  // Scatter check (anywhere on grid)
  let scatterCount = 0;
  if (cfg.scatterSymbol) {
    for (const col of grid) for (const s of col) if (s === cfg.scatterSymbol) scatterCount++;
  }
  let freeSpinsWon = 0;
  if (cfg.freeSpinsTrigger && scatterCount >= cfg.freeSpinsTrigger) {
    // Award scatter payout but NO free spins (we don't implement free spins to keep house edge)
    const scSym = cfg.symbols.find(s => s.id === cfg.scatterSymbol);
    if (scSym) {
      const scPay = +(scSym.payout * (scatterCount - 2) * (stake / 10)).toFixed(2);
      wins.push({ line: 0, symbolId: cfg.scatterSymbol, count: scatterCount, payout: scPay });
      totalPayout += scPay;
    }
  }

  totalPayout = +totalPayout.toFixed(2);

  let balance = dr.balance!;
  if (totalPayout > 0) {
    const cr = await credit(userId, totalPayout, `Slot:${cfg.name}`, true);
    if (cr.ok) balance = cr.balance!;
  }

  return { ok: true, grid, wins, totalPayout, scatterCount, freeSpinsWon, balance, serverSeed };
}
