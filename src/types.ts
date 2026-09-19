/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlayerColor = 'red' | 'black';

export type PieceRole =
  | 'king'     // Tướng / Soái
  | 'advisor'  // Sĩ / 仕 / 士
  | 'elephant' // Tượng / Voi / 相 / 象
  | 'horse'    // Mã / 馬
  | 'chariot'  // Xe / 車
  | 'cannon'   // Pháo / 砲 / 炮
  | 'soldier'; // Tốt / Binh / 兵 / 卒

export interface Piece {
  id: string;
  color: PlayerColor;
  trueRole: PieceRole;       // The real underlying piece identity
  isCovered: boolean;       // True if still face-down (úp)
  initialRole?: PieceRole;   // The role corresponding to its starting slot
  simulatedRevealed?: boolean; // Marker for search simulation to prevent peeking
  wasCoveredWhenCaptured?: boolean; // True if captured while still covered
  capturedBy?: PlayerColor;          // Which side captured this piece
}

export interface Position {
  x: number; // 0 to 8 (column, left to right from Red's perspective)
  y: number; // 0 to 9 (row, 0 = Black's side, 9 = Red's side)
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  wasCovered: boolean;
  revealedRole?: PieceRole;
  notation: string;
  isCheck?: boolean;
  chasedPieceIds?: string[];
  consecutiveChecks?: number;
  consecutiveChases?: number;
}

export type GameMode = 'ai' | 'pvp';
export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type LabelDisplayMode = 'both' | 'han' | 'vi';
export type BoardTheme = 'quan_coc' | 'ky_vien' | 'go_moc';
export type BoardPerspective = '2d' | '3d';
export type RiverTextMode = 'proverb' | 'blank' | 'han';

export type VenueType = 'via_he' | 'hoi_quan' | 'co_phui' | 'clb_co_up';

export type PlayerRankTitle =
  | 'Mới tập chơi'
  | 'Sạch nước cản'
  | 'Tân thủ'
  | 'Kỳ thủ'
  | 'Thợ cờ'
  | 'Kỳ vương'
  | 'Đặc cấp kỳ vương';

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
}

export function getPlayerRank(wins: number): {
  title: PlayerRankTitle;
  stars: number;
  badgeClass: string;
  description: string;
} {
  if (wins >= 50)
    return {
      title: 'Đặc cấp kỳ vương',
      stars: 5,
      badgeClass: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-stone-950 font-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]',
      description: 'Đỉnh cao kỳ nghệ vô song, danh trấn giang hồ',
    };
  if (wins >= 25)
    return {
      title: 'Kỳ vương',
      stars: 4,
      badgeClass: 'bg-gradient-to-r from-amber-500 to-red-600 text-white font-extrabold border-amber-400 shadow-md',
      description: 'Bách chiến bách thắng, thiên hạ nể vì',
    };
  if (wins >= 12)
    return {
      title: 'Thợ cờ',
      stars: 3,
      badgeClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-purple-100 font-bold border-purple-400',
      description: 'Thạo vạn nước biến, sát khí trầm ổn',
    };
  if (wins >= 6)
    return {
      title: 'Kỳ thủ',
      stars: 3,
      badgeClass: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-blue-100 font-bold border-blue-400',
      description: 'Bố cục tinh tường, điều binh như thần',
    };
  if (wins >= 3)
    return {
      title: 'Tân thủ',
      stars: 2,
      badgeClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-emerald-100 font-bold border-emerald-400',
      description: 'Đã thuần thục khai cuộc cờ úp',
    };
  if (wins >= 1)
    return {
      title: 'Sạch nước cản',
      stars: 1,
      badgeClass: 'bg-gradient-to-r from-stone-600 to-stone-500 text-stone-100 font-bold border-stone-400',
      description: 'Đã có chiến thắng vang dội đầu tay',
    };
  return {
    title: 'Mới tập chơi',
    stars: 1,
    badgeClass: 'bg-stone-800 text-stone-300 font-medium border-stone-600',
    description: 'Bắt đầu bước chân vào thế giới cờ úp kỳ ảo',
  };
}

export interface AiThinkingStats {
  depth: number;
  nodes: number;
  score: number;
  timeSpent: number; // in seconds
  maxTime: number; // in seconds
}

export interface GameState {
  board: (Piece | null)[][]; // 10 rows x 9 cols: board[y][x]
  turn: PlayerColor;
  winner: PlayerColor | 'draw' | null;
  isCheck: boolean;
  checkingPieces: Position[];
  moveHistory: Move[];
  capturedByRed: Piece[];
  capturedByBlack: Piece[];
  lastMove: Move | null;
}

export interface PlayerProfile {
  name: string;
  avatar: string; // url or emoji or dataUrl
  isCustomAvatar?: boolean;
}

export interface SavedMatch {
  id: string;
  timestamp: number;
  dateStr: string;
  playerName: string;
  playerAvatar: string;
  gameMode: GameMode;
  difficulty?: AiDifficulty;
  winner: PlayerColor | 'draw';
  patternName?: string;
  totalMoves: number;
  initialBoard: (Piece | null)[][];
  moves: Move[];
}

export interface ActiveGameSave {
  timestamp: number;
  dateStr: string;
  board: (Piece | null)[][];
  turn: PlayerColor;
  winner: PlayerColor | 'draw' | null;
  lastMove: Move | null;
  moveHistory: Move[];
  capturedByRed: Piece[];
  capturedByBlack: Piece[];
  gameMode: GameMode;
  difficulty: AiDifficulty;
}
