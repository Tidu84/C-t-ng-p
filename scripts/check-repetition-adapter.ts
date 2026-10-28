import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { applyRealMove, checkMoveRepetitionRules } from '../src/utils/chessRules';
import { toJieqiFen, legalEngineMove, engineRootMoves } from '../src/utils/jieqiProtocol';
import { runUci } from '../server/uciEngine';
import type { Move, Piece, PlayerColor } from '../src/types';
const lab = path.resolve('../engine-lab');
const games = (await readFile(path.join(lab, 'results/round-robin-300ms/games.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
const game = games.find(g => g.reason === 'illegal-move: g0g1');
assert.ok(game, 'Need recorded sixth-check regression position');
let board: (Piece | null)[][] = structuredClone(game.initial);
const history: Move[] = [];
for (const entry of game.moves) {
  if (entry.rejected) break;
  const turn = entry.turn as PlayerColor;
  const move = legalEngineMove(entry.move, board, turn, history)!;
  const moving = board[move.from.y][move.from.x]!, captured = board[move.to.y][move.to.x];
  const rep = checkMoveRepetitionRules(board, move.from, move.to, history);
  board = applyRealMove(board, move.from, move.to);
  history.push({ from: move.from, to: move.to, piece: board[move.to.y][move.to.x]!, captured: captured ? { ...captured, wasCoveredWhenCaptured: captured.isCovered } : undefined, wasCovered: moving.isCovered, notation: entry.move, isCheck: rep.isCheck, chasedPieceIds: rep.chasedPieceIds });
}
const allowed = engineRootMoves(board, 'black', history);
assert.equal(allowed.includes('g0g1'), false);
const result = await runUci({ executable: path.join(lab, 'bin/jqe.exe'), cwd: path.join(lab, 'jqe'), evalFile: 'engine/nets/it014.jqn' }, toJieqiFen(board, 'black', history), 500, 32, undefined, allowed);
assert.ok(legalEngineMove(result.move, board, 'black', history), result.move);
assert.notEqual(result.move, 'g0g1');
console.log(JSON.stringify({ status: 'PASS', previouslyRejected: 'g0g1', replacement: result.move, depth: result.depth, elapsedMs: result.elapsedMs }));
