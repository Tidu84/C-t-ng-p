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
import { BackgroundScene3D, BoardTheme, CannonBlastEffectData, LabelDisplayMode, Move, Piece, PlayerColor, Position, RiverTextMode } from '../../types';
import { BOARD_COLS, BOARD_ROWS } from '../../utils/chessRules';
import { getBoardTexture, getPieceBackTexture, getPieceFaceTexture, getPieceShadowTexture } from './textures';
import { VENUE_LAYOUT, Venue3D } from './venues3d';
import { ACTIVE_PERSPECTIVE_KEY, CUSTOM_POSE_KEY, SavedCameraPose } from './CameraPerspectiveMenu';
import { sound } from '../../utils/audio';

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
  riverMode?: RiverTextMode;
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
  cannonBlast?: CannonBlastEffectData | null;
  onCannonBlastComplete?: () => void;
  /** Signal to save current camera pose. Increments when user clicks 'Lưu góc'. */
  savePoseSignal?: number;
  /** Signal to restore custom camera pose. Increments when user clicks 'Góc tôi'. */
  customPoseSignal?: number;
  /** Callback invoked when a pose has been successfully saved. */
  onPoseSaved?: (pose: SavedCameraPose) => void;
  /** Callback invoked when the user adjusts the camera with OrbitControls. */
  onCameraInteracted?: () => void;
}

const S = 0.05; // intersection spacing (m)
const BOARD_W = 9 * S;
const BOARD_D = 10 * S;
const BOARD_THICKNESS = 0.03;
const FRAME = 0.025;
const PIECE_R = 0.0215;
const PIECE_H = 0.012;
/** Pointer travel (px) above which a press is treated as a camera drag, not a click. */
const DRAG_PX = 6;

const toWorld = (x: number, y: number) => ({ X: (x - 4) * S, Z: (y - 4.5) * S });

// ---------------------------------------------------------------------------
// Board slab
// ---------------------------------------------------------------------------

const BoardSlab: React.FC<{
  top: number;
  theme: BoardTheme;
  riverMode?: RiverTextMode;
  viewSide: 1 | -1;
  disabled: boolean;
  onPick: (pos: Position) => void;
  onHover: (pos: Position | null) => void;
  bgScene?: BackgroundScene3D;
}> = ({ top, theme, riverMode = 'blank', viewSide, disabled, onPick, onHover, bgScene }) => {
  const isCathedral = bgScene === 'cathedral';
  const riverText = useMemo(() => {
    switch (riverMode) {
      case 'blank':
        return 'Đánh cờ chớ có đánh nhau';
      case 'proverb':
        return 'Lạc nước hai Xe đành bỏ phí • Gặp thời một Tốt cũng thành công';
      case 'plain':
      default:
        return '';
    }
  }, [riverMode]);

  const tex = useMemo(() => getBoardTexture(theme, riverText, isCathedral), [theme, riverText, isCathedral]);

  // Fast Plane Raycasting (< 0.001ms directly into board plane)
  const pick = (e: ThreeEvent<MouseEvent | PointerEvent>): Position | null => {
    const p = e.point;
    const x = Math.round(p.x / S + 4);
    const y = Math.round(p.z / S + 4.5);
    if (x < 0 || x >= BOARD_COLS || y < 0 || y >= BOARD_ROWS) return null;
    const w = toWorld(x, y);
    if (Math.hypot(p.x - w.X, p.z - w.Z) > S * 0.58) return null;
    return { x, y };
  };

  return (
    <group position={[0, top, 0]}>
      {/* frame: Viền vàng kim quý tộc (Thánh Địa) hoặc gỗ tự nhiên */}
      <mesh position={[0, BOARD_THICKNESS / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BOARD_W + FRAME * 2, BOARD_THICKNESS, BOARD_D + FRAME * 2]} />
        {isCathedral ? (
          <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.85} />
        ) : (
          <meshStandardMaterial color="#42220f" roughness={0.5} />
        )}
      </mesh>
      {/* playing surface (texture) – handles all plane raycasting for the entire board (<0.001ms) */}
      <mesh
        position={[0, BOARD_THICKNESS + 0.0006, 0]}
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
        <meshStandardMaterial map={tex} roughness={isCathedral ? 0.35 : 0.62} metalness={isCathedral ? 0.22 : 0} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Pieces (Tái sử dụng hình học: cả 32 quân dùng chung LatheGeometry tinh xảo trong RAM)
// ---------------------------------------------------------------------------

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
const capGeometry = new THREE.CircleGeometry(PIECE_R * 0.94, 48);

// Full-coverage Nắp Úp Cờ Tướng: Inverted lathe cup trùm kín toàn bộ quân cờ xuống sát mặt bàn
const lidGeometry = new THREE.LatheGeometry(
  [
    new THREE.Vector2(0, -PIECE_H / 2),
    new THREE.Vector2(PIECE_R * 1.06, -PIECE_H / 2),
    new THREE.Vector2(PIECE_R * 1.06, PIECE_H * 0.22),
    new THREE.Vector2(PIECE_R * 1.04, PIECE_H * 0.38),
    new THREE.Vector2(PIECE_R * 0.95, PIECE_H / 2 + 0.0012),
    new THREE.Vector2(PIECE_R * 0.85, PIECE_H / 2 + 0.0018),
    new THREE.Vector2(0, PIECE_H / 2 + 0.0018),
  ],
  48,
);
const lidFaceGeometry = new THREE.CircleGeometry(PIECE_R * 0.85, 48);

const Piece3D: React.FC<{
  piece: Piece;
  x: number;
  y: number;
  boardTop: number;
  viewSide: 1 | -1;
  selected: boolean;
  inCheck: boolean;
  displayMode: LabelDisplayMode;
  hovered?: boolean;
  isCapturing?: boolean;
  isCathedral?: boolean;
}> = ({ piece, x, y, boardTop, viewSide, selected, inCheck, displayMode, hovered = false, isCapturing = false, isCathedral = false }) => {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const shadowTex = useMemo(() => getPieceShadowTexture(), []);
  const initialCovered = useRef(piece.isCovered);
  const lid = useRef<THREE.Group>(null);
  const lidProgress = useRef(0);
  const lidEjecting = useRef(false);
  const flipProgress = useRef(piece.isCovered ? 0 : 1);
  const flipping = useRef(false);
  const wasCovered = useRef(piece.isCovered);
  const invalidate = useThree((s) => s.invalidate);
  const [showLid, setShowLid] = useState(piece.isCovered);

  const { X, Z } = toWorld(x, y);
  const baseY = boardTop + PIECE_H / 2 + 0.0008;
  const lift = selected ? 0.038 : hovered ? 0.018 : 0;
  const face = getPieceFaceTexture(piece.color, piece.trueRole, displayMode);
  const back = getPieceBackTexture(piece.color, isCathedral);
  const rimColor = isCathedral
    ? (piece.color === 'red' ? '#c2410c' : '#334155')
    : (piece.color === 'red' ? '#b87332' : '#76502d');
  const lidColor = isCathedral ? '#e5a93c' : (piece.color === 'red' ? '#8a3318' : '#281f18');

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
      if (body.current) {
        body.current.rotation.x = 0;
        body.current.position.y = 0;
      }
    } else if (wasCovered.current) {
      lidProgress.current = 0;
      lidEjecting.current = true;
      flipProgress.current = 0;
      flipping.current = true;
      sound.playMysteryRevealChime();
    }
    wasCovered.current = piece.isCovered;
    invalidate();
  }, [piece.isCovered, invalidate]);

  useEffect(() => invalidate(), [X, Z, lift, displayMode, invalidate]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.exp(-dt * 11);

    // 3D Flip Animation: Parabolic Arc y += 0.35m + 180° flip around X axis with smooth easing
    if (flipping.current && body.current) {
      flipProgress.current = Math.min(1, flipProgress.current + dt / 0.65);
      const t = flipProgress.current;
      const eased = t * t * (3 - 2 * t);
      body.current.rotation.x = Math.PI * eased;
      const arcY = 0.35 * Math.sin(t * Math.PI);
      body.current.position.y = arcY;
      if (t >= 1) {
        flipping.current = false;
        body.current.position.y = 0;
      }
      invalidate();
    }

    const dx = X - g.position.x;
    const dz = Z - g.position.z;
    const dist = Math.hypot(dx, dz);
    g.position.x += dx * k;
    g.position.z += dz * k;

    // A covered piece is completely enclosed within an authentic full-coverage wooden lid.
    // When revealed, lift the lid high into the air and tumble it away to reveal the piece beneath.
    if (lidEjecting.current && lid.current) {
      lidProgress.current = Math.min(1, lidProgress.current + dt / 0.62);
      const t = lidProgress.current;
      const eased = t * t * (3 - 2 * t);
      const liftY = 0.36 * Math.sin(eased * Math.PI) + 0.06 * eased;
      const throwX = PIECE_R * 2.2 * eased;
      const throwZ = -PIECE_R * 1.1 * eased;
      lid.current.position.set(throwX, liftY, throwZ);
      lid.current.rotation.set(-0.35 * eased, 0.4 * eased, Math.PI * 2 * eased);
      lid.current.scale.setScalar(Math.max(0.01, 1 - eased * 0.85));
      if (t >= 1) {
        lidEjecting.current = false;
        setShowLid(false);
      }
      invalidate();
    }

    // Dynamic travel trajectory: aggressive high strike leap & slam-down when capturing an opponent piece
    const travelHop = isCapturing && dist > 0.002
      ? Math.sin(Math.min(1, dist / (S * 1.6)) * Math.PI) * 0.075
      : Math.min(dist * 0.55, 0.05);

    const targetY = baseY + lift + travelHop;
    g.position.y += (targetY - g.position.y) * Math.min(1, k * (isCapturing && dist < 0.008 ? 2.5 : 1.6));

    // Đồng bộ bóng đổ trực tiếp theo độ nâng thực tế của quân cờ (Zero latency, zero giật)
    if (shadowRef.current) {
      const currentLift = Math.max(0, g.position.y - baseY);
      const isElevated = currentLift > 0.0006 || hovered || selected;
      shadowRef.current.visible = isElevated;

      if (isElevated) {
        // Giữ bóng đổ luôn ghim phẳng trên mặt bàn cờ (bỏ qua độ nhấc lên cao của quân)
        shadowRef.current.position.y = -(g.position.y - boardTop) + 0.0015;

        // Tỉ lệ nâng (0 -> 1)
        const liftRatio = Math.min(1, currentLift / 0.038);
        // Thu gọn 10% tiếp theo yêu cầu: scale từ 1.0 (nhấc nhẹ) đến tối đa 1.25 (nhấc cao)
        const scale = 1.0 + liftRatio * 0.25;
        shadowRef.current.scale.set(scale, scale, 1);

        // Trượt nhẹ theo hướng nguồn sáng mặt trời
        shadowRef.current.position.x = (0.0005 + liftRatio * 0.0022) * viewSide;
        shadowRef.current.position.z = (0.0010 + liftRatio * 0.0042) * viewSide;

        const mat = shadowRef.current.material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity = 0.32 + liftRatio * 0.28;
        }
      }
    }

    if (dist > 0.0004 || Math.abs(targetY - g.position.y) > 0.0004) invalidate();
  });

  return (
    <group ref={group} rotation={[0, viewSide === 1 ? 0 : Math.PI, 0]}>
      {/* Dynamic contact & lift shadow: ghim trên mặt bàn cờ, đồng bộ tức thì theo độ nâng */}
      <mesh
        ref={shadowRef}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
        visible={false}
      >
        <planeGeometry args={[PIECE_R * 1.70, PIECE_R * 1.70]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Revealed piece body: only visible when revealed or during reveal flip animation */}
      <group ref={body} visible={!showLid || lidEjecting.current}>
        {/* Reusable shared LatheGeometry for all 32 pieces in RAM */}
        <mesh
          geometry={sideGeometry}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color={rimColor}
            roughness={isCathedral ? 0.25 : 0.32}
            metalness={isCathedral ? 0.82 : 0.025}
            clearcoat={0.24}
            clearcoatRoughness={0.3}
            emissive={selected ? '#ffb300' : inCheck ? '#ff1a1a' : '#000000'}
            emissiveIntensity={selected ? 0.3 : inCheck ? 0.42 : 0}
          />
        </mesh>

        {/* Back face cap */}
        <mesh
          geometry={capGeometry}
          position={[0, PIECE_H / 2 + 0.0002, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial
            map={back}
            roughness={0.42}
            emissive={selected ? '#ffb300' : '#000000'}
            emissiveIntensity={selected ? 0.16 : 0}
          />
        </mesh>

        {/* Revealed front face cap */}
        <mesh geometry={capGeometry} position={[0, -PIECE_H / 2 - 0.0002, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial map={face} toneMapped={false} />
        </mesh>
      </group>

      {/* Full-coverage Nắp Úp: trùm toàn bộ quân cờ xuống sát mặt bàn khi quân còn úp */}
      {showLid && (
        <group ref={lid} position={[0, 0, 0]}>
          <mesh
            geometry={lidGeometry}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color={lidColor}
              roughness={isCathedral ? 0.26 : 0.3}
              metalness={isCathedral ? 0.76 : 0.025}
              clearcoat={0.3}
              clearcoatRoughness={0.24}
              emissive={selected ? '#ffb300' : '#000000'}
              emissiveIntensity={selected ? 0.35 : 0}
            />
          </mesh>
          <mesh
            geometry={lidFaceGeometry}
            position={[0, PIECE_H / 2 + 0.0020, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <meshStandardMaterial
              map={back}
              roughness={0.3}
              emissive={selected ? '#ffb300' : '#000000'}
              emissiveIntensity={selected ? 0.2 : 0}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Object Pool cho điểm sáng gợi ý (Zero GC: 36 mesh pre-allocated, chỉ cập nhật vị trí & visible)
// ---------------------------------------------------------------------------

const HINT_POOL_SIZE = 36;
const hintRingGeo = new THREE.RingGeometry(PIECE_R * 1.08, PIECE_R * 1.38, 28);
const hintDotGeo = new THREE.CircleGeometry(S * 0.22, 24);

const MoveHintsPool: React.FC<{
  legalMoves: Position[];
  board: (Piece | null)[][];
  boardTop: number;
  hover: Position | null;
}> = ({ legalMoves, board, boardTop, hover }) => {
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const dotRefs = useRef<(THREE.Mesh | null)[]>([]);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    for (let i = 0; i < HINT_POOL_SIZE; i++) {
      const ringMesh = ringRefs.current[i];
      const dotMesh = dotRefs.current[i];
      if (!ringMesh || !dotMesh) continue;

      if (i < legalMoves.length) {
        const move = legalMoves[i];
        const { X, Z } = toWorld(move.x, move.y);
        const isCapture = Boolean(board[move.y]?.[move.x]);
        const isHovered = hover && hover.x === move.x && hover.y === move.y;

        if (isCapture) {
          ringMesh.position.set(X, boardTop + 0.0016, Z);
          const mat = ringMesh.material as THREE.MeshBasicMaterial;
          mat.color.set('#ef4444');
          mat.opacity = isHovered ? 1.0 : 0.88;
          ringMesh.visible = true;
          dotMesh.visible = false;
        } else {
          dotMesh.position.set(X, boardTop + 0.0014, Z);
          const mat = dotMesh.material as THREE.MeshBasicMaterial;
          mat.color.set(isHovered ? '#a3e635' : '#22c55e');
          dotMesh.visible = true;
          ringMesh.visible = false;
        }
      } else {
        ringMesh.visible = false;
        dotMesh.visible = false;
      }
    }
    invalidate();
  }, [legalMoves, board, boardTop, hover, invalidate]);

  return (
    <group>
      {Array.from({ length: HINT_POOL_SIZE }).map((_, i) => (
        <React.Fragment key={i}>
          <mesh
            ref={(el) => {
              ringRefs.current[i] = el;
            }}
            geometry={hintRingGeo}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={3}
            visible={false}
          >
            <meshBasicMaterial color="#ef4444" transparent opacity={0.88} depthWrite={false} />
          </mesh>
          <mesh
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            geometry={hintDotGeo}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={2}
            visible={false}
          >
            <meshBasicMaterial color="#22c55e" transparent opacity={0.88} depthWrite={false} />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Hiệu ứng Ăn quân Tinh tế & Ngoạn mục (Cinematic Capture Impact & Knockout Physics)
// - Đập quân ăn xuống: quân ăn lao tới với quỹ đạo vòng cung cao rồi dộng mạnh xuống mặt bàn
// - Quân bị ăn bị đánh văng ra ngoài bàn cờ: văng lên không trung, xoay tròn theo 3 trục, nảy trên mặt bàn/sàn
// - Vỡ vụn đá cẩm thạch (Stone Shatter) + Vòng sóng xung kích (Shockwave Ring) lan tỏa trên mặt bàn
// ---------------------------------------------------------------------------

const SHARD_COUNT = 24;
const shardGeometry = new THREE.DodecahedronGeometry(0.0042, 0);
const shockwaveGeometry = new THREE.RingGeometry(0.012, 0.022, 32);

interface CaptureKineticInstance {
  id: number;
  origin: THREE.Vector3;
  strikeDir: THREE.Vector3;
  captured: Piece;
  displayMode: LabelDisplayMode;
  startTime: number;
}

const CaptureBurst: React.FC<{
  inst: CaptureKineticInstance;
  boardTop: number;
  tableTop: number;
  onDone: () => void;
}> = ({ inst, boardTop, tableTop, onDone }) => {
  const knockoutRef = useRef<THREE.Group>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const shardRefs = useRef<(THREE.Mesh | null)[]>([]);
  const invalidate = useThree((s) => s.invalidate);

  const faceTex = useMemo(
    () => getPieceFaceTexture(inst.captured.color, inst.captured.trueRole, inst.displayMode),
    [inst.captured.color, inst.captured.trueRole, inst.displayMode],
  );
  const backTex = useMemo(() => getPieceBackTexture(inst.captured.color), [inst.captured.color]);
  const rimColor = inst.captured.color === 'red' ? '#b87332' : '#76502d';
  const lidColor = inst.captured.color === 'red' ? '#8a3318' : '#281f18';
  const shardColor = inst.captured.color === 'red' ? '#b91c1c' : '#292524';

  // Knockout physics state: launched violently by strike impulse
  const knockoutPhysics = useMemo(() => {
    const lateralSpeed = 1.9 + Math.random() * 0.7;
    const spreadAngle = (Math.random() - 0.5) * 0.5;
    const cosA = Math.cos(spreadAngle);
    const sinA = Math.sin(spreadAngle);
    const dirX = inst.strikeDir.x * cosA - inst.strikeDir.z * sinA;
    const dirZ = inst.strikeDir.x * sinA + inst.strikeDir.z * cosA;

    return {
      pos: inst.origin.clone(),
      vel: new THREE.Vector3(
        dirX * lateralSpeed,
        2.5 + Math.random() * 0.8, // high flying trajectory
        dirZ * lateralSpeed,
      ),
      rot: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, 0),
      rotVel: new THREE.Vector3(
        14 + Math.random() * 8,
        9 + Math.random() * 7,
        15 + Math.random() * 8,
      ),
      bounces: 0,
    };
  }, [inst.origin, inst.strikeDir]);

  // Shards physics state: radial explosion with bias in strike direction
  const shardsPhysics = useMemo(() => {
    return Array.from({ length: SHARD_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.55 + Math.random() * 1.3;
      return {
        pos: inst.origin.clone(),
        vel: new THREE.Vector3(
          Math.cos(angle) * speed + inst.strikeDir.x * 0.45,
          1.4 + Math.random() * 1.8,
          Math.sin(angle) * speed + inst.strikeDir.z * 0.45,
        ),
        rot: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 25,
          (Math.random() - 0.5) * 25,
          (Math.random() - 0.5) * 25,
        ),
      };
    });
  }, [inst.origin, inst.strikeDir]);

  useFrame((_, dt) => {
    const elapsed = (performance.now() - inst.startTime) / 1000;
    if (elapsed > 1.8) {
      onDone();
      return;
    }

    // 1. Expanding Shockwave Ring on the board
    if (shockwaveRef.current) {
      const swT = Math.min(1, elapsed / 0.36);
      const scale = 1 + swT * 4.2;
      shockwaveRef.current.scale.set(scale, scale, 1);
      const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = Math.max(0, (1 - swT) * 0.85);
    }

    // 2. Flying Knockout Piece (Quân bị ăn bị đập văng ra ngoài bàn cờ)
    const kp = knockoutPhysics;
    if (knockoutRef.current) {
      kp.vel.y -= 11.5 * dt;
      kp.pos.addScaledVector(kp.vel, dt);
      kp.rot.addScaledVector(kp.rotVel, dt);

      // Floor height: check if still over the elevated board or flying over the table surrounding it
      const onBoard =
        Math.abs(kp.pos.x) <= BOARD_W / 2 + 0.015 &&
        Math.abs(kp.pos.z) <= BOARD_D / 2 + 0.015;
      const surfaceY = (onBoard ? boardTop : tableTop) + PIECE_H / 2 + 0.0005;

      if (kp.pos.y <= surfaceY) {
        kp.pos.y = surfaceY;
        if (Math.abs(kp.vel.y) > 0.3) {
          kp.vel.y = -kp.vel.y * 0.44;
          kp.vel.x *= 0.65;
          kp.vel.z *= 0.65;
          kp.rotVel.multiplyScalar(0.7);
          kp.bounces++;
        } else {
          kp.vel.set(0, 0, 0);
          kp.rotVel.set(0, 0, 0);
        }
      }

      knockoutRef.current.position.copy(kp.pos);
      knockoutRef.current.rotation.set(kp.rot.x, kp.rot.y, kp.rot.z);

      // Fade out and scale down after 1.1s
      if (elapsed > 1.1) {
        const fade = Math.max(0, 1 - (elapsed - 1.1) / 0.7);
        knockoutRef.current.scale.setScalar(Math.max(0.01, fade));
      }
    }

    // 3. Shards explosion & table bounce
    for (let i = 0; i < shardsPhysics.length; i++) {
      const p = shardsPhysics[i];
      const mesh = shardRefs.current[i];
      if (!mesh) continue;

      p.vel.y -= 10.5 * dt;
      p.pos.addScaledVector(p.vel, dt);

      const surfaceY = boardTop + 0.002;
      if (p.pos.y <= surfaceY) {
        p.pos.y = surfaceY;
        p.vel.y = -p.vel.y * 0.42;
        p.vel.x *= 0.68;
        p.vel.z *= 0.68;
      }

      p.rot.addScaledVector(p.rotVel, dt);
      mesh.position.copy(p.pos);
      mesh.rotation.set(p.rot.x, p.rot.y, p.rot.z);

      const shardFade = Math.max(0, 1 - elapsed / 1.2);
      mesh.scale.setScalar(shardFade);
      if (mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).opacity = shardFade;
      }
    }

    invalidate();
  });

  return (
    <group>
      {/* Expanding ground shockwave ring */}
      <mesh
        ref={shockwaveRef}
        position={[inst.origin.x, boardTop + 0.0016, inst.origin.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <primitive object={shockwaveGeometry} attach="geometry" />
        <meshBasicMaterial
          color={inst.captured.color === 'red' ? '#ef4444' : '#f59e0b'}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>

      {/* 24 stone shatter shards */}
      {shardsPhysics.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            shardRefs.current[idx] = el;
          }}
          geometry={shardGeometry}
          castShadow
        >
          <meshStandardMaterial
            color={shardColor}
            roughness={0.38}
            metalness={0.06}
            transparent
            opacity={1}
          />
        </mesh>
      ))}

      {/* Flying Knockout Piece Model (Quân bị ăn bị văng ra khỏi bàn cờ) */}
      <group ref={knockoutRef}>
        {inst.captured.isCovered ? (
          // Full-coverage Nắp Úp cup if captured while still covered
          <>
            <mesh geometry={lidGeometry} castShadow>
              <meshPhysicalMaterial
                color={lidColor}
                roughness={0.3}
                metalness={0.025}
                clearcoat={0.3}
                clearcoatRoughness={0.24}
                transparent
              />
            </mesh>
            <mesh
              geometry={lidFaceGeometry}
              position={[0, PIECE_H / 2 + 0.0020, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <meshStandardMaterial map={backTex} roughness={0.3} transparent />
            </mesh>
          </>
        ) : (
          // Authentic turned Lathe chess piece with calligraphy face
          <>
            <mesh geometry={sideGeometry} castShadow>
              <meshPhysicalMaterial
                color={rimColor}
                roughness={0.32}
                metalness={0.025}
                clearcoat={0.24}
                clearcoatRoughness={0.3}
                transparent
              />
            </mesh>
            <mesh
              geometry={capGeometry}
              position={[0, PIECE_H / 2 + 0.0002, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <meshStandardMaterial map={backTex} roughness={0.42} transparent />
            </mesh>
            <mesh
              geometry={capGeometry}
              position={[0, -PIECE_H / 2 - 0.0002, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <meshBasicMaterial map={faceTex} toneMapped={false} transparent />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
};

const CaptureImpactKineticSystem: React.FC<{
  lastMove: Move | null;
  boardTop: number;
  tableTop: number;
  displayMode: LabelDisplayMode;
}> = ({ lastMove, boardTop, tableTop, displayMode }) => {
  const [instances, setInstances] = useState<CaptureKineticInstance[]>([]);
  const lastMoveCapturedId = useRef<string | null>(null);

  useEffect(() => {
    if (lastMove && lastMove.captured) {
      const moveId = `${lastMove.from.x},${lastMove.from.y}->${lastMove.to.x},${lastMove.to.y}:${lastMove.captured.id}`;
      if (lastMoveCapturedId.current !== moveId) {
        lastMoveCapturedId.current = moveId;
        const fromWorld = toWorld(lastMove.from.x, lastMove.from.y);
        const toWorldPos = toWorld(lastMove.to.x, lastMove.to.y);
        const dirX = toWorldPos.X - fromWorld.X;
        const dirZ = toWorldPos.Z - fromWorld.Z;
        const len = Math.hypot(dirX, dirZ) || 1;
        const strikeDir = new THREE.Vector3(dirX / len, 0, dirZ / len);
        const origin = new THREE.Vector3(toWorldPos.X, boardTop + PIECE_H / 2, toWorldPos.Z);

        const newInst: CaptureKineticInstance = {
          id: Date.now(),
          origin,
          strikeDir,
          captured: lastMove.captured,
          displayMode,
          startTime: performance.now(),
        };
        setInstances((prev) => [...prev.slice(-2), newInst]);
        sound.playCapture(true);
        sound.playStoneShatter();
      }
    }
  }, [lastMove, boardTop, displayMode]);

  return (
    <>
      {instances.map((inst) => (
        <CaptureBurst
          key={inst.id}
          inst={inst}
          boardTop={boardTop}
          tableTop={tableTop}
          onDone={() => setInstances((prev) => prev.filter((i) => i.id !== inst.id))}
        />
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------
// Markers (last move, check, selection)
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


const CannonBlast3D: React.FC<{
  x: number;
  y: number;
  top: number;
  onComplete?: () => void;
}> = ({ x, y, top, onComplete }) => {
  const { X, Z } = toWorld(x, y);
  const ringRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const startTime = useRef<number | null>(null);
  const invalidate = useThree((s) => s.invalidate);

  useFrame(({ clock }) => {
    if (startTime.current === null) startTime.current = clock.elapsedTime;
    const elapsed = clock.elapsedTime - startTime.current;
    const duration = 0.85;
    if (elapsed > duration) {
      onComplete?.();
      return;
    }
    const t = elapsed / duration;
    if (ringRef.current) {
      const s = 1 + t * 4.2;
      ringRef.current.scale.set(s, s, 1);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - t) * 0.95);
    }
    if (lightRef.current) {
      lightRef.current.intensity = Math.max(0, (1 - t) * 7.5);
    }
    invalidate();
  });

  return (
    <group position={[X, top, Z]}>
      {/* Explosive flash light */}
      <pointLight ref={lightRef} position={[0, 0.04, 0]} color="#ffaa00" intensity={7.5} distance={1.2} />
      {/* Shockwave expanding ring */}
      <mesh ref={ringRef} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
        <ringGeometry args={[0.015, 0.03, 36]} />
        <meshBasicMaterial color="#ff5500" transparent opacity={0.95} depthWrite={false} />
      </mesh>
    </group>
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
  player: { fov: 46, elevation: 52, fill: 1.15, bottomY: -0.88 },
  // Spectator: step back and lower the eye so the venue is visible
  spectator: { fov: 55, elevation: 28, fill: 0.65, bottomY: -0.75 },
};

const _frameCam = new THREE.PerspectiveCamera();
const _v = new THREE.Vector3();

/**
 * Solve camera distance + target offset so the whole board (frame and piece tops) fills `fill` of the
 * viewport for the given aspect/FOV/elevation. Works for any aspect ratio (desktop, portrait phones).
 */
export function frameBoard(aspect: number, view: CameraView, boardTop: number, viewSide: 1 | -1, bgScene?: BackgroundScene3D, cameraElevation?: number) {
  // The tea-stall photo shows its tabletop in the lower half of the frame.
  // For Cathedral, match Covua's breathtaking view across the sacred altar table into the soaring Gothic cathedral nave
  const preset = view === 'player' && bgScene === 'cathedral'
    ? { fov: 40, elevation: 31, fill: 0.76, bottomY: -0.74 }
    : view === 'player' && bgScene === 'tra_da'
    ? { ...VIEW_PRESETS.player, elevation: 32, fill: 1.15, bottomY: -0.88 }
    : VIEW_PRESETS[view];
  const { fov, fill, bottomY } = preset;
  const elevation = THREE.MathUtils.clamp(cameraElevation ?? preset.elevation, 18, 78);
  _frameCam.fov = fov;
  _frameCam.aspect = aspect;
  _frameCam.near = 0.01;
  _frameCam.far = 50;
  _frameCam.updateProjectionMatrix();

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

const CameraRig: React.FC<{
  viewSide: 1 | -1;
  boardTop: number;
  view: CameraView;
  bgScene: BackgroundScene3D;
  cameraElevation: number;
  resetSignal: number;
  savePoseSignal?: number;
  customPoseSignal?: number;
  onPoseSaved?: (pose: SavedCameraPose) => void;
  onCameraInteracted?: () => void;
}> = ({
  viewSide,
  boardTop,
  view,
  bgScene,
  cameraElevation,
  resetSignal,
  savePoseSignal = 0,
  customPoseSignal = 0,
  onPoseSaved,
  onCameraInteracted,
}) => {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const aspect = size.width / Math.max(1, size.height);
  const framing = useMemo(
    () => frameBoard(aspect, view, boardTop, viewSide, bgScene, cameraElevation),
    [aspect, view, boardTop, viewSide, bgScene, cameraElevation]
  );

  // Track user manual camera adjustment state so in-game moves do not overwrite user angles
  const isUserAdjusted = useRef(false);
  const prevResetSignal = useRef(resetSignal);
  const prevViewSide = useRef(viewSide);
  const prevBgScene = useRef(bgScene);
  const prevView = useRef(view);
  const prevElevation = useRef(cameraElevation);
  const hasLoadedInitial = useRef(false);

  // Helper to apply preset framing safely
  const applyFraming = useCallback((f: typeof framing) => {
    camera.fov = f.fov;
    camera.updateProjectionMatrix();
    const c = controls.current;
    const damping = c?.enableDamping ?? false;
    if (c) {
      c.enableDamping = false;
      c.update();
    }
    camera.position.copy(f.position);
    if (c) {
      c.target.copy(f.target);
      c.update();
      c.enableDamping = damping;
    } else {
      camera.lookAt(f.target);
    }
    invalidate();
  }, [camera, invalidate]);

  // Initial load on mount
  useEffect(() => {
    if (!hasLoadedInitial.current) {
      hasLoadedInitial.current = true;
      try {
        const active = localStorage.getItem(ACTIVE_PERSPECTIVE_KEY);
        if (active === 'custom') {
          const raw = localStorage.getItem(CUSTOM_POSE_KEY);
          if (raw) {
            const pose: SavedCameraPose = JSON.parse(raw);
            if (pose && Array.isArray(pose.position) && Array.isArray(pose.target)) {
              camera.fov = pose.fov || 46;
              camera.zoom = pose.zoom || 1;
              camera.updateProjectionMatrix();
              camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
              const c = controls.current;
              if (c) {
                c.target.set(pose.target[0], pose.target[1], pose.target[2]);
                c.update();
              } else {
                camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
              }
              isUserAdjusted.current = true;
              invalidate();
              return;
            }
          }
        }
      } catch {}
      applyFraming(framing);
    }
  }, [camera, framing, applyFraming, invalidate]);

  // Handle explicit preset selections or environment flips
  useEffect(() => {
    if (!hasLoadedInitial.current) return;

    const resetTriggered = resetSignal !== prevResetSignal.current;
    const sideChanged = viewSide !== prevViewSide.current;
    const bgChanged = bgScene !== prevBgScene.current;
    const viewChanged = view !== prevView.current;
    const elevationChanged = cameraElevation !== prevElevation.current;

    prevResetSignal.current = resetSignal;
    prevViewSide.current = viewSide;
    prevBgScene.current = bgScene;
    prevView.current = view;
    prevElevation.current = cameraElevation;

    // Only re-frame if an explicit camera change action occurred
    if (resetTriggered || sideChanged || bgChanged || viewChanged || elevationChanged) {
      isUserAdjusted.current = false;
      applyFraming(framing);
    }
  }, [resetSignal, viewSide, bgScene, view, cameraElevation, framing, applyFraming]);

  // Handle saving current pose to localStorage
  const lastSaveSignal = useRef(0);
  useEffect(() => {
    if (savePoseSignal > 0 && savePoseSignal !== lastSaveSignal.current) {
      lastSaveSignal.current = savePoseSignal;
      const c = controls.current;
      const targetPos: [number, number, number] = c
        ? [c.target.x, c.target.y, c.target.z]
        : [0, boardTop, 0];
      const cameraPos: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ];
      const pose: SavedCameraPose = {
        position: cameraPos,
        target: targetPos,
        fov: camera.fov,
        zoom: camera.zoom || 1,
        cameraElevation,
        cameraView: view,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(CUSTOM_POSE_KEY, JSON.stringify(pose));
        localStorage.setItem(ACTIVE_PERSPECTIVE_KEY, 'custom');
      } catch (err) {
        console.error('Failed to save camera pose:', err);
      }
      isUserAdjusted.current = true;
      onPoseSaved?.(pose);
    }
  }, [savePoseSignal, camera, boardTop, cameraElevation, view, onPoseSaved]);

  // Handle loading/restoring custom pose
  const lastCustomSignal = useRef(0);
  useEffect(() => {
    if (customPoseSignal > 0 && customPoseSignal !== lastCustomSignal.current) {
      lastCustomSignal.current = customPoseSignal;
      try {
        const raw = localStorage.getItem(CUSTOM_POSE_KEY);
        if (!raw) return;
        const pose: SavedCameraPose = JSON.parse(raw);
        if (pose && Array.isArray(pose.position) && Array.isArray(pose.target)) {
          camera.fov = pose.fov || 46;
          camera.zoom = pose.zoom || 1;
          camera.updateProjectionMatrix();

          const c = controls.current;
          const damping = c?.enableDamping ?? false;
          if (c) {
            c.enableDamping = false;
            c.update();
          }
          camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
          if (c) {
            c.target.set(pose.target[0], pose.target[1], pose.target[2]);
            c.update();
            c.enableDamping = damping;
          } else {
            camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
          }
          isUserAdjusted.current = true;
          invalidate();
        }
      } catch (err) {
        console.error('Failed to restore custom camera pose:', err);
      }
    }
  }, [customPoseSignal, camera, invalidate]);

  const base = viewSide === 1 ? 0 : Math.PI;
  const polar = Math.PI / 2 - (framing.elevation * Math.PI) / 180;
  const player = view === 'player';

  return (
    <OrbitControls
      ref={controls}
      onStart={() => {
        isUserAdjusted.current = true;
      }}
      onEnd={() => {
        isUserAdjusted.current = true;
        onCameraInteracted?.();
      }}
      makeDefault
      enablePan={true}
      screenSpacePanning={true}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.65}
      zoomSpeed={0.7}
      minDistance={framing.distance * (player ? 0.35 : 0.25)}
      maxDistance={framing.distance * (player ? 2.5 : 2.0)}
      minPolarAngle={bgScene === 'cathedral' ? 0.05 : Math.max(0.05, polar - (player ? 0.65 : 0.85))}
      maxPolarAngle={bgScene === 'cathedral' ? Math.PI * 0.94 : Math.min(1.50, polar + (player ? 0.70 : 0.55))}
      minAzimuthAngle={bgScene === 'cathedral' ? undefined : base - (player ? 1.15 : 1.55)}
      maxAzimuthAngle={bgScene === 'cathedral' ? undefined : base + (player ? 1.15 : 1.55)}
    />
  );
};


// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const SceneContent: React.FC<Board3DSceneProps> = (props) => {
  const {
    board,
    turn,
    selectedPos,
    legalMoves,
    lastMove,
    isCheck,
    flipped,
    displayMode,
    theme,
    riverMode = 'blank',
    bgScene,
    isLiteMode,
    disabled,
    onSelectSquare,
    resetSignal,
    cameraView = 'player',
    cameraElevation,
    cannonBlast,
    onCannonBlastComplete,
    savePoseSignal,
    customPoseSignal,
    onPoseSaved,
    onCameraInteracted,
  } = props;
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
      {/* Render 3D Cathedral scene when cathedral is selected, else standard board lighting */}
      {bgScene === 'cathedral' ? (
        <Venue3D scene="cathedral" lite={isLiteMode} />
      ) : (
        <>
          <hemisphereLight args={['#fff1dc', '#61452f', 1.15]} />
          <directionalLight
            position={[-1.2, 3.2, 2.2]}
            color="#ffe2bc"
            intensity={2.3}
            castShadow={!isLiteMode}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={0.1}
            shadow-camera-far={8}
            shadow-camera-left={-0.32}
            shadow-camera-right={0.32}
            shadow-camera-top={0.35}
            shadow-camera-bottom={-0.35}
            shadow-bias={-0.0004}
            shadow-normalBias={0.015}
          />
        </>
      )}
      <BoardSlab top={tableTop} theme={theme} riverMode={riverMode} viewSide={viewSide} disabled={disabled} onPick={pick} onHover={setHover} bgScene={bgScene} />

      {pieces.map(({ piece, x, y }) => {
        const isAttacker = Boolean(
          lastMove &&
          lastMove.to.x === x &&
          lastMove.to.y === y &&
          lastMove.captured &&
          lastMove.piece.id === piece.id,
        );
        return (
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
            hovered={Boolean(hover && hover.x === x && hover.y === y)}
            isCapturing={isAttacker}
            isCathedral={bgScene === 'cathedral'}
          />
        );
      })}

      {/* last move indicator */}
      {lastMove && (
        <>
          <Ring x={lastMove.from.x} y={lastMove.from.y} top={boardTop} inner={S * 0.18} outer={S * 0.26} color="#f59e0b" opacity={0.55} />
          <Ring x={lastMove.to.x} y={lastMove.to.y} top={boardTop} inner={PIECE_R * 1.05} outer={PIECE_R * 1.3} color="#f59e0b" opacity={0.75} />
        </>
      )}

      {/* selected piece ring */}
      {selectedPos && <Ring x={selectedPos.x} y={selectedPos.y} top={boardTop} inner={PIECE_R * 1.08} outer={PIECE_R * 1.42} color="#ffd54f" />}

      {/* Object Pool cho 36 điểm sáng gợi ý: RingGeometry pre-allocated, zero GC overhead */}
      <MoveHintsPool legalMoves={legalMoves} board={board} boardTop={boardTop} hover={hover} />

      {/* Hiệu ứng Ăn quân Tinh tế & Ngoạn mục: Đập quân ăn xuống, quân bị ăn bị văng ra ngoài bàn, vỡ vụn đá & sóng xung kích */}
      <CaptureImpactKineticSystem
        lastMove={lastMove}
        boardTop={boardTop}
        tableTop={tableTop}
        displayMode={displayMode}
      />

      {/* check indicator */}
      {kingInCheck && <Ring x={kingInCheck.x} y={kingInCheck.y} top={boardTop} inner={PIECE_R * 1.15} outer={PIECE_R * 1.7} color="#ff1a1a" pulse />}

      {/* Cannon Blast 3D explosive shockwave and fiery burst */}
      {cannonBlast && (
        <CannonBlast3D
          key={cannonBlast.id}
          x={cannonBlast.pos.x}
          y={cannonBlast.pos.y}
          top={boardTop}
          onComplete={onCannonBlastComplete}
        />
      )}

      <CameraRig
        viewSide={viewSide}
        boardTop={boardTop}
        view={cameraView}
        bgScene={bgScene}
        cameraElevation={cameraElevation}
        resetSignal={resetSignal}
        savePoseSignal={savePoseSignal}
        customPoseSignal={customPoseSignal}
        onPoseSaved={onPoseSaved}
        onCameraInteracted={onCameraInteracted}
      />
    </>
  );
};

export default function Board3DScene(props: Board3DSceneProps) {
  const lite = props.isLiteMode;
  return (
    <Canvas
      frameloop="demand"
      shadows={!lite}
      // Lock pixel ratio to max 2 for buttery smooth 60fps across Retina/4K screens
      dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)}
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

