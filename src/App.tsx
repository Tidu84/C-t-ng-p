/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  AiDifficulty,
  AiThinkingStats,
  GameMode,
  LabelDisplayMode,
  Move,
  Piece,
  PlayerColor,
  Position,
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
import { ChessBoard } from './components/ChessBoard';
import { GameControls } from './components/GameControls';
import { AiThinkingPanel } from './components/AiThinkingPanel';
import { CapturedPieces } from './components/CapturedPieces';
import { MoveHistory } from './components/MoveHistory';
import { RulesModal } from './components/RulesModal';
import { Trophy, AlertTriangle, Sparkles, RefreshCw, Flame } from 'lucide-react';

interface HistorySnapshot {
  board: (Piece | null)[][];
  turn: PlayerColor;
  capturedByRed: Piece[];
  capturedByBlack: Piece[];
  lastMove: Move | null;
}

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

  // Settings
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<AiDifficulty>('hard');
  const [aiThinkingTime, setAiThinkingTime] = useState<number>(10);
  const [aiStats, setAiStats] = useState<AiThinkingStats | null>(null);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [displayMode, setDisplayMode] = useState<LabelDisplayMode>('both');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const aiRunningRef = useRef<boolean>(false);

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
  }, []);

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
        isCovered: false, // Uncovers immediately upon move in Cờ Úp!
      };
      nextBoard[to.y][to.x] = placedPiece;

      // Uncover captured piece if it was covered
      const revealedCaptured = capturedPiece
        ? { ...capturedPiece, isCovered: false }
        : null;

      // Update captured collections
      let nextCapturedRed = capturedByRed;
      let nextCapturedBlack = capturedByBlack;
      if (revealedCaptured) {
        if (turn === 'red') {
          nextCapturedRed = [...capturedByRed, revealedCaptured];
          setCapturedByRed(nextCapturedRed);
        } else {
          nextCapturedBlack = [...capturedByBlack, revealedCaptured];
          setCapturedByBlack(nextCapturedBlack);
        }
      }

      // Audio and Special Reveal Toast
      if (revealedCaptured) {
        sound.playCapture();
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

      // Handle Repetition Warning Toasts (when streak reaches 3, 4, or 5)
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

      const moveNotation = formatMoveNotation(from, to, placedPiece, revealedCaptured, wasCovered);
      const newMoveRecord: Move = {
        from,
        to,
        piece: placedPiece,
        captured: revealedCaptured || undefined,
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

      // Check for Checkmate or Stalemate, taking into account repetition rules for the next player
      const nextLegalMoves = getAllLegalMoves(nextBoard, nextPlayer, updatedHistory);
      if (nextLegalMoves.length === 0) {
        // Game Over! Current player wins
        setWinner(turn);
        sound.playVictory();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setTurn(nextPlayer);
      }

      // Clear selection & hints
      setSelectedPos(null);
      setLegalMoves([]);
      setHintMove(null);
    },
    [board, turn, capturedByRed, capturedByBlack, lastMove, moveHistory]
  );

  // Square selection / move dispatcher
  const handleSelectSquare = (pos: Position) => {
    if (winner || isAiThinking) return;

    // If already selected a piece, check if clicking a legal target
    if (selectedPos) {
      const isTarget = legalMoves.some((m) => m.x === pos.x && m.y === pos.y);
      if (isTarget) {
        executeMove(selectedPos, pos);
        return;
      }
    }

    // Select piece of current player's turn
    const clickedPiece = board[pos.y][pos.x];
    if (clickedPiece && clickedPiece.color === turn) {
      setSelectedPos(pos);
      const moves = getLegalMoves(board, pos, moveHistory);
      setLegalMoves(moves);
      setHintMove(null);

      // Check if any moves were filtered out by the repetition rules
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

  // AI Turn Handler with strict time management & non-blocking execution
  useEffect(() => {
    if (gameMode !== 'ai' || turn !== 'black' || winner) {
      aiRunningRef.current = false;
      return;
    }

    if (aiRunningRef.current) return;
    aiRunningRef.current = true;
    setIsAiThinking(true);

    setAiStats({
      depth: 1,
      nodes: 0,
      score: 0,
      timeSpent: 0,
      maxTime: aiThinkingTime,
    });

    const currentBoard = board;

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
          // AI has no legal moves -> Red wins!
          setWinner('red');
          sound.playVictory();
          confetti();
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

    // In AI mode, undo 2 moves (both AI and player move) to return turn to player
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
      sound.playMove();
    }
  };

  // Provide a hint for the current player
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
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-between p-3 sm:p-5 md:p-8 selection:bg-amber-800">
      {/* Top Header */}
      <header className="w-full max-w-6xl flex items-center justify-between py-2 mb-3 border-b border-stone-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center shadow-lg border border-amber-500/40 text-amber-200">
            <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-wide font-serif text-amber-100 flex items-center gap-2">
              Cờ Tướng Úp
              <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700/50">
                Việt Nam
              </span>
            </h1>
            <p className="text-xs text-stone-400 hidden sm:block">
              Chiến thuật đỉnh cao & lật mở quân cờ bất ngờ
            </p>
          </div>
        </div>

        {/* Turn & Status Indicator Badge */}
        <div className="flex items-center gap-2.5">
          {isCheck && !winner && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-900/80 text-red-200 border border-red-500 text-xs font-bold animate-bounce shadow-lg shadow-red-900/50">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              CHIẾU TƯỚNG!
            </div>
          )}

          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-semibold text-xs transition-all shadow-md ${
              turn === 'red'
                ? 'bg-red-950/70 border-red-700/70 text-red-200'
                : 'bg-stone-800/80 border-stone-600 text-stone-200'
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full ${
                turn === 'red' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-stone-300 shadow-[0_0_8px_#d6d3d1]'
              } ${isAiThinking ? 'animate-ping' : ''}`}
            />
            <span>
              {turn === 'red'
                ? 'Lượt: Bên Đỏ'
                : gameMode === 'ai'
                ? isAiThinking
                  ? 'Máy đang tính...'
                  : 'Lượt: Máy (Đen)'
                : 'Lượt: Bên Đen'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="w-full max-w-6xl flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left / Center Column: The Chess Board & Notifications (Cols 1-7) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center gap-3">
          {/* Repetition Rule Warning / Violation Toast */}
          {ruleWarning && (
            <div className="w-full max-w-[580px] px-4 py-2.5 rounded-xl text-center text-xs font-bold border transition-all animate-pulse bg-red-950/90 text-red-200 border-red-500/80 shadow-lg shadow-red-950/50 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{ruleWarning}</span>
            </div>
          )}

          {/* Chess Board */}
          <ChessBoard
            board={board}
            turn={turn}
            selectedPos={selectedPos}
            legalMoves={legalMoves}
            lastMove={lastMove}
            isCheck={isCheck}
            flipped={flipped}
            displayMode={displayMode}
            onSelectSquare={handleSelectSquare}
            disabled={isAiThinking || Boolean(winner)}
            revealNotice={revealToast}
          />

          {/* Hint alert bar if active */}
          {hintMove && (
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-950/70 border border-amber-700/60 px-4 py-1.5 rounded-full">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Gợi ý nước đi tối ưu: ({hintMove.from.x + 1},{hintMove.from.y + 1}) ➔ ({hintMove.to.x + 1},{hintMove.to.y + 1})
            </div>
          )}
        </div>

        {/* Right Column: Controls, Captured Pieces, History (Cols 8-12) */}
        <div className="lg:col-span-5 flex flex-col gap-4 w-full">
          {/* AI Thinking Status Panel */}
          {gameMode === 'ai' && (
            <AiThinkingPanel
              isThinking={isAiThinking}
              stats={aiStats}
              maxTime={aiThinkingTime}
            />
          )}

          {/* Controls Bar */}
          <GameControls
            gameMode={gameMode}
            difficulty={difficulty}
            aiThinkingTime={aiThinkingTime}
            soundEnabled={soundEnabled}
            displayMode={displayMode}
            flipped={flipped}
            canUndo={historyStack.length > 0 && !isAiThinking && !winner}
            onSetGameMode={(mode) => {
              setGameMode(mode);
              startNewGame();
            }}
            onSetDifficulty={setDifficulty}
            onSetAiThinkingTime={setAiThinkingTime}
            onToggleSound={toggleSound}
            onCycleDisplayMode={cycleDisplayMode}
            onFlipBoard={() => setFlipped(!flipped)}
            onUndo={handleUndo}
            onHint={handleHint}
            onNewGame={startNewGame}
            onOpenRules={() => setIsRulesOpen(true)}
          />

          {/* Captured Pieces Trays */}
          <CapturedPieces
            redCaptured={capturedByRed}
            blackCaptured={capturedByBlack}
            displayMode={displayMode}
          />

          {/* Move History Log */}
          <MoveHistory moves={moveHistory} />
        </div>
      </main>

      {/* Game Over Victory Modal */}
      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-stone-900 border-2 border-amber-500/70 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-red-500/10 rounded-full blur-2xl" />

            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg text-stone-950">
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-extrabold font-serif text-amber-100 mb-1">
              CHIẾU BÍ!
            </h2>
            <p className="text-base font-bold text-amber-300 mb-4">
              {winner === 'red' ? 'BÊN ĐỎ THẮNG CUỘC!' : 'BÊN ĐEN THẮNG CUỘC!'}
            </p>

            <p className="text-xs text-stone-400 mb-6">
              Ván cờ kết thúc sau {moveHistory.length} nước đi kịch tính. Bạn có muốn làm lại ván mới không?
            </p>

            <button
              onClick={startNewGame}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm shadow-xl transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Chơi Ván Mới
            </button>
          </div>
        </div>
      )}

      {/* Rules Guide Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Footer */}
      <footer className="w-full max-w-6xl text-center py-2 text-[11px] text-stone-500 border-t border-stone-800/80 mt-4">
        Cờ Tướng Úp Việt Nam &copy; {new Date().getFullYear()} &bull; Chuẩn luật lật mở quân &bull; Sĩ, Tượng tự do xuất trận
      </footer>
    </div>
  );
}
