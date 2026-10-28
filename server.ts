/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { installEngineTrial } from './server/engineTrial';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
installEngineTrial(app);

const PORT = process.env.PORT || 3000;

// CORS cho API (chỉ bật khi cần): bản build tĩnh / app Capacitor gọi sang server này từ origin khác.
// CORS_ALLOWED_ORIGINS="https://c-t-ng-p.vercel.app,https://localhost,capacitor://localhost"
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use('/api', (req: Request, res: Response, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Circuit breaker for quota exhaustion
let quotaCooldownUntil = 0;

// API Route: AI Move Commentary (Bình luận nước đi phong cách khán giả theo bối cảnh)
const moveCommentaryRateLimits = new Map<string, { count: number; windowStart: number }>();
const MOVE_COMMENTARY_WINDOW_MS = 60_000;
const MOVE_COMMENTARY_MAX_REQUESTS = 20;

function limitMoveCommentaryByIp(req: Request, res: Response, next: () => void) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const current = moveCommentaryRateLimits.get(ip);

  if (!current || now - current.windowStart >= MOVE_COMMENTARY_WINDOW_MS) {
    moveCommentaryRateLimits.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (current.count >= MOVE_COMMENTARY_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  current.count += 1;
  return next();
}

app.post(
  '/api/move-commentary',
  express.json({ limit: '10kb' }),
  limitMoveCommentaryByIp,
  async (req: Request, res: Response) => {
  try {
    const {
      moveNotation,
      grade,
      gradeLabel,
      pieceRole,
      playerColor,
      spectatorName,
      spectatorTitle,
      bgScene,
      isCheck,
      wasCovered,
      revealedRole,
      capturedRole,
    } = req.body;

    // If quota was recently exhausted or no AI client, return fallback immediately
    if (!ai || Date.now() < quotaCooldownUntil) {
      return res.status(200).json({ comment: null, fallback: true });
    }

    const colorText = playerColor === 'red' ? 'Bên Đỏ' : 'Bên Đen';
    const checkText = isCheck ? 'đang CHIẾU TƯỚNG đối thủ!' : '';
    const captureText = capturedRole ? `vừa ăn được quân [${capturedRole}] của địch` : '';
    const revealText = wasCovered ? `vừa mở lật quân úp thành [${revealedRole || 'quân bí mật'}]` : '';

    let sceneContext = '';
    if (bgScene === 'ca_phe') {
      sceneContext = `BỐI CẢNH: Quán Cà Phê Cờ Tướng.
Nhân vật của bạn: "${spectatorName || 'Anh Hoàng Cà Phê'}" (${spectatorTitle || 'Kỳ thủ quen quán, có kiến thức cờ khá giỏi'}).
Phong cách: Bạn có chuyên môn cờ khá giỏi, hiểu sâu về thế trận và nước biến hơn quán trà đá, vừa nhâm nhi cà phê vừa nhận xét có chiều sâu chiến thuật, sắc sảo nhưng vẫn rất dí dỏm, hài hước, mang phong vị dân sành cà phê cờ tướng.`;
    } else if (bgScene === 'dau_truong') {
      sceneContext = `BỐI CẢNH: Đấu Trường Kỳ Vương / Kỳ Viện Quốc Gia chuyên nghiệp.
Nhân vật của bạn: "${spectatorName || 'Đại Sư Bình Luận'}" (${spectatorTitle || 'Chuyên gia lý luận cờ tướng kỳ viện'}).
Phong cách: Mang tính học thuật cao, có lý luận cờ tướng sâu sắc, dùng các thuật ngữ cờ bài bản (giáo trình khai cuộc, độ chuẩn xác, centipawns, tranh tiên, chiếm lộ sườn, sách giáo khoa, tuyển tập danh cục kỳ viện) kết hợp với lối bình luận viên thể thao hóm hỉnh, hài hước, sinh động.`;
    } else if (bgScene === 'hoa_vien') {
      sceneContext = `BỐI CẢNH: Hoa Viên Kỳ Trà thanh tịnh.
Nhân vật của bạn: "${spectatorName || 'Trà Sư Mặc Khách'}" (${spectatorTitle || 'Ẩn sĩ đàm đạo kỳ phong'}).
Phong cách: Tao nhã, cổ phong, văn vẻ thi vị ngắm hoa thưởng trà đàm đạo nước cờ, pha chút hài hước hóm hỉnh thanh cao.`;
    } else if (bgScene === 'go_tram') {
      sceneContext = `BỐI CẢNH: Phòng Gỗ Trầm Tối Giản.
Nhân vật của bạn: "${spectatorName || 'Thiền Sư Kỳ Đạo'}" (${spectatorTitle || 'Thiền sư kỳ đạo'}).
Phong cách: Tối giản, thâm trầm, thiền định, câu chữ súc tích mà sâu sắc, hơi tưng tửng triết lý.`;
    } else {
      sceneContext = `BỐI CẢNH: Quán Trà Đá Vỉa Hè góc phố.
Nhân vật của bạn: "${spectatorName || 'Bác Ba Trà Đá'}" (${spectatorTitle || 'Khán giả chém gió vỉa hè'}).
Phong cách: Bình dân, dân dã, tếu táo, vô thưởng vô phạt, nói lung tung cho vui cửa vui nhà, xúi thí quân, nhắc khao trà đá điếu thuốc lào.`;
    }

    const isAdvisorReveal = wasCovered && revealedRole === 'advisor';
    let revealSpecialInstruction = '';
    if (wasCovered && revealedRole) {
      if (revealedRole === 'advisor') {
        revealSpecialInstruction = `\nĐẶC BIỆT LƯU Ý KHI LẬT RA SĨ (ADVISOR):
Người chơi vừa mở quân úp và lật ra con SĨ. Sĩ đi chéo 1 ô, được ra khỏi cung và qua sông, vẫn có thể tấn công và chiếu Tướng. Có thể trêu vui vì tầm đi ngắn, nhưng không được nói sai luật hoặc khẳng định Sĩ không thể tấn công.
Vì vậy, câu nhận xét BẮT BUỘC phải mang tính TRÊU ĐÙA, chọc ghẹo tếu táo theo phong cách: "Cờ có sĩ như đĩ vén váy rồi...", bốc thăm trúng gió, đen như than tổ ong, cười ra nước mắt, khóc một dòng sông... TUYỆT ĐỐI KHÔNG khen ngợi hay tâng bốc là quân phòng thủ hay hộ giá!`;
      } else if (revealedRole === 'soldier') {
        revealSpecialInstruction = `\nLƯU Ý QUAN TRỌNG KHI LẬT RA TỐT:
- Tốt sang sông thì mới nói câu: "Một tốt sang sông, chổng mông mà đỡ...", Tốt qua sông mới thành dũng tướng, hóa rồng.
- Khi mở Tốt ở bên phần nhà mình thì Tốt đó đâu có giá trị gì, chưa qua sông chỉ biết bò lạch bạch, có khi còn gây khó khăn chật chội đội hình, vướng chân Xe Mã.
- ĐẶC BIỆT LÀ KHI MỞ SĨ GIẢ LÊN LÀ TỐT: Mở Sĩ mà đẻ ra con Tốt chôn chân ngay giữa cung cấm! Vừa không đi ngang được vừa làm nghẽn đường Tướng, đúng là "tự làm khó cho chính mình", nhận xét trêu đùa tấu hài cười ra nước mắt!`;
      } else if (revealedRole === 'elephant') {
        revealSpecialInstruction = `\nLƯU Ý KHI LẬT RA TƯỢNG: Câu chính xác là: "Một con tượng nhỏ, chẳng làm nên mùa xuân chứ", bay nhảy ngắm hoa bắt bướm củng cố bờ cõi...`;
      } else if (revealedRole === 'chariot') {
        revealSpecialInstruction = `\nLƯU Ý KHI LẬT RA XE: Nhận xét ca ngợi hài hước: "Trong cờ gì đẹp bằng xe...", uy phong lẫm liệt đỏ rực một góc trời, phen này đối thủ run tay rồi!`;
      } else if (revealedRole === 'cannon') {
        revealSpecialInstruction = `\nLƯU Ý KHI LẬT RA PHÁO: Nhận xét hóm hỉnh kiểu: "Láo nháo là pháo ăn xe luôn...", khói lửa mù mịt, bên kia toát mồ hôi hột!`;
      } else if (revealedRole === 'horse') {
        revealSpecialInstruction = `\nLƯU Ý KHI LẬT RA MÃ: Nhận xét hào sảng vui vẻ kiểu: "Quất mã truy phong luôn bạn ơi...", bát tuấn tung vó, cản chân sao nổi!`;
      }
    }

    const prompt = `${sceneContext}
Người chơi (${colorText}) vừa đi nước cờ: "${moveNotation}".
Độ chính xác kỹ thuật của nước cờ: "${gradeLabel}" (cấp độ: ${grade}).
${captureText}
${revealText}
${checkText}
${revealSpecialInstruction}

YÊU CẦU QUAN TRỌNG:
Hãy đưa ra một câu nhận xét có GIỌNG ĐIỆU HÀI HƯỚC, sinh động, dí dỏm và duyên dáng (1 đến 2 câu ngắn, khoảng 12 - 20 từ).
- Luôn luôn giữ phong cách HÀI HƯỚC, tếu táo, vui vẻ, trêu đùa khiến người chơi bật cười thích thú. TUYỆT ĐỐI KHÔNG nhận xét khô khan, nhạt nhẽo hay nghiêm túc kiểu học thuật giáo điều!
- Nếu người chơi có nước đi ăn Xe úp lên hoặc làm mất căn Mã úp ở hàng đáy để Pháo giả đối phương bắn xuống: hãy trêu chọc đúng câu: "Sao lại có nước ăn Xe úp lên thế này? Thế Mã úp không quân nào giữ thì bỏ để Pháo giả đối phương ăn xuống à? Nước cờ tự hủy dâng mỡ miệng mèo rồi!"
- Nếu người chơi hoặc máy tụt Pháo 1 bước vu vơ không có mục đích: hãy trêu chọc đúng câu: "Thật buồn cười, tự nhiên tụt pháo 1 chẳng biết để làm gì, chả lẽ tạo điều kiện cho bên đỏ công nhanh hơn à?"
- Nếu người chơi hoặc máy về Sĩ trong khi có thể mở Mã giả hoặc Tượng giả: hãy trêu chọc đúng câu: "Ở nước đi này, chỉ cần mở mã giả hoặc tượng giả là được, cần gì phải về sĩ làm gì hả bạn?"
- Nếu người chơi hoặc máy bị nhảy Mã bắt Xe mà lại đứng im Xe không chạy cũng không ăn lên đổi Xe: hãy trêu chọc đúng câu: "Tôi nhảy mã bắt xe, vậy mà máy lại đứng im con xe à? Phải ăn lên xe của tôi để đổi xe chứ!"
- Nếu người chơi hoặc máy mang Xe thật đi ăn quân úp đối phương có Tượng (hoặc quân khác) giữ căn: hãy trêu chọc đúng câu: "Xe giả của tôi có tượng giữ đấy, sao lại mang xe thật đi ăn lấy xe giả thế kia!"
- Nếu người chơi chưa có đủ cây chiến để chiếu cục đối phương mà đã vội vàng xua quân tấn công đơn độc sang sân địch: hãy trêu đùa là "một cây làm chẳng nên non, sang nạp mạng sớm cho đối thủ cười đau bụng"!
- Thể hiện đúng màu sắc nhân vật nhưng tất cả đều phải dí dỏm, tấu hài (trà đá tếu táo chém gió; cà phê sành điệu hài hước; kỳ viện tấu hài thể thao chuyên nghiệp; hoa viên thi vị tưng tửng; thiền sư gỗ trầm hài hước thâm sâu).
- Ví dụ khẩu khí:
  + "Trong cờ gì đẹp bằng xe! Xe chiến xuất trận thế này thì đối thủ xin phép ngất tạm 5 phút!"
  + "Láo nháo là pháo ăn xe luôn! Thần công gầm rú khét lẹt cả góc quán!"
  + "Quất mã truy phong luôn bạn ơi! Bát tuấn tung vó cản chân sao nổi!"
  + "Một tốt sang sông, chổng mông mà đỡ! Phen này đối thủ tha hồ toát mồ hôi hột!"
  + "Cờ có sĩ như đĩ vén váy rồi! Bốc trúng con Sĩ chân ngắn cười đau cả ruột!"
  + "Một con tượng nhỏ chẳng làm nên mùa xuân! Bay nhảy ngắm hoa bắt bướm vui cửa vui nhà!"
- Chỉ trả về duy nhất câu nhận xét bằng tiếng Việt, không thêm dấu ngoặc kép bọc ngoài hay lời giải thích.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.85,
        maxOutputTokens: 75,
      },
    });

    const comment = response.text ? response.text.trim().replace(/^["']|["']$/g, '') : null;
    return res.status(200).json({ comment, isAiGenerated: Boolean(comment) });
  } catch (error: any) {
    const errMsg = String(error?.message || error || '');
    if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('rate-limit')) {
      // Cooldown for 2 minutes to prevent rate limit hammering
      quotaCooldownUntil = Date.now() + 120_000;
    }
    // Return gracefully so client falls back immediately to built-in scene jokes
    return res.status(200).json({ comment: null, fallback: true });
  }
  }
);

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const httpServer = createHttpServer(app);
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, ws: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, () => {
    console.log(`\n  🎮 Cờ Tướng Úp đang chạy tại:`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/\n`);
  });
}

startServer();
