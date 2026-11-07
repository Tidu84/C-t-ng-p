/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Procedural canvas textures for the real 3D scene (no image downloads).
 */
import * as THREE from 'three';
import { BoardTheme, LabelDisplayMode, PieceRole, PlayerColor, PieceTheme } from '../../types';
import { ROLE_HAN_CHARACTERS, ROLE_VI_NAMES } from '../../utils/chessRules';
import { drawThienThienCanvasGlyph } from '../../utils/thienThienGlyphs';
import { getBoardThemeConfig } from '../../utils/themeStyles';
import { ChessMaterial, getBoardMaterial, getPieceMaterial } from '../../utils/chessMaterials';

const cache = new Map<string, THREE.CanvasTexture>();

function makeTexture(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { repeat?: [number, number]; srgb?: boolean; scale?: number } = {}
): THREE.CanvasTexture {
  const cached = cache.get(key);
  if (cached) return cached;
  // `draw` works in logical w×h units; `scale` rasterises at a higher resolution for close-up crispness
  const k = opts.scale ?? 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * k);
  canvas.height = Math.round(h * k);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(k, k);
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16; // clamped by three.js to the GPU maximum
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  cache.set(key, tex);
  return tex;
}

/** Deterministic pseudo random so textures look the same on every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const HAN_FONT = '"Xiangqi Han","Ma Shan Zheng","Noto Serif CJK SC","Noto Serif CJK JP","Songti SC","STSong","SimSun","Microsoft YaHei",serif';
const VI_FONT = '"Be Vietnam Pro","Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif';
const VI_RIVER_FONT = '"Charm","Pattaya","Be Vietnam Pro",cursive,serif';

function woodGrain(ctx: CanvasRenderingContext2D, w: number, h: number, base: string, dark: string, seed: number, lines = 70) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const r = rng(seed);
  ctx.strokeStyle = dark;
  for (let i = 0; i < lines; i++) {
    const y = r() * h;
    ctx.globalAlpha = 0.04 + r() * 0.1;
    ctx.lineWidth = 0.6 + r() * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += w / 12) {
      ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * (2 + r() * 5));
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

/** Pixels per intersection spacing in the board texture. */
export const BOARD_TEX_CELL = 100;


function extractHexColors(css: string): string[] {
  return css.match(/#[0-9a-fA-F]{6}/g) || [];
}

/** Board surface texture: 9 x 10 cells (one cell margin around the grid), canvas top = far side (Black). */
export function getBoardTexture(theme: BoardTheme, riverText: string, isCathedral = false): THREE.CanvasTexture {
  const cfg = getBoardThemeConfig(theme);
  const colors = extractHexColors(cfg.boardBg);
  const material = getBoardMaterial(theme);
  const light = colors[0] || '#d8b27a';
  const dark = colors[colors.length - 1] || '#8a5a2b';
  const line = /^#[0-9a-fA-F]{6}$/.test(cfg.lineStroke) ? cfg.lineStroke : '#2a1608';
  const isBanChuan = theme === 'ban_chuan';
  const C = BOARD_TEX_CELL;

  return makeTexture(`board:v4:${theme}:${riverText}:${isCathedral ? 'cathedral' : 'std'}`, 9 * C, 10 * C, (ctx, w, h) => {
    // 1. Natural Wood & Lacquer Surface
    if (isBanChuan) {
      // Warm ivory lacquer with subtle micro wood grain
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.46, C * 1.2, w * 0.5, h * 0.5, w * 0.88);
      bgGrad.addColorStop(0, '#fdfbf7');
      bgGrad.addColorStop(0.55, '#f7f2e7');
      bgGrad.addColorStop(0.88, '#eee3d1');
      bgGrad.addColorStop(1.0, '#dfcfba');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Fine organic grain lines along the board (vertical grain)
      const r = rng(20261106);
      ctx.strokeStyle = '#8c6747';
      for (let i = 0; i < 90; i++) {
        const x = r() * w;
        ctx.globalAlpha = 0.015 + r() * 0.035;
        ctx.lineWidth = 0.5 + r() * 1.8;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (let y = 0; y <= h; y += h / 16) {
          ctx.lineTo(x + Math.sin(y * 0.008 + i) * (1.5 + r() * 3.5), y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Soft ambient occlusion vignette around board boundary
      const edgeVignette = ctx.createLinearGradient(0, 0, 0, 24);
      edgeVignette.addColorStop(0, 'rgba(60, 36, 16, 0.18)');
      edgeVignette.addColorStop(1, 'transparent');
      ctx.fillStyle = edgeVignette;
      ctx.fillRect(0, 0, w, 24);

      const botVignette = ctx.createLinearGradient(0, h, 0, h - 24);
      botVignette.addColorStop(0, 'rgba(60, 36, 16, 0.18)');
      botVignette.addColorStop(1, 'transparent');
      ctx.fillStyle = botVignette;
      ctx.fillRect(0, h - 24, w, 24);
    } else {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, light);
      g.addColorStop(1, dark);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      drawMaterialGrain(ctx, w, h, material);
    }

    const px = (c: number) => C / 2 + c * C;
    const py = (r: number) => C / 2 + r * C;

    // Helper: draw an engraved groove line with 3D relief (groove shadow + dark core line + sunlit rim highlight)
    const drawEngravedLine = (x1: number, y1: number, x2: number, y2: number, strokeWidth: number) => {
      // Pass 1: Soft depth groove shadow
      ctx.strokeStyle = isBanChuan ? 'rgba(50, 28, 12, 0.14)' : 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = strokeWidth + 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Pass 2: Crisp engraved dark walnut / scorched ink core line
      ctx.strokeStyle = line;
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Pass 3: Sunlit edge micro-highlight (light from top-left)
      ctx.strokeStyle = isBanChuan ? 'rgba(255, 255, 255, 0.42)' : 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = Math.max(0.6, strokeWidth * 0.24);
      ctx.beginPath();
      ctx.moveTo(x1 - 0.7, y1 - 0.7);
      ctx.lineTo(x2 - 0.7, y2 - 0.7);
      ctx.stroke();
    };

    // 2. Double Outer Border (Viền chỉ đôi truyền thống)
    const outerL = px(0) - 16;
    const outerT = py(0) - 16;
    const outerW = 8 * C + 32;
    const outerH = 9 * C + 32;

    // Outer thick engraved frame
    const outerBorderWidth = isCathedral ? 7.5 : 5.2;
    drawEngravedLine(outerL, outerT, outerL + outerW, outerT, outerBorderWidth);
    drawEngravedLine(outerL + outerW, outerT, outerL + outerW, outerT + outerH, outerBorderWidth);
    drawEngravedLine(outerL + outerW, outerT + outerH, outerL, outerT + outerH, outerBorderWidth);
    drawEngravedLine(outerL, outerT + outerH, outerL, outerT, outerBorderWidth);

    // Inner thin border line (5px inside outer frame)
    const innerL = px(0) - 5;
    const innerT = py(0) - 5;
    const innerW = 8 * C + 10;
    const innerH = 9 * C + 10;
    const innerBorderWidth = isCathedral ? 3.2 : 2.2;
    drawEngravedLine(innerL, innerT, innerL + innerW, innerT, innerBorderWidth);
    drawEngravedLine(innerL + innerW, innerT, innerL + innerW, innerT + innerH, innerBorderWidth);
    drawEngravedLine(innerL + innerW, innerT + innerH, innerL, innerT + innerH, innerBorderWidth);
    drawEngravedLine(innerL, innerT + innerH, innerL, innerT, innerBorderWidth);

    // 3. Horizontal Grid Lines (r = 0..9)
    const gridLineWidth = isCathedral ? 3.6 : 2.8;
    for (let r = 0; r < 10; r++) {
      drawEngravedLine(px(0), py(r), px(8), py(r), gridLineWidth);
    }

    // 4. Vertical Grid Lines (c = 0..8; inner lines stop at the river)
    for (let c = 0; c < 9; c++) {
      if (c === 0 || c === 8) {
        drawEngravedLine(px(c), py(0), px(c), py(9), gridLineWidth);
      } else {
        drawEngravedLine(px(c), py(0), px(c), py(4), gridLineWidth);
        drawEngravedLine(px(c), py(5), px(c), py(9), gridLineWidth);
      }
    }

    // 5. Palaces (Cửu cung)
    const palaceLineWidth = isCathedral ? 3.2 : 2.4;
    for (const r0 of [0, 7]) {
      drawEngravedLine(px(3), py(r0), px(5), py(r0 + 2), palaceLineWidth);
      drawEngravedLine(px(5), py(r0), px(3), py(r0 + 2), palaceLineWidth);
    }

    // 6. Corner Star Markers / Tinh vị (Điểm định vị Pháo và Chốt)
    const tick = (c: number, r: number) => {
      const d = 8;
      const l = 15;
      const tw = 2.0;
      for (const sx of [-1, 1]) {
        if ((sx === -1 && c === 0) || (sx === 1 && c === 8)) continue;
        for (const sy of [-1, 1]) {
          drawEngravedLine(px(c) + sx * (d + l), py(r) + sy * d, px(c) + sx * d, py(r) + sy * d, tw);
          drawEngravedLine(px(c) + sx * d, py(r) + sy * d, px(c) + sx * d, py(r) + sy * (d + l), tw);
        }
      }
    };
    for (const [c, r] of [[1, 2], [7, 2], [1, 7], [7, 7]]) tick(c, r);
    for (const c of [0, 2, 4, 6, 8]) {
      tick(c, 3);
      tick(c, 6);
    }

    // 7. River Text & River Banks
    const displayRiverText = isCathedral ? 'Tidu Production' : riverText;
    if (displayRiverText && displayRiverText.trim()) {
      ctx.save();
      ctx.fillStyle = line;
      ctx.globalAlpha = isCathedral ? 0.95 : 0.88;
      const isLong = displayRiverText.length > 25;
      const fontSize = isLong ? C * 0.28 : C * 0.38;
      ctx.font = `bold ${fontSize}px ${isCathedral ? '"Cinzel", "STKaiti", "KaiTi", serif' : VI_RIVER_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1;
      ctx.fillText(displayRiverText, w / 2, (py(4) + py(5)) / 2);
      ctx.restore();
    }
  }, { scale: 2 });
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

const RED_INK = '#dc2626'; // Đỏ tươi rực rỡ, độ bão hòa cao, cực kỳ rõ nét cho người mắt lão
const RED_INK_SHADOW = 'rgba(153, 27, 27, 0.45)';
const BLACK_INK = '#050505'; // Đen mực tàu thuần khiết, tương phản tuyệt đối
const BLACK_INK_SHADOW = 'rgba(0, 0, 0, 0.55)';

function pieceDisc(ctx: CanvasRenderingContext2D, s: number, inner: string, outer: string) {
  const g = ctx.createRadialGradient(s * 0.38, s * 0.32, s * 0.05, s / 2, s / 2, s / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}

export function getPieceFaceTexture(color: PlayerColor, role: PieceRole, mode: LabelDisplayMode): THREE.CanvasTexture {
  return makeTexture(`face:${color}:${role}:${mode}:traditional-v1`, 256, 256, (ctx, s) => {
    // Men sứ trắng ngà tinh khiết (Luminance ~98%) giúp chữ Đỏ và Đen nổi bật tối đa
    pieceDisc(ctx, s, '#fff0c9', '#e6c287');
    const ink = color === 'red' ? RED_INK : BLACK_INK;
    const shadowColor = color === 'red' ? RED_INK_SHADOW : BLACK_INK_SHADOW;

    // Outer & inner decorative circular borders (nét dày, sắc sảo)
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.465, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const han = ROLE_HAN_CHARACTERS[role][color];
    const vi = ROLE_VI_NAMES[role][color];

    // Helper to draw deeply engraved, ultra-bold characters
    const drawEngravedText = (
      text: string,
      x: number,
      y: number,
      font: string,
      strokeWidth: number
    ) => {
      ctx.font = font;

      // Subtle engraved relief shadow
      ctx.fillStyle = shadowColor;
      ctx.fillText(text, x, y + 2.5);

      // Bold stroke dilation for extra thickness and readability
      if (strokeWidth > 0) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = strokeWidth;
        ctx.strokeText(text, x, y);
      }

      // Crisp solid ink fill
      ctx.fillStyle = ink;
      ctx.fillText(text, x, y);
    };

    if (mode === 'vi') {
      const isLong = vi.length > 3;
      const fontSize = isLong ? 84 : 102;
      drawEngravedText(
        vi.toUpperCase(),
        s / 2,
        s / 2 + 3,
        `900 ${fontSize}px ${VI_FONT}`,
        5
      );
    } else if (mode === 'han') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.445, 0, Math.PI * 2);
      ctx.clip();
      const boxSize = Math.round(s * 0.76);
      if (!drawThienThienCanvasGlyph(ctx, role, color, s / 2, s / 2, boxSize, ink, shadowColor))
        drawEngravedText(
          han,
          s / 2,
          s / 2 + 3,
          `700 ${boxSize}px ${HAN_FONT}`,
          0.8
        );
      ctx.restore();
    } else {
      // mode === 'both' (Default mode: large Han character above + bold Vietnamese name below)
      if (!drawThienThienCanvasGlyph(ctx, role, color, s / 2, s / 2 - 19, 132, ink, shadowColor))
      drawEngravedText(
        han,
        s / 2,
        s / 2 - 14,
        `700 144px ${HAN_FONT}`,
        0.6
      );
      drawEngravedText(
        vi.toUpperCase(),
        s / 2,
        s / 2 + 66,
        `900 ${vi.length > 3 ? 34 : 40}px ${VI_FONT}`,
        3.2
      );
    }
  }, { scale: 3 });
}

export function getPieceBackTexture(_color?: PlayerColor, _isCathedral = false): THREE.CanvasTexture {
  // Every covered piece has the same anonymous wooden back, including in the cathedral.
  return makeTexture('piece:covered:traditional:v1', 256, 256, (ctx, s) => {
    pieceDisc(ctx, s, '#f9e3ad', '#d9ac68');
    ctx.strokeStyle = '#8e6a3e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.445, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#fff1ca';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.465, 0, Math.PI * 2);
    ctx.stroke();
  }, { scale: 2 });
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/** Subtle material finish; faces stay quiet so the character remains readable. */
function drawMaterialGrain(ctx: CanvasRenderingContext2D, w: number, h: number, m: ChessMaterial) {
  ctx.save();
  if (m.id === 'wood' || m.id === 'ivory') {
    woodGrain(ctx, w, h, 'rgba(0,0,0,0)', m.id === 'wood' ? '#59371d' : '#a78d6322', 19, m.id === 'wood' ? 60 : 22);
  } else if (m.id === 'silver' || m.id === 'gold') {
    const sheen = ctx.createLinearGradient(0, 0, w, h * 0.4);
    sheen.addColorStop(0, '#ffffff00'); sheen.addColorStop(0.27, '#ffffff28');
    sheen.addColorStop(0.48, '#ffffff04'); sheen.addColorStop(0.64, '#ffffff38'); sheen.addColorStop(1, '#ffffff00');
    ctx.fillStyle = sheen; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.08; ctx.lineWidth = 0.5;
    for (let y = 1; y < h; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  } else {
    const r = rng(87);
    for (let i = 0; i < 12; i++) {
      const x = r() * w, y = r() * h;
      ctx.fillStyle = i % 2 ? '#e0dbff16' : '#ffffff22';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.3, y - h * 0.15);
      ctx.lineTo(x + w * 0.16, y + h * 0.28); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

function drawQuanChuanLidTexture(ctx: CanvasRenderingContext2D, s: number, isRed: boolean) {
  const cx = s / 2;
  const cy = s / 2;

  // 1. Base Radial Gradient Disc (Crimson Red / Sapphire Blue) - Vành ngoài nắp sơn mài cao cấp
  const baseGrad = ctx.createRadialGradient(cx * 0.72, cy * 0.62, s * 0.04, cx, cy, s * 0.49);
  if (isRed) {
    baseGrad.addColorStop(0, '#f87171');
    baseGrad.addColorStop(0.22, '#dc2626');
    baseGrad.addColorStop(0.55, '#b91c1c');
    baseGrad.addColorStop(0.82, '#7f1d1d');
    baseGrad.addColorStop(1.0, '#450a0a');
  } else {
    baseGrad.addColorStop(0, '#38bdf8');
    baseGrad.addColorStop(0.22, '#0284c7');
    baseGrad.addColorStop(0.55, '#1e40af');
    baseGrad.addColorStop(0.82, '#172554');
    baseGrad.addColorStop(1.0, '#0f172a');
  }
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.485, 0, Math.PI * 2);
  ctx.fill();

  // 2. Vành bo tròn nổi 3D đồng nhất (Loại bỏ hoàn toàn các khía màu xám/vằn sọc gượng gạo)
  // Gờ phản chiếu ánh sáng tự nhiên mềm mại từ góc trên bên trái
  const bevelRimGrad = ctx.createLinearGradient(cx * 0.3, cy * 0.3, cx * 1.7, cy * 1.7);
  bevelRimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.48)');
  bevelRimGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.12)');
  bevelRimGrad.addColorStop(0.65, isRed ? 'rgba(69, 10, 10, 0.4)' : 'rgba(15, 23, 42, 0.4)');
  bevelRimGrad.addColorStop(1.0, isRed ? 'rgba(69, 10, 10, 0.85)' : 'rgba(15, 23, 42, 0.85)');

  ctx.strokeStyle = bevelRimGrad;
  ctx.lineWidth = s * 0.024;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.45, 0, Math.PI * 2);
  ctx.stroke();

  // Rãnh chỉ chìm tinh xảo tạo cảm giác gờ vát kim loại thật của nắp
  ctx.strokeStyle = isRed ? '#5a0a0a' : '#081326';
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.41, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Vòng chỉ vàng hoàng gia (Smooth Fillet Shoulder Gold Inlay Ring)
  const ringGold = ctx.createLinearGradient(0, 0, s, s);
  ringGold.addColorStop(0, '#fef08a');
  ringGold.addColorStop(0.3, '#f59e0b');
  ringGold.addColorStop(0.7, '#b45309');
  ringGold.addColorStop(1.0, '#78350f');

  ctx.strokeStyle = ringGold;
  ctx.lineWidth = s * 0.015;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Mặt phẳng gò tròn trung tâm (Raised Plateau 76% Diameter)
  const plateauGrad = ctx.createRadialGradient(cx * 0.76, cy * 0.66, s * 0.03, cx, cy, s * 0.37);
  if (isRed) {
    plateauGrad.addColorStop(0, '#f87171');
    plateauGrad.addColorStop(0.24, '#dc2626');
    plateauGrad.addColorStop(0.62, '#b91c1c');
    plateauGrad.addColorStop(0.90, '#881337');
    plateauGrad.addColorStop(1.0, '#4c0519');
  } else {
    plateauGrad.addColorStop(0, '#60a5fa');
    plateauGrad.addColorStop(0.24, '#2563eb');
    plateauGrad.addColorStop(0.62, '#1d4ed8');
    plateauGrad.addColorStop(0.90, '#1e3a8a');
    plateauGrad.addColorStop(1.0, '#0f172a');
  }
  ctx.fillStyle = plateauGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.37, 0, Math.PI * 2);
  ctx.fill();

  // Ánh sáng bóng mờ tự nhiên (Gloss Specular Sheen)
  const sheenGrad = ctx.createLinearGradient(cx * 0.4, cy * 0.2, cx * 1.6, cy * 1.8);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
  sheenGrad.addColorStop(0.28, 'rgba(255, 255, 255, 0.10)');
  sheenGrad.addColorStop(0.55, 'transparent');
  sheenGrad.addColorStop(1.0, isRed ? 'rgba(69, 10, 10, 0.35)' : 'rgba(15, 23, 42, 0.35)');
  ctx.fillStyle = sheenGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.37, 0, Math.PI * 2);
  ctx.fill();

  // Viền vàng kim tinh tế bao quanh mặt phẳng
  ctx.strokeStyle = ringGold;
  ctx.lineWidth = s * 0.012;
  ctx.stroke();

  // 5. Phù hiệu hoa sen bát giác mạ vàng (Golden Lotus Rosette)
  const goldGrad = ctx.createRadialGradient(cx * 0.85, cy * 0.75, s * 0.03, cx, cy, s * 0.32);
  goldGrad.addColorStop(0, '#fffbeb');
  goldGrad.addColorStop(0.3, '#fde68a');
  goldGrad.addColorStop(0.7, '#f59e0b');
  goldGrad.addColorStop(1.0, '#b45309');

  // Vòng chỉ vàng ngoài
  ctx.strokeStyle = goldGrad;
  ctx.lineWidth = s * 0.02;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.315, 0, Math.PI * 2);
  ctx.stroke();

  // Vòng chỉ vàng chìm trơn tru tinh xảo (không khía, không nét đứt)
  ctx.strokeStyle = goldGrad;
  ctx.lineWidth = s * 0.008;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
  ctx.stroke();

  // 8 Cánh hoa sen bát giác mạ vàng uyển chuyển
  ctx.save();
  ctx.translate(cx, cy);
  for (let k = 0; k < 8; k++) {
    ctx.save();
    ctx.rotate((k * 45 * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.09);
    ctx.quadraticCurveTo(s * 0.045, -s * 0.18, 0, -s * 0.265);
    ctx.quadraticCurveTo(-s * 0.045, -s * 0.18, 0, -s * 0.09);
    ctx.closePath();
    ctx.fillStyle = goldGrad;
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = s * 0.007;
    ctx.stroke();
    ctx.restore();
  }

  // Nhụy hoa tâm vàng
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.075, 0, Math.PI * 2);
  ctx.fillStyle = goldGrad;
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = s * 0.01;
  ctx.stroke();

  // Điểm ngọc tâm hoa
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.028, 0, Math.PI * 2);
  ctx.fillStyle = '#78350f';
  ctx.fill();

  ctx.restore();
}

function drawQuanChuanRevealedTexture(ctx: CanvasRenderingContext2D, s: number, color: PlayerColor, role: PieceRole) {
  const red = color === 'red';
  // Warm Amber Wood Grain Background
  const grad = ctx.createRadialGradient(s * 0.35, s * 0.26, s * 0.05, s / 2, s / 2, s * 0.49);
  grad.addColorStop(0, '#fef9ec');
  grad.addColorStop(0.35, '#fde68a');
  grad.addColorStop(0.70, '#f59e0b');
  grad.addColorStop(1.0, '#b45309');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.485, 0, Math.PI * 2);
  ctx.fill();

  // Subtle wood grain rings
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.12)';
  ctx.lineWidth = 1.5;
  for (let r = 0.15; r < 0.48; r += 0.05) {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Soft lathe dish rim highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = s * 0.015;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.45, 0, Math.PI * 2);
  ctx.stroke();

  // NO INNER CIRCLE LINE (per standard specification)

  // Large, majestic Calligraphy Character matching 3D scale (80.8%), strictly bounded with circular clip
  const han = ROLE_HAN_CHARACTERS[role][color];
  const charSize = Math.round(s * 0.76);

  ctx.save();
  // Safe circular clipping boundary inside dish rim (s * 0.445) - tuyệt đối không tràn viền
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.445, 0, Math.PI * 2);
  ctx.clip();

  // 1. Lower relief highlight (bevel carved light)
  ctx.save();
  ctx.translate(0, s * 0.012);
  if (!drawThienThienCanvasGlyph(ctx, role, color, s / 2, s / 2, charSize, 'rgba(255, 255, 255, 0.95)')) {
    ctx.font = `900 ${charSize}px ${HAN_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillText(han, s / 2, s / 2 + 3);
  }
  ctx.restore();

  // 2. Upper relief shadow (carved groove depth)
  ctx.save();
  ctx.translate(0, -s * 0.009);
  if (!drawThienThienCanvasGlyph(ctx, role, color, s / 2, s / 2, charSize, red ? 'rgba(127, 29, 29, 0.85)' : 'rgba(0, 0, 0, 0.8)')) {
    ctx.font = `900 ${charSize}px ${HAN_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = red ? 'rgba(127, 29, 29, 0.85)' : 'rgba(0, 0, 0, 0.8)';
    ctx.fillText(han, s / 2, s / 2 + 3);
  }
  ctx.restore();

  // 3. Foreground crisp calligraphy
  const textColor = red ? '#b91c1c' : '#18181b';
  if (!drawThienThienCanvasGlyph(ctx, role, color, s / 2, s / 2, charSize, textColor)) {
    ctx.font = `900 ${charSize}px ${HAN_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.fillText(han, s / 2, s / 2 + 3);
  }
  ctx.restore();
}

export function getMaterialPieceTexture(theme: PieceTheme | undefined, color: PlayerColor, role?: PieceRole, lid = false) {
  const m = getPieceMaterial(theme);
  const cacheKey = `piece-tex:${theme ?? m.id}:${color}:${lid ? 'lid' : role ?? 'back'}`;
  return makeTexture(cacheKey, 512, 512, (ctx, s) => {
    const red = color === 'red';
    if (theme === 'quan_chuan') {
      if (lid) {
        drawQuanChuanLidTexture(ctx, s, red);
      } else if (role) {
        drawQuanChuanRevealedTexture(ctx, s, color, role);
      } else {
        pieceDisc(ctx, s, '#fff2db', '#dfbe88');
        drawMaterialGrain(ctx, s, s, m);
      }
      return;
    }

    const lidInner = red ? '#b94238' : '#424b52';
    const lidOuter = red ? '#7b211d' : '#20282e';
    pieceDisc(ctx, s, lid ? lidInner : m.face[0], lid ? lidOuter : m.face[1]);
    drawMaterialGrain(ctx, s, s, m);
    if (lid) {
      ctx.strokeStyle = m.rim; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.435, 0, Math.PI * 2); ctx.stroke();
    } else if (role) {
      ctx.save(); ctx.translate(0, 1); ctx.fillStyle = '#ffffffb0';
      drawRecesses(ctx, s, color, role, 'han', true); ctx.restore();
      ctx.fillStyle = red ? '#a21f1b' : '#151d24';
      drawRecesses(ctx, s, color, role, 'han', true);
    }
  }, { scale: 2 });
}

let materialEnvironment: THREE.CubeTexture | undefined;
/** Small shared studio reflections applied only to chess objects, never to the venue. */
export function getMaterialEnvironment() {
  if (!materialEnvironment) {
    const faces = Array.from({ length: 6 }, (_, index) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, 128, 128);
      gradient.addColorStop(0, '#9daab7'); gradient.addColorStop(0.35, '#eef3f8');
      gradient.addColorStop(0.52, '#6e7d8c'); gradient.addColorStop(1, '#b6c3cf');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = index === 3 ? '#4c5865' : '#ffffff';
      ctx.fillRect(index % 2 ? 78 : 14, 8, 24, 98);
      return canvas;
    });
    materialEnvironment = new THREE.CubeTexture(faces);
    materialEnvironment.colorSpace = THREE.SRGBColorSpace;
    materialEnvironment.needsUpdate = true;
  }
  return materialEnvironment;
}

// Giang hồ prototype only. Shared cached maps, no extra geometry per glyph.
function drawRecesses(ctx: CanvasRenderingContext2D, s: number, color: PlayerColor, role: PieceRole, mode: LabelDisplayMode, clean = false) {
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.435, 0, Math.PI * 2);
  if (!clean) ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const han = ROLE_HAN_CHARACTERS[role][color];
  const vi = ROLE_VI_NAMES[role][color];
  if (mode !== 'vi') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.445, 0, Math.PI * 2);
    ctx.clip();
    const boxSize = clean ? Math.round(s * 0.76) : mode === 'both' ? 128 : Math.round(s * 0.72);
    ctx.font = `700 ${clean ? Math.round(s * 0.76) : mode === 'both' ? 136 : 168}px ${HAN_FONT}`;
    if (!drawThienThienCanvasGlyph(ctx, role, color, s / 2, s / 2 + (mode === 'both' ? -18 : 0), boxSize, String(ctx.fillStyle)))
      ctx.fillText(han, s / 2, s / 2 + (mode === 'both' ? -15 : 3));
    ctx.restore();
  }
  if (mode !== 'han') {
    ctx.font = `900 ${mode === 'both' ? 40 : vi.length > 3 ? 80 : 96}px ${VI_FONT}`;
    ctx.fillText(vi, s / 2, s / 2 + (mode === 'both' ? 67 : 3));
  }
}

export function getEngravedPieceTexture(color: PlayerColor, role: PieceRole, mode: LabelDisplayMode, clean = false) {
  if (clean) mode = 'han';
  return makeTexture(`giang-ho:engraved:${color}:${role}:${mode}:${clean}`, 256, 256, (ctx, s) => {
    pieceDisc(ctx, s, '#fff3d9', '#e5cfaa');
    // The lower bright edge and upper dark edge make a cut, rather than a raised letter.
    ctx.save();
    ctx.translate(0, 1.5);
    ctx.fillStyle = '#fff9e8';
    drawRecesses(ctx, s, color, role, mode, clean);
    ctx.restore();
    ctx.fillStyle = color === 'red' ? '#9c231c' : '#171c20';
    drawRecesses(ctx, s, color, role, mode, clean);
  }, { scale: 2 });
}

export function getEngravedPieceBump(color: PlayerColor, role: PieceRole, mode: LabelDisplayMode, clean = false) {
  if (clean) mode = 'han';
  return makeTexture(`giang-ho:recess:${color}:${role}:${mode}:${clean}`, 256, 256, (ctx, s) => {
    ctx.fillStyle = '#dddddd';
    ctx.fillRect(0, 0, s, s);
    // Dark pixels are lower than the cream surface with positive bumpScale.
    ctx.fillStyle = '#222222';
    drawRecesses(ctx, s, color, role, mode, clean);
  }, { scale: 2, srgb: false });
}

export function getLacquerLidTexture(color: PlayerColor, clean = false) {
  return makeTexture(`giang-ho:lid:${color}:${clean}`, 256, 256, (ctx, s) => {
    pieceDisc(ctx, s, color === 'red' ? '#ba493d' : '#4b565c', color === 'red' ? '#7b211c' : '#20282d');
    ctx.strokeStyle = '#efd8af';
    ctx.lineWidth = clean ? 9 : 3;
    for (const radius of clean ? [0.435] : [0.455, 0.415]) {
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Anonymous lid: no role-specific mark or ornament.
  }, { scale: 2 });
}

export function getSidewalkTexture(): THREE.CanvasTexture {
  return makeTexture('sidewalk', 256, 256, (ctx, s) => {
    const r = rng(3);
    const n = 4;
    const cell = s / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const shade = 150 + Math.floor(r() * 30);
        const red = (i + j) % 2 === 0;
        ctx.fillStyle = red ? `rgb(${shade + 20},${shade - 40},${shade - 55})` : `rgb(${shade},${shade - 8},${shade - 18})`;
        ctx.fillRect(i * cell, j * cell, cell, cell);
        // grime
        for (let k = 0; k < 40; k++) {
          ctx.fillStyle = `rgba(40,30,20,${r() * 0.12})`;
          ctx.fillRect(i * cell + r() * cell, j * cell + r() * cell, 2 + r() * 4, 2 + r() * 4);
        }
      }
    }
    ctx.strokeStyle = 'rgba(60,45,35,0.7)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, s);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(s, i * cell);
      ctx.stroke();
    }
  }, { repeat: [40, 40] });
}

export function getAsphaltTexture(): THREE.CanvasTexture {
  return makeTexture('asphalt', 256, 256, (ctx, s) => {
    ctx.fillStyle = '#3a3936';
    ctx.fillRect(0, 0, s, s);
    const r = rng(5);
    for (let k = 0; k < 900; k++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() * 0.06})`;
      ctx.fillRect(r() * s, r() * s, 2, 2);
    }
  }, { repeat: [8, 2] });
}

export function getPlankTexture(base = '#7a4a26', dark = '#3a200d'): THREE.CanvasTexture {
  return makeTexture(`plank:${base}`, 512, 512, (ctx, s) => {
    const rows = 8;
    const r = rng(9);
    for (let i = 0; i < rows; i++) {
      const y = (i * s) / rows;
      const tint = Math.floor(r() * 30) - 15;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, s, s / rows);
      ctx.clip();
      woodGrain(ctx, s, s, shade(base, tint), dark, 20 + i, 25);
      ctx.restore();
      ctx.fillStyle = 'rgba(20,10,4,0.55)';
      ctx.fillRect(0, y, s, 2);
      ctx.fillRect((r() * s) | 0, y, 2, s / rows);
    }
  }, { repeat: [4, 4] });
}

export function getBrickTexture(): THREE.CanvasTexture {
  return makeTexture('brick', 512, 512, (ctx, s) => {
    ctx.fillStyle = '#c9b8a2';
    ctx.fillRect(0, 0, s, s);
    const r = rng(13);
    const bh = s / 12;
    const bw = s / 4;
    for (let row = 0; row < 12; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < 5; col++) {
        const t = Math.floor(r() * 40);
        ctx.fillStyle = `rgb(${150 + t},${70 + t / 2},${50 + t / 3})`;
        ctx.fillRect(col * bw + off + 3, row * bh + 3, bw - 6, bh - 6);
      }
    }
  }, { repeat: [3, 2] });
}

export function getGrassTexture(): THREE.CanvasTexture {
  return makeTexture('grass', 256, 256, (ctx, s) => {
    ctx.fillStyle = '#4f6f2f';
    ctx.fillRect(0, 0, s, s);
    const r = rng(17);
    for (let k = 0; k < 2500; k++) {
      const g = 80 + Math.floor(r() * 70);
      ctx.fillStyle = `rgba(${g - 40},${g + 20},${g - 60},0.5)`;
      ctx.fillRect(r() * s, r() * s, 1.5, 3 + r() * 4);
    }
  }, { repeat: [14, 14] });
}

export function getShutterTexture(): THREE.CanvasTexture {
  return makeTexture('shutter', 128, 256, (ctx, w, h) => {
    for (let y = 0; y < h; y += 8) {
      const g = ctx.createLinearGradient(0, y, 0, y + 8);
      g.addColorStop(0, '#9aa3a6');
      g.addColorStop(0.5, '#c7ced0');
      g.addColorStop(1, '#6f777a');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, w, 8);
    }
  });
}

export function getSignTexture(text: string, bg: string, fg: string, sub = ''): THREE.CanvasTexture {
  return makeTexture(`sign:${text}:${bg}:${fg}:${sub}`, 512, 128, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${sub ? 54 : 66}px ${VI_FONT}`;
    ctx.fillText(text, w / 2, sub ? h / 2 - 14 : h / 2 + 2);
    if (sub) {
      ctx.font = `600 24px ${VI_FONT}`;
      ctx.fillText(sub, w / 2, h / 2 + 34);
    }
  });
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

/** Procedural radial shadow texture for piece contact and lift shadows on the board surface */
export function getPieceShadowTexture(): THREE.CanvasTexture {
  return makeTexture(
    'piece_contact_shadow_v3',
    128,
    128,
    (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, (w / 2) * 0.80);
      grad.addColorStop(0, 'rgba(10, 5, 2, 0.88)');
      grad.addColorStop(0.40, 'rgba(18, 9, 3, 0.48)');
      grad.addColorStop(0.75, 'rgba(25, 12, 5, 0.14)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    { srgb: false }
  );
}

/** Exquisite Gothic Brass & Obsidian Maker's Mark Plaque (Thẻ bài thương hiệu quý tộc) */
export function getGothicPlaqueTexture(text = 'TIDU PRODUCTION'): THREE.CanvasTexture {
  return makeTexture(`plaque:gothic:${text}`, 512, 128, (ctx, w, h) => {
    // Background: Deep obsidian black with radial bronze sheen
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1c1813');
    bg.addColorStop(0.5, '#0b0a08');
    bg.addColorStop(1, '#1c1813');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Antique gold metallic outer frame
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    // Inner subtle gold filigree rim
    ctx.strokeStyle = 'rgba(245, 215, 110, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    // 4 Corner rosette studs
    const corners = [
      [18, 18],
      [w - 18, 18],
      [18, h - 18],
      [w - 18, h - 18],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f5d76e';
      ctx.fill();
    }

    // Heraldic Fleur-de-lis / Gothic ornament accents left & right
    ctx.fillStyle = '#d4af37';
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚜', 48, h / 2);
    ctx.fillText('⚜', w - 48, h / 2);

    // Main text: "TIDU PRODUCTION" embossed in gleaming gold
    ctx.font = '900 36px "Cinzel", "Times New Roman", serif';
    
    // Engraved drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillText(text.toUpperCase(), w / 2, h / 2 + 2.5);

    // Glowing warm gold text
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = 'rgba(250, 204, 21, 0.65)';
    ctx.shadowBlur = 8;
    ctx.fillText(text.toUpperCase(), w / 2, h / 2);
    ctx.shadowBlur = 0;
  });
}

/** Cathedral Gothic Vaulted Ceiling Stone Texture (Đá sa thạch vòm Gothic hoa văn gân đá & sao vàng) */
export function getGothicVaultStoneTexture(): THREE.CanvasTexture {
  return makeTexture('gothic_vault_stone_v1', 512, 512, (ctx, s) => {
    // Warm ancient limestone / cathedral sandstone base
    ctx.fillStyle = '#d8cbba';
    ctx.fillRect(0, 0, s, s);

    const r = rng(42);
    // Fine stone speckle grain
    for (let i = 0; i < 3000; i++) {
      const v = Math.floor(r() * 40) - 20;
      ctx.fillStyle = `rgba(${195 + v},${185 + v},${170 + v},0.35)`;
      ctx.fillRect(r() * s, r() * s, 1.5 + r() * 2, 1.5 + r() * 2);
    }

    // Curved arched stone ashlar courses (mạch vữa vòm đá)
    const courses = 16;
    for (let i = 0; i <= courses; i++) {
      const y = (i * s) / courses;
      ctx.strokeStyle = 'rgba(85, 68, 52, 0.45)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.stroke();

      // Vertical block joints
      const blocks = 8;
      const off = (i % 2) * (s / (blocks * 2));
      for (let j = 0; j <= blocks; j++) {
        const x = j * (s / blocks) + off;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + s / courses);
        ctx.stroke();
      }
    }

    // Subtle gold celestial stars scattered on the stone vaults (họa tiết sao vàng trang trí trần vòm Thánh địa)
    for (let k = 0; k < 32; k++) {
      const sx = r() * s;
      const sy = r() * s;
      ctx.fillStyle = 'rgba(212, 175, 55, 0.75)';
      ctx.beginPath();
      ctx.arc(sx, sy, 2 + r() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: [4, 6] });
}
