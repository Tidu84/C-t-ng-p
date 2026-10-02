/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Procedural canvas textures for the real 3D scene (no image downloads).
 */
import * as THREE from 'three';
import { BoardTheme, LabelDisplayMode, PieceRole, PlayerColor } from '../../types';
import { ROLE_HAN_CHARACTERS, ROLE_VI_NAMES } from '../../utils/chessRules';
import { getBoardThemeConfig } from '../../utils/themeStyles';

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
  tex.anisotropy = 8; // clamped by three.js to the GPU maximum
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

const HAN_FONT = '"Noto Serif CJK SC","Noto Serif CJK JP","Songti SC","STSong","SimSun","PingFang SC","Microsoft YaHei",serif';
const VI_FONT = '"Be Vietnam Pro","Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif';

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
export function getBoardTexture(theme: BoardTheme, riverText: string): THREE.CanvasTexture {
  const cfg = getBoardThemeConfig(theme);
  const colors = extractHexColors(cfg.boardBg);
  const light = colors[0] || '#d8b27a';
  const dark = colors[colors.length - 1] || '#8a5a2b';
  const line = /^#[0-9a-fA-F]{6}$/.test(cfg.lineStroke) ? cfg.lineStroke : '#2a1608';
  const C = BOARD_TEX_CELL;
  return makeTexture(`board:${theme}:${riverText}`, 9 * C, 10 * C, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, light);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    woodGrain(ctx, w, h, 'rgba(0,0,0,0)', '#3b2410', 11, 90);

    const px = (c: number) => C / 2 + c * C;
    const py = (r: number) => C / 2 + r * C;
    ctx.strokeStyle = line;
    ctx.lineCap = 'round';

    // Outer frame
    ctx.lineWidth = 7;
    ctx.strokeRect(px(0) - 14, py(0) - 14, 8 * C + 28, 9 * C + 28);
    ctx.lineWidth = 3.5;
    // Horizontal lines
    for (let r = 0; r < 10; r++) {
      ctx.beginPath();
      ctx.moveTo(px(0), py(r));
      ctx.lineTo(px(8), py(r));
      ctx.stroke();
    }
    // Vertical lines (inner ones stop at the river)
    for (let c = 0; c < 9; c++) {
      ctx.beginPath();
      if (c === 0 || c === 8) {
        ctx.moveTo(px(c), py(0));
        ctx.lineTo(px(c), py(9));
      } else {
        ctx.moveTo(px(c), py(0));
        ctx.lineTo(px(c), py(4));
        ctx.moveTo(px(c), py(5));
        ctx.lineTo(px(c), py(9));
      }
      ctx.stroke();
    }
    // Palaces
    const palace = (r0: number) => {
      ctx.beginPath();
      ctx.moveTo(px(3), py(r0));
      ctx.lineTo(px(5), py(r0 + 2));
      ctx.moveTo(px(5), py(r0));
      ctx.lineTo(px(3), py(r0 + 2));
      ctx.stroke();
    };
    palace(0);
    palace(7);
    // Cannon / soldier ticks
    const tick = (c: number, r: number) => {
      const d = 9;
      const l = 16;
      ctx.lineWidth = 2.5;
      for (const sx of [-1, 1]) {
        if ((sx === -1 && c === 0) || (sx === 1 && c === 8)) continue;
        for (const sy of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(px(c) + sx * (d + l), py(r) + sy * d);
          ctx.lineTo(px(c) + sx * d, py(r) + sy * d);
          ctx.lineTo(px(c) + sx * d, py(r) + sy * (d + l));
          ctx.stroke();
        }
      }
      ctx.lineWidth = 3.5;
    };
    for (const [c, r] of [[1, 2], [7, 2], [1, 7], [7, 7]]) tick(c, r);
    for (const c of [0, 2, 4, 6, 8]) {
      tick(c, 3);
      tick(c, 6);
    }
    // River text
    if (riverText) {
      ctx.fillStyle = line;
      ctx.globalAlpha = 0.78;
      ctx.font = `bold ${C * 0.42}px ${HAN_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(riverText, w / 2, (py(4) + py(5)) / 2);
      ctx.globalAlpha = 1;
    }
  }, { scale: 1.4 });
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

const RED_INK = '#b3141b';
const BLACK_INK = '#1d1a17';

function pieceDisc(ctx: CanvasRenderingContext2D, s: number, inner: string, outer: string) {
  const g = ctx.createRadialGradient(s * 0.38, s * 0.32, s * 0.05, s / 2, s / 2, s / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}

export function getPieceFaceTexture(color: PlayerColor, role: PieceRole, mode: LabelDisplayMode): THREE.CanvasTexture {
  return makeTexture(`face:${color}:${role}:${mode}`, 256, 256, (ctx, s) => {
    pieceDisc(ctx, s, '#fbf3e1', '#d9b98a');
    const ink = color === 'red' ? RED_INK : BLACK_INK;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.355, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const han = ROLE_HAN_CHARACTERS[role][color];
    const vi = ROLE_VI_NAMES[role][color];
    if (mode === 'vi') {
      ctx.font = `800 ${vi.length > 3 ? 62 : 74}px ${VI_FONT}`;
      ctx.fillText(vi, s / 2, s / 2 + 4);
    } else if (mode === 'han') {
      ctx.font = `bold 128px ${HAN_FONT}`;
      ctx.fillText(han, s / 2, s / 2 + 6);
    } else {
      ctx.font = `bold 108px ${HAN_FONT}`;
      ctx.fillText(han, s / 2, s / 2 - 10);
      ctx.font = `700 30px ${VI_FONT}`;
      ctx.fillText(vi.toUpperCase(), s / 2, s / 2 + 62);
    }
  }, { scale: 1.5 });
}

export function getPieceBackTexture(color: PlayerColor): THREE.CanvasTexture {
  return makeTexture(`back:${color}`, 256, 256, (ctx, s) => {
    pieceDisc(ctx, s, '#c98f4c', '#6e3c12');
    woodGrain(ctx, s, s, 'rgba(0,0,0,0)', '#3a1c06', 7, 30);
    ctx.strokeStyle = color === 'red' ? '#c2272d' : '#1f1b18';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    // Sun emblem
    ctx.strokeStyle = 'rgba(255, 214, 150, 0.75)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(s / 2 + Math.cos(a) * s * 0.12, s / 2 + Math.sin(a) * s * 0.12);
      ctx.lineTo(s / 2 + Math.cos(a) * s * 0.27, s / 2 + Math.sin(a) * s * 0.27);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 222, 170, 0.85)';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.085, 0, Math.PI * 2);
    ctx.fill();
  }, { scale: 1.5 });
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

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
