import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import type { UciConfig } from '../../server/uciEngine';

export class MatchEngine {
  private child!: ChildProcessWithoutNullStreams;
  private listener?: (line: string) => void;
  private fatal?: Error;
  private tail: string[] = [];
  constructor(readonly name: string, readonly config: UciConfig) {}
  private send(line: string) { this.child.stdin.write(line + '\n'); }
  private wait(predicate: (line: string) => boolean, command: () => void, timeoutMs = 30000): Promise<string[]> {
    if (this.fatal) return Promise.reject(this.fatal);
    return new Promise((resolve, reject) => {
      const lines: string[] = [];
      const timeout = setTimeout(() => { this.listener = undefined; reject(new Error(`${this.name}: timeout ${this.tail.slice(-3).join(' | ')}`)); }, timeoutMs);
      this.listener = line => {
        if (line.startsWith('FATAL ')) { clearTimeout(timeout); this.listener = undefined; reject(new Error(line)); return; }
        lines.push(line);
        if (predicate(line)) { clearTimeout(timeout); this.listener = undefined; resolve(lines); }
      };
      command();
    });
  }
  async start(warmupFen: string) {
    this.child = spawn(path.resolve(this.config.executable), [], { cwd: this.config.cwd ?? path.dirname(path.resolve(this.config.executable)), windowsHide: true });
    let buffer = '';
    const fatal = (reason: string) => { this.fatal = new Error(`${this.name}: ${reason}`); this.listener?.(`FATAL ${this.fatal.message}`); };
    this.child.on('error', error => fatal(String(error)));
    this.child.on('exit', code => fatal(`exit ${code}`));
    this.child.stdin.on('error', error => fatal(String(error)));
    this.child.stderr.on('data', data => { this.tail.push(String(data).slice(0, 1000)); if (this.tail.length > 30) this.tail.shift(); });
    this.child.stdout.on('data', data => {
      buffer += String(data);
      const lines = buffer.split(/\r?\n/); buffer = lines.pop()!;
      for (const line of lines) {
        this.tail.push(line); if (this.tail.length > 30) this.tail.shift();
        this.listener?.(line);
      }
    });
    await this.wait(line => line === 'uciok', () => this.send('uci'));
    await this.wait(line => line === 'readyok', () => {
      this.send('setoption name Threads value 1'); this.send('setoption name Hash value 32');
      if (this.config.evalFile) this.send(`setoption name EvalFile value ${this.config.evalFile}`);
      this.send('isready');
    });
    // Networks may load lazily on the first go. Do not charge model loading to the first move.
    const warmup = await this.wait(line => line.startsWith('bestmove '), () => { this.send(`position fen ${warmupFen}`); this.send('go depth 1'); });
    await this.newGame();
    return { name: this.name, warmup: warmup.filter(line => /loaded|inference_complete|bestmove|depth/.test(line)).slice(-8) };
  }
  async newGame() { await this.wait(line => line === 'readyok', () => { this.send('ucinewgame'); this.send('isready'); }); }
  async search(fen: string, timeMs: number, rootMoves?: string[]) {
    const start = performance.now();
    const stop = setTimeout(() => this.send('stop'), timeMs + 100);
    try {
      const lines = await this.wait(line => line.startsWith('bestmove '), () => { this.send(`position fen ${fen}`); this.send(`go movetime ${timeMs}${rootMoves?.length ? ' searchmoves ' + rootMoves.join(' ') : ''}`); }, timeMs + 3000);
      const move = lines.filter(line => line.startsWith('bestmove ')).at(-1)!.split(/\s+/)[1];
      const info = lines.filter(line => line.startsWith('info ') && /\bdepth \d+/.test(line)).at(-1) ?? '';
      return { move, elapsedMs: Math.round(performance.now() - start), depth: Number(info.match(/\bdepth (\d+)/)?.[1] || 0), nodes: Number(info.match(/\bnodes (\d+)/)?.[1] || 0) };
    } finally { clearTimeout(stop); }
  }
  close() { if (this.child && !this.child.killed) this.child.kill(); }
}
