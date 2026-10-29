import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchBrowserJieqi, cancelBrowserJieqiSearch } from './browserJieqi';

test('WASM worker loads lazily, reuses idle module, and cancellation kills CPU work and discards stale results', async () => {
  class FakeWorker {
    static instances: FakeWorker[] = [];
    onmessage: ((event: any) => void) | null = null;
    onerror: (() => void) | null = null;
    messages: any[] = []; terminated = false;
    constructor(readonly url: string) { FakeWorker.instances.push(this); }
    postMessage(data: any) { this.messages.push(data); }
    terminate() { this.terminated = true; }
    emit(data: any) { this.onmessage?.({ data }); }
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  Object.defineProperty(globalThis, 'Worker', { value: FakeWorker, configurable: true });
  const request = { fen: 'public-fen', rootMoves: ['a3a4'], timeMs: 500, depth: 2 };
  try {
    const first = searchBrowserJieqi(request);
    const worker = FakeWorker.instances[0];
    assert.equal(worker.messages.length, 0);
    worker.emit({ type: 'READY' });
    assert.equal(worker.messages[0].fen, request.fen);
    worker.emit({ type: 'RESULT', id: worker.messages[0].id, move: 'a3a4' });
    assert.equal((await first)?.move, 'a3a4');
    const second = searchBrowserJieqi(request);
    assert.equal(FakeWorker.instances.length, 1);
    cancelBrowserJieqiSearch();
    assert.equal(await second, null);
    assert.equal(worker.terminated, true);
    const third = searchBrowserJieqi(request);
    const fresh = FakeWorker.instances[1];
    fresh.emit({ type: 'READY' });
    let settled = false;
    void third.then(() => { settled = true; });
    worker.emit({ type: 'RESULT', id: worker.messages[1].id, move: 'i9i8' });
    await Promise.resolve();
    assert.equal(settled, false);
    fresh.emit({ type: 'RESULT', id: fresh.messages[0].id, move: 'a3a4' });
    assert.equal((await third)?.move, 'a3a4');
    const last = searchBrowserJieqi(request);
    cancelBrowserJieqiSearch();
    await last;
  } finally {
    cancelBrowserJieqiSearch();
    if (original) Object.defineProperty(globalThis, 'Worker', original);
    else Reflect.deleteProperty(globalThis, 'Worker');
  }
});
