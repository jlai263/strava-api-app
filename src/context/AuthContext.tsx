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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check URL parameters for tokens or errors
    const params = new URLSearchParams(window.location.search);
    const token = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresAt = params.get('expires_at');
    const error = params.get('error');

    if (error) {
      console.error('Authentication error:', error);
      localStorage.removeItem('stravaTokens');
      setIsAuthenticated(false);
      setAccessToken(null);
      window.location.href = '/?error=' + encodeURIComponent(error);
      return;
    }

    if (token && refreshToken && expiresAt) {
      console.log('Received new tokens from URL');
      login({ access_token: token, refresh_token: refreshToken, expires_at: expiresAt });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check localStorage for existing tokens
      const storedTokens = localStorage.getItem('stravaTokens');
      if (storedTokens) {
        console.log('Found stored tokens');
        const tokens = JSON.parse(storedTokens);
        const expiresAt = parseInt(tokens.expires_at) * 1000; // Convert to milliseconds
        
        // Check if token is expired or will expire in the next 5 minutes
        if (Date.now() >= expiresAt - 300000) { // 5 minutes in milliseconds
          console.log('Token expired or expiring soon, refreshing...');
          refreshAccessToken(tokens.refresh_token);
        } else {
          console.log('Using stored valid token');
          setAccessToken(tokens.access_token);
          setIsAuthenticated(true);
          axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;
        }
      }
    }
    setLoading(false);
  }, []);

  const refreshAccessToken = async (refreshToken: string) => {
    try {
      console.log('Refreshing access token...');
      const response = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
      const { access_token, refresh_token, expires_at } = response.data;
      
      console.log('Token refresh successful');
      login({ access_token, refresh_token, expires_at });
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout(); // Force logout if refresh fails
    }
  };

  const login = (tokens: any) => {
    console.log('Logging in with tokens');
    // Store tokens in localStorage
    localStorage.setItem('stravaTokens', JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at
    }));
    
    // Set the access token in state
    setAccessToken(tokens.access_token);
    setIsAuthenticated(true);
    
    // Set the default Authorization header for all axios requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;
    
    // Store authentication state
    localStorage.setItem('isAuthenticated', 'true');
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
  };

  const logout = () => {
    console.log('Logging out');
    // Clear all auth-related data
    localStorage.removeItem('stravaTokens');
    localStorage.removeItem('isAuthenticated');
    setAccessToken(null);
    setIsAuthenticated(false);
    delete axios.defaults.headers.common['Authorization'];
    window.location.href = '/';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 