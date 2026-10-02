/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { WebHaptics } from 'web-haptics';

export type VibrationType = 'covered' | 'chariot' | 'high_score' | 'tap';

let isVibrationEnabled = true;
try {
  const stored = localStorage.getItem('co_up_vibration_enabled');
  if (stored !== null) isVibrationEnabled = stored === 'true';
} catch (_) {}

export const setVibrationEnabled = (enabled: boolean) => {
  isVibrationEnabled = enabled;
  try {
    localStorage.setItem('co_up_vibration_enabled', enabled ? 'true' : 'false');
  } catch (_) {}
};

export const getVibrationEnabled = () => isVibrationEnabled;

// Singleton WebHaptics
let webHapticsInstance: WebHaptics | null = null;
const getWebHaptics = () => {
  if (typeof window === 'undefined') return null;
  if (!webHapticsInstance) {
    try {
      webHapticsInstance = new WebHaptics();
    } catch (_) {}
  }
  return webHapticsInstance;
};

export const initIOSHaptic = () => {
  getWebHaptics();
};

// Singleton Web Audio Context for acoustic sub-bass thump
let audioCtx: AudioContext | null = null;
const playSubBassThump = (freq: number, durationMs: number, pulses = 1) => {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    for (let i = 0; i < pulses; i++) {
      const start = now + (i * (durationMs + 60)) / 1000;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(28, start + durationMs / 1000);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.95, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(start);
      osc.stop(start + durationMs / 1000 + 0.02);
    }
  } catch (_) {}
};

/**
 * Kích hoạt RUNG KÉP (Rung tay phần cứng + Rung loa trầm song hành):
 * - 'covered': 1 nhịp (Ăn / Bị ăn quân úp)
 * - 'chariot': 2 nhịp (Ăn / Bị ăn quân Xe)
 * - 'high_score': 3 nhịp (Bắt tướng / Điểm cao / Thắng)
 * - 'tap': 1 nhịp nhẹ khi chọn quân
 */
export const triggerDeviceVibration = (type: VibrationType, options?: { skipNavigatorVibrate?: boolean }) => {
  if (!isVibrationEnabled) return;

  // 1. Rung tay (Hardware Motor / Taptic Engine)
  if (Capacitor.isNativePlatform()) {
    try {
      if (type === 'covered') {
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
      } else if (type === 'chariot') {
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 140);
      } else if (type === 'high_score') {
        Haptics.notification({ type: NotificationType.Success }).catch(() => {});
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 150);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 300);
      } else {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
    } catch (_) {}
  } else {
    // Web (iOS Safari qua WebHaptics + Android Web Vibrate)
    const haptics = getWebHaptics();
    if (haptics) {
      try {
        const preset = type === 'covered' ? 'heavy' : type === 'chariot' ? 'warning' : type === 'high_score' ? 'error' : 'selection';
        haptics.trigger(preset).catch(() => {});
      } catch (_) {}
    }

    if (!options?.skipNavigatorVibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        if (type === 'covered') {
          // 1 nhịp khi bắt quân úp
          navigator.vibrate(200);
        } else if (type === 'chariot') {
          // 2 nhịp khi bắt quân Xe: 180ms rung, 100ms nghỉ, 180ms rung
          navigator.vibrate([180, 100, 180]);
        } else if (type === 'high_score') {
          navigator.vibrate([180, 80, 180, 80, 220]);
        } else {
          navigator.vibrate(20);
        }
      } catch (_) {}
    }
  }

  // 2. Rung loa (Acoustic Sub-bass Thump song hành)
  if (type === 'covered') {
    playSubBassThump(52, 140, 1);
  } else if (type === 'chariot') {
    playSubBassThump(48, 120, 2);
  } else if (type === 'high_score') {
    playSubBassThump(45, 130, 3);
  } else {
    playSubBassThump(72, 40, 1);
  }
};
