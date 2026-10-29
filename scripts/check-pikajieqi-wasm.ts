import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initializeBoard, applyRealMove, getAllLegalMoves } from '../src/utils/chessRules';
import { toJieqiFen, legalEngineMove, engineRootMoves } from '../src/utils/jieqiProtocol';
import type { Move, Piece, PlayerColor } from '../src/types';

const directory = await mkdtemp(path.join(tmpdir(), 'pikajieqi-test-'));
try {
  const loader = path.join(directory, 'pikajieqi.cjs');
  await writeFile(loader, await readFile('public/engines/pikajieqi/pikajieqi.js'));
  const factory = createRequire(import.meta.url)(loader);
  const lines: string[] = [];
  const module = await factory({ noInitialRun: true, thisProgram: 'PikaJieQi', wasmBinary: await readFile('public/engines/pikajieqi/pikajieqi.wasm'), print: (line: string) => lines.push(line) });
  module.cwrap('pikajieqi_initialize', null, [])();
  const send = module.cwrap('pikajieqi_command', null, ['string']);
  send('uci'); assert.ok(lines.includes('uciok'));
  send('setoption name Threads value 1'); send('setoption name Hash value 16');
  send('isready'); assert.ok(lines.includes('readyok'));
  const initial = initializeBoard();
  let mixed = initial, turn: PlayerColor = 'red';
  const history: Move[] = [];
  for (let ply = 0; ply < 12; ply++) {
    const moves = getAllLegalMoves(mixed, turn, history);
    const move = moves.find(m => m.piece.isCovered && m.piece.initialRole === 'soldier') ?? moves[0];
    if (!move) break;
    mixed = applyRealMove(mixed, move.from, move.to);
    history.push({ from: move.from, to: move.to, piece: mixed[move.to.y][move.to.x]!, wasCovered: move.piece.isCovered,
      captured: move.captured ? { ...move.captured, wasCoveredWhenCaptured: move.captured.isCovered } : undefined, notation: '' });
    turn = turn === 'red' ? 'black' : 'red';
  }
  const revealed: (Piece | null)[][] = Array.from({ length: 10 }, () => Array(9).fill(null));
  revealed[0][4] = { id: 'bk', color: 'black', trueRole: 'king', isCovered: false };
  revealed[9][3] = { id: 'rk', color: 'red', trueRole: 'king', isCovered: false };
  revealed[2][4] = { id: 'r1', color: 'red', trueRole: 'chariot', isCovered: false };
  revealed[1][3] = { id: 'r2', color: 'red', trueRole: 'chariot', isCovered: false };
  const cases = [
    { name: 'opening-red', board: initial, turn: 'red' as PlayerColor, history: [] as Move[] },
    { name: 'opening-black', board: initial, turn: 'black' as PlayerColor, history: [] as Move[] },
    { name: 'mixed-reveals', board: mixed, turn, history },
    { name: 'all-revealed', board: revealed, turn: 'red' as PlayerColor, history: [] as Move[] },
    { name: 'restricted-root', board: initial, turn: 'red' as PlayerColor, history: [] as Move[], roots: ['a3a4'] },
  ];
  const results = [];
  for (const position of cases) {
    const fen = toJieqiFen(position.board, position.turn, position.history);
    const roots = position.roots ?? engineRootMoves(position.board, position.turn, position.history);
    const hiddenChanged = position.board.map(row => row.map(p => p?.isCovered ? { ...p, trueRole: 'soldier' as const } : p));
    assert.equal(toJieqiFen(hiddenChanged, position.turn, position.history), fen);
    lines.length = 0;
    send('ucinewgame'); send(`position fen ${fen}`);
    const start = performance.now();
    send(`go movetime 300 depth 4 searchmoves ${roots.join(' ')}`);
    const elapsedMs = performance.now() - start;
    const best = lines.find(line => line.startsWith('bestmove '))?.split(/\s+/)[1];
    assert.ok(best, position.name);
    assert.ok(roots.includes(best), best);
    assert.ok(legalEngineMove(best, position.board, position.turn, position.history), best);
    results.push({ case: position.name, move: best, elapsedMs: Math.round(elapsedMs), legal: true });
  }
  await mkdir('docs/engine-results', { recursive: true });
  const report = { status: 'PASS', engine: 'pikajieqi-wasm', results };
  await writeFile('docs/engine-results/pikajieqi-wasm-smoke.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  assert.equal(path.dirname(directory), path.resolve(tmpdir()));
  assert.ok(path.basename(directory).startsWith('pikajieqi-test-'));
  await rm(directory, { recursive: true, force: true });
}
