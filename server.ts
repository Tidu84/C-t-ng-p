/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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
app.post('/api/move-commentary', async (req: Request, res: Response) => {
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

    const prompt = `${sceneContext}
Người chơi (${colorText}) vừa đi nước cờ: "${moveNotation}".
Độ chính xác kỹ thuật của nước cờ: "${gradeLabel}" (cấp độ: ${grade}).
${captureText}
${revealText}
${checkText}

YÊU CẦU:
Hãy đưa ra một câu nhận xét dí dỏm, sinh động và hài hước (1 đến 2 câu ngắn, khoảng 12 - 20 từ).
- Thể hiện đúng phong thái và bối cảnh (trà đá dân dã tếu táo, cà phê sành sỏi chiến thuật, kỳ viện chuẩn học thuật, hoa viên thi vị tao nhã, gỗ trầm tối giản thâm sâu).
- Ví dụ mẫu:
  + "Nước cờ nét như Sony! Tí nữa nhớ khao tôi chén trà đá phong thủy nhé!"
  + "Thí quân hơi mạo hiểm đấy! Ép trục sườn gắt quá, coi chừng phản đòn đắng hơn cà phê đen!"
  + "Đỉnh cao chiến thuật kỳ viện! Nước cờ mang tầm vóc đại kiện tướng xuất sắc!"
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
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
