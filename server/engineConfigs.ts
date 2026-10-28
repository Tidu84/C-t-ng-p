import path from 'node:path';
import { existsSync } from 'node:fs';
import { AI_PROFILES } from '../src/utils/aiProfiles';
import type { AiDifficulty } from '../src/types';
import type { UciConfig } from './uciEngine';

/** Select the assigned engine only; a missing binary must not silently become Lão quái. */
export function resolveEngineConfig(difficulty: AiDifficulty, env: NodeJS.ProcessEnv = process.env, lab = path.resolve('../engine-lab'), exists: (file: string) => boolean = existsSync) {
  const engine = AI_PROFILES[difficulty].engine;
  const dev = env.NODE_ENV !== 'production';
  const defaults: Record<typeof engine, UciConfig> = {
    jqe: { executable: path.join(lab, 'bin/jqe.exe'), cwd: path.join(lab, 'jqe'), evalFile: 'engine/nets/it014.jqn' },
    pikajieqi: { executable: path.join(lab, 'bin/pikajieqi.exe'), cwd: path.join(lab, 'pikajieqi') },
    abjchess: { executable: path.join(lab, 'ab-release/0.2d_bmi2/AB-JChess.exe'), cwd: path.join(lab, 'ab-release/0.2d_bmi2'), evalFile: 'abjchess-20261010.nnue', warmup: true },
  };
  const prefix = { jqe: 'JIEQI', pikajieqi: 'PIKAJIEQI', abjchess: 'ABJCHESS' }[engine];
  const override = env[`${prefix}_ENGINE_PATH`];
  if (!override && !dev) return null;
  const base = defaults[engine];
  const config: UciConfig = {
    executable: override || base.executable,
    cwd: env[`${prefix}_ENGINE_CWD`] || (override ? path.dirname(path.resolve(override)) : base.cwd),
    evalFile: env[`${prefix}_EVAL_FILE`] || (override ? undefined : base.evalFile),
    warmup: base.warmup,
  };
  if (!exists(config.executable)) return null;
  if (config.evalFile && !exists(path.resolve(config.cwd!, config.evalFile))) return null;
  return { engine, config };
}
