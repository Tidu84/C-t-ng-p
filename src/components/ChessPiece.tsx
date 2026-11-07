/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LabelDisplayMode, Piece, PieceTheme } from '../types';
import { ROLE_HAN_CHARACTERS, ROLE_VI_NAMES } from '../utils/chessRules';
import { renderThienThienSvgGlyph } from '../utils/thienThienGlyphs';

interface ChessPieceProps {
  piece: Piece;
  isSelected?: boolean;
  isLastMove?: boolean;
  isInCheck?: boolean;
  displayMode?: LabelDisplayMode;
  size?: number;
  is3D?: boolean;
  theme?: PieceTheme;
}

// Visual configuration profiles for each piece theme
interface PieceStyleProfile {
  // Covered piece styles
  coveredBg: string;
  coveredBorder: string;
  coveredShadow3D: string;
  coveredShadow3DSelected: string;
  coveredDishBg: string;
  coveredDishBorderRed: string;
  coveredDishBorderBlack: string;
  coveredEmblemStroke: string;
  coveredEmblemRay: string;
  coveredEmblemCenter: string;
  coveredEmblemDash: string;

  // Uncovered Red piece styles
  uncoveredRedBg: string;
  uncoveredRedBorder: string;
  uncoveredRedShadow3D: string;
  uncoveredRedShadow3DSelected: string;
  uncoveredRedDishBg: string;
  uncoveredRedDishBorder: string;
  uncoveredRedDishRing: string;
  uncoveredRedTextColor: string;
  uncoveredRedTextShadow: string;

  // Uncovered Black piece styles
  uncoveredBlackBg: string;
  uncoveredBlackBorder: string;
  uncoveredBlackShadow3D: string;
  uncoveredBlackShadow3DSelected: string;
  uncoveredBlackDishBg: string;
  uncoveredBlackDishBorder: string;
  uncoveredBlackDishRing: string;
  uncoveredBlackTextColor: string;
  uncoveredBlackTextShadow: string;
}

const PIECE_STYLES: Record<PieceTheme, PieceStyleProfile> = {
  quan_chuan: {
    coveredBg: 'radial-gradient(circle at 35% 26%, #d32f2f 0%, #b71c1c 35%, #7f1d1d 72%, #450a0a 100%)',
    coveredBorder: '#ef4444',
    coveredShadow3D: '0 1.2px 0 #991b1b, 0 3px 0 #7f1d1d, 0 5.5px 0 #450a0a, 0 8.2px 1px #1c0505, 0 10px 12px rgba(0,0,0,0.5)',
    coveredShadow3DSelected: '0 2px 0 #dc2626, 0 4.5px 0 #991b1b, 0 7.5px 0 #450a0a, 0 11.5px 15px rgba(0,0,0,0.65)',
    coveredDishBg: 'radial-gradient(circle at 38% 32%, #ef4444 0%, #dc2626 55%, #991b1b 100%)',
    coveredDishBorderRed: '#ef4444',
    coveredDishBorderBlack: '#38bdf8',
    coveredEmblemStroke: '#f59e0b',
    coveredEmblemRay: '#fbbf24',
    coveredEmblemCenter: '#fef08a',
    coveredEmblemDash: 'rgba(245, 158, 11, 0.85)',

    uncoveredRedBg: 'radial-gradient(circle at 35% 26%, #fde68a 0%, #f59e0b 28%, #d97706 65%, #b45309 90%, #78350f 100%)',
    uncoveredRedBorder: '#92400e',
    uncoveredRedShadow3D: '0 1.2px 0 #b45309, 0 3px 0 #92400e, 0 5.5px 0 #78350f, 0 8.2px 1px #451a03, 0 10px 12px rgba(0,0,0,0.48)',
    uncoveredRedShadow3DSelected: '0 1.2px 0 #d97706, 0 2.5px 0 #b45309, 0 4px 0 #78350f, 0 8px 18px rgba(0,0,0,0.45)',
    uncoveredRedDishBg: 'radial-gradient(circle at 38% 32%, #fef3c7 0%, #fde68a 58%, #f59e0b 100%)',
    uncoveredRedDishBorder: '#b91c1c',
    uncoveredRedDishRing: 'transparent',
    uncoveredRedTextColor: '#b91c1c',
    uncoveredRedTextShadow: 'drop-shadow(0 1.2px 0px rgba(255,255,255,0.95)) drop-shadow(0 -1.2px 1px rgba(127,29,29,0.85)) drop-shadow(0 2px 3px rgba(0,0,0,0.35))',

    uncoveredBlackBg: 'radial-gradient(circle at 35% 26%, #475569 0%, #334155 30%, #1e293b 68%, #0f172a 90%, #020617 100%)',
    uncoveredBlackBorder: '#64748b',
    uncoveredBlackShadow3D: '0 1.2px 0 #334155, 0 3px 0 #1e293b, 0 5.5px 0 #0f172a, 0 8.2px 1px #020617, 0 10px 14px rgba(0,0,0,0.7)',
    uncoveredBlackShadow3DSelected: '0 1.2px 0 #475569, 0 2.5px 0 #334155, 0 4px 0 #0f172a, 0 8px 18px rgba(0,0,0,0.5)',
    uncoveredBlackDishBg: 'radial-gradient(circle at 38% 32%, #334155 0%, #1e293b 55%, #090d16 100%)',
    uncoveredBlackDishBorder: '#0f172a',
    uncoveredBlackDishRing: 'transparent',
    uncoveredBlackTextColor: '#f8fafc',
    uncoveredBlackTextShadow: 'drop-shadow(0 1.2px 0px rgba(0,0,0,0.95)) drop-shadow(0 -1px 0.8px rgba(255,255,255,0.75)) drop-shadow(0 2px 3px rgba(0,0,0,0.5))',
  },

  // 1. HOÀNG KIM GỖ NGÀ (Classical Wood & Ivory)
  hoang_kim: {
    coveredBg: 'radial-gradient(circle at 35% 26%, #fdf0cd 0%, #f5cf84 28%, #d99a40 65%, #ab691f 90%, #693409 100%)',
    coveredBorder: '#78350f',
    coveredShadow3D: '0 1.2px 0 #8a4009, 0 3px 0 #78350f, 0 5.5px 0 #5c2707, 0 8.2px 1px #230b01, 0 10px 12px rgba(0,0,0,0.46)',
    coveredShadow3DSelected: '0 2px 0 #8a4009, 0 4.5px 0 #78350f, 0 7.5px 0 #542205, 0 11.5px 15px rgba(0,0,0,0.6)',
    coveredDishBg: 'radial-gradient(circle at 38% 32%, #fae5b6 0%, #edd195 55%, #c98e3b 100%)',
    coveredDishBorderRed: '#b91c1c',
    coveredDishBorderBlack: '#292524',
    coveredEmblemStroke: '#92400e',
    coveredEmblemRay: '#b45309',
    coveredEmblemCenter: '#d97706',
    coveredEmblemDash: 'rgba(217, 119, 6, 0.75)',

    uncoveredRedBg: 'radial-gradient(circle at 35% 26%, #ffffff 0%, #fefcf5 25%, #f5ecdb 62%, #d8be96 90%, #8c6a38 100%)',
    uncoveredRedBorder: '#8c6a38',
    uncoveredRedShadow3D: '0 1.2px 0 #b39b75, 0 3px 0 #9c835c, 0 5.5px 0 #7a633f, 0 8.2px 1px #3b2c17, 0 10px 12px rgba(0,0,0,0.46)',
    uncoveredRedShadow3DSelected: '0 2px 0 #b39b75, 0 4.5px 0 #9c835c, 0 7.5px 0 #695232, 0 11.5px 15px rgba(0,0,0,0.6)',
    uncoveredRedDishBg: 'radial-gradient(circle at 38% 32%, #ffffff 0%, #fbf6ec 58%, #ede1cb 100%)',
    uncoveredRedDishBorder: '#b91c1c',
    uncoveredRedDishRing: 'rgba(220, 38, 38, 0.35)',
    uncoveredRedTextColor: '#b91c1c',
    uncoveredRedTextShadow: 'drop-shadow(0 1.2px 0px rgba(255,255,255,0.95)) drop-shadow(0 -1px 0.8px rgba(136,19,19,0.75)) drop-shadow(0 2px 2px rgba(0,0,0,0.25))',

    uncoveredBlackBg: 'radial-gradient(circle at 35% 26%, #ffffff 0%, #fefcf5 25%, #f5ecdb 62%, #d8be96 90%, #8c6a38 100%)',
    uncoveredBlackBorder: '#8c6a38',
    uncoveredBlackShadow3D: '0 1.2px 0 #b39b75, 0 3px 0 #9c835c, 0 5.5px 0 #7a633f, 0 8.2px 1px #3b2c17, 0 10px 12px rgba(0,0,0,0.46)',
    uncoveredBlackShadow3DSelected: '0 2px 0 #b39b75, 0 4.5px 0 #9c835c, 0 7.5px 0 #695232, 0 11.5px 15px rgba(0,0,0,0.6)',
    uncoveredBlackDishBg: 'radial-gradient(circle at 38% 32%, #ffffff 0%, #fbf6ec 58%, #ede1cb 100%)',
    uncoveredBlackDishBorder: '#1c1917',
    uncoveredBlackDishRing: 'rgba(217, 119, 6, 0.45)',
    uncoveredBlackTextColor: '#18181b',
    uncoveredBlackTextShadow: 'drop-shadow(0 1.2px 0px rgba(255,255,255,0.95)) drop-shadow(0 -1px 0.8px rgba(0,0,0,0.8)) drop-shadow(0 2px 2px rgba(0,0,0,0.25))',
  },

  // 2. BẠCH NGỌC & HẮC THẠCH (Imperial Jade & Black Obsidian)
  bach_ngoc: {
    coveredBg: 'radial-gradient(circle at 35% 26%, #ffffff 0%, #f1f5f9 35%, #cbd5e1 70%, #94a3b8 95%, #475569 100%)',
    coveredBorder: '#334155',
    coveredShadow3D: '0 1.2px 0 #64748b, 0 3px 0 #475569, 0 5.5px 0 #334155, 0 8.2px 1px #0f172a, 0 10px 12px rgba(0,0,0,0.5)',
    coveredShadow3DSelected: '0 2px 0 #64748b, 0 4.5px 0 #475569, 0 7.5px 0 #1e293b, 0 11.5px 15px rgba(0,0,0,0.65)',
    coveredDishBg: 'radial-gradient(circle at 38% 32%, #f8fafc 0%, #e2e8f0 55%, #94a3b8 100%)',
    coveredDishBorderRed: '#ef4444',
    coveredDishBorderBlack: '#0f172a',
    coveredEmblemStroke: '#334155',
    coveredEmblemRay: '#0284c7',
    coveredEmblemCenter: '#0ea5e9',
    coveredEmblemDash: 'rgba(14, 165, 233, 0.7)',

    uncoveredRedBg: 'radial-gradient(circle at 35% 26%, #ffffff 0%, #f8fafc 35%, #e2e8f0 75%, #cbd5e1 100%)',
    uncoveredRedBorder: '#d97706',
    uncoveredRedShadow3D: '0 1.2px 0 #e2e8f0, 0 3px 0 #cbd5e1, 0 5.5px 0 #94a3b8, 0 8.2px 1px #475569, 0 10px 12px rgba(0,0,0,0.4)',
    uncoveredRedShadow3DSelected: '0 2px 0 #f1f5f9, 0 4.5px 0 #cbd5e1, 0 7.5px 0 #94a3b8, 0 11.5px 15px rgba(0,0,0,0.55)',
    uncoveredRedDishBg: 'radial-gradient(circle at 38% 32%, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)',
    uncoveredRedDishBorder: '#dc2626',
    uncoveredRedDishRing: 'rgba(234, 179, 8, 0.65)',
    uncoveredRedTextColor: '#dc2626',
    uncoveredRedTextShadow: 'drop-shadow(0 1.2px 0px rgba(255,255,255,1)) drop-shadow(0 -1px 0.8px rgba(185,28,28,0.8)) drop-shadow(0 0 6px rgba(239,68,68,0.35))',

    uncoveredBlackBg: 'radial-gradient(circle at 35% 26%, #64748b 0%, #334155 35%, #1e293b 70%, #0f172a 90%, #020617 100%)',
    uncoveredBlackBorder: '#94a3b8',
    uncoveredBlackShadow3D: '0 1.2px 0 #475569, 0 3px 0 #334155, 0 5.5px 0 #1e293b, 0 8.2px 1px #020617, 0 10px 14px rgba(0,0,0,0.7)',
    uncoveredBlackShadow3DSelected: '0 2px 0 #64748b, 0 4.5px 0 #334155, 0 7.5px 0 #0f172a, 0 11.5px 16px rgba(0,0,0,0.8)',
    uncoveredBlackDishBg: 'radial-gradient(circle at 38% 32%, #334155 0%, #1e293b 55%, #090d16 100%)',
    uncoveredBlackDishBorder: '#94a3b8',
    uncoveredBlackDishRing: 'rgba(226, 232, 240, 0.55)',
    uncoveredBlackTextColor: '#f8fafc',
    uncoveredBlackTextShadow: 'drop-shadow(0 1.2px 0px rgba(0,0,0,0.95)) drop-shadow(0 -0.8px 0.6px rgba(255,255,255,0.7)) drop-shadow(0 0 8px rgba(248,250,252,0.65))',
  },

  // 3. HOÀNG ĐỒNG CHIẾN TRẬN (Imperial Antique Bronze & Gold)
  dong_co: {
    coveredBg: 'radial-gradient(circle at 35% 26%, #fef08a 0%, #eab308 28%, #ca8a04 60%, #854d0e 88%, #422006 100%)',
    coveredBorder: '#713f12',
    coveredShadow3D: '0 1.2px 0 #a16207, 0 3px 0 #854d0e, 0 5.5px 0 #713f12, 0 8.2px 1px #2e1502, 0 10px 12px rgba(0,0,0,0.5)',
    coveredShadow3DSelected: '0 2px 0 #ca8a04, 0 4.5px 0 #a16207, 0 7.5px 0 #582a05, 0 11.5px 15px rgba(0,0,0,0.65)',
    coveredDishBg: 'radial-gradient(circle at 38% 32%, #fef9c3 0%, #fde047 50%, #ca8a04 100%)',
    coveredDishBorderRed: '#991b1b',
    coveredDishBorderBlack: '#1c1917',
    coveredEmblemStroke: '#713f12',
    coveredEmblemRay: '#b45309',
    coveredEmblemCenter: '#d97706',
    coveredEmblemDash: 'rgba(161, 98, 7, 0.85)',

    uncoveredRedBg: 'radial-gradient(circle at 35% 26%, #fed7aa 0%, #fdba74 25%, #f97316 65%, #c2410c 90%, #7c2d12 100%)',
    uncoveredRedBorder: '#9a3412',
    uncoveredRedShadow3D: '0 1.2px 0 #c2410c, 0 3px 0 #9a3412, 0 5.5px 0 #7c2d12, 0 8.2px 1px #431407, 0 10px 12px rgba(0,0,0,0.48)',
    uncoveredRedShadow3DSelected: '0 2px 0 #ea580c, 0 4.5px 0 #c2410c, 0 7.5px 0 #7c2d12, 0 11.5px 15px rgba(0,0,0,0.62)',
    uncoveredRedDishBg: 'radial-gradient(circle at 38% 32%, #ffedd5 0%, #fed7aa 55%, #ea580c 100%)',
    uncoveredRedDishBorder: '#7f1d1d',
    uncoveredRedDishRing: 'rgba(254, 240, 138, 0.7)',
    uncoveredRedTextColor: '#7f1d1d',
    uncoveredRedTextShadow: 'drop-shadow(0 1.2px 0px rgba(254,240,138,0.9)) drop-shadow(0 -1px 0.8px rgba(69,10,10,0.85)) drop-shadow(0 2px 3px rgba(0,0,0,0.35))',

    uncoveredBlackBg: 'radial-gradient(circle at 35% 26%, #94a3b8 0%, #64748b 28%, #475569 65%, #1e293b 90%, #0f172a 100%)',
    uncoveredBlackBorder: '#334155',
    uncoveredBlackShadow3D: '0 1.2px 0 #475569, 0 3px 0 #334155, 0 5.5px 0 #1e293b, 0 8.2px 1px #020617, 0 10px 14px rgba(0,0,0,0.65)',
    uncoveredBlackShadow3DSelected: '0 2px 0 #64748b, 0 4.5px 0 #475569, 0 7.5px 0 #1e293b, 0 11.5px 16px rgba(0,0,0,0.75)',
    uncoveredBlackDishBg: 'radial-gradient(circle at 38% 32%, #475569 0%, #334155 55%, #111827 100%)',
    uncoveredBlackDishBorder: '#eab308',
    uncoveredBlackDishRing: 'rgba(253, 224, 71, 0.6)',
    uncoveredBlackTextColor: '#fef08a',
    uncoveredBlackTextShadow: 'drop-shadow(0 1.2px 0px rgba(0,0,0,0.95)) drop-shadow(0 -0.8px 0.6px rgba(234,179,8,0.7)) drop-shadow(0 0 6px rgba(234,179,8,0.45))',
  },

  // 4. GỐM SỨ MEN LAM CỔ (Ming Porcelain)
  gom_su: {
    coveredBg: 'radial-gradient(circle at 35% 26%, #ffffff 0%, #f8fafc 35%, #e0f2fe 70%, #bae6fd 92%, #7dd3fc 100%)',
    coveredBorder: '#0284c7',
    coveredShadow3D: '0 1.2px 0 #38bdf8, 0 3px 0 #0284c7, 0 5.5px 0 #0369a1, 0 8.2px 1px #075985, 0 10px 12px rgba(2,132,199,0.3)',
    coveredShadow3DSelected: '0 2px 0 #38bdf8, 0 4.5px 0 #0284c7, 0 7.5px 0 #075985, 0 11.5px 15px rgba(2,132,199,0.45)',
    coveredDishBg: 'radial-gradient(circle at 38% 32%, #ffffff 0%, #f0f9ff 60%, #e0f2fe 100%)',
    coveredDishBorderRed: '#ef4444',
    coveredDishBorderBlack: '#1d4ed8',
    coveredEmblemStroke: '#0284c7',
    coveredEmblemRay: '#0369a1',
    coveredEmblemCenter: '#0284c7',
    coveredEmblemDash: 'rgba(2, 132, 199, 0.6)',

    uncoveredRedBg: 'radial-gradient(circle at 35% 26%, #ffffff 0%, #fff1f2 35%, #ffe4e6 75%, #fecdd3 100%)',
    uncoveredRedBorder: '#e11d48',
    uncoveredRedShadow3D: '0 1.2px 0 #f43f5e, 0 3px 0 #e11d48, 0 5.5px 0 #be123c, 0 8.2px 1px #881337, 0 10px 12px rgba(225,29,72,0.3)',
    uncoveredRedShadow3DSelected: '0 2px 0 #fb7185, 0 4.5px 0 #e11d48, 0 7.5px 0 #9f1239, 0 11.5px 15px rgba(225,29,72,0.45)',
    uncoveredRedDishBg: 'radial-gradient(circle at 38% 32%, #ffffff 0%, #fff1f2 60%, #ffe4e6 100%)',
    uncoveredRedDishBorder: '#be123c',
    uncoveredRedDishRing: 'rgba(225, 29, 72, 0.45)',
    uncoveredRedTextColor: '#be123c',
    uncoveredRedTextShadow: 'drop-shadow(0 1.2px 0px rgba(255,255,255,1)) drop-shadow(0 -1px 0.8px rgba(136,19,55,0.75))',

    uncoveredBlackBg: 'radial-gradient(circle at 35% 26%, #ffffff 0%, #f0f9ff 35%, #e0f2fe 75%, #bae6fd 100%)',
    uncoveredBlackBorder: '#1d4ed8',
    uncoveredBlackShadow3D: '0 1.2px 0 #3b82f6, 0 3px 0 #1d4ed8, 0 5.5px 0 #1e40af, 0 8.2px 1px #172554, 0 10px 12px rgba(29,78,216,0.3)',
    uncoveredBlackShadow3DSelected: '0 2px 0 #60a5fa, 0 4.5px 0 #1d4ed8, 0 7.5px 0 #1e3a8a, 0 11.5px 15px rgba(29,78,216,0.45)',
    uncoveredBlackDishBg: 'radial-gradient(circle at 38% 32%, #ffffff 0%, #eff6ff 60%, #dbeafe 100%)',
    uncoveredBlackDishBorder: '#1e40af',
    uncoveredBlackDishRing: 'rgba(29, 78, 216, 0.45)',
    uncoveredBlackTextColor: '#1e3a8a',
    uncoveredBlackTextShadow: 'drop-shadow(0 1.2px 0px rgba(255,255,255,1)) drop-shadow(0 -1px 0.8px rgba(30,58,138,0.8))',
  },

  // 5. HỔ PHÁCH & THẠCH ANH (Amber & Amethyst Crystal)
  thach_anh: {
    coveredBg: 'radial-gradient(circle at 35% 26%, #fed7aa 0%, #fb923c 30%, #ea580c 65%, #c2410c 88%, #7c2d12 100%)',
    coveredBorder: '#9a3412',
    coveredShadow3D: '0 1.2px 0 #ea580c, 0 3px 0 #c2410c, 0 5.5px 0 #9a3412, 0 8.2px 1px #431407, 0 10px 14px rgba(234,88,12,0.45)',
    coveredShadow3DSelected: '0 2px 0 #f97316, 0 4.5px 0 #ea580c, 0 7.5px 0 #9a3412, 0 11.5px 16px rgba(234,88,12,0.6)',
    coveredDishBg: 'radial-gradient(circle at 38% 32%, #ffedd5 0%, #fed7aa 55%, #ea580c 100%)',
    coveredDishBorderRed: '#ef4444',
    coveredDishBorderBlack: '#a855f7',
    coveredEmblemStroke: '#7c2d12',
    coveredEmblemRay: '#ea580c',
    coveredEmblemCenter: '#fed7aa',
    coveredEmblemDash: 'rgba(255, 237, 213, 0.75)',

    uncoveredRedBg: 'radial-gradient(circle at 35% 26%, #fed7aa 0%, #fb923c 30%, #ea580c 68%, #9a3412 100%)',
    uncoveredRedBorder: '#fdba74',
    uncoveredRedShadow3D: '0 1.2px 0 #ea580c, 0 3px 0 #c2410c, 0 5.5px 0 #9a3412, 0 8.2px 1px #431407, 0 10px 12px rgba(234,88,12,0.4)',
    uncoveredRedShadow3DSelected: '0 2px 0 #f97316, 0 4.5px 0 #ea580c, 0 7.5px 0 #9a3412, 0 11.5px 15px rgba(234,88,12,0.55)',
    uncoveredRedDishBg: 'radial-gradient(circle at 38% 32%, #fff7ed 0%, #ffedd5 55%, #fdba74 100%)',
    uncoveredRedDishBorder: '#dc2626',
    uncoveredRedDishRing: 'rgba(234, 88, 12, 0.55)',
    uncoveredRedTextColor: '#b91c1c',
    uncoveredRedTextShadow: 'drop-shadow(0 1.2px 0px rgba(255,255,255,0.95)) drop-shadow(0 0 8px rgba(249,115,22,0.65))',

    uncoveredBlackBg: 'radial-gradient(circle at 35% 26%, #f3e8ff 0%, #d8b4fe 30%, #a855f7 68%, #6b21a8 100%)',
    uncoveredBlackBorder: '#c084fc',
    uncoveredBlackShadow3D: '0 1.2px 0 #9333ea, 0 3px 0 #7e22ce, 0 5.5px 0 #581c87, 0 8.2px 1px #3b0764, 0 10px 14px rgba(147,51,234,0.45)',
    uncoveredBlackShadow3DSelected: '0 2px 0 #a855f7, 0 4.5px 0 #9333ea, 0 7.5px 0 #581c87, 0 11.5px 16px rgba(147,51,234,0.6)',
    uncoveredBlackDishBg: 'radial-gradient(circle at 38% 32%, #faf5ff 0%, #f3e8ff 55%, #e9d5ff 100%)',
    uncoveredBlackDishBorder: '#581c87',
    uncoveredBlackDishRing: 'rgba(168, 85, 247, 0.55)',
    uncoveredBlackTextColor: '#581c87',
    uncoveredBlackTextShadow: 'drop-shadow(0 1.2px 0px rgba(255,255,255,0.95)) drop-shadow(0 0 8px rgba(168,85,247,0.75))',
  },

  // 6. GỖ GIANG HỒ SỨT MẺ (Weathered, Dirty & Chipped Street Chess)
  giang_ho: {
    coveredBg: 'radial-gradient(circle at 35% 26%, #bfa17c 0%, #a0815a 30%, #7e603b 68%, #573e21 92%, #382512 100%)',
    coveredBorder: '#361e0b',
    coveredShadow3D: '0 1.2px 0 #54371c, 0 3px 0 #3f2611, 0 5.5px 0 #2c1809, 0 8.2px 1px #150903, 0 10px 12px rgba(0,0,0,0.65)',
    coveredShadow3DSelected: '0 2px 0 #54371c, 0 4.5px 0 #3f2611, 0 7.5px 0 #251205, 0 11.5px 15px rgba(0,0,0,0.75)',
    coveredDishBg: 'radial-gradient(circle at 38% 32%, #a88862 0%, #8a6a45 55%, #614526 100%)',
    coveredDishBorderRed: '#731616',
    coveredDishBorderBlack: '#1c1917',
    coveredEmblemStroke: '#3a200b',
    coveredEmblemRay: '#633a18',
    coveredEmblemCenter: '#824e23',
    coveredEmblemDash: 'rgba(99, 58, 24, 0.8)',

    uncoveredRedBg: 'radial-gradient(circle at 35% 26%, #d6ba99 0%, #bb9b77 28%, #977651 65%, #705130 92%, #452f18 100%)',
    uncoveredRedBorder: '#422812',
    uncoveredRedShadow3D: '0 1.2px 0 #694a2b, 0 3px 0 #52351b, 0 5.5px 0 #38210e, 0 8.2px 1px #1a0c04, 0 10px 12px rgba(0,0,0,0.62)',
    uncoveredRedShadow3DSelected: '0 2px 0 #694a2b, 0 4.5px 0 #52351b, 0 7.5px 0 #2d1808, 0 11.5px 15px rgba(0,0,0,0.72)',
    uncoveredRedDishBg: 'radial-gradient(circle at 38% 32%, #caa883 0%, #ae8b66 58%, #82613e 100%)',
    uncoveredRedDishBorder: '#781515',
    uncoveredRedDishRing: 'rgba(138, 22, 22, 0.55)',
    uncoveredRedTextColor: '#7a1212',
    uncoveredRedTextShadow: 'drop-shadow(0 1px 0px rgba(225,190,155,0.65)) drop-shadow(0 -1px 0.8px rgba(50,8,8,0.9)) drop-shadow(0 1.5px 2px rgba(0,0,0,0.5))',

    uncoveredBlackBg: 'radial-gradient(circle at 35% 26%, #cbb090 0%, #b0916d 28%, #8d6e4b 65%, #664929 92%, #3d2714 100%)',
    uncoveredBlackBorder: '#331e0c',
    uncoveredBlackShadow3D: '0 1.2px 0 #5b3e21, 0 3px 0 #452c14, 0 5.5px 0 #2d1b0a, 0 8.2px 1px #140902, 0 10px 12px rgba(0,0,0,0.62)',
    uncoveredBlackShadow3DSelected: '0 2px 0 #5b3e21, 0 4.5px 0 #452c14, 0 7.5px 0 #261405, 0 11.5px 15px rgba(0,0,0,0.72)',
    uncoveredBlackDishBg: 'radial-gradient(circle at 38% 32%, #bfa280 0%, #a1835f 58%, #795b3a 100%)',
    uncoveredBlackDishBorder: '#1c1917',
    uncoveredBlackDishRing: 'rgba(35, 20, 10, 0.6)',
    uncoveredBlackTextColor: '#141210',
    uncoveredBlackTextShadow: 'drop-shadow(0 1px 0px rgba(215,180,145,0.65)) drop-shadow(0 -1px 0.8px rgba(0,0,0,0.95)) drop-shadow(0 1.5px 2px rgba(0,0,0,0.5))',
  },
};

const ChessPieceComponent: React.FC<ChessPieceProps> = ({
  piece,
  isSelected = false,
  isLastMove = false,
  isInCheck = false,
  displayMode = 'both',
  size,
  is3D = false,
  theme = 'hoang_kim',
}) => {
  const isRed = piece.color === 'red';
  const styleCfg = PIECE_STYLES[theme] || PIECE_STYLES.hoang_kim;

  // Weathering for Giang Ho theme: chipped rim notches, knife scratches, dust specks
  const isGiangHo = theme === 'giang_ho';
  const isQuanChuan = theme === 'quan_chuan';
  const weathering = React.useMemo(() => {
    if (!isGiangHo) return null;
    const str = `${piece.id}-${piece.color}-${piece.trueRole}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    const uHash = Math.abs(hash);

    // Two distinct chip angles on the rim (in radians)
    const deg1 = uHash % 360;
    const deg2 = (deg1 + 115 + (uHash % 130)) % 360;
    const rad1 = (deg1 * Math.PI) / 180;
    const rad2 = (deg2 * Math.PI) / 180;

    const R = 48.5; // Outer edge radius on 100x100 viewBox
    const c1x = 50 + R * Math.cos(rad1);
    const c1y = 50 + R * Math.sin(rad1);
    const n1x = -Math.sin(rad1) * 5.5;
    const n1y = Math.cos(rad1) * 5.5;
    const d1x = -Math.cos(rad1) * 7.5;
    const d1y = -Math.sin(rad1) * 7.5;

    const c2x = 50 + R * Math.cos(rad2);
    const c2y = 50 + R * Math.sin(rad2);
    const n2x = -Math.sin(rad2) * 4.5;
    const n2y = Math.cos(rad2) * 4.5;
    const d2x = -Math.cos(rad2) * 5.5;
    const d2y = -Math.sin(rad2) * 5.5;

    const scX1 = 28 + (uHash % 16);
    const scY1 = 34 + ((uHash >> 2) % 18);
    const scX2 = scX1 + 16 + (uHash % 14);
    const scY2 = scY1 + 8 + ((uHash >> 3) % 12);

    return {
      c1: {
        p1: `${(c1x - n1x).toFixed(1)},${(c1y - n1y).toFixed(1)}`,
        p2: `${(c1x + d1x).toFixed(1)},${(c1y + d1y).toFixed(1)}`,
        p3: `${(c1x + n1x).toFixed(1)},${(c1y + n1y).toFixed(1)}`,
        x: c1x.toFixed(1),
        y: c1y.toFixed(1),
        ix: (c1x + d1x * 0.6).toFixed(1),
        iy: (c1y + d1y * 0.6).toFixed(1),
      },
      c2: {
        p1: `${(c2x - n2x).toFixed(1)},${(c2y - n2y).toFixed(1)}`,
        p2: `${(c2x + d2x).toFixed(1)},${(c2y + d2y).toFixed(1)}`,
        p3: `${(c2x + n2x).toFixed(1)},${(c2y + n2y).toFixed(1)}`,
      },
      scratches: [
        { x1: scX1, y1: scY1, x2: scX2, y2: scY2 },
        { x1: 56 - (uHash % 10), y1: 64, x2: 72, y2: 70 },
      ],
      dustSpots: [
        { cx: 32 + (uHash % 12), cy: 68 - (uHash % 10), r: 2.8 },
        { cx: 68 - ((uHash >> 2) % 12), cy: 30 + ((uHash >> 3) % 10), r: 2.2 },
        { cx: 48, cy: 76, r: 1.8 },
      ],
    };
  }, [isGiangHo, piece.id, piece.color, piece.trueRole]);

  // 1. COVERED PIECE (QUÂN ÚP)
  if (piece.isCovered) {
    if (isQuanChuan) {
      const qcShadow3D = isRed
        ? '0 1.2px 0 #dc2626, 0 2.8px 0 #b91c1c, 0 4.8px 0 #991b1b, 0 7.2px 0 #7f1d1d, 0 9.8px 1px #450a0a, 0 12px 14px rgba(0,0,0,0.55)'
        : '0 1.2px 0 #0284c7, 0 2.8px 0 #0369a1, 0 4.8px 0 #1e40af, 0 7.2px 0 #1e3a8a, 0 9.8px 1px #0f172a, 0 12px 14px rgba(0,0,0,0.55)';
      const qcShadow3DSelected = isRed
        ? '0 1.2px 0 #ef4444, 0 2.5px 0 #dc2626, 0 3.8px 0 #991b1b, 0 8px 18px rgba(0,0,0,0.45)'
        : '0 1.2px 0 #38bdf8, 0 2.5px 0 #0284c7, 0 3.8px 0 #1e40af, 0 8px 18px rgba(0,0,0,0.45)';

      return (
        <div
          className="relative flex items-center justify-center select-none w-full h-full aspect-square pointer-events-none transition-transform duration-150"
          style={{
            width: size ? `${size}px` : '100%',
            height: size ? `${size}px` : '100%',
            aspectRatio: '1 / 1',
            willChange: isSelected ? 'transform' : 'auto',
          }}
        >
          {/* Soft Contact Shadow cast on board surface - Chỉ hiển thị ở 3D */}
          {!isSelected && is3D && (
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-[84%] h-[18%] rounded-full pointer-events-none transition-all duration-200"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.18) 55%, transparent 75%)',
              }}
            />
          )}

          {/* Physical 3D Coca-Cola Fluted Cap Cylinder Body */}
          <div
            className={`w-full h-full aspect-square rounded-full flex items-center justify-center relative transition-transform duration-200 pointer-events-none ${
              isLastMove ? 'ring-2 ring-amber-400' : ''
            }`}
            style={{
              background: isRed
                ? 'radial-gradient(circle at 35% 26%, #f87171 0%, #dc2626 25%, #b91c1c 60%, #7f1d1d 88%, #450a0a 100%)'
                : 'radial-gradient(circle at 35% 26%, #38bdf8 0%, #0284c7 25%, #1e40af 60%, #172554 88%, #0f172a 100%)',
              border: isRed ? '2px solid #ef4444' : '2px solid #38bdf8',
              boxShadow: isSelected
                ? is3D
                  ? qcShadow3DSelected
                  : 'none'
                : is3D
                ? qcShadow3D
                : 'none',
              transform: isSelected
                ? is3D ? 'translateY(-22px) scale(1.08)' : 'translateY(-14px) scale(1.06)'
                : is3D ? 'translateY(-4px)' : 'none',
              backfaceVisibility: 'hidden',
            }}
          >
            {/* Top Bevel Highlight Rim */}
            <div className="absolute inset-[1.5px] rounded-full border border-white/60 pointer-events-none" />

            {/* Gloss Specular Sheen across dome */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none opacity-30"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.15) 30%, transparent 60%)',
              }}
            />

            {/* Smooth Embossed Metallic Bevel Rim - Dong nhat, khong khia xam */}
            <div
              className="absolute inset-[2.5px] rounded-full pointer-events-none"
              style={{
                border: isRed ? '2px solid rgba(254, 202, 202, 0.6)' : '2px solid rgba(186, 230, 253, 0.6)',
                boxShadow: isRed
                  ? 'inset 0 1.5px 3px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(69,10,10,0.7)'
                  : 'inset 0 1.5px 3px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(15,23,42,0.7)',
              }}
            />

            {/* Smooth Fillet Shoulder */}
            <div className="absolute inset-[3.5px] rounded-full border border-white/40 pointer-events-none" />

            {/* Raised Flat Top Plateau (75% Diameter) with Golden Lotus Rosette */}
            <div
              className="w-[75%] h-[75%] aspect-square rounded-full flex items-center justify-center relative pointer-events-none"
              style={{
                background: isRed
                  ? 'radial-gradient(circle at 38% 30%, #ef4444 0%, #dc2626 30%, #b91c1c 65%, #7f1d1d 100%)'
                  : 'radial-gradient(circle at 38% 30%, #38bdf8 0%, #0284c7 30%, #1e40af 65%, #172554 100%)',
                border: isRed ? '2px solid #fca5a5' : '2px solid #bae6fd',
                boxShadow: is3D
                  ? (isRed
                      ? '0 2.5px 0 #7f1d1d, 0 4px 6px rgba(0,0,0,0.5), inset 0 1.5px 2px rgba(255,255,255,0.6)'
                      : '0 2.5px 0 #172554, 0 4px 6px rgba(0,0,0,0.5), inset 0 1.5px 2px rgba(255,255,255,0.6)')
                  : 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(255,255,255,0.4)',
                transform: is3D ? 'translateY(-2px)' : 'none',
              }}
            >
              {/* Phù hiệu hoa sen bát giác mạ vàng (Golden Lotus Rosette) */}
              <svg viewBox="0 0 100 100" className="w-[72%] h-[72%] pointer-events-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.7)]">
                <defs>
                  <radialGradient id={`goldLotusGrad-${piece.id}`} cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#fffbeb" />
                    <stop offset="35%" stopColor="#fde68a" />
                    <stop offset="70%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="44" fill="none" stroke={`url(#goldLotusGrad-${piece.id})`} strokeWidth="2.4" />
                <circle cx="50" cy="50" r="39" fill="none" stroke={`url(#goldLotusGrad-${piece.id})`} strokeWidth="0.8" opacity="0.75" />
                <g fill={`url(#goldLotusGrad-${piece.id})`} stroke="#78350f" strokeWidth="0.8">
                  <path d="M 50 14 C 44 26 44 34 50 42 C 56 34 56 26 50 14 Z" />
                  <path d="M 50 86 C 44 74 44 66 50 58 C 56 66 56 74 50 86 Z" />
                  <path d="M 14 50 C 26 44 34 44 42 50 C 34 56 26 56 14 50 Z" />
                  <path d="M 86 50 C 74 44 66 44 58 50 C 66 56 74 56 86 50 Z" />
                  <path d="M 50 18 C 45 28 45 35 50 42 C 55 35 55 28 50 18 Z" transform="rotate(45 50 50)" />
                  <path d="M 50 18 C 45 28 45 35 50 42 C 55 35 55 28 50 18 Z" transform="rotate(135 50 50)" />
                  <path d="M 50 18 C 45 28 45 35 50 42 C 55 35 55 28 50 18 Z" transform="rotate(225 50 50)" />
                  <path d="M 50 18 C 45 28 45 35 50 42 C 55 35 55 28 50 18 Z" transform="rotate(315 50 50)" />
                </g>
                <circle cx="50" cy="50" r="10" fill={`url(#goldLotusGrad-${piece.id})`} stroke="#78350f" strokeWidth="1.2" />
                <circle cx="50" cy="50" r="4" fill="#78350f" />
              </svg>
            </div>
          </div>
        </div>      );
    }

    return (
      <div
        className="relative flex items-center justify-center select-none w-full h-full aspect-square pointer-events-none transition-transform duration-150"
        style={{
          width: size ? `${size}px` : '100%',
          height: size ? `${size}px` : '100%',
          aspectRatio: '1 / 1',
          willChange: isSelected ? 'transform' : 'auto',
        }}
      >
        {/* Soft Contact Shadow cast on board surface - Chỉ hiển thị ở 3D */}
        {is3D && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-200 ${
              isSelected
                ? '-bottom-4 w-[92%] h-[24%]'
                : '-bottom-1.5 w-[82%] h-[16%]'
            }`}
          style={{
            background: isSelected
              ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 50%, transparent 75%)'
              : 'radial-gradient(ellipse at center, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.12) 55%, transparent 75%)',
          }}
        />
        )}

        {/* Physical 3D Token Cylinder */}
        <div
          className={`w-full h-full aspect-square rounded-full flex items-center justify-center relative transition-transform duration-200 pointer-events-none ${
            isLastMove ? 'ring-2 ring-amber-400' : ''
          }`}
          style={{
            background: isRed
              ? 'radial-gradient(circle at 35% 26%, #99241e 0%, #7d1a15 35%, #59100d 72%, #380705 100%)'
              : 'radial-gradient(circle at 35% 26%, #334155 0%, #1e293b 35%, #0f172a 72%, #020617 100%)',
            border: isRed ? '3px solid #ef4444' : '3px solid #38bdf8',
            boxShadow: isSelected
              ? is3D
                ? styleCfg.coveredShadow3DSelected
                : 'none'
              : is3D
              ? styleCfg.coveredShadow3D
              : 'none',
            transform: isSelected
              ? is3D
                ? 'translateY(-16px) scale(1.10)'
                : 'translateY(-12px) scale(1.08)'
              : is3D
              ? 'translateY(-4px)'
              : 'none',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Top Bevel Highlight Rim */}
          <div className="absolute inset-[1.5px] rounded-full border border-white/65 pointer-events-none" />

          {/* Gloss Specular Sheen */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none opacity-40"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.12) 32%, transparent 60%)',
            }}
          />

          {/* Recessed Lathe-Turned Dish */}
          <div
            className="w-[82%] h-[82%] aspect-square rounded-full flex items-center justify-center relative pointer-events-none overflow-hidden"
            style={{
              border: isRed ? '6px solid #ef4444' : '6px solid #38bdf8',
              background: isRed
                ? 'radial-gradient(circle at 36% 30%, #7f1d1d 0%, #521111 60%, #350808 100%)'
                : 'radial-gradient(circle at 36% 30%, #1e293b 0%, #0f172a 60%, #020617 100%)',
              boxShadow: isRed
                ? 'inset 0 3px 6px rgba(0,0,0,0.7), 0 0 12px rgba(239,68,68,0.55)'
                : 'inset 0 3px 6px rgba(0,0,0,0.8), 0 0 12px rgba(56,189,248,0.5)',
            }}
          >
                        {/* Đồng bộ chuẩn cờ úp: Mặt lưng nắp úp trơn nhẵn bóng nhẹ + Chấm tâm tròn nổi bật tách biệt Đỏ/Đen */}
            <div className="w-full h-full flex items-center justify-center relative pointer-events-none">
              {/* Vệt bóng cong nhẹ tự nhiên trên mặt lưng nắp */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none opacity-30"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 40%, transparent 65%)',
                }}
              />

              {/* Vòng chỉ viền mờ đồng tâm mảnh */}
              <div
                className="absolute inset-[6px] rounded-full pointer-events-none"
                style={{
                  border: isRed ? '1px dashed rgba(254, 202, 202, 0.25)' : '1px dashed rgba(186, 230, 253, 0.25)',
                }}
              />

              {/* Chấm tâm tròn chính giữa lưng nắp: Đỏ tươi cho phe Đỏ, Tối viền lam bạc cho phe Đen */}
              <div
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center relative shadow-md transition-transform"
                style={{
                  background: isRed
                    ? 'radial-gradient(circle at 35% 30%, #f87171 0%, #dc2626 55%, #991b1b 100%)'
                    : 'radial-gradient(circle at 35% 30%, #475569 0%, #1e293b 55%, #020617 100%)',
                  border: isRed ? '2.5px solid #fee2e2' : '2.5px solid #7dd3fc',
                  boxShadow: isRed
                    ? '0 1px 3px rgba(0,0,0,0.6), 0 0 8px rgba(239,68,68,0.75)'
                    : '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(56,189,248,0.6)',
                }}
              >
                {/* Điểm sáng phản chiếu trên chấm tâm */}
                <div
                  className="w-1.5 h-1.5 rounded-full absolute top-0.5 left-0.5 opacity-85"
                  style={{
                    background: isRed ? '#ffffff' : '#38bdf8',
                  }}
                />
              </div>
            </div>
          </div>

          
        </div>
      </div>
    );
  }

  // 2. UNCOVERED PIECE (QUÂN NGỬA)
  const role = piece.trueRole;
  const hanChar = ROLE_HAN_CHARACTERS[role] ? ROLE_HAN_CHARACTERS[role][piece.color] : '?';
  const viName = ROLE_VI_NAMES[role] ? ROLE_VI_NAMES[role][piece.color] : '';

  const activeBg = isRed ? styleCfg.uncoveredRedBg : styleCfg.uncoveredBlackBg;
  const activeBorder = isRed ? styleCfg.uncoveredRedBorder : styleCfg.uncoveredBlackBorder;
  const activeDishBg = isRed ? styleCfg.uncoveredRedDishBg : styleCfg.uncoveredBlackDishBg;
  const activeDishBorder = isRed ? styleCfg.uncoveredRedDishBorder : styleCfg.uncoveredBlackDishBorder;
  const activeDishRing = isRed ? styleCfg.uncoveredRedDishRing : styleCfg.uncoveredBlackDishRing;
  const activeTextColor = isRed ? styleCfg.uncoveredRedTextColor : styleCfg.uncoveredBlackTextColor;
  const activeTextShadow = isRed ? styleCfg.uncoveredRedTextShadow : styleCfg.uncoveredBlackTextShadow;
  const activeShadow3D = isRed ? styleCfg.uncoveredRedShadow3D : styleCfg.uncoveredBlackShadow3D;
  const activeShadow3DSelected = isRed ? styleCfg.uncoveredRedShadow3DSelected : styleCfg.uncoveredBlackShadow3DSelected;

  return (
    <div
      className="relative flex items-center justify-center select-none w-full h-full aspect-square pointer-events-none transition-transform duration-150"
      style={{
        width: size ? `${size}px` : '100%',
        height: size ? `${size}px` : '100%',
        aspectRatio: '1 / 1',
        willChange: isSelected ? 'transform' : 'auto',
      }}
    >
      {/* Soft Contact Shadow cast on board surface - Chỉ hiển thị ở 3D */}
      {is3D && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-200 ${
            isSelected
              ? '-bottom-4 w-[92%] h-[24%]'
              : '-bottom-1.5 w-[82%] h-[16%]'
          }`}
        style={{
          background: isSelected
            ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 50%, transparent 75%)'
            : 'radial-gradient(ellipse at center, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.12) 55%, transparent 75%)',
        }}
      />
      )}

      {/* Physical 3D Token Cylinder */}
      <div
        className={`w-full h-full aspect-square rounded-full flex items-center justify-center relative transition-transform duration-200 pointer-events-none ${
          isLastMove ? 'ring-2 ring-amber-400' : ''
        } ${
          isInCheck ? 'ring-3 ring-red-500 shadow-[0_0_14px_rgba(239,68,68,0.85)] animate-pulse' : ''
        }`}
        style={{
          background: activeBg,
          border: `1.8px solid ${activeBorder}`,
          boxShadow: isSelected
            ? is3D
              ? activeShadow3DSelected
              : 'none'
            : is3D
            ? activeShadow3D
            : 'none',
          transform: isSelected
            ? is3D
              ? 'translateY(-16px) scale(1.10)'
              : 'translateY(-12px) scale(1.08)'
            : is3D
            ? 'translateY(-4px)'
            : 'none',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Top Bevel Highlight Rim */}
        <div className="absolute inset-[1.5px] rounded-full border border-white/80 pointer-events-none" />

        {/* Gloss Specular Sheen */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none opacity-35"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.15) 30%, transparent 60%)',
          }}
        />

        {/* Recessed Lathe-Turned Dish */}
        <div
          className={`${isQuanChuan ? "w-[94%] h-[94%]" : "w-[82%] h-[82%]"} aspect-square rounded-full flex items-center justify-center relative pointer-events-none overflow-hidden`}
          style={{
            border: isQuanChuan ? "none" : `2px solid ${activeDishBorder}`,
            background: activeDishBg,
            boxShadow: 'inset 0 3px 6px rgba(40,25,10,0.5), 0 1px 1px rgba(255,255,255,0.85)',
          }}
        >
          {/* Subtle concentric decorative inlay ring */}
          {!isQuanChuan && (
            <div
              className="absolute inset-[2.5px] rounded-full pointer-events-none"
              style={{
                border: `1px solid ${activeDishRing}`,
              }}
            />
          )}

          {displayMode === 'vi' ? (
            <span
              className="font-black tracking-wider uppercase select-none leading-none pointer-events-none"
              style={{
                color: activeTextColor,
                fontSize: size ? `${Math.max(10, Math.round(size * (viName.length > 3 ? 0.36 : 0.42)))}px` : 'clamp(10px, 4.8cqw, 28px)',
                filter: activeTextShadow,
              }}
            >
              {viName}
            </span>
          ) : (
            /* Đồng bộ tất cả 5 bộ bàn/quân cờ: Riêng quân Sĩ (仕/士) và Xe (車) dùng glyph khắc tay chuẩn Thiên Thiên Tượng Kỳ */
            renderThienThienSvgGlyph(role, piece.color, activeTextColor, activeTextShadow) || (
              <span
                style={{
                  fontFamily: "'Xiangqi Han', 'Ma Shan Zheng', 'Noto Serif', serif",
                  fontSize: size ? `${Math.max(16, Math.round(size * (isQuanChuan ? 0.90 : 0.86)))}px` : (isQuanChuan ? 'clamp(15px, 8.4cqw, 52px)' : 'clamp(14px, 7.8cqw, 48px)'),
                  filter: activeTextShadow,
                  color: activeTextColor,
                }}
                className="leading-none font-black select-none pointer-events-none"
              >
                {hanChar}
              </span>
            )
          )}
        </div>

        {/* Giang Ho Street Chess Weathering (Sứt mẻ góc vành, vết cào xước, bụi bặm) */}
        {weathering && (
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
            {/* Primary Chip on Wooden Rim (Vết sứt mẻ vành gỗ 1) */}
            <polygon
              points={`${weathering.c1.p1} ${weathering.c1.p2} ${weathering.c1.p3}`}
              fill="#180b03"
              stroke="#0d0501"
              strokeWidth="0.8"
            />
            <line
              x1={weathering.c1.x}
              y1={weathering.c1.y}
              x2={weathering.c1.ix}
              y2={weathering.c1.iy}
              stroke="#d4a373"
              strokeWidth="0.9"
              opacity="0.85"
            />

            {/* Secondary Chip on Wooden Rim (Vết sứt mẻ vành gỗ 2) */}
            <polygon
              points={`${weathering.c2.p1} ${weathering.c2.p2} ${weathering.c2.p3}`}
              fill="#180b03"
              stroke="#0d0501"
              strokeWidth="0.7"
            />

            {/* Surface Battle Scratches (Vết xước chém cờ) */}
            {weathering.scratches.map((s, idx) => (
              <line
                key={idx}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="rgba(35, 16, 5, 0.55)"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            ))}

            {/* Sidewalk Dust & Grime Specks (Bụi bẩn bám dính) */}
            {weathering.dustSpots.map((d, idx) => (
              <circle
                key={idx}
                cx={d.cx}
                cy={d.cy}
                r={d.r}
                fill="rgba(42, 18, 4, 0.38)"
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
};

export const ChessPiece = React.memo(ChessPieceComponent, (prev, next) => {
  return (
    prev.piece.id === next.piece.id &&
    prev.piece.isCovered === next.piece.isCovered &&
    prev.piece.trueRole === next.piece.trueRole &&
    prev.piece.color === next.piece.color &&
    prev.isSelected === next.isSelected &&
    prev.isLastMove === next.isLastMove &&
    prev.isInCheck === next.isInCheck &&
    prev.displayMode === next.displayMode &&
    prev.size === next.size &&
    prev.is3D === next.is3D &&
    prev.theme === next.theme
  );
});
