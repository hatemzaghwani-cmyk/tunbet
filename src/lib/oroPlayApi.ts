// OroPlay Dashboard Proxy - Uses the agent dashboard to get game access
const ORO_DASHBOARD = "https://und7br.sxvwlkohlv.com";

interface OroSession {
  cookies: string;
  loggedIn: boolean;
}

let oroSession: OroSession = { cookies: "", loggedIn: false };

// Live Casino vendor game URLs (cached from dashboard)
const VENDOR_GAME_URLS: Record<string, string> = {};

export async function getOroGameUrl(vendorCode: string): Promise<string | null> {
  // Return cached URL if available
  if (VENDOR_GAME_URLS[vendorCode]) return VENDOR_GAME_URLS[vendorCode];
  return null; // Will be populated when backend proxy is ready
}

// For now, use direct vendor lobby URLs (from dashboard data)
export const VENDOR_LOBBIES: Record<string, { url: string; name: string }> = {
  "casino-pragmatic": { url: "https://m7rhjtz.thefanz.net", name: "Pragmatic Live" },
  "casino-ezugi": { url: "https://play.thefanz.net", name: "Ezugi" },
  "casino-sa": { url: "https://sa.thefanz.net", name: "Sa Gaming" },
  "casino-dream": { url: "https://dream.thefanz.net", name: "Dream Gaming" },
  "casino-micro": { url: "https://micro.thefanz.net", name: "Micro Gaming" },
  "casino-playace": { url: "https://pac.thefanz.net", name: "PlayAce" },
  "mini-spribe": { url: "https://spribe.thefanz.net", name: "Spribe" },
  "mini-aviator": { url: "https://aviator.thefanz.net", name: "Aviator" },
};

export const PROXY_STATUS = {
  ready: false,
  message: "Live Casino games require backend proxy (deploy tunbet-proxy to Render.com/Railway.app)",
  deployUrl: "https://github.com/hatemzaghwani-cmyk/tunbet-proxy",
};
