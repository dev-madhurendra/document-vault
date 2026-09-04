import { createContext, useContext, useState, useCallback } from "react";
import * as api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("docvault_user");
    return stored ? JSON.parse(stored) : null;
  });

  const persist = (token, user) => {
    localStorage.setItem("docvault_token", token);
    localStorage.setItem("docvault_user", JSON.stringify(user));
    setUser(user);
  };

  const signup = useCallback(async (name, email, password) => {
    const data = await api.signup(name, email, password);
    persist(data.token, data.user);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    persist(data.token, data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("docvault_token");
    localStorage.removeItem("docvault_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
