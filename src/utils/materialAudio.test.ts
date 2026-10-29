import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHESS_MATERIALS, getBoardMaterial, getPieceMaterial } from './chessMaterials';
import { CHESS_THEME_SETS } from './themeStyles';
import { synthesizeMaterialImpact } from './materialAudio';

function audioHarness(sampleRate = 48000) {
  const nodes: any[] = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = (kind: string) => {
    const value: any = { kind, gain: param(), frequency: param(), disconnects: 0,
      connect() {}, disconnect() { this.disconnects++; }, start(time: number) { this.startTime = time; }, stop(time: number) { this.stopTime = time; } };
    nodes.push(value); return value;
  };
  const ctx = { currentTime: 1, sampleRate, destination: {}, createGain: () => node('gain'),
    createOscillator: () => node('osc'), createBiquadFilter: () => node('filter'), createBufferSource: () => node('noise'),
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  } as unknown as BaseAudioContext;
  return { ctx, nodes };
}

test('five saved set IDs retain their order and match piece and board materials', () => {
  const materials = ['wood', 'ivory', 'silver', 'gold', 'diamond'];
  assert.equal(CHESS_THEME_SETS.length, 5);
  CHESS_THEME_SETS.forEach((set, i) => {
    assert.equal(getPieceMaterial(set.pieceTheme).id, materials[i]);
    assert.equal(getBoardMaterial(set.boardTheme).id, materials[i]);
  });
});

test('muted impacts allocate no audio nodes', () => {
  const { ctx, nodes } = audioHarness();
  synthesizeMaterialImpact(ctx, CHESS_MATERIALS.silver, CHESS_MATERIALS.wood, 0);
  assert.equal(nodes.length, 0);
});

test('each material sounds distinct; impacts are bounded and all nodes are released', () => {
  const signatures = new Set<string>();
  for (const material of Object.values(CHESS_MATERIALS)) {
    const { ctx, nodes } = audioHarness(16000);
    synthesizeMaterialImpact(ctx, material, CHESS_MATERIALS.wood, 0.7, 1.35, 0.09);
    const sources = nodes.filter((n) => n.kind === 'osc' || n.kind === 'noise');
    signatures.add(JSON.stringify(nodes.filter((n) => n.kind === 'osc').map((n) => [n.frequency.value, n.stopTime])));
    sources.forEach((n) => {
      assert.equal(n.startTime, 1.09);
      assert.ok(n.stopTime > n.startTime && n.stopTime < 1.8);
      if (n.kind === 'osc') assert.ok(n.frequency.value < 8000);
      n.onended();
    });
    nodes.forEach((n) => assert.equal(n.disconnects, 1, `${material.id} ${n.kind} leaked`));
  }
  assert.equal(signatures.size, 5);
});

test('changing only the board changes contact resonance without changing the piece modes', () => {
  const a = audioHarness(), b = audioHarness();
  synthesizeMaterialImpact(a.ctx, CHESS_MATERIALS.ivory, CHESS_MATERIALS.wood, 0.5);
  synthesizeMaterialImpact(b.ctx, CHESS_MATERIALS.ivory, CHESS_MATERIALS.silver, 0.5);
  const frequencies = (nodes: any[]) => nodes.filter((n) => n.kind === 'osc').map((n) => n.frequency.value);
  const first = frequencies(a.nodes), second = frequencies(b.nodes);
  assert.deepEqual(first.slice(0, 3), second.slice(0, 3));
  assert.notEqual(first[3], second[3]);
});
