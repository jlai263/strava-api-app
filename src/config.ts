// API URL configuration
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

// Strava auth endpoints
export const STRAVA_AUTH_ENDPOINT = `${API_URL}/api/auth/strava`;
export const STRAVA_CALLBACK_ENDPOINT = `${API_URL}/api/strava/callback`;

// Strava client configuration
export const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
export const STRAVA_REDIRECT_URI = import.meta.env.VITE_STRAVA_REDIRECT_URI; 