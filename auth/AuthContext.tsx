import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getLatestLocalUser, insertLocalUser, type LocalUserRow } from "@/sqlite/authDb";

type AuthUser = {
  name: string;
  mobileNumber: string;
  deviceId: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  initializing: boolean;
  refreshFromDb: () => Promise<void>;
  signInLocal: (input: AuthUser) => Promise<void>;
  signOutLocal: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function rowToAuthUser(row: LocalUserRow): AuthUser {
  return {
    name: row.name,
    mobileNumber: row.mobileNumber,
    deviceId: row.deviceId,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const refreshFromDb = useCallback(async () => {
    const latest = await getLatestLocalUser();
    setUser(latest ? rowToAuthUser(latest) : null);
  }, []);

  const signInLocal = useCallback(async (input: AuthUser) => {
    const row = await insertLocalUser(input);
    setUser(rowToAuthUser(row));
  }, []);

  const signOutLocal = useCallback(async () => {
    // If you want a "logout", we simply clear in-memory user.
    // (We can also delete DB rows, but keeping history can be useful.)
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshFromDb();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshFromDb]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      refreshFromDb,
      signInLocal,
      signOutLocal,
    }),
    [user, initializing, refreshFromDb, signInLocal, signOutLocal],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

