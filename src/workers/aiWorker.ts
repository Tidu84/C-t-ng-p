/**
 * Web Worker for off-thread AI Chess Thinking (Minimax Alpha-Beta Search)
 * Offloads heavy recursive evaluation to a background CPU thread,
 * guaranteeing 60fps buttery-smooth Three.js rendering on the Main Thread.
 */
import { searchBestMoveAsync } from '../utils/aiEngine';
import { PlayerColor, Move, AiThinkingStats } from '../types';
import { DetailedMove } from '../utils/chessRules';

export interface AiWorkerRequest {
  id: number;
  type: 'SEARCH_MOVE';
  board: (any | null)[][];
  color: PlayerColor;
  difficulty: 'easy' | 'medium' | 'hard';
  maxTimeSeconds: number;
  moveHistory?: Move[];
}

export interface AiWorkerProgressResponse {
  id: number;
  type: 'PROGRESS';
  stats: AiThinkingStats;
}

export interface AiWorkerSuccessResponse {
  id: number;
  type: 'SUCCESS';
  bestMove: DetailedMove | null;
}

export interface AiWorkerErrorResponse {
  id: number;
  type: 'ERROR';
  error: string;
}

export type AiWorkerResponse =
  | AiWorkerProgressResponse
  | AiWorkerSuccessResponse
  | AiWorkerErrorResponse;

// Track active search ID to discard stale calculations
let activeSearchId = 0;

self.onmessage = async (e: MessageEvent<AiWorkerRequest | { type: 'CANCEL'; id?: number }>) => {
  const data = e.data;
  if (!data) return;

  if (data.type === 'CANCEL') {
    activeSearchId = -1;
    return;
  }

  if (data.type === 'SEARCH_MOVE') {
    const searchId = data.id;
    activeSearchId = searchId;

    try {
      const bestMove = await searchBestMoveAsync(
        data.board,
        data.color,
        data.difficulty,
        data.maxTimeSeconds,
        (stats) => {
          if (activeSearchId === searchId) {
            self.postMessage({
              id: searchId,
              type: 'PROGRESS',
              stats,
            } as AiWorkerProgressResponse);
          }
        },
        data.moveHistory,
      );

      if (activeSearchId === searchId) {
        self.postMessage({
          id: searchId,
          type: 'SUCCESS',
          bestMove,
        } as AiWorkerSuccessResponse);
      }
    } catch (err) {
      if (activeSearchId === searchId) {
        self.postMessage({
          id: searchId,
          type: 'ERROR',
          error: err instanceof Error ? err.message : String(err),
        } as AiWorkerErrorResponse);
      }
    }
  }
};
