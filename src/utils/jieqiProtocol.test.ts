import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeBoard } from './chessRules';
import { toJieqiFen, legalEngineMove, engineRootMoves } from './jieqiProtocol';
import type { Move, Piece } from '../types';

test('Jieqi FEN matches the protocol and hides both players shuffled identities', () => {
  const board = initializeBoard();
  const expected = 'xxxxkxxxx/9/1x5x1/x1x1x1x1x/9/9/X1X1X1X1X/1X5X1/9/XXXXKXXXX w R2A2C2P5N2B2r2a2c2p5n2b2 0 1';
  assert.equal(toJieqiFen(board, 'red'), expected);
  const changed = board.map(row => row.map(p => p?.isCovered ? { ...p, trueRole: 'chariot' as const, id: 'secret-altered' } : p));
  assert.equal(toJieqiFen(changed, 'red'), expected);
});

test('captured covered identity stays private in the engine payload', () => {
  const board = initializeBoard();
  const captured: Piece = { ...board[0][0]!, wasCoveredWhenCaptured: true };
  board[0][0] = null;
  const base = { from: { x: 0, y: 1 }, to: { x: 0, y: 0 }, piece: board[9][4]!, wasCovered: false, notation: '', captured } as Move;
  const one = toJieqiFen(board, 'black', [base]);
  const two = toJieqiFen(board, 'black', [{ ...base, captured: { ...captured, trueRole: 'horse' } }]);
  assert.equal(one, two);
  assert.ok(one.includes('r2a2c2p5n2b2'));
});

test('known captured pieces are deducted, as are publicly revealed pieces', () => {
  const board = initializeBoard();
  const captured = { ...board[0][0]!, trueRole: 'chariot' as const, isCovered: false, wasCoveredWhenCaptured: false };
  board[0][0] = null;
  const history = [{ from: { x: 0, y: 1 }, to: { x: 0, y: 0 }, piece: board[9][4]!, wasCovered: false, notation: '', captured }] as Move[];
  assert.ok(toJieqiFen(board, 'red', history).includes('r1a2c2p5n2b2'));
});

test('engine coordinates are checked by app rules, not accepted blindly', () => {
  const board = initializeBoard();
  assert.ok(legalEngineMove('a3a4P', board, 'red'));
  assert.equal(legalEngineMove('a6a5', board, 'red'), null);
  assert.equal(legalEngineMove('a3a9', board, 'red'), null);
  assert.equal(legalEngineMove('invalid', board, 'red'), null);
});

test('malformed covered positions fall back instead of being misrepresented to the engine', () => {
  const board = initializeBoard();
  board[5][0] = board[6][0]; board[6][0] = null;
  assert.throws(() => toJieqiFen(board, 'red'), /starting slot/);
});

test('root move list contains only our moves and does not expose hidden roles', () => {
  const board = initializeBoard();
  const changed = board.map(row => row.map(p => p?.isCovered ? { ...p, trueRole: 'chariot' as const } : p));
  const allowed = engineRootMoves(board, 'red');
  assert.deepEqual(engineRootMoves(changed, 'red'), allowed);
  assert.ok(allowed.includes('a3a4'));
  assert.equal(allowed.includes('a6a5'), false);
});

test('native engine receives no sixth consecutive same-piece checking move', () => {
  const board: (Piece | null)[][] = Array.from({ length: 10 }, () => Array(9).fill(null));
  board[9][3] = { id: 'red-king', color: 'red', trueRole: 'king', isCovered: false };
  board[0][4] = { id: 'black-king', color: 'black', trueRole: 'king', isCovered: false };
  const rook: Piece = { id: 'red-rook', color: 'red', trueRole: 'chariot', isCovered: false };
  board[3][3] = rook;
  const history: Move[] = Array.from({ length: 5 }, () => ({ from: { x: 4, y: 3 }, to: { x: 3, y: 3 }, piece: rook, wasCovered: false, notation: '', isCheck: true }));
  assert.ok(engineRootMoves(board, 'red').includes('d6e6'));
  assert.equal(engineRootMoves(board, 'red', history).includes('d6e6'), false);
});
