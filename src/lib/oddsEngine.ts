/**
 * Mebet Smart Odds Engine
 * - Generates 20+ markets per match from base h2h odds
 * - Simulates realistic odds movement on each load
 * - Computes live scores for ongoing matches
 * - All client-side, zero API calls
 */

// Slight random variation to simulate live odds movement
const vary = (odds: number, range = 0.08): number => {
  const v = odds * (1 + (Math.random() - 0.5) * range);
  return Math.round(Math.max(1.01, v) * 100) / 100;
};

const margin = 1.05; // 5% bookmaker margin

export interface MatchMarkets {
  h2h: Record<string, number>;         // 1X2
  ou25: Record<string, number>;        // Over/Under 2.5
  ou15: Record<string, number>;        // Over/Under 1.5  
  ou35: Record<string, number>;        // Over/Under 3.5
  ou45: Record<string, number>;        // Over/Under 4.5
  dc: Record<string, number>;          // Double Chance
  btts: Record<string, number>;        // Both Teams Score
  hw: Record<string, number>;          // Handicap
  ht_h2h: Record<string, number>;      // Half-Time 1X2
  ht_ou: Record<string, number>;       // HT Over/Under 0.5
  cs: Record<string, number>;          // Correct Score (top 6)
  odd_even: Record<string, number>;    // Odd/Even goals
  first_goal: Record<string, number>;  // First team to score
  clean_sheet: Record<string, number>; // Clean sheet
  win_margin: Record<string, number>;  // Win by 1, 2, 3+
  ht_ft: Record<string, number>;       // HT/FT combo (top picks)
}

export function generateMarkets(
  home: string, away: string,
  baseH2H: Record<string, number>,
  baseTotals?: Record<string, number>
): MatchMarkets {
  const hOdds = vary(baseH2H[home] || 2.5);
  const dOdds = vary(baseH2H.Draw || 3.3);
  const aOdds = vary(baseH2H[away] || 2.5);

  // Implied probabilities
  const hP = 1 / hOdds, dP = 1 / dOdds, aP = 1 / aOdds;
  const tot = hP + dP + aP;
  const hp = hP / tot, dp = dP / tot, ap = aP / tot;

  // Over/Under base
  const goalRate = 0.35 + Math.min(hp, ap) * 0.4;
  const o25p = 0.42 + goalRate * 0.3;

  // H2H (with slight movement)
  const h2h: Record<string, number> = { [home]: hOdds };
  if (dOdds > 0 && dOdds < 50) h2h.Draw = dOdds;
  h2h[away] = aOdds;

  // Over/Under lines
  const ou25 = { "Over 2.5": vary(margin / o25p), "Under 2.5": vary(margin / (1 - o25p)) };
  const o15p = Math.min(0.92, o25p + 0.25);
  const ou15 = { "Over 1.5": vary(margin / o15p), "Under 1.5": vary(margin / (1 - o15p)) };
  const o35p = Math.max(0.15, o25p - 0.2);
  const ou35 = { "Over 3.5": vary(margin / o35p), "Under 3.5": vary(margin / (1 - o35p)) };
  const o45p = Math.max(0.08, o25p - 0.35);
  const ou45 = { "Over 4.5": vary(margin / o45p), "Under 4.5": vary(margin / (1 - o45p)) };

  // Double Chance
  const dc = {
    "1X": vary(margin / (hp + dp)),
    "12": vary(margin / (hp + ap)),
    "X2": vary(margin / (dp + ap)),
  };

  // BTTS
  const ggP = 0.3 + Math.min(hp, ap) / Math.max(hp, ap) * 0.25;
  const btts = { "Yes (GG)": vary(margin / ggP), "No (NG)": vary(margin / (1 - ggP)) };

  // Handicap -1
  const hwP = hp * 0.55;
  const hw = {
    [`${home} -1`]: vary(margin / hwP),
    ["Draw -1"]: vary(margin / (dp * 1.1)),
    [`${away} +1`]: vary(margin / (ap + dp * 0.5)),
  };

  // Half-Time 1X2
  const ht_h2h = {
    [home]: vary(hOdds * 1.4),
    Draw: vary(dOdds * 0.7),
    [away]: vary(aOdds * 1.4),
  };

  // HT Over/Under 0.5
  const ht_ou = { "Over 0.5": vary(1.45), "Under 0.5": vary(2.6) };

  // Correct Score (top picks)
  const cs: Record<string, number> = {
    "1-0": vary(6.5 / hp), "0-0": vary(8.0), "0-1": vary(6.5 / ap),
    "2-1": vary(8.5 / hp), "1-1": vary(5.8), "1-2": vary(8.5 / ap),
  };

  // Odd/Even
  const odd_even = { "Odd": vary(1.9), "Even": vary(1.9) };

  // First to Score
  const first_goal = {
    [home]: vary(margin / (hp * 1.3 + dp * 0.2)),
    [away]: vary(margin / (ap * 1.3 + dp * 0.2)),
    "No Goal": vary(margin / 0.08),
  };

  // Clean Sheet
  const clean_sheet = {
    [`${home} CS`]: vary(margin / (hp * 0.4 + dp * 0.3)),
    [`${away} CS`]: vary(margin / (ap * 0.4 + dp * 0.3)),
  };

  // Win Margin
  const win_margin = {
    [`${home} by 1`]: vary(margin / (hp * 0.4)),
    [`${home} by 2+`]: vary(margin / (hp * 0.25)),
    "Draw": dOdds,
    [`${away} by 1`]: vary(margin / (ap * 0.4)),
    [`${away} by 2+`]: vary(margin / (ap * 0.25)),
  };

  // HT/FT
  const ht_ft = {
    "1/1": vary(margin / (hp * hp * 1.2)),
    "X/1": vary(margin / (dp * hp * 0.6)),
    "2/2": vary(margin / (ap * ap * 1.2)),
    "X/2": vary(margin / (dp * ap * 0.6)),
    "X/X": vary(margin / (dp * dp * 0.8)),
    "1/X": vary(margin / (hp * dp * 0.3)),
  };

  return { h2h, ou25, ou15, ou35, ou45, dc, btts, hw, ht_h2h, ht_ou, cs, odd_even, first_goal, clean_sheet, win_margin, ht_ft };
}

// Generate live score for a match based on commence time
export function getLiveScore(commenceTime: string): { home: number; away: number; minute: number } | null {
  const start = new Date(commenceTime).getTime();
  const now = Date.now();
  const elapsed = (now - start) / 60000; // minutes
  
  if (elapsed < 0 || elapsed > 105) return null; // not live or finished
  
  const minute = Math.min(90, Math.floor(elapsed));
  
  // Generate consistent score based on match ID (seeded random)
  const seed = start % 10000;
  const goalChance = minute / 30; // more goals as match progresses
  const home = Math.floor((Math.sin(seed) + 1) * goalChance * 0.7);
  const away = Math.floor((Math.cos(seed) + 1) * goalChance * 0.5);
  
  return { home: Math.min(home, 5), away: Math.min(away, 4), minute };
}

export const MARKET_LABELS: Record<string, string> = {
  h2h: "Winner (1X2)",
  ou25: "Over/Under 2.5",
  ou15: "Over/Under 1.5",
  ou35: "Over/Under 3.5",
  ou45: "Over/Under 4.5",
  dc: "Double Chance",
  btts: "Both Teams Score",
  hw: "Asian Handicap -1",
  ht_h2h: "Half-Time Result",
  ht_ou: "Half-Time Over/Under 0.5",
  cs: "Correct Score",
  odd_even: "Odd/Even Total Goals",
  first_goal: "First Team to Score",
  clean_sheet: "Clean Sheet",
  win_margin: "Winning Margin",
  ht_ft: "Half-Time / Full-Time",
};
