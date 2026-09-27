/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bot, Cpu, Layers, Timer } from 'lucide-react';
import { AiThinkingStats } from '../types';

interface AiThinkingPanelProps {
  isThinking: boolean;
  stats: AiThinkingStats | null;
  maxTime: number;
}

export const AiThinkingPanel: React.FC<AiThinkingPanelProps> = ({
  isThinking,
  stats,
  maxTime,
}) => {
  if (!isThinking && !stats) return null;

  const currentDepth = stats?.depth || 1;
  const nodes = stats?.nodes || 0;
  const timeSpent = stats?.timeSpent || 0;
  const progressPercent = Math.min(100, Math.round((timeSpent / maxTime) * 100));

  // Score description
  const score = stats?.score || 0;
  const scoreText =
    score > 15000
      ? 'Sát cục!'
      : score < -15000
      ? 'Thất thế'
      : score > 200
      ? `Máy ưu +${(score / 100).toFixed(1)}`
      : score < -200
      ? `Bạn ưu +${Math.abs(score / 100).toFixed(1)}`
      : 'Cân bằng';

  return (
    <div
      id="ai-thinking-panel"
      className="w-full bg-stone-900/95 border border-amber-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-stone-200 transition-all animate-in fade-in duration-200"
    >
      {/* Header with pulsating AI brain icon */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-amber-600/90 items-center justify-center text-stone-950">
              <Bot className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <span className="text-xs font-bold text-amber-300">
              {isThinking ? 'Máy đang suy tính nước cờ...' : 'Nước đi gần nhất của Máy'}
            </span>
            <span className="block text-[10px] text-stone-400">
              Giới hạn tối đa {maxTime} giây / nước
            </span>
          </div>
        </div>

        {/* Evaluation tag */}
        <div className="px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-[11px] font-semibold text-amber-200">
          {scoreText}
        </div>
      </div>

      {/* Real-time Progress Bar */}
      <div className="w-full bg-stone-800 rounded-full h-1.5 mb-2.5 overflow-hidden border border-stone-700/50">
        <div
          className="bg-gradient-to-r from-amber-600 via-amber-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(5, progressPercent)}%` }}
        />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {/* Depth */}
        <div className="flex flex-col items-center bg-stone-950/70 p-1.5 rounded-lg border border-stone-800">
          <div className="flex items-center gap-1 text-[10px] text-stone-400 font-medium">
            <Layers className="w-3 h-3 text-amber-400" />
            <span>Độ sâu</span>
          </div>
          <span className="text-xs font-bold text-stone-100 mt-0.5">
            Tầng {currentDepth}
          </span>
        </div>

        {/* Nodes analyzed */}
        <div className="flex flex-col items-center bg-stone-950/70 p-1.5 rounded-lg border border-stone-800">
          <div className="flex items-center gap-1 text-[10px] text-stone-400 font-medium">
            <Cpu className="w-3 h-3 text-blue-400" />
            <span>Thế cờ duyệt</span>
          </div>
          <span className="text-xs font-bold text-stone-100 mt-0.5">
            {nodes > 0 ? nodes.toLocaleString() : 'Đang tính...'}
          </span>
        </div>

        {/* Time elapsed */}
        <div className="flex flex-col items-center bg-stone-950/70 p-1.5 rounded-lg border border-stone-800">
          <div className="flex items-center gap-1 text-[10px] text-stone-400 font-medium">
            <Timer className="w-3 h-3 text-emerald-400" />
            <span>Thời gian</span>
          </div>
          <span className="text-xs font-bold text-stone-100 mt-0.5">
            {timeSpent.toFixed(1)}s / {maxTime}s
          </span>
        </div>
      </div>
    </div>
  );
};
