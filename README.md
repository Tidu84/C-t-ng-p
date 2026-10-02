# Cờ Tướng Úp

Game Cờ Tướng Úp (React 19 + TypeScript + Vite 8 + Tailwind 4), đóng gói Android/iOS bằng Capacitor. Chơi với máy hoặc 2 người, có nhận xét nước đi (AI Gemini qua `server.ts`, tự rơi về câu bình luận có sẵn khi không gọi được).

## Chạy

```bash
bun install            # hoặc: npm install
cp .env.example .env   # điền GEMINI_API_KEY nếu muốn nhận xét bằng AI
npm run dev            # server.ts + Vite middleware tại http://localhost:3000
npm run build          # build tĩnh ra dist/
npm run lint           # tsc --noEmit
```

## Nhận xét AI cho bản build tĩnh / mobile

Bản build tĩnh (Vercel, Capacitor) không có `server.ts`, nên endpoint mặc định `/api/move-commentary` không tồn tại. Khi đó:

1. Deploy `server.ts` ở đâu đó có https (`NODE_ENV=production npm start`), đặt `GEMINI_API_KEY` và `CORS_ALLOWED_ORIGINS` (vd. `https://c-t-ng-p.vercel.app,https://localhost,capacitor://localhost`).
2. Build app với `VITE_COMMENTARY_API_URL=https://<server>/api/move-commentary npm run build`.
   Đặt `VITE_COMMENTARY_API_URL=off` để tắt hẳn việc gọi AI.

Xem chi tiết trong `.env.example`.

## Android

```bash
npm run android:sync   # vite build + cap sync android (sinh android/app/src/main/assets/public)
npm run android:open
```

Thư mục `android/app/src/main/assets/public` và `capacitor.config.json` / `capacitor.plugins.json` trong đó là file sinh ra bởi `cap sync`, không commit.
