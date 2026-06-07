/**
 * Free Public Demo URLs for Casino Games
 *
 * All providers below offer PUBLIC, FREE, no-API-key demo iframes
 * with NO X-Frame-Options blocking — fully embeddable.
 *
 * Wallet: We DON'T use provider's wallet. Instead, we manage TND
 * balance entirely in Supabase via Escrow Session pattern:
 *  - User picks game → sets session amount (TND)
 *  - We deduct from Supabase atomically
 *  - User plays demo internally
 *  - User clicks "Cash Out" → enters final amount → we credit back
 *
 * Admin can add/withdraw TND balance from /admin panel.
 */

export type ProviderId = 1 | 7 | 15 | 16 | 20 | 'pragmatic' | 'habanero' | 'spribe' | 'hacksaw' | 'bgaming';

export interface DemoMapping {
  providerId: number;
  providerName: string;
  // Function that takes game_code/symbol and returns launchable iframe URL
  buildUrl: (gameCode: string, lang?: string) => string;
  // Function that takes game_code and returns thumbnail URL
  buildThumb?: (gameCode: string) => string;
  // CSS color (theme)
  color: string;
  // Whether this provider's demos work
  enabled: boolean;
}

export const DEMO_MAPPINGS: Record<number, DemoMapping> = {
  // Pragmatic Play — 603 games via official demo CDN
  1: {
    providerId: 1,
    providerName: "Pragmatic Play",
    buildUrl: (code, lang = "en") =>
      `https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol=${code}&websiteUrl=https%3A%2F%2Fdemogamesfree.pragmaticplay.net&jurisdiction=99&lobbyUrl=https%3A%2F%2Fmebet.surge.sh&lang=${lang}`,
    buildThumb: (code) => `https://common-static.ppgames.net/game_pic/rec/325/${code}.png`,
    color: "#FF6B35",
    enabled: true,
  },

  // Spribe — Aviator, Mines, Dice, Plinko, Hilo, Goal, Hotline, Mini-Roulette
  15: {
    providerId: 15,
    providerName: "Spribe",
    buildUrl: (code, lang = "en") =>
      `https://aviator-next.spribegaming.com/?game=${code}&lang=${lang}&user=demo&currency=TND&operator=mebet`,
    color: "#E11D48",
    enabled: true,
  },
};

// Known free Spribe games (lobby fallback if AES has only "aviator")
export const SPRIBE_GAMES = [
  { code: "aviator", name: "Aviator", icon: "✈️" },
  { code: "mines", name: "Mines", icon: "💣" },
  { code: "dice", name: "Dice", icon: "🎲" },
  { code: "plinko", name: "Plinko", icon: "🟢" },
  { code: "hilo", name: "Hi-Lo", icon: "📊" },
  { code: "goal", name: "Goal", icon: "⚽" },
  { code: "hotline", name: "Hotline", icon: "📞" },
  { code: "mini-roulette", name: "Mini Roulette", icon: "🎡" },
];

/**
 * Get demo URL for a game given provider_id + game_code.
 * Returns null if provider doesn't have free demos.
 */
export function getDemoUrl(providerId: number, gameCode: string, lang = "en"): string | null {
  const mapping = DEMO_MAPPINGS[providerId];
  if (!mapping || !mapping.enabled) return null;
  return mapping.buildUrl(gameCode, lang);
}

/**
 * Get thumbnail URL for a game (Pragmatic always works for all PP games)
 */
export function getDemoThumb(providerId: number, gameCode: string): string | null {
  const mapping = DEMO_MAPPINGS[providerId];
  if (!mapping || !mapping.buildThumb) return null;
  return mapping.buildThumb(gameCode);
}

/**
 * Check if a provider has free public demos available.
 * Currently: Pragmatic Play (1) and Spribe (15).
 * Others will fall back to AES API (which requires real money in AES wallet).
 */
export function hasFreeDemo(providerId: number): boolean {
  return !!DEMO_MAPPINGS[providerId]?.enabled;
}
