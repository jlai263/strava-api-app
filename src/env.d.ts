/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_STRAVA_CLIENT_ID: string
  readonly VITE_STRAVA_REDIRECT_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg' {
  const ReactComponent: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default ReactComponent;
}

declare module '*.png' {
  const pngUrl: string;
  export default pngUrl;
}

declare module '*.jpg' {
  const jpgUrl: string;
  export default jpgUrl;
} 