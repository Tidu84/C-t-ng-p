/* PikaJieQi GPL-3.0-or-later bridge. See COPYING.txt, AUTHORS.txt and source.zip. */
let module, command, active, stats;
const base = new URL('./', self.location.href).href;
const emit = line => {
  if (!active) return;
  const depth = line.match(/\bdepth (\d+)/);
  const nodes = line.match(/\bnodes (\d+)/);
  const score = line.match(/\bscore cp (-?\d+)/);
  const mate = line.match(/\bscore mate (-?\d+)/);
  if (depth) stats.depth = Number(depth[1]);
  if (nodes) stats.nodes = Number(nodes[1]);
  if (score) stats.score = Number(score[1]);
  if (mate) stats.score = Math.sign(Number(mate[1])) * 25000;
  if (depth) self.postMessage({ type: 'PROGRESS', id: active.id, ...stats, elapsedMs: performance.now() - active.start });
  if (line.startsWith('bestmove ')) {
    self.postMessage({ type: 'RESULT', id: active.id, move: line.split(/\s+/)[1], ...stats,
      elapsedMs: performance.now() - active.start, engine: 'pikajieqi-wasm' });
    active = null;
  }
};
const ready = (async () => {
  importScripts(base + 'pikajieqi.js?v=single-worker-v1');
  module = await PikaJieQi({ noInitialRun: true, thisProgram: 'PikaJieQi', locateFile: file => base + file + '?v=single-worker-v1', print: emit, printErr: () => {} });
  module.cwrap('pikajieqi_initialize', null, [])();
  command = module.cwrap('pikajieqi_command', null, ['string']);
  // This build fixes Threads=1 and defaults Hash=16. Reapplying them would
  // destroy/reallocate the same tables and needlessly raise peak memory.
  self.postMessage({ type: 'READY', engine: 'pikajieqi-wasm', memoryMb: module.HEAPU8.buffer.byteLength / 1048576 });
})();
ready.catch(error => self.postMessage({ type: 'ERROR', error: String(error) }));
self.onmessage = async ({ data }) => {
  try {
    await ready;
    active = { id: data.id, start: performance.now() };
    stats = { depth: 0, nodes: 0, score: 0 };
    command('ucinewgame');
    command('position fen ' + data.fen);
    // Synchronous C++ runs only in this Worker. Terminating it interrupts actual CPU work.
    command(`go movetime ${data.timeMs} depth ${data.depth} searchmoves ${data.rootMoves.join(' ')}`);
    if (active) throw new Error('Engine did not produce a best move');
  } catch (error) {
    self.postMessage({ type: 'ERROR', id: data.id, error: String(error) });
    active = null;
  }
};
