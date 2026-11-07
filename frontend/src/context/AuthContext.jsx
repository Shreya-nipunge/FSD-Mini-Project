import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, loginAccount, registerAccount } from "../services/api.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "token";

function parseSession(response) {
  const token = response?.data?.token || response?.access_token;
  const user = response?.data?.user || response?.user;
  if (!token || !user?.id || !user?.role) throw new Error("The server returned an incomplete session.");
  return { token, user };
}

function saveSession(response) {
  const { token, user } = parseSession(response);
  window.localStorage.setItem(TOKEN_KEY, token);
  return { token, user };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    // Discard role/name keys written by the former UI. The server is authoritative.
    window.localStorage.removeItem("role");
    window.localStorage.removeItem("userName");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
      setLoading(false);
      window.localStorage.removeItem("role");
      window.localStorage.removeItem("userName");
    };
    window.addEventListener("crimemap:unauthorized", onUnauthorized);
    return () => window.removeEventListener("crimemap:unauthorized", onUnauthorized);
  }, []);

  useEffect(() => {
    let active = true;
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    setToken(storedToken);
    if (!storedToken) {
      setUser(null);
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    getCurrentUser()
      .then((response) => {
        if (active) setUser(response?.data?.user || response?.user || null);
      })
      .catch(() => {
        if (active) clearSession();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [clearSession]);

  const login = useCallback(async (email, password, expectedRole) => {
    const response = await loginAccount(email, password);
    const session = parseSession(response);
    if (expectedRole && session.user.role !== expectedRole) {
      throw new Error(expectedRole === "admin" ? "This account does not have administrator access." : "Use the administrator sign-in page for this account.");
    }
    window.localStorage.setItem(TOKEN_KEY, session.token);
    setToken(session.token);
    setUser(session.user);
    return session.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const session = saveSession(await registerAccount(name, email, password));
    setToken(session.token);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(() => clearSession(), [clearSession]);
  const value = useMemo(() => ({ user, token, loading, isAuthenticated: Boolean(user && token), login, register, logout }), [user, token, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
