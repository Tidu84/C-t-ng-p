/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LabelDisplayMode, Move, Piece, PlayerColor, Position } from '../types';
import { BOARD_COLS, BOARD_ROWS } from '../utils/chessRules';
import { ChessPiece } from './ChessPiece';

interface ChessBoardProps {
  board: (Piece | null)[][];
  turn: PlayerColor;
  selectedPos: Position | null;
  legalMoves: Position[];
  lastMove: Move | null;
  isCheck: boolean;
  flipped?: boolean;
  displayMode?: LabelDisplayMode;
  onSelectSquare: (pos: Position) => void;
  disabled?: boolean;
  revealNotice?: { text: string; isHighValue: boolean } | null;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  turn,
  selectedPos,
  legalMoves,
  lastMove,
  isCheck,
  flipped = false,
  displayMode = 'both',
  onSelectSquare,
  disabled = false,
  revealNotice,
}) => {
  // Compute display coordinates depending on flipped state
  const getRenderPos = (x: number, y: number): Position => {
    return flipped
      ? { x: BOARD_COLS - 1 - x, y: BOARD_ROWS - 1 - y }
      : { x, y };
  };

  const isSelected = (x: number, y: number) => {
    return selectedPos !== null && selectedPos.x === x && selectedPos.y === y;
  };

  const isLegalTarget = (x: number, y: number) => {
    return legalMoves.some((m) => m.x === x && m.y === y);
  };

  const isFromSquare = (x: number, y: number) => {
    if (!lastMove) return false;
    return lastMove.from.x === x && lastMove.from.y === y;
  };

  const isToSquare = (x: number, y: number) => {
    if (!lastMove) return false;
    return lastMove.to.x === x && lastMove.to.y === y;
  };

  const isLastMoveSquare = (x: number, y: number) => {
    return isFromSquare(x, y) || isToSquare(x, y);
  };

  // Subtle trajectory trail dots between from and to
  const moveTrail = React.useMemo(() => {
    if (!lastMove) return null;
    const fromR = getRenderPos(lastMove.from.x, lastMove.from.y);
    const toR = getRenderPos(lastMove.to.x, lastMove.to.y);

    const fromSvgX = 40 + fromR.x * 90;
    const fromSvgY = 40 + fromR.y * 91.11;
    const toSvgX = 40 + toR.x * 90;
    const toSvgY = 40 + toR.y * 91.11;

    const dx = toR.x - fromR.x;
    const dy = toR.y - fromR.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    const dots: { x: number; y: number }[] = [];
    const count = Math.max(1, Math.min(5, steps > 1 ? steps - 1 : 1));
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      dots.push({
        x: fromSvgX + (toSvgX - fromSvgX) * t,
        y: fromSvgY + (toSvgY - fromSvgY) * t,
      });
    }

    return {
      fromSvgX,
      fromSvgY,
      toSvgX,
      toSvgY,
      dots,
    };
  }, [lastMove, flipped]);

  // Check if a King is currently in check at (x, y)
  const isKingCheckSquare = (x: number, y: number) => {
    if (!isCheck) return false;
    const piece = board[y][x];
    return piece !== null && piece.trueRole === 'king' && piece.color === turn;
  };

  return (
    <div className="relative w-full max-w-[580px] mx-auto p-2 sm:p-4 md:p-5 rounded-2xl bg-gradient-to-b from-[#e8be89] via-[#deb076] to-[#cfa065] shadow-2xl border-4 border-[#824e23] select-none">
      {/* Wooden texture overlay effect */}
      <div className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-50/10 via-amber-950/15 to-stone-950/40 pointer-events-none" />

      {/* Board Aspect Ratio Wrapper */}
      <div className="relative w-full pb-[111.1%]">
        {/* SVG Board Lines & Markings */}
        <svg
          viewBox="0 0 800 900"
          className="absolute inset-0 w-full h-full pointer-events-none"
          stroke="#5a3311"
          strokeWidth="2.4"
          fill="none"
        >
          {/* Outer Border */}
          <rect x="40" y="40" width="720" height="820" strokeWidth="4.5" />
          <rect x="34" y="34" width="732" height="832" strokeWidth="1.2" />

          {/* Horizontal Ranks (10 lines) */}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1="40"
              y1={40 + i * 91.11}
              x2="760"
              y2={40 + i * 91.11}
            />
          ))}

          {/* Vertical Files (Outer left and right run continuously from row 0 to 9) */}
          <line x1="40" y1="40" x2="40" y2="860" />
          <line x1="760" y1="40" x2="760" y2="860" />

          {/* Internal Vertical Files (broken at the River between row 4 and 5) */}
          {Array.from({ length: 7 }).map((_, i) => {
            const vx = 40 + (i + 1) * 90;
            return (
              <g key={`v-${i}`}>
                {/* Top side (rows 0 to 4) */}
                <line x1={vx} y1="40" x2={vx} y2={40 + 4 * 91.11} />
                {/* Bottom side (rows 5 to 9) */}
                <line x1={vx} y1={40 + 5 * 91.11} x2={vx} y2="860" />
              </g>
            );
          })}

          {/* Palaces Diagonals (Cửu Cung) */}
          {/* Top Palace (Rows 0-2, Cols 3-5) */}
          <line x1={40 + 3 * 90} y1="40" x2={40 + 5 * 90} y2={40 + 2 * 91.11} />
          <line x1={40 + 5 * 90} y1="40" x2={40 + 3 * 90} y2={40 + 2 * 91.11} />

          {/* Bottom Palace (Rows 7-9, Cols 3-5) */}
          <line x1={40 + 3 * 90} y1={40 + 7 * 91.11} x2={40 + 5 * 90} y2="860" />
          <line x1={40 + 5 * 90} y1={40 + 7 * 91.11} x2={40 + 3 * 90} y2="860" />

          {/* The River Text (Sở Hà - Hán Giới) */}
          <text
            x="200"
            y={40 + 4.65 * 91.11}
            fill="#6d3d16"
            fontSize="34"
            fontFamily="'Ma Shan Zheng', 'Noto Serif', serif"
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing="8"
            stroke="none"
            opacity={revealNotice ? 0.25 : 0.85}
            className="transition-opacity duration-300"
          >
            {flipped ? '漢界' : '楚河'}
          </text>
          <text
            x="600"
            y={40 + 4.65 * 91.11}
            fill="#6d3d16"
            fontSize="34"
            fontFamily="'Ma Shan Zheng', 'Noto Serif', serif"
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing="8"
            stroke="none"
            opacity={revealNotice ? 0.25 : 0.85}
            className="transition-opacity duration-300"
          >
            {flipped ? '楚河' : '漢界'}
          </text>

          {/* Subtle Last Move Trail Indicators (Những chấm mờ cho nước đi vừa rồi) */}
          {moveTrail && (
            <g className="pointer-events-none">
              {/* Subtle dashed trajectory connecting line */}
              <line
                x1={moveTrail.fromSvgX}
                y1={moveTrail.fromSvgY}
                x2={moveTrail.toSvgX}
                y2={moveTrail.toSvgY}
                stroke="#b45309"
                strokeWidth="2.2"
                strokeDasharray="5,7"
                strokeOpacity="0.45"
              />

              {/* Origin square subtle dashed ring & center dot */}
              <circle
                cx={moveTrail.fromSvgX}
                cy={moveTrail.fromSvgY}
                r="18"
                fill="#f59e0b"
                fillOpacity="0.14"
                stroke="#d97706"
                strokeWidth="2"
                strokeDasharray="4,4"
                strokeOpacity="0.6"
              />
              <circle
                cx={moveTrail.fromSvgX}
                cy={moveTrail.fromSvgY}
                r="5.5"
                fill="#d97706"
                fillOpacity="0.75"
              />

              {/* Intermediate subtle trail dots along the path */}
              {moveTrail.dots.map((d, idx) => (
                <circle
                  key={`trail-dot-${idx}`}
                  cx={d.x}
                  cy={d.y}
                  r="4"
                  fill="#f59e0b"
                  fillOpacity="0.5"
                  stroke="#b45309"
                  strokeWidth="1"
                  strokeOpacity="0.5"
                />
              ))}

              {/* Destination square soft arrival marker ring */}
              <circle
                cx={moveTrail.toSvgX}
                cy={moveTrail.toSvgY}
                r="24"
                fill="#f59e0b"
                fillOpacity="0.1"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeOpacity="0.6"
                strokeDasharray="6,4"
              />
            </g>
          )}
        </svg>

        {/* River Notification for Revealed Pieces (Thông báo mở quân ngay trên sông thay vì pop-up) */}
        <div className="absolute top-[44.5%] left-[4%] right-[4%] h-[11%] z-25 pointer-events-none flex items-center justify-center">
          {revealNotice && (
            <div
              className={`px-4 sm:px-6 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wide flex items-center gap-2 shadow-xl border transition-all duration-300 animate-pulse backdrop-blur-sm ${
                revealNotice.isHighValue
                  ? 'bg-gradient-to-r from-amber-950/95 via-red-950/95 to-amber-950/95 text-amber-200 border-amber-500/80 shadow-amber-950/70'
                  : 'bg-stone-900/90 text-stone-100 border-stone-600/70 shadow-stone-950/60'
              }`}
            >
              <span className="text-amber-400 text-sm">✨</span>
              <span>{revealNotice.text}</span>
            </div>
          )}
        </div>

        {/* 10 Rows x 9 Columns Interactive Grid */}
        <div className="absolute inset-0 grid grid-rows-10 p-[4.2%]">
          {Array.from({ length: BOARD_ROWS }).map((_, rIdx) => (
            <div key={`row-${rIdx}`} className="grid grid-cols-9">
              {Array.from({ length: BOARD_COLS }).map((_, cIdx) => {
                const { x, y } = getRenderPos(cIdx, rIdx);
                const piece = board[y][x];
                const selected = isSelected(x, y);
                const legalTarget = isLegalTarget(x, y);
                const isFrom = isFromSquare(x, y);
                const isTo = isToSquare(x, y);
                const isLast = isFrom || isTo;
                const inCheck = isKingCheckSquare(x, y);

                return (
                  <div
                    key={`cell-${x}-${y}`}
                    id={`square-${x}-${y}`}
                    onClick={() => {
                      if (!disabled) {
                        onSelectSquare({ x, y });
                      }
                    }}
                    className="relative flex items-center justify-center cursor-pointer"
                  >
                    {/* Legal Target Indicator */}
                    {legalTarget && (
                      <div className="absolute z-20 pointer-events-none flex items-center justify-center inset-0">
                        {piece ? (
                          // Target has enemy piece -> red capture ring
                          <div className="w-[88%] h-[88%] rounded-full border-4 border-red-500/90 shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse" />
                        ) : (
                          // Target is empty -> emerald dot
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-600/90 border-2 border-emerald-300 shadow-md transform hover:scale-125 transition-transform" />
                        )}
                      </div>
                    )}

                    {/* Origin cell subtle faded dot marker (Chấm mờ vị trí xuất phát) */}
                    {isFrom && !piece && (
                      <div className="absolute z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/25 border-2 border-dashed border-amber-400/60 flex items-center justify-center animate-pulse pointer-events-none">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/85 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                      </div>
                    )}

                    {/* Destination cell arrival halo behind the moved piece */}
                    {isTo && (
                      <div className="absolute z-0 w-[94%] h-[94%] rounded-full bg-amber-400/20 border-2 border-amber-400/70 shadow-[0_0_12px_rgba(245,158,11,0.4)] pointer-events-none animate-pulse" />
                    )}

                    {/* Chess Piece */}
                    {piece && (
                      <div className="relative z-10 w-[92%] h-[92%]">
                        <ChessPiece
                          piece={piece}
                          isSelected={selected}
                          isLastMove={isLast}
                          isInCheck={inCheck}
                          displayMode={displayMode}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
