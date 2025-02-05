// API URL configuration
const isDevelopment = import.meta.env.DEV;
const API_BASE = isDevelopment ? '' : ''; // Empty string because we're using Vite's proxy in development

export const API_URL = '/api';
export const STRAVA_AUTH_ENDPOINT = `${API_URL}/auth/strava`;
export const STRAVA_CALLBACK_ENDPOINT = `${API_URL}/strava/callback`;

// Strava client configuration
export const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
export const STRAVA_REDIRECT_URI = import.meta.env.VITE_STRAVA_REDIRECT_URI; 