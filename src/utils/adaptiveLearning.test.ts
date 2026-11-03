import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeBoard } from './chessRules';
import { engineRootMoves } from './jieqiProtocol';
import {
  analyzeOpponentInRealTime,
  hashPublicBoard,
  learnFromCompletedMatch,
  loadAdaptiveMemory,
  selectAdaptiveRootMoves,
  toUciToken,
} from './adaptiveLearning';
import type { Move } from '../types';

test('analyzeOpponentInRealTime detects gambler vs turtle styles and activates corresponding counter-strategies', () => {
  const board = initializeBoard();
  const redPawn = board[6][4]!;

  // Gambler moves: rapid uncover + early river crossing + captures
  const gamblerHistory: Move[] = [
    { from: { x: 4, y: 6 }, to: { x: 4, y: 5 }, piece: redPawn, wasCovered: true, notation: '' },
    { from: { x: 4, y: 5 }, to: { x: 4, y: 4 }, piece: { ...redPawn, isCovered: false }, wasCovered: false, captured: board[3][4]!, notation: '' },
    { from: { x: 4, y: 4 }, to: { x: 4, y: 3 }, piece: { ...redPawn, isCovered: false }, wasCovered: false, captured: board[2][4]!, notation: '' },
  ];
  const gamblerProfile = analyzeOpponentInRealTime(gamblerHistory);
  assert.equal(gamblerProfile.detectedStyle, 'gambler');
  assert.equal(gamblerProfile.counterStrategy, 'iron_wall');

  // Turtle moves: repeated back-rank advisor/elephant consolidation without crossing river
  const redAdvisor = board[9][3]!;
  const redElephant = board[9][2]!;
  const turtleHistory: Move[] = [
    { from: { x: 3, y: 9 }, to: { x: 4, y: 8 }, piece: redAdvisor, wasCovered: true, notation: '' },
    { from: { x: 2, y: 9 }, to: { x: 4, y: 7 }, piece: redElephant, wasCovered: true, notation: '' },
  ];
  const turtleProfile = analyzeOpponentInRealTime(turtleHistory);
  assert.equal(turtleProfile.detectedStyle, 'turtle');
  assert.equal(turtleProfile.counterStrategy, 'pressure_chaos');
});

test('selectAdaptiveRootMoves blocks covered cannon trading covered horse and sacrificing revealed chariot for defended covered piece', () => {
  const board = initializeBoard();
  const rawMoves = engineRootMoves(board, 'black');
  assert.ok(rawMoves.includes('b7b0'));
  const { filteredRootMoves } = selectAdaptiveRootMoves(board, 'black', [], rawMoves);
  assert.equal(filteredRootMoves.includes('b7b0'), false);
  assert.equal(filteredRootMoves.includes('h7h0'), false);
});

test('learnFromCompletedMatch evolves depth bonus, bans fatal blunder moves, and absorbs player opening moves', () => {
  const memStorage = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => memStorage.get(k) ?? null,
    setItem: (k: string, v: string) => { memStorage.set(k, v); },
  };
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true });

  try {
    const b0 = initializeBoard();
    const redMove: Move = {
      from: { x: 2, y: 6 },
      to: { x: 2, y: 5 },
      piece: b0[6][2]!,
      wasCovered: true,
      notation: 'B7.1',
    };
    const b1 = b0.map((r) => [...r]);
    b1[5][2] = { ...b0[6][2]!, isCovered: false };
    b1[6][2] = null;

    const blunderFrom = { x: 0, y: 3 };
    const blunderTo = { x: 0, y: 4 };
    const blackBlunder: Move = {
      from: blunderFrom,
      to: blunderTo,
      piece: b1[3][0]!,
      wasCovered: true,
      notation: 'B1.1',
    };

    const profile = learnFromCompletedMatch(
      'win',
      [redMove, blackBlunder],
      [
        { board: b0, turn: 'red' },
        { board: b1, turn: 'black' },
      ]
    );

    assert.equal(profile.playerWins, 1);
    assert.ok(profile.evolutionBonusDepth >= 1);

    const memory = loadAdaptiveMemory();
    const b1Hash = hashPublicBoard(b1, 'black');
    const blunderUci = toUciToken(blunderFrom, blunderTo);
    assert.ok(memory.forbiddenMoves[b1Hash]?.includes(blunderUci));

    const rawOnB1 = engineRootMoves(b1, 'black');
    assert.ok(rawOnB1.includes(blunderUci));
    const filteredOnB1 = selectAdaptiveRootMoves(b1, 'black', [redMove], rawOnB1).filteredRootMoves;
    assert.equal(filteredOnB1.includes(blunderUci), false);
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
