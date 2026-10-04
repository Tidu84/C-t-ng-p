/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Real 3D first-person table scene (three.js via @react-three/fiber). Lazy loaded by BoardView.
 * Board coordinates: x 0..8 (left→right from Red), y 0..9 (0 = Black side / far, 9 = Red side / near).
 * World: X = (x - 4) * S, Z = (y - 4.5) * S, board surface at Y = tableTop + BOARD_THICKNESS.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useCursor } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { BackgroundScene3D, BoardTheme, LabelDisplayMode, Move, Piece, PlayerColor, Position } from '../../types';
import { BOARD_COLS, BOARD_ROWS } from '../../utils/chessRules';
import { getBoardTexture, getPieceBackTexture, getPieceFaceTexture } from './textures';
import { VENUE_LAYOUT } from './venues3d';

export interface Board3DSceneProps {
  board: (Piece | null)[][];
  turn: PlayerColor;
  selectedPos: Position | null;
  legalMoves: Position[];
  lastMove: Move | null;
  isCheck: boolean;
  flipped: boolean;
  displayMode: LabelDisplayMode;
  theme: BoardTheme;
  bgScene: BackgroundScene3D;
  isLiteMode: boolean;
  disabled: boolean;
  onSelectSquare: (pos: Position) => void;
  /** Increment to reset the camera to the current preset framing. */
  resetSignal: number;
  /** Camera pitch selected from the 3D view controls, in degrees above the board. */
  cameraElevation: number;
  /** 'player' = close, board fills the screen (default); 'spectator' = wide view of the venue. */
  cameraView?: CameraView;
}

const S = 0.05; // intersection spacing (m)
const BOARD_W = 9 * S;
const BOARD_D = 10 * S;
const BOARD_THICKNESS = 0.03;
const FRAME = 0.025;
const PIECE_R = 0.0215;
const PIECE_H = 0.013;
/** Pointer travel (px) above which a press is treated as a camera drag, not a click. */
const DRAG_PX = 6;

const toWorld = (x: number, y: number) => ({ X: (x - 4) * S, Z: (y - 4.5) * S });

// ---------------------------------------------------------------------------
// Board slab
// ---------------------------------------------------------------------------

const BoardSlab: React.FC<{
  top: number;
  theme: BoardTheme;
  viewSide: 1 | -1;
  disabled: boolean;
  onPick: (pos: Position) => void;
  onHover: (pos: Position | null) => void;
}> = ({ top, theme, viewSide, disabled, onPick, onHover }) => {
  const tex = useMemo(() => getBoardTexture(theme, '楚 河          漢 界'), [theme]);
  const pick = (e: ThreeEvent<MouseEvent | PointerEvent>): Position | null => {
    const p = e.point;
    const x = Math.round(p.x / S + 4);
    const y = Math.round(p.z / S + 4.5);
    if (x < 0 || x >= BOARD_COLS || y < 0 || y >= BOARD_ROWS) return null;
    const w = toWorld(x, y);
    if (Math.hypot(p.x - w.X, p.z - w.Z) > S * 0.55) return null;
    return { x, y };
  };
  return (
    <group position={[0, top, 0]}>
      {/* frame */}
      <mesh position={[0, BOARD_THICKNESS / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BOARD_W + FRAME * 2, BOARD_THICKNESS, BOARD_D + FRAME * 2]} />
        <meshStandardMaterial color="#5a3518" roughness={0.55} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      {/* playing surface (texture) – also the click target */}
      <mesh
        position={[0, BOARD_THICKNESS + 0.0006, 0]}
        // the grid is symmetric under a half turn, so rotating the surface for Black keeps
        // the river text upright without changing any intersection position
        rotation={[-Math.PI / 2, 0, viewSide === -1 ? Math.PI : 0]}
        receiveShadow
        onClick={(e) => {
          if (disabled || e.delta > DRAG_PX) return;
          const pos = pick(e);
          if (pos) {
            e.stopPropagation();
            onPick(pos);
          }
        }}
        onPointerMove={(e) => onHover(pick(e))}
        onPointerOut={() => onHover(null)}
      >
        <planeGeometry args={[BOARD_W, BOARD_D]} />
        <meshStandardMaterial map={tex} roughness={0.62} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

const PIECE_LID_H = PIECE_H * 0.48;
const sideGeometry = new THREE.LatheGeometry(
  [
    new THREE.Vector2(0, -PIECE_H / 2),
    new THREE.Vector2(PIECE_R * 0.78, -PIECE_H / 2),
    new THREE.Vector2(PIECE_R * 0.94, -PIECE_H * 0.42),
    new THREE.Vector2(PIECE_R, -PIECE_H * 0.18),
    new THREE.Vector2(PIECE_R, PIECE_H * 0.18),
    new THREE.Vector2(PIECE_R * 0.94, PIECE_H * 0.42),
    new THREE.Vector2(PIECE_R * 0.78, PIECE_H / 2),
    new THREE.Vector2(0, PIECE_H / 2),
  ],
  48,
);
const capGeometry = new THREE.CircleGeometry(PIECE_R * 0.94, 64);
const lidGeometry = new THREE.LatheGeometry(
  [
    new THREE.Vector2(0, -PIECE_LID_H / 2),
    new THREE.Vector2(PIECE_R * 0.82, -PIECE_LID_H / 2),
    new THREE.Vector2(PIECE_R * 0.98, -PIECE_LID_H * 0.3),
    new THREE.Vector2(PIECE_R * 1.04, 0),
    new THREE.Vector2(PIECE_R * 1.04, PIECE_LID_H * 0.25),
    new THREE.Vector2(PIECE_R * 0.96, PIECE_LID_H * 0.46),
    new THREE.Vector2(PIECE_R * 0.82, PIECE_LID_H / 2),
    new THREE.Vector2(0, PIECE_LID_H / 2),
  ],
  48,
);
const lidFaceGeometry = new THREE.CircleGeometry(PIECE_R * 0.82, 48);

const Piece3D: React.FC<{
  piece: Piece;
  x: number;
  y: number;
  boardTop: number;
  viewSide: 1 | -1;
  selected: boolean;
  inCheck: boolean;
  displayMode: LabelDisplayMode;
  clickable: boolean;
  onPick: (pos: Position) => void;
}> = ({ piece, x, y, boardTop, viewSide, selected, inCheck, displayMode, clickable, onPick }) => {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const initialCovered = useRef(piece.isCovered);
  const lid = useRef<THREE.Group>(null);
  const lidProgress = useRef(0);
  const lidEjecting = useRef(false);
  const flipProgress = useRef(piece.isCovered ? 0 : 1);
  const flipping = useRef(false);
  const wasCovered = useRef(piece.isCovered);
  const invalidate = useThree((s) => s.invalidate);
  const [hovered, setHovered] = useState(false);
  const [showLid, setShowLid] = useState(piece.isCovered);
  useCursor(hovered && clickable);

  const { X, Z } = toWorld(x, y);
  const baseY = boardTop + PIECE_H / 2 + 0.0008;
  const lift = selected ? 0.014 : hovered && clickable ? 0.005 : 0;
  const face = getPieceFaceTexture(piece.color, piece.trueRole, displayMode);
  const back = getPieceBackTexture(piece.color);
  const rimColor = piece.color === 'red' ? '#b87332' : '#76502d';
  const lidColor = piece.color === 'red' ? '#9b4824' : '#4a3828';

  useLayoutEffect(() => {
    if (group.current) group.current.position.set(X, baseY, Z);
  }, [X, Z, baseY]);

  useLayoutEffect(() => {
    if (body.current) body.current.rotation.x = initialCovered.current ? 0 : Math.PI;
  }, []);

  useEffect(() => {
    if (piece.isCovered) {
      setShowLid(true);
      lidProgress.current = 0;
      lidEjecting.current = false;
      flipProgress.current = 0;
      flipping.current = false;
      if (body.current) body.current.rotation.x = 0;
    } else if (wasCovered.current) {
      lidProgress.current = 0;
      lidEjecting.current = true;
      flipProgress.current = 0;
      flipping.current = true;
    }
    wasCovered.current = piece.isCovered;
    invalidate();
  }, [piece.isCovered, invalidate]);

  useEffect(() => invalidate(), [X, Z, lift, displayMode, invalidate]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.exp(-dt * 11);

    // Flip the hidden piece at the same time the lid is thrown clear.
    if (flipping.current && body.current) {
      flipProgress.current = Math.min(1, flipProgress.current + dt / 0.58);
      const t = flipProgress.current;
      const eased = t * t * (3 - 2 * t);
      body.current.rotation.x = Math.PI * eased;
      if (t >= 1) flipping.current = false;
      invalidate();
    }

    const dx = X - g.position.x;
    const dz = Z - g.position.z;
    const dist = Math.hypot(dx, dz);
    g.position.x += dx * k;
    g.position.z += dz * k;

    // A covered piece is a complete, readable piece beneath a separate wooden lid.
    // When revealed, lift and roll the lid away so its face is clearly exposed.
    if (lidEjecting.current && lid.current) {
      lidProgress.current = Math.min(1, lidProgress.current + dt / 0.58);
      const t = lidProgress.current;
      const eased = t * t * (3 - 2 * t);
      const lidBase = PIECE_H / 2 + PIECE_LID_H / 2 + 0.001;
      lid.current.position.set(PIECE_R * 1.2 * eased, lidBase + 0.055 * eased, 0);
      lid.current.rotation.set(-0.22 * eased, 0, Math.PI * 1.6 * eased);
      lid.current.scale.setScalar(1 - eased * 0.82);
      if (t >= 1) {
        lidEjecting.current = false;
        setShowLid(false);
      }
      invalidate();
    }

    const travelHop = Math.min(dist * 0.55, 0.05);
    const targetY = baseY + lift + travelHop;
    g.position.y += (targetY - g.position.y) * Math.min(1, k * 1.6);
    if (dist > 0.0004 || Math.abs(targetY - g.position.y) > 0.0004) invalidate();
  });

  const handlePick = (e: ThreeEvent<MouseEvent | PointerEvent>) => {
    if (!clickable || e.delta > DRAG_PX) return;
    e.stopPropagation();
    onPick({ x, y });
  };
  const handleHover = (value: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(value);
  };

  return (
    <group ref={group} rotation={[0, viewSide === 1 ? 0 : Math.PI, 0]}>
      <group ref={body}>
      {/* The face starts underneath; flipping the body brings the revealed role face upward. */}
      <mesh
        geometry={sideGeometry}
        castShadow
        receiveShadow
        onPointerOver={handleHover(true)}
        onPointerOut={handleHover(false)}
        onClick={handlePick}
      >
        <meshPhysicalMaterial
          color={rimColor}
          roughness={0.32}
          metalness={0.025}
          clearcoat={0.24}
          clearcoatRoughness={0.3}
          emissive={selected ? '#ffb300' : inCheck ? '#ff1a1a' : '#000000'}
          emissiveIntensity={selected ? 0.3 : inCheck ? 0.42 : 0}
        />
      </mesh>

      <mesh
        geometry={capGeometry}
        position={[0, PIECE_H / 2 + 0.0002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerOver={handleHover(true)}
        onPointerOut={handleHover(false)}
        onClick={handlePick}
      >
        <meshStandardMaterial
          map={back}
          roughness={0.42}
          emissive={selected ? '#ffb300' : '#000000'}
          emissiveIntensity={selected ? 0.16 : 0}
        />
      </mesh>

      <mesh geometry={capGeometry} position={[0, -PIECE_H / 2 - 0.0002, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>

      </group>

      {showLid && (
        <group ref={lid} position={[0, PIECE_H / 2 + PIECE_LID_H / 2 + 0.001, 0]}>
          <mesh
            geometry={lidGeometry}
            castShadow
            onPointerOver={handleHover(true)}
            onPointerOut={handleHover(false)}
            onClick={handlePick}
          >
            <meshPhysicalMaterial
              color={lidColor}
              roughness={0.3}
              metalness={0.025}
              clearcoat={0.3}
              clearcoatRoughness={0.24}
            />
          </mesh>
          <mesh
            geometry={lidFaceGeometry}
            position={[0, PIECE_LID_H / 2 + 0.00015, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerOver={handleHover(true)}
            onPointerOut={handleHover(false)}
            onClick={handlePick}
          >
            <meshStandardMaterial map={back} roughness={0.3} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Markers (legal moves, last move, check, hover)
// ---------------------------------------------------------------------------

const Disc: React.FC<{ x: number; y: number; top: number; r: number; color: string; opacity?: number }> = ({ x, y, top, r, color, opacity = 0.85 }) => {
  const { X, Z } = toWorld(x, y);
  return (
    <mesh position={[X, top + 0.0012, Z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <circleGeometry args={[r, 24]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

const Ring: React.FC<{ x: number; y: number; top: number; inner: number; outer: number; color: string; opacity?: number; pulse?: boolean }> = ({ x, y, top, inner, outer, color, opacity = 0.9, pulse = false }) => {
  const { X, Z } = toWorld(x, y);
  const ref = useRef<THREE.Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  useFrame(({ clock }) => {
    if (!pulse || !ref.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 6) * 0.12;
    ref.current.scale.set(s, s, 1);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(clock.elapsedTime * 6) * 0.35;
    invalidate();
  });
  return (
    <mesh ref={ref} position={[X, top + 0.0015, Z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
      <ringGeometry args={[inner, outer, 32]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

export type CameraView = 'player' | 'spectator';

/**
 * Camera presets. `fill` is the fraction of the canvas (both axes, NDC half-extent) the board frame may
 * occupy; `elevation` is the viewing angle above the horizontal; `bottomY` is where the near edge of the
 * board lands in NDC (-1 = bottom of the canvas).
 */
const VIEW_PRESETS: Record<CameraView, { fov: number; elevation: number; fill: number; bottomY: number }> = {
  // Leaning over the board: the board fills ~88% of the viewport, near edge just above the bottom,
  // surroundings only peek in at the edges
  player: { fov: 46, elevation: 60, fill: 1.2, bottomY: -0.999 },
  // Spectator: step back and lower the eye so the venue is visible
  spectator: { fov: 55, elevation: 30, fill: 0.5, bottomY: -0.999 },
};

const _frameCam = new THREE.PerspectiveCamera();
const _v = new THREE.Vector3();
// Place the OrbitControls target one-third of the way up from the bottom of the frame,
// so mouse-wheel and pinch zoom pivot around the board instead of the screen center.
const ZOOM_FOCUS_NDC_Y = -1 / 3;
const applyZoomFocus = (camera: THREE.PerspectiveCamera) => {
  camera.projectionMatrix.elements[9] = -ZOOM_FOCUS_NDC_Y;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
};

/**
 * Solve camera distance + target offset so the whole board (frame and piece tops) fills `fill` of the
 * viewport for the given aspect/FOV/elevation. Works for any aspect ratio (desktop, portrait phones).
 */
export function frameBoard(aspect: number, view: CameraView, boardTop: number, viewSide: 1 | -1, bgScene?: BackgroundScene3D, cameraElevation?: number) {
  // The tea-stall photo shows its tabletop in the lower half of the frame.
  const preset = view === 'player' && bgScene === 'tra_da'
    ? { ...VIEW_PRESETS.player, elevation: 28, fill: 1.2, bottomY: -0.999 }
    : VIEW_PRESETS[view];
  const { fov, fill, bottomY } = preset;
  const elevation = THREE.MathUtils.clamp(cameraElevation ?? preset.elevation, 18, 78);
  _frameCam.fov = fov;
  _frameCam.aspect = aspect;
  _frameCam.near = 0.01;
  _frameCam.far = 50;
  _frameCam.updateProjectionMatrix();
  applyZoomFocus(_frameCam);
  const hw = BOARD_W / 2 + FRAME;
  const hd = BOARD_D / 2 + FRAME;
  const pts: THREE.Vector3[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [boardTop, boardTop + PIECE_H]) pts.push(new THREE.Vector3(sx * hw, y, sz * hd));
  const el = (elevation * Math.PI) / 180;
  const dir = new THREE.Vector3(0, Math.sin(el), viewSide * Math.cos(el));
  const target = new THREE.Vector3();
  const measure = (d: number, tz: number) => {
    target.set(0, boardTop, tz);
    _frameCam.position.copy(target).addScaledVector(dir, d);
    _frameCam.lookAt(target);
    _frameCam.updateMatrixWorld();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      _v.copy(p).project(_frameCam);
      minX = Math.min(minX, _v.x);
      maxX = Math.max(maxX, _v.x);
      minY = Math.min(minY, _v.y);
      maxY = Math.max(maxY, _v.y);
    }
    return { half: Math.max((maxX - minX) / 2, (maxY - minY) / 2), minY };
  };
  let tz = 0;
  let d = 1;
  for (let it = 0; it < 6; it++) {
    // distance: bisection on the binding axis
    let lo = 0.05;
    let hi = 12;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (measure(m, tz).half > fill) lo = m;
      else hi = m;
    }
    d = hi;
    // target offset: Newton step to put the board's near edge at bottomY
    const e = 0.002;
    const a = measure(d, tz).minY;
    const slope = (measure(d, tz + e).minY - a) / e;
    if (Math.abs(slope) > 1e-6) tz = THREE.MathUtils.clamp(tz - (a - bottomY) / slope, -1.5, 1.5);
  }
  measure(d, tz);
  return { fov, elevation, position: _frameCam.position.clone(), target: target.clone(), distance: d };
}

const CameraRig: React.FC<{ viewSide: 1 | -1; boardTop: number; view: CameraView; bgScene: BackgroundScene3D; cameraElevation: number; resetSignal: number }> = ({ viewSide, boardTop, view, bgScene, cameraElevation, resetSignal }) => {
  const controls = useRef<OrbitControlsImpl>(null);
  const correctingAnchor = useRef(false);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const aspect = size.width / Math.max(1, size.height);
  const framing = useMemo(() => frameBoard(aspect, view, boardTop, viewSide, bgScene, cameraElevation), [aspect, view, boardTop, viewSide, bgScene, cameraElevation]);
  const bottomAnchorY = view === 'player' && bgScene === 'tra_da' ? -0.92 : VIEW_PRESETS[view].bottomY;
  const boardBottomCorners = useMemo(() => {
    const hw = BOARD_W / 2 + FRAME;
    const hd = BOARD_D / 2 + FRAME;
    return [-1, 1].flatMap((x) => [-1, 1].map((z) => new THREE.Vector3(x * hw, boardTop, z * hd)));
  }, [boardTop]);

  // Keep the closest physical edge of the board pinned to the bottom of the view while
  // OrbitControls changes pitch, yaw, or distance. Translate camera and target together
  // so the user's angle is preserved while the board stays anchored in frame.
  const keepBoardBottomInFrame = useCallback(() => {
    const c = controls.current;
    if (!c || correctingAnchor.current) return;
    correctingAnchor.current = true;
    try {
      const projectedBottom = () => {
        camera.updateMatrixWorld();
        let minY = Infinity;
        for (const corner of boardBottomCorners) {
          minY = Math.min(minY, corner.clone().project(camera).y);
        }
        return minY;
      };
      const currentY = projectedBottom();
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
      const epsilon = 0.001;
      camera.position.addScaledVector(up, epsilon);
      c.target.addScaledVector(up, epsilon);
      const shiftedY = projectedBottom();
      camera.position.addScaledVector(up, -epsilon);
      c.target.addScaledVector(up, -epsilon);
      camera.updateMatrixWorld();

      const slope = (shiftedY - currentY) / epsilon;
      if (Math.abs(slope) < 1e-6) return;
      const correction = THREE.MathUtils.clamp((bottomAnchorY - currentY) / slope, -0.15, 0.15);
      if (Math.abs(correction) < 1e-5) return;
      camera.position.addScaledVector(up, correction);
      c.target.addScaledVector(up, correction);
      camera.updateMatrixWorld();
      invalidate();
    } finally {
      correctingAnchor.current = false;
    }
  }, [camera, boardBottomCorners, bottomAnchorY, invalidate]);

  // Apply the framing on mount, on side/view/aspect change and when "↺ Góc nhìn" is pressed
  useEffect(() => {
    camera.fov = framing.fov;
    camera.updateProjectionMatrix();
    applyZoomFocus(camera);
    const c = controls.current;
    const damping = c?.enableDamping ?? false;
    if (c) {
      // flush any leftover drag inertia first (an undamped update applies and clears it)
      c.enableDamping = false;
      c.update();
    }
    camera.position.copy(framing.position);
    if (c) {
      c.target.copy(framing.target);
      c.update();
      c.enableDamping = damping;
    } else {
      camera.lookAt(framing.target);
    }
    invalidate();
  }, [camera, framing, resetSignal, invalidate]);

  const base = viewSide === 1 ? 0 : Math.PI;
  const polar = Math.PI / 2 - (framing.elevation * Math.PI) / 180;
  const player = view === 'player';
  return (
    <OrbitControls
      ref={controls}
      onChange={keepBoardBottomInFrame}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.5}
      zoomSpeed={0.6}
      minDistance={framing.distance * (player ? 0.8 : 0.45)}
      maxDistance={framing.distance * (player ? 1.7 : 1.5)}
      // limited look-around: lean a bit to the sides / lower the eye, never under the table
      minPolarAngle={Math.max(0.08, polar - (player ? 0.45 : 0.6))}
      maxPolarAngle={Math.min(1.38, polar + (player ? 0.5 : 0.35))}
      minAzimuthAngle={base - (player ? 0.5 : 1.1)}
      maxAzimuthAngle={base + (player ? 0.5 : 1.1)}
    />
  );
};

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const SceneContent: React.FC<Board3DSceneProps> = (props) => {
  const { board, turn, selectedPos, legalMoves, lastMove, isCheck, flipped, displayMode, theme, bgScene, isLiteMode, disabled, onSelectSquare, resetSignal, cameraView = 'player', cameraElevation } = props;
  const tableTop = VENUE_LAYOUT[bgScene]?.tableTop ?? VENUE_LAYOUT.tra_da.tableTop;
  const boardTop = tableTop + BOARD_THICKNESS;
  const viewSide: 1 | -1 = flipped ? -1 : 1;
  const [hover, setHover] = useState<Position | null>(null);

  const pieces = useMemo(() => {
    const out: { piece: Piece; x: number; y: number }[] = [];
    for (let y = 0; y < BOARD_ROWS; y++) for (let x = 0; x < BOARD_COLS; x++) {
      const p = board[y][x];
      if (p) out.push({ piece: p, x, y });
    }
    return out;
  }, [board]);

  const isLegal = (x: number, y: number) => legalMoves.some((m) => m.x === x && m.y === y);
  const kingInCheck = useMemo(() => {
    if (!isCheck) return null;
    return pieces.find((p) => p.piece.trueRole === 'king' && p.piece.color === turn) || null;
  }, [isCheck, pieces, turn]);

  const pick = (pos: Position) => {
    if (!disabled) onSelectSquare(pos);
  };

  return (
    <>
      {/* Keep the 3D view focused on the board; the photographic venue remains behind the transparent canvas. */}
      <hemisphereLight args={['#fff1dc', '#61452f', 1.25]} />
      <directionalLight position={[-2, 4, 3]} color="#ffe2bc" intensity={2.1} castShadow={!isLiteMode} />
      <BoardSlab top={tableTop} theme={theme} viewSide={viewSide} disabled={disabled} onPick={pick} onHover={setHover} />

      {pieces.map(({ piece, x, y }) => (
        <Piece3D
          key={piece.id}
          piece={piece}
          x={x}
          y={y}
          boardTop={boardTop}
          viewSide={viewSide}
          selected={!!selectedPos && selectedPos.x === x && selectedPos.y === y}
          inCheck={kingInCheck?.piece.id === piece.id}
          displayMode={displayMode}
          clickable={!disabled && (piece.color === turn || isLegal(x, y))}
          onPick={pick}
        />
      ))}

      {/* last move */}
      {lastMove && (
        <>
          <Ring x={lastMove.from.x} y={lastMove.from.y} top={boardTop} inner={S * 0.18} outer={S * 0.26} color="#f59e0b" opacity={0.55} />
          <Ring x={lastMove.to.x} y={lastMove.to.y} top={boardTop} inner={PIECE_R * 1.05} outer={PIECE_R * 1.3} color="#f59e0b" opacity={0.75} />
        </>
      )}
      {/* selected piece */}
      {selectedPos && <Ring x={selectedPos.x} y={selectedPos.y} top={boardTop} inner={PIECE_R * 1.08} outer={PIECE_R * 1.42} color="#ffd54f" />}
      {/* legal targets: dot on empty squares, red ring around capturable pieces */}
      {legalMoves.map((m) =>
        board[m.y][m.x] ? (
          <Ring key={`l${m.x}-${m.y}`} x={m.x} y={m.y} top={boardTop} inner={PIECE_R * 1.1} outer={PIECE_R * 1.45} color="#ef4444" />
        ) : (
          <React.Fragment key={`l${m.x}-${m.y}`}>
            <Ring x={m.x} y={m.y} top={boardTop} inner={S * 0.22} outer={S * 0.27} color="#14532d" opacity={0.7} />
            <Disc x={m.x} y={m.y} top={boardTop} r={S * 0.22} color={hover && hover.x === m.x && hover.y === m.y ? '#a3e635' : '#22c55e'} opacity={0.9} />
          </React.Fragment>
        )
      )}
      {/* check */}
      {kingInCheck && <Ring x={kingInCheck.x} y={kingInCheck.y} top={boardTop} inner={PIECE_R * 1.15} outer={PIECE_R * 1.7} color="#ff1a1a" pulse />}

      <CameraRig viewSide={viewSide} boardTop={boardTop} view={cameraView} bgScene={bgScene} cameraElevation={cameraElevation} resetSignal={resetSignal} />
    </>
  );
};

export default function Board3DScene(props: Board3DSceneProps) {
  const lite = props.isLiteMode;
  return (
    <Canvas
      frameloop="demand"
      shadows={!lite}
      // frameloop="demand" only redraws on change, so a sharper DPR / MSAA is affordable even in lite mode
      dpr={lite ? [1, 1.5] : [1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      camera={{ fov: 46, near: 0.02, far: 80, position: [0, 1.2, 0.45] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}

