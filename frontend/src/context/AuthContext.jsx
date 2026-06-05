import { createContext, useContext, useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const meRes = await axiosClient.get("me/");
      setUser(meRes.data);

      const profileRes = await axiosClient.get("me/profile/");
      setProfile(profileRes.data);
    } catch (error) {
      console.error("Error fetching current user:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const tokenRes = await axiosClient.post("token/", {
        username,
        password,
      });

      localStorage.setItem("access_token", tokenRes.data.access);
      localStorage.setItem("refresh_token", tokenRes.data.refresh);

      const meRes = await axiosClient.get("me/");
      setUser(meRes.data);

      const profileRes = await axiosClient.get("me/profile/");
      setProfile(profileRes.data);

      return {
        success: true,
        role: meRes.data.role,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.response?.data?.detail || "Invalid credentials",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (accessToken && refreshToken) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  // ── Cross-tab auth sync ───────────────────────────────────────
  // localStorage is shared across all tabs of the same origin. If you log in
  // as a different role in another tab, that tab overwrites the token — which
  // would otherwise leave THIS tab showing a stale page making forbidden calls.
  // The `storage` event fires only in OTHER tabs, so we react to it here.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== "access_token") return;
      if (!e.newValue) {
        // Logged out in another tab → drop our session too.
        setUser(null);
        setProfile(null);
      } else if (e.newValue !== e.oldValue) {
        // A different account logged in elsewhere → re-sync identity so that
        // ProtectedRoute redirects this tab to the correct role home.
        fetchCurrentUser();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Role-mismatch 403 handler ─────────────────────────────────
  // axiosClient dispatches `auth:forbidden` for permission-denied 403s that are
  // NOT business-rule rejections (those carry a `reason`). When the token's role
  // no longer matches the current route, re-validate identity — ProtectedRoute
  // then redirects to the right place instead of silently showing stale data.
  useEffect(() => {
    const onForbidden = () => {
      if (localStorage.getItem("access_token")) fetchCurrentUser();
    };
    window.addEventListener("auth:forbidden", onForbidden);
    return () => window.removeEventListener("auth:forbidden", onForbidden);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);