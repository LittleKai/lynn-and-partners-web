"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import axiosInstance from "@/utils/axiosInstance";
import { getSessionClient } from "@/utils/auth";

interface User {
  id: string;
  name?: string;
  username: string;
  role: "superadmin" | "admin" | "user";
}

interface AuthContextType {
  isLoggedIn: boolean;
  isInitializing: boolean;
  user: User | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (localStorage.getItem("isAuth") === null) {
      localStorage.setItem("isAuth", "false");
    }
    if (localStorage.getItem("isLoggedIn") === null) {
      localStorage.setItem("isLoggedIn", "false");
    }
    if (localStorage.getItem("token") === null) {
      localStorage.setItem("token", "");
    }
    if (localStorage.getItem("getSession") === null) {
      localStorage.setItem("getSession", "");
    }
    if (localStorage.getItem("theme") === null) {
      localStorage.setItem("theme", "light");
    }

    const checkSession = async () => {
      const sessionId = Cookies.get("session_id");
      if (process.env.NODE_ENV === "development") {
        console.log("Session ID from cookies:", sessionId);
      }
      if (sessionId) {
        const session = await getSessionClient();
        if (process.env.NODE_ENV === "development") {
          console.log("Session from getSessionClient:", session);
        }
        if (session) {
          setIsLoggedIn(true);
          setUser({
            id: session.id,
            name: session.name,
            username: session.username,
            role: session.role as "superadmin" | "admin" | "user",
          });
          localStorage.setItem("isAuth", "true");
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("token", sessionId);
          localStorage.setItem("getSession", JSON.stringify(session));
        } else {
          clearAuthData();
        }
      } else {
        clearAuthData();
      }
      setIsInitializing(false);
    };

    checkSession();
  }, []);

  const login = async (username: string, password: string, rememberMe?: boolean) => {
    try {
      const response = await axiosInstance.post("/auth/login", {
        username,
        password,
        rememberMe: !!rememberMe,
      });

      const result = response.data;
      setIsLoggedIn(true);
      setUser({
        id: result.userId,
        name: result.userName,
        username: result.userUsername,
        role: result.userRole as "superadmin" | "admin" | "user",
      });
      Cookies.set("session_id", result.sessionId);
      localStorage.setItem("isAuth", "true");
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("token", result.sessionId);
      localStorage.setItem("getSession", JSON.stringify(result));
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
      clearAuthData();
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  };

  const clearAuthData = () => {
    setIsLoggedIn(false);
    setUser(null);
    Cookies.remove("session_id");
    localStorage.setItem("isAuth", "false");
    localStorage.setItem("isLoggedIn", "false");
    localStorage.setItem("token", "");
    localStorage.setItem("getSession", "");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isInitializing, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
