import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

interface User {
  id: string;
  username: string;
  role: string;
  canCreateWorkOrder?: boolean;
  canCloseWorkOrder?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const LOGIN_PATH = "/login";

const readStoredToken = () => localStorage.getItem("token");

const readStoredUser = (): User | null => {
  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? (JSON.parse(storedUser) as User) : null;
  } catch (error) {
    console.error("Failed to parse user from localStorage", error);
    return null;
  }
};

const applyAxiosToken = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectingForUnauthorizedRef = useRef(false);
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const loading = false;

  useEffect(() => {
    applyAxiosToken(token);
  }, [token]);

  useEffect(() => {
    const syncSessionFromStorage = () => {
      setToken(readStoredToken());
      setUser(readStoredUser());
      redirectingForUnauthorizedRef.current = false;
    };

    window.addEventListener("storage", syncSessionFromStorage);
    return () => window.removeEventListener("storage", syncSessionFromStorage);
  }, []);

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const currentToken = readStoredToken();
        if (currentToken) {
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        const requestUrl = String(error?.config?.url ?? "");
        const isLoginRequest = requestUrl.includes("/api/auth/login");

        if (status === 401 && !isLoginRequest && !redirectingForUnauthorizedRef.current) {
          redirectingForUnauthorizedRef.current = true;
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
          applyAxiosToken(null);

          if (location.pathname !== LOGIN_PATH) {
            const from = `${location.pathname}${location.search}`;
            navigate(LOGIN_PATH, { replace: true, state: { from } });
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [location.pathname, location.search, navigate]);

  const login = (newToken: string, newUser: User) => {
    redirectingForUnauthorizedRef.current = false;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    applyAxiosToken(newToken);
  };

  const logout = () => {
    redirectingForUnauthorizedRef.current = false;
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    applyAxiosToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
