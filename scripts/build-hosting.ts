import { build } from 'vite';

// Firebase Hosting serves static files; native engines and Express APIs are local-only.
process.env.VITE_JIEQI_ENGINE_URL = 'off';
process.env.VITE_COMMENTARY_API_URL = 'off';
await build();
