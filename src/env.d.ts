/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_STRAVA_CLIENT_ID: string
  readonly VITE_STRAVA_REDIRECT_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@react-three/fiber' {
  const Canvas: any;
  export { Canvas };
}

declare module '@react-three/drei' {
  const OrbitControls: any;
  const Sphere: any;
  export { OrbitControls, Sphere };
}

declare module 'framer-motion' {
  const motion: any;
  export { motion };
}

declare namespace JSX {
  interface IntrinsicElements {
    ambientLight: any;
    pointLight: any;
    meshStandardMaterial: any;
  }
} 