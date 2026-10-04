/// <reference types="node" />
/**
 * Unit tests for game rules (no extra deps). Run with:
 *   npx tsx --test src/utils/chessRules.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Move, Piece, PlayerColor } from '../types';
import {
  checkMoveRepetitionRules,
  countPliesSinceLastCapture,
  getAllLegalMoves,
  getLegalMoves,
  hasInsufficientMaterial,
  initializeBoard,
  NO_CAPTURE_DRAW_PLIES,
} from './chessRules';
import { rebuildHistoryStack, rebuildInitialBoard } from './gameHistory';
import { searchBestMoveAsync } from './aiEngine';

type Board = (Piece | null)[][];
const emptyBoard = (): Board => Array.from({ length: 10 }, () => Array(9).fill(null));
const king = (color: PlayerColor): Piece => ({ id: `${color}_king`, color, trueRole: 'king', isCovered: false, initialRole: 'king' });

test('lật quân ra Xe chiếu tướng được ghi nhận là chiếu', () => {
  const b = emptyBoard();
  b[0][4] = king('black');
  b[9][3] = king('red');
  b[6][4] = { id: 'r46', color: 'red', trueRole: 'chariot', isCovered: true, initialRole: 'soldier' };
  const rep = checkMoveRepetitionRules(b, { x: 4, y: 6 }, { x: 4, y: 5 }, []);
  assert.equal(rep.isCheck, true);
});

test('lật quân ra Xe đuổi quân vô căn được tính theo trueRole', () => {
  const b = emptyBoard();
  b[0][4] = king('black');
  b[9][3] = king('red');
  b[6][2] = { id: 'r26', color: 'red', trueRole: 'chariot', isCovered: true, initialRole: 'soldier' };
  // Undefended black horse on the same row the revealed chariot lands on
  b[5][7] = { id: 'bh', color: 'black', trueRole: 'horse', isCovered: false, initialRole: 'horse' };
  const rep = checkMoveRepetitionRules(b, { x: 2, y: 6 }, { x: 2, y: 5 }, []);
  assert.deepEqual(rep.chasedPieceIds, ['bh']);
});

test('đếm số nửa nước không ăn quân (lật quân không tính là ăn)', () => {
  const mk = (captured: boolean): Move =>
    ({ captured: captured ? ({ id: 'x' } as Piece) : undefined, wasCovered: true } as Move);
  assert.equal(countPliesSinceLastCapture([]), 0);
  assert.equal(countPliesSinceLastCapture([mk(true), mk(false), mk(false)]), 2);
  assert.equal(countPliesSinceLastCapture(Array.from({ length: NO_CAPTURE_DRAW_PLIES }, () => mk(false))), 80);
});

test('hòa do không còn quân tấn công', () => {
  const b = emptyBoard();
  b[0][4] = king('black');
  b[9][4] = king('red');
  b[9][3] = { id: 'ra', color: 'red', trueRole: 'advisor', isCovered: false };
  b[5][2] = { id: 'be', color: 'black', trueRole: 'elephant', isCovered: false };
  assert.equal(hasInsufficientMaterial(b), true);
  b[0][0] = { id: 'bc', color: 'black', trueRole: 'advisor', isCovered: true, initialRole: 'chariot' };
  assert.equal(hasInsufficientMaterial(b), false, 'còn quân úp thì không xử hòa');
  b[0][0] = null;
  b[4][4] = { id: 'rs', color: 'red', trueRole: 'soldier', isCovered: false };
  assert.equal(hasInsufficientMaterial(b), false);
  assert.equal(hasInsufficientMaterial(initializeBoard()), false);
});

/** Play random legal moves, recording Move objects the same way App.executeMove does. */
function playRandomGame(plies: number) {
  const initial = initializeBoard();
  let board = initial.map((r) => [...r]);
  let turn: PlayerColor = 'red';
  const moves: Move[] = [];
  for (let i = 0; i < plies; i++) {
    const legal = getAllLegalMoves(board, turn, moves);
    if (legal.length === 0) break;
    const captures = legal.filter((m) => m.captured && m.captured.trueRole !== 'king');
    const pool = captures.length > 0 && Math.random() < 0.5 ? captures : legal;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const piece = board[pick.from.y][pick.from.x]!;
    const target = board[pick.to.y][pick.to.x];
    const placed: Piece = { ...piece, isCovered: false };
    const captured = target
      ? { ...target, wasCoveredWhenCaptured: target.isCovered, capturedBy: turn, isCovered: target.isCovered }
      : undefined;
    board = board.map((r) => [...r]);
    board[pick.from.y][pick.from.x] = null;
    board[pick.to.y][pick.to.x] = placed;
    moves.push({ from: pick.from, to: pick.to, piece: placed, captured, wasCovered: piece.isCovered, notation: '' });
    turn = turn === 'red' ? 'black' : 'red';
  }
  return { initial, board, moves, turn };
}

test('khôi phục bàn cờ ban đầu và stack "đi lại" từ ván lưu', () => {
  for (let g = 0; g < 20; g++) {
    const { initial, board, moves } = playRandomGame(60);
    assert.deepEqual(rebuildInitialBoard(board, moves), initial);
    const stack = rebuildHistoryStack(initial, moves, board);
    assert.ok(stack);
    assert.equal(stack.length, moves.length);
    if (moves.length > 0) assert.deepEqual(stack[0].board, initial);
  }
});

test('nước đi của AI (trên bàn cờ đã che quân úp) luôn hợp lệ trên bàn cờ thật', async () => {
  for (let g = 0; g < 10; g++) {
    const { board, moves, turn } = playRandomGame(2 * Math.floor(Math.random() * 15) + 1); // Black to move
    if (turn !== 'black' || getAllLegalMoves(board, 'black', moves).length === 0) continue;
    const best = await searchBestMoveAsync(board, 'black', 'easy', 1, undefined, moves);
    if (!best) continue;
    assert.equal(board[best.from.y][best.from.x]?.color, 'black');
    assert.ok(getLegalMoves(board, best.from).some((m) => m.x === best.to.x && m.y === best.to.y));
  }
});
