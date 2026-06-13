import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
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

  // ── Race-condition guard ──────────────────────────────────────────
  // Every balance read/write gets a monotonically-increasing sequence
  // number. We ONLY apply a balance update if it carries the highest
  // seq we've seen. This prevents an old refreshBalance() response from
  // overwriting a freshly-credited balance after a win.
  const seqRef = useRef(0);
  const latestAppliedRef = useRef(0);
  const hasRunInitialReclaim = useRef(false);

  const applyBalance = useCallback((newBalance: string | number, mySeq: number) => {
    if (mySeq < latestAppliedRef.current) return;     // stale read — discard
    latestAppliedRef.current = mySeq;
    setUser(prev => prev ? { ...prev, balance: String(newBalance) } : null);
  }, []);

  const fetchMe = useCallback(async (t: string) => {
    try {
      const data = await apiMe(t);
      setUser(data as User);
      latestAppliedRef.current = ++seqRef.current;     // anchor the seq to login balance
      // Safety net: reclaim any balance stranded in the AES wallet.
      // Run AT MOST ONCE per page load (not on every fetchMe) so we don't race
      // with launch/close flows. The launch flow already does its own reclaim.
      if (!hasRunInitialReclaim.current) {
        hasRunInitialReclaim.current = true;
        const mySeq = ++seqRef.current;
        // 2s delay lets any in-flight launch/close finish first.
        setTimeout(() => {
          apiSyncBalance(t)
            .then(() => apiBalance(t))
            .then(b => applyBalance((b as { balance: string }).balance, mySeq))
            .catch(() => {});
        }, 2000);
      }
    } catch {
      setToken(null);
      setUser(null);
      localStorage.removeItem("casino_token");
    }
  }, [applyBalance]);

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
    latestAppliedRef.current = ++seqRef.current;
  };

  const register = async (username: string, password: string, email?: string) => {
    const data = await apiRegister(username, password, email);
    localStorage.setItem("casino_token", data.token);
    setToken(data.token);
    setUser(data.user as User);
    latestAppliedRef.current = ++seqRef.current;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("casino_token");
    latestAppliedRef.current = 0;
    seqRef.current = 0;
  };

  const refreshBalance = useCallback(async () => {
    if (!token) return;
    const mySeq = ++seqRef.current;
    try {
      const data = await apiBalance(token);
      applyBalance((data as { balance: string }).balance, mySeq);
    } catch {}
  }, [token, applyBalance]);

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
