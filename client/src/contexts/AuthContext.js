import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthChange, initAnonymousSession, signOut as authSignOut } from "../services/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsLoading(false);
      } else {
        // No Firebase user — try anonymous sign-in
        const anonUser = await initAnonymousSession();
        setUser(anonUser);
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    await authSignOut();
    // After sign out, Firebase onAuthStateChanged fires and will trigger anonymous sign-in
  };

  const value = {
    user,
    isAnonymous: user ? user.isAnonymous : true,
    isLoading,
    isAuthenticated: !!(user && !user.isAnonymous),
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
