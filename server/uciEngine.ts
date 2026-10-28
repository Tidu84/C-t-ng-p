import { spawn } from 'node:child_process';
import path from 'node:path';

export interface UciConfig { executable: string; evalFile?: string; cwd?: string; warmup?: boolean }
export interface UciResult { move: string; depth: number; nodes: number; score: number; elapsedMs: number; log: string[] }

/** One isolated process per experiment/search; cancellation kills the actual engine. */
export function runUci(config: UciConfig, fen: string, timeMs: number, depth: number, signal?: AbortSignal, rootMoves?: string[]): Promise<UciResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('Search cancelled')); return; }
    const child = spawn(path.resolve(config.executable), [], { cwd: config.cwd ?? path.dirname(path.resolve(config.executable)), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let done = false, searching = false, buffer = '', started = 0, lastDepth = 0, nodes = 0, score = 0;
    let warming = false, warmed = false;
    const log: string[] = [];
    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout>;
    const send = (line: string) => { if (!child.stdin.destroyed) child.stdin.write(line + '\n'); };
    const finish = (error?: Error, move?: string) => {
      if (done) return;
      done = true;
      clearTimeout(deadline); clearTimeout(stopTimer);
      signal?.removeEventListener('abort', cancel);
      child.kill();
      if (error) reject(error);
      else resolve({ move: move!, depth: lastDepth, nodes, score, elapsedMs: Date.now() - started, log });
    };
    const cancel = () => finish(new Error('Search cancelled'));
    signal?.addEventListener('abort', cancel, { once: true });
    deadline = setTimeout(() => finish(new Error('Engine initialization timed out')), 30000);
    child.on('error', error => finish(error));
    child.stdin.on('error', error => finish(error));
    child.on('exit', code => { if (!done) finish(new Error(`Engine exited (${code}): ${log.slice(-3).join(' | ')}`)); });
    child.stderr.on('data', chunk => { log.push(String(chunk).trim().slice(0, 1500)); if (log.length > 30) log.shift(); });
    child.stdout.on('data', chunk => {
      buffer += String(chunk);
      const lines = buffer.split(/\r?\n/); buffer = lines.pop()!;
      if (buffer.length > 65536) { finish(new Error('Engine output too large')); return; }
      for (const line of lines) {
        log.push(line.slice(0, 1500)); if (log.length > 30) log.shift();
        if (line === 'uciok') {
          send('setoption name Threads value 1'); send('setoption name Hash value 32');
          if (config.evalFile) send(`setoption name EvalFile value ${config.evalFile}`);
          send('isready');
        } else if (line === 'readyok' && !searching) {
          if (config.warmup && !warmed) {
            // AB loads its NNUE on the first go; do not spend its move budget loading the model.
            warmed = true; warming = true;
            send(`position fen ${fen}`); send('go depth 1');
            continue;
          }
          lastDepth = 0; nodes = 0; score = 0;
          searching = true; started = Date.now(); clearTimeout(deadline);
          send('ucinewgame'); send(`position fen ${fen}`); send(`go movetime ${timeMs} depth ${depth}${rootMoves?.length ? ' searchmoves ' + rootMoves.join(' ') : ''}`);
          stopTimer = setTimeout(() => send('stop'), timeMs + 200);
          deadline = setTimeout(() => finish(new Error('Engine search timed out')), timeMs + 4000);
        } else if (line.startsWith('info ')) {
          lastDepth = Number(line.match(/\bdepth (\d+)/)?.[1] ?? lastDepth);
          nodes = Number(line.match(/\bnodes (\d+)/)?.[1] ?? nodes);
          const cp = line.match(/\bscore cp (-?\d+)/);
          const mate = line.match(/\bscore mate (-?\d+)/);
          if (cp) score = Number(cp[1]);
          else if (mate) score = Math.sign(Number(mate[1])) * 25000;
        } else if (line.startsWith('bestmove ')) {
          if (warming) {
            warming = false;
            send('ucinewgame'); send('isready');
            continue;
          }
          finish(undefined, line.split(/\s+/)[1]);
        }
      }
    });
    send('uci');
  });
}
