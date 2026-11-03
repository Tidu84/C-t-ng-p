/**
 * Hand-crafted Vector Calligraphy Glyphs modeled after Thiên Thiên Tượng Kỳ (天天象棋)
 * Engineered for all 7 piece roles (Tướng, Sĩ, Tượng, Mã, Xe, Pháo, Tốt/Binh)
 * so every character is large, bold, high-contrast, and strictly bounded within
 * the circular inner ring without ever overlapping the border.
 */

import React from 'react';
import { PieceRole, PlayerColor } from '../types';

interface StrokeSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
}

interface GlyphGeometry {
  lines: StrokeSeg[];
  curves?: { d: string; w: number }[];
  boxes?: { x: number; y: number; w: number; h: number; sw: number }[];
}

/**
 * Stroke definitions in a 100x100 viewBox.
 * All coordinates stay within the safe inscribed circle around (50, 50)
 * so corners never collide with the circular inner ring of the piece.
 */
function getGlyphGeometry(role: PieceRole, color: PlayerColor): GlyphGeometry | null {
  switch (role) {
    case 'chariot': {
      // Quân Xe (車) chuẩn Thiên Thiên Tượng Kỳ (Đỏ & Đen đồng nhất):
      // Khung thùng xe (日) ở giữa mở rộng 4 ô thoáng sáng, trục sổ dọc xuyên tâm
      return {
        boxes: [
          { x: 25, y: 33, w: 50, h: 27, sw: 6.0 },
        ],
        lines: [
          { x1: 22, y1: 20, x2: 78, y2: 19, w: 6.6 },   // Nét ngang đầu
          { x1: 26, y1: 46.5, x2: 74, y2: 46, w: 5.4 }, // Nét ngang giữa thùng xe
          { x1: 15, y1: 74, x2: 85, y2: 72.5, w: 7.2 }, // Nét ngang trục bánh xe dài
          { x1: 50, y1: 10, x2: 50, y2: 89, w: 7.0 },   // Trục sổ dọc xuyên tâm
        ],
      };
    }

    case 'advisor': {
      if (color === 'black') {
        // Quân Sĩ Đen (士): Nét ngang trên sải rộng, nét ngang đáy ngắn gọn khóa chân trụ
        return {
          lines: [
            { x1: 16, y1: 45, x2: 84, y2: 43, w: 8.0 },
            { x1: 50, y1: 15, x2: 50, y2: 79, w: 8.4 },
            { x1: 27, y1: 79.5, x2: 73, y2: 78, w: 7.8 },
          ],
        };
      }
      // Quân Sĩ Đỏ (仕): Bộ Nhân đứng (亻) tách thoáng bên trái, chữ 士 bên phải cân đối
      return {
        curves: [
          { d: 'M 34 16 Q 24 36 13 53', w: 6.8 },
        ],
        lines: [
          { x1: 25, y1: 35, x2: 25, y2: 82, w: 6.8 },
          { x1: 38, y1: 45.5, x2: 88, y2: 43.5, w: 7.4 },
          { x1: 63.5, y1: 16, x2: 63.5, y2: 79, w: 7.8 },
          { x1: 45, y1: 79.5, x2: 82, y2: 78, w: 7.2 },
        ],
      };
    }

    case 'soldier': {
      if (color === 'red') {
        // Quân Tốt Đỏ (兵): Phần đầu 丘 vuông vức khỏe khoắn, nét ngang giữa rộng, hai chân 八 vững chãi
        return {
          curves: [
            { d: 'M 66 15 Q 48 21 29 25', w: 6.4 },     // Nét phẩy đỉnh đầu
            { d: 'M 38 66 Q 28 78 18 85', w: 7.0 },     // Chân trái (丿)
            { d: 'M 62 66 Q 73 78 82 85', w: 7.0 },     // Chân phải (丶)
          ],
          lines: [
            { x1: 31, y1: 24, x2: 31, y2: 56, w: 6.4 }, // Trụ trái phần trên
            { x1: 31, y1: 38, x2: 71, y2: 36.5, w: 6.2 }, // Nét ngang giữa phần trên
            { x1: 54, y1: 22, x2: 54, y2: 56, w: 6.4 }, // Trụ dọc giữa phần trên
            { x1: 15, y1: 56.5, x2: 85, y2: 55, w: 7.2 }, // Nét ngang đại đỡ thân
          ],
        };
      }
      // Quân Binh Đen (卒): Chấm đầu + mái ngang + hai chữ Nhân (从) tách rõ + chữ Thập (十) chân trụ
      return {
        curves: [
          { d: 'M 36 30 Q 29 43 20 51', w: 5.8 },       // Nhân trái - phẩy
          { d: 'M 32 39 L 43 49', w: 5.6 },             // Nhân trái - mác ngắn
          { d: 'M 66 30 Q 59 43 51 50', w: 5.8 },       // Nhân phải - phẩy
          { d: 'M 63 39 L 78 50', w: 5.8 },             // Nhân phải - mác
        ],
        lines: [
          { x1: 48, y1: 12, x2: 52, y2: 22, w: 6.8 },   // Chấm đỉnh đầu
          { x1: 21, y1: 24, x2: 79, y2: 22.5, w: 6.6 }, // Nét ngang mái
          { x1: 16, y1: 63, x2: 84, y2: 61.5, w: 7.2 }, // Nét ngang chữ Thập dưới
          { x1: 50, y1: 50, x2: 50, y2: 89, w: 7.2 },   // Trục sổ dọc khóa chân
        ],
      };
    }

    case 'horse': {
      // Quân Mã (馬) chuẩn Thiên Thiên Tượng Kỳ (đồng nhất Đỏ & Đen, không dùng bộ Nhân 亻 làm hẹp chữ):
      // Lưới bờm ngựa 3 tầng thoáng nét, lưng ngựa uốn vòng uy lực, 4 vó (灬) tách biệt rõ ràng
      return {
        curves: [
          { d: 'M 27 52 L 82 50 C 83 71 78 83 68 87 L 57 81', w: 6.4 }, // Thân & câu móc đuôi ngựa
        ],
        lines: [
          { x1: 27, y1: 18, x2: 74, y2: 16.5, w: 6.4 }, // Ngang bờm 1
          { x1: 27, y1: 30, x2: 71, y2: 28.5, w: 5.6 }, // Ngang bờm 2
          { x1: 27, y1: 41, x2: 71, y2: 39.5, w: 5.6 }, // Ngang bờm 3
          { x1: 27, y1: 18, x2: 27, y2: 52, w: 6.4 },   // Sổ dọc trái bờm
          { x1: 50, y1: 18, x2: 50, y2: 51, w: 5.6 },   // Sổ dọc giữa bờm
          // 4 chấm vó ngựa (灬)
          { x1: 20, y1: 66, x2: 16, y2: 80, w: 5.8 },
          { x1: 34, y1: 65, x2: 34, y2: 78, w: 5.6 },
          { x1: 47, y1: 64, x2: 49, y2: 76, w: 5.6 },
          { x1: 60, y1: 63, x2: 63, y2: 74, w: 5.6 },
        ],
      };
    }

    case 'elephant': {
      if (color === 'red') {
        // Quân Tượng Đỏ (相): Bên trái bộ Mộc (木) thanh thoát, bên phải bộ Mục (目) 3 ô sáng rõ
        return {
          boxes: [
            { x: 52, y: 21, w: 30, h: 61, sw: 6.0 },    // Khung bộ Mục (目) bên phải
          ],
          curves: [
            { d: 'M 31 38 Q 23 58 13 73', w: 6.0 },     // Nét phẩy bộ Mộc
            { d: 'M 32 45 L 44 59', w: 5.8 },           // Nét chấm bộ Mộc
          ],
          lines: [
            { x1: 14, y1: 37, x2: 45, y2: 35.5, w: 6.2 }, // Ngang bộ Mộc
            { x1: 31, y1: 16, x2: 31, y2: 85, w: 6.4 },   // Sổ dọc bộ Mộc
            { x1: 53, y1: 41, x2: 81, y2: 41, w: 5.4 },   // Ngang trong 1 bộ Mục
            { x1: 53, y1: 61, x2: 81, y2: 61, w: 5.4 },   // Ngang trong 2 bộ Mục
            { x1: 53, y1: 82, x2: 81, y2: 82, w: 6.0 },   // Đáy bộ Mục
          ],
        };
      }
      // Quân Tượng Đen (象): Đầu vòi + khung tai mở rộng + sống lưng cong & các nét chân phóng khoáng
      return {
        boxes: [
          { x: 26, y: 31, w: 48, h: 17, sw: 5.6 },      // Khung giữa (口) rộng thoáng
        ],
        curves: [
          { d: 'M 43 13 Q 32 22 22 29', w: 5.8 },       // Nét phẩy đỉnh đầu
          { d: 'M 40 17 L 62 16 L 53 30', w: 5.6 },     // Móc vòi trên
          { d: 'M 48 48 Q 34 57 19 64', w: 5.8 },       // Nét phẩy vai trái
          { d: 'M 46 49 C 61 59 61 77 48 87 L 39 81', w: 6.4 }, // Trục sống lưng uốn cong
          { d: 'M 50 58 Q 34 68 18 75', w: 5.6 },       // Chân trái giữa
          { d: 'M 53 67 Q 37 78 22 85', w: 5.6 },       // Chân trái dưới
          { d: 'M 75 51 Q 67 60 58 65', w: 5.6 },       // Phẩy phải
          { d: 'M 56 63 Q 70 75 84 83', w: 6.2 },       // Nét mác phải (乀)
        ],
        lines: [
          { x1: 50, y1: 31, x2: 50, y2: 48, w: 5.4 },   // Vách ngăn giữa khung tai
        ],
      };
    }

    case 'cannon': {
      // Phần bên phải chung cho cả Pháo Đỏ (炮) & Pháo Đen (砲): Bộ Bao (包)
      const baoCurves = [
        { d: 'M 54 15 Q 48 29 41 40', w: 5.8 },         // Phẩy đầu bộ Bao
        { d: 'M 49 25 L 82 23 C 82 47 80 61 73 66 L 64 60', w: 5.8 }, // Vòng ngoài 勹
        { d: 'M 50 39 L 68 38 L 68 53 L 50 53 L 50 74 C 50 83 56 85 71 85 C 83 85 85 82 86 71', w: 5.8 }, // Bộ Kỷ (巳) lòng trong + móc đáy
      ];

      if (color === 'red') {
        // Quân Pháo Đỏ (炮): Bên trái bộ Hỏa (火) + bên phải bộ Bao (包)
        return {
          curves: [
            { d: 'M 16 34 Q 14 46 12 53', w: 5.4 },     // Chấm lửa trái
            { d: 'M 40 31 Q 35 41 30 47', w: 5.4 },     // Phẩy lửa phải
            { d: 'M 27 17 C 27 48 23 68 13 83', w: 6.2 }, // Trục lửa chính phẩy xuống
            { d: 'M 25 56 L 39 74', w: 5.8 },           // Nét đạp lửa sang phải
            ...baoCurves,
          ],
          lines: [],
        };
      }
      // Quân Pháo Đen (砲): Bên trái bộ Thạch (石) + bên phải bộ Bao (包)
      return {
        boxes: [
          { x: 20, y: 49, w: 19, h: 27, sw: 5.4 },      // Khung khẩu (口) của bộ Thạch
        ],
        curves: [
          { d: 'M 29 26 Q 22 47 12 63', w: 5.8 },       // Nét phẩy đá (丿)
          ...baoCurves,
        ],
        lines: [
          { x1: 13, y1: 26, x2: 41, y2: 24.5, w: 6.0 }, // Nét ngang đầu bộ Thạch
        ],
      };
    }

    case 'king': {
      if (color === 'red') {
        // Quân Tướng Đỏ (帥): Bên trái 2 ô vuông chồng + sổ dọc, bên phải bộ Cân (巾) đĩnh đạc
        return {
          boxes: [
            { x: 18, y: 28, w: 22, h: 20, sw: 5.4 },    // Ô trên bên trái
            { x: 18, y: 57, w: 22, h: 21, sw: 5.4 },    // Ô dưới bên trái
          ],
          curves: [
            { d: 'M 33 14 Q 25 22 18 28', w: 5.8 },     // Nét phẩy đỉnh trái
            { d: 'M 50 34 L 83 32.5 L 83 69 L 74 63', w: 6.0 }, // Khung quàng bộ Cân (冂)
          ],
          lines: [
            { x1: 18, y1: 28, x2: 18, y2: 83, w: 5.8 }, // Trụ dọc trái
            { x1: 48, y1: 21, x2: 85, y2: 19.5, w: 6.2 }, // Ngang đầu bên phải
            { x1: 66, y1: 21, x2: 66, y2: 88, w: 6.6 }, // Trục sổ dọc xuyên tâm bộ Cân
          ],
        };
      }
      // Quân Tướng Đen (將): Bên trái bộ Tường (爿), bên phải bộ Nguyệt/Trảo trên + bộ Thốn (寸) dưới
      return {
        curves: [
          { d: 'M 21 20 L 21 44 L 36 44', w: 5.6 },     // Khung trên bộ Tường
          { d: 'M 75 14 Q 62 20 47 23', w: 5.6 },       // Nét phẩy đỉnh phải
          { d: 'M 48 31 Q 63 39 82 43', w: 5.6 },       // Nét lượn chéo trên
          { d: 'M 72 44 L 72 82 C 72 87 68 88 59 84', w: 6.2 }, // Trục móc bộ Thốn (寸)
        ],
        lines: [
          { x1: 36, y1: 14, x2: 36, y2: 87, w: 6.4 },   // Trụ dọc chính bên trái
          { x1: 16, y1: 62, x2: 36, y2: 59, w: 5.8 },   // Ngang dưới trái
          { x1: 22, y1: 62, x2: 17, y2: 82, w: 5.4 },   // Phẩy chân trái
          { x1: 50, y1: 28, x2: 47, y2: 39, w: 5.0 },   // Chấm 1 phần trên phải
          { x1: 63, y1: 25, x2: 60, y2: 36, w: 5.0 },   // Chấm 2 phần trên phải
          { x1: 77, y1: 23, x2: 72, y2: 36, w: 5.2 },   // Phẩy 3 phần trên phải
          { x1: 44, y1: 56, x2: 86, y2: 54.5, w: 6.2 }, // Ngang dài bộ Thốn
          { x1: 52, y1: 66, x2: 59, y2: 75, w: 5.8 },   // Chấm lòng bộ Thốn
        ],
      };
    }

    default:
      return null;
  }
}

/**
 * Render crisp SVG glyph for 2D / 3D DOM pieces (`ChessPiece.tsx`)
 */
export function renderThienThienSvgGlyph(
  role: PieceRole,
  color: PlayerColor,
  strokeColor: string,
  filterShadow?: string,
  sizeClass = 'w-[86%] h-[86%]'
): React.ReactNode | null {
  const geom = getGlyphGeometry(role, color);
  if (!geom) return null;

  const BOLD_BOOST = 1.28;

  return (
    <svg
      viewBox="8 8 84 84"
      className={`${sizeClass} select-none pointer-events-none overflow-visible shrink-0`}
      style={{ filter: filterShadow }}
    >
      <g
        stroke={strokeColor}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {geom.boxes?.map((b, idx) => (
          <rect
            key={`box-${idx}`}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx={2}
            strokeWidth={b.sw * BOLD_BOOST}
          />
        ))}
        {geom.curves?.map((c, idx) => (
          <path key={`curve-${idx}`} d={c.d} strokeWidth={c.w * BOLD_BOOST} />
        ))}
        {geom.lines.map((l, idx) => (
          <line
            key={`line-${idx}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            strokeWidth={l.w * BOLD_BOOST}
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * Draw crisp Canvas 2D glyph for 4D WebGL textures (`textures.ts`)
 */
export function drawThienThienCanvasGlyph(
  ctx: CanvasRenderingContext2D,
  role: PieceRole,
  color: PlayerColor,
  cx: number,
  cy: number,
  boxSize: number,
  strokeColor: string,
  shadowColor?: string
): boolean {
  const geom = getGlyphGeometry(role, color);
  if (!geom) return false;

  const BOLD_BOOST = 1.28;
  const VIEW_SPAN = 84;
  const VIEW_MIN = 8;

  const paintPass = (offsetX: number, offsetY: number, colorStyle: string) => {
    ctx.save();
    const scale = boxSize / VIEW_SPAN;
    ctx.translate(cx - boxSize / 2 + offsetX, cy - boxSize / 2 + offsetY);
    ctx.scale(scale, scale);
    ctx.translate(-VIEW_MIN, -VIEW_MIN);
    ctx.strokeStyle = colorStyle;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (geom.boxes) {
      for (const b of geom.boxes) {
        ctx.lineWidth = b.sw * BOLD_BOOST;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 2);
        ctx.stroke();
      }
    }
    if (geom.curves) {
      for (const c of geom.curves) {
        ctx.lineWidth = c.w * BOLD_BOOST;
        const p = new Path2D(c.d);
        ctx.stroke(p);
      }
    }
    for (const l of geom.lines) {
      ctx.lineWidth = l.w * BOLD_BOOST;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    }
    ctx.restore();
  };

  if (shadowColor) {
    paintPass(0, 2.0, shadowColor);
  }
  paintPass(0, 0, strokeColor);
  return true;
}
