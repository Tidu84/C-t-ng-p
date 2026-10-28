import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cancelCurrentWorkerSearch, searchBestMoveViaWorker } from './aiWorkerService';
import { getBoardHash } from './aiEngine';
import { initializeBoard } from './chessRules';

test('AI cache phân biệt Xe và Pháo nhưng không đọc danh tính quân úp', () => {
  const board = initializeBoard();
  const changed = board.map(row => row.map(piece => piece ? { ...piece } : null));
  changed[0][0]!.trueRole = board[0][0]!.trueRole === 'horse' ? 'advisor' : 'horse';
  assert.equal(getBoardHash(board, 'red'), getBoardHash(changed, 'red'));
  board[0][0] = { id: 'test', color: 'black', trueRole: 'chariot', isCovered: false };
  changed[0][0] = { ...board[0][0], trueRole: 'cannon' };
  assert.notEqual(getBoardHash(board, 'red'), getBoardHash(changed, 'red'));
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
