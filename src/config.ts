// API URL configuration
const API_BASE = import.meta.env.VITE_API_URL || '';

export const API_URL = '/api';
export const STRAVA_AUTH_ENDPOINT = `${API_URL}/auth/strava`;
export const STRAVA_CALLBACK_ENDPOINT = `${API_URL}/strava/callback`;

// Strava client configuration
export const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
export const STRAVA_REDIRECT_URI = import.meta.env.VITE_STRAVA_REDIRECT_URI;

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('Config:', {
    API_BASE,
    API_URL,
    STRAVA_AUTH_ENDPOINT,
    STRAVA_CALLBACK_ENDPOINT,
    STRAVA_CLIENT_ID,
    STRAVA_REDIRECT_URI
  });
} 