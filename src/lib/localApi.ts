/**
 * Redirect all imports to Supabase API
 * This file re-exports everything from supabaseApi
 * so we don't need to change imports in other files.
 */
export {
  verifyToken,
  apiRegister,
  apiLogin,
  apiAdminLogin,
  apiMe,
  apiBalance,
  apiAdminStats,
  apiAdminUsers,
  apiAdminCreateUser,
  apiAdminDeleteUser,
  apiAdminUserBalance,
  apiAdminTransactions,
  apiAdminAgents,
  apiAdminAgentCredit,
  apiAdminBets,
  apiAdminSettleBet,
  apiAgentMe,
  apiAgentPlayers,
  apiAgentCreatePlayer,
  apiAgentDeletePlayer,
  apiAgentPlayerBalance,
  apiAgentChangePassword,
  apiAgentTransactions,
  apiSportsEvents,
  apiSportsBetAsync as apiSportsBet,
  apiGames,
  apiGameProviders,
  apiLaunchGame,
  apiSyncBalance,
  apiMyTransactions,
  setAesToken,
  getAesToken,
} from "./supabaseApi";

export type { TokenPayload } from "./supabaseApi";
