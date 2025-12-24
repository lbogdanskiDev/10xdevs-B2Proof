"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth.actions";
import type { UserProfileDto } from "@/types";
import type { AuthContextValue } from "@/lib/types/navigation.types";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser: UserProfileDto | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfileDto | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await logoutAction();
      if (result.success && result.redirectTo) {
        setUser(null);
        router.push(result.redirectTo);
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return <AuthContext.Provider value={{ user, isLoading, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
