import type { AiDifficulty, Move, Piece, PieceRole, PlayerColor } from '../types';
import { countPliesSinceLastCapture, getAllLegalMoves, BLACK_SLOTS, RED_SLOTS } from './chessRules';

const TOKENS: Record<PieceRole, string> = { king: 'K', chariot: 'R', advisor: 'A', cannon: 'C', soldier: 'P', horse: 'N', elephant: 'B' };
const POOL = { chariot: 2, advisor: 2, cannon: 2, soldier: 5, horse: 2, elephant: 2 };

/** Public information only. Never inspect a covered piece's trueRole or captured hidden identities. */
export function toJieqiFen(board: (Piece | null)[][], turn: PlayerColor, history: Move[] = []): string {
  if (board.length !== 10 || board.some(row => row.length !== 9)) throw new Error('Invalid board dimensions');
  board.forEach((row, y) => row.forEach((piece, x) => {
    if (piece?.isCovered) {
      const slots = piece.color === 'red' ? RED_SLOTS : BLACK_SLOTS;
      if (!slots.some(slot => slot.x === x && slot.y === y && slot.initialRole === piece.initialRole)) throw new Error('Covered piece outside its starting slot');
    }
  }));
  const counts = { red: { ...POOL }, black: { ...POOL } };
  const account = (p: Piece) => {
    if (p.trueRole !== 'king') counts[p.color][p.trueRole]--;
  };
  const ranks = board.map(row => {
    let rank = '', empty = 0;
    for (const piece of row) {
      if (!piece) { empty++; continue; }
      if (empty) { rank += empty; empty = 0; }
      if (piece.isCovered) rank += piece.color === 'red' ? 'X' : 'x';
      else {
        account(piece);
        const token = TOKENS[piece.trueRole];
        rank += piece.color === 'red' ? token : token.toLowerCase();
      }
    }
    return rank + (empty || '');
  });
  for (const move of history) {
    const captured = move.captured;
    if (captured && !captured.isCovered && !captured.wasCoveredWhenCaptured) account(captured);
  }
  let pools = '';
  for (const color of ['red', 'black'] as const) {
    for (const role of Object.keys(POOL) as (keyof typeof POOL)[]) {
      const n = counts[color][role];
      if (n < 0) throw new Error('Inconsistent public piece history');
      if (n) pools += (color === 'red' ? TOKENS[role] : TOKENS[role].toLowerCase()) + n;
    }
  }
  return `${ranks.join('/')} ${turn === 'red' ? 'w' : 'b'} ${pools || '-'} ${countPliesSinceLastCapture(history)} ${1 + Math.floor(history.length / 2)}`;
}

/** Engine suggestions are advisory: the app remains the referee, including its repetition rules. */
export function legalEngineMove(token: string, board: (Piece | null)[][], color: PlayerColor, history: Move[] = []) {
  if (!/^[a-i][0-9][a-i][0-9](?:[A-Za-z]*)$/.test(token)) return null;
  const from = { x: token.charCodeAt(0) - 97, y: 9 - Number(token[1]) };
  const to = { x: token.charCodeAt(2) - 97, y: 9 - Number(token[3]) };
  return getAllLegalMoves(board, color, history).find(m => m.from.x === from.x && m.from.y === from.y && m.to.x === to.x && m.to.y === to.y) ?? null;
}

export function engineRootMoves(board: (Piece | null)[][], color: PlayerColor, history: Move[] = []): string[] {
  return getAllLegalMoves(board, color, history).map(m => `${String.fromCharCode(97 + m.from.x)}${9-m.from.y}${String.fromCharCode(97 + m.to.x)}${9-m.to.y}`);
}

export interface EngineRequest { fen: string; difficulty: AiDifficulty; maxTimeSeconds: number; rootMoves?: string[] }
