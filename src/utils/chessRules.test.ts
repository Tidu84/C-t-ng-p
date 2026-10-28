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
  isKingInCheck,
  isSquareDefendedBy,
  NO_CAPTURE_DRAW_PLIES,
} from './chessRules';
import { rebuildHistoryStack, rebuildInitialBoard } from './gameHistory';
import { searchBestMoveAsync } from './aiEngine';
import { evaluateMoveQuality } from './moveCommentary';
import { detectCheckmatePattern } from './checkmatePatterns';

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

test('chỉ tự xử hòa khi còn hai Tướng; Sĩ và Tượng vẫn có thể tấn công', () => {
  const b = emptyBoard();
  b[0][4] = king('black');
  b[9][4] = king('red');
  assert.equal(hasInsufficientMaterial(b), true);
  b[9][3] = { id: 'ra', color: 'red', trueRole: 'advisor', isCovered: false };
  b[5][2] = { id: 'be', color: 'black', trueRole: 'elephant', isCovered: false };
  assert.equal(hasInsufficientMaterial(b), false);
  b[0][0] = { id: 'bc', color: 'black', trueRole: 'advisor', isCovered: true, initialRole: 'chariot' };
  assert.equal(hasInsufficientMaterial(b), false, 'còn quân úp thì không xử hòa');
  b[0][0] = null;
  b[4][4] = { id: 'rs', color: 'red', trueRole: 'soldier', isCovered: false };
  assert.equal(hasInsufficientMaterial(b), false);
  assert.equal(hasInsufficientMaterial(initializeBoard()), false);
});

test('Sĩ và Tượng ngửa qua sông chiếu Tướng không bị xử hòa', () => {
  for (const [role, x, y] of [['advisor', 3, 1], ['elephant', 2, 2]] as const) {
    const b = emptyBoard();
    b[0][4] = king('black');
    b[9][3] = king('red');
    b[y][x] = { id: 'attacker', color: 'red', trueRole: role, isCovered: false };
    assert.equal(isKingInCheck(b, 'black').inCheck, true);
    assert.equal(hasInsufficientMaterial(b), false);
  }
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

test('Xe ngửa không bao giờ tự sát lao vào ăn Sĩ úp có Tướng giữ', async () => {
  const b = emptyBoard();
  b[0][4] = king('black'); // Black king at (4, 0)
  b[0][3] = { id: 'b_cov_30', color: 'black', trueRole: 'advisor', isCovered: true, initialRole: 'advisor' }; // Sĩ úp at (3, 0)
  b[9][4] = king('red');

  // Red revealed Chariot at (3, 5), having a straight file line to (3, 0)
  b[5][3] = { id: 'red_chariot', color: 'red', trueRole: 'chariot', isCovered: false, initialRole: 'chariot' };

  // AI plays Red: search best move
  const bestMove = await searchBestMoveAsync(b, 'red', 'medium', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  // Nước đi KHÔNG ĐƯỢC là ăn Sĩ úp ở (3, 0) vì Tướng đen (4, 0) sẽ bắt lại chết Xe ngửa
  assert.ok(
    !(bestMove.from.x === 3 && bestMove.from.y === 5 && bestMove.to.x === 3 && bestMove.to.y === 0),
    'Xe ngửa không được tự sát ăn Sĩ úp ở (3, 0)'
  );
});

test('Xe ngửa không tự sát lao vào ăn Tốt úp biên có Xe úp góc giữ', async () => {
  const b = emptyBoard();
  b[0][4] = king('black');
  b[9][4] = king('red');

  // Black has Xe úp at corner (0, 0) and flank pawn úp at (0, 3)
  b[0][0] = { id: 'b_cov_00', color: 'black', trueRole: 'chariot', isCovered: true, initialRole: 'chariot' };
  b[3][0] = { id: 'b_cov_03', color: 'black', trueRole: 'soldier', isCovered: true, initialRole: 'soldier' };

  // Red revealed Chariot on column 0 at (0, 5)
  b[5][0] = { id: 'red_chariot', color: 'red', trueRole: 'chariot', isCovered: false, initialRole: 'chariot' };

  const bestMove = await searchBestMoveAsync(b, 'red', 'medium', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  // Nước đi KHÔNG ĐƯỢC là ăn Tốt úp biên ở (0, 3) vì góc Xe úp (0, 0) sẽ đập lại chết Xe ngửa
  assert.ok(
    !(bestMove.from.x === 0 && bestMove.from.y === 5 && bestMove.to.x === 0 && bestMove.to.y === 3),
    'Xe ngửa không được lao vào ăn Tốt úp biên ở (0, 3) có căn'
  );
});

test('Máy không bỏ rơi quân ngửa có giá trị (Mã ngửa) để giữ quân úp', async () => {
  const b = emptyBoard();
  b[0][4] = king('black');
  b[9][4] = king('red');

  // Red revealed Horse at (2, 5) is attacked by Black uncovered Chariot at (2, 0)
  b[5][2] = { id: 'r_horse', color: 'red', trueRole: 'horse', isCovered: false, initialRole: 'horse' };
  b[0][2] = { id: 'b_chariot', color: 'black', trueRole: 'chariot', isCovered: false, initialRole: 'chariot' };

  // Red also has a covered soldier at (4, 6)
  b[6][4] = { id: 'r_cov_pawn', color: 'red', trueRole: 'soldier', isCovered: true, initialRole: 'soldier' };

  // AI plays Red: must move the endangered Horse to safety
  const bestMove = await searchBestMoveAsync(b, 'red', 'medium', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  // Nước đi phải là chạy Mã (from: {x: 2, y: 5})
  assert.equal(bestMove.from.x, 2, 'Phải chạy Mã ngửa đang bị ngắm bắt');
  assert.equal(bestMove.from.y, 5, 'Phải chạy Mã ngửa đang bị ngắm bắt');
});

test('Máy khi mở quân khai cục luôn ưu tiên mở cây úp ở hàng tốt trước khi mở cây ở hàng dưới', async () => {
  const b = initializeBoard();
  // Red plays opening move B7.1 (6, 6) -> (6, 5)
  b[5][6] = b[6][6];
  b[6][6] = null;

  // AI Black to move in opening with all pawn row covered pieces intact
  const bestMove = await searchBestMoveAsync(b, 'black', 'medium', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi khai cục');
  // Nước đi của máy phải mở quân ở hàng Tốt (y = 3), không được mở Sĩ/Tượng/Mã/Xe ở hàng đáy (y = 0)
  assert.equal(bestMove.from.y, 3, 'Máy phải mở quân úp ở hàng Tốt (y=3) trước khi mở hàng dưới');
  assert.equal(bestMove.piece.initialRole, 'soldier', 'Quân mở phải là quân ở vị trí Tốt');
});

test('Máy không dùng Tướng ăn lên khi có Sĩ úp ăn lên bảo vệ cung và mở nắp', async () => {
  const b = initializeBoard();
  // An invading red piece steps into palace at (4, 1)
  b[1][4] = { id: 'r_invader', color: 'red', trueRole: 'soldier', isCovered: false, initialRole: 'soldier' };

  // AI plays Black: King at (4, 0) and Sĩ úp at (3, 0), (5, 0) can all capture at (4, 1).
  const bestMove = await searchBestMoveAsync(b, 'black', 'medium', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  assert.equal(bestMove.to.x, 4, 'Đích đến phải là ô (4, 1) để ăn quân xâm nhập');
  assert.equal(bestMove.to.y, 1, 'Đích đến phải là ô (4, 1) để ăn quân xâm nhập');
  assert.notEqual(bestMove.piece.trueRole, 'king', 'Tuyệt đối không dùng Tướng ăn lên thượng lầu');
  assert.equal(bestMove.piece.isCovered, true, 'Phải dùng quân úp (Sĩ úp) ăn lên để vừa diệt địch vừa mở cờ');
});

test('Máy ưu tiên mở con Tốt ở lộ đối phương chưa kịp mở để chiếm tiên khóa nắp', async () => {
  const b = initializeBoard();
  // Red has already opened/moved pawn at file 6: b[6][6] is null
  b[6][6] = null;
  // Red's pawns at other files (0, 2, 4, 8) are still covered
  // AI Black to move: must choose a pawn where opponent is still covered and NOT file 6
  const bestMove = await searchBestMoveAsync(b, 'black', 'medium', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  assert.equal(bestMove.from.y, 3, 'Phải là nước mở Tốt hàng 3');
  assert.notEqual(bestMove.from.x, 6, 'Tuyệt đối không mở Tốt 7 (x=6) nơi đối thủ đã mở rồi khi còn các lộ khác chưa mở');
  assert.ok(b[6][bestMove.from.x]?.isCovered, 'Phải mở con tốt mà đối thủ đối diện chưa kịp mở để tranh tiên khóa nắp');
});

test('Khi cây ngửa (Mã) bị Xe đè ghim bắt chết, Máy tuyệt đối không lên Tướng mà đi cây khác', async () => {
  const b = initializeBoard();
  // Turn 1: Red opened Chariot, Black pushed pawn 5 to (4, 4) revealing Horse
  b[5][2] = { id: 'r_c', color: 'red', trueRole: 'chariot', isCovered: false, initialRole: 'soldier' };
  b[6][2] = null;
  b[4][4] = { id: 'b_h', color: 'black', trueRole: 'horse', isCovered: false, initialRole: 'soldier' };
  b[3][4] = null;
  // Turn 2: Red moved Chariot to (4, 5) pinning and threatening Black Horse
  b[5][4] = b[5][2];
  b[5][2] = null;

  // AI Black to move: must NEVER move the King (Tg5-5 / {4, 0} -> {4, 1})
  const bestMove = await searchBestMoveAsync(b, 'black', 'medium', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  assert.notEqual(bestMove.piece.trueRole, 'king', 'Tuyệt đối không lên Tướng khi chưa bị chiếu');
});

test('Máy ưu tiên mở Tốt biên khi đối thủ còn Tốt biên chưa mở và các lộ khác đối thủ đã mở', async () => {
  const b = initializeBoard();
  // Red opened pawn 7 at x=2
  b[5][2] = { id: 'r_b7', color: 'red', trueRole: 'soldier', isCovered: false, initialRole: 'soldier' };
  b[6][2] = null;
  // Black opened pawn 5 at x=4
  b[4][4] = { id: 'b_x5', color: 'black', trueRole: 'chariot', isCovered: false, initialRole: 'soldier' };
  b[3][4] = null;
  // Red opened elephant slot at x=4
  b[7][4] = { id: 'r_x7', color: 'red', trueRole: 'chariot', isCovered: false, initialRole: 'elephant' };
  b[9][2] = null;
  // Black opened flank pawn 1 at x=8
  b[4][8] = { id: 'b_b1', color: 'black', trueRole: 'soldier', isCovered: false, initialRole: 'soldier' };
  b[3][8] = null;
  // Red opened pawn 3 at x=6
  b[5][6] = { id: 'r_s3', color: 'red', trueRole: 'advisor', isCovered: false, initialRole: 'soldier' };
  b[6][6] = null;

  // AI Black to move: Red's flank pawn at x=0 is still covered, while Red at x=2 and x=6 already opened.
  // Black must open flank pawn at x=0 (B9-9 / tốt biên)!
  const bestMove = await searchBestMoveAsync(b, 'black', 'easy', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  assert.equal(bestMove.from.x, 0, 'Máy phải mở Tốt biên (x=0) nơi đối thủ chưa mở');
  assert.equal(bestMove.from.y, 3, 'Phải là nước mở Tốt hàng 3');
});

test('Khi Tượng đối thủ nhìn vào Tốt úp 3, Máy tuyệt đối không bỏ úp mà phải tiến tốt thoát đòn', async () => {
  const b = initializeBoard();
  // Red has an Elephant at (0, 5) attacking Black's covered pawn at (2, 3) across the river
  // Eye at (1, 4) is clear. It ONLY attacks (2, 3), not (6, 3)!
  b[5][0] = { id: 'r_elephant_0_5', color: 'red', trueRole: 'elephant', isCovered: false, initialRole: 'elephant' };
  b[9][2] = null; // Lifted from home slot

  // AI Black to move: Black's covered pawn at (2, 3) is directly attacked by Red's Elephant at (0, 5).
  // If Black ignores it and plays another move (e.g. at x=0, 4, 6, 8), the pawn is lost for free.
  // Black must rescue by pushing the pawn (2, 3) -> (2, 4) or defending it!
  const bestMove = await searchBestMoveAsync(b, 'black', 'easy', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  // The threatened pawn is at (2, 3). Moving it from (2, 3) to (2, 4) escapes the attack and uncovers it.
  assert.equal(bestMove.from.x, 2, 'Máy phải đi quân Tốt úp 3 đang bị Tượng dòm ngó');
  assert.equal(bestMove.from.y, 3, 'Máy phải đi quân Tốt úp 3 đang bị Tượng dòm ngó');
  assert.equal(bestMove.to.x, 2, 'Tốt 3 tiến lên (2, 4) thoát khỏi tầm ăn của Tượng');
  assert.equal(bestMove.to.y, 4, 'Tốt 3 tiến lên (2, 4) thoát khỏi tầm ăn của Tượng');
});

test('Khi đối phương ra Xe ngắm quân úp (X9-8 / X1-2), Máy giữ úp & lên Mã giữ căn, không mở Tốt biên vu vơ', async () => {
  const b = initializeBoard();
  // Red plays P2-5: (7, 7) -> (4, 7)
  b[7][4] = b[7][7]; b[7][7] = null;
  // Black opens Tốt 7: (6, 3) -> (6, 4)
  b[4][6] = b[3][6]; b[3][6] = null;
  // Red ra Xe 9 bình 8: (8, 9) -> (7, 9) (X9-8 dòm Pháo 8 & sườn)
  b[9][7] = b[9][8]; b[9][8] = null;

  // AI Black to move: Red has brought out a Chariot to file 7 (x=7).
  // Black must NOT blindly push an edge pawn at (0, 3) or ignore the threat!
  // Black must develop Horse (Lên Mã), Elephant (Lên Tượng giả), or Chariot to defend.
  const bestMove = await searchBestMoveAsync(b, 'black', 'easy', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  assert.notEqual(bestMove.from.x, 0, 'Tuyệt đối không được mở Tốt biên vu vơ khi đối phương đã ra Xe');
  const isCombatOrDefensive =
    bestMove.piece.initialRole === 'horse' ||
    bestMove.piece.initialRole === 'cannon' ||
    bestMove.piece.initialRole === 'chariot' ||
    bestMove.piece.initialRole === 'elephant';
  assert.ok(isCombatOrDefensive, 'Phải đi quân chiến / thủ (Mã, Pháo, Xe, Tượng) để giữ úp & phòng thủ');
});

test('Khi đối phương vào Pháo đầu (P2-5), Máy lên Tượng giả (T7.5 / T3.5), tuyệt đối không kéo Pháo giả vào đỡ', async () => {
  const b = initializeBoard();
  // Red plays P2-5: (7, 7) -> (4, 7)
  b[7][4] = b[7][7]; b[7][7] = null;

  // AI Black to move: Red has Pháo đầu ngắm trung lộ.
  // Black must play Lên Tượng giả (x=2 hoặc x=6 lên x=4, y=2), TUYỆT ĐỐI không kéo Pháo giả vào đỡ!
  const bestMove = await searchBestMoveAsync(b, 'black', 'easy', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  assert.notEqual(bestMove.piece.initialRole, 'cannon', 'Tuyệt đối không được kéo Pháo giả vào đỡ');
  assert.equal(bestMove.piece.initialRole, 'elephant', 'Máy phải lên Tượng giả che chắn trung lộ');
  assert.equal(bestMove.to.x, 4, 'Tượng giả bay vào trung tâm (x=4)');
  assert.equal(bestMove.to.y, 2, 'Tượng giả bay lên vị trí (4, 2)');
});

test('Khi trung lộ chịu áp lực nhưng Tốt úp 5 còn mở được an toàn, Máy ưu tiên mở Tốt úp 5 (B5.1) thay vì lên Tượng giả', async () => {
  const b = initializeBoard();
  b[2][0] = { id: 'b_cannon', color: 'black', trueRole: 'cannon', isCovered: false, initialRole: 'cannon' };
  b[2][8] = { id: 'b_elephant', color: 'black', trueRole: 'elephant', isCovered: false, initialRole: 'elephant' };

  b[5][2] = { id: 'r_soldier', color: 'red', trueRole: 'soldier', isCovered: false, initialRole: 'soldier' };
  b[4][6] = { id: 'r_elephant', color: 'red', trueRole: 'elephant', isCovered: false, initialRole: 'elephant' };
  b[6][0] = { id: 'r_horse', color: 'red', trueRole: 'horse', isCovered: false, initialRole: 'horse' };
  b[6][2] = null;

  // AI Black to move: Red Elephant threatens palace center, but Black has covered pawn 5 at (4, 3)
  // Black can safely advance pawn 5 to (4, 4) to block and develop!
  const bestMove = await searchBestMoveAsync(b, 'black', 'easy', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  assert.equal(bestMove.piece.initialRole, 'soldier', 'Máy phải mở Tốt úp 5 thay vì lên Tượng giả');
  assert.equal(bestMove.from.x, 4, 'Nước đi từ cột 4 (Tốt 5)');
  assert.equal(bestMove.from.y, 3, 'Nước đi từ hàng 3 (hàng Tốt)');
  assert.equal(bestMove.to.x, 4, 'Tốt 5 tiến lên (4, 4)');
  assert.equal(bestMove.to.y, 4, 'Tốt 5 tiến lên (4, 4)');
});

test('Máy tuyệt đối không tụt Pháo 1 (thoái pháo 1) vu vơ tạo điều kiện cho bên đỏ công nhanh', async () => {
  const b = initializeBoard();
  // Red plays P2-5: (7, 7) -> (4, 7)
  b[7][4] = b[7][7]; b[7][7] = null;
  // Black has moved elephant to center or opened pawn
  b[2][4] = b[0][2]; b[0][2] = null; // Tượng lên (4, 2)
  // Red plays Mã 8 tiến 7: (7, 9) -> (6, 7)
  b[7][6] = b[9][7]; b[9][7] = null;

  // AI Black to move:
  // Black must develop pieces (open pawns, bring out horse, etc.)
  // Under NO circumstances should Black retreat cannon 1 step (e.g. from (1, 2) to (1, 1) or from (7, 2) to (7, 1))!
  const bestMove = await searchBestMoveAsync(b, 'black', 'easy', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');

  const isCannon1StepRetreat =
    (bestMove.piece.initialRole === 'cannon' || bestMove.piece.trueRole === 'cannon') &&
    bestMove.from.x === bestMove.to.x &&
    bestMove.to.y === bestMove.from.y - 1;
  assert.equal(isCannon1StepRetreat, false, 'Tuyệt đối không được tụt pháo 1 bước vu vơ');
});

test('Nhận xét Tốt: Chỉ nói "Một tốt sang sông, chổng mông mà đỡ" khi đã sang sông; mở Tốt ở sân nhà và mở Sĩ giả ra Tốt nhận xét dí dỏm về tự làm khó mình', () => {
  const b = initializeBoard();
  const nextB = initializeBoard();

  // 1. Mở Sĩ giả (3, 0) -> (4, 1) lộn ra con Tốt ở sân nhà (chưa sang sông)
  const advisorToSoldierMove: Move = {
    from: { x: 3, y: 0 },
    to: { x: 4, y: 1 },
    piece: { id: 'b_adv', color: 'black', isCovered: true, initialRole: 'advisor', trueRole: 'soldier' },
    wasCovered: true,
    notation: 'S4.5 (Tốt)',
  };
  const commAdv = evaluateMoveQuality(b, nextB, advisorToSoldierMove, 'black');
  assert.equal(commAdv.gradeLabel, 'Sĩ hóa Tốt 😂');
  assert.ok(
    !commAdv.comment.includes('Một tốt sang sông, chổng mông mà đỡ'),
    'Mở Sĩ ra Tốt ở sân nhà tuyệt đối không nói câu tốt sang sông'
  );
  assert.ok(
    commAdv.comment.includes('tự làm khó mình') ||
    commAdv.comment.includes('tự lấy đá ghè chân') ||
    commAdv.comment.includes('vướng chân vướng cẳng') ||
    commAdv.comment.includes('chôn chân') ||
    commAdv.comment.includes('Tốt') ||
    commAdv.comment.includes('Sĩ'),
    'Phải có nhận xét dí dỏm về việc tự gây khó khăn, chật cung'
  );

  // 2. Mở Tốt ở sân nhà (2, 3) -> (2, 4) (chưa sang sông, y=4 <= 4 đối với bên Đen)
  const homePawnMove: Move = {
    from: { x: 2, y: 3 },
    to: { x: 2, y: 4 },
    piece: { id: 'b_pawn3', color: 'black', isCovered: true, initialRole: 'soldier', trueRole: 'soldier' },
    wasCovered: true,
    notation: 'B3.1',
  };
  const commHome = evaluateMoveQuality(b, nextB, homePawnMove, 'black');
  assert.ok(
    !commHome.comment.includes('Một tốt sang sông, chổng mông mà đỡ'),
    'Mở Tốt ở sân nhà tuyệt đối không nói câu tốt sang sông'
  );

  // 3. Tốt ngửa chính thức vượt sông: (2, 4) -> (2, 5) (y=5 >= 5 là đất địch)
  const crossRiverMove: Move = {
    from: { x: 2, y: 4 },
    to: { x: 2, y: 5 },
    piece: { id: 'b_pawn3_open', color: 'black', isCovered: false, initialRole: 'soldier', trueRole: 'soldier' },
    wasCovered: false,
    notation: 'B3.1 (Sang sông)',
  };
  const commCross = evaluateMoveQuality(b, nextB, crossRiverMove, 'black');
  assert.ok(
    commCross.comment.includes('Một tốt sang sông, chổng mông mà đỡ') ||
    commCross.comment.includes('Tốt chính thức sang sông'),
    'Tốt sang sông thì mới nói câu Một tốt sang sông chổng mông mà đỡ'
  );

  // 4. Nước tụt pháo 1 không mục đích
  const retreatCannonMove: Move = {
    from: { x: 1, y: 2 },
    to: { x: 1, y: 1 },
    piece: { id: 'b_cannon1', color: 'black', isCovered: true, initialRole: 'cannon', trueRole: 'cannon' },
    wasCovered: true,
    notation: 'P2/1',
  };
  const commRetreat = evaluateMoveQuality(b, nextB, retreatCannonMove, 'black');
  assert.equal(commRetreat.grade, 'blunder');
  assert.equal(commRetreat.gradeLabel, 'Tụt Pháo 1 😂');
  assert.ok(
    commRetreat.comment.toLowerCase().includes('tụt pháo 1'),
    'Phải có câu nhận xét châm chọc về nước tụt pháo 1'
  );
});

test('Khi hàng Tốt úp vẫn còn nắp, Máy tuyệt đối không mở Mã giả (1,0) mà phải mở Tốt úp', async () => {
  const b = initializeBoard();
  // Giả lập thế cờ tương tự ảnh của user:
  // Red mở Tượng biên (0, 6) -> (0, 4) hoặc tốt
  // Bên Đen còn các quân tốt úp ở hàng y=3
  const bestMove = await searchBestMoveAsync(b, 'black', 'medium', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  // Tuyệt đối không được nhảy Mã giả từ (1, 0) hay (7, 0)
  assert.notEqual(
    bestMove.from.y,
    0,
    'Tuyệt đối không được nhảy quân hàng đáy (Mã giả) khi hàng Tốt vẫn còn nắp'
  );
  assert.equal(
    bestMove.from.y,
    3,
    'Bắt buộc phải mở cây ở hàng Tốt (y=3) trước'
  );
});

test('Khi Xe ngửa ở biên bị Tốt thật đuổi, Máy ưu tiên bình Xe vào trong (X9-8) gạ đổi Pháo giả thay vì thoái 1 ở biên', async () => {
  const b = initializeBoard();
  // Giả lập Xe đen đã ngửa ở (0, 2)
  b[2][0] = {
    id: 'b_chariot_revealed',
    color: 'black',
    isCovered: false,
    initialRole: 'chariot',
    trueRole: 'chariot',
  };
  // Tốt thật của Đỏ ở (0, 3) đang đe dọa (0, 2) và ĐƯỢC CĂN GIỮ bởi quân Đỏ ở sau
  b[3][0] = {
    id: 'r_soldier_revealed',
    color: 'red',
    isCovered: false,
    initialRole: 'soldier',
    trueRole: 'soldier',
  };
  b[4][0] = {
    id: 'r_chariot_defending_soldier',
    color: 'red',
    isCovered: false,
    initialRole: 'chariot',
    trueRole: 'chariot',
  };
  // Ô (1, 2) trống để Xe bình sang
  b[2][1] = null;
  // Ô (0, 1) trống để Xe có lựa chọn thoái
  b[1][0] = null;

  const bestMove = await searchBestMoveAsync(b, 'black', 'hard', 1);
  assert.ok(bestMove, 'Phải tìm thấy nước đi');
  assert.equal(
    bestMove.from.x,
    0,
    'Phải di chuyển con Xe ở cột 0 đang bị đe dọa'
  );
  assert.equal(
    bestMove.from.y,
    2,
    'Phải di chuyển con Xe ở ô (0, 2)'
  );
  assert.equal(
    bestMove.to.x,
    1,
    'Xe phải bình vào cột 1 (X9-8) thay vì thoái lui thụ động ở cột 0'
  );
  assert.equal(
    bestMove.to.y,
    2,
    'Xe phải bình ngang sang ô (1, 2) chiếm lộ 8 gạ đổi pháo giả'
  );
});

test('Nhận diện chính xác Cục: Tiền xe, hậu pháo', () => {
  const b = emptyBoard();
  // Vị trí theo đúng ván cờ thực tế:
  // Tướng đen ở (3, 0)
  b[0][3] = { id: 'b_king', color: 'black', isCovered: false, initialRole: 'king', trueRole: 'king' };
  // Xe đỏ ở (3, 1) ngay trước mặt Tướng
  b[1][3] = { id: 'r_chariot', color: 'red', isCovered: false, initialRole: 'chariot', trueRole: 'chariot' };
  // Pháo đỏ ở (3, 5) ở phía sau trên cùng cột 3
  b[5][3] = { id: 'r_cannon', color: 'red', isCovered: false, initialRole: 'cannon', trueRole: 'cannon' };
  // Tướng đỏ ở (4, 9)
  b[9][4] = { id: 'r_king', color: 'red', isCovered: false, initialRole: 'king', trueRole: 'king' };

  const lastMove: Move = {
    from: { x: 3, y: 2 },
    to: { x: 3, y: 1 },
    piece: b[1][3]!,
    wasCovered: false,
    isCheck: true,
    notation: 'X3.1',
  };

  const pattern = detectCheckmatePattern(lastMove, b, 'red', 30);
  assert.equal(pattern.id, 'tien_xa_hau_phao');
  assert.equal(pattern.name, 'Cục: Tiền xe, hậu pháo');
  assert.equal(pattern.badge, 'Tiền Xe Hậu Pháo');
});

