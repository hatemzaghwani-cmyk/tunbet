import { getSportsbookApiBase } from "@/lib/oddsApi";

export interface SlotopolSpinResult {
  success?: boolean;
  error?: string;
  alias?: string;
  stake?: number;
  win?: number;
  balance?: number;
  reels?: string[][];
  wins?: Array<{ line: string; symbol: string; count: number; mult: number; amount: number }>;
  spinId?: string;
}

export async function apiSlotopolSpin(userId: number, alias: string, stake: number): Promise<SlotopolSpinResult> {
  try {
    const r = await fetch(`${getSportsbookApiBase()}/api/slotopol/spin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, alias, stake }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { success: false, error: data?.error || `Slotopol spin failed (${r.status})` };
    return data;
  } catch {
    return { success: false, error: "Slotopol API is offline" };
  }
}
