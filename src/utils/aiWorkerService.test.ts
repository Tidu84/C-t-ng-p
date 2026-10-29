import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cancelCurrentWorkerSearch, searchBestMoveViaWorker } from './aiWorkerService';
import { getBoardHash } from './aiEngine';
import { initializeBoard, getAllLegalMoves } from './chessRules';

test('AI cache phân biệt Xe và Pháo nhưng không đọc danh tính quân úp', () => {
  const board = initializeBoard();
  const changed = board.map(row => row.map(piece => piece ? { ...piece } : null));
  changed[0][0]!.trueRole = board[0][0]!.trueRole === 'horse' ? 'advisor' : 'horse';
  assert.equal(getBoardHash(board, 'red'), getBoardHash(changed, 'red'));
  board[0][0] = { id: 'test', color: 'black', trueRole: 'chariot', isCovered: false };
  changed[0][0] = { ...board[0][0], trueRole: 'cannon' };
  assert.notEqual(getBoardHash(board, 'red'), getBoardHash(changed, 'red'));
});

test('Người thường uses the WASM worker with public FEN; illegal suggestions fall back to local AI', async () => {
  const board = initializeBoard();
  const fallback = getAllLegalMoves(board, 'red')[0];
  let invalid = false;
  class FakeWorker {
    static instances: FakeWorker[] = [];
    onmessage: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    messages: any[] = [];
    wasm: boolean;
    constructor(url: URL | string) {
      this.wasm = String(url).includes('/engines/pikajieqi/');
      FakeWorker.instances.push(this);
      if (this.wasm) queueMicrotask(() => this.onmessage?.({ data: { type: 'READY' } }));
    }
    terminate() {}
    postMessage(data: any) {
      this.messages.push(data);
      queueMicrotask(() => this.onmessage?.({ data: this.wasm
        ? { type: 'RESULT', id: data.id, move: invalid ? 'a6a5' : 'a3a4', depth: 2, nodes: 10, score: 0, elapsedMs: 10 }
        : { type: 'SUCCESS', id: data.id, bestMove: fallback } }));
    }
  }
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const workerDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'Worker', { value: FakeWorker, configurable: true });
  try {
    const first = await searchBestMoveViaWorker(board, 'red', 'easy', 1);
    assert.deepEqual(first?.from, { x: 0, y: 6 });
    assert.deepEqual(first?.to, { x: 0, y: 5 });
    const wasm = FakeWorker.instances.find(w => w.wasm)!;
    const payload = wasm.messages[0];
    assert.equal(typeof payload.fen, 'string');
    assert.ok(payload.rootMoves.includes('a3a4'));
    assert.equal(Object.hasOwn(payload, 'board'), false);
    assert.equal(Object.hasOwn(payload, 'moveHistory'), false);
    assert.equal(JSON.stringify(payload).includes('trueRole'), false);
    invalid = true;
    const second = await searchBestMoveViaWorker(board, 'red', 'easy', 1);
    assert.deepEqual(second, fallback);
    assert.ok(FakeWorker.instances.some(w => !w.wasm));
    const cleanup = searchBestMoveViaWorker(board, 'red', 'hard', 1);
    cancelCurrentWorkerSearch();
    await cleanup;
  } finally {
    cancelCurrentWorkerSearch();
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else Reflect.deleteProperty(globalThis, 'window');
    if (workerDescriptor) Object.defineProperty(globalThis, 'Worker', workerDescriptor);
    else Reflect.deleteProperty(globalThis, 'Worker');
  }
});

test('hủy AI dừng worker, kết quả cũ không làm xong lượt mới; worker rảnh được tái sử dụng', async () => {
  class FakeWorker {
    static instances: FakeWorker[] = [];
    onmessage: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    messages: any[] = [];
    terminated = false;
    constructor() { FakeWorker.instances.push(this); }
    postMessage(message: any) { this.messages.push(message); }
    terminate() { this.terminated = true; }
    succeed(id: number) { this.onmessage?.({ data: { id, type: 'SUCCESS', bestMove: null } }); }
  }
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const workerDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'Worker', { value: FakeWorker, configurable: true });
  try {
    const first = searchBestMoveViaWorker([], 'black', 'hard', 15);
    const oldWorker = FakeWorker.instances[0];
    const next = searchBestMoveViaWorker([], 'red', 'medium', 2);
    assert.equal(await first, null);
    assert.equal(oldWorker.terminated, true);
    const freshWorker = FakeWorker.instances[1];
    let settled = false;
    void next.then(() => { settled = true; });
    oldWorker.succeed(oldWorker.messages[0].id);
    await Promise.resolve();
    assert.equal(settled, false);
    freshWorker.succeed(freshWorker.messages[0].id);
    await next;
    const third = searchBestMoveViaWorker([], 'black', 'medium', 2);
    assert.equal(FakeWorker.instances.length, 2);
    cancelCurrentWorkerSearch();
    assert.equal(await third, null);
    assert.equal(freshWorker.terminated, true);
  } finally {
    cancelCurrentWorkerSearch();
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else Reflect.deleteProperty(globalThis, 'window');
    if (workerDescriptor) Object.defineProperty(globalThis, 'Worker', workerDescriptor);
    else Reflect.deleteProperty(globalThis, 'Worker');
  }
});
