import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { MatchEngine } from './lib/matchEngine';
import { initializeBoard, RED_SLOTS, BLACK_SLOTS, HIDDEN_PIECES_POOL, applyRealMove, getAllLegalMoves, checkMoveRepetitionRules, countPliesSinceLastCapture, hasInsufficientMaterial, NO_CAPTURE_DRAW_PLIES } from '../src/utils/chessRules';
import { toJieqiFen, legalEngineMove } from '../src/utils/jieqiProtocol';
import type { Move, Piece, PlayerColor } from '../src/types';

const lab = path.resolve('../engine-lab');
const timeMs = Number(process.env.MATCH_TIME_MS || 300);
const deals = Number(process.env.MATCH_DEALS || 2);
const maxPlies = 220;
const rootFilter = process.env.MATCH_ROOT_FILTER === '1';
const label = process.env.MATCH_LABEL || `round-robin-${timeMs}ms`;
if (!/^[a-zA-Z0-9_-]+$/.test(label)) throw new Error('Invalid match label');
const out = path.join(lab, 'results', label);
await mkdir(out, { recursive: true });
const engines = [
  new MatchEngine('jqe', { executable: path.join(lab, 'bin/jqe.exe'), cwd: path.join(lab, 'jqe'), evalFile: 'engine/nets/it014.jqn' }),
  new MatchEngine('pikajieqi', { executable: path.join(lab, 'bin/pikajieqi.exe') }),
  new MatchEngine('abjchess', { executable: path.join(lab, 'ab-release/0.2d_bmi2/AB-JChess.exe'), evalFile: 'abjchess-20261010.nnue' }),
];
const seededBoard = (seed: number) => {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const board = initializeBoard();
  for (const slots of [RED_SLOTS, BLACK_SLOTS]) {
    const pool = [...HIDDEN_PIECES_POOL];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    slots.forEach((slot, i) => { board[slot.y][slot.x] = { ...board[slot.y][slot.x]!, trueRole: pool[i] }; });
  }
  return board;
};
const results: any[] = [];
try { const prior = await readFile(path.join(out, 'games.jsonl'), 'utf8'); for (const line of prior.trim().split('\n')) if (line) results.push(JSON.parse(line)); } catch {}
const summary = () => {
  const standings = Object.fromEntries(engines.map(e => [e.name, { games: 0, wins: 0, draws: 0, losses: 0, points: 0, faults: 0 }]));
  for (const game of results) {
    for (const side of ['red', 'black'] as const) {
      const row = standings[game[side]]; row.games++;
      if (game.winner === 'draw') { row.draws++; row.points += 0.5; }
      else if (game.winner === side) { row.wins++; row.points++; }
      else row.losses++;
      if (game.faultSide === side) row.faults++;
    }
  }
  return { completed: results.length, scheduled: 6 * deals, timeMs, rootFilter, threads: 1, hashMb: 32, standings, note: 'App-rules compatibility tournament; finite paired deals, no absolute Elo claim' };
};
const liveFile = path.join(out, 'live.json');
const start = Date.now();
const close = () => engines.forEach(e => e.close());
process.on('SIGINT', () => { close(); process.exit(130); });
process.on('SIGTERM', () => { close(); process.exit(143); });
try {
  const warmups = [];
  for (const engine of engines) { warmups.push(await engine.start(toJieqiFen(seededBoard(2026102801), 'red'))); console.log('READY', engine.name); }
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), timeMs, deals, maxPlies, rootFilter, threads: 1, hashMb: 32, rules: 'Current app: 80 no-capture plies; 6th consecutive same-piece check/chase prohibited; no automatic material draw except bare kings; hidden captures anonymous to both', initialization: 'Persistent native processes; depth-1 network warmup before clocks, reset between games; FEN per move without engine repetition history', cpu: os.cpus()[0]?.model, warmups, hashes: await Promise.all(engines.map(async e => ({ name: e.name, executable: createHash('sha256').update(await readFile(e.config.executable)).digest('hex'), network: e.config.evalFile ? createHash('sha256').update(await readFile(path.resolve(e.config.cwd ?? path.dirname(e.config.executable), e.config.evalFile))).digest('hex') : null }))) }, null, 2));
  for (let d = 0; d < deals; d++) for (let i = 0; i < engines.length; i++) for (let j = i + 1; j < engines.length; j++) for (const swap of [false, true]) {
    const seed = 2026102801 + d;
    const red = engines[swap ? j : i], black = engines[swap ? i : j];
    const id = `${seed}-${red.name}-${black.name}`;
    if (results.some(g => g.id === id)) continue;
    await red.newGame(); await black.newGame();
    let board = seededBoard(seed), turn: PlayerColor = 'red';
    const initial = structuredClone(board);
    const history: Move[] = [], moves: any[] = [];
    let winner: PlayerColor | 'draw' | undefined, reason = '', faultSide: PlayerColor | undefined;
    console.log('START', id);
    for (let ply = 0; ply < maxPlies; ply++) {
      const legal = getAllLegalMoves(board, turn, history);
      if (!legal.length) { winner = turn === 'red' ? 'black' : 'red'; reason = 'no-legal-moves'; break; }
      const player = turn === 'red' ? red : black;
      const fen = toJieqiFen(board, turn, history);
      let search;
      try { search = await player.search(fen, timeMs, rootFilter ? legal.map(m => `${String.fromCharCode(97 + m.from.x)}${9-m.from.y}${String.fromCharCode(97 + m.to.x)}${9-m.to.y}`) : undefined); }
      catch (error) { winner = turn === 'red' ? 'black' : 'red'; faultSide = turn; reason = `engine-error: ${String(error)}`; break; }
      const move = legalEngineMove(search.move, board, turn, history);
      if (!move) { winner = turn === 'red' ? 'black' : 'red'; faultSide = turn; reason = `illegal-move: ${search.move}`; moves.push({ ply, turn, fen, ...search, rejected: true }); break; }
      const moving = board[move.from.y][move.from.x]!;
      const captured = board[move.to.y][move.to.x];
      const rep = checkMoveRepetitionRules(board, move.from, move.to, history);
      board = applyRealMove(board, move.from, move.to);
      const record: Move = { from: move.from, to: move.to, piece: board[move.to.y][move.to.x]!, captured: captured ? { ...captured, wasCoveredWhenCaptured: captured.isCovered, capturedBy: turn } : undefined, wasCovered: moving.isCovered, notation: search.move, isCheck: rep.isCheck, chasedPieceIds: rep.chasedPieceIds, consecutiveChecks: rep.consecutiveChecks, consecutiveChases: rep.consecutiveChases };
      history.push(record);
      moves.push({ ply, turn, fen, ...search, reveal: moving.isCovered ? moving.trueRole : null, captured: record.captured ?? null });
      const opponent: PlayerColor = turn === 'red' ? 'black' : 'red';
      if (captured?.trueRole === 'king' || !getAllLegalMoves(board, opponent, history).length) { winner = turn; reason = captured?.trueRole === 'king' ? 'king-captured' : 'no-legal-moves'; break; }
      if (countPliesSinceLastCapture(history) >= NO_CAPTURE_DRAW_PLIES || hasInsufficientMaterial(board)) { winner = 'draw'; reason = 'app-draw-rule'; break; }
      turn = opponent;
      if (ply % 10 === 0) { await writeFile(liveFile, JSON.stringify({ id, ply: ply + 1, elapsedSeconds: Math.round((Date.now() - start) / 1000), ...summary() }, null, 2)); console.log('PLY', id, ply + 1); }
    }
    winner ??= 'draw'; reason ||= '220-ply-test-cap';
    const game = { id, seed, red: red.name, black: black.name, winner, reason, faultSide, plies: history.length, initial, moves };
    results.push(game);
    await appendFile(path.join(out, 'games.jsonl'), JSON.stringify(game) + '\n');
    await writeFile(path.join(out, 'summary.json'), JSON.stringify(summary(), null, 2));
    await writeFile(liveFile, JSON.stringify({ lastGame: id, ...summary() }, null, 2));
    console.log('RESULT', id, winner, reason, history.length, JSON.stringify(summary().standings));
  }
} finally { close(); }
console.log('FINAL', JSON.stringify(summary()));
