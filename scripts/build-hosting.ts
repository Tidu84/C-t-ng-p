import { build } from 'vite';

// Disable remote/native APIs. PikaJieQi WASM still runs locally in a browser Worker.
process.env.VITE_JIEQI_ENGINE_URL = 'off';
process.env.VITE_COMMENTARY_API_URL = 'off';
await build();
