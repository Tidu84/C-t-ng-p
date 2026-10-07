/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unified Shared AudioContext Manager
 * Single source of truth for Web Audio throughout the entire application.
 * Prevents multiple AudioContext limit exhaustion, unifies hardware unlock on user gestures,
 * and ensures 100% reliable sound playback across all devices and browsers.
 */

let sharedContext: AudioContext | null = null;
let unlockListenersAttached = false;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!sharedContext) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      try {
        sharedContext = new AudioCtx();
      } catch {
        sharedContext = null;
      }
    }
  }

  if (sharedContext && sharedContext.state === 'suspended') {
    sharedContext.resume().catch(() => {});
  }

  return sharedContext;
}

export function unlockAudioContext(): Promise<void> {
  const ctx = getSharedAudioContext();
  if (ctx && ctx.state === 'suspended') {
    return ctx.resume();
  }
  return Promise.resolve();
}

/**
 * Attaches global gesture listeners to unlock AudioContext on the first interaction
 */
export function initGlobalAudioUnlock(onUnlocked?: () => void) {
  if (typeof window === 'undefined' || unlockListenersAttached) return;
  unlockListenersAttached = true;

  const tryUnlock = () => {
    unlockAudioContext()
      .then(() => {
        onUnlocked?.();
      })
      .catch(() => {});
  };

  const events = ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
  const handler = () => {
    tryUnlock();
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'running') {
      events.forEach((evt) => window.removeEventListener(evt, handler, true));
    }
  };

  events.forEach((evt) => {
    window.addEventListener(evt, handler, { capture: true, passive: true });
  });

  // Also try immediately
  tryUnlock();
}
