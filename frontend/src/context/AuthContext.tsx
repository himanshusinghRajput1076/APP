import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api, TOKEN_KEY, User } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

type AuthCtx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  signUp: (data: { email: string; password: string; name: string; role: User["role"]; referral_code?: string }) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await storage.secureGet<string>(TOKEN_KEY, "");
      if (t) {
        try {
          setToken(t);
          const r = await api.get("/auth/me");
          setUser(r.data.user);
        } catch {
          await storage.secureRemove(TOKEN_KEY);
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const persist = async (t: string, u: User) => {
    await storage.secureSet(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  };

  const signUp: AuthCtx["signUp"] = async (data) => {
    const r = await api.post("/auth/signup", data);
    await persist(r.data.access_token, r.data.user);
    return r.data.user;
  };

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    await persist(r.data.access_token, r.data.user);
    return r.data.user;
  };

  const signOut = async () => {
    await storage.secureRemove(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const refresh = useCallback(async () => {
    try {
      const r = await api.get("/auth/me");
      setUser(r.data.user);
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, signUp, signIn, signOut, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
