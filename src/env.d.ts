/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_STRAVA_CLIENT_ID: string
  readonly VITE_STRAVA_CLIENT_SECRET: string
  readonly VITE_STRAVA_REDIRECT_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 