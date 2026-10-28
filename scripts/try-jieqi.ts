import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runUci, type UciConfig } from '../server/uciEngine';
import { initializeBoard, applyRealMove, getAllLegalMoves } from '../src/utils/chessRules';
import { toJieqiFen, legalEngineMove } from '../src/utils/jieqiProtocol';
import type { Piece, Move, PlayerColor } from '../src/types';

const lab = path.resolve('../engine-lab');
const configs: Record<string, UciConfig> = {
  jqe: { executable: path.join(lab, 'bin/jqe.exe'), cwd: path.join(lab, 'jqe'), evalFile: 'engine/nets/it014.jqn' },
  pikajieqi: { executable: path.join(lab, 'bin/pikajieqi.exe') },
  abjchess: { executable: path.join(lab, 'ab-release/0.2d_bmi2/AB-JChess.exe'), evalFile: 'abjchess-20261010.nnue' },
};
const seedBoard = initializeBoard();
// Fix one public reveal sequence so all candidates receive identical observations.
let board = seedBoard, turn: PlayerColor = 'red';
const history: Move[] = [];
for (let ply = 0; ply < 12; ply++) {
  const moves = getAllLegalMoves(board, turn, history);
  if (!moves.length) break;
  const selected = moves.find(m => m.piece.isCovered && m.piece.initialRole === 'soldier') ?? moves[0];
  const wasCovered = selected.piece.isCovered;
  const captured = selected.captured ? { ...selected.captured, wasCoveredWhenCaptured: selected.captured.isCovered } : undefined;
  board = applyRealMove(board, selected.from, selected.to);
  history.push({ from: selected.from, to: selected.to, piece: board[selected.to.y][selected.to.x]!, captured, wasCovered, notation: '' });
  turn = turn === 'red' ? 'black' : 'red';
}
const bare = (): (Piece | null)[][] => Array.from({ length: 10 }, () => Array(9).fill(null));
const king = (color: PlayerColor): Piece => ({ id: `${color}K`, color, trueRole: 'king', isCovered: false });
const mate = bare(); mate[0][4] = king('black'); mate[9][3] = king('red');
mate[2][4] = { id: 'r', color: 'red', trueRole: 'chariot', isCovered: false };
mate[1][3] = { id: 'r2', color: 'red', trueRole: 'chariot', isCovered: false };
const cases = [
  { name: 'opening-red', board: seedBoard, turn: 'red' as PlayerColor, history: [] as Move[] },
  { name: 'opening-black', board: seedBoard, turn: 'black' as PlayerColor, history: [] as Move[] },
  { name: 'mixed-after-reveals', board, turn, history },
  { name: 'all-revealed', board: mate, turn: 'red' as PlayerColor, history: [] as Move[] },
];
const results: any[] = [];
for (const [name, config] of Object.entries(configs)) {
  for (const position of cases) {
    const fen = toJieqiFen(position.board, position.turn, position.history);
    try {
      const result = await runUci(config, fen, 800, 5);
      const legal = !!legalEngineMove(result.move, position.board, position.turn, position.history);
      const row = { engine: name, case: position.name, fen, legal, ...result };
      results.push(row); console.log(name, position.name, result.move, legal ? 'LEGAL' : 'REJECTED', `${result.elapsedMs}ms`);
    } catch (error) {
      results.push({ engine: name, case: position.name, fen, error: String(error) });
      console.log(name, position.name, String(error).slice(0, 240));
    }
  }
}
await mkdir(path.join(lab, 'results'), { recursive: true });
await writeFile(path.join(lab, 'results/smoke.json'), JSON.stringify({ createdAt: new Date().toISOString(), note: 'Smoke test only, not Elo measurement', results }, null, 2));
console.log('Results:', path.join(lab, 'results/smoke.json'));
