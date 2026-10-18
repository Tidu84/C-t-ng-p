/**
 * AI Worker Service
 * Bridges React UI components to the background AI Web Worker.
 * If Web Workers are unavailable, falls back to direct execution.
 */
import { PlayerColor, Move, AiThinkingStats } from '../types';
import { DetailedMove } from './chessRules';
import { searchBestMoveAsync } from './aiEngine';
import type { AiWorkerResponse } from '../workers/aiWorker';

let workerInstance: Worker | null = null;
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
  if (workerInstance) {
    workerInstance.postMessage({ type: 'CANCEL' });
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
  const worker = getWorker();

  // If Web Worker is unavailable (e.g. Node tests, strict iframe policies), seamlessly fall back
  if (!worker) {
    return searchBestMoveAsync(board, color, difficulty, maxTimeSeconds, onProgress, moveHistory);
  }

  // Cancel any prior pending search
  cancelCurrentWorkerSearch();

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
