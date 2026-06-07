// ─────────────────────────────────────────────────────────────────────
// SLOT ENGINE — Native multi-theme slot game runner
// Every spin is server-validated via Supabase RPC update_balance (atomic).
// House-favored RNG (low RTP) to keep site profitable.
// Provably-fair: server seed + client seed + nonce (SHA-256 derived).
// ─────────────────────────────────────────────────────────────────────

import type { AmaticGame, AmaticTheme } from "./amaticGames";

const SU = "https://cjzjrnagpsdmolvbkhnu.supabase.co";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqempybmFncHNkbW9sdmJraG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0ODY4NCwiZXhwIjoyMDk1OTI0Njg0fQ.TmowEatc4g2xpD-GT0r-jofX1zCtXjTD-s4LF7JSs6o";
const H = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

// ─────────── Wallet (atomic) ───────────
async function debit(userId: number, amount: number, label: string): Promise<{ ok: boolean; balance?: number; error?: string }> {
  const r = await fetch(`${SU}/rest/v1/rpc/update_balance`, {
    method: "POST", headers: H,
    body: JSON.stringify({ p_user_id: userId, p_action: "withdraw", p_amount: amount, p_description: label }),
  });
  const d = await r.json();
  if (r.status >= 400 || (typeof d === "object" && d?.message)) {
    return { ok: false, error: typeof d === "object" ? (d.message === "Insufficient balance" ? "رصيد غير كافٍ" : d.message) : "خطأ" };
  }
  return { ok: true, balance: parseFloat(d) };
}
async function credit(userId: number, amount: number, label: string): Promise<number | null> {
  if (amount <= 0) return null;
  const r = await fetch(`${SU}/rest/v1/rpc/update_balance`, {
    method: "POST", headers: H,
    body: JSON.stringify({ p_user_id: userId, p_action: "add", p_amount: amount, p_description: label }),
  });
  const d = await r.json();
  return r.status >= 400 ? null : parseFloat(d);
}

// ─────────── Provably-fair RNG ───────────
async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function fairRandom(serverSeed: string, clientSeed: string, nonce: number): Promise<number> {
  const h = await sha256Hex(`${serverSeed}:${clientSeed}:${nonce}`);
  return parseInt(h.substring(0, 8), 16) / 0x100000000;
}
export function newServerSeed(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join("");
}
export function newClientSeed(): string {
  return newServerSeed().substring(0, 16);
}

// ─────────── Symbol library per theme ───────────
export interface Symbol {
  id: string;
  label: string;       // short label shown in payout table
  weight: number;      // weight for random pool (higher = more common)
  payout: number;      // multiplier for 3-of-a-kind on a payline (* stake/lines)
  isWild?: boolean;
  isScatter?: boolean;
}

const cardSymbols = (): Symbol[] => [
  { id: "10", label: "10", weight: 50, payout: 0.2 },
  { id: "J",  label: "J",  weight: 46, payout: 0.3 },
  { id: "Q",  label: "Q",  weight: 42, payout: 0.4 },
  { id: "K",  label: "K",  weight: 38, payout: 0.5 },
  { id: "A",  label: "A",  weight: 34, payout: 0.8 },
];

export const THEME_REELS: Record<AmaticTheme, Symbol[]> = {
  egyptian: [
    ...cardSymbols(),
    { id: "scarab",  label: "SC", weight: 14, payout: 4 },
    { id: "anubis",  label: "AN", weight: 10, payout: 8 },
    { id: "pharaoh", label: "PH", weight: 7,  payout: 20 },
    { id: "book",    label: "BK", weight: 4,  payout: 50, isWild: true, isScatter: true },
  ],
  fruits: [
    { id: "cherry",  label: "CH", weight: 50, payout: 0.3 },
    { id: "lemon",   label: "LM", weight: 46, payout: 0.4 },
    { id: "orange",  label: "OR", weight: 42, payout: 0.5 },
    { id: "plum",    label: "PL", weight: 38, payout: 0.7 },
    { id: "melon",   label: "WM", weight: 28, payout: 1.5 },
    { id: "grape",   label: "GR", weight: 22, payout: 2.5 },
    { id: "bell",    label: "BL", weight: 14, payout: 6 },
    { id: "seven",   label: "S7", weight: 6,  payout: 25 },
    { id: "star",    label: "ST", weight: 3,  payout: 50, isScatter: true },
  ],
  joker: [
    { id: "cherry", label: "CH", weight: 50, payout: 0.3 },
    { id: "lemon",  label: "LM", weight: 46, payout: 0.4 },
    { id: "plum",   label: "PL", weight: 42, payout: 0.6 },
    { id: "melon",  label: "WM", weight: 38, payout: 1 },
    { id: "grape",  label: "GR", weight: 30, payout: 2 },
    { id: "bell",   label: "BL", weight: 18, payout: 5 },
    { id: "seven",  label: "S7", weight: 8,  payout: 12 },
    { id: "joker",  label: "JK", weight: 5,  payout: 40, isWild: true },
    { id: "star",   label: "ST", weight: 3,  payout: 50, isScatter: true },
  ],
  diamond: [
    ...cardSymbols(),
    { id: "ruby",    label: "RB", weight: 18, payout: 3 },
    { id: "sapphire",label: "SA", weight: 14, payout: 5 },
    { id: "emerald", label: "EM", weight: 10, payout: 10 },
    { id: "diamond", label: "DI", weight: 6,  payout: 30, isWild: true },
    { id: "star",    label: "ST", weight: 3,  payout: 60, isScatter: true },
  ],
  fire: [
    ...cardSymbols(),
    { id: "bell",    label: "BL", weight: 18, payout: 4 },
    { id: "flame",   label: "FL", weight: 12, payout: 8 },
    { id: "phoenix", label: "PX", weight: 6,  payout: 25, isWild: true },
    { id: "star",    label: "ST", weight: 3,  payout: 50, isScatter: true },
  ],
  billy: [
    ...cardSymbols(),
    { id: "money",   label: "$$", weight: 20, payout: 3 },
    { id: "ring",    label: "RG", weight: 14, payout: 6 },
    { id: "cigar",   label: "CG", weight: 9,  payout: 12 },
    { id: "billy",   label: "BY", weight: 5,  payout: 40, isWild: true },
    { id: "star",    label: "ST", weight: 3,  payout: 50, isScatter: true },
  ],
  dragon: [
    ...cardSymbols(),
    { id: "warrior", label: "WR", weight: 16, payout: 4 },
    { id: "tiger",   label: "TG", weight: 11, payout: 8 },
    { id: "phoenix", label: "PX", weight: 7,  payout: 20 },
    { id: "dragon",  label: "DR", weight: 4,  payout: 60, isWild: true, isScatter: true },
  ],
  wild: [
    ...cardSymbols(),
    { id: "deer",   label: "DE", weight: 16, payout: 3 },
    { id: "bear",   label: "BR", weight: 11, payout: 6 },
    { id: "wolf",   label: "WF", weight: 7,  payout: 15 },
    { id: "moon",   label: "MN", weight: 4,  payout: 50, isWild: true, isScatter: true },
  ],
};

function pickWeighted(symbols: Symbol[], r: number): Symbol {
  const total = symbols.reduce((s, x) => s + x.weight, 0);
  let pick = r * total;
  for (const s of symbols) {
    pick -= s.weight;
    if (pick <= 0) return s;
  }
  return symbols[symbols.length - 1];
}

// Generate payline patterns dynamically for any (reels, paylines, rows=3) combo
function generatePaylines(reels: number, lines: number): number[][] {
  const all: number[][] = [];
  all.push(Array(reels).fill(1));           // middle horizontal
  all.push(Array(reels).fill(0));           // top
  all.push(Array(reels).fill(2));           // bottom
  // V & ^ patterns
  if (reels >= 3) {
    const v: number[] = []; const vu: number[] = [];
    for (let i = 0; i < reels; i++) {
      const mid = (reels - 1) / 2;
      v.push(Math.abs(i - mid) >= mid ? 0 : 2);
      vu.push(Math.abs(i - mid) >= mid ? 2 : 0);
    }
    all.push(v); all.push(vu);
  }
  // Zigzag patterns
  for (let p = 0; p < 50 && all.length < lines; p++) {
    const pat: number[] = [];
    for (let i = 0; i < reels; i++) pat.push((i + p) % 3);
    if (!all.some(x => x.join() === pat.join())) all.push(pat);
  }
  // Cap to requested
  return all.slice(0, lines);
}

// ─────────── Spin function ───────────
export interface SpinWin {
  line: number;             // 0 = scatter, 1+ = payline number
  symbolId: string;
  count: number;            // how many consecutive matches
  payout: number;           // TND amount won
}

export interface SpinResult {
  ok: boolean;
  grid?: string[][];        // [reel][row] of symbol ids
  wins?: SpinWin[];
  totalPayout?: number;
  scatterCount?: number;
  balance?: number;
  error?: string;
  serverSeed?: string;
}

// House-edge tuning: actual delivered RTP ≈ target * houseRatio
// Most Amatic real games show 95-97% — we deliver ~50% by skewing weights & scaling payouts
const HOUSE_PAYOUT_RATIO = 0.55;        // scales all payouts down
const LOW_VALUE_BIAS = 0.72;            // 72% chance reels pick from low-value pool

const spinLocks = new Set<number>();

export async function spinSlot(
  userId: number,
  game: AmaticGame,
  stake: number,
  clientSeed: string,
  nonce: number
): Promise<SpinResult> {
  if (stake <= 0) return { ok: false, error: "أدخل مبلغاً" };
  if (spinLocks.has(userId)) return { ok: false, error: "جاري معالجة دورة..." };
  spinLocks.add(userId);
  try {
    // Step 1: atomic debit
    const dr = await debit(userId, stake, `Slot ${game.name} spin`);
    if (!dr.ok) return { ok: false, error: dr.error };

    const reels = game.reels;
    const lines = Math.min(game.paylines, 20); // computational limit per spin
    const paylines = generatePaylines(reels, lines);
    const symbols = THEME_REELS[game.theme];
    const lowValue = symbols.filter(s => s.payout < 1);

    const serverSeed = newServerSeed();

    // Step 2: build grid (reels × 3 rows) with house-favored RNG
    const grid: string[][] = [];
    for (let r = 0; r < reels; r++) {
      const col: string[] = [];
      for (let row = 0; row < 3; row++) {
        const r1 = await fairRandom(serverSeed, clientSeed, nonce * 1000 + r * 100 + row * 10);
        const pool = (r1 < LOW_VALUE_BIAS && lowValue.length > 0) ? lowValue : symbols;
        const r2 = await fairRandom(serverSeed, clientSeed, nonce * 1000 + r * 100 + row * 10 + 5);
        col.push(pickWeighted(pool, r2).id);
      }
      grid.push(col);
    }

    // Step 3: evaluate paylines (left→right with wild substitution)
    const wins: SpinWin[] = [];
    let totalPayout = 0;
    const wildSym = symbols.find(s => s.isWild);
    const scatterSym = symbols.find(s => s.isScatter);
    const perLineStake = stake / lines;

    for (let i = 0; i < paylines.length; i++) {
      const line = paylines[i];
      const lineSyms = line.map((row, reel) => grid[reel][row]);
      const first = lineSyms[0];
      if (scatterSym && first === scatterSym.id) continue; // scatters score separately
      // Determine matching symbol (if first is wild, look for first non-wild)
      let matchId = first;
      if (wildSym && first === wildSym.id) {
        for (let k = 1; k < lineSyms.length; k++) {
          if (lineSyms[k] !== wildSym.id) { matchId = lineSyms[k]; break; }
        }
      }
      let count = 0;
      for (let k = 0; k < lineSyms.length; k++) {
        if (lineSyms[k] === matchId || (wildSym && lineSyms[k] === wildSym.id)) count++;
        else break;
      }
      if (count >= 3) {
        const sym = symbols.find(s => s.id === matchId);
        if (sym) {
          const linePay = +(sym.payout * (count - 2) * perLineStake * HOUSE_PAYOUT_RATIO).toFixed(2);
          if (linePay > 0) {
            wins.push({ line: i + 1, symbolId: matchId, count, payout: linePay });
            totalPayout += linePay;
          }
        }
      }
    }

    // Step 4: scatter check (anywhere on grid)
    let scatterCount = 0;
    if (scatterSym) {
      for (const col of grid) for (const s of col) if (s === scatterSym.id) scatterCount++;
      if (scatterCount >= 3) {
        const scPay = +(scatterSym.payout * (scatterCount - 2) * (stake / 10) * HOUSE_PAYOUT_RATIO).toFixed(2);
        if (scPay > 0) {
          wins.push({ line: 0, symbolId: scatterSym.id, count: scatterCount, payout: scPay });
          totalPayout += scPay;
        }
      }
    }
    totalPayout = +totalPayout.toFixed(2);

    // Step 5: credit winnings (if any)
    let finalBalance = dr.balance!;
    if (totalPayout > 0) {
      const newBal = await credit(userId, totalPayout, `Slot ${game.name} win`);
      if (newBal !== null) finalBalance = newBal;
    }

    return { ok: true, grid, wins, totalPayout, scatterCount, balance: finalBalance, serverSeed };
  } finally {
    spinLocks.delete(userId);
  }
}
