import type { ChessMaterial } from './chessMaterials';

/** Short, bounded modal impact. Only public material choices influence the sound. */
export function synthesizeMaterialImpact(
  ctx: BaseAudioContext, piece: ChessMaterial, board: ChessMaterial,
  volume: number, strength = 1, delay = 0,
) {
  const level = Math.max(0, Math.min(1, volume)) * Math.max(0, Math.min(1.5, strength));
  if (!level) return;
  const now = ctx.currentTime + delay;
  const output = ctx.createGain();
  output.gain.value = level * 0.4;
  output.connect(ctx.destination);
  const profile = piece.impact;
  // Inharmonic modes distinguish a woody knock, dense ivory, metals and crystal.
  const modes = [...profile.frequencies, board.impact.frequencies[0] * 0.65];
  let pending = modes.length + 1;
  const released = () => { if (--pending === 0) output.disconnect(); };
  modes.forEach((frequency, index) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    const duration = index === 3 ? Math.min(0.12, board.impact.decay) : profile.decay * (1 - index * 0.17);
    osc.type = 'sine';
    osc.frequency.value = Math.min(ctx.sampleRate * 0.44, frequency);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(index === 3 ? 0.17 : 0.48 / (index + 1), now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain); gain.connect(output);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); released(); };
    osc.start(now); osc.stop(now + duration + 0.01);
  });
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.035), ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.005));
  const noise = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  noise.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = profile.cutoff;
  gain.gain.value = profile.noise;
  noise.connect(filter); filter.connect(gain); gain.connect(output);
  noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); released(); };
  noise.start(now); noise.stop(now + 0.04);
}
