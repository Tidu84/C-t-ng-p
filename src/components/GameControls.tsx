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
  Timer,
} from 'lucide-react';
import { AiDifficulty, GameMode, LabelDisplayMode } from '../types';

interface GameControlsProps {
  gameMode: GameMode;
  difficulty: AiDifficulty;
  aiThinkingTime: number;
  soundEnabled: boolean;
  displayMode: LabelDisplayMode;
  flipped: boolean;
  canUndo: boolean;
  onSetGameMode: (mode: GameMode) => void;
  onSetDifficulty: (diff: AiDifficulty) => void;
  onSetAiThinkingTime: (timeSec: number) => void;
  onToggleSound: () => void;
  onCycleDisplayMode: () => void;
  onFlipBoard: () => void;
  onUndo: () => void;
  onHint: () => void;
  onNewGame: () => void;
  onOpenRules: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameMode,
  difficulty,
  aiThinkingTime,
  soundEnabled,
  displayMode,
  flipped,
  canUndo,
  onSetGameMode,
  onSetDifficulty,
  onSetAiThinkingTime,
  onToggleSound,
  onCycleDisplayMode,
  onFlipBoard,
  onUndo,
  onHint,
  onNewGame,
  onOpenRules,
}) => {
  const getDisplayModeLabel = () => {
    switch (displayMode) {
      case 'both':
        return 'Chữ: Hán + Việt';
      case 'han':
        return 'Chữ: Hán tự';
      case 'vi':
        return 'Chữ: Việt hóa';
    }
  };

  return (
    <div className="flex flex-col gap-3.5 bg-stone-800/80 backdrop-blur-sm border border-stone-700/60 rounded-2xl p-4 shadow-xl">
      {/* Top Bar: Mode Select & Difficulty */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-stone-700/50">
        {/* Game Mode Selection */}
        <div className="flex rounded-xl bg-stone-900/90 p-1 border border-stone-800">
          <button
            onClick={() => onSetGameMode('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              gameMode === 'ai'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Đấu với Máy
          </button>
          <button
            onClick={() => onSetGameMode('pvp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              gameMode === 'pvp'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            2 Người chơi
          </button>
        </div>

        {/* AI Difficulty & Thinking Time (if vs AI) */}
        {gameMode === 'ai' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-stone-900/90 px-2 py-1 rounded-xl border border-stone-800 text-xs">
              <span className="text-stone-400 text-[11px] font-medium mr-1">Cấp độ:</span>
              {(['easy', 'medium', 'hard'] as AiDifficulty[]).map((level) => {
                const labels = {
                  easy: 'Tập sự',
                  medium: 'Kỳ thủ',
                  hard: 'Cao thủ',
                };
                return (
                  <button
                    key={level}
                    onClick={() => onSetDifficulty(level)}
                    className={`px-2 py-1 rounded-md transition-all text-[11px] font-medium ${
                      difficulty === level
                        ? 'bg-amber-700/80 text-amber-100 font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {labels[level]}
                  </button>
                );
              })}
            </div>

            {/* AI Time Limit Selector (3s, 5s, 10s, 15s) */}
            <div className="flex items-center gap-1 bg-stone-900/90 px-2 py-1 rounded-xl border border-stone-800 text-xs">
              <Timer className="w-3 h-3 text-amber-400 mr-0.5" />
              <span className="text-stone-400 text-[11px] font-medium mr-1">Giới hạn:</span>
              {[3, 5, 10, 15].map((sec) => (
                <button
                  key={sec}
                  onClick={() => onSetAiThinkingTime(sec)}
                  title={`Máy suy nghĩ tối đa ${sec} giây`}
                  className={`px-1.5 py-0.5 rounded transition-all text-[11px] font-medium ${
                    aiThinkingTime === sec
                      ? 'bg-emerald-700/80 text-emerald-100 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* New Game */}
        <button
          onClick={onNewGame}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-md transition-all active:scale-95"
        >
          <Swords className="w-4 h-4" />
          Ván mới
        </button>

        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
            canUndo
              ? 'bg-stone-700/70 hover:bg-stone-600/80 border-stone-600 text-stone-100 shadow'
              : 'bg-stone-800/40 border-stone-800 text-stone-600 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Đi lại
        </button>

        {/* Hint */}
        <button
          onClick={onHint}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-700/70 hover:bg-stone-600/80 border border-stone-600 text-amber-300 font-semibold text-xs shadow transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Gợi ý
        </button>

        {/* Flip Board */}
        <button
          onClick={onFlipBoard}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
            flipped
              ? 'bg-amber-950/60 border-amber-600/60 text-amber-200'
              : 'bg-stone-700/70 hover:bg-stone-600/80 border-stone-600 text-stone-200'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          Đảo cờ
        </button>
      </div>

      {/* Utility Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-700/50 text-xs">
        {/* Toggle Display Mode (Han / Vi / Both) */}
        <button
          onClick={onCycleDisplayMode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900/70 hover:bg-stone-700/60 text-stone-300 hover:text-stone-100 border border-stone-800 transition-colors"
        >
          <Type className="w-3.5 h-3.5 text-amber-400" />
          <span>{getDisplayModeLabel()}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            onClick={onToggleSound}
            className="p-1.5 rounded-lg bg-stone-900/70 hover:bg-stone-700/60 text-stone-300 hover:text-stone-100 border border-stone-800 transition-colors"
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-500" />
            )}
          </button>

          {/* Rules Guide modal */}
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900/70 hover:bg-stone-700/60 text-amber-300 hover:text-amber-200 border border-stone-800 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Luật Cờ Úp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
