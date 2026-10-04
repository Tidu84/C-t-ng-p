/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Board container: real 3D scene (default, lazy loaded) or the classic 2D / pseudo-3D board.
 * Takes exactly the same props as ChessBoard so App.tsx only swaps the component name.
 */
import React, { Component, Suspense, lazy, useCallback, useState } from 'react';
import { RotateCcw, LayoutGrid, Box as BoxIcon, Eye, Crosshair } from 'lucide-react';
import { ChessBoard } from '../ChessBoard';
import { MoveCommentaryBanner } from '../MoveCommentaryBanner';
import { TableDrinkProp } from '../TableDrinkProp';
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
  const [cameraView, setCameraView] = useState<CameraView>(() => {
    try {
      return localStorage.getItem(CAMERA_VIEW_KEY) === 'spectator' ? 'spectator' : 'player';
    } catch {
      return 'player';
    }
  });
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
      <div className="relative w-full">
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
    <div className="relative w-full max-h-full mx-auto" style={{ aspectRatio: wide ? '1.2 / 1' : '8 / 9' }}>
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
        <div className="flex items-center gap-1">
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

        <div className="absolute inset-0 rounded-2xl overflow-hidden border border-amber-900/50 shadow-2xl bg-stone-950">
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
        {/* drink glass sits beside the far-right corner of the board (the close camera leaves room there),
            so it never covers pieces; its speech bubble may overflow the canvas */}
        {onDrinkSip && (
          <div className="absolute right-0 top-[19%] w-16 h-16 sm:w-24 sm:h-24 z-20 pointer-events-none [&>*]:pointer-events-auto">
            <TableDrinkProp bgScene={bgScene} onTakeSip={onDrinkSip} is3D />
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
