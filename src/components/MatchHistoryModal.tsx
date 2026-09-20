/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  History,
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trash2,
  Trophy,
  Swords,
  Calendar,
  Layers,
  Award,
} from 'lucide-react';
import { Move, Piece, SavedMatch } from '../types';
import { ChessBoard } from './ChessBoard';

interface MatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedMatches: SavedMatch[];
  onDeleteMatch: (id: string) => void;
  activeReplayMatch?: SavedMatch | null;
}

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({
  isOpen,
  onClose,
  savedMatches,
  onDeleteMatch,
  activeReplayMatch,
}) => {
  const [selectedMatch, setSelectedMatch] = useState<SavedMatch | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // When activeReplayMatch is passed, open replay directly
  useEffect(() => {
    if (isOpen && activeReplayMatch) {
      setSelectedMatch(activeReplayMatch);
      setCurrentStep(0);
      setIsPlaying(false);
    }
  }, [isOpen, activeReplayMatch]);

  // When selectedMatch changes, reset step
  useEffect(() => {
    if (selectedMatch && !activeReplayMatch) {
      setCurrentStep(selectedMatch.moves.length); // start at final checkmate position
      setIsPlaying(false);
    }
  }, [selectedMatch, activeReplayMatch]);

  // Compute reconstructed board at currentStep
  const replayBoard = React.useMemo(() => {
    if (!selectedMatch) return [];
    // Deep clone initial board
    const b: (Piece | null)[][] = selectedMatch.initialBoard.map((row) =>
      row.map((piece) => (piece ? { ...piece } : null))
    );

    // Apply moves up to currentStep
    for (let i = 0; i < currentStep; i++) {
      const m = selectedMatch.moves[i];
      if (!m) break;
      const moving = b[m.from.y][m.from.x];
      if (moving) {
        b[m.from.y][m.from.x] = null;
        b[m.to.y][m.to.x] = {
          ...moving,
          isCovered: false,
        };
      }
    }
    return b;
  }, [selectedMatch, currentStep]);

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && selectedMatch) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= selectedMatch.moves.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1400);
    }
    return () => clearInterval(timer);
  }, [isPlaying, selectedMatch]);

  if (!isOpen) return null;

  const handleStepForward = () => {
    if (!selectedMatch) return;
    if (currentStep < selectedMatch.moves.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleStepBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const currentMove =
    selectedMatch && currentStep > 0 ? selectedMatch.moves[currentStep - 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181c] border border-amber-500/50 rounded-2xl max-w-4xl w-full max-h-[92vh] shadow-2xl relative overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-white/10 bg-[#121214]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-stone-100">
                {selectedMatch ? 'Xem Lại Ván Đấu' : 'Lịch Sử Các Ván Đấu Đã Lưu'}
              </h3>
              <p className="text-[11px] text-stone-400">
                {selectedMatch
                  ? `Đang diễn lại: ${selectedMatch.playerName} • ${selectedMatch.dateStr}`
                  : `Tổng cộng ${savedMatches.length} ván đấu đã lưu trữ`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedMatch && (
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-white/10 transition-colors"
              >
                &larr; Danh sách ván
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!selectedMatch ? (
            // List of Saved Matches
            savedMatches.length === 0 ? (
              <div className="py-16 text-center text-stone-400 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-stone-900 border border-white/10 flex items-center justify-center text-3xl">
                  📜
                </div>
                <p className="text-sm font-semibold text-stone-300">
                  Chưa có ván đấu nào được lưu lại
                </p>
                <p className="text-xs text-stone-500 max-w-sm">
                  Sau khi thắng một ván cờ hay, bạn hãy bấm nút &quot;Lưu ván này&quot; hoặc &quot;Lưu ván đang chơi&quot; để lưu trữ lại và thưởng thức bất cứ lúc nào!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {savedMatches.map((m) => {
                  const isRedWin = m.winner === 'red';
                  const isDraw = m.winner === 'draw';
                  return (
                    <div
                      key={m.id}
                      className="bg-[#121214] border border-white/10 hover:border-amber-500/40 rounded-xl p-4 flex flex-col justify-between transition-all group shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-stone-800 border border-amber-500/30 flex items-center justify-center text-xl overflow-hidden shrink-0">
                            {m.playerAvatar.startsWith('data:') ? (
                              <img
                                src={m.playerAvatar}
                                alt="avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{m.playerAvatar}</span>
                            )}
                          </div>

                          <div>
                            <span className="font-bold text-sm text-stone-200 block truncate max-w-[140px]">
                              {m.playerName}
                            </span>
                            <span className="text-[10px] text-stone-400 flex items-center gap-1 font-mono-code">
                              <Calendar className="w-3 h-3 text-stone-500" />
                              {m.dateStr}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider block ${
                              isDraw
                                ? 'bg-stone-800 text-stone-300'
                                : isRedWin
                                ? 'bg-red-950/80 text-red-300 border border-red-800/50'
                                : 'bg-stone-800 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isDraw ? 'Hòa Cờ' : isRedWin ? 'Đỏ Thắng' : 'Đen Thắng'}
                          </span>
                          <span className="text-[10px] font-mono-code text-stone-400 mt-0.5 block">
                            {m.totalMoves} nước
                          </span>
                        </div>
                      </div>

                      {m.patternName && (
                        <div className="bg-amber-950/20 border-l-2 border-amber-500 px-2.5 py-1 rounded-r mb-3 text-left">
                          <span className="text-xs font-thu-phap text-amber-300 font-bold block">
                            {m.patternName}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-[11px] text-stone-400 font-mono-code">
                          {m.gameMode === 'ai'
                            ? `Đấu Máy (${m.difficulty?.toUpperCase() || 'HARD'})`
                            : '2 Người Chơi'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedMatch(m)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-stone-950 border border-amber-500/40 text-xs font-bold transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            <span>Xem Lại</span>
                          </button>

                          <button
                            onClick={() => onDeleteMatch(m.id)}
                            className="p-1.5 rounded hover:bg-red-950/50 text-stone-500 hover:text-red-400 transition-colors"
                            title="Xóa ván này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // Replay Board View
            <div className="flex flex-col lg:flex-row items-center justify-center gap-5">
              <div className="w-full max-w-[460px] flex flex-col items-center">
                <ChessBoard
                  board={replayBoard}
                  turn={currentStep % 2 === 0 ? 'red' : 'black'}
                  selectedPos={null}
                  legalMoves={[]}
                  lastMove={currentMove}
                  isCheck={Boolean(currentMove?.isCheck)}
                  flipped={false}
                  displayMode="both"
                  theme="quan_coc"
                  onSelectSquare={() => {}}
                  disabled={true}
                />
              </div>

              {/* Replay Controls & Move details */}
              <div className="w-full lg:w-72 flex flex-col gap-3 bg-[#121214] p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-mono-code uppercase text-amber-400 font-bold">
                    Tiến độ nước đi
                  </span>
                  <span className="text-xs font-mono-code text-stone-300 font-bold">
                    {currentStep} / {selectedMatch.moves.length}
                  </span>
                </div>

                {currentMove ? (
                  <div className="bg-stone-900 p-2.5 rounded-lg border border-white/10 text-left">
                    <span className="text-[10px] font-mono-code text-stone-500 block">
                      Nước thứ {currentStep}:
                    </span>
                    <span className="text-sm font-bold text-amber-300 font-mono-code block">
                      {currentMove.notation}
                    </span>
                    {currentMove.revealedRole && (
                      <span className="text-[11px] text-emerald-400 block mt-0.5">
                        ✨ Lật mở quân úp thành công!
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="bg-stone-900 p-2.5 rounded-lg border border-white/10 text-xs text-stone-500">
                    Vị trí ban đầu lúc chưa đi nước nào
                  </div>
                )}

                {/* Step Slider */}
                <input
                  type="range"
                  min={0}
                  max={selectedMatch.moves.length}
                  value={currentStep}
                  onChange={(e) => setCurrentStep(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer my-1"
                />

                {/* Control Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setCurrentStep(0)}
                    disabled={currentStep === 0}
                    className="p-2 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 flex items-center justify-center text-xs font-bold"
                    title="Về đầu ván"
                  >
                    |&lt;
                  </button>

                  <button
                    onClick={handleStepBack}
                    disabled={currentStep === 0}
                    className="p-2 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 flex items-center justify-center"
                    title="Nước trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center font-bold"
                    title={isPlaying ? 'Tạm dừng' : 'Tự động phát'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleStepForward}
                    disabled={currentStep >= selectedMatch.moves.length}
                    className="p-2 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 flex items-center justify-center"
                    title="Nước kế tiếp"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Match Final Summary Banner */}
                {selectedMatch.patternName && (
                  <div className="bg-amber-950/40 border border-amber-500/40 p-2.5 rounded-lg text-left mt-2">
                    <span className="text-[10px] font-mono-code uppercase text-amber-400/90 font-bold block">
                      Đòn kết liễu
                    </span>
                    <span className="text-sm font-thu-phap text-amber-300 font-bold block">
                      {selectedMatch.patternName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
