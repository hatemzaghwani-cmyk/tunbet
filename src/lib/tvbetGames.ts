// TVBet Live TV Games — embedded via official iframe (tvbetframe.com)
// Each game is launched via TvbetFrame loader with game_id
// Wallet is mediated by our Escrow system (Supabase TND balance)

export interface TvbetGame {
  id: number;       // TVBet game_id
  code: string;     // slug for our system
  name: string;
  desc: string;
  thumb: string;
  category: "card" | "lottery" | "wheel" | "dice";
  rtp: number;
  minBet: number;
  maxBet: number;
}

export const TVBET_GAMES: TvbetGame[] = [
  { id: 8, code: "poker", name: "Live Poker", desc: "Texas Hold'em live broadcast",
    thumb: "https://tvbet.tv/wp-content/uploads/2020/12/poker.jpg",
    category: "card", rtp: 96.5, minBet: 1, maxBet: 500 },

  { id: 19, code: "blackjack", name: "Live Blackjack", desc: "Classic 21 with live dealer",
    thumb: "https://tvbet.tv/wp-content/uploads/2020/12/blackjack.jpg",
    category: "card", rtp: 99.0, minBet: 1, maxBet: 500 },

  { id: 21, code: "warofelements", name: "War of Elements", desc: "5-card war between elements",
    thumb: "https://tvbet.tv/wp-content/uploads/2020/12/war.jpg",
    category: "card", rtp: 97.2, minBet: 1, maxBet: 300 },

  { id: 17, code: "wheelbet", name: "Wheel Bet", desc: "Spinning wheel of fortune",
    thumb: "https://tvbet.tv/wp-content/uploads/2020/12/wheel.jpg",
    category: "wheel", rtp: 95.5, minBet: 1, maxBet: 500 },

  { id: 13, code: "1bet", name: "1Bet", desc: "Single number prediction",
    thumb: "https://tvbet.tv/wp-content/uploads/2020/12/1bet.jpg",
    category: "lottery", rtp: 95.0, minBet: 1, maxBet: 300 },

  { id: 12, code: "5bet", name: "5Bet", desc: "5-number lottery draw",
    thumb: "https://tvbet.tv/wp-content/uploads/2020/12/5bet.jpg",
    category: "lottery", rtp: 95.0, minBet: 1, maxBet: 300 },

  { id: 7, code: "7bet", name: "7Bet", desc: "7-number lottery draw",
    thumb: "https://tvbet.tv/wp-content/uploads/2020/12/7bet.jpg",
    category: "lottery", rtp: 95.0, minBet: 1, maxBet: 300 },

  { id: 16, code: "lucky6", name: "Lucky 6", desc: "Pick 6 winning numbers from 48",
    thumb: "https://tvbet.tv/wp-content/uploads/2020/12/lucky6.jpg",
    category: "lottery", rtp: 96.0, minBet: 1, maxBet: 500 },

  { id: 5, code: "keno", name: "Keno",  desc: "Classic Keno lottery",
    thumb: "https://tvbet.tv/wp-content/uploads/2020/12/keno.jpg",
    category: "lottery", rtp: 95.0, minBet: 1, maxBet: 500 },
];

// Build the TVBet iframe URL (using their public infrastructure)
export function buildTvbetUrl(gameId: number, language = "en"): string {
  const base = "https://tvbetframe.com/";
  const params = new URLSearchParams({
    clientId: "9999",
    lng: language,
    singleGame: "1",
    game_id: String(gameId),
    checkAccess: "false",
  });
  return `${base}?${params.toString()}#/game_id/${gameId}`;
}
