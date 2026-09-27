/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BoardPerspective,
  BoardTheme,
  LabelDisplayMode,
  Move,
  Piece,
  PlayerColor,
  Position,
  RiverTextMode,
} from '../types';
import { BOARD_COLS, BOARD_ROWS } from '../utils/chessRules';
import { ChessPiece } from './ChessPiece';
import { Layers, Quote } from 'lucide-react';

interface ChessBoardProps {
  board: (Piece | null)[][];
  turn: PlayerColor;
  selectedPos: Position | null;
  legalMoves: Position[];
  lastMove: Move | null;
  isCheck: boolean;
  flipped?: boolean;
  displayMode?: LabelDisplayMode;
  theme?: BoardTheme;
  perspective?: BoardPerspective;
  riverMode?: RiverTextMode;
  isLiteMode?: boolean;
  onSelectSquare: (pos: Position) => void;
  onTogglePerspective?: () => void;
  onCycleRiverMode?: () => void;
  disabled?: boolean;
  revealNotice?: { text: string; isHighValue: boolean } | null;
  captureEffect?: { pos: Position; text: string; isLoss: boolean; id: number } | null;
}

// Famous chess proverbs
const CHESS_PROVERBS = [
  'Lạc nước hai Xe đành bỏ phí • Gặp thời một Tốt cũng thành công',
  'Kỳ phùng địch thủ • Cờ tàn hữu lực',
  'Cờ ngoài bài quỷ • Nước cờ tại tâm',
  'Thao trường luyện kiếm • Kỳ nghệ luận anh hùng',
];

// Exact intersection percentages on the 800 x 900 SVG
// X positions: 40 + c * 90 (c = 0..8) -> [40, 130, 220, 310, 400, 490, 580, 670, 760] / 800 * 100
const INTERSECTION_X_PCT = [5.0, 16.25, 27.5, 38.75, 50.0, 61.25, 72.5, 83.75, 95.0];

// Y positions: 40 + r * (820 / 9) (r = 0..9) -> (40 + r * 91.1111) / 900 * 100
const INTERSECTION_Y_PCT = [
  4.444, 14.568, 24.691, 34.815, 44.938,
  55.062, 65.185, 75.309, 85.432, 95.556,
];

const ChessBoardComponent: React.FC<ChessBoardProps> = ({
  board,
  turn,
  selectedPos,
  legalMoves,
  lastMove,
  isCheck,
  flipped = false,
  displayMode = 'both',
  theme: _theme = 'quan_coc',
  perspective = '3d',
  riverMode = 'blank',
  isLiteMode = false,
  onSelectSquare,
  onTogglePerspective,
  onCycleRiverMode,
  disabled = false,
  revealNotice,
  captureEffect,
}) => {
  const [proverbIndex, setProverbIndex] = useState(0);

  // User's chosen perspective: 3D depth or flat 2D
  const is3D = perspective === '3d';

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

  // Helper to render traditional L-corner tick marks on cannon and soldier points
  const renderLCornerTicks = (cx: number, cy: number, hasLeft: boolean, hasRight: boolean) => {
    const d = 5; // distance offset from intersection lines
    const l = 8.5; // length of L-arm
    return (
      <g key={`ticks-${cx}-${cy}`} stroke="#78350f" strokeWidth="1.5" fill="none" opacity="0.65">
        {hasLeft && (
          <>
            {/* Top-Left */}
            <path d={`M ${cx - d - l} ${cy - d} L ${cx - d} ${cy - d} L ${cx - d} ${cy - d - l}`} />
            {/* Bottom-Left */}
            <path d={`M ${cx - d - l} ${cy + d} L ${cx - d} ${cy + d} L ${cx - d} ${cy + d + l}`} />
          </>
        )}
        {hasRight && (
          <>
            {/* Top-Right */}
            <path d={`M ${cx + d + l} ${cy - d} L ${cx + d} ${cy - d} L ${cx + d} ${cy - d - l}`} />
            {/* Bottom-Right */}
            <path d={`M ${cx + d + l} ${cy + d} L ${cx + d} ${cy + d} L ${cx + d} ${cy + d + l}`} />
          </>
        )}
      </g>
    );
  };

  return (
    <div className="relative w-full mx-auto flex flex-col items-center">
      {/* Top Quick Toggle Bar: 2D/3D Perspective & River Mode (ultra-slim on mobile) */}
      <div className="w-full flex items-center justify-between px-1 mb-0.5 z-20 text-[9px] sm:text-[10px] shrink-0">
        {/* 2D / 3D Perspective Segmented Switcher */}
        <div className="flex items-center bg-stone-900/95 p-0.5 rounded-lg border border-white/10 shadow-sm">
          <button
            type="button"
            onClick={() => {
              if (is3D && onTogglePerspective) onTogglePerspective();
            }}
            className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-all ${
              !is3D
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-white'
            }`}
            title="Góc nhìn 2D nhìn thẳng chuẩn mực"
          >
            <span>📐 2D</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!is3D && onTogglePerspective) onTogglePerspective();
            }}
            className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-all ${
              is3D
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-amber-300'
            }`}
            title="Góc nhìn 3D chiều sâu gỗ đặc"
          >
            <span>🎥 3D</span>
          </button>
        </div>

        {/* River Mode Quick Switcher */}
        <button
          onClick={() => {
            if (onCycleRiverMode) {
              onCycleRiverMode();
            }
            setProverbIndex((prev) => (prev + 1) % CHESS_PROVERBS.length);
          }}
          className="px-1.5 py-0.5 rounded font-medium bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-amber-300 border border-white/10 flex items-center gap-1 transition-colors"
          title="Chuyển đổi kiểu sông"
        >
          <Quote className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400/80" />
          <span>
            {riverMode === 'blank'
              ? 'Tidu Production'
              : riverMode === 'proverb'
              ? 'Thơ cờ'
              : 'Sông trơn'}
          </span>
        </button>
      </div>

      {/* 3D Perspective Viewport Container with Ambient Meditation Light */}
      <div
        className={`relative z-10 w-full flex items-center justify-center transition-all duration-300 ${
          is3D ? 'pb-7 sm:pb-9 pt-1' : ''
        }`}
        style={{
          perspective: is3D ? '1100px' : 'none',
          perspectiveOrigin: '50% 88%',
        }}
      >
        {/* Soft Ambient Spotlight Glow - Only in 3D */}
        {is3D && (
          <div
            className="absolute -inset-4 sm:-inset-8 rounded-3xl pointer-events-none opacity-70"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(217, 119, 6, 0.18) 0%, rgba(120, 53, 15, 0.08) 50%, transparent 75%)',
            }}
          />
        )}

        {/* 3D Table Surface Ground Cast Shadow (Bóng đổ bàn cờ xuống mặt sàn khi ở 3D) */}
        {is3D && (
          <div
            className="absolute -bottom-5 sm:-bottom-6 left-[2%] right-[2%] h-12 rounded-full pointer-events-none transition-all duration-300"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 50%, transparent 75%)',
              filter: 'blur(3px)',
            }}
          />
        )}

        {/* Physical Wooden Chess Board Slab (Mặt bàn cờ gỗ khối 3D dày dặn) */}
        <div
          className="relative w-full rounded-2xl select-none transition-all duration-300 ease-out"
          style={{
            transform: is3D ? 'rotateX(23deg) scale(0.98)' : 'none',
            transformOrigin: '50% 92%',
            transformStyle: is3D ? 'preserve-3d' : 'flat',
            background: 'linear-gradient(180deg, #f8ebd4 0%, #edd3ab 45%, #e0c192 100%)',
            border: is3D ? '5.5px solid #6c2e05' : '3.5px solid #78350f',
            outline: is3D ? '2px solid rgba(245, 158, 11, 0.45)' : 'none',
            outlineOffset: is3D ? '-4px' : '0',
            boxShadow: is3D
              ? '0 3px 0 #78350f, 0 6px 0 #5c2707, 0 10px 0 #451b04, 0 15px 0 #331302, 0 20px 0 #240c01, 0 25px 2px #150600, 0 30px 40px rgba(0,0,0,0.85)'
              : 'none',
            contain: 'paint layout',
          }}
        >
          {/* Natural subtle vertical wood grain overlay */}
          <div
            className="absolute inset-0 rounded-xl pointer-events-none opacity-15"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(160, 95, 30, 0.08) 19px, rgba(160, 95, 30, 0.12) 20px)',
            }}
          />

          {/* 3D Front Apron / Wooden Table Thickness Plinth (Thành trước bàn cờ gỗ nguyên khối) */}
          {is3D && (
            <div
              className="absolute -bottom-5 sm:-bottom-6 left-0 right-0 h-5 sm:h-6 rounded-b-xl pointer-events-none overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #5c2707 0%, #451b04 35%, #2d1002 75%, #180701 100%)',
                borderBottom: '2.5px solid #100400',
                borderLeft: '4px solid #451b04',
                borderRight: '4px solid #451b04',
                boxShadow: '0 8px 16px rgba(0,0,0,0.6), inset 0 1.5px 2px rgba(255,255,255,0.18)',
              }}
            >
              {/* Vertical wood grain lines on front edge */}
              <div
                className="w-full h-full opacity-20"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.08) 21px, transparent 22px)',
                }}
              />
              {/* Luxury gold/brass accent inlay line across front edge */}
              <div className="absolute top-1 left-3 right-3 h-[1px] bg-amber-400/40" />
            </div>
          )}

          {/* Board Aspect Ratio Wrapper (800 x 900 -> 112.5% height) */}
          <div
            className="relative w-full pb-[112.5%]"
            style={{ containerType: 'inline-size' }}
          >
            {/* SVG Board Lines, Traditional Palace Diagonals, and Station L-Marks */}
            <svg
              viewBox="0 0 800 900"
              className="absolute inset-0 w-full h-full pointer-events-none"
              stroke="#5c3413"
              strokeWidth="2.2"
              fill="none"
            >
              <defs>
                {/* Rich wood-burnt lacquer gradient for Tidu Production calligraphy */}
                <linearGradient id="tiduGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#451a03" />
                  <stop offset="20%" stopColor="#78350f" />
                  <stop offset="50%" stopColor="#9a3412" />
                  <stop offset="80%" stopColor="#78350f" />
                  <stop offset="100%" stopColor="#451a03" />
                </linearGradient>

                {/* Subtle wood-carved depth embossing filter */}
                <filter id="woodCarvingFilter" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="1.2" stdDeviation="0.5" floodColor="#fffbf5" floodOpacity="0.45" />
                  <feDropShadow dx="0" dy="-0.9" stdDeviation="0.6" floodColor="#271102" floodOpacity="0.35" />
                </filter>
              </defs>

              {/* Outer Double Board Border */}
              <rect x="40" y="40" width="720" height="820" strokeWidth="4" />
              <rect x="33" y="33" width="734" height="834" strokeWidth="1.2" opacity="0.8" />

              {/* Horizontal Ranks (10 lines) */}
              {Array.from({ length: 10 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="40"
                  y1={40 + i * 91.1111}
                  x2="760"
                  y2={40 + i * 91.1111}
                />
              ))}

              {/* Vertical Files (Outer left and right run continuously) */}
              <line x1="40" y1="40" x2="40" y2="860" />
              <line x1="760" y1="40" x2="760" y2="860" />

              {/* Internal Vertical Files (broken at River between row 4 and 5) */}
              {Array.from({ length: 7 }).map((_, i) => {
                const vx = 40 + (i + 1) * 90;
                return (
                  <g key={`v-${i}`}>
                    {/* Top side (rows 0 to 4) */}
                    <line x1={vx} y1="40" x2={vx} y2={40 + 4 * 91.1111} />
                    {/* Bottom side (rows 5 to 9) */}
                    <line x1={vx} y1={40 + 5 * 91.1111} x2={vx} y2="860" />
                  </g>
                );
              })}

              {/* Palace Diagonals (Cửu Cung) */}
              {/* Top Palace (Rows 0-2, Cols 3-5) */}
              <line x1={40 + 3 * 90} y1="40" x2={40 + 5 * 90} y2={40 + 2 * 91.1111} />
              <line x1={40 + 5 * 90} y1="40" x2={40 + 3 * 90} y2={40 + 2 * 91.1111} />

              {/* Bottom Palace (Rows 7-9, Cols 3-5) */}
              <line x1={40 + 3 * 90} y1={40 + 7 * 91.1111} x2={40 + 5 * 90} y2="860" />
              <line x1={40 + 5 * 90} y1={40 + 7 * 91.1111} x2={40 + 3 * 90} y2="860" />

              {/* Traditional L-Corner Marks on Cannon & Soldier stations */}
              {/* Cannon stations (row 2 and row 7, cols 1 and 7) */}
              {renderLCornerTicks(40 + 1 * 90, 40 + 2 * 91.1111, true, true)}
              {renderLCornerTicks(40 + 7 * 90, 40 + 2 * 91.1111, true, true)}
              {renderLCornerTicks(40 + 1 * 90, 40 + 7 * 91.1111, true, true)}
              {renderLCornerTicks(40 + 7 * 90, 40 + 7 * 91.1111, true, true)}

              {/* Top Soldier stations (row 3, cols 0, 2, 4, 6, 8) */}
              {renderLCornerTicks(40 + 0 * 90, 40 + 3 * 91.1111, false, true)}
              {renderLCornerTicks(40 + 2 * 90, 40 + 3 * 91.1111, true, true)}
              {renderLCornerTicks(40 + 4 * 90, 40 + 3 * 91.1111, true, true)}
              {renderLCornerTicks(40 + 6 * 90, 40 + 3 * 91.1111, true, true)}
              {renderLCornerTicks(40 + 8 * 90, 40 + 3 * 91.1111, true, false)}

              {/* Bottom Soldier stations (row 6, cols 0, 2, 4, 6, 8) */}
              {renderLCornerTicks(40 + 0 * 90, 40 + 6 * 91.1111, false, true)}
              {renderLCornerTicks(40 + 2 * 90, 40 + 6 * 91.1111, true, true)}
              {renderLCornerTicks(40 + 4 * 90, 40 + 6 * 91.1111, true, true)}
              {renderLCornerTicks(40 + 6 * 90, 40 + 6 * 91.1111, true, true)}
              {renderLCornerTicks(40 + 8 * 90, 40 + 6 * 91.1111, true, false)}

              {/* The River Content (Mặc định: Thư pháp nghệ thuật "Tidu Production" / Câu thơ cờ tướng / Sở Hà Hán Giới) */}
              {riverMode === 'blank' && (
                <g opacity="0.9" className="select-none pointer-events-none">
                  {/* Left Calligraphic Flourish Ornament */}
                  <g opacity="0.72">
                    <path
                      d="M 115 450 C 140 442, 168 458, 195 450 C 215 444, 230 445, 245 450"
                      stroke="#78350f"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M 148 452 C 170 446, 192 456, 215 450"
                      stroke="#92400e"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeDasharray="2,3"
                      fill="none"
                      opacity="0.6"
                    />
                    <polygon points="103,450 108,446 113,450 108,454" fill="#854d0e" />
                    <circle cx="97" cy="450" r="1.8" fill="#78350f" />
                  </g>

                  {/* Master Calligraphy: "Tidu Production" */}
                  <text
                    x="385"
                    y="458"
                    textAnchor="middle"
                    fill="url(#tiduGoldGrad)"
                    fontSize="39"
                    fontFamily="'Great Vibes', 'Alex Brush', 'Charm', cursive, serif"
                    fontWeight="bold"
                    letterSpacing="1.2"
                    stroke="none"
                    filter="url(#woodCarvingFilter)"
                  >
                    Tidu Production
                  </text>

                  {/* Traditional Vermilion Seal Stamp (Triện đỏ thư pháp TIDU) */}
                  <g opacity="0.88">
                    <rect
                      x="538"
                      y="437.5"
                      width="25"
                      height="25"
                      rx="3.5"
                      fill="#991b1b"
                      stroke="#7f1d1d"
                      strokeWidth="1.2"
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.28))' }}
                    />
                    <rect
                      x="540.5"
                      y="440"
                      width="20"
                      height="20"
                      rx="2"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="0.8"
                      opacity="0.55"
                    />
                    <text
                      x="550.5"
                      y="454"
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="9.5"
                      fontFamily="'Be Vietnam Pro', 'Inter', sans-serif"
                      fontWeight="900"
                      letterSpacing="0.8"
                      stroke="none"
                    >
                      TIDU
                    </text>
                  </g>

                  {/* Right Calligraphic Flourish Ornament */}
                  <g opacity="0.72">
                    <path
                      d="M 578 450 C 593 445, 608 444, 628 450 C 655 458, 680 442, 705 450"
                      stroke="#78350f"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M 608 450 C 628 456, 650 446, 672 452"
                      stroke="#92400e"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeDasharray="2,3"
                      fill="none"
                      opacity="0.6"
                    />
                    <polygon points="707,450 712,446 717,450 712,454" fill="#854d0e" />
                    <circle cx="723" cy="450" r="1.8" fill="#78350f" />
                  </g>
                </g>
              )}

              {riverMode === 'proverb' && (
                <g opacity="0.82">
                  <text
                    x="400"
                    y={40 + 4.62 * 91.1111}
                    fill="#78350f"
                    fontSize="21"
                    fontFamily="'Charm', 'Be Vietnam Pro', serif"
                    fontWeight="bold"
                    fontStyle="italic"
                    textAnchor="middle"
                    stroke="none"
                    letterSpacing="1"
                  >
                    {CHESS_PROVERBS[proverbIndex]}
                  </text>
                </g>
              )}

              {/* Subtle Last Move Trail Indicators */}
              {moveTrail && (
                <g className="pointer-events-none">
                  {/* Dashed connecting trajectory */}
                  <line
                    x1={moveTrail.fromSvgX}
                    y1={moveTrail.fromSvgY}
                    x2={moveTrail.toSvgX}
                    y2={moveTrail.toSvgY}
                    stroke="#b45309"
                    strokeWidth="2.2"
                    strokeDasharray="5,7"
                    strokeOpacity="0.5"
                  />

                  {/* Origin square subtle dashed ring */}
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

                  {/* Intermediate subtle trail dots */}
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

                  {/* Destination arrival ring */}
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

            {/* River Notification for Newly Revealed Face-down Pieces */}
            <div className="absolute top-[44.5%] left-[4%] right-[4%] h-[11%] z-0 pointer-events-none flex items-center justify-center overflow-hidden">
              {revealNotice && (
                <div
                  className={`px-3 sm:px-5 py-1 rounded-full text-xs sm:text-sm font-bold tracking-wide flex items-center gap-2 border transition-all duration-300 opacity-95 ${
                    revealNotice.isHighValue
                      ? 'bg-amber-950/80 text-amber-200 border-amber-500/60 shadow-md'
                      : 'bg-stone-900/80 text-stone-200 border-stone-600/60 shadow-md'
                  }`}
                >
                  <span className="text-amber-400 text-xs sm:text-sm">✨</span>
                  <span>{revealNotice.text}</span>
                </div>
              )}
            </div>

            {/* Mathematical Intersection Coordinates for Pieces & Touch Targets
                (Centered on exact line intersections to 0% pixel error!)
            */}
            {Array.from({ length: BOARD_ROWS }).map((_, rIdx) => {
              return Array.from({ length: BOARD_COLS }).map((_, cIdx) => {
                const { x, y } = getRenderPos(cIdx, rIdx);
                const piece = board[y][x];
                const selected = isSelected(x, y);
                const legalTarget = isLegalTarget(x, y);
                const isFrom = isFromSquare(x, y);
                const isTo = isToSquare(x, y);
                const isLast = isFrom || isTo;
                const inCheck = isKingCheckSquare(x, y);

                const leftPct = INTERSECTION_X_PCT[cIdx];
                const topPct = INTERSECTION_Y_PCT[rIdx];

                // Natural perspective z-index:
                // 1. Selected piece (top priority)
                // 2. Legal target indicators
                // 3. Current player's pieces (always clickable on top of empty/enemy squares)
                // 4. Enemy pieces & empty squares based on row depth
                const rowDepth = flipped ? (9 - y) : y;
                const isCurrentPlayerPiece = Boolean(piece && piece.color === turn);
                const squareZIndex = selected
                  ? 95
                  : legalTarget
                  ? 85
                  : isCurrentPlayerPiece
                  ? (60 + rowDepth)
                  : piece
                  ? (30 + rowDepth)
                  : (10 + rowDepth);

                return (
                  <button
                    type="button"
                    key={`intersection-${x}-${y}`}
                    id={`square-${x}-${y}`}
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!disabled) {
                        if (piece && piece.color === turn && !selected) {
                          try {
                            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                              navigator.vibrate(15);
                            }
                          } catch (_) {}
                        }
                        onSelectSquare({ x, y });
                      }
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-[11.4%] aspect-square flex items-center justify-center cursor-pointer select-none touch-manipulation focus:outline-none p-0 bg-transparent border-0 pointer-events-auto"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      zIndex: squareZIndex,
                    }}
                    aria-label={`Ô (${x}, ${y}) ${
                      piece
                        ? piece.isCovered
                          ? `${piece.color === 'red' ? 'Đỏ' : 'Đen'} quân úp bí mật`
                          : `${piece.color === 'red' ? 'Đỏ' : 'Đen'} ${piece.trueRole}`
                        : 'trống'
                    }`}
                  >
                    {/* Legal Target Indicator (Center on intersection) */}
                    {legalTarget && (
                      <div className="absolute z-20 pointer-events-none flex items-center justify-center inset-0">
                        {piece ? (
                          // Target has enemy piece -> red capture ring
                          <div className="w-[90%] aspect-square rounded-full border-2 border-red-500/90 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse" />
                        ) : (
                          // Target is empty intersection -> glowing emerald dot
                          <div className="w-[36%] aspect-square max-w-[16px] max-h-[16px] min-w-[5px] min-h-[5px] rounded-full bg-emerald-600/95 border-2 border-emerald-300 shadow-md hover:scale-125 transition-transform" />
                        )}
                      </div>
                    )}

                    {/* Origin cell subtle marker */}
                    {isFrom && !piece && (
                      <div className="absolute z-10 w-[55%] aspect-square rounded-full bg-amber-500/25 border-2 border-dashed border-amber-400/60 flex items-center justify-center animate-pulse pointer-events-none">
                        <div className="w-[30%] aspect-square rounded-full bg-amber-400/85 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                      </div>
                    )}

                    {/* Destination cell arrival halo */}
                    {isTo && (
                      <div className="absolute z-0 w-[96%] aspect-square rounded-full bg-amber-400/20 border-2 border-amber-400/70 shadow-[0_0_10px_rgba(245,158,11,0.4)] pointer-events-none animate-pulse" />
                    )}

                    {/* Chess Piece sitting centered on intersection */}
                    {piece && (
                      <div className="relative z-10 w-[92%] aspect-square flex items-center justify-center pointer-events-none">
                        <ChessPiece
                          piece={piece}
                          isSelected={selected}
                          isLastMove={isLast}
                          isInCheck={inCheck}
                          displayMode={displayMode}
                          is3D={is3D}
                        />
                      </div>
                    )}
                  </button>
                );
              });
            })}

            {/* Dynamic Capture & Piece Lost Visual FX (Hiệu ứng chém bắt quân nảy lửa) */}
            {captureEffect && (
              <div
                key={captureEffect.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[80] flex flex-col items-center justify-center"
                style={{
                  left: `${INTERSECTION_X_PCT[flipped ? 8 - captureEffect.pos.x : captureEffect.pos.x]}%`,
                  top: `${INTERSECTION_Y_PCT[flipped ? 9 - captureEffect.pos.y : captureEffect.pos.y]}%`,
                }}
              >
                {/* Shockwave expanding circle */}
                <div
                  className={`absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full animate-ping opacity-75 ${
                    captureEffect.isLoss ? 'bg-red-500/40 border-2 border-red-500' : 'bg-amber-400/50 border-2 border-amber-300'
                  }`}
                />

                {/* Martial Slash Lines (Tia sáng kiếm khí cắt chéo) */}
                <div className="absolute w-28 h-1 bg-gradient-to-r from-transparent via-amber-200 to-transparent -rotate-45 shadow-[0_0_12px_#f59e0b] animate-pulse" />
                <div className="absolute w-28 h-1 bg-gradient-to-r from-transparent via-white to-transparent rotate-45 shadow-[0_0_12px_#ffffff] animate-pulse" />

                {/* Floating Combat Callout Badge */}
                <div
                  className={`-translate-y-9 sm:-translate-y-11 px-3 py-1 rounded-full text-xs sm:text-sm font-black tracking-wide border shadow-2xl animate-bounce flex items-center gap-1.5 whitespace-nowrap z-10 ${
                    captureEffect.isLoss
                      ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-red-300 shadow-[0_0_15px_rgba(225,29,72,0.6)]'
                      : 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-stone-950 border-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.8)]'
                  }`}
                >
                  <span>{captureEffect.text}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChessBoard = React.memo(ChessBoardComponent);

