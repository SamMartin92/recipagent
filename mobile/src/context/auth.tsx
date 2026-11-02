import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { login } from "@/api/server";

// Who is logged in. The token is saved on the phone (encrypted by the OS),
// so you stay logged in after closing the app.

type AuthValue = {
  token: string | null;
  username: string | null;
  loading: boolean; // true while reading the saved token at startup
  signIn: (username: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On startup: load a saved login, if there is one.
  useEffect(() => {
    (async () => {
      setToken(await SecureStore.getItemAsync("token"));
      setUsername(await SecureStore.getItemAsync("username"));
      setLoading(false);
    })();
  }, []);

  async function signIn(name: string) {
    const result = await login(name);
    await SecureStore.setItemAsync("token", result.token);
    await SecureStore.setItemAsync("username", result.username);
    setToken(result.token);
    setUsername(result.username);
  }

  async function signOut() {
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("username");
    setToken(null);
    setUsername(null);
  }

  return (
    <AuthContext.Provider value={{ token, username, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Use in any screen: const { username, signOut } = useAuth();
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}