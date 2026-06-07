/**
 * Escrow Wallet for 3rd-party iframe games (TVBet, etc)
 *
 * Flow:
 *  1. User opens game → enters session amount (TND)
 *  2. We DEDUCT amount from Supabase balance, create escrow record
 *  3. User plays inside iframe (provider's internal wallet)
 *  4. When user closes game → we ASK net result (P/L)
 *  5. We REFUND remaining + winnings to Supabase balance
 *
 * Transactions are atomic via update_balance RPC.
 */

const SU = "https://cjzjrnagpsdmolvbkhnu.supabase.co";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqempybmFncHNkbW9sdmJraG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0ODY4NCwiZXhwIjoyMDk1OTI0Njg0fQ.TmowEatc4g2xpD-GT0r-jofX1zCtXjTD-s4LF7JSs6o";
const H = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

export interface EscrowSession {
  userId: number;
  gameName: string;
  vendor: string;
  amount: number;
  openedAt: number;
}

const STORAGE_KEY = "tb_escrow";

export async function openEscrow(userId: number, amount: number, gameName: string, vendor: string): Promise<{ ok: boolean; error?: string; balance?: number }> {
  if (!amount || amount <= 0) return { ok: false, error: "أدخل مبلغاً صالحاً" };
  if (amount < 1) return { ok: false, error: "الحد الأدنى 1 TND" };
  if (amount > 1000) return { ok: false, error: "الحد الأقصى 1000 TND للجلسة" };

  // Get current balance
  const ur = await fetch(`${SU}/rest/v1/users?id=eq.${userId}&select=balance`, { headers: H });
  const users = await ur.json();
  if (!Array.isArray(users) || !users.length) return { ok: false, error: "المستخدم غير موجود" };
  const bal = parseFloat(users[0].balance || 0);
  if (bal < amount) return { ok: false, error: `رصيدك ${bal.toFixed(2)} TND غير كافٍ` };

  // Deduct atomically
  const wr = await fetch(`${SU}/rest/v1/rpc/update_balance`, {
    method: "POST", headers: H,
    body: JSON.stringify({ p_user_id: userId, p_action: "withdraw", p_amount: amount }),
  });
  if (!wr.ok) return { ok: false, error: "فشل خصم المبلغ" };
  const newBal = await wr.json();

  // Log transaction
  await fetch(`${SU}/rest/v1/transactions`, {
    method: "POST", headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId, type: "bet", amount: -amount,
      balance_before: bal, balance_after: bal - amount,
      description: `${vendor} session opened: ${gameName} (${amount} TND)`,
    }),
  });

  // Save active escrow session
  const session: EscrowSession = { userId, gameName, vendor, amount, openedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return { ok: true, balance: parseFloat(newBal) || (bal - amount) };
}

export function getActiveEscrow(): EscrowSession | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

/**
 * Close escrow session.
 * @param userId
 * @param finalAmount - The final cashout amount user reports they have left in TVBet wallet
 *                     If finalAmount > original deposit, they won
 *                     If finalAmount < original deposit, they lost the difference
 *                     If finalAmount === 0, they lost everything
 */
export async function closeEscrow(userId: number, finalAmount: number): Promise<{ ok: boolean; error?: string; balance?: number; pnl?: number }> {
  const session = getActiveEscrow();
  if (!session || session.userId !== userId) return { ok: false, error: "لا توجد جلسة نشطة" };
  if (finalAmount < 0) return { ok: false, error: "المبلغ غير صالح" };
  if (finalAmount > session.amount * 1000) return { ok: false, error: "المبلغ مبالغ فيه" };

  // Get current balance
  const ur = await fetch(`${SU}/rest/v1/users?id=eq.${userId}&select=balance`, { headers: H });
  const users = await ur.json();
  if (!Array.isArray(users) || !users.length) return { ok: false, error: "المستخدم غير موجود" };
  const bal = parseFloat(users[0].balance || 0);

  // Refund finalAmount to balance (this is what user has left from the session)
  if (finalAmount > 0) {
    const wr = await fetch(`${SU}/rest/v1/rpc/update_balance`, {
      method: "POST", headers: H,
      body: JSON.stringify({ p_user_id: userId, p_action: "add", p_amount: finalAmount }),
    });
    if (!wr.ok) return { ok: false, error: "فشل إعادة الرصيد" };
  }

  const pnl = finalAmount - session.amount;
  await fetch(`${SU}/rest/v1/transactions`, {
    method: "POST", headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      type: pnl >= 0 ? "win" : "loss",
      amount: finalAmount,
      balance_before: bal,
      balance_after: bal + finalAmount,
      description: `${session.vendor} session closed: ${session.gameName} | Net: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} TND`,
    }),
  });

  localStorage.removeItem(STORAGE_KEY);
  return { ok: true, balance: bal + finalAmount, pnl };
}

export function clearEscrow() {
  localStorage.removeItem(STORAGE_KEY);
}
