/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BoardTheme, PieceTheme, Piece, ChessThemeSetId } from '../types';
import {
  BOARD_THEME_LIST,
  PIECE_THEME_LIST,
  CHESS_THEME_SETS,
  ChessThemeSet,
  getBoardThemeConfig,
  findMatchingThemeSet,
} from '../utils/themeStyles';
import { ChessPiece } from './ChessPiece';
import { Palette, X, Check, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { sound } from '../utils/audio';

interface CustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  onSelectBoardTheme: (theme: BoardTheme) => void;
  onSelectPieceTheme: (theme: PieceTheme) => void;
  onSelectThemeSet?: (setId: ChessThemeSetId) => void;
}

const SAMPLE_RED_KING: Piece = {
  id: 'preview-red-king',
  color: 'red',
  trueRole: 'king',
  isCovered: false,
};

const SAMPLE_RED_CHARIOT: Piece = {
  id: 'preview-red-chariot',
  color: 'red',
  trueRole: 'chariot',
  isCovered: false,
};

const SAMPLE_COVERED_PIECE: Piece = {
  id: 'preview-covered',
  color: 'red',
  trueRole: 'cannon',
  isCovered: true,
};

const SAMPLE_BLACK_CANNON: Piece = {
  id: 'preview-black-cannon',
  color: 'black',
  trueRole: 'cannon',
  isCovered: false,
};

const SAMPLE_BLACK_KING: Piece = {
  id: 'preview-black-king',
  color: 'black',
  trueRole: 'king',
  isCovered: false,
};

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  isOpen,
  onClose,
  boardTheme,
  pieceTheme,
  onSelectBoardTheme,
  onSelectPieceTheme,
  onSelectThemeSet,
}) => {
  const [activeTab, setActiveTab] = useState<'sets' | 'custom'>('sets');
  const [customSubTab, setCustomSubTab] = useState<'board' | 'piece'>('board');

  if (!isOpen) return null;

  const currentMatchingSet = findMatchingThemeSet(boardTheme, pieceTheme);

  const handleSelectSet = (set: ChessThemeSet) => {
    sound.playMove();
    if (onSelectThemeSet) {
      onSelectThemeSet(set.id);
    } else {
      onSelectBoardTheme(set.boardTheme);
      onSelectPieceTheme(set.pieceTheme);
    }
  };

  const handleBoardPick = (theme: BoardTheme) => {
    sound.playMove();
    onSelectBoardTheme(theme);
  };

  const handlePiecePick = (theme: PieceTheme) => {
    sound.playMove();
    onSelectPieceTheme(theme);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#18181c] border border-amber-500/40 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#121215]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-amber-200">
                Chọn Bộ Cờ
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Primary Sets vs Advanced Custom */}
        <div className="flex border-b border-white/10 bg-[#141417] px-3 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('sets')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-t border-x ${
              activeTab === 'sets'
                ? 'bg-[#18181c] text-amber-300 border-amber-500/50 -mb-[1px] shadow-sm'
                : 'text-stone-400 hover:text-stone-200 border-transparent'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Bộ Cờ</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-t border-x ${
              activeTab === 'custom'
                ? 'bg-[#18181c] text-amber-300 border-amber-500/50 -mb-[1px] shadow-sm'
                : 'text-stone-400 hover:text-stone-200 border-transparent'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Tùy biến lẻ</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-4 overflow-y-auto max-h-[62vh] flex flex-col gap-2.5">
          {activeTab === 'sets' ? (
            /* 5 REQUESTED CHESS SETS */
            <div className="flex flex-col gap-2.5">
              {CHESS_THEME_SETS.map((set) => {
                const isSelected =
                  currentMatchingSet?.id === set.id ||
                  (set.id === 'giang_ho' && (boardTheme === 'giang_ho' || pieceTheme === 'giang_ho'));
                const boardCfg = getBoardThemeConfig(set.boardTheme);

                return (
                  <button
                    key={set.id}
                    onClick={() => handleSelectSet(set)}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col gap-2 overflow-hidden group ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/40 bg-gradient-to-r from-amber-500/15 via-[#232329] to-[#1c1c20] shadow-lg'
                        : 'border-white/10 hover:border-amber-500/40 bg-[#202025] hover:bg-[#25252b]'
                    }`}
                  >
                    {/* Header Row: Icon, Name, and Radio Check */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl sm:text-2xl">{set.icon}</span>
                        <h3 className="text-sm sm:text-base font-bold text-stone-100 group-hover:text-amber-200 transition-colors">
                          {set.name}
                        </h3>
                      </div>

                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center text-xs font-black shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/20 group-hover:border-amber-400/60 transition-colors" />
                      )}
                    </div>

                    {/* Integrated Board & Piece Visual Swatch */}
                    <div
                      className="w-full py-2 px-3 rounded-lg border relative flex items-center justify-between gap-2 overflow-hidden shadow-inner"
                      style={{
                        background: boardCfg.boardBg,
                        borderColor: boardCfg.outerBorderColor,
                      }}
                    >
                      {/* Grid line indicator lines */}
                      <div
                        className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-[1px] opacity-60"
                        style={{ backgroundColor: boardCfg.lineStroke }}
                      />

                      {/* Actual Rendered Chess Pieces on the Board */}
                      <div className="flex items-center gap-2 sm:gap-3 z-10">
                        <div className="w-9 h-9 sm:w-10 sm:h-10">
                          <ChessPiece piece={SAMPLE_RED_KING} theme={set.pieceTheme} displayMode="both" is3D />
                        </div>
                        <div className="w-9 h-9 sm:w-10 sm:h-10">
                          <ChessPiece piece={SAMPLE_RED_CHARIOT} theme={set.pieceTheme} displayMode="both" is3D />
                        </div>
                        <div className="w-9 h-9 sm:w-10 sm:h-10">
                          <ChessPiece piece={SAMPLE_COVERED_PIECE} theme={set.pieceTheme} displayMode="both" is3D />
                        </div>
                        <div className="w-9 h-9 sm:w-10 sm:h-10">
                          <ChessPiece piece={SAMPLE_BLACK_CANNON} theme={set.pieceTheme} displayMode="both" is3D />
                        </div>
                        <div className="w-9 h-9 sm:w-10 sm:h-10">
                          <ChessPiece piece={SAMPLE_BLACK_KING} theme={set.pieceTheme} displayMode="both" is3D />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* TAB 2: INDIVIDUAL CUSTOMIZATION */
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2 p-1 bg-stone-900 rounded-lg border border-white/10 self-start">
                <button
                  onClick={() => setCustomSubTab('board')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    customSubTab === 'board'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Bàn Cờ
                </button>
                <button
                  onClick={() => setCustomSubTab('piece')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    customSubTab === 'piece'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Quân Cờ
                </button>
              </div>

              {customSubTab === 'board' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BOARD_THEME_LIST.map((theme) => {
                    const isSelected =
                      boardTheme === theme.id ||
                      (theme.id === 'hoang_duong' && boardTheme === 'quan_coc') ||
                      (theme.id === 'mun_hoa' && boardTheme === 'ky_vien') ||
                      (theme.id === 'go_do' && boardTheme === 'go_moc');
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handleBoardPick(theme.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-1.5 overflow-hidden ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-500/10 shadow-lg'
                            : 'border-white/10 hover:border-amber-500/50 bg-[#202025]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{theme.icon}</span>
                            <h4 className="text-xs sm:text-sm font-bold text-stone-100">
                              {theme.name}
                            </h4>
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center text-xs font-black">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div
                          className="w-full h-8 rounded-lg border relative flex items-center justify-center overflow-hidden my-0.5"
                          style={{ background: theme.boardBg, borderColor: theme.outerBorderColor }}
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PIECE_THEME_LIST.map((theme) => {
                    const isSelected = pieceTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handlePiecePick(theme.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-1.5 overflow-hidden ${
                          isSelected
                            ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-emerald-500/10 shadow-lg'
                            : 'border-white/10 hover:border-emerald-500/50 bg-[#202025]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{theme.icon}</span>
                            <h4 className="text-xs sm:text-sm font-bold text-stone-100">
                              {theme.name}
                            </h4>
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-emerald-400 text-stone-950 flex items-center justify-center text-xs font-black">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="w-full py-1.5 px-2 rounded-lg border border-white/10 bg-black/40 flex items-center justify-around gap-1 my-0.5">
                          <div className="w-8 h-8 sm:w-9 sm:h-9">
                            <ChessPiece piece={SAMPLE_RED_KING} theme={theme.id} displayMode="both" is3D />
                          </div>
                          <div className="w-8 h-8 sm:w-9 sm:h-9">
                            <ChessPiece piece={SAMPLE_COVERED_PIECE} theme={theme.id} displayMode="both" is3D />
                          </div>
                          <div className="w-8 h-8 sm:w-9 sm:h-9">
                            <ChessPiece piece={SAMPLE_BLACK_KING} theme={theme.id} displayMode="both" is3D />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#121215] border-t border-white/10 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm transition-all shadow-md"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
