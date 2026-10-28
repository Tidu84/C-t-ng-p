import type { Express } from 'express';
import express from 'express';
import { AI_PROFILES } from '../src/utils/aiProfiles';
import { runUci } from './uciEngine';
import { resolveEngineConfig } from './engineConfigs';
import type { AiDifficulty } from '../src/types';

export function installEngineTrial(app: Express) {
  let busy = false;
  app.post('/api/engine-move', express.json({ limit: '4kb' }), async (req, res) => {
    // Native engines are a local trial, not a publicly accessible analysis service.
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '')) return res.sendStatus(403);
    const { fen, difficulty, maxTimeSeconds, rootMoves } = req.body ?? {};
    const fields = typeof fen === 'string' ? fen.split(' ') : [];
    const ranks = fields[0]?.split('/') ?? [];
    const boardValid = ranks.length === 10 && ranks.every((rank: string) => /^[1-9krnbacpxKRNBACPX]+$/.test(rank) && [...rank].reduce((n, c) => n + (/\d/.test(c) ? Number(c) : 1), 0) === 9);
    if (!boardValid || fields.length !== 5 || !/^[wb]$/.test(fields[1]) || !/^(?:-|(?:[RACPNBracpnb][1-9])+)$/.test(fields[2]) || !/^\d{1,4}$/.test(fields[3]) || !/^\d{1,4}$/.test(fields[4]) || (fields[0].match(/K/g) || []).length !== 1 || (fields[0].match(/k/g) || []).length !== 1 || !Object.hasOwn(AI_PROFILES, difficulty) || typeof maxTimeSeconds !== 'number' || !Number.isFinite(maxTimeSeconds)) return res.status(400).json({ error: 'Invalid public position' });
    if (rootMoves !== undefined && (!Array.isArray(rootMoves) || !rootMoves.length || rootMoves.length > 200 || !rootMoves.every((move: unknown) => typeof move === 'string' && /^[a-i][0-9][a-i][0-9]$/.test(move)))) return res.status(400).json({ error: 'Invalid legal move list' });
    const selected = resolveEngineConfig(difficulty as AiDifficulty);
    if (!selected) return res.status(503).json({ fallback: true });
    if (busy) return res.status(429).json({ fallback: true });
    busy = true;
    const abort = new AbortController();
    const disconnect = () => { if (!res.writableEnded) abort.abort(); };
    res.on('close', disconnect);
    try {
      const profile = AI_PROFILES[difficulty as keyof typeof AI_PROFILES];
      const timeMs = Math.max(100, Math.round(Math.min(15, Math.max(0.1, maxTimeSeconds)) * 1000 * profile.budgetFraction));
      const result = await runUci(selected.config, fen, timeMs, profile.depth, abort.signal, rootMoves);
      if (!abort.signal.aborted) res.json({ move: result.move, depth: result.depth, nodes: result.nodes, score: result.score, elapsedMs: result.elapsedMs, engine: selected.engine });
    } catch (error) {
      if (!abort.signal.aborted) { console.warn('Jieqi trial unavailable:', String(error)); res.status(503).json({ fallback: true }); }
    } finally { busy = false; res.off('close', disconnect); }
  });
}
