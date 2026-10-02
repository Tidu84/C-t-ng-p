import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig} from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'lucide-react',
        'canvas-confetti',
        'motion',
        '@capacitor/core',
        '@capacitor/haptics',
        'web-haptics',
      ],
      holdUntilCrawlEnd: true,
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('/react/') || id.includes('/react-dom/')) {
                return 'vendor-react';
              }
              return 'vendor';
            }
            if (id.includes('/src/components/SoundSettingsModal')) {
              return 'modal-sound-settings';
            }
            if (id.includes('/src/components/VictoryModal')) {
              return 'modal-victory';
            }
            if (id.includes('/src/components/RulesModal')) {
              return 'modal-rules';
            }
            if (id.includes('/src/components/MatchHistoryModal')) {
              return 'modal-history';
            }
            if (id.includes('/src/components/CustomizationModal')) {
              return 'modal-customization';
            }
            if (id.includes('/src/components/UserProfileModal')) {
              return 'modal-user-profile';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
