import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (tokens: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Check URL parameters for tokens on mount
    const params = new URLSearchParams(window.location.search);
    const token = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresAt = params.get('expires_at');

    if (token && refreshToken && expiresAt) {
      login({ access_token: token, refresh_token: refreshToken, expires_at: expiresAt });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check localStorage for existing tokens
      const storedTokens = localStorage.getItem('stravaTokens');
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens);
        const expiresAt = parseInt(tokens.expires_at) * 1000; // Convert to milliseconds
        
        // Check if token is expired or will expire in the next 5 minutes
        if (Date.now() >= expiresAt - 300000) { // 5 minutes in milliseconds
          // Token is expired or will expire soon, try to refresh
          refreshAccessToken(tokens.refresh_token);
        } else {
          setAccessToken(tokens.access_token);
          setIsAuthenticated(true);
          axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;
        }
      }
    }
  }, []);

  const refreshAccessToken = async (refreshToken: string) => {
    try {
      const response = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
      const { access_token, refresh_token, expires_at } = response.data;
      
      login({ access_token, refresh_token, expires_at });
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout(); // Force logout if refresh fails
    }
  };

  const login = (tokens: any) => {
    localStorage.setItem('stravaTokens', JSON.stringify(tokens));
    setAccessToken(tokens.access_token);
    setIsAuthenticated(true);
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;
  };

  const logout = () => {
    localStorage.removeItem('stravaTokens');
    setAccessToken(null);
    setIsAuthenticated(false);
    delete axios.defaults.headers.common['Authorization'];
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 