/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PMTILES_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __APP_CONFIG__?: {
    API_BASE_URL?: string;
    PMTILES_URL?: string;
  };
}

declare module 'maplibre-gl/dist/maplibre-gl-csp.js' {
  import maplibregl from 'maplibre-gl';
  export default maplibregl;
}

declare module 'maplibre-gl/dist/maplibre-gl-csp-worker.js?url' {
  const url: string;
  export default url;
}
