/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BackgroundScene3D,
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
import { SCENE_CONFIGS } from '../utils/backgroundScenes';
import { ChessPiece } from './ChessPiece';
import { Check, ChevronDown, Layers, Quote, Sparkles } from 'lucide-react';

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
  bgScene?: BackgroundScene3D;
  isLiteMode?: boolean;
  onSelectSquare: (pos: Position) => void;
  onTogglePerspective?: () => void;
  onCycleRiverMode?: () => void;
  onSelectBgScene?: (scene: BackgroundScene3D) => void;
  disabled?: boolean;
  revealNotice?: { text: string; isHighValue: boolean } | null;
  captureEffect?: { pos: Position; text: string; isLoss: boolean; id: number } | null;
}

// Famous chess proverbs
const CHESS_PROVERBS = [
  'Tốt qua sông cấm kỳ trở lại • Quay đầu ngại mưa gió giang hồ',
  'Lạc nước hai Xe đành bỏ phí • Gặp thời một Tốt cũng thành công',
  'Kỳ phùng địch thủ • Cờ tàn hữu lực',
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
  bgScene = 'tra_da',
  isLiteMode = false,
  onSelectSquare,
  onTogglePerspective,
  onCycleRiverMode,
  onSelectBgScene,
  disabled = false,
  revealNotice,
  captureEffect,
}) => {
  const [proverbIndex, setProverbIndex] = useState(0);
  const [isSceneMenuOpen, setIsSceneMenuOpen] = useState(false);

  // User's chosen perspective: 3D depth or flat 2D
  const is3D = perspective === '3d';
  const currentSceneConfig = SCENE_CONFIGS.find((s) => s.id === bgScene) || SCENE_CONFIGS[0];

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

        {/* 3D Scene Environment Quick Selector (Thay thế chỗ Thơ cờ, option chọn sông đã ẩn đi cho đỡ vướng) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (!is3D && onTogglePerspective) {
                onTogglePerspective();
              }
              setIsSceneMenuOpen((prev) => !prev);
            }}
            className="px-2 py-0.5 rounded font-medium bg-stone-900/95 hover:bg-stone-800 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm transition-all text-[10px] sm:text-xs"
            title="Chọn bối cảnh không gian 3D: Quán trà đá, cà phê, hoa viên, đấu trường kỳ vương"
          >
            <span>{currentSceneConfig.icon}</span>
            <span className="font-semibold">{currentSceneConfig.shortName}</span>
            <ChevronDown className="w-3 h-3 text-amber-400/80" />
          </button>

          {isSceneMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsSceneMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-56 bg-stone-900/98 border border-amber-500/40 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-md animate-fade-in text-xs">
                <div className="px-2 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
                  <span>🌌 Bối cảnh không gian</span>
                  <span className="text-stone-400 font-normal">5 cảnh</span>
                </div>
                {SCENE_CONFIGS.map((scene) => {
                  const isSelected = scene.id === bgScene;
                  return (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => {
                        if (!is3D && onTogglePerspective) {
                          onTogglePerspective();
                        }
                        onSelectBgScene?.(scene.id);
                        setIsSceneMenuOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/50'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                      }`}
                    >
                      <span className="text-base shrink-0">{scene.icon}</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs truncate">{scene.name}</span>
                        <span className="text-[9px] text-stone-400 truncate font-normal">
                          {scene.description}
                        </span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3D Perspective Viewport Container with Ambient Tabletop Presence */}
      <div
        className={`relative z-10 w-full flex items-center justify-center transition-all duration-300 ${
          is3D ? 'pb-5 sm:pb-6 pt-0.5 px-0.5 sm:px-1.5' : 'px-0.5'
        }`}
        style={{
          perspective: is3D ? '1200px' : 'none',
          perspectiveOrigin: '50% 88%',
        }}
      >
        {/* Soft Ambient Spotlight Glow - Only in 3D */}
        {is3D && (
          <div
            className="absolute -inset-3 sm:-inset-6 rounded-3xl pointer-events-none opacity-60"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(217, 119, 6, 0.18) 0%, rgba(120, 53, 15, 0.08) 50%, transparent 75%)',
            }}
          />
        )}

        {/* 3D Table Surface Ground Cast Shadow (Bóng đổ bàn cờ vuông vức vững chãi xuống mặt bàn) */}
        {is3D && (
          <div
            className="absolute -bottom-5 sm:-bottom-6 left-[1%] right-[1%] h-12 rounded-full pointer-events-none transition-all duration-300"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.18) 72%, transparent 85%)',
              filter: 'blur(5px)',
            }}
          />
        )}

        {/* Physical Wooden Chess Board Slab (Mặt bàn cờ gỗ khối 3D nguyên khối vuông vắn, bề thế và liền mạch) */}
        <div
          className="relative w-full rounded-2xl select-none transition-all duration-300 ease-out flex flex-col overflow-hidden"
          style={{
            transform: is3D ? 'rotateX(15deg) scale(1.02)' : 'none',
            transformOrigin: '50% 90%',
            transformStyle: is3D ? 'preserve-3d' : 'flat',
            background: 'linear-gradient(180deg, #fbf2e3 0%, #edd4ae 45%, #e1c093 100%)',
            border: is3D ? '6px solid #4a1e05' : '4px solid #78350f',
            boxShadow: is3D
              ? 'inset 0 0 0 1.5px rgba(245, 158, 11, 0.45), inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 0 #542306, 0 3px 0 #451b04, 0 6px 0 #381502, 0 9px 0 #2c0f01, 0 13px 0 #200a00, 0 17px 0 #150600, 0 24px 34px rgba(0, 0, 0, 0.92)'
              : '0 4px 18px rgba(0,0,0,0.5)',
          }}
        >
          {/* Natural subtle vertical wood grain overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(160, 95, 30, 0.08) 19px, rgba(160, 95, 30, 0.12) 20px)',
            }}
          />

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

              {/* The River Content (Mặc định: Câu châm ngôn "Đánh cờ chớ có đánh nhau" chữ thư pháp đẹp mắt, thanh tao) */}
              {riverMode === 'blank' && (
                <g className="select-none pointer-events-none">
                  {/* Clean & Beautiful Vietnamese Calligraphy: "Đánh cờ chớ có đánh nhau" */}
                  <text
                    x="400"
                    y="458"
                    textAnchor="middle"
                    fill="#6c2e05"
                    fontSize="36"
                    fontFamily="'Charm', 'Pattaya', 'Be Vietnam Pro', cursive, serif"
                    fontWeight="700"
                    letterSpacing="1"
                    stroke="none"
                  >
                    Đánh cờ chớ có đánh nhau
                  </text>
                </g>
              )}

              {riverMode === 'proverb' && (
                <g className="select-none pointer-events-none">
                  <text
                    x="400"
                    y="457"
                    fill="#6c2e05"
                    fontSize="23"
                    fontFamily="'Charm', 'Pattaya', 'Be Vietnam Pro', cursive, serif"
                    fontWeight="700"
                    textAnchor="middle"
                    stroke="none"
                    letterSpacing="0.8"
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
                          <div
                            className={`aspect-square rounded-full border-2 border-red-500/90 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse ${
                              is3D ? 'w-[90%]' : 'w-[118%]'
                            }`}
                          />
                        ) : (
                          // Target is empty intersection -> glowing emerald dot
                          <div
                            className={`aspect-square rounded-full bg-emerald-600/95 border-2 border-emerald-300 shadow-md hover:scale-125 transition-transform ${
                              is3D
                                ? 'w-[36%] max-w-[16px] max-h-[16px] min-w-[5px] min-h-[5px]'
                                : 'w-[44%] max-w-[20px] max-h-[20px] min-w-[6px] min-h-[6px]'
                            }`}
                          />
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
                      <div
                        className={`absolute z-0 aspect-square rounded-full bg-amber-400/20 border-2 border-amber-400/70 shadow-[0_0_10px_rgba(245,158,11,0.4)] pointer-events-none animate-pulse ${
                          is3D ? 'w-[96%]' : 'w-[122%]'
                        }`}
                      />
                    )}

                    {/* Chess Piece sitting centered on intersection (Giao diện 2D to hơn 30% theo yêu cầu) */}
                    {piece && (
                      <div
                        className={`relative z-10 aspect-square flex items-center justify-center pointer-events-none transition-all ${
                          is3D ? 'w-[92%]' : 'w-[120%]'
                        }`}
                      >
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

          {/* Integrated Solid Wood Front Plinth (Chân đế gỗ nguyên khối liền mạch với bàn cờ) */}
          {is3D && (
            <div
              className="relative w-full h-7 sm:h-8 flex items-center justify-center overflow-hidden z-20 shrink-0"
              style={{
                background: 'linear-gradient(180deg, #441a04 0%, #341302 40%, #200a01 80%, #120400 100%)',
                borderTop: '1.5px solid rgba(245, 158, 11, 0.45)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15)',
              }}
            >
              {/* Fine horizontal wood grain */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent, transparent 16px, rgba(255,255,255,0.06) 17px, transparent 18px)',
                }}
              />

              {/* Lower gold/brass accent wire */}
              <div className="absolute bottom-1 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

              {/* Calligraphy 'Tidu Production' Engraved Inlay Badge (Chữ thư pháp Tidu Production dát vàng nổi khối) */}
              <div className="relative flex items-center justify-center gap-2 px-4 py-0.5 z-10">
                <span className="text-amber-400/80 text-[10px] sm:text-[11px] select-none">❖</span>
                <span
                  className="font-serif italic font-black tracking-[0.24em] text-[11px] sm:text-[13px] uppercase select-none transition-all drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]"
                  style={{
                    background: 'linear-gradient(180deg, #fff7df 0%, #fde68a 25%, #f59e0b 60%, #b45309 95%, #78350f 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 12px rgba(245,158,11,0.35)',
                    fontFamily: '"Times New Roman", "Playfair Display", Georgia, serif',
                  }}
                >
                  Tidu Production
                </span>
                <span className="text-amber-400/80 text-[10px] sm:text-[11px] select-none">❖</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ChessBoard = React.memo(ChessBoardComponent);

