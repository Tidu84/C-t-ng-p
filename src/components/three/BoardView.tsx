/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Board container: real 3D scene (default, lazy loaded) or the classic 2D / pseudo-3D board.
 * Takes exactly the same props as ChessBoard so App.tsx only swaps the component name.
 */
import React, { Component, Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { LayoutGrid, Box as BoxIcon, Palette } from 'lucide-react';
import { ChessBoard } from '../ChessBoard';
import { MoveCommentaryBanner } from '../MoveCommentaryBanner';
import { TableDrinkProp } from '../TableDrinkProp';
import { SCENE_CONFIGS } from '../../utils/backgroundScenes';
import { ROLE_VI_NAMES } from '../../utils/chessRules';
import { CameraPerspectiveMenu } from './CameraPerspectiveMenu';

const Board3DScene = lazy(() => import('./Board3DScene'));

type BoardProps = React.ComponentProps<typeof ChessBoard> & { wide?: boolean; onViewModeChange?: (mode: BoardViewMode) => void };
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
  const { wide = false, onViewModeChange, ...boardProps } = props;
  const [mode, setMode] = useState<BoardViewMode>(loadViewMode);
  useEffect(() => onViewModeChange?.(mode), [mode, onViewModeChange]);
  const [resetSignal, setResetSignal] = useState(0);
  const handleTriggerResetSignal = useCallback(() => setResetSignal((n) => n + 1), []);

  const [cameraElevation, setCameraElevation] = useState<number>(() => {
    return (props.bgScene ?? 'tra_da') === 'tra_da' ? 52 : 60;
  });

  const [cameraView, setCameraView] = useState<CameraView>(() => {
    try {
      return localStorage.getItem(CAMERA_VIEW_KEY) === 'spectator' ? 'spectator' : 'player';
    } catch {
      return 'player';
    }
  });

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
        style={wide
          ? { width: "min(calc((100dvh - 24px) * (9 / 16)), 100%)" }
          : { width: "min(880px, 99.5vw, calc((100dvh - 118px) * 0.888))" }}
      >
        <ChessBoard {...boardProps} />
        {hasWebGL() && (
          <button
            type="button"
            onClick={() => changeMode('real3d')}
            className={`${btn} absolute left-1 bottom-1 z-30 bg-stone-900/90 text-amber-300 border-amber-500/50 hover:bg-stone-800`}
            title="Chuyển sang không gian 3D: ngồi tại bàn cờ"
          >
            <BoxIcon className="w-3 h-3" /> 3D
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
    riverMode = 'blank',
    bgScene = 'tra_da',
    isLiteMode = false,
    disabled = false,
    onSelectSquare,
    onSelectBgScene,
    onOpenCustomization,
    revealNotice,
    captureEffect,
    luckyRevealEffect,
    cannonBlastEffect,
    onCannonBlastComplete,
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

  const currentSceneConfig = SCENE_CONFIGS.find((s) => s.id === bgScene) || SCENE_CONFIGS[0];

  return (
    // 8:9 like the classic board, but never taller than the available space (the camera framing adapts
    // to whatever aspect ratio results)
    <div
      className="relative w-full max-h-full mx-auto"
      style={{
        // Fill the available board viewport edge to edge; this branch only renders real 3D.
        // The classic board returns above and keeps its original sizing.
        width: window.innerWidth <= 1024
          ? wide
            ? 'min(calc((100dvh - 24px) * 1.5), calc(100vw - 210px))'
            : 'calc(100vw - 12px)'
          : '100%',
        height: '100%',
        maxWidth: 'none',
      }}
    >
      {/* Background Image of the selected venue (Quán trà đá, cà phê, hoa viên, đấu trường...) */}
      {currentSceneConfig?.imageUrl && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0 transition-opacity duration-700">
          <img
            src={currentSceneConfig.imageUrl}
            alt={currentSceneConfig.name}
            className="w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.08] transition-all duration-500"
          />
          {/* Atmospheric tabletop vignette overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0.06) 0%, rgba(20,12,6,0.36) 55%, rgba(6,3,1,0.85) 100%)',
            }}
          />
        </div>
      )}

      {/* toolbar overlaid on the top edge (environment area) so the 3D view keeps the exact 8:9 footprint
          of the classic board and fits the same height-constrained layout */}
      <div className="absolute top-1 left-1 right-1 flex items-center justify-between z-40 gap-1">
        <div className="flex items-center gap-1 shrink-0">
          {onOpenCustomization && (
            <button
              type="button"
              onClick={onOpenCustomization}
              className={`${btn} bg-stone-900/95 hover:bg-stone-800 text-amber-300 border-amber-500/40`}
              title="Đổi mẫu Bàn Cờ & Quân Cờ nghệ thuật"
            >
              <Palette className="w-3 h-3 text-amber-400" />
              <span className="font-bold hidden sm:inline">Bộ Cờ</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => changeMode('classic')}
            className={`${btn} text-stone-400 hover:text-white bg-stone-900/95 border-white/10`}
            title="Chuyển về bàn cờ 2D cổ điển"
          >
            <LayoutGrid className="w-3 h-3" />
            <span>2D</span>
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
        <CameraPerspectiveMenu
          cameraElevation={cameraElevation}
          setCameraElevation={setCameraElevation}
          cameraView={cameraView}
          setCameraView={setCameraView}
          onTriggerResetSignal={handleTriggerResetSignal}
          bgScene={bgScene}
        />
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
              riverMode={riverMode}
              bgScene={bgScene}
              isLiteMode={isLiteMode}
              disabled={disabled}
              onSelectSquare={onSelectSquare}
              resetSignal={resetSignal}
              cameraView={cameraView}
              cameraElevation={cameraElevation}
              cannonBlast={cannonBlastEffect}
              onCannonBlastComplete={onCannonBlastComplete}
            />
          </Suspense>
        </Scene3DBoundary>
        </div>

        {/* Đạo cụ ly trà đá / tách cà phê chân thực góc bàn cờ */}
        {onDrinkSip && (
          <TableDrinkProp
            bgScene={bgScene}
            onTakeSip={onDrinkSip}
            is3D={true}
          />
        )}

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
        {cannonBlastEffect && (
          <div key={cannonBlastEffect.id} className="absolute top-[38%] left-1/2 -translate-x-1/2 z-35 pointer-events-none animate-in fade-in zoom-in-75 duration-300">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-stone-950 font-black text-sm sm:text-base shadow-[0_0_25px_rgba(239,68,68,0.9)] border-2 border-amber-200 uppercase tracking-widest drop-shadow-xl animate-bounce">
              <span>🔥</span>
              <span className="font-thu-phap text-base sm:text-lg">PHÁO KHAI HỎA!</span>
              <span>💥</span>
            </div>
          </div>
        )}
    </div>
  );
};

export const BoardView = React.memo(BoardViewComponent);
