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
} from 'lucide-react';
import {
  sound,
  BgmInstrument,
  ClassicalGuitarTrackId,
  GUITAR_TRACKS,
} from '../utils/audio';

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
    if (inst === 'guzheng') {
      sound.playGuzhengPluck(440, 1.6, false, 45, false);
      setTimeout(() => sound.playGuzhengGlissando(), 250);
      setTestStatus('🪕 Đã chọn: Đàn Cổ Tranh 21 Dây (Hoa âm & Uốn nốt)');
    } else if (inst === 'pipa_yueqin') {
      sound.playPipaPluck(440, 1.4, true);
      setTimeout(() => sound.playPipaPluck(523.25, 1.2, false), 220);
      setTestStatus('🎵 Đã chọn: Đàn Tỳ Bà & Đàn Nguyệt (Luân chỉ)');
    } else {
      handleSelectGuitarTrack(config.guitarTrack || 'leyenda');
    }
    setTimeout(() => setTestStatus(null), 3000);
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
          {/* Section 1: Tiếng ăn quân cờ (Cạch một tiếng) */}
          <div className="bg-[#121214] p-3.5 rounded-xl border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <span>⚔️ Tiếng ăn quân cờ:</span>
                <span className="text-amber-400">"Cạch" dứt khoát</span>
              </span>
              <button
                onClick={handleTestCapture}
                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Nghe thử</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-400">
              Âm gỗ hoàng dương gõ đanh thép vào nhau. Bạn cũng có thể tải file âm thanh riêng lên:
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[11px] text-stone-300 truncate max-w-[200px]">
                {config.hasCustomCapture
                  ? `File: ${config.captureFileName || 'Tùy chỉnh'}`
                  : 'Mặc định: Tiếng cạch gỗ chuẩn'}
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

          {/* Section 2: Tiếng bị mất quân (Nhạc buồn Am) */}
          <div className="bg-[#121214] p-3.5 rounded-xl border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <span>🛡️ Tiếng mất quân:</span>
                <span className="text-red-400">Nhạc buồn (Am)</span>
              </span>
              <button
                onClick={handleTestLoss}
                className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 transition-colors border border-white/10"
              >
                <Play className="w-3 h-3 fill-current text-red-400" />
                <span>Nghe thử</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-400">
              Giai điệu guitar 4 nốt trầm buồn buốt giá tone La thứ (Am) khi bị bắt mất quân cờ:
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[11px] text-stone-300 truncate max-w-[200px]">
                {config.hasCustomLoss
                  ? `File: ${config.lossFileName || 'Tùy chỉnh'}`
                  : 'Mặc định: Nhạc buồn Am trầm lắng'}
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

          {/* Section 3: Hòa Tấu Guitar Cổ Điển Máu Lửa (Stereo Đa Âm) */}
          <div className="bg-[#121214] p-3.5 rounded-xl border-2 border-amber-500/40 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-bold text-stone-100">
                  Hòa Tấu Guitar Cổ Điển Máu Lửa (Stereo)
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
                {isBgmOn ? 'Đang phát (BẬT)' : 'Đang tắt'}
              </button>
            </div>

            <p className="text-[11px] text-stone-300 leading-relaxed">
              Âm thanh <strong>Stereo đa âm (Polyphonic)</strong> với kỹ thuật gõ thùng Golpe, nốt trầm uy lực và quạt chả Rasgueado bốc lửa theo đúng phong cách Flamenco & Tây Ban Nha:
            </p>

            {/* 3 Masterpiece Guitar Tracks */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                <span>🔥 Chọn Tuyệt Phẩm Guitar:</span>
                <span className="text-stone-400 font-normal">3 bài bất hủ</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {GUITAR_TRACKS.map((track) => {
                  const isCurrentTrack =
                    config.bgmInstrument === 'guitar' && config.guitarTrack === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => handleSelectGuitarTrack(track.id)}
                      className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                        isCurrentTrack
                          ? 'bg-amber-950/60 border-amber-400 text-amber-200 shadow-md ring-1 ring-amber-500/50'
                          : 'bg-stone-900/80 border-white/5 text-stone-300 hover:bg-stone-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-xl shrink-0 mt-0.5">{track.icon}</span>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate text-stone-100">
                              {track.title}
                            </span>
                            {isCurrentTrack && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-stone-950 font-extrabold uppercase shrink-0">
                                {isBgmOn ? 'Đang đàn' : 'Đã chọn'}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-amber-400/90 font-medium">
                            {track.composer} &bull; {track.genre}
                          </span>
                          <span className="text-[9px] text-stone-400 font-normal mt-0.5 leading-tight">
                            {track.description}
                          </span>
                        </div>
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

            {/* Custom MP3 / Audio File Upload */}
            <div className="bg-stone-900/90 p-2.5 rounded-lg border border-dashed border-amber-500/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Disc className="w-3.5 h-3.5" />
                  <span>Nạp file MP3 riêng của bạn:</span>
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

              {config.hasCustomBgm ? (
                <div className="flex items-center justify-between bg-stone-950/60 px-2.5 py-1.5 rounded border border-emerald-500/40 text-xs">
                  <span className="text-emerald-300 font-semibold truncate max-w-[240px]">
                    🎵 {config.bgmFileName || 'File MP3 riêng của bạn'}
                  </span>
                  <button
                    onClick={handleClearBgm}
                    className="text-stone-400 hover:text-red-400 text-[10px] font-bold flex items-center gap-0.5"
                    title="Quay lại tuyệt phẩm guitar có sẵn"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Hủy</span>
                  </button>
                </div>
              ) : (
                <span className="text-[9px] text-stone-400 italic">
                  * Hỗ trợ file MP3, WAV, Cuba dances, hoặc bài thu âm guitar bạn tự chơi.
                </span>
              )}
            </div>

            {/* Traditional Instruments Option (Đàn Cổ Tranh / Tỳ Bà) */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-[10px] text-stone-400">Hoặc đổi sang nhạc cụ cổ phong:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectInstrument('guzheng')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                    config.bgmInstrument === 'guzheng'
                      ? 'bg-amber-500 text-stone-950 border-amber-400'
                      : 'bg-stone-800 text-stone-400 hover:text-stone-200 border-white/5'
                  }`}
                >
                  🪕 Cổ Tranh
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectInstrument('pipa_yueqin')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                    config.bgmInstrument === 'pipa_yueqin'
                      ? 'bg-amber-500 text-stone-950 border-amber-400'
                      : 'bg-stone-800 text-stone-400 hover:text-stone-200 border-white/5'
                  }`}
                >
                  🎵 Tỳ Bà
                </button>
              </div>
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
