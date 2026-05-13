import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SESSION_KEY = 'auth_session_token';
const USER_KEY = 'auth_user';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean | null; // null = loading
  sessionToken: string | null;
  handleAuthCallback: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: null,
  sessionToken: null,
  handleAuthCallback: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkStoredSession();
  }, []);

  const checkStoredSession = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(SESSION_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        // Verify with backend
        const res = await fetch(`${BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setSessionToken(storedToken);
          setIsAuthenticated(true);
          return;
        }
      }
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
  };

  const handleAuthCallback = async (sessionId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error('Auth failed');
      const data = await res.json();
      await AsyncStorage.setItem(SESSION_KEY, data.session_token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setSessionToken(data.session_token);
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (e) {
      setIsAuthenticated(false);
      throw e;
    }
  };

  const logout = async () => {
    if (sessionToken) {
      try {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
      } catch {}
    }
    await AsyncStorage.removeItem(SESSION_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
    setSessionToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, sessionToken, handleAuthCallback, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
