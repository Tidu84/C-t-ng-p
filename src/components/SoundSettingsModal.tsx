/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  X,
  Volume2,
  Music,
  Upload,
  Play,
  Trash2,
  RotateCcw,
  Check,
  Disc,
  Radio,
  Flame,
  Smartphone,
} from 'lucide-react';
import {
  sound,
  BgmInstrument,
  ClassicalGuitarTrackId,
  GUITAR_TRACKS,
} from '../utils/audio';
import {
  triggerDeviceVibration,
  checkVibrationSupport,
  getVibrationEnabled,
  setVibrationEnabled,
} from '../utils/vibration';

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isBgmOn: boolean;
  onToggleBgm: () => void;
}

export const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({
  isOpen,
  onClose,
  isBgmOn,
  onToggleBgm,
}) => {
  const [config, setConfig] = useState(() => sound.getConfig());
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [vibEnabled, setVibEnabledState] = useState(() => getVibrationEnabled());
  const vibSupport = checkVibrationSupport();

  const captureInputRef = useRef<HTMLInputElement>(null);
  const lossInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTestCapture = () => {
    sound.playCapture();
    setTestStatus('Đang phát tiếng cạch ăn quân...');
    setTimeout(() => setTestStatus(null), 1500);
  };

  const handleTestLoss = () => {
    sound.playPieceLost();
    setTestStatus('Đang phát nhạc buồn mất quân (Am)...');
    setTimeout(() => setTestStatus(null), 2500);
  };

  const handleSelectGuitarTrack = (track: ClassicalGuitarTrackId) => {
    sound.setBgmInstrument('guitar');
    sound.setGuitarTrack(track);
    setConfig(sound.getConfig());
    if (!isBgmOn) {
      onToggleBgm();
    }
    const info = GUITAR_TRACKS.find((t) => t.id === track);
    setTestStatus(`🎸 Đang phát: ${info?.title} (${info?.genre})`);
    setTimeout(() => setTestStatus(null), 3500);
  };

  const handleSelectInstrument = (inst: BgmInstrument) => {
    sound.setBgmInstrument(inst);
    setConfig(sound.getConfig());
    if (!isBgmOn) {
      onToggleBgm();
    }
  };

  const handleUploadCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sound.setCustomCaptureFile(file);
      setConfig(sound.getConfig());
      setTestStatus(`Đã nạp file ăn quân: ${file.name}`);
      setTimeout(() => setTestStatus(null), 3000);
    }
  };

  const handleUploadLoss = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sound.setCustomLossFile(file);
      setConfig(sound.getConfig());
      setTestStatus(`Đã nạp file nhạc buồn: ${file.name}`);
      setTimeout(() => setTestStatus(null), 3000);
    }
  };

  const handleUploadBgm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sound.setCustomBgmFile(file);
      setConfig(sound.getConfig());
      setTestStatus(`🎸 Đã nạp file guitar của bạn: ${file.name}`);
      setTimeout(() => setTestStatus(null), 4000);
    }
  };

  const handleClearCapture = () => {
    sound.clearCustomCaptureFile();
    setConfig(sound.getConfig());
  };

  const handleClearLoss = () => {
    sound.clearCustomLossFile();
    setConfig(sound.getConfig());
  };

  const handleClearBgm = () => {
    sound.clearCustomBgmFile();
    setConfig(sound.getConfig());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181b] border-2 border-amber-500/60 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-stone-100">
              Cài Đặt Âm Thanh & Nhạc Guitar
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Notification */}
        {testStatus && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs text-center font-semibold animate-fade-in flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{testStatus}</span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Section 1: Tiếng ăn quân cờ */}
          <div className="bg-[#121214] p-3 rounded-xl border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <span>⚔️ Tiếng ăn quân:</span>
                <span className="text-amber-400">"Cạch"</span>
              </span>
              <button
                onClick={handleTestCapture}
                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Nghe thử</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[11px] text-stone-300 truncate max-w-[200px]">
                {config.hasCustomCapture
                  ? `File: ${config.captureFileName || 'Tùy chỉnh'}`
                  : 'Mặc định: Tiếng cạch'}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={captureInputRef}
                  onChange={handleUploadCapture}
                  accept="audio/*"
                  className="hidden"
                />
                <button
                  onClick={() => captureInputRef.current?.click()}
                  className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-semibold flex items-center gap-1 border border-white/10"
                >
                  <Upload className="w-3 h-3" />
                  <span>Tải file</span>
                </button>
                {config.hasCustomCapture && (
                  <button
                    onClick={handleClearCapture}
                    className="p-1 text-red-400 hover:text-red-300"
                    title="Về tiếng mặc định"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Tiếng bị mất quân */}
          <div className="bg-[#121214] p-3 rounded-xl border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <span>🛡️ Tiếng mất quân:</span>
                <span className="text-red-400">Trầm buồn</span>
              </span>
              <button
                onClick={handleTestLoss}
                className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 transition-colors border border-white/10"
              >
                <Play className="w-3 h-3 fill-current text-red-400" />
                <span>Nghe thử</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[11px] text-stone-300 truncate max-w-[200px]">
                {config.hasCustomLoss
                  ? `File: ${config.lossFileName || 'Tùy chỉnh'}`
                  : 'Mặc định: Trầm buồn'}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={lossInputRef}
                  onChange={handleUploadLoss}
                  accept="audio/*"
                  className="hidden"
                />
                <button
                  onClick={() => lossInputRef.current?.click()}
                  className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-semibold flex items-center gap-1 border border-white/10"
                >
                  <Upload className="w-3 h-3" />
                  <span>Tải file</span>
                </button>
                {config.hasCustomLoss && (
                  <button
                    onClick={handleClearLoss}
                    className="p-1 text-red-400 hover:text-red-300"
                    title="Về tiếng mặc định"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Nhạc nền */}
          <div className="bg-[#121214] p-3 rounded-xl border border-amber-500/40 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Music className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-stone-100">
                  Nhạc nền
                </span>
              </div>
              <button
                onClick={onToggleBgm}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  isBgmOn
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                    : 'bg-stone-800 text-stone-300 hover:text-white border-white/10'
                }`}
              >
                {isBgmOn ? 'BẬT' : 'TẮT'}
              </button>
            </div>

            {/* Chọn loại đàn (Guitar, Cổ Tranh, Tỳ Bà, Đàn Nguyệt, Đàn Hạc) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-stone-400">Chọn loại đàn:</span>
              <div className="grid grid-cols-5 gap-1">
                <button
                  type="button"
                  onClick={() => handleSelectInstrument('guitar')}
                  className={`py-1.5 px-1 rounded text-[11px] font-bold transition-all border text-center truncate ${
                    config.bgmInstrument === 'guitar'
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                      : 'bg-stone-800 text-stone-300 hover:text-white border-white/5'
                  }`}
                  title="Đàn Guitar Cổ Điển"
                >
                  🎸 Guitar
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectInstrument('guzheng')}
                  className={`py-1.5 px-1 rounded text-[11px] font-bold transition-all border text-center truncate ${
                    config.bgmInstrument === 'guzheng'
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                      : 'bg-stone-800 text-stone-300 hover:text-white border-white/5'
                  }`}
                  title="Đàn Cổ Tranh 21 Dây"
                >
                  🪕 Cổ Tranh
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectInstrument('pipa')}
                  className={`py-1.5 px-1 rounded text-[11px] font-bold transition-all border text-center truncate ${
                    config.bgmInstrument === 'pipa' || config.bgmInstrument === 'pipa_yueqin'
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                      : 'bg-stone-800 text-stone-300 hover:text-white border-white/5'
                  }`}
                  title="Đàn Tỳ Bà"
                >
                  🪕 Tỳ Bà
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectInstrument('dan_nguyet')}
                  className={`py-1.5 px-1 rounded text-[11px] font-bold transition-all border text-center truncate ${
                    config.bgmInstrument === 'dan_nguyet'
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                      : 'bg-stone-800 text-stone-300 hover:text-white border-white/5'
                  }`}
                  title="Đàn Nguyệt"
                >
                  🌙 Đàn Nguyệt
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectInstrument('harp')}
                  className={`py-1.5 px-1 rounded text-[11px] font-bold transition-all border text-center truncate ${
                    config.bgmInstrument === 'harp'
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                      : 'bg-stone-800 text-stone-300 hover:text-white border-white/5'
                  }`}
                  title="Đàn Hạc"
                >
                  🪉 Đàn Hạc
                </button>
              </div>
            </div>

            {/* Nếu chọn Guitar thì chọn 1 trong 3 bài */}
            {config.bgmInstrument === 'guitar' && (
              <div className="flex flex-col gap-1.5 pt-1 border-t border-white/5">
                <span className="text-xs font-semibold text-stone-400">Chọn bài:</span>

                <div className="grid grid-cols-1 gap-1.5">
                  {GUITAR_TRACKS.map((track) => {
                    const isCurrentTrack =
                      config.bgmInstrument === 'guitar' && config.guitarTrack === track.id;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => handleSelectGuitarTrack(track.id)}
                        className={`py-2 px-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                          isCurrentTrack
                            ? 'bg-amber-950/60 border-amber-400 text-amber-200 shadow-md ring-1 ring-amber-500/50'
                            : 'bg-stone-900/80 border-white/5 text-stone-300 hover:bg-stone-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg shrink-0">{track.icon}</span>
                          <span className="text-xs font-bold text-stone-100 truncate">
                            {track.title}
                          </span>
                          {isCurrentTrack && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-stone-950 font-extrabold uppercase shrink-0">
                              {isBgmOn ? 'Đang đàn' : 'Đã chọn'}
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 ml-2">
                          {isCurrentTrack && isBgmOn ? (
                            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                          ) : (
                            <Play className="w-4 h-4 text-stone-400 hover:text-amber-400 fill-current opacity-70 hover:opacity-100" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom MP3 / Audio File Upload */}
            <div className="bg-stone-900/90 p-2.5 rounded-lg border border-dashed border-amber-500/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Disc className="w-3.5 h-3.5" />
                  <span>Nạp file MP3 riêng:</span>
                </span>
                <input
                  type="file"
                  ref={bgmInputRef}
                  onChange={handleUploadBgm}
                  accept="audio/*"
                  className="hidden"
                />
                <button
                  onClick={() => bgmInputRef.current?.click()}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[10px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  <span>Chọn file MP3</span>
                </button>
              </div>

              {config.hasCustomBgm && (
                <div className="flex items-center justify-between bg-stone-950/60 px-2.5 py-1.5 rounded border border-emerald-500/40 text-xs">
                  <span className="text-emerald-300 font-semibold truncate max-w-[240px]">
                    🎵 {config.bgmFileName || 'File MP3 riêng của bạn'}
                  </span>
                  <button
                    onClick={handleClearBgm}
                    className="text-stone-400 hover:text-red-400 text-[10px] font-bold flex items-center gap-0.5"
                    title="Quay lại nhạc có sẵn"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Hủy</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Volume Controls */}
          <div className="bg-[#121214] p-3 rounded-xl border border-white/10 flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between text-xs text-stone-300 font-semibold mb-1">
                <span>Âm lượng hiệu ứng (Cạch, đi quân):</span>
                <span className="font-mono-code text-amber-400">
                  {Math.round(config.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.sfxVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  sound.setSfxVolume(val);
                  setConfig(sound.getConfig());
                }}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-700 rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-stone-300 font-semibold mb-1">
                <span>Âm lượng nhạc nền guitar:</span>
                <span className="font-mono-code text-amber-400">
                  {Math.round(config.bgmVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.bgmVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  sound.setBgmVolume(val);
                  setConfig(sound.getConfig());
                }}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-700 rounded-lg"
              />
            </div>
          </div>

          {/* Section 5: Hiệu ứng rung điện thoại (Haptic Feedback) */}
          <div className="bg-[#121214] p-3.5 rounded-xl border border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs text-stone-200 font-semibold">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Rung Kép: Cả Rung Tay &amp; Rung Loa Trầm</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !vibEnabled;
                  setVibEnabledState(nextVal);
                  setVibrationEnabled(nextVal);
                  if (nextVal) {
                    triggerDeviceVibration('tap');
                  }
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                  vibEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-stone-800 text-stone-400 border border-white/10'
                }`}
              >
                {vibEnabled ? '● Đang Bật Rung Kép' : '○ Đang Tắt'}
              </button>
            </div>

            {/* Diagnostic Banner */}
            <div className="text-[11px] p-2.5 rounded-lg border leading-relaxed bg-stone-900/80 border-white/10">
              <div className="flex items-center gap-1.5 font-semibold mb-1 text-amber-300">
                <span>Chế độ phản hồi:</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-200">
                  🔥 Rung Tay Motor + Rung Loa Sub-bass
                </span>
              </div>
              <p className="text-stone-300 text-[10px]">{vibSupport.message}</p>
            </div>

            <div className="text-[11px] text-stone-300 leading-relaxed space-y-1 bg-stone-900/60 p-2.5 rounded-lg border border-white/5">
              <p className="flex items-center justify-between">
                <span>• <b>Ăn / Bị ăn quân úp:</b></span>
                <span className="text-amber-400 font-medium">1 nhịp (Rung tay + 1 thump loa)</span>
              </p>
              <p className="flex items-center justify-between">
                <span>• <b>Ăn / Bị ăn quân Xe:</b></span>
                <span className="text-amber-400 font-medium">2 nhịp (Rung tay + 2 thump loa)</span>
              </p>
              <p className="flex items-center justify-between">
                <span>• <b>Bắt Tướng / Thắng cờ:</b></span>
                <span className="text-emerald-400 font-medium">3 nhịp (Rung tay + 3 thump dồn)</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mt-0.5">
              <button
                type="button"
                onPointerDown={() => triggerDeviceVibration('covered')}
                onClick={() => {
                  triggerDeviceVibration('covered');
                  setTestStatus('📳 Đã rung 1 nhịp (Ăn quân úp)');
                  setTimeout(() => setTestStatus(null), 1500);
                }}
                className="py-2.5 px-1 bg-stone-900 hover:bg-stone-800 border border-white/10 rounded-lg text-[10px] font-semibold text-stone-200 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-0.5 touch-manipulation cursor-pointer"
              >
                <span>Thử rung 1 cái</span>
                <span className="text-[9px] text-stone-400">(Quân úp)</span>
              </button>
              <button
                type="button"
                onPointerDown={() => triggerDeviceVibration('chariot')}
                onClick={() => {
                  triggerDeviceVibration('chariot');
                  setTestStatus('📳 Đã rung 2 nhịp (Ăn quân Xe)');
                  setTimeout(() => setTestStatus(null), 1500);
                }}
                className="py-2.5 px-1 bg-stone-900 hover:bg-stone-800 border border-amber-500/40 rounded-lg text-[10px] font-semibold text-amber-300 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-0.5 touch-manipulation cursor-pointer"
              >
                <span>Thử rung 2 cái</span>
                <span className="text-[9px] text-amber-400/80">(Quân Xe)</span>
              </button>
              <button
                type="button"
                onPointerDown={() => triggerDeviceVibration('high_score')}
                onClick={() => {
                  triggerDeviceVibration('high_score');
                  setTestStatus('📳 Đã rung 3 nhịp (Điểm cao / Thắng)');
                  setTimeout(() => setTestStatus(null), 1500);
                }}
                className="py-2.5 px-1 bg-stone-900 hover:bg-stone-800 border border-emerald-500/40 rounded-lg text-[10px] font-semibold text-emerald-300 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-0.5 touch-manipulation cursor-pointer"
              >
                <span>Thử rung 3 cái</span>
                <span className="text-[9px] text-emerald-400/80">(Tướng/Thắng)</span>
              </button>
            </div>

            {/* Extra direct hardware test for stubborn phones */}
            <button
              type="button"
              onPointerDown={() => {
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  try { navigator.vibrate(500); } catch (_) {}
                }
                triggerDeviceVibration('high_score');
              }}
              onClick={() => {
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  try { navigator.vibrate(500); } catch (_) {}
                }
                triggerDeviceVibration('high_score');
                setTestStatus('📳 Đang kích hoạt thử nghiệm rung liên tục (500ms)...');
                setTimeout(() => setTestStatus(null), 1800);
              }}
              className="w-full py-2 bg-gradient-to-r from-amber-600/30 to-red-600/30 hover:from-amber-600/40 hover:to-red-600/40 border border-amber-500/40 rounded-lg text-[11px] font-bold text-amber-200 active:scale-98 transition-all flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer"
            >
              <span>⚡ Kích Hoạt Rung Thử Nghiệm Mạnh (500ms)</span>
            </button>

            {/* Practical tips */}
            <div className="text-[10px] text-stone-400 bg-black/40 p-2 rounded-lg border border-white/5 space-y-1">
              <p>💡 <b>Lưu ý trên điện thoại:</b></p>
              <p>• <b>Android:</b> Cần vào <i>Cài đặt máy &gt; Âm thanh &amp; Rung &gt; Rung khi chạm (Haptic feedback)</i> và bật lên. Tắt chế độ Tiết kiệm pin.</p>
              <p>• <b>iPhone:</b> Trình duyệt Safari trên iOS bị Apple khóa rung Web. Hãy cài đặt bản <b>App IPA</b> để sử dụng bộ rung Taptic Engine gốc của Apple. Khi chơi trên Safari web, game sẽ phát xung âm trầm tạo độ dằn cơ học.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-colors"
          >
            Đóng & Tiếp Tục Đánh Cờ
          </button>
        </div>
      </div>
    </div>
  );
};
