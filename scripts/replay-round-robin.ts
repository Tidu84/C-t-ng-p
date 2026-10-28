import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { applyRealMove, getAllLegalMoves, checkMoveRepetitionRules, countPliesSinceLastCapture, hasInsufficientMaterial, NO_CAPTURE_DRAW_PLIES } from '../src/utils/chessRules';
import { toJieqiFen, legalEngineMove } from '../src/utils/jieqiProtocol';
import type { Move, Piece, PlayerColor } from '../src/types';

const label = process.env.MATCH_LABEL || 'round-robin-300ms';
assert.match(label, /^[a-zA-Z0-9_-]+$/);
const root = path.resolve('../engine-lab/results', label);
const games = (await readFile(path.join(root, 'games.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
let verifiedPlies = 0, rejected = 0;
const rejectionDetails: unknown[] = [];
for (const game of games) {
  let board: (Piece | null)[][] = structuredClone(game.initial), turn: PlayerColor = 'red';
  const history: Move[] = [];
  for (const entry of game.moves) {
    assert.equal(entry.turn, turn);
    assert.equal(toJieqiFen(board, turn, history), entry.fen);
    // Changing every still-hidden role must not change the payload seen by an engine.
    const hiddenChanged = board.map(row => row.map(p => p?.isCovered ? { ...p, trueRole: 'soldier' as const } : p));
    assert.equal(toJieqiFen(hiddenChanged, turn, history), entry.fen);
    const move = legalEngineMove(entry.move, board, turn, history);
    if (entry.rejected) {
      assert.equal(move, null); assert.equal(game.faultSide, turn); rejected++;
      if (/^[a-i][0-9][a-i][0-9]/.test(entry.move)) {
        const from = { x: entry.move.charCodeAt(0)-97, y: 9-Number(entry.move[1]) };
        const to = { x: entry.move.charCodeAt(2)-97, y: 9-Number(entry.move[3]) };
        rejectionDetails.push({ id: game.id, side: turn, token: entry.move, legalWithoutRepetitionHistory: !!legalEngineMove(entry.move, board, turn), repetition: checkMoveRepetitionRules(board, from, to, history) });
      }
      break;
    }
    assert.ok(move, `${game.id}: illegal recorded move ${entry.move}`);
    const moving = board[move.from.y][move.from.x]!, victim = board[move.to.y][move.to.x];
    assert.equal(entry.reveal, moving.isCovered ? moving.trueRole : null);
    const rep = checkMoveRepetitionRules(board, move.from, move.to, history);
    board = applyRealMove(board, move.from, move.to);
    history.push({ from: move.from, to: move.to, piece: board[move.to.y][move.to.x]!, captured: victim ? { ...victim, wasCoveredWhenCaptured: victim.isCovered, capturedBy: turn } : undefined, wasCovered: moving.isCovered, notation: entry.move, isCheck: rep.isCheck, chasedPieceIds: rep.chasedPieceIds, consecutiveChecks: rep.consecutiveChecks, consecutiveChases: rep.consecutiveChases });
    turn = turn === 'red' ? 'black' : 'red'; verifiedPlies++;
  }
  assert.equal(history.length, game.plies);
  if (game.reason === 'no-legal-moves') { assert.equal(getAllLegalMoves(board, turn, history).length, 0); assert.equal(game.winner, turn === 'red' ? 'black' : 'red'); }
  else if (game.reason === 'app-draw-rule') { assert.ok(countPliesSinceLastCapture(history) >= NO_CAPTURE_DRAW_PLIES || hasInsufficientMaterial(board)); assert.equal(game.winner, 'draw'); }
  else if (game.reason === '220-ply-test-cap') assert.equal(history.length, 220);
}
const pairs = new Map<string, Set<string>>();
for (const game of games) {
  const key = [game.seed, ...[game.red, game.black].sort()].join('-');
  const seen = pairs.get(key) ?? new Set<string>();
  seen.add(game.red); pairs.set(key, seen);
}
const result = { games: games.length, verifiedPlies, rejected, rejectionDetails, colorPairsComplete: [...pairs.values()].every(pair => pair.size === 2), privacyInvariant: 'Every logged public FEN unchanged when all covered identities replaced', status: 'PASS' };
await writeFile(path.join(root, 'replay-check.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
