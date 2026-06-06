// OroPlay Client - Auto-detects API availability
// When OroPlay activates IP whitelist, games switch to real money automatically

const ORO_API = "https://api.pgf-asu2nd.com/api/v2";
const CLIENT_ID = "Hatem1_TND";
const CLIENT_SECRET = "JdYysA2TS7K3xzIYJoOlRn2z9i9XWk57";

let cachedToken: string | null = null;
let tokenExpiry = 0;
let _apiAvailable: boolean | null = null;

// Test if OroPlay API is accessible (checks once per session)
export async function isOroAvailable(): Promise<boolean> {
  if (_apiAvailable !== null) return _apiAvailable;
  try {
    const resp = await fetch(`${ORO_API}/auth/createtoken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await resp.json();
    _apiAvailable = !!data.token;
    if (_apiAvailable) {
      cachedToken = data.token;
      tokenExpiry = data.expiration || (Date.now() / 1000 + 3600);
      console.log("🎰 OroPlay API ACTIVE! Real money mode enabled.");
    }
    return _apiAvailable;
  } catch {
    _apiAvailable = false;
    return false;
  }
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() / 1000 < tokenExpiry - 60) return cachedToken;
  const resp = await fetch(`${ORO_API}/auth/createtoken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
  });
  const data = await resp.json();
  if (!data.token) throw new Error("No token");
  cachedToken = data.token;
  tokenExpiry = data.expiration || (Date.now() / 1000 + 3600);
  return cachedToken!;
}

async function oroApi(method: string, path: string, body?: any) {
  const token = await getToken();
  const resp = await fetch(`${ORO_API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return resp.json();
}

export async function oroCreateUser(userCode: string) {
  try { return await oroApi("POST", "/user/create", { userCode }); } catch { return { success: false }; }
}

export async function oroDeposit(userCode: string, amount: number) {
  return oroApi("POST", "/user/deposit", { userCode, balance: amount, orderNo: `tb_${Date.now()}` });
}

export async function oroWithdrawAll(userCode: string) {
  return oroApi("POST", "/user/withdraw-all", { userCode });
}

export async function oroLaunchGame(userCode: string, vendorCode: string, gameCode: string, language = "en") {
  await oroCreateUser(userCode);
  const result = await oroApi("POST", "/game/launch-url", {
    vendorCode, gameCode, userCode, language,
    lobbyUrl: window.location.origin,
  });
  if (result.success && result.message) return { url: result.message };
  throw new Error(result.message || "Launch failed");
}
