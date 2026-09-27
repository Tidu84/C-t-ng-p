/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BgmInstrument = 'guzheng' | 'pipa_yueqin' | 'guitar';

// Custom audio file storage in memory & localStorage
export interface CustomAudioConfig {
  hasCustomCapture: boolean;
  captureFileName?: string;
  hasCustomLoss: boolean;
  lossFileName?: string;
  hasCustomBgm: boolean;
  bgmFileName?: string;
  bgmInstrument: BgmInstrument;
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
    bgmInstrument: 'guzheng', // Default to Chinese multi-string zither / Đàn Cổ Tranh as requested
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
      }
      // Set to 100% Maximum Volume as requested by user
      this.bgmVolume = 1.0;
      this.sfxVolume = 1.0;
      this.customConfig.bgmVolume = 1.0;
      this.customConfig.sfxVolume = 1.0;
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
    this.customConfig.bgmInstrument = instrument;
    this.saveCustomAudioConfig();
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
      this.scheduleNextGuitarNote();
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
  // 3. NHẠC NỀN: BIẾN TẤU GIAI ĐIỆU TRÊN ĐÀN CỔ TRANH / ĐÀN NGUYỆT / ĐÀN TỲ BÀ & GUITAR
  // Bản biến tấu theo giai điệu guitar mộc của người dùng:
  // - Đàn Cổ Tranh (Guzheng 21 dây): âm tơ kim lảnh lót, hoa âm lướt sóng, nhấn nhá uốn nốt cổ phong
  // - Đàn Tỳ Bà & Đàn Nguyệt: gảy mộc, luân chỉ liên hoàn réo rắt
  // - Đàn Guitar Mộc Am: rải ngón mộc mạc thư thái
  // ==========================================

  private readonly AM_EASTERN_MELODY: {
    note: number;
    duration: number;
    delay: number;
    isBass?: boolean;
    bend?: number; // Pitch bend cents for Guzheng/Yueqin left-hand pressing
    isTremolo?: boolean; // Pipa / Guzheng tremolo
    isGlissando?: boolean; // Guzheng pentatonic water flourish (Hoa âm)
  }[] = [
    // --- Khúc 1: Tĩnh Mịch Nhập Cuộc (Am Theme) ---
    { note: 220.00, duration: 2.2, delay: 1100, isBass: true }, // A3 Bass
    { note: 329.63, duration: 1.2, delay: 550 },                // E4
    { note: 440.00, duration: 1.4, delay: 650 },                // A4
    { note: 523.25, duration: 1.3, delay: 700, bend: 35 },      // C5 (nhấn nốt)
    { note: 587.33, duration: 1.5, delay: 850, bend: 50 },      // D5 (uốn lượn lên E)
    { note: 523.25, duration: 1.1, delay: 600 },                // C5
    { note: 493.88, duration: 1.3, delay: 750 },                // B4
    { note: 440.00, duration: 2.2, delay: 1300, isTremolo: true }, // A4

    // --- Khúc 2: Sơn Hà Lưu Thủy (Fmaj7 / Dm) ---
    { note: 174.61, duration: 2.0, delay: 1100, isBass: true }, // F3 Bass
    { note: 261.63, duration: 1.0, delay: 550 },                // C4
    { note: 349.23, duration: 1.2, delay: 650 },                // F4
    { note: 440.00, duration: 1.3, delay: 700 },                // A4
    { note: 392.00, duration: 1.3, delay: 750, bend: 30 },      // G4
    { note: 329.63, duration: 1.1, delay: 600 },                // E4
    { note: 293.66, duration: 1.8, delay: 1100 },               // D4

    // --- Điểm xuyết: Hoa Âm Cổ Tranh (Guzheng Glissando) ---
    { note: 0, duration: 1.0, delay: 1300, isGlissando: true },

    // --- Khúc 3: Kỳ Phùng Tri Kỷ (G / Em) ---
    { note: 196.00, duration: 2.0, delay: 1100, isBass: true }, // G3 Bass
    { note: 293.66, duration: 1.0, delay: 550 },                // D4
    { note: 392.00, duration: 1.2, delay: 650 },                // G4
    { note: 523.25, duration: 1.3, delay: 750 },                // C5
    { note: 493.88, duration: 1.2, delay: 650 },                // B4
    { note: 440.00, duration: 1.1, delay: 600 },                // A4
    { note: 392.00, duration: 1.6, delay: 1050 },               // G4

    // --- Khúc 4: Cao Trào Quyết Đoán (E7 -> Am Cadence) ---
    { note: 164.81, duration: 2.0, delay: 1100, isBass: true }, // E3 Bass
    { note: 246.94, duration: 1.0, delay: 550 },                // B3
    { note: 415.30, duration: 1.5, delay: 800, bend: 45 },      // G#4 (âm sắc huyền ảo)
    { note: 493.88, duration: 1.2, delay: 650 },                // B4
    { note: 523.25, duration: 1.2, delay: 650 },                // C5
    { note: 493.88, duration: 1.3, delay: 750 },                // B4
    { note: 440.00, duration: 2.6, delay: 2000, isTremolo: true }, // A4 ngân rung
    { note: 110.00, duration: 3.5, delay: 2400, isBass: true }, // Deep A2 chấn động trầm ấm
  ];

  // 1. ĐÀN CỔ TRANH (GUZHENG - 21 DÂY TRUNG QUỐC):
  // Âm sắc tơ kim réo rắt, có nhấn nhá uốn nốt (pitch bend) và âm vang mộc của thành đàn
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
    // Maximum acoustic volume output (thanh thoát, vang dội to rõ nhất)
    const vol = this.bgmVolume * (isBass ? 0.85 : 0.75);

    const playSinglePluck = (offsetTime: number, dynamicScale: number = 1.0) => {
      // Primary string oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Guzheng strings have bright sawtooth/triangle content
      osc.type = isBass ? 'triangle' : 'sawtooth';

      const startFreq = freq;
      osc.frequency.setValueAtTime(startFreq, offsetTime);

      // Left-hand string press/bend ("án uốn dây")
      if (bendCents !== 0) {
        const bentFreq = startFreq * Math.pow(2, bendCents / 1200);
        osc.frequency.setValueAtTime(startFreq, offsetTime);
        osc.frequency.linearRampToValueAtTime(bentFreq, offsetTime + 0.18);
        osc.frequency.exponentialRampToValueAtTime(startFreq, offsetTime + duration * 0.7);
      }

      // Wooden body + bridge resonance
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isBass ? freq * 2.2 : Math.min(freq * 3.4, 3800), offsetTime);
      filter.Q.setValueAtTime(isBass ? 2.5 : 3.8, offsetTime);

      // Attack snap transient (móng gảy lướt qua dây kim loại)
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

      // Secondary warm harmonic
      const harmOsc = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harmOsc.type = 'sine';
      harmOsc.frequency.setValueAtTime(freq * 2, offsetTime);
      harmGain.gain.setValueAtTime(0.001, offsetTime);
      harmGain.gain.linearRampToValueAtTime(vol * 0.5 * dynamicScale, offsetTime + 0.006);
      harmGain.gain.exponentialRampToValueAtTime(0.001, offsetTime + duration * 0.6);
      harmOsc.connect(harmGain);
      harmGain.connect(ctx.destination);
      harmOsc.start(offsetTime);
      harmOsc.stop(offsetTime + duration * 0.65);

      // Main string envelope
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
      // Rapid 3-note flourish (Luân chỉ)
      playSinglePluck(now, 0.7);
      playSinglePluck(now + 0.07, 0.85);
      playSinglePluck(now + 0.14, 1.0);
    } else {
      playSinglePluck(now, 1.0);
    }
  }

  // 2. HOA ÂM CỔ TRANH (GUZHENG PENTATONIC GLISSANDO / LƯU THỦY):
  // Vuốt ngón lướt trên 7 dây ngũ cung réo rắt như dòng nước suối
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

  // 3. ĐÀN TỲ BÀ & ĐÀN NGUYỆT (PIPA & YUEQIN):
  // Âm mộc đanh, gảy dứt khoát phong cách kiếm hiệp kỳ đài
  public playPipaPluck(freq: number, duration: number = 1.4, isTremolo: boolean = false) {
    if (!this.soundEnabled && !this.isBgmActive) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = this.bgmVolume * 0.80;

    const strikeNote = (time: number, scale: number = 1.0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 4.5, time);
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
      strikeNote(now + 0.06, 0.8);
      strikeNote(now + 0.12, 1.0);
    } else {
      strikeNote(now, 1.0);
    }
  }

  // 4. ĐÀN GUITAR MỘC AM (ACOUSTIC GUITAR FINGERSTYLE):
  public playGuitarPluck(freq: number, duration: number = 1.4, isBass: boolean = false) {
    if (!this.soundEnabled && !this.isBgmActive) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = isBass ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBass ? freq * 3.0 : freq * 4.2, now);
    filter.frequency.exponentialRampToValueAtTime(isBass ? freq * 1.5 : freq * 1.8, now + 0.35);

    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, now);

    const masterVol = this.bgmVolume * (isBass ? 0.85 : 0.72);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(masterVol, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    overtoneGain.gain.setValueAtTime(0.001, now);
    overtoneGain.gain.linearRampToValueAtTime(masterVol * 0.45, now + 0.005);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + Math.min(duration, 0.5));

    osc.connect(filter);
    overtone.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + duration + 0.05);
    overtone.stop(now + Math.min(duration, 0.5) + 0.05);
  }

  public isBgmPlaying(): boolean {
    return this.isBgmActive;
  }

  public startBgm() {
    if (this.isBgmActive) return;
    this.isBgmActive = true;

    // If custom guitar audio file is uploaded, play that!
    if (this.customBgmAudio && this.customConfig.hasCustomBgm) {
      try {
        this.customBgmAudio.currentTime = 0;
        this.customBgmAudio.volume = this.bgmVolume;
        this.customBgmAudio.play().catch(() => {});
        return;
      } catch {}
    }

    this.scheduleNextGuitarNote();
  }

  public stopBgm() {
    this.isBgmActive = false;
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

  private scheduleNextGuitarNote = () => {
    if (!this.isBgmActive) return;

    if (this.customBgmAudio && this.customConfig.hasCustomBgm) {
      return;
    }

    const current = this.AM_EASTERN_MELODY[this.bgmNoteStep % this.AM_EASTERN_MELODY.length];

    if (current.isGlissando) {
      if (this.customConfig.bgmInstrument === 'guzheng') {
        this.playGuzhengGlissando();
      }
    } else {
      const instrument = this.customConfig.bgmInstrument || 'guzheng';
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
        case 'pipa_yueqin':
          this.playPipaPluck(current.note, current.duration, Boolean(current.isTremolo));
          break;
        case 'guitar':
        default:
          this.playGuitarPluck(current.note, current.duration, Boolean(current.isBass));
          break;
      }
    }

    this.bgmNoteStep = (this.bgmNoteStep + 1) % this.AM_EASTERN_MELODY.length;

    this.bgmTimer = setTimeout(() => {
      this.scheduleNextGuitarNote();
    }, current.delay);
  };
}

export const sound = new SoundController();
