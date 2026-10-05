/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  RotateCcw,
  Sparkles,
  Bot,
  Users,
  Volume2,
  VolumeX,
  HelpCircle,
  Repeat,
  Type,
  Swords,
  Coffee,
  Building2,
  Flag,
  Handshake,
  Save,
  History,
  User,
  PlayCircle,
  Music,
  Zap,
  Palette,
  MessageSquareQuote,
} from 'lucide-react';
import { AiDifficulty, BackgroundScene3D, BoardPerspective, BoardTheme, GameMode, LabelDisplayMode, PieceTheme, RiverTextMode, VenueType } from '../types';
import { VENUE_LIST } from '../utils/venues';
import { SCENE_CONFIGS } from '../utils/backgroundScenes';

interface GameControlsProps {
  gameMode: GameMode;
  difficulty: AiDifficulty;
  aiThinkingTime: number;
  soundEnabled: boolean;
  commentaryEnabled?: boolean;
  displayMode: LabelDisplayMode;
  boardTheme: BoardTheme;
  pieceTheme?: PieceTheme;
  perspective?: BoardPerspective;
  riverMode?: RiverTextMode;
  bgScene?: BackgroundScene3D;
  isLiteMode?: boolean;
  flipped: boolean;
  canUndo: boolean;
  canDrawOrResign: boolean;
  hasSavedDraft: boolean;
  venue?: VenueType;
  isBgmOn?: boolean;
  onSetGameMode: (mode: GameMode) => void;
  onSetDifficulty: (diff: AiDifficulty) => void;
  onSetAiThinkingTime: (timeSec: number) => void;
  onToggleSound: () => void;
  onToggleCommentary?: () => void;
  onCycleDisplayMode: () => void;
  onToggleBoardTheme: () => void;
  onOpenCustomization?: () => void;
  onTogglePerspective?: () => void;
  onCycleRiverMode?: () => void;
  onSelectBgScene?: (scene: BackgroundScene3D) => void;
  onToggleLiteMode?: () => void;
  onFlipBoard: () => void;
  onUndo: () => void;
  onHint: () => void;
  onNewGame: () => void;
  onOpenRules: () => void;
  onOfferDraw: () => void;
  onResign: () => void;
  onSaveDraft: () => void;
  onResumeDraft: () => void;
  canResumeDraft?: boolean;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onSetVenue?: (venue: VenueType) => void;
  onToggleBgm?: () => void;
  onOpenSoundSettings?: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameMode,
  difficulty,
  aiThinkingTime,
  soundEnabled,
  commentaryEnabled = true,
  displayMode,
  boardTheme,
  pieceTheme = 'hoang_kim',
  perspective = '3d',
  riverMode = 'blank',
  bgScene = 'tra_da',
  isLiteMode = false,
  flipped,
  canUndo,
  canDrawOrResign,
  hasSavedDraft,
  venue = 'via_he',
  isBgmOn = false,
  onSetGameMode,
  onSetDifficulty,
  onSetAiThinkingTime,
  onToggleSound,
  onToggleCommentary,
  onCycleDisplayMode,
  onToggleBoardTheme,
  onOpenCustomization,
  onTogglePerspective,
  onCycleRiverMode,
  onSelectBgScene,
  onToggleLiteMode,
  onFlipBoard,
  onUndo,
  onHint,
  onNewGame,
  onOpenRules,
  onOfferDraw,
  onResign,
  onSaveDraft,
  onResumeDraft,
  canResumeDraft = true,
  onOpenHistory,
  onOpenProfile,
  onSetVenue,
  onToggleBgm,
  onOpenSoundSettings,
}) => {
  const getDisplayModeLabel = () => {
    switch (displayMode) {
      case 'both':
        return 'Hán + Việt';
      case 'han':
        return 'Chữ Hán';
      case 'vi':
        return 'Tiếng Việt';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Resume Draft Banner if exists */}
      {hasSavedDraft && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-200 font-semibold">
              Có ván cờ đang lưu dở
            </span>
          </div>
          <button
            onClick={onResumeDraft}
            disabled={!canResumeDraft}
            title={canResumeDraft ? undefined : 'Đợi máy đi xong rồi mới khôi phục ván'}
            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-bold text-xs transition-colors shrink-0"
          >
            Chơi tiếp
          </button>
        </div>
      )}

      {/* 01 // Chế độ chơi & Hồ sơ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono-code text-[10px] uppercase tracking-[0.15em] text-stone-400 block">
            01 // Chế độ chơi
          </span>
          <button
            onClick={onOpenProfile}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            <span>Hồ sơ kỳ thủ</span>
          </button>
        </div>

        <div className="flex bg-[#27272a] p-1 rounded-lg border border-[#3f3f46]">
          <button
            onClick={() => onSetGameMode('ai')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              gameMode === 'ai'
                ? 'bg-[#3f3f46] text-amber-400 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Đấu với Máy</span>
          </button>
          <button
            onClick={() => onSetGameMode('pvp')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              gameMode === 'pvp'
                ? 'bg-[#3f3f46] text-amber-400 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2 Người chơi</span>
          </button>
        </div>
      </div>

      {/* Main Action Buttons Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* New Game Button */}
        <button
          onClick={onNewGame}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all active:scale-95"
        >
          <Swords className="w-4 h-4" />
          <span>Ván mới</span>
        </button>

        {/* Undo Button */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded text-xs font-semibold border transition-all ${
            canUndo
              ? 'bg-[#27272a] hover:bg-[#3f3f46] border-[#3f3f46] text-stone-200'
              : 'bg-[#1e1e22] border-stone-800 text-stone-600 cursor-not-allowed opacity-50'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đi lại</span>
        </button>

        {/* Hint Button */}
        <button
          onClick={onHint}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-amber-300 font-semibold text-xs transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Gợi ý</span>
        </button>

        {/* Flip Board Button */}
        <button
          onClick={onFlipBoard}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-semibold border transition-all ${
            flipped
              ? 'bg-amber-950/60 border-amber-600/70 text-amber-300'
              : 'bg-[#27272a] hover:bg-[#3f3f46] border-[#3f3f46] text-stone-200'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>Đảo cờ</span>
        </button>
      </div>

      {/* Match Management Actions: Xin hòa, Đầu hàng, Lưu ván, Lịch sử */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <button
          onClick={onOfferDraw}
          disabled={!canDrawOrResign}
          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded bg-[#27272a] hover:bg-[#3f3f46] disabled:opacity-40 disabled:cursor-not-allowed border border-[#3f3f46] text-amber-300 text-xs font-semibold transition-colors"
          title="Xin hòa ván đấu"
        >
          <Handshake className="w-3.5 h-3.5 text-amber-400" />
          <span>Xin hòa</span>
        </button>

        <button
          onClick={onResign}
          disabled={!canDrawOrResign}
          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded bg-[#27272a] hover:bg-red-950/40 disabled:opacity-40 disabled:cursor-not-allowed border border-[#3f3f46] hover:border-red-500/40 text-stone-300 hover:text-red-300 text-xs font-semibold transition-colors"
          title="Đầu hàng ván đấu"
        >
          <Flag className="w-3.5 h-3.5 text-red-400" />
          <span>Đầu hàng</span>
        </button>

        <button
          onClick={onSaveDraft}
          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-stone-300 text-xs font-semibold transition-colors"
          title="Lưu lại ván cờ để tí nữa chơi tiếp"
        >
          <Save className="w-3.5 h-3.5 text-emerald-400" />
          <span>Lưu ván</span>
        </button>

        <button
          onClick={onOpenHistory}
          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-amber-300 text-xs font-semibold transition-colors"
          title="Xem lại các ván đấu đã lưu"
        >
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>Lịch sử</span>
        </button>
      </div>

      {/* 02 // Cài đặt kỳ đài */}
      <div>
        <span className="font-mono-code text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-2 block">
          02 // Cài đặt kỳ đài
        </span>

        <div className="flex flex-col gap-2">
          {/* Settings Row 1: Font label & Difficulty & Time */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Display Mode */}
            <button
              onClick={onCycleDisplayMode}
              className="bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-stone-200 py-1.5 px-1 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
              title="Chuyển đổi kiểu chữ (Hán / Việt / Cả hai)"
            >
              <Type className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">{getDisplayModeLabel()}</span>
            </button>

            {/* AI Difficulty Selector */}
            {gameMode === 'ai' ? (
              <div className="relative">
                <select
                  value={difficulty}
                  onChange={(e) => onSetDifficulty(e.target.value as AiDifficulty)}
                  className="w-full bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-amber-300 py-1.5 px-1 rounded text-[11px] font-semibold cursor-pointer outline-none text-center appearance-none"
                >
                  <option value="easy">Cấp: Tập sự</option>
                  <option value="medium">Cấp: Kỳ thủ</option>
                  <option value="hard">Cấp: Cao thủ</option>
                </select>
              </div>
            ) : (
              <div className="bg-[#27272a] border border-[#3f3f46] text-stone-500 py-1.5 px-1 rounded text-[11px] font-medium text-center truncate">
                PvP (2 người)
              </div>
            )}

            {/* AI Thinking Time */}
            {gameMode === 'ai' ? (
              <div className="relative">
                <select
                  value={aiThinkingTime}
                  onChange={(e) => onSetAiThinkingTime(Number(e.target.value))}
                  className="w-full bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-emerald-300 py-1.5 px-1 rounded text-[11px] font-semibold cursor-pointer outline-none text-center appearance-none"
                >
                  <option value={3}>Thời gian: 3s</option>
                  <option value={5}>Thời gian: 5s</option>
                  <option value={10}>Thời gian: 10s</option>
                  <option value={15}>Thời gian: 15s</option>
                </select>
              </div>
            ) : (
              <button
                onClick={onToggleSound}
                className="bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-stone-200 py-1.5 px-1 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3 h-3 text-emerald-400" />
                    <span>Âm thanh</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3 h-3 text-stone-500" />
                    <span>Tắt tiếng</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Settings Row 2: Perspective 3D & River Mode */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* 3D Perspective Toggle */}
            <button
              onClick={onTogglePerspective}
              className={`py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                perspective === '3d'
                  ? 'bg-amber-500/20 border-amber-500/70 text-amber-300 shadow-sm'
                  : 'bg-[#27272a] hover:bg-[#3f3f46] border-[#3f3f46] text-stone-300'
              }`}
              title="Chuyển đổi góc nhìn 3D chiều sâu và góc nhìn 2D thẳng"
            >
              <span>{perspective === '3d' ? '🎥 Góc 3D Chiều Sâu' : '📐 Góc 2D Nhìn Thẳng'}</span>
            </button>

            {/* River Mode Toggle */}
            <button
              onClick={onCycleRiverMode}
              className="bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-amber-300 hover:text-amber-200 py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
              title="Chuyển đổi kiểu hiển thị giữa sông"
            >
              <span className="truncate">
                {riverMode === 'blank'
                  ? '🌊 Sông: Đánh cờ chớ đánh nhau'
                  : riverMode === 'proverb'
                  ? '🌊 Sông: Thơ Cờ'
                  : '🌊 Sông: Trống'}
              </span>
            </button>
          </div>

          {/* Settings Row 3: Customization & Rules */}
          {onOpenCustomization && (
            <button
              onClick={onOpenCustomization}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition-all bg-gradient-to-r from-amber-950/70 via-amber-900/50 to-stone-900 hover:from-amber-900/80 hover:to-amber-800/60 border border-amber-500/70 text-amber-200 shadow-md group"
              title="Chọn 5 bộ cờ hoàn chỉnh: Cờ Giang Hồ, Kỳ Viện Đấu Trường, Cung Đình, Trúc Lâm, Sa Trường"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span>🎨 Chọn Bộ Cờ</span>
              </div>
              <span className="text-[10px] font-semibold text-amber-300/90 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                5 Bộ Cờ
              </span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            {/* Quick Theme Cycle Toggle */}
            <button
              onClick={onToggleBoardTheme}
              className="py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all border bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-200"
              title="Đổi nhanh sang bộ cờ kế tiếp"
            >
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate">Đổi nhanh Bộ Cờ</span>
            </button>

            {/* Rules Guide */}
            <button
              onClick={onOpenRules}
              className="bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-amber-300 hover:text-amber-200 py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Luật chơi Cờ Úp</span>
            </button>
          </div>

          {/* Settings Row: Lite Mode / Performance mode for low-end devices (Poco M4 Pro) */}
          {onToggleLiteMode && (
            <button
              onClick={onToggleLiteMode}
              className={`w-full py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-between gap-1.5 transition-all border ${
                isLiteMode
                  ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-300 shadow-sm'
                  : 'bg-[#27272a] hover:bg-[#3f3f46] border-[#3f3f46] text-stone-300'
              }`}
              title="Máy yếu"
            >
              <div className="flex items-center gap-1.5">
                <Zap className={`w-3.5 h-3.5 ${isLiteMode ? 'text-emerald-400 animate-pulse' : 'text-stone-400'}`} />
                <span>Máy yếu</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono-code ${
                isLiteMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-stone-800 text-stone-400'
              }`}>
                {isLiteMode ? 'BẬT' : 'TẮT'}
              </span>
            </button>
          )}

          {/* Settings Row 4: Pipa / Guitar Music and Sound Effects */}
          <div className="grid grid-cols-2 gap-1.5">
            {onToggleBgm && (
              <button
                onClick={onToggleBgm}
                className={`py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                  isBgmOn
                    ? 'bg-amber-500/20 border-amber-500/70 text-amber-300 shadow-sm'
                    : 'bg-[#27272a] hover:bg-[#3f3f46] border-[#3f3f46] text-stone-400'
                }`}
                title="Bật/Tắt nhạc nền Am / Guitar nhẹ nhàng"
              >
                <Music className={`w-3.5 h-3.5 ${isBgmOn ? 'text-amber-400 animate-bounce' : 'text-stone-500'}`} />
                <span className="truncate">{isBgmOn ? '🎵 Nhạc Am: BẬT' : '🎵 Nhạc Am: TẮT'}</span>
              </button>
            )}

            <button
              onClick={onToggleSound}
              className="bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-stone-200 py-1.5 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              title="Bật/Tắt hiệu ứng cạch ăn quân và nhạc buồn"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate">🔊 Hiệu ứng: Cạch</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-stone-500" />
                  <span className="truncate">🔇 Hiệu ứng: Tắt</span>
                </>
              )}
            </button>
          </div>

          {/* Sound & Guitar Audio Customization Modal Trigger */}
          {onOpenSoundSettings && (
            <button
              onClick={onOpenSoundSettings}
              className="w-full py-1.5 px-2 rounded bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 hover:border-amber-500/70 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              title="Chỉnh âm thanh, nghe thử tiếng cạch / nhạc buồn, và tải file guitar của bạn lên"
            >
              <Music className="w-3.5 h-3.5 text-amber-400" />
              <span>🎸 Cài đặt âm thanh & Tải file Guitar</span>
            </button>
          )}

          {/* Settings Row 5: Không gian Quán Cờ & Bình luận tích hợp đồng bộ */}
          {onSetVenue && (
            <div className="mt-1 pt-2.5 border-t border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <span>🏮 Không gian Quán Cờ & Bình luận:</span>
                </span>
                {onToggleCommentary && (
                  <button
                    type="button"
                    onClick={onToggleCommentary}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono-code flex items-center gap-1 transition-all border ${
                      commentaryEnabled
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                        : 'bg-stone-800 text-stone-500 border-white/5'
                    }`}
                    title="Bật/Tắt bình luận theo không gian đang chọn"
                  >
                    <span>💬 Lời bình:</span>
                    <span>{commentaryEnabled ? 'BẬT' : 'TẮT'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {SCENE_CONFIGS.map((scene) => {
                  const isSelected = bgScene === scene.id;
                  const persona =
                    scene.id === 'tra_da'
                      ? 'Bác Ba Trà Đá & Chú Tư'
                      : scene.id === 'ca_phe'
                      ? 'Anh Hoàng Cà Phê & Kỳ Thủ Bàn Bên'
                      : scene.id === 'hoa_vien'
                      ? 'Trà Sư Mặc Khách & Cụ Lương'
                      : scene.id === 'dau_truong'
                      ? 'Đại Sư & Kiện Tướng Quốc Gia'
                      : 'Thiền Sư Kỳ Đạo & Cư Sĩ';

                  const commentStyle =
                    scene.id === 'tra_da'
                      ? 'Chém gió tếu táo, dân dã'
                      : scene.id === 'ca_phe'
                      ? 'Sành sỏi, sắc bén, cà phê'
                      : scene.id === 'hoa_vien'
                      ? 'Thi vị, đàm đạo, tao nhã'
                      : scene.id === 'dau_truong'
                      ? 'Học thuật, chuẩn kỳ viện'
                      : 'Thâm trầm, tĩnh tâm đốn ngộ';

                  return (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => onSelectBgScene?.(scene.id)}
                      className={`p-2 rounded-lg text-left transition-all border flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-amber-950/70 border-amber-500/80 text-amber-100 shadow-md ring-1 ring-amber-500/40'
                          : 'bg-[#27272a]/90 hover:bg-[#323238] border-white/5 text-stone-300'
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{scene.icon}</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-amber-200' : 'text-stone-200'}`}>
                            {scene.name}
                          </span>
                          {isSelected && <span className="text-[9px] text-amber-400 font-bold shrink-0">✓ Đang chọn</span>}
                        </div>
                        <span className="text-[10px] text-amber-300/90 font-medium truncate mt-0.5">
                          🗣️ {persona}
                        </span>
                        <span className="text-[9px] text-stone-400 truncate font-normal">
                          {commentStyle} &bull; {scene.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
