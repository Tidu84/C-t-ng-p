import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveEngineConfig } from '../../server/engineConfigs';

test('each difficulty resolves its own native engine; missing files never select a different opponent', () => {
  const lab = path.resolve('test-engine-lab');
  const env = { NODE_ENV: 'development' };
  const easy = resolveEngineConfig('easy', env, lab, () => true)!;
  const medium = resolveEngineConfig('medium', env, lab, () => true)!;
  const hard = resolveEngineConfig('hard', env, lab, () => true)!;
  assert.equal(easy.engine, 'pikajieqi');
  assert.equal(medium.engine, 'abjchess');
  assert.equal(hard.engine, 'jqe');
  assert.equal(path.basename(easy.config.executable), 'pikajieqi.exe');
  assert.equal(path.basename(medium.config.executable), 'AB-JChess.exe');
  assert.equal(path.basename(hard.config.executable), 'jqe.exe');
  assert.ok(medium.config.evalFile);
  assert.equal(resolveEngineConfig('easy', env, lab, file => file.endsWith('jqe.exe')), null);
  assert.equal(resolveEngineConfig('medium', env, lab, file => !file.endsWith('.nnue')), null);
  assert.equal(resolveEngineConfig('hard', { NODE_ENV: 'production' }, lab, () => true), null);
});

test('jqe override applies only to Lão quái', () => {
  const override = path.resolve('custom/jqe.exe');
  const env = { NODE_ENV: 'development', JIEQI_ENGINE_PATH: override };
  assert.equal(resolveEngineConfig('hard', env, undefined, () => true)!.config.executable, override);
  assert.notEqual(resolveEngineConfig('medium', env, undefined, () => true)!.config.executable, override);
  assert.notEqual(resolveEngineConfig('easy', env, undefined, () => true)!.config.executable, override);
});
