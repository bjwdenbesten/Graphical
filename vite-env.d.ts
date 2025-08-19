/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BACKEND_URL: string;
    // add other VITE_ env vars here if needed
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }