import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AUTH_USER_STORAGE_KEY = "authUser";

type AuthUser = {
  name: string;
  mobileNumber: string;
  deviceId: string;
  serialNumber: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  initializing: boolean;
  refreshFromStorage: () => Promise<void>;
  signInLocal: (input: AuthUser) => Promise<void>;
  signOutLocal: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const refreshFromStorage = useCallback(async () => {
    const raw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) {
      setUser(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<AuthUser>;
      const next: AuthUser | null =
        typeof parsed?.name === "string" &&
        typeof parsed?.mobileNumber === "string" &&
        typeof parsed?.deviceId === "string" &&
        typeof parsed?.serialNumber === "string"
          ? {
              name: parsed.name,
              mobileNumber: parsed.mobileNumber,
              deviceId: parsed.deviceId,
              serialNumber: parsed.serialNumber,
            }
          : null;
      setUser(next);
    } catch {
      setUser(null);
    }
  }, []);

  const signInLocal = useCallback(async (input: AuthUser) => {
    await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(input));
    setUser(input);
  }, []);

  const signOutLocal = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshFromStorage();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshFromStorage]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      refreshFromStorage,
      signInLocal,
      signOutLocal,
    }),
    [user, initializing, refreshFromStorage, signInLocal, signOutLocal],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
