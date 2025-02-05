interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_STRAVA_CLIENT_ID: string
  readonly VITE_STRAVA_REDIRECT_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  stravaClientId: import.meta.env.VITE_STRAVA_CLIENT_ID,
  stravaRedirectUri: import.meta.env.VITE_STRAVA_REDIRECT_URI || `${import.meta.env.VITE_API_URL}/auth/callback`,
  
  getStravaAuthUrl() {
    return `https://www.strava.com/oauth/authorize?client_id=${this.stravaClientId}&response_type=code&redirect_uri=${this.stravaRedirectUri}&scope=read,activity:read_all`;
  }
}; 