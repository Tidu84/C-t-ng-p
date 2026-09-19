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
