/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'virtual:atelier-build' {
  export const APP_VERSION: string;
  export const APP_BUILD_TIME: string;
}
