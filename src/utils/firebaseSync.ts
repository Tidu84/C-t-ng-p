/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerProfile, PlayerStats, SavedMatch } from '../types';

const FIREBASE_CONFIG = {
  projectId: 'ai-vibe-coder-vn',
  apiKey: 'AIzaSyC1lNAb3BdBNGEtjeymTcA47utiWEwXJPk',
};

const BASE_FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

export interface CloudPlayerAccount {
  username: string;
  displayName: string;
  passwordHash?: string;
  avatar: string;
  isCustomAvatar?: boolean;
  isAdmin?: boolean;
  stats?: PlayerStats;
  updatedAt: number;
}

// Timeout-safe fetch wrapper to prevent UI hanging when offline
async function safeFetch(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Helper to sanitize username for document ID
function getDocId(username: string): string {
  return encodeURIComponent(username.trim().toLowerCase());
}

/**
 * Checks whether a given user is an authenticated / logged-in player
 * (Guests: Vo danh khach or not logged in are strictly local).
 */
export function isUserEligibleForCloud(username?: string, isLoggedIn?: boolean): boolean {
  if (!isLoggedIn) return false;
  if (!username) return false;
  const trimmed = username.trim().toLowerCase();
  return trimmed !== '' && trimmed !== 'vô danh khách' && trimmed !== 'vo danh khach';
}

/**
 * Synchronize player profile (and optional passwordHash/stats) to Firebase Firestore.
 * Guest profiles (!isLoggedIn) are ignored to maintain strict local-only storage.
 */
export async function syncPlayerProfileToCloud(
  profile: PlayerProfile,
  passwordHash?: string,
  stats?: PlayerStats
): Promise<boolean> {
  if (!isUserEligibleForCloud(profile.name, profile.isLoggedIn)) {
    return false;
  }

  const docId = getDocId(profile.name);
  const url = `${BASE_FIRESTORE_URL}/players/${docId}?key=${FIREBASE_CONFIG.apiKey}`;

  const fields: Record<string, any> = {
    username: { stringValue: profile.name },
    displayName: { stringValue: profile.name },
    avatar: { stringValue: profile.avatar || '🐱' },
    isCustomAvatar: { booleanValue: Boolean(profile.isCustomAvatar) },
    isAdmin: { booleanValue: Boolean(profile.isAdmin) },
    updatedAt: { integerValue: String(Date.now()) },
  };

  if (passwordHash) {
    fields.passwordHash = { stringValue: passwordHash };
  }

  if (stats) {
    fields.statsJson = { stringValue: JSON.stringify(stats) };
  }

  try {
    const res = await safeFetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Firebase Cloud] Failed to sync profile to cloud (offline fallback):', err);
    return false;
  }
}

/**
 * Fetch player profile and credentials from Firebase Firestore.
 */
export async function fetchPlayerAccountFromCloud(
  username: string
): Promise<CloudPlayerAccount | null> {
  if (!username || username.trim() === '') return null;
  const docId = getDocId(username);
  const url = `${BASE_FIRESTORE_URL}/players/${docId}?key=${FIREBASE_CONFIG.apiKey}`;

  try {
    const res = await safeFetch(url, { method: 'GET' });
    if (!res.ok) return null;

    const data = await res.json();
    const fields = data.fields;
    if (!fields) return null;

    let parsedStats: PlayerStats | undefined;
    if (fields.statsJson?.stringValue) {
      try {
        parsedStats = JSON.parse(fields.statsJson.stringValue);
      } catch {}
    }

    return {
      username: fields.username?.stringValue || username,
      displayName: fields.displayName?.stringValue || username,
      passwordHash: fields.passwordHash?.stringValue,
      avatar: fields.avatar?.stringValue || '🐱',
      isCustomAvatar: Boolean(fields.isCustomAvatar?.booleanValue),
      isAdmin: Boolean(fields.isAdmin?.booleanValue),
      stats: parsedStats,
      updatedAt: parseInt(fields.updatedAt?.integerValue || '0', 10),
    };
  } catch (err) {
    console.warn('[Firebase Cloud] Failed to fetch account from cloud:', err);
    return null;
  }
}

/**
 * Synchronize a saved match to Firebase Firestore under the user's document.
 */
export async function syncMatchToCloud(
  username: string,
  match: SavedMatch
): Promise<boolean> {
  if (!isUserEligibleForCloud(username, true)) return false;
  const userDocId = getDocId(username);
  const matchDocId = encodeURIComponent(match.id);
  const url = `${BASE_FIRESTORE_URL}/players/${userDocId}/matches/${matchDocId}?key=${FIREBASE_CONFIG.apiKey}`;

  const fields: Record<string, any> = {
    id: { stringValue: match.id },
    timestamp: { integerValue: String(match.timestamp || Date.now()) },
    dateStr: { stringValue: match.dateStr },
    playerName: { stringValue: match.playerName },
    playerAvatar: { stringValue: match.playerAvatar },
    gameMode: { stringValue: match.gameMode },
    difficulty: { stringValue: match.difficulty || 'easy' },
    winner: { stringValue: match.winner },
    totalMoves: { integerValue: String(match.totalMoves) },
    matchData: { stringValue: JSON.stringify(match) },
  };

  if (match.patternName) {
    fields.patternName = { stringValue: match.patternName };
  }

  try {
    const res = await safeFetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Firebase Cloud] Failed to sync match to cloud:', err);
    return false;
  }
}

/**
 * Delete a match from Firebase Firestore.
 */
export async function deleteMatchFromCloud(
  username: string,
  matchId: string
): Promise<boolean> {
  if (!isUserEligibleForCloud(username, true)) return false;
  const userDocId = getDocId(username);
  const matchDocId = encodeURIComponent(matchId);
  const url = `${BASE_FIRESTORE_URL}/players/${userDocId}/matches/${matchDocId}?key=${FIREBASE_CONFIG.apiKey}`;

  try {
    const res = await safeFetch(url, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('[Firebase Cloud] Failed to delete match from cloud:', err);
    return false;
  }
}

/**
 * Retrieve all cloud-saved matches for a logged-in player.
 */
export async function fetchPlayerMatchesFromCloud(
  username: string
): Promise<SavedMatch[]> {
  if (!isUserEligibleForCloud(username, true)) return [];
  const userDocId = getDocId(username);
  const url = `${BASE_FIRESTORE_URL}/players/${userDocId}/matches?key=${FIREBASE_CONFIG.apiKey}`;

  try {
    const res = await safeFetch(url, { method: 'GET' });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.documents || !Array.isArray(data.documents)) return [];

    const matches: SavedMatch[] = [];
    for (const doc of data.documents) {
      const fields = doc.fields;
      if (!fields) continue;

      if (fields.matchData?.stringValue) {
        try {
          const parsed = JSON.parse(fields.matchData.stringValue);
          matches.push(parsed);
          continue;
        } catch {}
      }

      // Fallback reconstruction if matchData wasn't present
      if (fields.id?.stringValue) {
        matches.push({
          id: fields.id.stringValue,
          timestamp: parseInt(fields.timestamp?.integerValue || '0', 10),
          dateStr: fields.dateStr?.stringValue || '',
          playerName: fields.playerName?.stringValue || username,
          playerAvatar: fields.playerAvatar?.stringValue || '🐱',
          gameMode: (fields.gameMode?.stringValue as any) || 'ai',
          difficulty: (fields.difficulty?.stringValue as any) || 'easy',
          winner: (fields.winner?.stringValue as any) || 'draw',
          patternName: fields.patternName?.stringValue,
          totalMoves: parseInt(fields.totalMoves?.integerValue || '0', 10),
          initialBoard: [],
          moves: [],
        });
      }
    }

    // Sort descending by timestamp / date
    matches.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return matches;
  } catch (err) {
    console.warn('[Firebase Cloud] Failed to fetch matches from cloud:', err);
    return [];
  }
}
