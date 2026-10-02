import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cotuongup.game',
  appName: 'Cờ Tướng Úp',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  // Không bật allowMixedContent: app chạy dưới https://localhost, mọi API ngoài
  // (vd. VITE_COMMENTARY_API_URL cho nhận xét AI) cần dùng https.
};

export default config;
