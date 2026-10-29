export interface BrowserJieqiRequest { fen: string; rootMoves: string[]; timeMs: number; depth: number }
export interface BrowserJieqiResult { move: string; depth: number; nodes: number; score: number; elapsedMs: number; engine: 'pikajieqi-wasm' }
let worker: Worker | null = null;
let ready = false;
let sequence = 0;
let retryAfter = 0;
let pending: { id: number; request: BrowserJieqiRequest; resolve: (value: BrowserJieqiResult | null) => void; reject: (error: Error) => void; progress?: (value: BrowserJieqiResult) => void; timer?: ReturnType<typeof setTimeout> } | null = null;

function dispose() { worker?.terminate(); worker = null; ready = false; }
function fail(error: Error) {
  const current = pending; pending = null;
  clearTimeout(current?.timer); dispose();
  retryAfter = Date.now() + 60000;
  current?.reject(error);
}
function send() {
  if (!pending || !ready || !worker) return;
  clearTimeout(pending.timer);
  pending.timer = setTimeout(() => fail(new Error('PikaJieQi time limit exceeded')), pending.request.timeMs + 750);
  worker.postMessage({ id: pending.id, ...pending.request });
}

export function cancelBrowserJieqiSearch() {
  if (!pending) return; // Keep an idle module ready for the next move.
  const current = pending; pending = null;
  clearTimeout(current.timer); dispose(); current.resolve(null);
}

export function searchBrowserJieqi(request: BrowserJieqiRequest, progress?: (value: BrowserJieqiResult) => void): Promise<BrowserJieqiResult | null> {
  cancelBrowserJieqiSearch();
  if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined' || Date.now() < retryAfter) return Promise.resolve(null);
  if (!request.rootMoves.length) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    pending = { id: ++sequence, request, resolve, reject, progress };
    pending.timer = setTimeout(() => fail(new Error('PikaJieQi loading timed out')), 20000);
    if (!worker) {
      try {
        worker = new Worker('/engines/pikajieqi/worker.js?v=single-worker-v1');
        const created = worker;
        worker.onerror = () => { if (worker === created) fail(new Error('PikaJieQi Worker failed')); };
        worker.onmessage = ({ data }) => {
          if (worker !== created) return;
          if (data.type === 'READY') { ready = true; console.info('[PikaJieQi WASM] ready: Threads=1, Hash=16MB, memoryMB=', data.memoryMb); send(); return; }
          if (data.type === 'ERROR') { fail(new Error(data.error)); return; }
          if (!pending || data.id !== pending.id) return;
          if (data.type === 'PROGRESS') pending.progress?.(data);
          if (data.type === 'RESULT') {
            const current = pending; pending = null; clearTimeout(current.timer);
            console.info('[PikaJieQi WASM] bestmove', data.move, 'depth', data.depth);
            current.resolve(data);
          }
        };
      } catch (error) { fail(error instanceof Error ? error : new Error(String(error))); }
    } else send();
  });
}
