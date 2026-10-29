import type { BoardTheme, PieceTheme } from '../types';

export type ChessMaterialId = 'wood' | 'ivory' | 'silver' | 'gold' | 'diamond';
export interface ChessMaterial {
  id: ChessMaterialId;
  name: string;
  icon: string;
  face: [string, string];
  rim: string;
  edge: string;
  board: [string, string];
  grid: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  cssFace: string;
  cssBody: string;
  cssGrain: string;
  impact: { frequencies: number[]; decay: number; noise: number; cutoff: number };
}

export const CHESS_MATERIALS: Record<ChessMaterialId, ChessMaterial> = {
  wood: {
    id: 'wood', name: 'Gỗ óc chó', icon: '🪵', face: ['#f4d69f', '#c58e48'], rim: '#a36a30', edge: '#59371d',
    board: ['#675041', '#34271f'], grid: '#ecd8b2', roughness: 0.62, metalness: 0, clearcoat: 0.16,
    cssFace: 'radial-gradient(circle at 32% 24%, #f4d69f, #d5a466 75%, #c58e48)',
    cssBody: 'linear-gradient(140deg, #e8bd7b, #b47c3b 58%, #75451f)',
    cssGrain: 'repeating-linear-gradient(4deg, transparent 0 7px, #60361518 8px, transparent 9px 13px)',
    impact: { frequencies: [260, 570, 1090], decay: 0.085, noise: 0.3, cutoff: 1600 },
  },
  ivory: {
    id: 'ivory', name: 'Ngà', icon: '🤍', face: ['#fffbee', '#e4d4b0'], rim: '#e5d3ad', edge: '#9d8259',
    board: ['#f4ead4', '#d8c6a4'], grid: '#69513b', roughness: 0.36, metalness: 0, clearcoat: 0.48,
    cssFace: 'radial-gradient(circle at 32% 24%, #fffef5, #f3ead6 74%, #e4d4b0)',
    cssBody: 'linear-gradient(140deg, #fffdf0, #e8d9ba 60%, #bca77e)',
    cssGrain: 'repeating-linear-gradient(85deg, transparent 0 12px, #9d825908 13px, transparent 14px 22px)',
    impact: { frequencies: [720, 1530, 2920], decay: 0.12, noise: 0.2, cutoff: 3400 },
  },
  silver: {
    id: 'silver', name: 'Bạc', icon: '🥈', face: ['#fafcfe', '#b9c4cf'], rim: '#c6d1dd', edge: '#657483',
    board: ['#c3ced9', '#8796a6'], grid: '#263646', roughness: 0.3, metalness: 0.82, clearcoat: 0.3,
    cssFace: 'linear-gradient(125deg, #fafdff, #cbd5df 25%, #ffffff 43%, #d9e2ea 62%, #a9b7c4)',
    cssBody: 'linear-gradient(120deg, #ffffff, #9aaab9 26%, #edf5fa 48%, #8293a3 72%, #d4e0e8)',
    cssGrain: 'repeating-linear-gradient(0deg, transparent 0 2px, #ffffff14 3px, #26364608 4px)',
    impact: { frequencies: [1850, 3860, 6170], decay: 0.48, noise: 0.1, cutoff: 6500 },
  },
  gold: {
    id: 'gold', name: 'Vàng', icon: '🥇', face: ['#fff1ba', '#d5ab4b'], rim: '#e0b94f', edge: '#8d6020',
    board: ['#ecd08a', '#bd9040'], grid: '#624015', roughness: 0.32, metalness: 0.78, clearcoat: 0.32,
    cssFace: 'linear-gradient(125deg, #fff6cf, #e6c36c 26%, #fff0ae 46%, #e8c76f 64%, #c59a3e)',
    cssBody: 'linear-gradient(120deg, #fff2b0, #bd8c2f 26%, #ffe69a 48%, #ad7926 74%, #e8c367)',
    cssGrain: 'repeating-linear-gradient(0deg, transparent 0 3px, #fff5c514 4px, #6a430b08 5px)',
    impact: { frequencies: [980, 2130, 3520], decay: 0.25, noise: 0.15, cutoff: 4200 },
  },
  diamond: {
    id: 'diamond', name: 'Kim cương', icon: '💎', face: ['#ffffff', '#c7e4f0'], rim: '#d6effa', edge: '#658a9c',
    board: ['#c2dce9', '#7eabba'], grid: '#284c61', roughness: 0.12, metalness: 0.05, clearcoat: 1,
    cssFace: 'conic-gradient(from 20deg, #ffffff, #d7edf6 18%, #f7fcff 30%, #cce3f0 47%, #ffffff 65%, #dbeaf7 82%, #ffffff)',
    cssBody: 'conic-gradient(from 10deg, #ffffff, #8cbcd5 12%, #f3fdff 24%, #a7c4e5 38%, #ffffff 50%, #a4d8df 64%, #e5e5ff 79%, #b6dce9 90%, #ffffff)',
    cssGrain: 'repeating-conic-gradient(from 20deg at 50% 50%, #ffffff00 0deg 28deg, #ffffff24 29deg 30deg, #365e7810 31deg 59deg, #ffffff00 60deg)',
    impact: { frequencies: [2780, 5890, 8870], decay: 0.62, noise: 0.07, cutoff: 10000 },
  },
};

const PIECE_MATERIAL: Partial<Record<PieceTheme, ChessMaterialId>> = {
  giang_ho: 'wood', hoang_kim: 'ivory', bach_ngoc: 'silver', dong_co: 'gold', gom_su: 'diamond',
};
const BOARD_MATERIAL: Partial<Record<BoardTheme, ChessMaterialId>> = {
  giang_ho: 'wood', sa_ban: 'ivory', mun_hoa: 'silver', ngoc_bich: 'gold', go_do: 'diamond',
};
export const getPieceMaterial = (theme?: PieceTheme) => CHESS_MATERIALS[PIECE_MATERIAL[theme ?? 'giang_ho'] ?? 'wood'];
export const getBoardMaterial = (theme?: BoardTheme) => CHESS_MATERIALS[BOARD_MATERIAL[theme ?? 'giang_ho'] ?? 'wood'];
