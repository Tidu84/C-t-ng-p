/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  AiDifficulty,
  AiThinkingStats,
  BoardPerspective,
  BoardTheme,
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
import { detectCheckmatePattern, CheckmatePattern } from './utils/checkmatePatterns';
import { VENUES, VENUE_LIST } from './utils/venues';
import { getRandomResignQuote, getRandomDrawQuote } from './utils/encouragingQuotes';
import { ChessBoard } from './components/ChessBoard';
import { GameControls } from './components/GameControls';
import { AiThinkingPanel } from './components/AiThinkingPanel';
import { CapturedTrays } from './components/CapturedTrays';
import { MoveHistory } from './components/MoveHistory';
import { RulesModal } from './components/RulesModal';
import { VictoryModal } from './components/VictoryModal';
import { StreetBanter } from './components/StreetBanter';
import { UserProfileModal } from './components/UserProfileModal';
import { MatchHistoryModal } from './components/MatchHistoryModal';
import { MobilePlayerHeader } from './components/MobilePlayerHeader';
import { ConfirmActionModal } from './components/ConfirmActionModal';
import { SoundSettingsModal } from './components/SoundSettingsModal';
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
  Layers,
  Settings,
  Check,
  PlayCircle,
  Volume2,
  User,
  Music,
} from 'lucide-react';

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
  const [revealToast, setRevealToast] = useState<{ text: string; isHighValue: boolean } | null>(null);
  const [ruleWarning, setRuleWarning] = useState<string | null>(null);
  const [customToast, setCustomToast] = useState<string | null>(null);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(true);

  // Settings & Themes
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<AiDifficulty>('hard');
  const [aiThinkingTime, setAiThinkingTime] = useState<number>(10);
  const [aiStats, setAiStats] = useState<AiThinkingStats | null>(null);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [displayMode, setDisplayMode] = useState<LabelDisplayMode>('both');
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('quan_coc');
  const [perspective, setPerspective] = useState<BoardPerspective>(() => {
    try {
      const saved = localStorage.getItem('co_up_perspective');
      return saved === '2d' ? '2d' : '3d';
    } catch {
      return '3d';
    }
  });
  const [riverMode, setRiverMode] = useState<RiverTextMode>(() => {
    try {
      const saved = localStorage.getItem('co_up_river_mode') as RiverTextMode;
      return saved || 'blank';
    } catch {
      return 'blank';
    }
  });
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
      const next: RiverTextMode = prev === 'blank' ? 'proverb' : prev === 'proverb' ? 'han' : 'blank';
      try {
        localStorage.setItem('co_up_river_mode', next);
      } catch {}
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
    setCustomToast(`🏮 Chào mừng đến: ${VENUES[newVenue].name} - ${VENUES[newVenue].tagline}`);
    setTimeout(() => setCustomToast(null), 3500);
  };

  // Traditional Pipa / Guitar Background Music
  const [isBgmOn, setIsBgmOn] = useState<boolean>(false);
  const handleToggleBgm = () => {
    const playing = sound.toggleBgm();
    setIsBgmOn(playing);
    setCustomToast(playing ? '🎵 Đang tấu đàn Tỳ Bà thanh tao...' : '🔇 Đã tắt nhạc nền Tỳ Bà');
    setTimeout(() => setCustomToast(null), 2500);
  };

  // Capture Visual Effect State
  const [captureEffect, setCaptureEffect] = useState<{
    pos: Position;
    text: string;
    isLoss: boolean;
    id: number;
  } | null>(null);

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

  // Mobile View Tab state (on screens < 768px)
  const [mobileTab, setMobileTab] = useState<'board' | 'notation' | 'trays' | 'settings'>('board');

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

  const toggleBoardTheme = () => {
    setBoardTheme((prev) => (prev === 'quan_coc' ? 'ky_vien' : 'quan_coc'));
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
    return detectCheckmatePattern(lastMove, board, winner, moveHistory.length);
  }, [winner, lastMove, board, moveHistory.length]);

  // Reset Game
  const startNewGame = useCallback(() => {
    aiRunningRef.current = false;
    const freshBoard = initializeBoard();
    setBoard(freshBoard);
    setTurn('red');
    setWinner(null);
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
    setRevealToast(null);
    setRuleWarning(null);
    setCustomToast(null);
    setShowVictoryModal(true);
    setIsMatchSavedInCurrentGame(false);
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
        const isHighValue = ['chariot', 'cannon', 'horse', 'king'].includes(recordedCaptured.trueRole);
        if (isLoss) {
          sound.playPieceLost();
        } else {
          sound.playCapture(isHighValue);
        }

        const roleVi = ROLE_VI_NAMES[recordedCaptured.trueRole][recordedCaptured.color].toUpperCase();
        const fxText = isLoss ? `🛡️ MẤT ${roleVi}!` : `⚔️ BẮT ${roleVi}!`;
        setCaptureEffect({
          pos: to,
          text: fxText,
          isLoss,
          id: Date.now(),
        });
        setTimeout(() => setCaptureEffect(null), 1200);
      } else if (wasCovered) {
        sound.playFlip();
      } else {
        sound.playMove();
      }

      if (wasCovered) {
        const isHighValue = ['chariot', 'cannon', 'horse'].includes(placedPiece.trueRole);
        const roleVi = ROLE_VI_NAMES[placedPiece.trueRole][turn];
        setRevealToast({
          text: `${turn === 'red' ? 'Đỏ' : 'Đen'} vừa lật được [${roleVi}]!`,
          isHighValue,
        });
        setTimeout(() => setRevealToast(null), 4000);
      } else {
        setRevealToast(null);
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
        setShowVictoryModal(true);
        sound.playVictory();
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
    [board, turn, capturedByRed, capturedByBlack, lastMove, moveHistory]
  );

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
      setIsCheck(isKingInCheck(snapshot.board, snapshot.turn).inCheck);
      setSelectedPos(null);
      setLegalMoves([]);
      setHintMove(null);
      setAiStats(null);
      setRuleWarning(null);
      setShowVictoryModal(true);
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
    <div className="min-h-screen w-full bg-[#121214] text-[#e2e2e7] flex flex-col selection:bg-amber-500 selection:text-stone-950 font-sans">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between px-3 sm:px-8 py-3 border-b border-white/10 gap-2 bg-[#121214]">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="font-display text-lg sm:text-2xl font-extrabold uppercase tracking-tight text-amber-500 flex items-center">
            Cờ Tướng Úp
            <span className="font-mono-code text-[10px] px-1.5 py-0.5 bg-amber-500 text-stone-950 font-bold rounded-sm ml-2 tracking-normal">
              VN
            </span>
          </h1>
        </div>

        {/* Center Turn & Status Indicator Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isCheck && !winner && (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-red-950/90 text-red-200 border border-red-500 text-xs font-bold animate-bounce shadow-lg shadow-red-950/50">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">CHIẾU TƯỚNG!</span>
              <span className="sm:hidden">CHIẾU!</span>
            </div>
          )}

          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 border transition-all ${
              winner
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : turn === 'red'
                ? 'bg-red-500/15 border-red-500/30 text-red-300'
                : 'bg-stone-500/15 border-stone-500/30 text-stone-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                winner
                  ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b]'
                  : turn === 'red'
                  ? 'bg-red-500 shadow-[0_0_10px_#ef4444]'
                  : 'bg-stone-300 shadow-[0_0_10px_#d4d4d8]'
              } ${isAiThinking ? 'animate-ping' : ''}`}
            />
            <span className="font-medium text-xs">
              {winner
                ? winner === 'draw'
                  ? 'Ván Cờ Hòa!'
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
              className="px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Xem Sát Pháp</span>
            </button>
          )}
        </div>

        {/* Right Actions: Profile & History & Sound/Guitar Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button
            onClick={() => setIsSoundSettingsOpen(true)}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Cài đặt âm thanh cạch ăn quân, nhạc buồn và nhạc guitar"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Âm thanh & Guitar</span>
          </button>

          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 text-xs font-semibold transition-colors"
            title="Hồ sơ kỳ thủ"
          >
            <div className="w-5 h-5 rounded-full overflow-hidden bg-stone-900 border border-amber-400 flex items-center justify-center text-xs">
              {playerProfile.isCustomAvatar ? (
                <img src={playerProfile.avatar} alt="avt" className="w-full h-full object-cover" />
              ) : (
                <span>{playerProfile.avatar}</span>
              )}
            </div>
            <span className="hidden sm:inline max-w-[80px] truncate">{playerProfile.name}</span>
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors"
            title="Lịch sử ván đấu đã lưu"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Lịch sử ({savedMatches.length})</span>
          </button>
        </div>
      </header>

      {/* Main Viewport Layout */}
      <main className="flex-1 w-full grid grid-cols-1 md:grid-cols-[1fr_360px] lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_420px] overflow-hidden md:overflow-y-auto">
        {/* Left Column: Game Viewport */}
        <div
          className={`flex-col items-center justify-start p-2 sm:p-5 md:p-6 bg-[radial-gradient(circle_at_center,_#1e1e22_0%,_#121214_100%)] gap-2.5 sm:gap-3.5 overflow-y-auto ${
            mobileTab === 'board' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Custom Notification Toast */}
          {customToast && (
            <div className="w-full max-w-[590px] px-3.5 py-2 rounded-xl text-center text-xs font-bold border transition-all animate-fade-in bg-amber-950/90 text-amber-200 border-amber-500/80 shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{customToast}</span>
            </div>
          )}

          {/* Repetition Rule Warning Toast */}
          {ruleWarning && (
            <div className="w-full max-w-[590px] px-3.5 py-2 rounded-xl text-center text-xs font-bold border transition-all animate-pulse bg-red-950/90 text-red-200 border-red-500/80 shadow-lg shadow-red-950/50 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{ruleWarning}</span>
            </div>
          )}

          {/* Sideline Cheerful Street Banter */}
          <StreetBanter
            lastMove={lastMove}
            isCheck={isCheck}
            winner={winner}
            theme={boardTheme}
          />

          {/* Venue Header Banner (Không gian Quán Cờ) */}
          {VENUES[venue] && (
            <div className={`w-full max-w-[590px] px-3 py-2 rounded-xl bg-gradient-to-r ${VENUES[venue].bannerBg} border border-amber-500/30 flex items-center justify-between shadow-lg`}>
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-2xl shrink-0">{VENUES[venue].icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-amber-200 uppercase tracking-wide truncate">{VENUES[venue].name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shrink-0">{VENUES[venue].badge}</span>
                  </div>
                  <p className="text-[10px] text-stone-300 truncate">{VENUES[venue].tagline}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {VENUE_LIST.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleSetVenue(v.id)}
                    className={`px-1.5 py-1 rounded-lg text-xs transition-all border flex items-center gap-1 ${
                      venue === v.id
                        ? 'bg-amber-500 text-stone-950 border-amber-300 font-bold shadow-md scale-105'
                        : 'bg-stone-900/80 text-stone-400 border-white/10 hover:border-white/30'
                    }`}
                    title={v.name}
                  >
                    <span>{v.icon}</span>
                    <span className="hidden sm:inline text-[10px]">{v.shortName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MOBILE ONLY (< 768px): Top Opponent Header */}
          <div className="w-full max-w-[590px] md:hidden">
            <MobilePlayerHeader
              color={flipped ? 'red' : 'black'}
              isTurn={turn === (flipped ? 'red' : 'black')}
              profile={playerProfile}
              gameMode={gameMode}
              difficulty={difficulty}
              capturedCount={flipped ? capturedByRed.length : capturedByBlack.length}
              coveredCapturedCount={
                flipped
                  ? capturedByRed.filter((p) => p.wasCoveredWhenCaptured).length
                  : capturedByBlack.filter((p) => p.wasCoveredWhenCaptured).length
              }
              isUser={flipped}
              wins={playerStats.wins}
              onOpenProfile={() => setIsProfileOpen(true)}
            />
          </div>

          {/* Central Area: Board & Under-Board Actions Bar */}
          <div className="w-full max-w-[590px] flex flex-col items-center gap-2">
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
              perspective={perspective}
              riverMode={riverMode}
              onTogglePerspective={handleTogglePerspective}
              onCycleRiverMode={handleCycleRiverMode}
              onSelectSquare={handleSelectSquare}
              disabled={isAiThinking || Boolean(winner)}
              revealNotice={revealToast}
              captureEffect={captureEffect}
            />

            {/* Universal Under-Board Quick Action Bar (Đầy đủ trên mọi thiết bị PC/Tablet/Mobile) */}
            <div className="w-full grid grid-cols-6 gap-1 p-1 bg-[#18181c] border border-amber-500/30 rounded-xl shadow-lg">
              <button
                onClick={handleUndo}
                disabled={historyStack.length === 0 || isAiThinking || Boolean(winner)}
                className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-stone-200 text-[10px] font-semibold transition-all active:scale-95 border border-white/5"
                title="Đi lại nước cờ trước"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-300 mb-0.5" />
                <span>Đi lại</span>
              </button>

              <button
                onClick={handleHint}
                disabled={isAiThinking || Boolean(winner)}
                className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-amber-300 text-[10px] font-semibold transition-all active:scale-95 border border-white/5"
                title="Gợi ý nước cờ hay"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                <span>Gợi ý</span>
              </button>

              <button
                onClick={handleOfferDraw}
                disabled={Boolean(winner) || isAiThinking}
                className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-amber-300 text-[10px] font-semibold transition-all active:scale-95 border border-white/5"
                title="Xin hòa ván cờ"
              >
                <Handshake className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                <span>Xin hòa</span>
              </button>

              <button
                onClick={handleResign}
                disabled={Boolean(winner) || isAiThinking}
                className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-red-300 text-[10px] font-semibold transition-all active:scale-95 border border-white/5"
                title="Đầu hàng / Nhận thua"
              >
                <Flag className="w-3.5 h-3.5 text-red-400 mb-0.5" />
                <span>Đầu hàng</span>
              </button>

              <button
                onClick={handleToggleBgm}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10px] font-semibold transition-all active:scale-95 border ${
                  isBgmOn
                    ? 'bg-amber-950/70 text-amber-200 border-amber-500/60 shadow-sm'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border-white/5'
                }`}
                title="Bật/Tắt nhạc cổ đàn Tỳ Bà"
              >
                <Music className={`w-3.5 h-3.5 mb-0.5 ${isBgmOn ? 'text-amber-400 animate-bounce' : 'text-stone-500'}`} />
                <span className="truncate">{isBgmOn ? 'Tỳ Bà: BẬT' : 'Tỳ Bà'}</span>
              </button>

              <button
                onClick={handleSaveDraft}
                className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-emerald-300 text-[10px] font-semibold transition-all active:scale-95 border border-white/5"
                title="Lưu ván đang chơi để tí nữa chơi tiếp"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400 mb-0.5" />
                <span>Lưu ván</span>
              </button>
            </div>

            {/* Hint alert bar */}
            {hintMove && (
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-950/70 border border-amber-700/60 px-4 py-1.5 rounded-full">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Gợi ý nước đi: ({hintMove.from.x + 1},{hintMove.from.y + 1}) ➔ ({hintMove.to.x + 1},{hintMove.to.y + 1})
              </div>
            )}
          </div>

          {/* MOBILE ONLY (< 768px): Bottom Player Header */}
          <div className="w-full max-w-[590px] flex flex-col gap-2 md:hidden">
            <MobilePlayerHeader
              color={flipped ? 'black' : 'red'}
              isTurn={turn === (flipped ? 'black' : 'red')}
              profile={playerProfile}
              gameMode={gameMode}
              difficulty={difficulty}
              capturedCount={flipped ? capturedByBlack.length : capturedByRed.length}
              coveredCapturedCount={
                flipped
                  ? capturedByBlack.filter((p) => p.wasCoveredWhenCaptured).length
                  : capturedByRed.filter((p) => p.wasCoveredWhenCaptured).length
              }
              isUser={!flipped}
              wins={playerStats.wins}
              onOpenProfile={() => setIsProfileOpen(true)}
            />
          </div>

          {/* Dual Trays: Trái (Quân Úp) & Phải (Quân Ngửa) */}
          <div className="w-full max-w-[590px]">
            <CapturedTrays
              capturedByRed={capturedByRed}
              capturedByBlack={capturedByBlack}
              displayMode={displayMode}
              userColor="red"
              gameMode={gameMode}
            />
          </div>
        </div>

        {/* Right Column: Control Panel (Visible side-by-side on tablet/desktop, tabbed on mobile) */}
        <div
          className={`bg-[#18181c] border-t md:border-t-0 md:border-l border-white/10 flex-col p-4 sm:p-5 gap-5 overflow-y-auto ${
            mobileTab === 'board' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* On mobile notation tab, show notation and stats first */}
          {mobileTab === 'notation' && (
            <div className="md:hidden flex flex-col gap-4">
              <span className="font-mono-code text-[10px] uppercase tracking-[0.15em] text-stone-400 block">
                04 // Biên bản ván đấu ({moveHistory.length} nước)
              </span>
              <MoveHistory moves={moveHistory} />

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

          {/* 01 // Chế độ chơi & Cài đặt (Always on desktop/tablet, or on mobile settings tab) */}
          <div className={mobileTab === 'notation' ? 'hidden md:block' : 'block'}>
            <GameControls
              gameMode={gameMode}
              difficulty={difficulty}
              aiThinkingTime={aiThinkingTime}
              soundEnabled={soundEnabled}
              displayMode={displayMode}
              boardTheme={boardTheme}
              perspective={perspective}
              riverMode={riverMode}
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
              onToggleSound={toggleSound}
              onCycleDisplayMode={cycleDisplayMode}
              onToggleBoardTheme={toggleBoardTheme}
              onTogglePerspective={handleTogglePerspective}
              onCycleRiverMode={handleCycleRiverMode}
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
            <div className={mobileTab === 'notation' ? 'hidden md:block' : 'block'}>
              <AiThinkingPanel
                isThinking={isAiThinking}
                stats={aiStats}
                maxTime={aiThinkingTime}
              />
            </div>
          )}

          {/* 03 // Thống kê bắt quân (Desktop & Tablet) */}
          <div className="hidden md:block">
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

          {/* 04 // Biên bản (Desktop & Tablet) */}
          <div className="hidden md:block">
            <span className="font-mono-code text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-2 block">
              04 // Biên bản ({moveHistory.length} nước)
            </span>
            <MoveHistory moves={moveHistory} />
          </div>
        </div>
      </main>

      {/* Mobile Navigation Tabs Bar (< 768px only) */}
      <nav className="md:hidden border-t border-white/10 bg-[#141416] p-1.5 grid grid-cols-3 gap-1 z-20">
        <button
          onClick={() => setMobileTab('board')}
          className={`flex flex-col items-center py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
            mobileTab === 'board'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Grid className="w-4 h-4 mb-0.5" />
          <span>Bàn cờ</span>
        </button>
        <button
          onClick={() => setMobileTab('notation')}
          className={`flex flex-col items-center py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
            mobileTab === 'notation'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span>Biên bản ({moveHistory.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('settings')}
          className={`flex flex-col items-center py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
            mobileTab === 'settings'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Settings className="w-4 h-4 mb-0.5" />
          <span>Cài đặt</span>
        </button>
      </nav>

      {/* Illustrated Checkmate / Draw Victory Modal */}
      {winner && checkmatePattern && showVictoryModal && (
        <VictoryModal
          winner={winner}
          pattern={checkmatePattern}
          moveCount={moveHistory.length}
          encouragingQuote={encouragingQuote}
          onNewGame={startNewGame}
          onInspectBoard={() => setShowVictoryModal(false)}
          onSaveMatchToHistory={handleSaveMatchToHistory}
          isSaved={isMatchSavedInCurrentGame}
        />
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={playerProfile}
        onSaveProfile={handleSaveProfile}
        stats={playerStats}
      />

      {/* Saved Matches History Modal */}
      <MatchHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedMatches={savedMatches}
        onDeleteMatch={handleDeleteMatch}
      />

      {/* Confirm Draw / Resign / Resume Modal */}
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

      {/* Sound Settings & Custom Guitar Upload Modal */}
      <SoundSettingsModal
        isOpen={isSoundSettingsOpen}
        onClose={() => setIsSoundSettingsOpen(false)}
        isBgmOn={isBgmOn}
        onToggleBgm={handleToggleBgm}
      />

      {/* Rules Guide Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Footer */}
      <footer className="px-4 sm:px-8 py-2.5 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center text-[10px] text-stone-400 font-mono-code bg-[#121214] gap-1">
        <span>Cờ Tướng Úp Việt Nam &copy; {new Date().getFullYear()}</span>
        <span>Chuẩn luật mở quân &bull; Cục Thủy Mặc &bull; Lưu ván đấu &bull; Quán Cóc Kỳ Nghệ</span>
      </footer>
    </div>
  );
}
