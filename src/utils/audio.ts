/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  classicalGuitar,
  ClassicalGuitarTrackId,
  GUITAR_TRACKS,
} from './classicalGuitarEngine';

export type BgmInstrument = 'guitar' | 'guzheng' | 'pipa' | 'dan_nguyet' | 'harp' | 'pipa_yueqin';
export type { ClassicalGuitarTrackId };
export { GUITAR_TRACKS };

// Custom audio file storage in memory & localStorage
export interface CustomAudioConfig {
  hasCustomCapture: boolean;
  captureFileName?: string;
  hasCustomLoss: boolean;
  lossFileName?: string;
  hasCustomBgm: boolean;
  bgmFileName?: string;
  bgmInstrument: BgmInstrument;
  guitarTrack: ClassicalGuitarTrackId;
  sfxVolume: number; // 0 to 1
  bgmVolume: number; // 0 to 1
}

class SoundController {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private sfxVolume: number = 1.0;
  private bgmVolume: number = 1.0;

  // Custom Audio Elements
  private customCaptureAudio: HTMLAudioElement | null = null;
  private customLossAudio: HTMLAudioElement | null = null;
  private customBgmAudio: HTMLAudioElement | null = null;

  private customConfig: CustomAudioConfig = {
    hasCustomCapture: false,
    hasCustomLoss: false,
    hasCustomBgm: false,
    bgmInstrument: 'guitar', // Default to passionate Classical Guitar as requested
    guitarTrack: 'leyenda', // Asturias (Leyenda)
    sfxVolume: 1.0,
    bgmVolume: 1.0,
  };

  // Background Music Engine
  private isBgmActive: boolean = false;
  private bgmTimer: ReturnType<typeof setTimeout> | null = null;
  private bgmNoteStep: number = 0;

  constructor() {
    this.loadCustomAudioConfig();
  }

  private loadCustomAudioConfig() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('co_up_custom_audio_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.customConfig = { ...this.customConfig, ...parsed };
        if (parsed.bgmInstrument) this.customConfig.bgmInstrument = parsed.bgmInstrument;
        if (parsed.guitarTrack) this.customConfig.guitarTrack = parsed.guitarTrack;
      }
      // Set to 100% Maximum Volume as requested by user
      this.bgmVolume = 1.0;
      this.sfxVolume = 1.0;
      this.customConfig.bgmVolume = 1.0;
      this.customConfig.sfxVolume = 1.0;
      classicalGuitar.setVolume(1.0);
      if (this.customConfig.guitarTrack) {
        classicalGuitar.setTrack(this.customConfig.guitarTrack);
      }
      this.saveCustomAudioConfig();
    } catch {}
  }

  public saveCustomAudioConfig() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('co_up_custom_audio_config', JSON.stringify({
        hasCustomCapture: this.customConfig.hasCustomCapture,
        captureFileName: this.customConfig.captureFileName,
        hasCustomLoss: this.customConfig.hasCustomLoss,
        lossFileName: this.customConfig.lossFileName,
        hasCustomBgm: this.customConfig.hasCustomBgm,
        bgmFileName: this.customConfig.bgmFileName,
        bgmInstrument: this.customConfig.bgmInstrument,
        guitarTrack: this.customConfig.guitarTrack,
        sfxVolume: this.sfxVolume,
        bgmVolume: this.bgmVolume,
      }));
    } catch {}
  }

  public getConfig(): CustomAudioConfig {
    return {
      ...this.customConfig,
      sfxVolume: this.sfxVolume,
      bgmVolume: this.bgmVolume,
    };
  }

  public setBgmInstrument(instrument: BgmInstrument) {
    const prevInstrument = this.customConfig.bgmInstrument;
    this.customConfig.bgmInstrument = instrument;
    this.bgmNoteStep = 0;
    this.saveCustomAudioConfig();

    if (this.isBgmActive) {
      if (this.bgmTimer) {
        clearTimeout(this.bgmTimer);
        this.bgmTimer = null;
      }
      if (prevInstrument === 'guitar' && instrument !== 'guitar') {
        classicalGuitar.stop();
        this.scheduleNextTraditionalNote();
      } else if (prevInstrument !== 'guitar' && instrument === 'guitar') {
        classicalGuitar.setVolume(this.bgmVolume);
        classicalGuitar.setTrack(this.customConfig.guitarTrack || 'leyenda');
        classicalGuitar.play();
      } else if (instrument !== 'guitar') {
        this.scheduleNextTraditionalNote();
      }
    }
  }

  public setGuitarTrack(track: ClassicalGuitarTrackId) {
    this.customConfig.guitarTrack = track;
    classicalGuitar.setTrack(track);
    this.saveCustomAudioConfig();
  }

  public getGuitarTrack(): ClassicalGuitarTrackId {
    return this.customConfig.guitarTrack || 'leyenda';
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.customConfig.sfxVolume = this.sfxVolume;
    this.saveCustomAudioConfig();
  }

  public setBgmVolume(vol: number) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    this.customConfig.bgmVolume = this.bgmVolume;
    if (this.customBgmAudio) {
      this.customBgmAudio.volume = this.bgmVolume;
    }
    classicalGuitar.setVolume(this.bgmVolume);
    this.saveCustomAudioConfig();
  }

  // Upload Custom Capture Sound (Tiếng cạch ăn quân riêng)
  public setCustomCaptureFile(file: File) {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    this.customCaptureAudio = audio;
    this.customConfig.hasCustomCapture = true;
    this.customConfig.captureFileName = file.name;
    this.saveCustomAudioConfig();
  }

  public clearCustomCaptureFile() {
    if (this.customCaptureAudio) {
      this.customCaptureAudio = null;
    }
    this.customConfig.hasCustomCapture = false;
    this.customConfig.captureFileName = undefined;
    this.saveCustomAudioConfig();
  }

  // Upload Custom Piece Loss Sound (Nhạc buồn khi mất quân riêng)
  public setCustomLossFile(file: File) {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    this.customLossAudio = audio;
    this.customConfig.hasCustomLoss = true;
    this.customConfig.lossFileName = file.name;
    this.saveCustomAudioConfig();
  }

  public clearCustomLossFile() {
    if (this.customLossAudio) {
      this.customLossAudio = null;
    }
    this.customConfig.hasCustomLoss = false;
    this.customConfig.lossFileName = undefined;
    this.saveCustomAudioConfig();
  }

  // Upload Custom Guitar / BGM File (File ghi âm người dùng tự đánh guitar)
  public setCustomBgmFile(file: File) {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = this.bgmVolume;
    this.customBgmAudio = audio;
    this.customConfig.hasCustomBgm = true;
    this.customConfig.bgmFileName = file.name;
    this.saveCustomAudioConfig();

    if (this.isBgmActive) {
      // Switch from synth to custom audio immediately
      if (this.bgmTimer) {
        clearTimeout(this.bgmTimer);
        this.bgmTimer = null;
      }
      this.customBgmAudio.play().catch(() => {});
    }
  }

  public clearCustomBgmFile() {
    if (this.customBgmAudio) {
      this.customBgmAudio.pause();
      this.customBgmAudio = null;
    }
    this.customConfig.hasCustomBgm = false;
    this.customConfig.bgmFileName = undefined;
    this.saveCustomAudioConfig();

    if (this.isBgmActive) {
      if (this.customConfig.bgmInstrument === 'guitar') {
        classicalGuitar.play();
      } else {
        this.scheduleNextTraditionalNote();
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  // ==========================================
  // 1. TIẾNG ĂN QUÂN CỜ: NGHE CẠCH MỘT TIẾNG (CRISP WOODEN CLACK)
  // Hai quân cờ gỗ gõ mạnh vào nhau đanh thép dứt khoát
  // ==========================================
  public playCapture(_isHighValue: boolean = false) {
    if (!this.soundEnabled) return;

    // If user provided custom capture sound, play that
    if (this.customCaptureAudio && this.customConfig.hasCustomCapture) {
      try {
        this.customCaptureAudio.currentTime = 0;
        this.customCaptureAudio.volume = this.sfxVolume;
        this.customCaptureAudio.play().catch(() => {});
        return;
      } catch {}
    }

    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = this.sfxVolume;

    // Component A: Sharp initial transient snap (tiếng va chạm vi cạnh gỗ đanh sắc)
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    const snapFilter = ctx.createBiquadFilter();

    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(1900, now);
    snapOsc.frequency.exponentialRampToValueAtTime(700, now + 0.009);

    snapFilter.type = 'bandpass';
    snapFilter.frequency.setValueAtTime(1400, now);
    snapFilter.Q.setValueAtTime(2.2, now);

    snapGain.gain.setValueAtTime(0.7 * vol, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    snapOsc.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(ctx.destination);

    snapOsc.start(now);
    snapOsc.stop(now + 0.014);

    // Component B: Hollow wooden body knock (tiếng thùng gỗ hoàng dương đặc "cạch")
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();

    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(560, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(180, now + 0.045);

    bodyGain.gain.setValueAtTime(0.65 * vol, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);

    bodyOsc.start(now);
    bodyOsc.stop(now + 0.05);

    // Component C: Micro rebound rattle 11ms later (tiếng nảy nhẹ đặc trưng của cờ gỗ)
    const rattleOsc = ctx.createOscillator();
    const rattleGain = ctx.createGain();

    rattleOsc.type = 'triangle';
    rattleOsc.frequency.setValueAtTime(380, now + 0.011);
    rattleOsc.frequency.exponentialRampToValueAtTime(120, now + 0.038);

    rattleGain.gain.setValueAtTime(0.35 * vol, now + 0.011);
    rattleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    rattleOsc.connect(rattleGain);
    rattleGain.connect(ctx.destination);

    rattleOsc.start(now + 0.011);
    rattleOsc.stop(now + 0.042);
  }

  // ==========================================
  // 2. TIẾNG BỊ MẤT QUÂN: NGHE NHẠC BUỒN (MELANCHOLIC A MINOR LAMENT)
  // Giai điệu trầm buồn sâu lắng tone La thứ (Am) buốt giá
  // ==========================================
  public playPieceLost() {
    if (!this.soundEnabled) return;

    // If user provided custom loss sound, play that
    if (this.customLossAudio && this.customConfig.hasCustomLoss) {
      try {
        this.customLossAudio.currentTime = 0;
        this.customLossAudio.volume = this.sfxVolume;
        this.customLossAudio.play().catch(() => {});
        return;
      } catch {}
    }

    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = this.sfxVolume;

    // Poignant 4-note descending phrase in A Minor: E4 -> C4 -> B3 -> A3 (slow, sad, echoing)
    const sadNotes = [
      { freq: 329.63, delay: 0.0, duration: 0.28, gain: 0.32 }, // E4
      { freq: 261.63, delay: 0.20, duration: 0.32, gain: 0.36 }, // C4
      { freq: 246.94, delay: 0.44, duration: 0.26, gain: 0.30 }, // B3
      { freq: 220.00, delay: 0.65, duration: 0.85, gain: 0.42 }, // A3 (deep resonant tonic with vibrato)
    ];

    sadNotes.forEach(({ freq, delay, duration, gain }) => {
      const noteTime = now + delay;

      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Warm nylon guitar / pipa melancholy timbre
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      // Subtle vibrato on the final resolution note A3
      if (freq === 220.0) {
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.frequency.setValueAtTime(4.5, noteTime);
        vibratoGain.gain.setValueAtTime(2.8, noteTime);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.start(noteTime + 0.15);
        vibrato.stop(noteTime + duration);
      }

      // Warm acoustic body filter
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, noteTime);
      filter.frequency.exponentialRampToValueAtTime(350, noteTime + duration);

      // Soft melancholic envelope: gentle attack, lingering sad decay
      noteGain.gain.setValueAtTime(0.001, noteTime);
      noteGain.gain.linearRampToValueAtTime(gain * vol, noteTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + duration + 0.05);
    });
  }

  // Wooden piece set-down sound (nước đi bình thường)
  public playMove() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.07);

    gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Wooden piece lift / pickup sound
  public playLift() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.035);

    gain.gain.setValueAtTime(0.16 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  // Distinct wooden flip sound when revealing a covered piece
  public playFlip() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(550, now + 0.12);

    gain.gain.setValueAtTime(0.24 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Dramatic check alert gong/bell
  public playCheck() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0.18 * this.sfxVolume, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.4);
    });
  }

  // Victory fanfare
  public playVictory() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [392, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.22 * this.sfxVolume, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.5);
    });
  }

  // ==========================================
  // 3. NHẠC NỀN: CỔ TRANH, TỲ BÀ, ĐÀN NGUYỆT, ĐÀN HẠC & GUITAR (> 3 PHÚT / BẢN, LOOP VÔ TẬN)
  // Mỗi loại đàn có mô hình âm học vật lý chân thực và bản trường ca riêng dài hơn 3 phút,
  // tự động lặp lại liên tục không có kết thúc (infinite loop).
  // ==========================================

  // --- 1. BẢN CỔ TRANH 21 DÂY: THẬP DIỆN MAI PHỤC & LƯU THỦY (~3:25, LOOP VÔ TẬN) ---
  private readonly GUZHENG_SCORE: {
    note: number;
    duration: number;
    delay: number;
    isBass?: boolean;
    bend?: number;
    isTremolo?: boolean;
    isGlissando?: boolean;
  }[] = [
    // Khúc 1: Tĩnh mịch nhập cuộc (Am ngũ cung) (~28s)
    { note: 220.00, duration: 2.2, delay: 1100, isBass: true },
    { note: 329.63, duration: 1.2, delay: 550 },
    { note: 440.00, duration: 1.4, delay: 650 },
    { note: 523.25, duration: 1.3, delay: 700, bend: 35 },
    { note: 587.33, duration: 1.5, delay: 850, bend: 50 },
    { note: 523.25, duration: 1.1, delay: 600 },
    { note: 493.88, duration: 1.3, delay: 750 },
    { note: 440.00, duration: 2.2, delay: 1300, isTremolo: true },
    { note: 220.00, duration: 2.0, delay: 1100, isBass: true },
    { note: 329.63, duration: 1.1, delay: 550 },
    { note: 440.00, duration: 1.3, delay: 650 },
    { note: 493.88, duration: 1.2, delay: 650 },
    { note: 523.25, duration: 1.8, delay: 1100, bend: 40 },
    { note: 440.00, duration: 2.0, delay: 1400 },

    // Khúc 2: Sơn hà lưu thủy (hoa âm lướt sóng dập dềnh) (~32s)
    { note: 174.61, duration: 2.0, delay: 1100, isBass: true },
    { note: 261.63, duration: 1.0, delay: 550 },
    { note: 349.23, duration: 1.2, delay: 650 },
    { note: 440.00, duration: 1.3, delay: 700 },
    { note: 392.00, duration: 1.3, delay: 750, bend: 30 },
    { note: 329.63, duration: 1.1, delay: 600 },
    { note: 293.66, duration: 1.8, delay: 1100 },
    { note: 0, duration: 1.0, delay: 1300, isGlissando: true },
    { note: 146.83, duration: 2.0, delay: 1100, isBass: true },
    { note: 293.66, duration: 1.1, delay: 550 },
    { note: 349.23, duration: 1.2, delay: 650 },
    { note: 440.00, duration: 1.4, delay: 750 },
    { note: 392.00, duration: 1.2, delay: 650 },
    { note: 349.23, duration: 1.2, delay: 650 },
    { note: 329.63, duration: 2.2, delay: 1400 },

    // Khúc 3: Thập diện mai phục (luân chỉ gảy giật dồn dập) (~35s)
    { note: 110.00, duration: 1.5, delay: 800, isBass: true },
    { note: 440.00, duration: 0.6, delay: 350, isTremolo: true },
    { note: 493.88, duration: 0.6, delay: 350, isTremolo: true },
    { note: 523.25, duration: 0.6, delay: 350, isTremolo: true },
    { note: 587.33, duration: 0.8, delay: 450, bend: 45 },
    { note: 659.25, duration: 1.2, delay: 700, isTremolo: true },
    { note: 587.33, duration: 0.7, delay: 400 },
    { note: 523.25, duration: 0.7, delay: 400 },
    { note: 493.88, duration: 0.8, delay: 450 },
    { note: 440.00, duration: 1.5, delay: 900, isTremolo: true },
    { note: 164.81, duration: 1.8, delay: 1000, isBass: true },
    { note: 0, duration: 1.0, delay: 1200, isGlissando: true },
    { note: 440.00, duration: 0.5, delay: 300 },
    { note: 523.25, duration: 0.5, delay: 300 },
    { note: 659.25, duration: 0.8, delay: 450 },
    { note: 587.33, duration: 0.8, delay: 450 },
    { note: 523.25, duration: 1.8, delay: 1100, isTremolo: true },

    // Khúc 4: Bình sa lạc nhạn (uốn nốt thanh thoát) (~30s)
    { note: 196.00, duration: 2.2, delay: 1100, isBass: true },
    { note: 293.66, duration: 1.0, delay: 550 },
    { note: 392.00, duration: 1.2, delay: 650 },
    { note: 523.25, duration: 1.3, delay: 750 },
    { note: 493.88, duration: 1.2, delay: 650 },
    { note: 440.00, duration: 1.1, delay: 600 },
    { note: 392.00, duration: 1.6, delay: 1050 },
    { note: 164.81, duration: 2.0, delay: 1100, isBass: true },
    { note: 329.63, duration: 1.1, delay: 550 },
    { note: 392.00, duration: 1.2, delay: 650 },
    { note: 440.00, duration: 1.3, delay: 700 },
    { note: 392.00, duration: 1.2, delay: 650 },
    { note: 329.63, duration: 2.4, delay: 1300 },

    // Khúc 5: Quảng lăng tán (hào khí cổ nhân E7 -> Am) (~34s)
    { note: 164.81, duration: 2.0, delay: 1100, isBass: true },
    { note: 246.94, duration: 1.0, delay: 550 },
    { note: 415.30, duration: 1.5, delay: 800, bend: 45 },
    { note: 493.88, duration: 1.2, delay: 650 },
    { note: 523.25, duration: 1.2, delay: 650 },
    { note: 493.88, duration: 1.3, delay: 750 },
    { note: 440.00, duration: 2.2, delay: 1200, isTremolo: true },
    { note: 110.00, duration: 2.5, delay: 1300, isBass: true },
    { note: 329.63, duration: 1.0, delay: 550 },
    { note: 440.00, duration: 1.2, delay: 650 },
    { note: 523.25, duration: 1.3, delay: 700, bend: 35 },
    { note: 587.33, duration: 1.4, delay: 800, bend: 45 },
    { note: 659.25, duration: 2.2, delay: 1300, isTremolo: true },
    { note: 523.25, duration: 1.4, delay: 800 },
    { note: 440.00, duration: 2.6, delay: 1600 },

    // Khúc 6: Phong kiều dạ bạc (chuông đêm ngân nga) (~24s)
    { note: 174.61, duration: 2.4, delay: 1300, isBass: true },
    { note: 261.63, duration: 1.2, delay: 650 },
    { note: 349.23, duration: 1.4, delay: 750 },
    { note: 392.00, duration: 1.3, delay: 700 },
    { note: 440.00, duration: 1.8, delay: 1000 },
    { note: 0, duration: 1.0, delay: 1400, isGlissando: true },
    { note: 164.81, duration: 2.4, delay: 1300, isBass: true },
    { note: 246.94, duration: 1.2, delay: 650 },
    { note: 329.63, duration: 1.4, delay: 750 },
    { note: 440.00, duration: 2.8, delay: 1600, isTremolo: true },

    // Khúc 7: Đại cục viên mãn & nối vòng lặp vô tận (~22s)
    { note: 130.81, duration: 2.0, delay: 1100, isBass: true },
    { note: 261.63, duration: 1.1, delay: 600 },
    { note: 329.63, duration: 1.2, delay: 650 },
    { note: 440.00, duration: 1.4, delay: 750 },
    { note: 123.47, duration: 2.2, delay: 1200, isBass: true },
    { note: 246.94, duration: 1.2, delay: 650 },
    { note: 329.63, duration: 1.4, delay: 750 },
    { note: 415.30, duration: 2.0, delay: 1200, bend: 35 },
    { note: 110.00, duration: 3.5, delay: 1800, isBass: true },
    { note: 440.00, duration: 3.0, delay: 1600, isTremolo: true },
    { note: 329.63, duration: 2.0, delay: 1200 }, // Nốt Mi đón vòng lặp mới
  ];

  // --- 2. BẢN TỲ BÀ 4 DÂY: TỲ BÀ HÀNH & KIẾM KHÍ GIANG HỒ (~3:20, LOOP VÔ TẬN) ---
  private readonly PIPA_SCORE: {
    note: number;
    duration: number;
    delay: number;
    isBass?: boolean;
    isTremolo?: boolean;
  }[] = [
    // Khúc 1: Giang hồ sơ ngộ (~30s)
    { note: 220.00, duration: 1.8, delay: 900, isBass: true },
    { note: 440.00, duration: 0.5, delay: 320 },
    { note: 493.88, duration: 0.5, delay: 320 },
    { note: 523.25, duration: 0.8, delay: 450 },
    { note: 587.33, duration: 1.0, delay: 600, isTremolo: true },
    { note: 523.25, duration: 0.6, delay: 350 },
    { note: 493.88, duration: 0.7, delay: 400 },
    { note: 440.00, duration: 1.8, delay: 1000, isTremolo: true },
    { note: 164.81, duration: 1.8, delay: 950, isBass: true },
    { note: 329.63, duration: 0.6, delay: 350 },
    { note: 392.00, duration: 0.7, delay: 400 },
    { note: 440.00, duration: 1.2, delay: 700 },
    { note: 329.63, duration: 2.0, delay: 1200 },

    // Khúc 2: Kiếm khí tung hoành (luân chỉ 5 ngón) (~34s)
    { note: 110.00, duration: 1.5, delay: 750, isBass: true },
    { note: 440.00, duration: 0.4, delay: 250, isTremolo: true },
    { note: 523.25, duration: 0.4, delay: 250, isTremolo: true },
    { note: 659.25, duration: 0.6, delay: 350, isTremolo: true },
    { note: 587.33, duration: 0.5, delay: 300 },
    { note: 523.25, duration: 0.5, delay: 300 },
    { note: 493.88, duration: 0.6, delay: 350 },
    { note: 440.00, duration: 1.2, delay: 750, isTremolo: true },
    { note: 174.61, duration: 1.8, delay: 900, isBass: true },
    { note: 349.23, duration: 0.6, delay: 350 },
    { note: 440.00, duration: 0.7, delay: 400 },
    { note: 523.25, duration: 1.0, delay: 600, isTremolo: true },
    { note: 392.00, duration: 1.5, delay: 900 },

    // Khúc 3: Sa trường kịch chiến (~36s)
    { note: 146.83, duration: 1.5, delay: 800, isBass: true },
    { note: 293.66, duration: 0.5, delay: 280 },
    { note: 440.00, duration: 0.5, delay: 280, isTremolo: true },
    { note: 587.33, duration: 0.8, delay: 450, isTremolo: true },
    { note: 659.25, duration: 1.0, delay: 550, isTremolo: true },
    { note: 587.33, duration: 0.6, delay: 320 },
    { note: 523.25, duration: 0.6, delay: 320 },
    { note: 440.00, duration: 1.6, delay: 950, isTremolo: true },
    { note: 123.47, duration: 1.8, delay: 900, isBass: true },
    { note: 246.94, duration: 0.5, delay: 300 },
    { note: 392.00, duration: 0.6, delay: 350 },
    { note: 493.88, duration: 1.0, delay: 600, isTremolo: true },
    { note: 440.00, duration: 2.0, delay: 1100 },

    // Khúc 4: Tự tình kiếm khách (lắng sâu) (~32s)
    { note: 220.00, duration: 2.2, delay: 1200, isBass: true },
    { note: 329.63, duration: 1.0, delay: 600 },
    { note: 440.00, duration: 1.4, delay: 750 },
    { note: 392.00, duration: 1.2, delay: 650 },
    { note: 349.23, duration: 1.4, delay: 750 },
    { note: 329.63, duration: 2.2, delay: 1300 },
    { note: 164.81, duration: 2.0, delay: 1100, isBass: true },
    { note: 246.94, duration: 1.0, delay: 600 },
    { note: 415.30, duration: 1.4, delay: 750 },
    { note: 440.00, duration: 2.4, delay: 1400, isTremolo: true },

    // Khúc 5: Cao trào tuyệt đỉnh (~36s)
    { note: 110.00, duration: 1.6, delay: 850, isBass: true },
    { note: 440.00, duration: 0.4, delay: 240, isTremolo: true },
    { note: 523.25, duration: 0.4, delay: 240, isTremolo: true },
    { note: 587.33, duration: 0.5, delay: 280, isTremolo: true },
    { note: 659.25, duration: 0.8, delay: 450, isTremolo: true },
    { note: 783.99, duration: 1.2, delay: 650, isTremolo: true },
    { note: 659.25, duration: 0.6, delay: 350 },
    { note: 523.25, duration: 0.6, delay: 350 },
    { note: 440.00, duration: 1.8, delay: 1000, isTremolo: true },

    // Khúc 6: Vọng giang biên & nối vòng lặp vô tận (~32s)
    { note: 174.61, duration: 2.0, delay: 1100, isBass: true },
    { note: 349.23, duration: 1.0, delay: 600 },
    { note: 440.00, duration: 1.2, delay: 700 },
    { note: 329.63, duration: 1.8, delay: 1000 },
    { note: 164.81, duration: 2.2, delay: 1200, isBass: true },
    { note: 246.94, duration: 1.2, delay: 650 },
    { note: 415.30, duration: 1.5, delay: 850 },
    { note: 110.00, duration: 3.5, delay: 1800, isBass: true },
    { note: 440.00, duration: 3.0, delay: 1600, isTremolo: true },
    { note: 329.63, duration: 2.0, delay: 1100 },
  ];

  // --- 3. BẢN ĐÀN NGUYỆT: LƯU THỦY KIM TIỀN & VỌNG NGUYỆT TRI ÂM (~3:25, LOOP VÔ TẬN) ---
  private readonly DAN_NGUYET_SCORE: {
    note: number;
    duration: number;
    delay: number;
    isBass?: boolean;
    bend?: number;
    isTremolo?: boolean;
  }[] = [
    // Khúc 1: Trăng soi bến vắng (ấm áp truyền thống) (~32s)
    { note: 146.83, duration: 2.2, delay: 1100, isBass: true }, // D3
    { note: 220.00, duration: 1.2, delay: 600 },                // A3
    { note: 293.66, duration: 1.4, delay: 700 },                // D4
    { note: 329.63, duration: 1.3, delay: 750, bend: 40 },      // E4
    { note: 369.99, duration: 1.6, delay: 900, bend: 55 },      // F#4
    { note: 329.63, duration: 1.1, delay: 600 },
    { note: 293.66, duration: 1.3, delay: 700 },
    { note: 220.00, duration: 2.2, delay: 1200, isTremolo: true },
    { note: 146.83, duration: 2.0, delay: 1100, isBass: true },
    { note: 220.00, duration: 1.1, delay: 600 },
    { note: 293.66, duration: 1.3, delay: 700 },
    { note: 369.99, duration: 1.8, delay: 1100, bend: 45 },
    { note: 293.66, duration: 2.2, delay: 1300 },

    // Khúc 2: Lưu thủy kim tiền (nhịp điệu vui tươi réo rắt) (~36s)
    { note: 196.00, duration: 2.0, delay: 1000, isBass: true }, // G3
    { note: 293.66, duration: 0.8, delay: 450 },
    { note: 369.99, duration: 0.9, delay: 500, bend: 30 },
    { note: 440.00, duration: 1.2, delay: 650 },
    { note: 392.00, duration: 1.0, delay: 550, bend: 40 },
    { note: 329.63, duration: 1.1, delay: 600 },
    { note: 293.66, duration: 1.5, delay: 850 },
    { note: 146.83, duration: 2.0, delay: 1000, isBass: true },
    { note: 220.00, duration: 0.8, delay: 450 },
    { note: 293.66, duration: 1.0, delay: 550 },
    { note: 369.99, duration: 1.2, delay: 650, bend: 45 },
    { note: 440.00, duration: 1.5, delay: 850, isTremolo: true },
    { note: 293.66, duration: 2.2, delay: 1200 },

    // Khúc 3: Vọng nguyệt tri âm (uốn nốt luyến láy sâu sắc) (~35s)
    { note: 110.00, duration: 2.2, delay: 1100, isBass: true }, // A2
    { note: 220.00, duration: 1.0, delay: 550 },
    { note: 277.18, duration: 1.4, delay: 750, bend: 60 },      // C#4
    { note: 329.63, duration: 1.3, delay: 700 },
    { note: 369.99, duration: 1.5, delay: 800, bend: 45 },
    { note: 440.00, duration: 2.2, delay: 1200, isTremolo: true },
    { note: 146.83, duration: 2.0, delay: 1100, isBass: true },
    { note: 293.66, duration: 1.1, delay: 600 },
    { note: 369.99, duration: 1.3, delay: 750, bend: 50 },
    { note: 329.63, duration: 1.3, delay: 700 },
    { note: 293.66, duration: 2.4, delay: 1300 },

    // Khúc 4: Khúc biến tấu giang hồ (~35s)
    { note: 196.00, duration: 1.8, delay: 950, isBass: true },
    { note: 293.66, duration: 0.6, delay: 350 },
    { note: 369.99, duration: 0.7, delay: 400, bend: 35 },
    { note: 440.00, duration: 0.9, delay: 500 },
    { note: 554.37, duration: 1.2, delay: 700, isTremolo: true },
    { note: 440.00, duration: 0.7, delay: 400 },
    { note: 369.99, duration: 0.8, delay: 450 },
    { note: 293.66, duration: 1.6, delay: 900 },
    { note: 146.83, duration: 2.0, delay: 1100, isBass: true },
    { note: 220.00, duration: 0.8, delay: 450 },
    { note: 293.66, duration: 1.1, delay: 600 },
    { note: 329.63, duration: 1.2, delay: 650, bend: 40 },
    { note: 293.66, duration: 2.0, delay: 1100 },

    // Khúc 5: Khúc ngân đêm rằm & nối vòng lặp vô tận (~32s)
    { note: 110.00, duration: 2.2, delay: 1200, isBass: true },
    { note: 220.00, duration: 1.2, delay: 650 },
    { note: 277.18, duration: 1.4, delay: 750, bend: 50 },
    { note: 329.63, duration: 1.6, delay: 900 },
    { note: 146.83, duration: 2.5, delay: 1300, isBass: true },
    { note: 293.66, duration: 2.8, delay: 1500, isTremolo: true },
    { note: 73.42, duration: 3.5, delay: 1800, isBass: true }, // Deep D2
    { note: 220.00, duration: 2.2, delay: 1200 }, // Nối về đầu bản
  ];

  // --- 4. BẢN ĐÀN HẠC (HARP): SUỐI NGỌC THIÊN THAI & DẠ KHÚC HUYỀN THOẠI (~3:30, LOOP VÔ TẬN) ---
  private readonly HARP_SCORE: {
    note: number;
    duration: number;
    delay: number;
    isBass?: boolean;
    isGlissando?: boolean;
    pan?: number;
  }[] = [
    // Movement 1: Crystalline Morning Dew (~35s)
    { note: 130.81, duration: 3.0, delay: 1200, isBass: true, pan: -0.3 }, // C3
    { note: 261.63, duration: 2.0, delay: 450, pan: -0.15 },              // C4
    { note: 329.63, duration: 2.0, delay: 450, pan: 0.15 },               // E4
    { note: 392.00, duration: 2.0, delay: 450, pan: 0.3 },                // G4
    { note: 523.25, duration: 2.4, delay: 750, pan: 0.25 },               // C5
    { note: 493.88, duration: 1.8, delay: 500, pan: 0.1 },                // B4
    { note: 392.00, duration: 1.8, delay: 500, pan: -0.1 },               // G4
    { note: 329.63, duration: 2.2, delay: 900, pan: -0.2 },               // E4
    { note: 110.00, duration: 3.2, delay: 1200, isBass: true, pan: -0.35 },// A2
    { note: 220.00, duration: 2.0, delay: 450, pan: -0.2 },              // A3
    { note: 261.63, duration: 2.0, delay: 450, pan: 0.1 },                // C4
    { note: 329.63, duration: 2.0, delay: 450, pan: 0.2 },                // E4
    { note: 440.00, duration: 2.5, delay: 850, pan: 0.3 },                // A4
    { note: 392.00, duration: 1.8, delay: 500, pan: 0.15 },               // G4
    { note: 329.63, duration: 2.2, delay: 1000, pan: -0.1 },              // E4

    // Movement 2: River of Pearls (Thác nước suối tiên) (~38s)
    { note: 87.31, duration: 3.0, delay: 1200, isBass: true, pan: -0.3 }, // F2
    { note: 174.61, duration: 1.8, delay: 420, pan: -0.2 },              // F3
    { note: 261.63, duration: 1.8, delay: 420, pan: 0.0 },                // C4
    { note: 349.23, duration: 1.8, delay: 420, pan: 0.2 },                // F4
    { note: 440.00, duration: 2.2, delay: 700, pan: 0.3 },                // A4
    { note: 523.25, duration: 2.4, delay: 800, pan: 0.2 },                // C5
    { note: 0, duration: 1.2, delay: 1400, isGlissando: true },           // Harp glissando sweep
    { note: 98.00, duration: 3.0, delay: 1200, isBass: true, pan: -0.35 }, // G2
    { note: 196.00, duration: 1.8, delay: 420, pan: -0.2 },              // G3
    { note: 293.66, duration: 1.8, delay: 420, pan: 0.0 },                // D4
    { note: 392.00, duration: 1.8, delay: 420, pan: 0.2 },                // G4
    { note: 493.88, duration: 2.2, delay: 750, pan: 0.3 },                // B4
    { note: 392.00, duration: 2.4, delay: 1100, pan: 0.1 },               // G4

    // Movement 3: Celtic Emerald Meadows (Dạ khúc êm đềm) (~42s)
    { note: 110.00, duration: 3.2, delay: 1200, isBass: true, pan: -0.3 },
    { note: 220.00, duration: 2.0, delay: 450, pan: -0.15 },
    { note: 329.63, duration: 2.0, delay: 450, pan: 0.15 },
    { note: 440.00, duration: 2.2, delay: 650, pan: 0.25 },
    { note: 523.25, duration: 2.5, delay: 850, pan: 0.3 },
    { note: 587.33, duration: 2.0, delay: 600, pan: 0.2 },
    { note: 523.25, duration: 1.8, delay: 550, pan: 0.1 },
    { note: 440.00, duration: 2.4, delay: 1100, pan: -0.1 },
    { note: 130.81, duration: 3.0, delay: 1200, isBass: true, pan: -0.3 },
    { note: 261.63, duration: 1.8, delay: 450, pan: -0.15 },
    { note: 329.63, duration: 1.8, delay: 450, pan: 0.1 },
    { note: 392.00, duration: 2.0, delay: 600, pan: 0.25 },
    { note: 493.88, duration: 2.2, delay: 800, pan: 0.3 },
    { note: 440.00, duration: 2.5, delay: 1200, pan: 0.0 },

    // Movement 4: Golden Cascade (Thác ngọc rực rỡ) (~45s)
    { note: 174.61, duration: 3.0, delay: 1100, isBass: true, pan: -0.3 },
    { note: 261.63, duration: 1.6, delay: 400, pan: -0.2 },
    { note: 349.23, duration: 1.6, delay: 400, pan: 0.0 },
    { note: 440.00, duration: 1.8, delay: 500, pan: 0.2 },
    { note: 523.25, duration: 2.0, delay: 650, pan: 0.3 },
    { note: 659.25, duration: 2.4, delay: 900, pan: 0.35 },
    { note: 0, duration: 1.2, delay: 1500, isGlissando: true },
    { note: 164.81, duration: 3.0, delay: 1100, isBass: true, pan: -0.3 },
    { note: 246.94, duration: 1.6, delay: 400, pan: -0.15 },
    { note: 329.63, duration: 1.6, delay: 400, pan: 0.1 },
    { note: 415.30, duration: 1.8, delay: 500, pan: 0.25 },
    { note: 493.88, duration: 2.0, delay: 700, pan: 0.3 },
    { note: 440.00, duration: 2.6, delay: 1300, pan: 0.0 },

    // Movement 5: Starlight Lullaby & nối vòng lặp vô tận (~38s)
    { note: 110.00, duration: 3.5, delay: 1300, isBass: true, pan: -0.35 },
    { note: 220.00, duration: 2.2, delay: 500, pan: -0.2 },
    { note: 261.63, duration: 2.2, delay: 500, pan: 0.0 },
    { note: 329.63, duration: 2.4, delay: 600, pan: 0.2 },
    { note: 440.00, duration: 2.8, delay: 1000, pan: 0.3 },
    { note: 659.25, duration: 3.0, delay: 1200, pan: 0.35 },
    { note: 523.25, duration: 2.4, delay: 800, pan: 0.2 },
    { note: 440.00, duration: 2.8, delay: 1100, pan: 0.1 },
    { note: 65.41, duration: 4.5, delay: 2000, isBass: true, pan: -0.4 }, // Deep C2
    { note: 523.25, duration: 3.5, delay: 1800, pan: 0.3 }, // Nốt ngân trong trẻo
    { note: 261.63, duration: 2.5, delay: 1300, pan: 0.0 }, // Nối về C4 đầu bản
  ];

  // ==========================================
  // PHYSICAL SYNTHESIS MODELS CHO CÁC LOẠI ĐÀN
  // ==========================================

  // 1. ĐÀN CỔ TRANH (GUZHENG 21 DÂY):
  public playGuzhengPluck(
    freq: number,
    duration: number = 1.8,
    isBass: boolean = false,
    bendCents: number = 0,
    isTremolo: boolean = false
  ) {
    if (!this.soundEnabled && !this.isBgmActive) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = this.bgmVolume * (isBass ? 0.85 : 0.75);

    const playSinglePluck = (offsetTime: number, dynamicScale: number = 1.0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = isBass ? 'triangle' : 'sawtooth';
      const startFreq = freq;
      osc.frequency.setValueAtTime(startFreq, offsetTime);

      if (bendCents !== 0) {
        const bentFreq = startFreq * Math.pow(2, bendCents / 1200);
        osc.frequency.setValueAtTime(startFreq, offsetTime);
        osc.frequency.linearRampToValueAtTime(bentFreq, offsetTime + 0.18);
        osc.frequency.exponentialRampToValueAtTime(startFreq, offsetTime + duration * 0.7);
      }

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isBass ? freq * 2.2 : Math.min(freq * 3.4, 3800), offsetTime);
      filter.Q.setValueAtTime(isBass ? 2.5 : 3.8, offsetTime);

      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'sine';
      snapOsc.frequency.setValueAtTime(isBass ? 1200 : 2800, offsetTime);
      snapGain.gain.setValueAtTime(0.001, offsetTime);
      snapGain.gain.linearRampToValueAtTime(vol * 0.45 * dynamicScale, offsetTime + 0.003);
      snapGain.gain.exponentialRampToValueAtTime(0.001, offsetTime + 0.012);
      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(offsetTime);
      snapOsc.stop(offsetTime + 0.015);

      gain.gain.setValueAtTime(0.001, offsetTime);
      gain.gain.linearRampToValueAtTime(vol * dynamicScale, offsetTime + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, offsetTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(offsetTime);
      osc.stop(offsetTime + duration + 0.05);
    };

    if (isTremolo) {
      playSinglePluck(now, 0.7);
      playSinglePluck(now + 0.07, 0.85);
      playSinglePluck(now + 0.14, 1.0);
    } else {
      playSinglePluck(now, 1.0);
    }
  }

  // 2. HOA ÂM CỔ TRANH (GLISSANDO):
  public playGuzhengGlissando() {
    if (!this.soundEnabled && !this.isBgmActive) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const glissNotes = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 659.25];
    glissNotes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playGuzhengPluck(freq, 1.2, false, 0, false);
      }, idx * 60);
    });
  }

  // 3. ĐÀN TỲ BÀ (PIPA - 4 DÂY LUÂN CHỈ KIẾM HIỆP):
  public playPipaPluck(freq: number, duration: number = 1.4, isTremolo: boolean = false) {
    if (!this.soundEnabled && !this.isBgmActive) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = this.bgmVolume * 0.82;

    const strikeNote = (time: number, scale: number = 1.0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 4.6, time);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.6, time + 0.25);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(vol * scale, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + duration + 0.05);
    };

    if (isTremolo) {
      strikeNote(now, 0.65);
      strikeNote(now + 0.055, 0.75);
      strikeNote(now + 0.11, 0.9);
      strikeNote(now + 0.165, 1.0);
    } else {
      strikeNote(now, 1.0);
    }
  }

  // 4. ĐÀN NGUYỆT (YUEQIN / ĐÀN KÌM - THÙNG GỖ TRÒN ẤM ÁP, NHẤN LŨYEN SÂU):
  public playDanNguyetPluck(
    freq: number,
    duration: number = 1.8,
    isBass: boolean = false,
    bendCents: number = 0,
    isTremolo: boolean = false
  ) {
    if (!this.soundEnabled && !this.isBgmActive) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = this.bgmVolume * (isBass ? 0.88 : 0.80);

    const playStrike = (time: number, scale: number = 1.0) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const bodyFilter = ctx.createBiquadFilter();

      // Đàn nguyệt có âm mộc dày ấm (triangle + sine kết hợp)
      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(freq, time);
      osc2.frequency.setValueAtTime(freq * 2, time); // Quãng tám ấm

      // Nhấn luyến láy đặc trưng của đàn Nguyệt Việt Nam
      if (bendCents !== 0) {
        const bentFreq = freq * Math.pow(2, bendCents / 1200);
        osc1.frequency.linearRampToValueAtTime(bentFreq, time + 0.22);
        osc1.frequency.exponentialRampToValueAtTime(freq, time + duration * 0.75);
      }

      // Thùng đàn gỗ tròn cộng hưởng trầm ấm (Khoảng 280Hz - 340Hz)
      bodyFilter.type = 'bandpass';
      bodyFilter.frequency.setValueAtTime(isBass ? 240 : 360, time);
      bodyFilter.Q.setValueAtTime(2.8, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(vol * scale, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc1.connect(bodyFilter);
      osc2.connect(bodyFilter);
      bodyFilter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + duration + 0.05);
      osc2.stop(time + duration + 0.05);
    };

    if (isTremolo) {
      playStrike(now, 0.7);
      playStrike(now + 0.07, 0.85);
      playStrike(now + 0.14, 1.0);
    } else {
      playStrike(now, 1.0);
    }
  }

  // 5. ĐÀN HẠC (CONCERT / CELTIC HARP - TIẾNG CHUÔNG NGỌC THIÊN THAI):
  public playHarpPluck(freq: number, duration: number = 2.4, pan: number = 0) {
    if (!this.soundEnabled && !this.isBgmActive) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = this.bgmVolume * 0.82;

    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Harp pure bell-like sine + subtle triangle overtone
    osc.type = 'sine';
    overtone.type = 'triangle';

    osc.frequency.setValueAtTime(freq, now);
    overtone.frequency.setValueAtTime(freq * 2, now);

    // Warm harp cedar soundbox acoustic resonance
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 3.6, 5000), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.4, 250), now + 0.6);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.006); // Fast gentle attack
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Stereo Panning
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
      gain.connect(panner);
      panner.connect(ctx.destination);
    } else {
      gain.connect(ctx.destination);
    }

    osc.connect(filter);
    overtone.connect(filter);
    filter.connect(gain);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + duration + 0.05);
    overtone.stop(now + duration + 0.05);
  }

  // 6. TIẾNG LƯỚT ĐÀN HẠC (HARP ARPEGGIO GLISSANDO):
  public playHarpGlissando() {
    if (!this.soundEnabled && !this.isBgmActive) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const harpNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    harpNotes.forEach((freq, idx) => {
      setTimeout(() => {
        const pan = -0.4 + (idx / harpNotes.length) * 0.8;
        this.playHarpPluck(freq, 2.0, pan);
      }, idx * 55);
    });
  }

  public isBgmPlaying(): boolean {
    return this.isBgmActive;
  }

  public startBgm() {
    if (this.isBgmActive) return;
    this.isBgmActive = true;

    // If custom audio file is uploaded, play that!
    if (this.customBgmAudio && this.customConfig.hasCustomBgm) {
      try {
        this.customBgmAudio.currentTime = 0;
        this.customBgmAudio.volume = this.bgmVolume;
        this.customBgmAudio.play().catch(() => {});
        return;
      } catch {}
    }

    // Classical Guitar Engine
    if (this.customConfig.bgmInstrument === 'guitar') {
      classicalGuitar.setVolume(this.bgmVolume);
      classicalGuitar.setTrack(this.customConfig.guitarTrack || 'leyenda');
      classicalGuitar.play();
      return;
    }

    // Traditional Instruments & Harp Engine
    this.scheduleNextTraditionalNote();
  }

  public stopBgm() {
    this.isBgmActive = false;
    classicalGuitar.stop();
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.customBgmAudio) {
      this.customBgmAudio.pause();
    }
  }

  public toggleBgm(): boolean {
    if (this.isBgmActive) {
      this.stopBgm();
      return false;
    } else {
      this.startBgm();
      return true;
    }
  }

  // Lặp vô tận (Infinite Loop) không bao giờ ngắt quãng
  private scheduleNextTraditionalNote = () => {
    if (!this.isBgmActive) return;

    if (this.customBgmAudio && this.customConfig.hasCustomBgm) {
      return;
    }

    const instrument = this.customConfig.bgmInstrument || 'guzheng';
    let activeScore: Array<{
      note: number;
      duration: number;
      delay: number;
      isBass?: boolean;
      bend?: number;
      isTremolo?: boolean;
      isGlissando?: boolean;
      pan?: number;
    }>;

    switch (instrument) {
      case 'pipa':
      case 'pipa_yueqin':
        activeScore = this.PIPA_SCORE;
        break;
      case 'dan_nguyet':
        activeScore = this.DAN_NGUYET_SCORE;
        break;
      case 'harp':
        activeScore = this.HARP_SCORE;
        break;
      case 'guzheng':
      default:
        activeScore = this.GUZHENG_SCORE;
        break;
    }

    const current = activeScore[this.bgmNoteStep % activeScore.length];

    if (current.isGlissando) {
      if (instrument === 'harp') {
        this.playHarpGlissando();
      } else {
        this.playGuzhengGlissando();
      }
    } else {
      switch (instrument) {
        case 'guzheng':
          this.playGuzhengPluck(
            current.note,
            current.duration,
            current.isBass,
            current.bend || 0,
            Boolean(current.isTremolo)
          );
          break;
        case 'pipa':
        case 'pipa_yueqin':
          this.playPipaPluck(current.note, current.duration, Boolean(current.isTremolo));
          break;
        case 'dan_nguyet':
          this.playDanNguyetPluck(
            current.note,
            current.duration,
            current.isBass,
            current.bend || 0,
            Boolean(current.isTremolo)
          );
          break;
        case 'harp':
          this.playHarpPluck(current.note, current.duration, current.pan || 0);
          break;
      }
    }

    // VÒNG LẶP VÔ TẬN: Hết bài sẽ tự động quay lại đầu bản không dừng lại
    this.bgmNoteStep = (this.bgmNoteStep + 1) % activeScore.length;

    this.bgmTimer = setTimeout(() => {
      this.scheduleNextTraditionalNote();
    }, current.delay);
  };
}

export const sound = new SoundController();
