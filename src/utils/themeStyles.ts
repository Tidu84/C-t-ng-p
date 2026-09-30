/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BoardTheme, PieceTheme, ChessThemeSetId } from '../types';
export type { ChessThemeSetId };

export interface BoardThemeConfig {
  id: BoardTheme;
  name: string;
  shortName: string;
  icon: string;
  tag: string;
  description: string;
  // Board surface background
  boardBg: string;
  // Outer frame border & shadow styling
  outerBorderColor: string;
  innerGlow: string;
  outerBoxShadow3D: string;
  outerBoxShadow2D: string;
  // Grid lines & Palace diagonals
  lineStroke: string;
  lineStrokeWidth: number;
  tickStroke: string;
  // River text styling
  riverColor: string;
  // Bottom plinth styling
  plinthBg: string;
  plinthBorderTop: string;
  plinthAccentGrad: string;
  plinthTextColor: string;
  // Corner corner bracket decoration color
  cornerBracketColor: string;
}

export interface PieceThemeConfig {
  id: PieceTheme;
  name: string;
  shortName: string;
  icon: string;
  tag: string;
  description: string;
}

export const BOARD_THEME_LIST: BoardThemeConfig[] = [
  {
    id: 'giang_ho',
    name: 'Gỗ Giang Hồ Sứt Mẻ',
    shortName: 'Gỗ Giang Hồ Bụi',
    icon: '🪵',
    tag: 'Bụi bặm',
    description: 'Ván gỗ tạp sứt sẹo, vệt ố trà thuốc lá loang lổ, bụi bặm phong trần thực chiến vỉa hè',
    boardBg: 'linear-gradient(180deg, #b8986c 0%, #a07f55 25%, #85643d 55%, #6b4d29 85%, #52371a 100%)',
    outerBorderColor: '#2b1607',
    innerGlow: 'inset 0 0 0 2px rgba(40, 18, 5, 0.85), inset 0 3px 9px rgba(0,0,0,0.75)',
    outerBoxShadow3D: '0 1px 0 #3a1e0b, 0 3px 0 #2b1506, 0 6px 0 #1e0e03, 0 9px 0 #140902, 0 13px 0 #0d0501, 0 17px 0 #050200, 0 24px 34px rgba(0, 0, 0, 0.96)',
    outerBoxShadow2D: '0 4px 18px rgba(0,0,0,0.75)',
    lineStroke: '#251205',
    lineStrokeWidth: 2.4,
    tickStroke: '#3a1b08',
    riverColor: '#251104',
    plinthBg: 'linear-gradient(180deg, #2a1608 0%, #1c0e04 40%, #0d0501 100%)',
    plinthBorderTop: '1.5px solid rgba(110, 55, 14, 0.6)',
    plinthAccentGrad: 'linear-gradient(180deg, #bf9964 0%, #9e743d 35%, #663d17 80%, #301705 100%)',
    plinthTextColor: '#bf9964',
    cornerBracketColor: '#45250e',
  },
  {
    id: 'hoang_duong',
    name: 'Hoàng Dương Cổ Mộc',
    shortName: 'Gỗ Hoàng Dương',
    icon: '☕',
    tag: 'Kinh điển',
    description: 'Gỗ vàng mật ong ấm áp, vân thớ mịn màng, nẹp đồng trầm cổ kính',
    boardBg: 'linear-gradient(180deg, #fdf4e7 0%, #f1dbb8 45%, #e4c497 100%)',
    outerBorderColor: '#4a1e05',
    innerGlow: 'inset 0 0 0 1.5px rgba(245, 158, 11, 0.45), inset 0 2px 4px rgba(0,0,0,0.25)',
    outerBoxShadow3D: '0 1px 0 #542306, 0 3px 0 #451b04, 0 6px 0 #381502, 0 9px 0 #2c0f01, 0 13px 0 #200a00, 0 17px 0 #150600, 0 24px 34px rgba(0, 0, 0, 0.92)',
    outerBoxShadow2D: '0 4px 18px rgba(0,0,0,0.5)',
    lineStroke: '#5c3413',
    lineStrokeWidth: 2.2,
    tickStroke: '#78350f',
    riverColor: '#6c2e05',
    plinthBg: 'linear-gradient(180deg, #441a04 0%, #341302 40%, #200a01 80%, #120400 100%)',
    plinthBorderTop: '1.5px solid rgba(245, 158, 11, 0.45)',
    plinthAccentGrad: 'linear-gradient(180deg, #fff7df 0%, #fde68a 25%, #f59e0b 60%, #b45309 95%, #78350f 100%)',
    plinthTextColor: '#fde68a',
    cornerBracketColor: '#d97706',
  },
  {
    id: 'mun_hoa',
    name: 'Hắc Diệp Mun Hoa',
    shortName: 'Mun Đen & Bạc',
    icon: '🖤',
    tag: 'Đấu trường',
    description: 'Gỗ mun than chì huyền bí, đường chỉ bạch kim phát quang sang trọng chuẩn thi đấu',
    boardBg: 'linear-gradient(180deg, #2a2c30 0%, #1c1d21 50%, #121316 100%)',
    outerBorderColor: '#0a0a0c',
    innerGlow: 'inset 0 0 0 1.5px rgba(226, 232, 240, 0.35), inset 0 2px 4px rgba(0,0,0,0.6)',
    outerBoxShadow3D: '0 1px 0 #1e2025, 0 3px 0 #18191d, 0 6px 0 #121316, 0 9px 0 #0d0e10, 0 13px 0 #08090a, 0 17px 0 #040505, 0 24px 36px rgba(0, 0, 0, 0.96)',
    outerBoxShadow2D: '0 4px 20px rgba(0,0,0,0.85)',
    lineStroke: '#94a3b8',
    lineStrokeWidth: 2.3,
    tickStroke: '#cbd5e1',
    riverColor: '#e2e8f0',
    plinthBg: 'linear-gradient(180deg, #18191c 0%, #0f1012 40%, #080809 100%)',
    plinthBorderTop: '1.5px solid rgba(148, 163, 184, 0.5)',
    plinthAccentGrad: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 30%, #94a3b8 70%, #475569 100%)',
    plinthTextColor: '#e2e8f0',
    cornerBracketColor: '#94a3b8',
  },
  {
    id: 'go_do',
    name: 'Cung Đình Gõ Đỏ',
    shortName: 'Gõ Đỏ Hoàng Gia',
    icon: '🏛️',
    tag: 'Hoàng gia',
    description: 'Gỗ gõ đỏ vân lửa quý phái, đường chỉ vàng 24K dát mỏng mang đậm hào khí cung đình',
    boardBg: 'linear-gradient(180deg, #4a1910 0%, #3a110a 50%, #2b0b06 100%)',
    outerBorderColor: '#1f0704',
    innerGlow: 'inset 0 0 0 1.5px rgba(251, 191, 36, 0.55), inset 0 2px 4px rgba(0,0,0,0.5)',
    outerBoxShadow3D: '0 1px 0 #4a1910, 0 3px 0 #3a110a, 0 6px 0 #2c0c07, 0 9px 0 #200804, 0 13px 0 #150503, 0 17px 0 #0d0202, 0 24px 36px rgba(0, 0, 0, 0.95)',
    outerBoxShadow2D: '0 4px 20px rgba(0,0,0,0.7)',
    lineStroke: '#f59e0b',
    lineStrokeWidth: 2.2,
    tickStroke: '#fbbf24',
    riverColor: '#fef3c7',
    plinthBg: 'linear-gradient(180deg, #2b0b06 0%, #1e0704 40%, #120302 100%)',
    plinthBorderTop: '1.5px solid rgba(245, 158, 11, 0.65)',
    plinthAccentGrad: 'linear-gradient(180deg, #fffbeb 0%, #fde68a 25%, #f59e0b 60%, #b45309 100%)',
    plinthTextColor: '#fde68a',
    cornerBracketColor: '#f59e0b',
  },
  {
    id: 'ngoc_bich',
    name: 'Trúc Lâm Thạch Trận',
    shortName: 'Cẩm Thạch Ngọc Bích',
    icon: '🌿',
    tag: 'Thanh tao',
    description: 'Đá ngọc bích cẩm thạch mát lạnh, vân ngọc tự nhiên kết hợp chỉ vàng đồng thi vị',
    boardBg: 'linear-gradient(180deg, #1b3d34 0%, #132e27 50%, #0d221c 100%)',
    outerBorderColor: '#071612',
    innerGlow: 'inset 0 0 0 1.5px rgba(52, 211, 153, 0.45), inset 0 2px 4px rgba(0,0,0,0.5)',
    outerBoxShadow3D: '0 1px 0 #1b3d34, 0 3px 0 #142e27, 0 6px 0 #0f221d, 0 9px 0 #0a1814, 0 13px 0 #07100d, 0 17px 0 #030806, 0 24px 36px rgba(0, 0, 0, 0.94)',
    outerBoxShadow2D: '0 4px 20px rgba(0,0,0,0.7)',
    lineStroke: '#6ee7b7',
    lineStrokeWidth: 2.2,
    tickStroke: '#a7f3d0',
    riverColor: '#d1fae5',
    plinthBg: 'linear-gradient(180deg, #112822 0%, #0b1c17 40%, #06110e 100%)',
    plinthBorderTop: '1.5px solid rgba(52, 211, 153, 0.55)',
    plinthAccentGrad: 'linear-gradient(180deg, #ecfdf5 0%, #a7f3d0 30%, #34d399 70%, #059669 100%)',
    plinthTextColor: '#a7f3d0',
    cornerBracketColor: '#34d399',
  },
  {
    id: 'sa_ban',
    name: 'Cổ Trận Sa Bàn',
    shortName: 'Sa Bàn Da Bò Cổ',
    icon: '📜',
    tag: 'Chiến lược',
    description: 'Chất liệu da thuộc và bản đồ cổ phong trần thời Tam Quốc, đậm chất binh pháp sa trường',
    boardBg: 'linear-gradient(180deg, #e3cbb0 0%, #cbb092 48%, #b89b78 100%)',
    outerBorderColor: '#4f3b25',
    innerGlow: 'inset 0 0 0 1.5px rgba(180, 83, 9, 0.4), inset 0 2px 5px rgba(70,40,15,0.4)',
    outerBoxShadow3D: '0 1px 0 #54402a, 0 3px 0 #453320, 0 6px 0 #382818, 0 9px 0 #2c1e11, 0 13px 0 #20150b, 0 17px 0 #150d06, 0 24px 34px rgba(0, 0, 0, 0.9)',
    outerBoxShadow2D: '0 4px 18px rgba(0,0,0,0.6)',
    lineStroke: '#451a03',
    lineStrokeWidth: 2.3,
    tickStroke: '#78350f',
    riverColor: '#451a03',
    plinthBg: 'linear-gradient(180deg, #3d2c1b 0%, #2e2012 40%, #1d130a 100%)',
    plinthBorderTop: '1.5px solid rgba(217, 119, 6, 0.45)',
    plinthAccentGrad: 'linear-gradient(180deg, #fffbeb 0%, #fde68a 25%, #d97706 70%, #78350f 100%)',
    plinthTextColor: '#fde68a',
    cornerBracketColor: '#b45309',
  },
];

export const PIECE_THEME_LIST: PieceThemeConfig[] = [
  {
    id: 'giang_ho',
    name: 'Gỗ Giang Hồ Sứt Mẻ',
    shortName: 'Gỗ Giang Hồ Bụi',
    icon: '🪵',
    tag: 'Bụi bặm',
    description: 'Quân gỗ mộc vỉa hè bám bụi phong trần, sứt góc mẻ vành, chữ sơn son mực tàu phai sờn dạn dày sương gió',
  },
  {
    id: 'hoang_kim',
    name: 'Hoàng Kim Gỗ Ngà',
    shortName: 'Gỗ Ngà Kinh Điển',
    icon: '👑',
    tag: 'Truyền thống',
    description: 'Gỗ hoàng dương mật ong kết hợp mặt ngà chìm, chữ thư pháp sơn son thếp vàng, quân úp ấn Trống Đồng uy nghi',
  },
  {
    id: 'bach_ngoc',
    name: 'Bạch Ngọc & Hắc Thạch',
    shortName: 'Bạch Ngọc Mã Não',
    icon: '✨',
    tag: 'Quý tộc',
    description: 'Quân đỏ Bạch Ngọc tinh khiết khắc chu sa, quân đen Hắc Diệp Thạch bóng bẩy viền bạc, quân úp ấn ngọc Thái Cực Đồ',
  },
  {
    id: 'dong_co',
    name: 'Hoàng Đồng Chiến Trận',
    shortName: 'Đồng Cổ & Khói Thau',
    icon: '🛡️',
    tag: 'Chiến binh',
    description: 'Đồng đỏ mạ vàng cổ kính cho phe Đỏ, thiết giáp khói thau cho phe Đen, quân úp mặt khiên chim Lạc Đông Sơn hào hùng',
  },
  {
    id: 'gom_su',
    name: 'Gốm Sứ Men Lam Cổ',
    shortName: 'Sứ Trắng Men Lam',
    icon: '🏺',
    tag: 'Nghệ thuật',
    description: 'Gốm sứ hoàng cung sáng bóng, men chu sa đỏ son và men lam mực tàu vẽ tay, quân úp đĩa hoa sen gợn sóng tuyệt mỹ',
  },
  {
    id: 'thach_anh',
    name: 'Hổ Phách & Thạch Anh',
    shortName: 'Pha Lê Hổ Phách',
    icon: '💎',
    tag: 'Huyền ảo',
    description: 'Pha lê hổ phách ánh lửa ấm áp, thạch anh tím viền neon huyền ảo, quân úp tinh thể vát giác phát quang kỳ ảo',
  },
];

export interface ChessThemeSet {
  id: ChessThemeSetId;
  name: string;
  shortName: string;
  icon: string;
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
}

export const CHESS_THEME_SETS: ChessThemeSet[] = [
  {
    id: 'giang_ho',
    name: 'Cờ giang hồ',
    shortName: 'Cờ giang hồ',
    icon: '🪵',
    boardTheme: 'giang_ho',
    pieceTheme: 'giang_ho',
  },
  {
    id: 'quan_nuoc',
    name: 'Cờ quán nước',
    shortName: 'Cờ quán nước',
    icon: '☕',
    boardTheme: 'sa_ban',
    pieceTheme: 'hoang_kim',
  },
  {
    id: 'ky_vien',
    name: 'Cờ kỳ viện',
    shortName: 'Cờ kỳ viện',
    icon: '🖤',
    boardTheme: 'mun_hoa',
    pieceTheme: 'bach_ngoc',
  },
  {
    id: 'thuc_chien',
    name: 'Cờ thực chiến',
    shortName: 'Cờ thực chiến',
    icon: '⚔️',
    boardTheme: 'ngoc_bich',
    pieceTheme: 'dong_co',
  },
  {
    id: 'cung_dinh',
    name: 'Cờ cung đình',
    shortName: 'Cờ cung đình',
    icon: '🏛️',
    boardTheme: 'go_do',
    pieceTheme: 'gom_su',
  },
];

export function getThemeSetById(id?: ChessThemeSetId): ChessThemeSet {
  if (!id) return CHESS_THEME_SETS[0];
  const found = CHESS_THEME_SETS.find((s) => s.id === id);
  return found || CHESS_THEME_SETS[0];
}

export function findMatchingThemeSet(boardTheme: BoardTheme, pieceTheme: PieceTheme): ChessThemeSet | null {
  const normBoard = boardTheme === 'quan_coc' ? 'hoang_duong' : boardTheme === 'ky_vien' ? 'mun_hoa' : boardTheme === 'go_moc' ? 'go_do' : boardTheme;
  const match = CHESS_THEME_SETS.find((s) => s.boardTheme === normBoard && s.pieceTheme === pieceTheme);
  return match || null;
}

export function getBoardThemeConfig(theme?: BoardTheme): BoardThemeConfig {
  if (!theme) return BOARD_THEME_LIST[0];
  if (theme === 'quan_coc') return BOARD_THEME_LIST[0];
  if (theme === 'ky_vien') return BOARD_THEME_LIST[1];
  if (theme === 'go_moc') return BOARD_THEME_LIST[2];
  const found = BOARD_THEME_LIST.find((t) => t.id === theme);
  return found || BOARD_THEME_LIST[0];
}

export function getPieceThemeConfig(theme?: PieceTheme): PieceThemeConfig {
  if (!theme) return PIECE_THEME_LIST[0];
  const found = PIECE_THEME_LIST.find((t) => t.id === theme);
  return found || PIECE_THEME_LIST[0];
}
