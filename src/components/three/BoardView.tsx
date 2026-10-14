/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Board container: real 3D scene (default, lazy loaded) or the classic 2D / pseudo-3D board.
 * Takes exactly the same props as ChessBoard so App.tsx only swaps the component name.
 */
import React, { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { LayoutGrid, Box as BoxIcon, Palette } from 'lucide-react';
import { ChessBoard } from '../ChessBoard';
import { TableDrinkProp } from '../TableDrinkProp';
import { OpponentArmsProp } from '../OpponentArmsProp';
import { SCENE_CONFIGS } from '../../utils/backgroundScenes';
import { ROLE_VI_NAMES } from '../../utils/chessRules';
import { CameraPerspectiveMenu, ACTIVE_PERSPECTIVE_KEY } from './CameraPerspectiveMenu';
import type { SavedCameraPose } from './Board3DScene';

const Board3DScene = lazy(() => import('./Board3DScene'));

type BoardProps = React.ComponentProps<typeof ChessBoard> & { wide?: boolean; onViewModeChange?: (mode: BoardViewMode) => void };
export type BoardViewMode = 'real3d' | 'classic';

const VIEW_MODE_KEY = 'co_up_view_mode';
const CAMERA_VIEW_KEY = 'co_up_3d_camera';
const CUSTOM_POSE_KEY = 'co_up_custom_camera_pose';
type CameraView = 'player' | 'spectator';

const loadSavedPose = (): SavedCameraPose | null => {
  try {
    const raw = localStorage.getItem(CUSTOM_POSE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function loadViewMode(): BoardViewMode {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === 'real3d' ? 'real3d' : 'classic';
  } catch {
    return 'classic';
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
    try {
      const savedPresetId = localStorage.getItem(ACTIVE_PERSPECTIVE_KEY);
      if (savedPresetId === 'preset2') return 52;
    } catch {}
    return 72; // Mặc định Góc 1: Trực diện 72° bao quát 100% bàn cờ
  });

  const [cameraView, setCameraView] = useState<CameraView>(() => {
    try {
      return localStorage.getItem(CAMERA_VIEW_KEY) === 'spectator' ? 'spectator' : 'player';
    } catch {
      return 'player';
    }
  });

  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);

  // Quản lý Lưu góc & Khôi phục góc nhìn tùy chỉnh
  const livePoseRef = useRef<SavedCameraPose | null>(null);
  const [hasUnsavedPose, setHasUnsavedPose] = useState(false);
  const [savedPose, setSavedPose] = useState<SavedCameraPose | null>(loadSavedPose);
  const [restoreCustomSignal, setRestoreCustomSignal] = useState(0);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activePresetId, setActivePresetId] = useState<'preset1' | 'preset2' | 'preset3' | 'custom'>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_PERSPECTIVE_KEY);
      if (saved === 'preset2') return 'preset2';
      if (saved === 'preset3') return 'preset3';
      if (saved === 'custom') return 'custom';
    } catch {}
    return 'preset1';
  });

  const showToast = useCallback((msg: string) => {
    setToastNotice(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastNotice(null);
      toastTimerRef.current = null;
    }, 2400);
  }, []);

  const handleCameraPoseChange = useCallback((pose: SavedCameraPose) => {
    livePoseRef.current = pose;
    setHasUnsavedPose(true);
  }, []);

  const handleOpenCustomPose = useCallback(() => {
    if (savedPose) {
      setRestoreCustomSignal((n) => n + 1);
      setActivePresetId('custom');
      setHasUnsavedPose(false);
      try {
        localStorage.setItem(ACTIVE_PERSPECTIVE_KEY, 'custom');
      } catch {}
      showToast('⭐ Đã mở góc nhìn của bạn!');
    } else {
      showToast('Bạn chưa lưu góc nào. Hãy chỉnh góc rồi bấm "Lưu góc" nhé!');
    }
  }, [savedPose, showToast]);

  const handleSaveCurrentPose = useCallback(() => {
    const currentPose = livePoseRef.current;
    if (currentPose) {
      try {
        localStorage.setItem(CUSTOM_POSE_KEY, JSON.stringify(currentPose));
        localStorage.setItem(ACTIVE_PERSPECTIVE_KEY, 'custom');
      } catch {}
      setSavedPose(currentPose);
      setHasUnsavedPose(false);
      setActivePresetId('custom');
      showToast('💾 Đã lưu góc nhìn hiện tại! Bấm "Góc tôi" để mở lại bất cứ lúc nào');
    }
  }, [showToast]);

  useEffect(() => {
    if (activePresetId === 'custom' && savedPose) {
      setRestoreCustomSignal(1);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* Toolbar dọc đặt bên lề ngoài bàn cờ: dịch hẳn sang lề trái, nút siêu nhỏ gọn và có thể thu gọn */}
      {isToolbarCollapsed ? (
        <button
          type="button"
          onClick={() => setIsToolbarCollapsed(false)}
          className="absolute top-1.5 left-0.5 sm:-left-3 md:-left-6 lg:-left-7 z-40 p-1 bg-stone-950/90 hover:bg-stone-800 text-amber-300 border border-amber-500/40 rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-105"
          title="Mở menu tùy chọn & góc nhìn 3D"
        >
          <span className="text-xs">📐</span>
        </button>
      ) : (
        <div className="absolute top-1.5 left-0.5 sm:-left-3 md:-left-6 lg:-left-7 z-40 flex flex-col items-start gap-1 w-[72px] sm:w-[76px] pointer-events-auto bg-stone-950/90 backdrop-blur-md p-1 rounded-lg border border-amber-500/30 shadow-xl select-none group">
          {/* Nút thu nhỏ menu */}
          <button
            type="button"
            onClick={() => setIsToolbarCollapsed(true)}
            className="absolute -top-1.5 -right-1.5 z-50 w-3.5 h-3.5 rounded-full bg-stone-900 text-stone-400 hover:text-white border border-white/20 flex items-center justify-center text-[8px] opacity-70 hover:opacity-100 transition-opacity"
            title="Thu gọn menu"
          >
            ✕
          </button>

          {/* Nút Đổi Bộ cờ & Chuyển 2D siêu nhỏ */}
          <div className="flex items-center gap-0.5 w-full">
            {onOpenCustomization && (
              <button
                type="button"
                onClick={onOpenCustomization}
                className="flex-1 flex items-center justify-center gap-0.5 bg-stone-900/95 hover:bg-stone-800 text-amber-300 border border-amber-500/40 rounded px-1 py-0.5 text-[9px] font-bold shadow-sm transition-all"
                title="Đổi mẫu Bàn Cờ & Quân Cờ nghệ thuật"
              >
                <Palette className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span>Cờ</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => changeMode('classic')}
              className="flex-1 flex items-center justify-center gap-0.5 text-stone-300 hover:text-white bg-stone-900/95 border border-white/10 rounded px-1 py-0.5 text-[9px] font-bold shadow-sm transition-all"
              title="Chuyển về bàn cờ 2D cổ điển"
            >
              <LayoutGrid className="w-2.5 h-2.5 text-stone-400 shrink-0" />
              <span>2D</span>
            </button>
          </div>

          {/* Lựa chọn không gian quán cờ mini */}
          <select
            value={bgScene}
            onChange={(e) => onSelectBgScene?.(e.target.value as typeof bgScene)}
            className="w-full bg-stone-900/95 text-amber-300 border border-amber-500/40 rounded px-1 py-0.5 text-[9px] font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer shadow-sm truncate"
            title="Chọn không gian quán cờ"
          >
            {SCENE_CONFIGS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.shortName}
              </option>
            ))}
          </select>

          {/* 3 Nút chọn góc nhìn 3D mini & Lưu góc */}
          <CameraPerspectiveMenu
            cameraElevation={cameraElevation}
            setCameraElevation={setCameraElevation}
            cameraView={cameraView}
            setCameraView={setCameraView}
            onTriggerResetSignal={handleTriggerResetSignal}
            bgScene={bgScene}
            vertical={true}
            activePresetId={activePresetId}
            onSelectPreset={(id) => {
              setActivePresetId(id);
              setHasUnsavedPose(false);
            }}
            hasUnsavedPose={hasUnsavedPose}
            hasSavedPose={Boolean(savedPose)}
            onOpenCustomPose={handleOpenCustomPose}
            onSaveCurrentPose={handleSaveCurrentPose}
          />
        </div>
      )}

      {/* Toast thông báo lưu góc nhìn */}
      {toastNotice && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          <div className="px-3 py-1 bg-stone-950/95 border border-amber-500/80 text-amber-300 font-bold text-xs rounded-full shadow-2xl backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap">
            <span>💾</span>
            <span>{toastNotice}</span>
          </div>
        </div>
      )}

      <div className="absolute inset-0 overflow-hidden bg-transparent">
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
              customPose={savedPose}
              restoreCustomSignal={restoreCustomSignal}
              onCameraPoseChange={handleCameraPoseChange}
            />
          </Suspense>
        </Scene3DBoundary>
        </div>

        {/* Cánh tay thật của đối thủ đặt trên bàn cờ từ góc nhìn thứ nhất (ngồi đối diện) */}
        {cameraView === 'player' && (
          <OpponentArmsProp
            isThinking={turn === 'black'}
            is3D={true}
          />
        )}

        {/* Đạo cụ ly trà đá / tách cà phê chân thực góc bàn cờ */}
        {onDrinkSip && (
          <TableDrinkProp
            bgScene={bgScene}
            onTakeSip={onDrinkSip}
            is3D={true}
          />
        )}

        {/* HTML overlays */}
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
