/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Board container: real 3D scene (default, lazy loaded) or the classic 2D / pseudo-3D board.
 * Takes exactly the same props as ChessBoard so App.tsx only swaps the component name.
 */
import React, { Component, Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { RotateCcw, LayoutGrid, Box as BoxIcon, Eye, Crosshair, SlidersHorizontal } from 'lucide-react';
import { ChessBoard } from '../ChessBoard';
import { MoveCommentaryBanner } from '../MoveCommentaryBanner';
import { SCENE_CONFIGS } from '../../utils/backgroundScenes';
import { ROLE_VI_NAMES } from '../../utils/chessRules';

const Board3DScene = lazy(() => import('./Board3DScene'));

type BoardProps = React.ComponentProps<typeof ChessBoard> & { wide?: boolean };
export type BoardViewMode = 'real3d' | 'classic';

const VIEW_MODE_KEY = 'co_up_view_mode';
const CAMERA_VIEW_KEY = 'co_up_3d_camera';
type CameraView = 'player' | 'spectator';

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function loadViewMode(): BoardViewMode {
  if (!hasWebGL()) return 'classic';
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === 'classic' ? 'classic' : 'real3d';
  } catch {
    return 'real3d';
  }
}

/** If the 3D chunk fails to load (offline, WebGL crash...), fall back to the classic board. */
class Scene3DBoundary extends Component<{ onError: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error('3D scene failed, falling back to classic board:', err);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const btn =
  'px-2 py-0.5 rounded font-bold flex items-center gap-1 whitespace-nowrap shrink-0 transition-all text-[9px] sm:text-[10px] border shadow-sm';

const BoardViewComponent: React.FC<BoardProps> = (props) => {
  const { wide = false, ...boardProps } = props;
  const [mode, setMode] = useState<BoardViewMode>(loadViewMode);
  const [resetSignal, setResetSignal] = useState(0);
  const [cameraElevation, setCameraElevation] = useState(() => (props.bgScene ?? 'tra_da') === 'tra_da' ? 28 : 60);
  const [isAnglePanelOpen, setIsAnglePanelOpen] = useState(false);
  const [cameraView, setCameraView] = useState<CameraView>(() => {
    try {
      return localStorage.getItem(CAMERA_VIEW_KEY) === 'spectator' ? 'spectator' : 'player';
    } catch {
      return 'player';
    }
  });
  useEffect(() => {
    setCameraElevation((props.bgScene ?? 'tra_da') === 'tra_da' ? 28 : 60);
  }, [props.bgScene]);

  const toggleCameraView = useCallback(() => {
    setCameraView((v) => {
      const next: CameraView = v === 'player' ? 'spectator' : 'player';
      try {
        localStorage.setItem(CAMERA_VIEW_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  const changeMode = useCallback((next: BoardViewMode) => {
    setMode(next);
    try {
      localStorage.setItem(VIEW_MODE_KEY, next);
    } catch {}
  }, []);

  if (mode === 'classic') {
    return (
      <div
        className="relative w-full mx-auto"
        style={wide ? { width: "min(calc((100dvh - 118px) * 0.888), 100%)" } : undefined}
      >
        <ChessBoard {...boardProps} />
        {hasWebGL() && (
          <button
            type="button"
            onClick={() => changeMode('real3d')}
            className={`${btn} absolute left-1 bottom-1 z-30 bg-stone-900/90 text-amber-300 border-amber-500/50 hover:bg-stone-800`}
            title="Chuyển sang không gian 3D thật: ngồi tại bàn cờ"
          >
            <BoxIcon className="w-3 h-3" /> 3D thật
          </button>
        )}
      </div>
    );
  }

  const {
    board,
    turn,
    selectedPos,
    legalMoves,
    lastMove,
    isCheck,
    flipped = false,
    displayMode = 'both',
    theme = 'giang_ho',
    bgScene = 'tra_da',
    isLiteMode = false,
    disabled = false,
    onSelectSquare,
    onSelectBgScene,
    revealNotice,
    captureEffect,
    luckyRevealEffect,
    commentary,
    isCommentaryVisible = false,
    onCloseCommentary,
    onRefreshCommentary,
    isLoadingAiCommentary = false,
    onDrinkSip,
  } = props;

  const fallback = (
    <div className="absolute inset-0 flex items-center justify-center text-amber-200/80 text-xs animate-pulse">
      Đang dựng không gian 3D...
    </div>
  );

  return (
    // 8:9 like the classic board, but never taller than the available space (the camera framing adapts
    // to whatever aspect ratio results)
    <div
      className="relative w-full max-h-full mx-auto"
      style={{
        aspectRatio: '9 / 16',
        // On compact screens the parent reserves a narrow portrait slot; let the 3D canvas
        // grow into the available viewport width while keeping the classic mode untouched.
        width: window.innerWidth <= 1024
          ? wide
            ? 'min(calc(100% * 1.4), calc(100vw - 210px))'
            : 'min(calc(100% * 1.45), 99.5vw)'
          : undefined,
        maxWidth: window.innerWidth <= 1024 ? 'none' : undefined,
        transform: bgScene === 'tra_da' ? (wide ? 'translateY(clamp(40px, 14vh, 100px))' : 'translateY(6vh)') : undefined,
      }}
    >
      {/* toolbar overlaid on the top edge (environment area) so the 3D view keeps the exact 8:9 footprint
          of the classic board and fits the same height-constrained layout */}
      <div className="absolute top-1 left-1 right-1 flex items-center justify-between z-40 gap-1">
        <div className="flex items-center bg-stone-900/95 p-0.5 rounded-lg border border-white/10 shadow-sm">
          <button type="button" className={`${btn} bg-amber-500 text-stone-950 border-transparent`} title="Không gian 3D thật">
            <BoxIcon className="w-3 h-3" /> 3D thật
          </button>
          <button
            type="button"
            onClick={() => changeMode('classic')}
            className={`${btn} text-stone-400 hover:text-white border-transparent shadow-none`}
            title="Bàn cờ cổ điển 2D / giả 3D (nhẹ hơn)"
          >
            <LayoutGrid className="w-3 h-3" /> Cổ điển
          </button>
        </div>
        <select
          value={bgScene}
          onChange={(e) => onSelectBgScene?.(e.target.value as typeof bgScene)}
          className="bg-stone-900/95 text-amber-300 border border-amber-500/40 rounded-lg px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold min-w-0 flex-1 max-w-[45%]"
          title="Chọn không gian quán cờ"
        >
          {SCENE_CONFIGS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.shortName}
            </option>
          ))}
        </select>
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsAnglePanelOpen((open) => !open)}
            aria-expanded={isAnglePanelOpen}
            className={`${btn} bg-stone-900/95 text-amber-300 border-amber-500/40 hover:bg-stone-800`}
            title="Điều chỉnh góc quan sát bàn cờ"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">Góc {cameraElevation}°</span>
          </button>
          {isAnglePanelOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-amber-500/40 bg-stone-950/95 p-3 shadow-xl">
              <label htmlFor="board-camera-elevation" className="mb-2 flex items-center justify-between text-[10px] font-semibold text-amber-200">
                <span>Góc quan sát</span>
                <span>{cameraElevation}°</span>
              </label>
              <input
                id="board-camera-elevation"
                type="range"
                min={18}
                max={78}
                step={1}
                value={cameraElevation}
                onChange={(e) => setCameraElevation(Number(e.currentTarget.value))}
                className="w-full accent-amber-400"
                aria-label="Góc nghiêng của bàn cờ"
              />
              <div className="mt-1 flex justify-between text-[9px] text-stone-400">
                <span>Thấp</span>
                <span>Cao</span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCameraView}
            className={`${btn} bg-stone-900/95 text-amber-300 border-amber-500/40 hover:bg-stone-800`}
            title={cameraView === 'player' ? 'Lùi ra xem toàn cảnh quán (khán giả)' : 'Về góc nhìn tập trung vào bàn cờ'}
          >
            {cameraView === 'player' ? <Eye className="w-3 h-3" /> : <Crosshair className="w-3 h-3" />}
            <span className="hidden sm:inline">{cameraView === 'player' ? 'Toàn cảnh' : 'Tập trung'}</span>
          </button>
          <button
            type="button"
            onClick={() => setResetSignal((n) => n + 1)}
            className={`${btn} bg-stone-900/95 text-amber-300 border-amber-500/40 hover:bg-stone-800`}
            title="Đặt lại góc nhìn"
          >
            <RotateCcw className="w-3 h-3" /> Góc nhìn
          </button>
        </div>
      </div>

        <div className="absolute inset-0 rounded-2xl overflow-hidden border border-amber-900/50 shadow-2xl bg-transparent">
        <Scene3DBoundary onError={() => changeMode('classic')}>
          <Suspense fallback={fallback}>
            <Board3DScene
              board={board}
              turn={turn}
              selectedPos={selectedPos}
              legalMoves={legalMoves}
              lastMove={lastMove}
              isCheck={isCheck}
              flipped={flipped}
              displayMode={displayMode}
              theme={theme}
              bgScene={bgScene}
              isLiteMode={isLiteMode}
              disabled={disabled}
              onSelectSquare={onSelectSquare}
              resetSignal={resetSignal}
              cameraView={cameraView}
              cameraElevation={cameraElevation}
            />
          </Suspense>
        </Scene3DBoundary>
        </div>

        {/* HTML overlays */}
        {commentary && isCommentaryVisible && (
          <div className="absolute left-0 right-0 top-8 z-30 flex justify-center px-1 pointer-events-auto">
            <div className="w-full max-w-[580px]">
              <MoveCommentaryBanner
                commentary={commentary}
                isVisible={isCommentaryVisible}
                onClose={onCloseCommentary || (() => {})}
                onRefreshComment={onRefreshCommentary}
                isLoadingAi={isLoadingAiCommentary}
                autoHideDuration={15000}
              />
            </div>
          </div>
        )}
        {revealNotice && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg border ${
                revealNotice.isHighValue ? 'bg-amber-500 text-stone-950 border-amber-300' : 'bg-stone-900/90 text-amber-200 border-amber-500/40'
              }`}
            >
              {revealNotice.text}
            </div>
          </div>
        )}
        {captureEffect && (
          <div key={captureEffect.id} className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in zoom-in-75">
            <div className={`px-4 py-1.5 rounded-xl text-sm sm:text-base font-black shadow-2xl border-2 ${captureEffect.isLoss ? 'bg-red-950/90 text-red-200 border-red-500' : 'bg-amber-500/95 text-stone-950 border-amber-200'}`}>
              {captureEffect.text}
            </div>
          </div>
        )}
        {luckyRevealEffect && ['chariot', 'cannon', 'horse'].includes(luckyRevealEffect.role) && (
          <div key={luckyRevealEffect.id} className="absolute top-[45%] left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in zoom-in-50">
            <div className="text-2xl sm:text-3xl font-black text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              ✨ {ROLE_VI_NAMES[luckyRevealEffect.role].red.toUpperCase()}! ✨
            </div>
          </div>
        )}
    </div>
  );
};

export const BoardView = React.memo(BoardViewComponent);
