/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import confetti from 'canvas-confetti';
import {
  AiDifficulty,
  AiThinkingStats,
  BackgroundScene3D,
  BoardPerspective,
  BoardTheme,
  PieceTheme,
  GameMode,
  LabelDisplayMode,
  Move,
  Piece,
  PlayerColor,
  Position,
  PlayerProfile,
  RiverTextMode,
  SavedMatch,
  ActiveGameSave,
  VenueType,
  PlayerStats,
  PieceRole,
} from './types';
import {
  checkMoveRepetitionRules,
  formatMoveNotation,
  getAllLegalMoves,
  getLegalMoves,
  initializeBoard,
  isKingInCheck,
  ROLE_VI_NAMES,
} from './utils/chessRules';
import { searchBestMoveAsync } from './utils/aiEngine';
import { sound } from './utils/audio';
import { triggerDeviceVibration, initIOSHaptic, getVibrationEnabled } from './utils/vibration';
import { detectCheckmatePattern, CheckmatePattern } from './utils/checkmatePatterns';
import { VENUES } from './utils/venues';
import { SCENE_CONFIGS } from './utils/backgroundScenes';
import { getRandomResignQuote, getRandomDrawQuote } from './utils/encouragingQuotes';
import { ChessBoard } from './components/ChessBoard';
import { GameControls } from './components/GameControls';
import { AiThinkingPanel } from './components/AiThinkingPanel';
import { MoveHistory } from './components/MoveHistory';
import { MobilePlayerHeader } from './components/MobilePlayerHeader';
import {
  evaluateMoveQuality,
  fetchAiMoveCommentary,
  SIDEWALK_SPECTATORS,
  SCENE_SPECTATORS,
} from './utils/moveCommentary';
import { MoveCommentary } from './types';

// Tối ưu hóa tải nhanh khi dev & giảm kích thước bundle bằng dynamic lazy loading
const RulesModal = lazy(() => import('./components/RulesModal').then((m) => ({ default: m.RulesModal })));
const VictoryModal = lazy(() => import('./components/VictoryModal').then((m) => ({ default: m.VictoryModal })));
const UserProfileModal = lazy(() => import('./components/UserProfileModal').then((m) => ({ default: m.UserProfileModal })));
const MatchHistoryModal = lazy(() => import('./components/MatchHistoryModal').then((m) => ({ default: m.MatchHistoryModal })));
const ConfirmActionModal = lazy(() => import('./components/ConfirmActionModal').then((m) => ({ default: m.ConfirmActionModal })));
const SoundSettingsModal = lazy(() => import('./components/SoundSettingsModal').then((m) => ({ default: m.SoundSettingsModal })));
const CustomizationModal = lazy(() => import('./components/CustomizationModal').then((m) => ({ default: m.CustomizationModal })));
import {
  ChessThemeSetId,
  getThemeSetById,
  findMatchingThemeSet,
  CHESS_THEME_SETS,
} from './utils/themeStyles';
import {
  AlertTriangle,
  Sparkles,
  Award,
  RotateCcw,
  Handshake,
  Flag,
  Save,
  Grid,
  FileText,
  Settings,
  Check,
  Volume2,
  Music,
  Zap,
  Palette,
  MessageSquareQuote,
} from 'lucide-react';

type BoardPopup =
  | { type: 'reveal'; id: number; payload: { text: string; isHighValue: boolean } }
  | { type: 'capture'; id: number; payload: { pos: Position; text: string; isLoss: boolean } }
  | { type: 'luckyReveal'; id: number; payload: { pos: Position; role: PieceRole } };

interface HistorySnapshot {
  board: (Piece | null)[][];
  turn: PlayerColor;
  capturedByRed: Piece[];
  capturedByBlack: Piece[];
  lastMove: Move | null;
}

const DEFAULT_PROFILE: PlayerProfile = {
  name: 'Kỳ Thủ',
  avatar: '🐱',
  isCustomAvatar: false,
};

export default function App() {
  // Game State
  const [board, setBoard] = useState<(Piece | null)[][]>(() => initializeBoard());
  const [turn, setTurn] = useState<PlayerColor>('red');
  const [winner, setWinner] = useState<PlayerColor | 'draw' | null>(null);
  const [isStalemate, setIsStalemate] = useState<boolean>(false);
  const [isCheck, setIsCheck] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [capturedByRed, setCapturedByRed] = useState<Piece[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<Piece[]>([]);
  const [historyStack, setHistoryStack] = useState<HistorySnapshot[]>([]);

  // Interaction State
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [hintMove, setHintMove] = useState<{ from: Position; to: Position } | null>(null);
  const [boardPopup, setBoardPopup] = useState<BoardPopup | null>(null);
  const boardPopupQueueRef = useRef<BoardPopup[]>([]);
  const boardPopupIdRef = useRef(0);

  const enqueueBoardPopup = useCallback((popup: BoardPopup) => {
    const nextPopup = { ...popup, id: ++boardPopupIdRef.current } as BoardPopup;
    boardPopupQueueRef.current.push(nextPopup);
    if (boardPopupQueueRef.current.length === 1) setBoardPopup(nextPopup);
  }, []);

  useEffect(() => {
    if (!boardPopup) return;
    const timer = setTimeout(() => {
      boardPopupQueueRef.current.shift();
      setBoardPopup(boardPopupQueueRef.current[0] ?? null);
    }, 9000);
    return () => clearTimeout(timer);
  }, [boardPopup]);
  const [ruleWarning, setRuleWarning] = useState<string | null>(null);
  const [customToast, setCustomToast] = useState<string | null>(null);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(true);

  // Move Commentary (Nhận xét nước đi / Bình luận vỉa hè)
  const [commentaryEnabled, setCommentaryEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('co_up_commentary_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [currentCommentary, setCurrentCommentary] = useState<MoveCommentary | null>(null);
  const [isCommentaryVisible, setIsCommentaryVisible] = useState<boolean>(false);
  const [isLoadingAiCommentary, setIsLoadingAiCommentary] = useState<boolean>(false);
  const commentaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideCommentary = useCallback(() => {
    if (commentaryTimerRef.current) {
      clearTimeout(commentaryTimerRef.current);
      commentaryTimerRef.current = null;
    }
    setIsCommentaryVisible(false);
  }, []);

  const showCommentary = useCallback((comm: MoveCommentary, durationMs: number = 9000) => {
    if (commentaryTimerRef.current) {
      clearTimeout(commentaryTimerRef.current);
    }
    setCurrentCommentary(comm);
    setIsCommentaryVisible(true);
    commentaryTimerRef.current = setTimeout(() => {
      setIsCommentaryVisible(false);
      commentaryTimerRef.current = null;
    }, Math.min(durationMs, 9000));
  }, []);

  const resetCommentaryTimer = useCallback((durationMs: number = 9000) => {
    if (commentaryTimerRef.current) {
      clearTimeout(commentaryTimerRef.current);
    }
    setIsCommentaryVisible(true);
    commentaryTimerRef.current = setTimeout(() => {
      setIsCommentaryVisible(false);
      commentaryTimerRef.current = null;
    }, Math.min(durationMs, 9000));
  }, []);

  // Settings & Themes
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<AiDifficulty>('hard');
  const [aiThinkingTime, setAiThinkingTime] = useState<number>(10);
  const [aiStats, setAiStats] = useState<AiThinkingStats | null>(null);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [displayMode, setDisplayMode] = useState<LabelDisplayMode>('both');
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(() => {
    try {
      const saved = localStorage.getItem('co_up_board_theme');
      if (saved && ['giang_ho', 'hoang_duong', 'mun_hoa', 'go_do', 'ngoc_bich', 'sa_ban', 'quan_coc', 'ky_vien', 'go_moc'].includes(saved)) {
        return saved as BoardTheme;
      }
      return 'giang_ho';
    } catch {
      return 'giang_ho';
    }
  });
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>(() => {
    try {
      const saved = localStorage.getItem('co_up_piece_theme');
      if (saved && ['giang_ho', 'hoang_kim', 'bach_ngoc', 'dong_co', 'gom_su', 'thach_anh'].includes(saved)) {
        return saved as PieceTheme;
      }
      return 'giang_ho';
    } catch {
      return 'giang_ho';
    }
  });
  const [isCustomizationOpen, setIsCustomizationOpen] = useState<boolean>(false);
  const [perspective, setPerspective] = useState<BoardPerspective>(() => {
    try {
      const saved = localStorage.getItem('co_up_perspective');
      if (saved) return saved === '3d' ? '3d' : '2d';
      // Default to 2D for high-speed buttery smooth 60-90 FPS on mobile and low-spec devices
      return '2d';
    } catch {
      return '2d';
    }
  });
  const [riverMode, setRiverMode] = useState<RiverTextMode>(() => {
    try {
      const saved = localStorage.getItem('co_up_river_mode');
      if (!saved || saved === 'han') {
        localStorage.setItem('co_up_river_mode', 'blank');
        return 'blank';
      }
      return (saved as RiverTextMode) || 'blank';
    } catch {
      return 'blank';
    }
  });
  const [bgScene, setBgScene] = useState<BackgroundScene3D>(() => {
    try {
      const saved = localStorage.getItem('co_up_bg_scene');
      if (saved && ['tra_da', 'ca_phe', 'hoa_vien', 'dau_truong', 'go_tram'].includes(saved)) {
        return saved as BackgroundScene3D;
      }
      return 'tra_da';
    } catch {
      return 'tra_da';
    }
  });

  const handleSelectBgScene = (scene: BackgroundScene3D) => {
    setBgScene(scene);
    try {
      localStorage.setItem('co_up_bg_scene', scene);
    } catch {}

    // Đồng bộ sang Không gian quán cờ tương ứng
    const foundVenue = Object.values(VENUES).find((v) => v.matchingScene === scene);
    if (foundVenue) {
      setVenue(foundVenue.id);
      try {
        localStorage.setItem('co_up_venue', foundVenue.id);
      } catch {}
    }

    // Cập nhật người bình luận sang nhân vật của khung cảnh mới nếu đang có nước cờ
    if (lastMove && commentaryEnabled) {
      const sceneSpectators = SCENE_SPECTATORS[scene] || SCENE_SPECTATORS.tra_da;
      const spectator = sceneSpectators[Math.floor(Math.random() * sceneSpectators.length)];
      const prevB = historyStack.length > 0 ? historyStack[historyStack.length - 1].board : board;
      const refreshed = evaluateMoveQuality(prevB, board, lastMove, lastMove.piece.color, scene, spectator);
      showCommentary(refreshed, 15000);
    }
  };

  const activeSceneConfig = useMemo(() => {
    return SCENE_CONFIGS.find((s) => s.id === bgScene) || SCENE_CONFIGS[0];
  }, [bgScene]);

  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const aiRunningRef = useRef<boolean>(false);

  const handleTogglePerspective = () => {
    setPerspective((prev) => {
      const next: BoardPerspective = prev === '3d' ? '2d' : '3d';
      try {
        localStorage.setItem('co_up_perspective', next);
      } catch {}
      return next;
    });
  };

  const handleCycleRiverMode = () => {
    setRiverMode((prev) => {
      const next: RiverTextMode =
        prev === 'blank'
          ? 'proverb'
          : prev === 'proverb'
          ? 'plain'
          : 'blank';
      try {
        localStorage.setItem('co_up_river_mode', next);
      } catch {}
      return next;
    });
  };

  // Lite Mode (Tối ưu mượt mà 60fps trên Poco M4 Pro & máy cấu hình thấp)
  const [isLiteMode, setIsLiteMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('co_up_lite_mode');
      if (saved !== null) return saved === 'true';
      if (
        typeof navigator !== 'undefined' &&
        typeof window !== 'undefined' &&
        ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 8) ||
          /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
          window.innerWidth < 768)
      ) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  const handleToggleLiteMode = () => {
    setIsLiteMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('co_up_lite_mode', String(next));
      } catch {}
      setCustomToast(next ? '⚡ Đã bật: Máy yếu' : '🎨 Đã bật: Đồ họa đầy đủ');
      setTimeout(() => setCustomToast(null), 3000);
      return next;
    });
  };

  // Profile & History & Modals State
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(() => {
    try {
      const saved = localStorage.getItem('co_up_player_profile');
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  const [savedMatches, setSavedMatches] = useState<SavedMatch[]>(() => {
    try {
      const saved = localStorage.getItem('co_up_saved_matches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isMatchSavedInCurrentGame, setIsMatchSavedInCurrentGame] = useState<boolean>(false);

  // Active Draft Save State
  const [savedDraft, setSavedDraft] = useState<ActiveGameSave | null>(() => {
    try {
      const saved = localStorage.getItem('co_up_saved_active_game');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Player Progression & Stats (Danh hiệu kỳ thủ)
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => {
    try {
      const saved = localStorage.getItem('co_up_player_stats');
      return saved ? JSON.parse(saved) : { wins: 0, losses: 0, draws: 0 };
    } catch {
      return { wins: 0, losses: 0, draws: 0 };
    }
  });

  // Venue selection (Không gian Quán Cờ)
  const [venue, setVenue] = useState<VenueType>(() => {
    try {
      const saved = localStorage.getItem('co_up_venue') as VenueType;
      return saved && VENUES[saved] ? saved : 'via_he';
    } catch {
      return 'via_he';
    }
  });

  const handleSetVenue = (newVenue: VenueType) => {
    setVenue(newVenue);
    try {
      localStorage.setItem('co_up_venue', newVenue);
    } catch {}

    const venueInfo = VENUES[newVenue];
    if (venueInfo && venueInfo.matchingScene) {
      setBgScene(venueInfo.matchingScene);
      try {
        localStorage.setItem('co_up_bg_scene', venueInfo.matchingScene);
      } catch {}

      // Tự động cập nhật ngay lời bình luận theo đúng phong cách của không gian mới
      if (lastMove && commentaryEnabled) {
        const sceneSpectators = SCENE_SPECTATORS[venueInfo.matchingScene] || SCENE_SPECTATORS.tra_da;
        const spectator = sceneSpectators[Math.floor(Math.random() * sceneSpectators.length)];
        const prevB = historyStack.length > 0 ? historyStack[historyStack.length - 1].board : board;
        const refreshed = evaluateMoveQuality(prevB, board, lastMove, lastMove.piece.color, venueInfo.matchingScene, spectator);
        showCommentary(refreshed, 15000);
      }
    }

    setCustomToast(`🏮 ${venueInfo?.name || 'Không gian'}: ${venueInfo?.commentaryStyle || ''}`);
    setTimeout(() => setCustomToast(null), 3000);
  };

  // Traditional Instrument / Guitar Background Music
  const [isBgmOn, setIsBgmOn] = useState<boolean>(false);
  const handleToggleBgm = () => {
    const playing = sound.toggleBgm();
    setIsBgmOn(playing);
    const inst = sound.getConfig().bgmInstrument;
    const instName = inst === 'guzheng' ? 'Đàn Cổ Tranh 21 Dây' : inst === 'pipa_yueqin' ? 'Đàn Tỳ Bà & Đàn Nguyệt' : 'Guitar Mộc Am';
    setCustomToast(playing ? `🪕 Đang tấu ${instName} thanh tao...` : '🔇 Đã dừng nhạc nền');
    setTimeout(() => setCustomToast(null), 2500);
  };

  // Capture and lucky reveal notifications use the single board popup queue.

  // Drink sip handler (Chạm uống trà đá / cà phê góc bàn)
  const handleDrinkSip = (quote: string, avatar: string, name: string) => {
    showCommentary({
      id: `drink-${Date.now()}`,
      comment: quote,
      grade: 'tactical_flip',
      gradeLabel: 'Giải khát',
      spectatorName: name,
      spectatorAvatar: avatar,
      tagColor: 'text-amber-300',
      badgeIcon: avatar,
      moveNotation: 'Quán Nước',
      isAiGenerated: false,
    }, 12000);
  };

  // Board vibration shake state & timer (hiệu ứng rung chấn bàn cờ khi ăn quân)
  const [isBoardShaking, setIsBoardShaking] = useState<boolean>(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerBoardShake = useCallback(() => {
    if (shakeTimerRef.current) {
      clearTimeout(shakeTimerRef.current);
    }
    setIsBoardShaking(true);
    shakeTimerRef.current = setTimeout(() => {
      setIsBoardShaking(false);
      shakeTimerRef.current = null;
    }, 550);
  }, []);

  // Motivational quote for resign or draw
  const [encouragingQuote, setEncouragingQuote] = useState<string>('');

  // Confirm Action Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'draw' | 'resign' | 'resume' | null;
  }>({
    isOpen: false,
    type: null,
  });

  // Sound Settings Modal state
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState<boolean>(false);

  // Active replay match for reviewing finished game
  const [activeReplayMatch, setActiveReplayMatch] = useState<SavedMatch | null>(null);

  const handleReplayCurrentGame = () => {
    const replayMatch: SavedMatch = {
      id: 'replay_' + Date.now(),
      timestamp: Date.now(),
      dateStr:
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
        ' ' +
        new Date().toLocaleDateString('vi-VN'),
      playerName: playerProfile.name,
      playerAvatar: playerProfile.avatar,
      gameMode,
      difficulty,
      winner: winner || 'draw',
      patternName: checkmatePattern?.name,
      totalMoves: moveHistory.length,
      initialBoard: historyStack.length > 0 ? historyStack[0].board : initializeBoard(),
      moves: moveHistory,
    };
    setActiveReplayMatch(replayMatch);
    setShowVictoryModal(false);
    setIsHistoryOpen(true);
  };

  // Mobile View Tab state (on screens < 768px)
  const [mobileTab, setMobileTab] = useState<'board' | 'notation' | 'trays' | 'settings'>('board');

  // Mobile landscape detection (< 1024px width and horizontal orientation)
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > window.innerHeight && window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    initIOSHaptic();
    const handleResize = () => {
      const isLand = window.innerWidth > window.innerHeight && window.innerWidth < 1024;
      setIsLandscape(isLand);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Sound sync
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setEnabled(next);
  };

  const cycleDisplayMode = () => {
    setDisplayMode((prev) => {
      if (prev === 'both') return 'han';
      if (prev === 'han') return 'vi';
      return 'both';
    });
  };

  const handleSelectBoardTheme = (theme: BoardTheme) => {
    setBoardTheme(theme);
    try {
      localStorage.setItem('co_up_board_theme', theme);
    } catch {}
  };

  const handleSelectPieceTheme = (theme: PieceTheme) => {
    setPieceTheme(theme);
    try {
      localStorage.setItem('co_up_piece_theme', theme);
    } catch {}
  };

  const handleSelectThemeSet = (setId: ChessThemeSetId) => {
    const set = getThemeSetById(setId);
    setBoardTheme(set.boardTheme);
    setPieceTheme(set.pieceTheme);
    try {
      localStorage.setItem('co_up_board_theme', set.boardTheme);
      localStorage.setItem('co_up_piece_theme', set.pieceTheme);
      localStorage.setItem('co_up_theme_set', set.id);
    } catch {}
  };

  const toggleBoardTheme = () => {
    const currentMatchingSet = findMatchingThemeSet(boardTheme, pieceTheme);
    const sets = CHESS_THEME_SETS;
    const currentIdx = currentMatchingSet ? sets.findIndex((s) => s.id === currentMatchingSet.id) : 0;
    const nextSet = sets[(currentIdx + 1) % sets.length];
    handleSelectThemeSet(nextSet.id);
  };

  // Checkmate pattern computation
  const checkmatePattern: CheckmatePattern | null = useMemo(() => {
    if (!winner) return null;
    if (winner === 'draw') {
      return {
        id: 'draw_match',
        name: 'Cục: Kỳ Hòa Vi Quý',
        subtitle: 'Bách biến thiên hóa - Đồng quy ư hòa',
        description: 'Ván cờ kết thúc hòa hoãn sau những nước giằng co kịch tính.',
        image: '/ink_chariot_art.png',
        poem: 'Cờ hòa một nước đẹp đôi bên,\nKỳ nghệ thăng hoa tiếng lưu truyền.',
        badge: 'HÒA CUỘC',
      };
    }
    return detectCheckmatePattern(lastMove, board, winner, moveHistory.length, isStalemate);
  }, [winner, lastMove, board, moveHistory.length, isStalemate]);

  // Reset Game
  const startNewGame = useCallback(() => {
    aiRunningRef.current = false;
    const freshBoard = initializeBoard();
    setBoard(freshBoard);
    setTurn('red');
    setWinner(null);
    setIsStalemate(false);
    setIsCheck(false);
    setLastMove(null);
    setMoveHistory([]);
    setCapturedByRed([]);
    setCapturedByBlack([]);
    setHistoryStack([]);
    setSelectedPos(null);
    setLegalMoves([]);
    setHintMove(null);
    setIsAiThinking(false);
    setAiStats(null);
    boardPopupQueueRef.current = [];
    setBoardPopup(null);
    setRuleWarning(null);
    setCustomToast(null);
    setShowVictoryModal(true);
    setIsMatchSavedInCurrentGame(false);
    setCurrentCommentary(null);
    setIsCommentaryVisible(false);
  }, []);

  // Save Player Profile
  const handleSaveProfile = (newProfile: PlayerProfile) => {
    setPlayerProfile(newProfile);
    try {
      localStorage.setItem('co_up_player_profile', JSON.stringify(newProfile));
    } catch {}
    setCustomToast('Đã lưu hồ sơ kỳ thủ thành công!');
    setTimeout(() => setCustomToast(null), 3000);
  };

  // Save Current Game Draft (Chơi tiếp tí nữa)
  const handleSaveDraft = () => {
    const draft: ActiveGameSave = {
      timestamp: Date.now(),
      dateStr:
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
        ' ' +
        new Date().toLocaleDateString('vi-VN'),
      board,
      turn,
      winner,
      lastMove,
      moveHistory,
      capturedByRed,
      capturedByBlack,
      gameMode,
      difficulty,
    };
    try {
      localStorage.setItem('co_up_saved_active_game', JSON.stringify(draft));
      setSavedDraft(draft);
      setCustomToast('💾 Đã lưu ván cờ thành công! Bạn có thể tiếp tục chơi bất cứ lúc nào.');
      setTimeout(() => setCustomToast(null), 4000);
    } catch {
      setCustomToast('Không thể lưu ván cờ vào bộ nhớ.');
    }
  };

  // Resume Draft
  const handleResumeDraft = () => {
    if (!savedDraft) return;
    setBoard(savedDraft.board);
    setTurn(savedDraft.turn);
    setWinner(savedDraft.winner);
    setLastMove(savedDraft.lastMove);
    setMoveHistory(savedDraft.moveHistory);
    setCapturedByRed(savedDraft.capturedByRed);
    setCapturedByBlack(savedDraft.capturedByBlack);
    setGameMode(savedDraft.gameMode);
    setDifficulty(savedDraft.difficulty);
    setSelectedPos(null);
    setLegalMoves([]);
    setHintMove(null);
    setIsAiThinking(false);
    setCustomToast(`Đã khôi phục ván cờ (${savedDraft.moveHistory.length} nước đi)!`);
    setTimeout(() => setCustomToast(null), 3500);
    setConfirmModal({ isOpen: false, type: null });
  };

  // Save Completed Match to Match History
  const handleSaveMatchToHistory = () => {
    if (isMatchSavedInCurrentGame) return;
    const newMatch: SavedMatch = {
      id: 'match_' + Date.now(),
      timestamp: Date.now(),
      dateStr:
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
        ' ' +
        new Date().toLocaleDateString('vi-VN'),
      playerName: playerProfile.name,
      playerAvatar: playerProfile.avatar,
      gameMode,
      difficulty,
      winner: winner || 'draw',
      patternName: checkmatePattern?.name,
      totalMoves: moveHistory.length,
      initialBoard: historyStack.length > 0 ? historyStack[0].board : initializeBoard(),
      moves: moveHistory,
    };

    const updated = [newMatch, ...savedMatches];
    setSavedMatches(updated);
    setIsMatchSavedInCurrentGame(true);
    try {
      localStorage.setItem('co_up_saved_matches', JSON.stringify(updated));
    } catch {}
    setCustomToast('🏆 Đã lưu ván cờ vào Lịch sử ván hay!');
    setTimeout(() => setCustomToast(null), 3500);
  };

  // Delete match from history
  const handleDeleteMatch = (id: string) => {
    const updated = savedMatches.filter((m) => m.id !== id);
    setSavedMatches(updated);
    try {
      localStorage.setItem('co_up_saved_matches', JSON.stringify(updated));
    } catch {}
  };

  // Handle Offer Draw (Xin hòa)
  const handleOfferDraw = () => {
    if (winner || isAiThinking) return;

    const quote = getRandomDrawQuote();
    setEncouragingQuote(quote);

    if (gameMode === 'ai') {
      if (moveHistory.length < 10) {
        setCustomToast('⚠️ Ván cờ mới khai cuộc (dưới 10 nước), chưa thể xin hòa!');
        setTimeout(() => setCustomToast(null), 3500);
        return;
      }

      // Evaluation for AI draw response
      const diff = capturedByRed.length - capturedByBlack.length;
      if (diff < -2) {
        // AI is winning strongly
        setCustomToast('🤖 Máy từ chối: Tôi đang có ưu thế lớn, chưa thể hòa cờ!');
        setTimeout(() => setCustomToast(null), 4000);
      } else {
        // AI accepts draw!
        setWinner('draw');
        setShowVictoryModal(true);
        sound.playVictory();
        setPlayerStats((prev) => {
          const next = { ...prev, draws: prev.draws + 1 };
          try {
            localStorage.setItem('co_up_player_stats', JSON.stringify(next));
          } catch {}
          return next;
        });
        setCustomToast(`🤝 Máy đồng ý hòa! "${quote}"`);
        setTimeout(() => setCustomToast(null), 4500);
      }
    } else {
      // PvP mode: confirm
      setConfirmModal({
        isOpen: true,
        type: 'draw',
      });
    }
  };

  // Handle Resign (Đầu hàng)
  const handleResign = () => {
    if (winner || isAiThinking) return;
    const quote = getRandomResignQuote();
    setEncouragingQuote(quote);
    setConfirmModal({
      isOpen: true,
      type: 'resign',
    });
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === 'resign') {
      // Current player resigns, opponent wins
      const resignWinner: PlayerColor = turn === 'red' ? 'black' : 'red';
      setWinner(resignWinner);
      setIsStalemate(false);
      setShowVictoryModal(true);
      sound.playVictory();
      setPlayerStats((prev) => {
        const next = { ...prev, losses: prev.losses + 1 };
        try {
          localStorage.setItem('co_up_player_stats', JSON.stringify(next));
        } catch {}
        return next;
      });
      const quote = encouragingQuote || getRandomResignQuote();
      setCustomToast(`🏳️ Bạn đã nhận thua. "${quote}"`);
      setTimeout(() => setCustomToast(null), 4500);
    } else if (confirmModal.type === 'draw') {
      setWinner('draw');
      setShowVictoryModal(true);
      sound.playVictory();
      setPlayerStats((prev) => {
        const next = { ...prev, draws: prev.draws + 1 };
        try {
          localStorage.setItem('co_up_player_stats', JSON.stringify(next));
        } catch {}
        return next;
      });
      const quote = encouragingQuote || getRandomDrawQuote();
      setCustomToast(`🤝 Hai bên đồng ý hòa cờ! "${quote}"`);
      setTimeout(() => setCustomToast(null), 4500);
    } else if (confirmModal.type === 'resume') {
      handleResumeDraft();
    }
    setConfirmModal({ isOpen: false, type: null });
  };

  // Execute a move
  const executeMove = useCallback(
    (from: Position, to: Position) => {
      const movingPiece = board[from.y][from.x];
      if (!movingPiece) return;

      // Validate repetition rules
      const repCheck = checkMoveRepetitionRules(board, from, to, moveHistory);
      if (repCheck.isBanned) {
        setRuleWarning(`🚫 Nước đi phạm luật: ${repCheck.reason}`);
        setTimeout(() => setRuleWarning(null), 4500);
        return;
      }

      const capturedPiece = board[to.y][to.x];
      const wasCovered = movingPiece.isCovered;

      // Save state to undo history
      setHistoryStack((prev) => [
        ...prev,
        {
          board: board.map((r) => [...r]),
          turn,
          capturedByRed: [...capturedByRed],
          capturedByBlack: [...capturedByBlack],
          lastMove,
        },
      ]);

      // Construct next board
      const nextBoard = board.map((r) => [...r]);
      nextBoard[from.y][from.x] = null;

      const placedPiece: Piece = {
        ...movingPiece,
        isCovered: false,
      };
      nextBoard[to.y][to.x] = placedPiece;

      // Capture handling in Cờ Úp
      const wasCapturedWhileCovered = capturedPiece ? capturedPiece.isCovered : false;
      const recordedCaptured: Piece | null = capturedPiece
        ? {
            ...capturedPiece,
            wasCoveredWhenCaptured: wasCapturedWhileCovered,
            capturedBy: turn,
            isCovered: wasCapturedWhileCovered,
          }
        : null;

      // Update captured collections
      let nextCapturedRed = capturedByRed;
      let nextCapturedBlack = capturedByBlack;
      if (recordedCaptured) {
        if (turn === 'red') {
          nextCapturedRed = [...capturedByRed, recordedCaptured];
          setCapturedByRed(nextCapturedRed);
        } else {
          nextCapturedBlack = [...capturedByBlack, recordedCaptured];
          setCapturedByBlack(nextCapturedBlack);
        }
      }

      // Audio, Visual Capture Effect, and Special Reveal Toast
      if (recordedCaptured) {
        const isLoss = gameMode === 'ai' && turn === 'black'; // AI captured human piece
        const wasCoveredCaptured = recordedCaptured.wasCoveredWhenCaptured;

        // Logic rung thiết bị di động bằng navigator.vibrate an toàn:
        // 1. Loại bỏ hoàn toàn hiệu ứng rung khi đối thủ ăn quân của người chơi
        // 2. Chỉ rung khi người chơi trực tiếp thực hiện hành động bắt quân
        // 3. Chỉ rung 1 lần khi bắt quân úp (200ms)
        // 4. Rung 2 lần khi bắt quân Xe ([180ms rung, 100ms nghỉ, 180ms rung])
        // 5. Tuyệt đối không rung khi bắt các quân khác (Pháo, Mã, Tốt, Sĩ, Tượng)
        const isOpponentCapture = isLoss;
        const isPlayerCapture = !isOpponentCapture;

        if (isPlayerCapture) {
          if (wasCoveredCaptured) {
            // Rung 1 lần an toàn khi bắt quân úp
            try {
              if (
                getVibrationEnabled() &&
                typeof window !== 'undefined' &&
                typeof navigator !== 'undefined' &&
                'vibrate' in navigator &&
                typeof navigator.vibrate === 'function'
              ) {
                navigator.vibrate(200);
              }
            } catch (_) {}
            triggerDeviceVibration('covered', { skipNavigatorVibrate: true });
            triggerBoardShake();
          } else if (recordedCaptured.trueRole === 'chariot') {
            // Rung 2 lần an toàn khi bắt quân Xe
            try {
              if (
                getVibrationEnabled() &&
                typeof window !== 'undefined' &&
                typeof navigator !== 'undefined' &&
                'vibrate' in navigator &&
                typeof navigator.vibrate === 'function'
              ) {
                navigator.vibrate([180, 100, 180]);
              }
            } catch (_) {}
            triggerDeviceVibration('chariot', { skipNavigatorVibrate: true });
            triggerBoardShake();
          }
        }

        // Do not betray role via sound if covered piece was taken
        const isHighValue = !wasCoveredCaptured && ['chariot', 'cannon', 'horse', 'king'].includes(recordedCaptured.trueRole);
        if (isLoss) {
          sound.playPieceLost();
        } else {
          sound.playCapture(isHighValue);
        }

        // Rule: Nếu đối thủ ăn úp của mình, chỉ cần báo là mất úp, không được báo là mất quân úp là quân gì
        let fxText = '';
        if (wasCoveredCaptured) {
          fxText = isLoss ? '🛡️ MẤT QUÂN ÚP!' : '⚔️ ĂN QUÂN ÚP!';
        } else {
          const roleVi = ROLE_VI_NAMES[recordedCaptured.trueRole][recordedCaptured.color].toUpperCase();
          fxText = isLoss ? `🛡️ MẤT ${roleVi}!` : `⚔️ BẮT ${roleVi}!`;
        }

        enqueueBoardPopup({
          type: 'capture',
          id: 0,
          payload: { pos: to, text: fxText, isLoss },
        });
      } else if (wasCovered) {
        sound.playFlip();
      } else {
        sound.playMove();
      }

      if (wasCovered) {
        const isChariot = placedPiece.trueRole === 'chariot';
        const isCannon = placedPiece.trueRole === 'cannon';
        const isHorse = placedPiece.trueRole === 'horse';
        const isHighValue = isChariot || isCannon || isHorse;
        const roleVi = ROLE_VI_NAMES[placedPiece.trueRole][turn];

        // Xếp hiệu ứng lên hàng chờ để chỉ hiển thị một thông báo trên bàn cờ.
        enqueueBoardPopup({
          type: 'luckyReveal',
          id: 0,
          payload: { pos: to, role: placedPiece.trueRole },
        });

        if (isChariot || isCannon || isHorse) {
          sound.playLuckyReveal(placedPiece.trueRole);
        } else {
          sound.playFlip();
        }

        // Lời bình luận của khán giả quán cờ lập tức lên tiếng và giữ 15 giây
        if (commentaryEnabled) {
          let crowdQuote = '';
          if (isChariot) {
            crowdQuote = turn === 'red'
              ? 'Ối giồi ôi! Mở đúng con XE chiến! Đỏ như son thế này thì ai đỡ nổi!'
              : 'Bên Đen mở trúng Xe rồi kìa các bác! Phen này thế trận đảo chiều!';
          } else if (isCannon) {
            crowdQuote = turn === 'red'
              ? 'Mở trúng PHÁO thần công! Khói lửa ngút trời, bên kia bắt đầu toát mồ hôi!'
              : 'Bên Đen mở được Pháo! Cẩn thận pháo lồng pháo giằng!';
          } else if (isHorse) {
            crowdQuote = turn === 'red'
              ? 'Mở được MÃ phi đường trường! Bát tuấn tung vó, chuẩn bị nhảy góc hiểm!'
              : 'Bên Đen lật được Mã! Coi chừng Mã ngọa tào sát cục!';
          } else if (placedPiece.trueRole === 'soldier') {
            crowdQuote = turn === 'red'
              ? 'Haha, mở trúng con Chốt! Khởi đầu gian nan, cờ tàn mới biết ai khôn ai dại!'
              : 'Đối thủ vừa mở được con Tốt, thở phào nhẹ nhõm một nhịp!';
          } else {
            crowdQuote = turn === 'red'
              ? `Lật được quân [${roleVi}] hộ vệ! Phòng tuyến vững như bàn thạch!`
              : `Bên Đen vừa mở được [${roleVi}] thủ thành kiên cố!`;
          }

          const venueInfo = VENUES[venue];
          const spectatorName = venueInfo ? venueInfo.spectatorPersona.split('&')[0].trim() : 'Khán Giả';
          const spectatorAvatar = venueInfo ? venueInfo.icon : '🍵';

          showCommentary({
            id: `lucky-${Date.now()}`,
            comment: crowdQuote,
            grade: isHighValue ? 'brilliant' : 'tactical_flip',
            gradeLabel: isHighValue ? 'Tuyệt diệu' : `Mở ${roleVi}`,
            spectatorName,
            spectatorAvatar,
            tagColor: isHighValue ? 'text-amber-400' : 'text-stone-300',
            badgeIcon: isChariot ? '⭐' : isCannon ? '💥' : isHorse ? '🐎' : '🛡️',
            moveNotation: `Mở ${roleVi}`,
            isAiGenerated: false,
          }, 15000);
        }

        enqueueBoardPopup({
          type: 'reveal',
          id: 0,
          payload: {
            text: `${turn === 'red' ? 'Đỏ' : 'Đen'} vừa lật được [${roleVi}]!`,
            isHighValue,
          },
        });
      } else {
      }

      // Handle Repetition Warning Toasts
      if (repCheck.consecutiveChecks >= 3) {
        if (repCheck.consecutiveChecks === 5) {
          setRuleWarning(`🚨 ĐÃ CHIẾU TƯỚNG 5/5 LẦN! Nước đi tiếp theo quân này KHÔNG ĐƯỢC chiếu tướng nữa.`);
        } else {
          setRuleWarning(`⚠️ Cảnh báo: Chiếu tướng liên tiếp lần ${repCheck.consecutiveChecks}/5! (Tối đa 5 lần)`);
        }
        setTimeout(() => setRuleWarning(null), 4500);
      } else if (repCheck.consecutiveChases >= 3) {
        if (repCheck.consecutiveChases === 5) {
          setRuleWarning(`🚨 ĐÃ ĐUỔI QUÂN VÔ CĂN 5/5 LẦN! Nước đi tiếp theo quân này KHÔNG ĐƯỢC tiếp tục đuổi quân đó.`);
        } else {
          setRuleWarning(`⚠️ Cảnh báo: Đuổi quân vô căn liên tiếp lần ${repCheck.consecutiveChases}/5! (Tối đa 5 lần)`);
        }
        setTimeout(() => setRuleWarning(null), 4500);
      }

      const moveNotation = formatMoveNotation(from, to, placedPiece, recordedCaptured, wasCovered);
      const newMoveRecord: Move = {
        from,
        to,
        piece: placedPiece,
        captured: recordedCaptured || undefined,
        wasCovered,
        revealedRole: wasCovered ? placedPiece.trueRole : undefined,
        notation: moveNotation,
        isCheck: repCheck.isCheck,
        chasedPieceIds: repCheck.chasedPieceIds,
        consecutiveChecks: repCheck.consecutiveChecks,
        consecutiveChases: repCheck.consecutiveChases,
      };

      // Nhận xét nước đi (Tùy biến theo bối cảnh môi trường đang chơi & AI)
      const commentary = evaluateMoveQuality(board, nextBoard, newMoveRecord, turn, bgScene);
      newMoveRecord.commentary = commentary;

      if (commentaryEnabled) {
        showCommentary(commentary, 15000);

        // Gọi AI Gemini tạo thêm câu chém gió hài hước nếu có kết nối, kèm theo bối cảnh môi trường
        setIsLoadingAiCommentary(true);
        fetchAiMoveCommentary(
          newMoveRecord.notation,
          commentary.grade,
          commentary.gradeLabel,
          placedPiece.trueRole,
          turn,
          {
            name: commentary.spectatorName,
            avatar: commentary.spectatorAvatar,
            title: commentary.spectatorTitle || '',
            sceneId: bgScene,
          },
          bgScene,
          repCheck.isCheck,
          wasCovered,
          wasCovered ? placedPiece.trueRole : undefined,
          recordedCaptured ? recordedCaptured.trueRole : undefined
        )
          .then((aiText) => {
            setIsLoadingAiCommentary(false);
            if (aiText) {
              setCurrentCommentary((prev) => {
                if (!prev || prev.moveNotation !== newMoveRecord.notation) return prev;
                return {
                  ...prev,
                  comment: aiText,
                  isAiGenerated: true,
                };
              });
              resetCommentaryTimer(15000);
            }
          })
          .catch(() => {
            setIsLoadingAiCommentary(false);
          });
      }

      const updatedHistory = [...moveHistory, newMoveRecord];
      setLastMove(newMoveRecord);
      setMoveHistory(updatedHistory);
      setBoard(nextBoard);

      // Check next player's status
      const nextPlayer: PlayerColor = turn === 'red' ? 'black' : 'red';
      const checkStatus = isKingInCheck(nextBoard, nextPlayer);
      setIsCheck(checkStatus.inCheck);

      if (checkStatus.inCheck) {
        sound.playCheck();
      }

      // Check for Checkmate or Stalemate
      const nextLegalMoves = getAllLegalMoves(nextBoard, nextPlayer, updatedHistory);
      if (nextLegalMoves.length === 0) {
        setWinner(turn);
        const stalemate = !checkStatus.inCheck;
        setIsStalemate(stalemate);
        setShowVictoryModal(true);
        sound.playVictory();
        const isUserWin = gameMode === 'ai' ? turn === 'red' : true;
        if (isUserWin) {
          triggerBoardShake();
        }
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.55 },
        });

        // Update player stats & rank
        setPlayerStats((prev) => {
          const isUserWin = gameMode === 'ai' ? turn === 'red' : true;
          const next = {
            ...prev,
            wins: isUserWin ? prev.wins + 1 : prev.wins,
            losses: !isUserWin ? prev.losses + 1 : prev.losses,
          };
          try {
            localStorage.setItem('co_up_player_stats', JSON.stringify(next));
          } catch {}
          return next;
        });
      } else {
        setTurn(nextPlayer);
      }

      setSelectedPos(null);
      setLegalMoves([]);
      setHintMove(null);
    },
    [board, turn, capturedByRed, capturedByBlack, lastMove, moveHistory, commentaryEnabled, bgScene]
  );

  // Move Commentary Handlers
  const handleToggleCommentary = () => {
    const next = !commentaryEnabled;
    setCommentaryEnabled(next);
    try {
      localStorage.setItem('co_up_commentary_enabled', String(next));
    } catch {}
    setCustomToast(next ? '💬 Đã bật Nhận xét nước đi' : '🔇 Đã tắt Nhận xét nước đi');
    setTimeout(() => setCustomToast(null), 2500);
  };

  const handleRefreshCommentary = () => {
    if (!lastMove) return;
    const sceneSpectators = SCENE_SPECTATORS[bgScene] || SCENE_SPECTATORS.tra_da;
    const spectator = sceneSpectators[Math.floor(Math.random() * sceneSpectators.length)];
    const prevB = historyStack.length > 0 ? historyStack[historyStack.length - 1].board : board;
    const refreshed = evaluateMoveQuality(prevB, board, lastMove, lastMove.piece.color, bgScene, spectator);
    showCommentary(refreshed, 15000);
  };

  const handleToggleOrRefreshCommentary = () => {
    if (!commentaryEnabled) {
      setCommentaryEnabled(true);
      if (lastMove) {
        handleRefreshCommentary();
      }
      setCustomToast('💬 Đã bật Nhận xét nước đi');
      setTimeout(() => setCustomToast(null), 2500);
      return;
    }
    handleRefreshCommentary();
  };

  // Square selection
  const handleSelectSquare = (pos: Position) => {
    if (winner || isAiThinking) return;

    if (selectedPos) {
      const isTarget = legalMoves.some((m) => m.x === pos.x && m.y === pos.y);
      if (isTarget) {
        executeMove(selectedPos, pos);
        return;
      }
    }

    const clickedPiece = board[pos.y][pos.x];
    if (clickedPiece && clickedPiece.color === turn) {
      sound.playLift();

      try {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(15);
        }
      } catch (_) {}

      setSelectedPos(pos);
      const moves = getLegalMoves(board, pos, moveHistory);
      setLegalMoves(moves);
      setHintMove(null);

      const unconstrainedMoves = getLegalMoves(board, pos);
      if (unconstrainedMoves.length > moves.length) {
        const bannedMoves = unconstrainedMoves.filter(
          (m) => !moves.some((lm) => lm.x === m.x && lm.y === m.y)
        );
        if (bannedMoves.length > 0) {
          const rep = checkMoveRepetitionRules(board, pos, bannedMoves[0], moveHistory);
          if (rep.reason) {
            setRuleWarning(`🚫 Đã khóa nước đi phạm luật: ${rep.reason}`);
            setTimeout(() => setRuleWarning(null), 4500);
          }
        }
      }
    } else {
      setSelectedPos(null);
      setLegalMoves([]);
    }
  };

  // AI Turn Trigger
  useEffect(() => {
    if (gameMode !== 'ai' || turn !== 'black' || winner || isAiThinking) {
      return;
    }

    setIsAiThinking(true);
    aiRunningRef.current = true;

    const currentBoard = board.map((r) => [...r]);

    searchBestMoveAsync(
      currentBoard,
      'black',
      difficulty,
      aiThinkingTime,
      (stats) => {
        if (aiRunningRef.current) {
          setAiStats(stats);
        }
      },
      moveHistory
    )
      .then((bestMove) => {
        if (!aiRunningRef.current) return;
        aiRunningRef.current = false;
        setIsAiThinking(false);

        if (bestMove) {
          executeMove(bestMove.from, bestMove.to);
        } else {
          setWinner('red');
          setIsStalemate(true);
          setShowVictoryModal(true);
          sound.playVictory();
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.55 },
          });
        }
      })
      .catch((err) => {
        console.error('AI execution error:', err);
        aiRunningRef.current = false;
        setIsAiThinking(false);
      });
  }, [gameMode, turn, winner, board, difficulty, aiThinkingTime, executeMove, moveHistory]);

  // Undo move
  const handleUndo = () => {
    if (historyStack.length === 0 || isAiThinking) return;
    aiRunningRef.current = false;
    setIsAiThinking(false);

    const stepsToUndo = gameMode === 'ai' && historyStack.length >= 2 ? 2 : 1;
    const targetIndex = historyStack.length - stepsToUndo;

    if (targetIndex >= 0) {
      const snapshot = historyStack[targetIndex];
      setBoard(snapshot.board);
      setTurn(snapshot.turn);
      setCapturedByRed(snapshot.capturedByRed);
      setCapturedByBlack(snapshot.capturedByBlack);
      setLastMove(snapshot.lastMove);
      setHistoryStack((prev) => prev.slice(0, targetIndex));
      setMoveHistory((prev) => prev.slice(0, prev.length - stepsToUndo));
      setWinner(null);
      setIsStalemate(false);
      setIsCheck(isKingInCheck(snapshot.board, snapshot.turn).inCheck);
      setSelectedPos(null);
      setLegalMoves([]);
      setHintMove(null);
      setAiStats(null);
      setRuleWarning(null);
      setShowVictoryModal(true);
      setCurrentCommentary(snapshot.lastMove?.commentary || null);
      setIsCommentaryVisible(Boolean(snapshot.lastMove?.commentary));
      sound.playMove();
    }
  };

  // Hint
  const handleHint = async () => {
    if (winner || isAiThinking) return;
    const best = await searchBestMoveAsync(board, turn, 'medium', 2, undefined, moveHistory);
    if (best) {
      setSelectedPos(best.from);
      setLegalMoves([best.to]);
      setHintMove({ from: best.from, to: best.to });
      sound.playFlip();
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#121214] text-[#e2e2e7] flex flex-col selection:bg-amber-500 selection:text-stone-950 font-sans overflow-hidden">
      {/* Top Header - Compact for mobile screen space */}
      <header className={`w-full flex items-center justify-between px-2 sm:px-4 lg:px-6 border-b border-white/10 gap-1.5 bg-[#121214] shrink-0 ${
        isLandscape ? 'py-1 h-9' : 'py-1.5 sm:py-2'
      }`}>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <h1 className="font-display text-sm sm:text-xl font-extrabold tracking-tight text-amber-500 flex items-center">
            Cờ úp Việt Nam
          </h1>
        </div>

        {/* Center Turn & Status Indicator Pill */}
        <div className="flex items-center gap-1 sm:gap-2">
          {isCheck && !winner && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/90 text-red-200 border border-red-500 text-[10px] sm:text-xs font-bold animate-bounce shadow-md">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="hidden sm:inline">CHIẾU TƯỚNG!</span>
              <span className="sm:hidden">CHIẾU!</span>
            </div>
          )}

          <div
            className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              winner
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : turn === 'red'
                ? 'bg-red-500/15 border-red-500/30 text-red-300'
                : 'bg-stone-500/15 border-stone-500/30 text-stone-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                winner
                  ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                  : turn === 'red'
                  ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                  : 'bg-stone-300 shadow-[0_0_8px_#d4d4d8]'
              } ${isAiThinking ? 'animate-ping' : ''}`}
            />
            <span className="font-medium text-[10px] sm:text-xs">
              {winner
                ? winner === 'draw'
                  ? 'Hòa cờ!'
                  : winner === 'red'
                  ? 'Đỏ Thắng!'
                  : 'Đen Thắng!'
                : turn === 'red'
                ? 'Lượt Đỏ'
                : isAiThinking
                ? 'Máy nghĩ...'
                : 'Lượt Đen'}
            </span>
          </div>

          {/* Reopen Victory Banner button */}
          {winner && winner !== 'draw' && !showVictoryModal && checkmatePattern && (
            <button
              onClick={() => setShowVictoryModal(true)}
              className="px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[10px] font-bold flex items-center gap-1 transition-colors"
            >
              <Award className="w-3 h-3 text-amber-400" />
              <span>Sát Pháp</span>
            </button>
          )}

          {/* Mobile Landscape Tab Switcher (< 1024px and landscape) */}
          {isLandscape && (
            <div className="flex items-center bg-stone-900/90 border border-white/10 rounded-lg p-0.5 gap-0.5 shrink-0 ml-1">
              <button
                onClick={() => setMobileTab('board')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                  mobileTab === 'board'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Grid className="w-3 h-3" />
                <span>Bàn cờ</span>
              </button>
              <button
                onClick={() => setMobileTab('notation')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                  mobileTab === 'notation'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>Biên bản</span>
              </button>
              <button
                onClick={() => setMobileTab('settings')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                  mobileTab === 'settings'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Settings className="w-3 h-3" />
                <span>Cài đặt</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Actions: Profile & History & Sound/Guitar Buttons & Lite Mode */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Quick Lite / Performance Mode Toggle */}
          <button
            onClick={handleToggleLiteMode}
            className={`p-1 sm:px-2 sm:py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors border ${
              isLiteMode
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-xs'
                : 'bg-stone-800 hover:bg-stone-700 border-white/10 text-stone-300'
            }`}
            title="Máy yếu"
          >
            <Zap className={`w-3.5 h-3.5 ${isLiteMode ? 'text-emerald-400 animate-pulse' : 'text-stone-400'}`} />
            <span className="text-[10px] hidden xs:inline">{isLiteMode ? 'Máy yếu' : 'Đồ họa'}</span>
          </button>

          <button
            onClick={() => setIsSoundSettingsOpen(true)}
            className="p-1 sm:px-2 sm:py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors"
            title="Cài đặt âm thanh"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Âm thanh</span>
          </button>

          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-1 p-1 sm:px-2 sm:py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 text-xs font-semibold transition-colors"
            title="Hồ sơ kỳ thủ"
          >
            <div className="w-4 h-4 rounded-full overflow-hidden bg-stone-900 border border-amber-400 flex items-center justify-center text-[10px]">
              {playerProfile.isCustomAvatar ? (
                <img src={playerProfile.avatar} alt="avt" className="w-full h-full object-cover" />
              ) : (
                <span>{playerProfile.avatar}</span>
              )}
            </div>
            <span className="hidden sm:inline max-w-[70px] truncate text-[11px]">{playerProfile.name}</span>
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="p-1 sm:px-2 sm:py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-amber-300 border border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors"
            title="Lịch sử ván đấu đã lưu"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-[11px]">Lịch sử ({savedMatches.length})</span>
          </button>
        </div>
      </header>

      {/* Main Viewport Layout */}
      <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px] 2xl:grid-cols-[1fr_420px] overflow-hidden">
        {/* Left Column: Game Viewport */}
        <div
          className={`relative flex-col items-center justify-between bg-[radial-gradient(circle_at_50%_40%,_#26160e_0%,_#170e08_55%,_#0d0704_100%)] ${
            isLandscape ? 'p-0.5 overflow-hidden h-full flex-1' : 'p-1 sm:p-1.5 h-full flex-1 overflow-hidden'
          } ${
            mobileTab === 'board' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Realistic 3D Environment Background Backdrop */}
          {perspective === '3d' && activeSceneConfig?.imageUrl && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-700">
              <img
                src={activeSceneConfig.imageUrl}
                alt={activeSceneConfig.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center filter brightness-[0.70] contrast-[1.08] transition-all duration-500"
              />
              {/* Atmospheric tabletop vignette shadow overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(0,0,0,0.12) 0%, rgba(20,12,6,0.48) 55%, rgba(6,3,1,0.92) 100%)',
                }}
              />
            </div>
          )}

          {/* Custom Notification Toast */}
          {customToast && (
            <div className="w-full max-w-[590px] md:max-w-[740px] px-3 py-1 rounded-lg text-center text-xs font-bold border transition-all animate-fade-in bg-amber-950/90 text-amber-200 border-amber-500/80 shadow-md flex items-center justify-center gap-1.5 shrink-0">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{customToast}</span>
            </div>
          )}

          {/* Repetition Rule Warning Toast */}
          {ruleWarning && (
            <div className="w-full max-w-[590px] md:max-w-[740px] px-3 py-1 rounded-lg text-center text-xs font-bold border transition-all animate-pulse bg-red-950/90 text-red-200 border-red-500/80 shadow-md flex items-center justify-center gap-1.5 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{ruleWarning}</span>
            </div>
          )}

          {/* Unified Board Container - auto scales to fill mobile, tablet, and desktop screens without clutter */}
          {isLandscape ? (
            /* LANDSCAPE MOBILE: 3-column horizontal layout (Players on Left, Big Board in Center, Actions on Right) */
            <div className="w-full h-full flex flex-row items-center justify-center gap-1.5 sm:gap-3 px-1 py-0.5 max-h-full overflow-hidden">
              {/* Left Column: Opponent & User Players Cards + Match Status */}
              <div className="flex flex-col justify-between h-full py-0.5 w-[165px] xs:w-[190px] shrink-0 gap-1 overflow-y-auto">
                <MobilePlayerHeader
                  color={flipped ? 'red' : 'black'}
                  isTurn={turn === (flipped ? 'red' : 'black')}
                  profile={playerProfile}
                  gameMode={gameMode}
                  difficulty={difficulty}
                  capturedPieces={flipped ? capturedByRed : capturedByBlack}
                  isUser={flipped}
                  wins={playerStats.wins}
                  onOpenProfile={() => setIsProfileOpen(true)}
                />

                {/* Middle status indicator in landscape */}
                <div className="w-full flex-1 flex flex-col justify-center gap-1 min-h-0">
                  {hintMove ? (
                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2 py-0.5 rounded-lg shrink-0">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>({hintMove.from.x + 1},{hintMove.from.y + 1})➔({hintMove.to.x + 1},{hintMove.to.y + 1})</span>
                    </div>
                  ) : (
                    <div className="py-1 px-1.5 rounded-lg bg-stone-900/90 border border-white/10 text-[10px] text-stone-300 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${turn === 'red' ? 'bg-red-500 animate-pulse' : 'bg-stone-300'}`} />
                        <span>{isAiThinking ? 'AI đang nghĩ...' : `Lượt: ${turn === 'red' ? 'Đỏ' : 'Đen'}`}</span>
                      </span>
                      {lastMove && <span className="font-mono text-stone-400 text-[9px]">{lastMove.notation}</span>}
                    </div>
                  )}
                </div>

                <MobilePlayerHeader
                  color={flipped ? 'black' : 'red'}
                  isTurn={turn === (flipped ? 'black' : 'red')}
                  profile={playerProfile}
                  gameMode={gameMode}
                  difficulty={difficulty}
                  capturedPieces={flipped ? capturedByBlack : capturedByRed}
                  isUser={!flipped}
                  wins={playerStats.wins}
                  onOpenProfile={() => setIsProfileOpen(true)}
                />
              </div>

              {/* Center Column: Big ChessBoard filling vertical height perfectly */}
              <div
                className={`h-full max-h-full flex items-center justify-center shrink-0 min-h-0 ${
                  isBoardShaking ? 'animate-board-shake' : ''
                }`}
                style={{
                  maxWidth: 'min(calc((100dvh - 72px) * 0.888), 48vw)',
                  width: 'min(calc((100dvh - 72px) * 0.888), 48vw)',
                }}
              >
                <ChessBoard
                  board={board}
                  turn={turn}
                  selectedPos={selectedPos}
                  legalMoves={legalMoves}
                  lastMove={lastMove}
                  isCheck={isCheck}
                  flipped={flipped}
                  displayMode={displayMode}
                  theme={boardTheme}
                  pieceTheme={pieceTheme}
                  perspective={perspective}
                  riverMode={riverMode}
                  bgScene={bgScene}
                  isLiteMode={isLiteMode}
                  onTogglePerspective={handleTogglePerspective}
                  onCycleRiverMode={handleCycleRiverMode}
                  onSelectBgScene={handleSelectBgScene}
                  onOpenCustomization={() => setIsCustomizationOpen(true)}
                  onSelectSquare={handleSelectSquare}
                  disabled={isAiThinking || Boolean(winner)}
                  revealNotice={boardPopup?.type === 'reveal' ? boardPopup.payload : null}
                  captureEffect={
                    boardPopup?.type === 'capture'
                      ? { ...boardPopup.payload, id: boardPopup.id }
                      : null
                  }
                  luckyRevealEffect={
                    boardPopup?.type === 'luckyReveal'
                      ? { ...boardPopup.payload, id: boardPopup.id }
                      : null
                  }
                  isShaking={isBoardShaking}
                  commentary={commentaryEnabled ? currentCommentary : null}
                  isCommentaryVisible={isCommentaryVisible && !boardPopup}
                  onCloseCommentary={hideCommentary}
                  onRefreshCommentary={handleRefreshCommentary}
                  isLoadingAiCommentary={isLoadingAiCommentary}
                  onDrinkSip={handleDrinkSip}
                />
              </div>

              {/* Right Column: Quick Action buttons */}
              <div className="flex flex-col justify-center gap-1 h-full py-0.5 w-[64px] xs:w-[76px] shrink-0">
                <button
                  onClick={handleUndo}
                  disabled={historyStack.length === 0 || isAiThinking || Boolean(winner)}
                  className="flex flex-col items-center justify-center py-1 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-stone-300 text-[9px] font-medium transition-all active:scale-95 border border-white/5"
                  title="Đi lại nước cờ trước"
                >
                  <RotateCcw className="w-3 h-3 text-stone-400 mb-0.5" />
                  <span>Đi lại</span>
                </button>

                <button
                  onClick={handleHint}
                  disabled={isAiThinking || Boolean(winner)}
                  className="flex flex-col items-center justify-center py-1 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-amber-300 text-[9px] font-medium transition-all active:scale-95 border border-white/5"
                  title="Gợi ý nước cờ hay"
                >
                  <Sparkles className="w-3 h-3 text-amber-400 mb-0.5" />
                  <span>Gợi ý</span>
                </button>

                <button
                  onClick={handleToggleOrRefreshCommentary}
                  className={`flex flex-col items-center justify-center py-1 rounded text-[9px] font-medium transition-all active:scale-95 border ${
                    isCommentaryVisible && currentCommentary
                      ? 'bg-amber-950/70 text-amber-200 border-amber-500/60 shadow-sm font-bold'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-white/5'
                  }`}
                  title="Nhận xét nước đi / Bình luận vỉa hè"
                >
                  <MessageSquareQuote className="w-3 h-3 text-amber-400 mb-0.5" />
                  <span>Nhận xét</span>
                </button>

                <button
                  onClick={handleOfferDraw}
                  disabled={Boolean(winner) || isAiThinking}
                  className="flex flex-col items-center justify-center py-1 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-amber-300 text-[9px] font-medium transition-all active:scale-95 border border-white/5"
                  title="Xin hòa ván cờ"
                >
                  <Handshake className="w-3 h-3 text-amber-400 mb-0.5" />
                  <span>Xin hòa</span>
                </button>

                <button
                  onClick={handleResign}
                  disabled={Boolean(winner) || isAiThinking}
                  className="flex flex-col items-center justify-center py-1 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-red-300 text-[9px] font-medium transition-all active:scale-95 border border-white/5"
                  title="Đầu hàng / Nhận thua"
                >
                  <Flag className="w-3 h-3 text-red-400 mb-0.5" />
                  <span>Đầu hàng</span>
                </button>

                <button
                  onClick={handleToggleBgm}
                  className={`flex flex-col items-center justify-center py-1 rounded text-[9px] font-medium transition-all active:scale-95 border ${
                    isBgmOn
                      ? 'bg-amber-950/70 text-amber-200 border-amber-500/60 shadow-sm'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border-white/5'
                  }`}
                  title="Bật/Tắt nhạc hòa tấu guitar cổ điển"
                >
                  <Music className={`w-3 h-3 mb-0.5 ${isBgmOn ? 'text-amber-400 animate-bounce' : 'text-stone-500'}`} />
                  <span className="truncate">Guitar</span>
                </button>

                <button
                  onClick={handleSaveDraft}
                  className="flex flex-col items-center justify-center py-1 rounded bg-stone-900 hover:bg-stone-800 text-emerald-300 text-[9px] font-medium transition-all active:scale-95 border border-white/5"
                  title="Lưu ván đang chơi"
                >
                  <Save className="w-3 h-3 text-emerald-400 mb-0.5" />
                  <span>Lưu ván</span>
                </button>
              </div>
            </div>
          ) : (
            /* PORTRAIT / DESKTOP VERTICAL CONTAINER */
            <div
              className="w-full h-full flex-1 flex flex-col justify-between items-center py-0.5 sm:py-1"
              style={{ maxWidth: 'min(880px, 99.5vw, calc((100dvh - 118px) * 0.888))', width: '100%' }}
            >
              {/* Top Player Header with integrated captured pieces */}
              <div className="w-full shrink-0">
                <MobilePlayerHeader
                  color={flipped ? 'red' : 'black'}
                  isTurn={turn === (flipped ? 'red' : 'black')}
                  profile={playerProfile}
                  gameMode={gameMode}
                  difficulty={difficulty}
                  capturedPieces={flipped ? capturedByRed : capturedByBlack}
                  isUser={flipped}
                  wins={playerStats.wins}
                  onOpenProfile={() => setIsProfileOpen(true)}
                />
              </div>

              {/* Central Area: Board dynamically centered in available height */}
              <div className={`w-full flex-1 min-h-0 flex items-center justify-center my-auto ${
                isBoardShaking ? 'animate-board-shake' : ''
              }`}>
                <ChessBoard
                  board={board}
                  turn={turn}
                  selectedPos={selectedPos}
                  legalMoves={legalMoves}
                  lastMove={lastMove}
                  isCheck={isCheck}
                  flipped={flipped}
                  displayMode={displayMode}
                  theme={boardTheme}
                  pieceTheme={pieceTheme}
                  perspective={perspective}
                  riverMode={riverMode}
                  bgScene={bgScene}
                  isLiteMode={isLiteMode}
                  onTogglePerspective={handleTogglePerspective}
                  onCycleRiverMode={handleCycleRiverMode}
                  onSelectBgScene={handleSelectBgScene}
                  onOpenCustomization={() => setIsCustomizationOpen(true)}
                  onSelectSquare={handleSelectSquare}
                  disabled={isAiThinking || Boolean(winner)}
                  revealNotice={boardPopup?.type === 'reveal' ? boardPopup.payload : null}
                  captureEffect={
                    boardPopup?.type === 'capture'
                      ? { ...boardPopup.payload, id: boardPopup.id }
                      : null
                  }
                  luckyRevealEffect={
                    boardPopup?.type === 'luckyReveal'
                      ? { ...boardPopup.payload, id: boardPopup.id }
                      : null
                  }
                  isShaking={isBoardShaking}
                  commentary={commentaryEnabled ? currentCommentary : null}
                  isCommentaryVisible={isCommentaryVisible && !boardPopup}
                  onCloseCommentary={hideCommentary}
                  onRefreshCommentary={handleRefreshCommentary}
                  isLoadingAiCommentary={isLoadingAiCommentary}
                  onDrinkSip={handleDrinkSip}
                />
              </div>

              {/* Bottom Controls Area: Actions Bar & Bottom Player Header sitting snugly above bottom nav */}
              <div className="w-full flex flex-col gap-1 shrink-0">
                {/* Trạng thái ván cờ thanh tao hoặc Gợi ý nước cờ */}
                <div className="w-full h-6 sm:h-7 shrink-0 flex items-center justify-center">
                  {hintMove ? (
                    <div className="w-full h-full flex items-center justify-center gap-2 text-xs font-semibold text-amber-300 bg-amber-950/70 border border-amber-700/60 px-4 rounded-lg animate-in fade-in">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Gợi ý: ({hintMove.from.x + 1},{hintMove.from.y + 1}) ➔ ({hintMove.to.x + 1},{hintMove.to.y + 1})</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-between px-2.5 rounded-lg bg-[#141416]/50 border border-white/5 text-[11px] text-stone-400 select-none">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className={`w-2 h-2 rounded-full ${turn === 'red' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-stone-300 shadow-[0_0_6px_rgba(255,255,255,0.6)]'}`} />
                        <span>Lượt: <b className={turn === 'red' ? 'text-red-400' : 'text-stone-200'}>{turn === 'red' ? 'Bên Đỏ' : 'Bên Đen'}</b></span>
                        <span className="text-stone-600">•</span>
                        <span>Nước {moveHistory.length + 1}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-stone-500">
                        {lastMove && (
                          <span className="font-mono text-stone-400">Vừa đi: {lastMove.notation}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Universal Under-Board Quick Action Bar (Đầy đủ trên mọi thiết bị PC/Tablet/Mobile) */}
                <div className="w-full grid grid-cols-7 gap-1 p-0.5 bg-[#18181c]/90 border border-white/10 rounded-lg shadow-sm">
                  <button
                    onClick={handleUndo}
                    disabled={historyStack.length === 0 || isAiThinking || Boolean(winner)}
                    className="flex flex-col items-center justify-center py-1 px-0.5 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-stone-300 text-[9px] sm:text-[10px] font-medium transition-all active:scale-95 border border-white/5"
                    title="Đi lại nước cờ trước"
                  >
                    <RotateCcw className="w-3 h-3 text-stone-400 mb-0.5" />
                    <span>Đi lại</span>
                  </button>

                  <button
                    onClick={handleHint}
                    disabled={isAiThinking || Boolean(winner)}
                    className="flex flex-col items-center justify-center py-1 px-0.5 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-amber-300 text-[9px] sm:text-[10px] font-medium transition-all active:scale-95 border border-white/5"
                    title="Gợi ý nước cờ hay"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400 mb-0.5" />
                    <span>Gợi ý</span>
                  </button>

                  <button
                    onClick={handleToggleOrRefreshCommentary}
                    className={`flex flex-col items-center justify-center py-1 px-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-all active:scale-95 border ${
                      isCommentaryVisible && currentCommentary
                        ? 'bg-amber-950/70 text-amber-200 border-amber-500/60 shadow-sm font-bold'
                        : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-white/5'
                    }`}
                    title="Nhận xét nước đi / Bình luận vỉa hè"
                  >
                    <MessageSquareQuote className="w-3 h-3 text-amber-400 mb-0.5" />
                    <span>Nhận xét</span>
                  </button>

                  <button
                    onClick={handleOfferDraw}
                    disabled={Boolean(winner) || isAiThinking}
                    className="flex flex-col items-center justify-center py-1 px-0.5 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-amber-300 text-[9px] sm:text-[10px] font-medium transition-all active:scale-95 border border-white/5"
                    title="Xin hòa ván cờ"
                  >
                    <Handshake className="w-3 h-3 text-amber-400 mb-0.5" />
                    <span>Xin hòa</span>
                  </button>

                  <button
                    onClick={handleResign}
                    disabled={Boolean(winner) || isAiThinking}
                    className="flex flex-col items-center justify-center py-1 px-0.5 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-red-300 text-[9px] sm:text-[10px] font-medium transition-all active:scale-95 border border-white/5"
                    title="Đầu hàng / Nhận thua"
                  >
                    <Flag className="w-3 h-3 text-red-400 mb-0.5" />
                    <span>Đầu hàng</span>
                  </button>

                  <button
                    onClick={handleToggleBgm}
                    className={`flex flex-col items-center justify-center py-1 px-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-all active:scale-95 border ${
                      isBgmOn
                        ? 'bg-amber-950/70 text-amber-200 border-amber-500/60 shadow-sm'
                        : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border-white/5'
                    }`}
                    title="Bật/Tắt nhạc hòa tấu guitar cổ điển"
                  >
                    <Music className={`w-3 h-3 mb-0.5 ${isBgmOn ? 'text-amber-400 animate-bounce' : 'text-stone-500'}`} />
                    <span className="truncate">Guitar</span>
                  </button>

                  <button
                    onClick={handleSaveDraft}
                    className="flex flex-col items-center justify-center py-1 px-0.5 rounded bg-stone-900 hover:bg-stone-800 text-emerald-300 text-[9px] sm:text-[10px] font-medium transition-all active:scale-95 border border-white/5"
                    title="Lưu ván đang chơi để tí nữa chơi tiếp"
                  >
                    <Save className="w-3 h-3 text-emerald-400 mb-0.5" />
                    <span>Lưu ván</span>
                  </button>
                </div>

                {/* Bottom Player Header with integrated captured pieces */}
                <MobilePlayerHeader
                  color={flipped ? 'black' : 'red'}
                  isTurn={turn === (flipped ? 'black' : 'red')}
                  profile={playerProfile}
                  gameMode={gameMode}
                  difficulty={difficulty}
                  capturedPieces={flipped ? capturedByBlack : capturedByRed}
                  isUser={!flipped}
                  wins={playerStats.wins}
                  onOpenProfile={() => setIsProfileOpen(true)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Control Panel (Visible side-by-side on desktop lg+, tabbed on mobile/compact screens) */}
        <div
          className={`bg-[#18181c] border-t lg:border-t-0 lg:border-l border-white/10 flex-col p-3 sm:p-4 lg:p-5 gap-4 overflow-y-auto ${
            mobileTab === 'board' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* On tablet/mobile notation tab, show notation and stats first */}
          {mobileTab === 'notation' && (
            <div className="lg:hidden flex flex-col gap-4">
              <span className="font-mono-code text-[10px] uppercase tracking-[0.15em] text-stone-400 block">
                04 // Biên bản ván đấu ({moveHistory.length} nước)
              </span>
              <MoveHistory
                moves={moveHistory}
                onSelectMove={(m) => {
                  if (m.commentary) {
                    showCommentary(m.commentary, 15000);
                  }
                }}
                activeMoveIndex={lastMove ? moveHistory.indexOf(lastMove) : null}
              />

              <span className="font-mono-code text-[10px] uppercase tracking-[0.15em] text-stone-400 block mt-2">
                03 // Thống kê bắt quân
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#121214] border border-white/10 rounded p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-code uppercase text-red-400 font-semibold">Bên Đỏ bắt</span>
                    <span className="text-xs font-bold text-stone-200 font-mono-code">{capturedByRed.length}</span>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">
                    {capturedByRed.filter((p) => p.wasCoveredWhenCaptured).length} úp &bull; {capturedByRed.filter((p) => !p.wasCoveredWhenCaptured).length} ngửa
                  </p>
                </div>

                <div className="bg-[#121214] border border-white/10 rounded p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-code uppercase text-stone-300 font-semibold">Bên Đen bắt</span>
                    <span className="text-xs font-bold text-stone-200 font-mono-code">{capturedByBlack.length}</span>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">
                    {capturedByBlack.filter((p) => p.wasCoveredWhenCaptured).length} úp &bull; {capturedByBlack.filter((p) => !p.wasCoveredWhenCaptured).length} ngửa
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 01 // Chế độ chơi & Cài đặt (Always on desktop lg+, or on tablet/mobile settings tab) */}
          <div className={mobileTab === 'notation' ? 'hidden lg:block' : 'block'}>
            <GameControls
              gameMode={gameMode}
              difficulty={difficulty}
              aiThinkingTime={aiThinkingTime}
              soundEnabled={soundEnabled}
              displayMode={displayMode}
              boardTheme={boardTheme}
              perspective={perspective}
              riverMode={riverMode}
              bgScene={bgScene}
              onSelectBgScene={handleSelectBgScene}
              isLiteMode={isLiteMode}
              flipped={flipped}
              venue={venue}
              onSetVenue={handleSetVenue}
              isBgmOn={isBgmOn}
              onToggleBgm={handleToggleBgm}
              canUndo={historyStack.length > 0 && !isAiThinking && !winner}
              canDrawOrResign={!winner && !isAiThinking}
              hasSavedDraft={Boolean(savedDraft)}
              onSetGameMode={(mode) => {
                setGameMode(mode);
                startNewGame();
              }}
              onSetDifficulty={setDifficulty}
              onSetAiThinkingTime={setAiThinkingTime}
              commentaryEnabled={commentaryEnabled}
              onToggleSound={toggleSound}
              onToggleCommentary={handleToggleCommentary}
              onCycleDisplayMode={cycleDisplayMode}
              onToggleBoardTheme={toggleBoardTheme}
              pieceTheme={pieceTheme}
              onOpenCustomization={() => setIsCustomizationOpen(true)}
              onTogglePerspective={handleTogglePerspective}
              onCycleRiverMode={handleCycleRiverMode}
              onToggleLiteMode={handleToggleLiteMode}
              onFlipBoard={() => setFlipped(!flipped)}
              onUndo={handleUndo}
              onHint={handleHint}
              onNewGame={startNewGame}
              onOpenRules={() => setIsRulesOpen(true)}
              onOfferDraw={handleOfferDraw}
              onResign={handleResign}
              onSaveDraft={handleSaveDraft}
              onResumeDraft={() => setConfirmModal({ isOpen: true, type: 'resume' })}
              onOpenHistory={() => setIsHistoryOpen(true)}
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenSoundSettings={() => setIsSoundSettingsOpen(true)}
            />
          </div>

          {/* AI Thinking Status Panel */}
          {gameMode === 'ai' && (
            <div className={mobileTab === 'notation' ? 'hidden lg:block' : 'block'}>
              <AiThinkingPanel
                isThinking={isAiThinking}
                stats={aiStats}
                maxTime={aiThinkingTime}
              />
            </div>
          )}

          {/* 03 // Thống kê bắt quân (Desktop lg+) */}
          <div className="hidden lg:block">
            <span className="font-mono-code text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-2 block">
              03 // Thống kê bắt quân
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#121214] border border-white/10 rounded p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono-code uppercase text-red-400 font-semibold">Bên Đỏ bắt</span>
                  <span className="text-xs font-bold text-stone-200 font-mono-code">{capturedByRed.length}</span>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  {capturedByRed.filter((p) => p.wasCoveredWhenCaptured).length} úp &bull; {capturedByRed.filter((p) => !p.wasCoveredWhenCaptured).length} ngửa
                </p>
              </div>

              <div className="bg-[#121214] border border-white/10 rounded p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono-code uppercase text-stone-300 font-semibold">Bên Đen bắt</span>
                  <span className="text-xs font-bold text-stone-200 font-mono-code">{capturedByBlack.length}</span>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  {capturedByBlack.filter((p) => p.wasCoveredWhenCaptured).length} úp &bull; {capturedByBlack.filter((p) => !p.wasCoveredWhenCaptured).length} ngửa
                </p>
              </div>
            </div>
          </div>

          {/* 04 // Biên bản (Desktop lg+) */}
          <div className="hidden lg:block">
            <span className="font-mono-code text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-2 block">
              04 // Biên bản ({moveHistory.length} nước)
            </span>
            <MoveHistory
              moves={moveHistory}
              onSelectMove={(m) => {
                if (m.commentary) {
                  showCommentary(m.commentary, 15000);
                }
              }}
              activeMoveIndex={lastMove ? moveHistory.indexOf(lastMove) : null}
            />
          </div>
        </div>
      </main>

      {/* Navigation Tabs Bar (< 1024px / Tablet & Mobile) */}
      <nav className={`lg:hidden border-t border-white/10 bg-[#141416] p-1 grid grid-cols-3 gap-1 z-20 shrink-0 ${isLandscape ? 'hidden' : ''}`}>
        <button
          onClick={() => setMobileTab('board')}
          className={`flex flex-col items-center py-1 rounded-md text-[10px] sm:text-xs font-semibold transition-colors ${
            mobileTab === 'board'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Grid className="w-3.5 h-3.5 mb-0.5" />
          <span>Bàn cờ</span>
        </button>
        <button
          onClick={() => setMobileTab('notation')}
          className={`flex flex-col items-center py-1 rounded-md text-[10px] sm:text-xs font-semibold transition-colors ${
            mobileTab === 'notation'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 mb-0.5" />
          <span>Biên bản ({moveHistory.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('settings')}
          className={`flex flex-col items-center py-1 rounded-md text-[10px] sm:text-xs font-semibold transition-colors ${
            mobileTab === 'settings'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5 mb-0.5" />
          <span>Cài đặt</span>
        </button>
      </nav>

      {/* Modals with Lazy Loading & Suspense */}
      <Suspense fallback={null}>
        {/* Illustrated Checkmate / Draw Victory Modal */}
        {winner && checkmatePattern && showVictoryModal && (
          <VictoryModal
            winner={winner}
            pattern={checkmatePattern}
            moveCount={moveHistory.length}
            encouragingQuote={encouragingQuote}
            onNewGame={startNewGame}
            onInspectBoard={() => setShowVictoryModal(false)}
            onReplayGame={handleReplayCurrentGame}
            onSaveMatchToHistory={handleSaveMatchToHistory}
            isSaved={isMatchSavedInCurrentGame}
          />
        )}

        {/* User Profile Modal */}
        {isProfileOpen && (
          <UserProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            profile={playerProfile}
            onSaveProfile={handleSaveProfile}
            stats={playerStats}
          />
        )}

        {/* Saved Matches History Modal */}
        {isHistoryOpen && (
          <MatchHistoryModal
            isOpen={isHistoryOpen}
            onClose={() => {
              setIsHistoryOpen(false);
              setActiveReplayMatch(null);
            }}
            savedMatches={savedMatches}
            onDeleteMatch={handleDeleteMatch}
            activeReplayMatch={activeReplayMatch}
          />
        )}

        {/* Confirm Draw / Resign / Resume Modal */}
        {confirmModal.isOpen && (
          <ConfirmActionModal
            isOpen={confirmModal.isOpen}
            type={confirmModal.type}
            onConfirm={handleConfirmAction}
            onCancel={() => setConfirmModal({ isOpen: false, type: null })}
            encouragingQuote={encouragingQuote}
            title={
              confirmModal.type === 'resume'
                ? 'Tiếp Tục Ván Đã Lưu?'
                : undefined
            }
            message={
              confirmModal.type === 'resume'
                ? `Bạn có muốn khôi phục ván cờ đã lưu trước đó (${savedDraft?.moveHistory.length} nước đi) không?`
                : undefined
            }
          />
        )}

        {/* Sound Settings & Custom Guitar Upload Modal */}
        {isSoundSettingsOpen && (
          <SoundSettingsModal
            isOpen={isSoundSettingsOpen}
            onClose={() => setIsSoundSettingsOpen(false)}
            isBgmOn={isBgmOn}
            onToggleBgm={handleToggleBgm}
          />
        )}

        {/* Rules Guide Modal */}
        {isRulesOpen && (
          <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
        )}

        {/* Board & Piece Customization Modal */}
        {isCustomizationOpen && (
          <CustomizationModal
            isOpen={isCustomizationOpen}
            onClose={() => setIsCustomizationOpen(false)}
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            onSelectBoardTheme={handleSelectBoardTheme}
            onSelectPieceTheme={handleSelectPieceTheme}
            onSelectThemeSet={handleSelectThemeSet}
          />
        )}
      </Suspense>

      {/* Footer (Desktop only to maximize mobile/tablet game space) */}
      <footer className="hidden lg:flex px-4 sm:px-8 py-1.5 border-t border-white/10 justify-center items-center text-[10px] text-stone-400 font-mono-code bg-[#121214] shrink-0">
        <span>Cờ Tướng Úp Việt Nam &copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
