/**
 * AI Worker Service
 * Bridges React UI components to the background AI Web Worker.
 * If Web Workers are unavailable, falls back to direct execution.
 */
import { PlayerColor, Move, AiThinkingStats } from '../types';
import { DetailedMove } from './chessRules';
import { searchBestMoveAsync } from './aiEngine';
import type { AiWorkerResponse } from '../workers/aiWorker';
import { toJieqiFen, legalEngineMove, engineRootMoves } from './jieqiProtocol';

let workerInstance: Worker | null = null;
let externalSearch: AbortController | null = null;
let currentSearchId = 0;
let currentResolve: ((move: DetailedMove | null) => void) | null = null;
let currentReject: ((err: Error) => void) | null = null;
let currentProgressCallback: ((stats: AiThinkingStats) => void) | null = null;

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL('../workers/aiWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerInstance.onmessage = (e: MessageEvent<AiWorkerResponse>) => {
        const msg = e.data;
        if (!msg || msg.id !== currentSearchId) return;

        if (msg.type === 'PROGRESS') {
          currentProgressCallback?.(msg.stats);
        } else if (msg.type === 'SUCCESS') {
          const res = currentResolve;
          currentResolve = null;
          currentReject = null;
          currentProgressCallback = null;
          res?.(msg.bestMove);
        } else if (msg.type === 'ERROR') {
          const rej = currentReject;
          currentResolve = null;
          currentReject = null;
          currentProgressCallback = null;
          rej?.(new Error(msg.error));
        }
      };

      workerInstance.onerror = (err) => {
        console.error('AI Web Worker error:', err);
        workerInstance?.terminate();
        workerInstance = null;
        const rej = currentReject;
        currentResolve = null;
        currentReject = null;
        currentProgressCallback = null;
        rej?.(new Error('AI Web Worker computation error'));
      };
    } catch (e) {
      console.warn('Failed to initialize AI Web Worker, falling back to main-thread search:', e);
      workerInstance = null;
    }
  }
  return workerInstance;
}

export function cancelCurrentWorkerSearch(): void {
  currentSearchId++;
  externalSearch?.abort();
  externalSearch = null;
  if (workerInstance && currentResolve) {
    // Messages cannot interrupt synchronous minimax recursion. Stop the CPU work itself.
    workerInstance.terminate();
    workerInstance = null;
  }
  if (currentResolve) {
    currentResolve(null);
    currentResolve = null;
    currentReject = null;
    currentProgressCallback = null;
  }
}

export async function searchBestMoveViaWorker(
  board: (any | null)[][],
  color: PlayerColor,
  difficulty: 'easy' | 'medium' | 'hard',
  maxTimeSeconds: number,
  onProgress?: (stats: AiThinkingStats) => void,
  moveHistory?: Move[]
): Promise<DetailedMove | null> {
  cancelCurrentWorkerSearch();
  const requestId = currentSearchId;
  const apiUrl = import.meta.env?.VITE_JIEQI_ENGINE_URL || (import.meta.env?.DEV ? '/api/engine-move' : '');
  if (apiUrl && apiUrl !== 'off') {
    const abort = new AbortController();
    externalSearch = abort;
    const start = Date.now();
    const timeout = setTimeout(() => abort.abort(), (Math.min(maxTimeSeconds, 15) + 8) * 1000);
    const progress = setInterval(() => {
      if (requestId === currentSearchId) onProgress?.({ depth: 0, nodes: 0, score: 0, timeSpent: (Date.now() - start) / 1000, maxTime: maxTimeSeconds });
    }, 250);
    try {
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
        body: JSON.stringify({ fen: toJieqiFen(board, color, moveHistory), rootMoves: engineRootMoves(board, color, moveHistory), difficulty, maxTimeSeconds }) });
      if (requestId !== currentSearchId) return null;
      if (response.ok) {
        const result = await response.json();
        if (requestId !== currentSearchId) return null;
        const move = typeof result.move === 'string' ? legalEngineMove(result.move, board, color, moveHistory) : null;
        if (move) {
          onProgress?.({ depth: result.depth || 0, nodes: result.nodes || 0, score: result.score || 0, timeSpent: result.elapsedMs / 1000, maxTime: maxTimeSeconds });
          return move;
        }
        console.warn('Jieqi suggestion rejected by app rules; using local AI.');
      }
    } catch { /* Offline, disabled or incompatible engine: keep playing with the local worker. */ }
    finally {
      clearTimeout(timeout); clearInterval(progress);
      if (externalSearch === abort) externalSearch = null;
    }
    if (requestId !== currentSearchId) return null;
  }
  const worker = getWorker();

  // If Web Worker is unavailable (e.g. Node tests, strict iframe policies), seamlessly fall back
  if (!worker) {
    return searchBestMoveAsync(board, color, difficulty, maxTimeSeconds, onProgress, moveHistory);
  }

  const searchId = ++currentSearchId;
  currentProgressCallback = onProgress || null;

  return new Promise((resolve, reject) => {
    currentResolve = resolve;
    currentReject = reject;

    worker.postMessage({
      id: searchId,
      type: 'SEARCH_MOVE',
      board,
      color,
      difficulty,
      maxTimeSeconds,
      moveHistory,
    });
  });
}
