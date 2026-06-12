import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiLogin, apiRegister, apiMe, apiBalance, apiSyncBalance } from "@/lib/localApi";

interface User {
  id: number;
  username: string;
  role: string;
  balance: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => void;
  refreshBalance: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("casino_token"));
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async (t: string) => {
    try {
      const data = await apiMe(t);
      setUser(data as User);
      // Safety net: reclaim any balance that may have been left stranded in the AES wallet
      // (e.g. browser closed mid-game / failed close). Idempotent — never double-credits.
      apiSyncBalance(t)
        .then(() => apiBalance(t))
        .then(b => setUser(prev => prev ? { ...prev, balance: (b as any).balance } : prev))
        .catch(() => {});
    } catch {
      setToken(null);
      setUser(null);
      localStorage.removeItem("casino_token");
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchMe(token).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token, fetchMe]);

  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    localStorage.setItem("casino_token", data.token);
    setToken(data.token);
    setUser(data.user as User);
  };

  const register = async (username: string, password: string, email?: string) => {
    const data = await apiRegister(username, password, email);
    localStorage.setItem("casino_token", data.token);
    setToken(data.token);
    setUser(data.user as User);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("casino_token");
  };

  const refreshBalance = async () => {
    if (!token) return;
    try {
      const data = await apiBalance(token);
      setUser(prev => prev ? { ...prev, balance: data.balance } : null);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, refreshBalance, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
