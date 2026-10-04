/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Low-poly procedural venues for the real 3D scene. Everything is built from primitives
 * and canvas textures: no model / HDRI downloads (works offline in Capacitor too).
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Environment, Lightformer, Sky } from '@react-three/drei';
import { BackgroundScene3D } from '../../types';
import {
  getAsphaltTexture,
  getBrickTexture,
  getGrassTexture,
  getPlankTexture,
  getShutterTexture,
  getSidewalkTexture,
  getSignTexture,
} from './textures';

export interface VenueLayout {
  /** Height of the table top (board sits on it), in meters. */
  tableTop: number;
}

export const VENUE_LAYOUT: Record<BackgroundScene3D, VenueLayout> = {
  tra_da: { tableTop: 0.46 },
  ca_phe: { tableTop: 0.74 },
  hoa_vien: { tableTop: 0.7 },
  dau_truong: { tableTop: 0.76 },
  go_tram: { tableTop: 0.38 },
};

type V3 = [number, number, number];

// ---------------------------------------------------------------------------
// Small primitive helpers
// ---------------------------------------------------------------------------

const Box: React.FC<{
  size: V3;
  position?: V3;
  rotation?: V3;
  color?: string;
  map?: THREE.Texture;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  cast?: boolean;
  receive?: boolean;
  opacity?: number;
}> = ({ size, position, rotation, color = '#ffffff', map, roughness = 0.8, metalness = 0, emissive, emissiveIntensity, cast = true, receive = true, opacity }) => (
  <mesh position={position} rotation={rotation} castShadow={cast && (opacity === undefined || opacity >= 1)} receiveShadow={receive}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} map={map} roughness={roughness} metalness={metalness} transparent={opacity !== undefined && opacity < 1} opacity={opacity ?? 1} depthWrite={opacity === undefined || opacity >= 1} emissive={emissive} emissiveIntensity={emissiveIntensity} />
  </mesh>
);

const Cyl: React.FC<{
  args: [number, number, number, number?];
  position?: V3;
  rotation?: V3;
  color?: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  cast?: boolean;
}> = ({ args, position, rotation, color = '#ffffff', roughness = 0.6, metalness = 0, opacity, emissive, emissiveIntensity, cast = true }) => (
  <mesh position={position} rotation={rotation} castShadow={cast && opacity === undefined} receiveShadow>
    <cylinderGeometry args={[args[0], args[1], args[2], args[3] ?? 20]} />
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
      depthWrite={opacity === undefined}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  </mesh>
);

const Sign: React.FC<{ text: string; sub?: string; bg: string; fg: string; position: V3; rotation?: V3; size: [number, number] }> = ({ text, sub, bg, fg, position, rotation, size }) => {
  const tex = useMemo(() => getSignTexture(text, bg, fg, sub), [text, bg, fg, sub]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} roughness={0.7} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.25} />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// Furniture & props
// ---------------------------------------------------------------------------

/** Generic 4-legged table; top surface at y = top. */
const Table: React.FC<{ top: number; size: [number, number]; color: string; legColor?: string; map?: THREE.Texture; cloth?: string }> = ({ top, size, color, legColor, map, cloth }) => {
  const [w, d] = size;
  const t = 0.035;
  const leg = 0.045;
  return (
    <group>
      <Box size={[w, t, d]} position={[0, top - t / 2, 0]} color={cloth || color} map={cloth ? undefined : map} roughness={0.65} opacity={0.55} />
      {cloth && <Box size={[w + 0.02, top * 0.55, d + 0.02]} position={[0, top - (top * 0.55) / 2 - t / 2, 0]} color={cloth} roughness={0.95} opacity={0.55} />}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <Box key={`${sx}${sz}`} size={[leg, top - t, leg]} position={[sx * (w / 2 - leg), (top - t) / 2, sz * (d / 2 - leg)]} color={legColor || color} opacity={0.55} />
        ))
      )}
    </group>
  );
};

/** Vietnamese low plastic stool. */
const PlasticStool: React.FC<{ position: V3; color: string; h?: number }> = ({ position, color, h = 0.27 }) => (
  <group position={position}>
    <Cyl args={[0.13, 0.155, h, 6]} position={[0, h / 2, 0]} color={color} roughness={0.4} />
    <Cyl args={[0.14, 0.14, 0.02, 24]} position={[0, h + 0.01, 0]} color={color} roughness={0.35} />
  </group>
);

const TeaGlass: React.FC<{ position: V3 }> = ({ position }) => (
  <group position={position}>
    <Cyl args={[0.026, 0.022, 0.07, 14]} position={[0, 0.035, 0]} color="#e9eef0" roughness={0.05} opacity={0.28} />
    <Cyl args={[0.023, 0.02, 0.052, 14]} position={[0, 0.027, 0]} color="#b4621c" roughness={0.2} opacity={0.55} />
    <Box size={[0.014, 0.014, 0.014]} position={[0.006, 0.05, 0.004]} rotation={[0.3, 0.5, 0]} color="#dff3ff" roughness={0.1} cast={false} />
    <Box size={[0.013, 0.013, 0.013]} position={[-0.008, 0.047, -0.006]} rotation={[0.6, 0.1, 0.4]} color="#dff3ff" roughness={0.1} cast={false} />
  </group>
);

const Teapot: React.FC<{ position: V3; color?: string }> = ({ position, color = '#e8eef2' }) => (
  <group position={position}>
    <mesh position={[0, 0.055, 0]} scale={[1, 0.82, 1]} castShadow>
      <sphereGeometry args={[0.065, 20, 14]} />
      <meshStandardMaterial color={color} roughness={0.25} transparent opacity={0.55} depthWrite={false} />
    </mesh>
    <Cyl args={[0.009, 0.014, 0.08, 10]} position={[0.07, 0.07, 0]} rotation={[0, 0, -0.9]} color={color} roughness={0.25} opacity={0.55} />
    <mesh position={[-0.068, 0.06, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <torusGeometry args={[0.025, 0.007, 8, 16]} />
      <meshStandardMaterial color={color} roughness={0.25} transparent opacity={0.55} depthWrite={false} />
    </mesh>
    <Cyl args={[0.025, 0.03, 0.015, 16]} position={[0, 0.112, 0]} color={color} roughness={0.25} opacity={0.55} />
    <mesh position={[0, 0.127, 0]}>
      <sphereGeometry args={[0.009, 10, 8]} />
      <meshStandardMaterial color="#1e3a5f" roughness={0.3} transparent opacity={0.55} depthWrite={false} />
    </mesh>
  </group>
);

const PeanutPlate: React.FC<{ position: V3 }> = ({ position }) => {
  const nuts = useMemo(() => Array.from({ length: 9 }, (_, i) => [Math.cos(i * 2.4) * 0.03 * ((i % 3) / 2 + 0.3), 0.014, Math.sin(i * 2.4) * 0.03 * ((i % 3) / 2 + 0.3)] as V3), []);
  return (
    <group position={position}>
      <Cyl args={[0.06, 0.045, 0.012, 20]} position={[0, 0.006, 0]} color="#f4f1ea" roughness={0.3} />
      {nuts.map((p, i) => (
        <mesh key={i} position={p} scale={[1.5, 0.8, 1]} rotation={[0, i, 0]} castShadow>
          <sphereGeometry args={[0.008, 8, 6]} />
          <meshStandardMaterial color="#b98a52" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
};

const ConicalHat: React.FC<{ position: V3; rotation?: V3 }> = ({ position, rotation }) => (
  <mesh position={position} rotation={rotation} castShadow>
    <coneGeometry args={[0.2, 0.11, 32, 1, true]} />
    <meshStandardMaterial color="#e3c98f" roughness={0.9} side={THREE.DoubleSide} />
  </mesh>
);

const Tree: React.FC<{ position: V3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <Cyl args={[0.12, 0.2, 3.2, 10]} position={[0, 1.6, 0]} color="#5a4632" roughness={1} />
    {[
      [0, 3.5, 0, 1.4],
      [-0.9, 3.1, 0.4, 1.0],
      [0.8, 3.2, -0.3, 1.1],
      [0.2, 3.0, 0.9, 0.9],
      [-0.3, 3.9, -0.6, 0.9],
    ].map(([x, y, z, r], i) => (
      <mesh key={i} position={[x, y, z]} castShadow>
        <icosahedronGeometry args={[r, 1]} />
        <meshStandardMaterial color={i % 2 ? '#4e7a35' : '#3f6a2c'} roughness={0.95} flatShading />
      </mesh>
    ))}
  </group>
);

const Motorbike: React.FC<{ position: V3; rotation?: V3; color?: string }> = ({ position, rotation, color = '#b81d24' }) => (
  <group position={position} rotation={rotation}>
    {[-0.62, 0.62].map((x) => (
      <mesh key={x} position={[x, 0.3, 0]} castShadow>
        <torusGeometry args={[0.26, 0.06, 10, 24]} />
        <meshStandardMaterial color="#1b1b1b" roughness={0.85} />
      </mesh>
    ))}
    <Box size={[0.9, 0.3, 0.26]} position={[0, 0.55, 0]} color={color} roughness={0.35} metalness={0.2} />
    <Box size={[0.55, 0.09, 0.28]} position={[-0.15, 0.75, 0]} color="#222" roughness={0.6} />
    <Box size={[0.3, 0.45, 0.24]} position={[0.5, 0.75, 0]} rotation={[0, 0, -0.35]} color={color} roughness={0.35} metalness={0.2} />
    <Cyl args={[0.015, 0.015, 0.6, 8]} position={[0.62, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} color="#aaa" metalness={0.8} roughness={0.3} />
  </group>
);

const GOODS_COLORS = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#fb8c00', '#f5f5f5', '#8e24aa'];

const Shophouse: React.FC<{ position: V3; width: number; height: number; color: string; sign: string; signBg: string; signFg: string; rotation?: V3 }> = ({ position, width, height, color, sign, signBg, signFg, rotation }) => {
  const shutter = useMemo(() => getShutterTexture(), []);
  return (
    <group position={position} rotation={rotation}>
      <Box size={[width, height, 0.4]} position={[0, height / 2, 0]} color={color} roughness={0.95} />
      {/* rolling shutter, half open with warm interior */}
      <mesh position={[0, 1.55, 0.205]}>
        <planeGeometry args={[width * 0.8, 1.1]} />
        <meshStandardMaterial map={shutter} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.5, 0.205]}>
        <planeGeometry args={[width * 0.8, 1.0]} />
        <meshStandardMaterial color="#24170c" emissive="#ff9d45" emissiveIntensity={0.12} />
      </mesh>
      {/* shelves with goods inside the open shop front */}
      {[0.28, 0.72].map((y) => (
        <group key={y}>
          <Box size={[width * 0.76, 0.03, 0.18]} position={[0, y, 0.3]} color="#6b4a2c" cast={false} />
          {GOODS_COLORS.map((c, i) => (
            <Box
              key={i}
              size={[width * 0.07, 0.12 + (i % 3) * 0.04, 0.12]}
              position={[(i / (GOODS_COLORS.length - 1) - 0.5) * width * 0.68, y + 0.08 + (i % 3) * 0.02, 0.3]}
              color={c}
              cast={false}
            />
          ))}
        </group>
      ))}
      <Sign text={sign} bg={signBg} fg={signFg} position={[0, 2.45, 0.23]} size={[width * 0.86, width * 0.215]} />
      {/* balcony + windows */}
      <Box size={[width * 0.9, 0.08, 0.5]} position={[0, 3.2, 0.42]} color="#d8d2c4" />
      <Box size={[width * 0.9, 0.45, 0.03]} position={[0, 3.45, 0.66]} color="#3b3b3b" metalness={0.6} roughness={0.4} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * width * 0.22, 3.8, 0.205]}>
          <planeGeometry args={[width * 0.28, 0.9]} />
          <meshStandardMaterial color="#26323a" roughness={0.2} metalness={0.3} emissive="#ffcf8a" emissiveIntensity={s > 0 ? 0.35 : 0} />
        </mesh>
      ))}
      <Box size={[0.5, 0.32, 0.25]} position={[width * 0.3, 4.6, 0.32]} color="#e7e7e2" />
      {/* potted plants on balcony */}
      {[-0.3, 0, 0.3].map((x) => (
        <mesh key={x} position={[x * width, 3.42, 0.5]} castShadow>
          <icosahedronGeometry args={[0.14, 0]} />
          <meshStandardMaterial color="#4c7a33" flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

const PowerLines: React.FC = () => {
  const tubes = useMemo(() => {
    return [0, 1, 2, 3].map((i) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(2.0, 5.4 - i * 0.12, -1.2),
        new THREE.Vector3(-1.5, 4.5 - i * 0.2, -2.6 + i * 0.1),
        new THREE.Vector3(-6, 5.2 - i * 0.1, -4.0)
      );
      return new THREE.TubeGeometry(curve, 24, 0.012, 4, false);
    });
  }, []);
  return (
    <group>
      <Cyl args={[0.09, 0.12, 6, 8]} position={[2.0, 3, -1.2]} color="#8d8a84" roughness={0.9} />
      {tubes.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#151515" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
};

const HangingBulb: React.FC<{ position: V3; color?: string; intensity?: number; cordLength?: number }> = ({ position, color = '#ffc078', intensity = 1.6, cordLength = 0.8 }) => (
  <group position={position}>
    <Cyl args={[0.004, 0.004, cordLength, 6]} position={[0, cordLength / 2, 0]} color="#111" cast={false} />
    <mesh>
      <sphereGeometry args={[0.035, 14, 10]} />
      <meshStandardMaterial color="#fff2d6" emissive={color} emissiveIntensity={3} />
    </mesh>
    <pointLight color={color} intensity={intensity} distance={4} decay={2} />
  </group>
);

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

const WarmEnvironment: React.FC<{ tint?: string }> = ({ tint = '#ffd9a8' }) => (
  <Environment frames={1} resolution={64}>
    <Lightformer intensity={1.6} color={tint} position={[0, 4, -4]} scale={[10, 4, 1]} />
    <Lightformer intensity={0.8} color="#bcd4ff" position={[-5, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
    <Lightformer intensity={0.6} color="#ffffff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} />
  </Environment>
);

const SunLight: React.FC<{ position: V3; color: string; intensity: number; lite: boolean; size?: number }> = ({ position, color, intensity, lite, size = 2.5 }) => (
  <directionalLight
    position={position}
    color={color}
    intensity={intensity}
    castShadow={!lite}
    shadow-mapSize-width={1024}
    shadow-mapSize-height={1024}
    shadow-camera-left={-size}
    shadow-camera-right={size}
    shadow-camera-top={size}
    shadow-camera-bottom={-size}
    shadow-camera-near={0.5}
    shadow-camera-far={20}
    shadow-bias={-0.0004}
    shadow-normalBias={0.02}
    shadow-radius={4}
  />
);

/** Quán trà đá vỉa hè: the fully dressed venue. */
const TraDaVenue: React.FC<{ lite: boolean; tableTop: number }> = ({ lite, tableTop }) => {
  const sidewalk = useMemo(() => getSidewalkTexture(), []);
  const asphalt = useMemo(() => getAsphaltTexture(), []);
  const wood = useMemo(() => getPlankTexture('#8a5a33', '#40230f'), []);
  return (
    <group>
      <Sky distance={4500} sunPosition={[6, 1.1, -8]} turbidity={7} rayleigh={2.2} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <fog attach="fog" args={['#e2b88e', 9, 32]} />
      <hemisphereLight args={['#ffe2bd', '#5b4630', 0.75]} />
      <SunLight position={[4, 5, -3]} color="#ffcf98" intensity={2.4} lite={lite} />
      {!lite && <WarmEnvironment />}

      {/* ground: sidewalk + curb + road on the right */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial map={sidewalk} roughness={0.95} />
      </mesh>
      <Box size={[0.2, 0.12, 40]} position={[2.3, 0.06, 0]} color="#b9b4aa" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.4, 0.005, 0]} receiveShadow>
        <planeGeometry args={[8, 40]} />
        <meshStandardMaterial map={asphalt} roughness={0.9} />
      </mesh>
      {[-12, -8, -4, 0, 4, 8].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[6.4, 0.01, z]}>
          <planeGeometry args={[0.12, 1.6]} />
          <meshStandardMaterial color="#e9e4d4" roughness={0.8} />
        </mesh>
      ))}

      {/* the low wooden table */}
      <Table top={tableTop} size={[0.78, 0.78]} color="#8a5a33" legColor="#5c3a1e" map={wood} />

      {/* stools: opponent's (with conical hat), spare ones */}
      <PlasticStool position={[0, 0, -0.75]} color="#1f5fbf" />
      <ConicalHat position={[0, 0.34, -0.75]} rotation={[0.25, 0.4, 0.1]} />
      <PlasticStool position={[-0.85, 0, 0.1]} color="#c62828" />
      <PlasticStool position={[0.75, 0, -0.55]} color="#c62828" />
      <PlasticStool position={[-1.4, 0, -1.6]} color="#1f5fbf" h={0.24} />

      {/* on the table: tea + teapot + peanuts */}
      <TeaGlass position={[0.31, tableTop, 0.3]} />
      <TeaGlass position={[-0.3, tableTop, -0.31]} />
      <Teapot position={[0.31, tableTop, -0.27]} />
      <PeanutPlate position={[-0.31, tableTop, 0.3]} />

      {/* tea stall cart */}
      <group position={[-1.05, 0, -1.55]} rotation={[0, 0.35, 0]}>
        <Box size={[1.0, 0.75, 0.55]} position={[0, 0.375, 0]} color="#7a4d2a" map={wood} />
        <Sign text="TRÀ ĐÁ" sub="2.000đ / cốc" bg="#c62828" fg="#fff4d6" position={[0, 0.42, 0.28]} size={[0.8, 0.2]} />
        <Cyl args={[0.11, 0.11, 0.42, 16]} position={[-0.3, 0.96, 0]} color="#d32f2f" roughness={0.35} />
        <Cyl args={[0.05, 0.05, 0.06, 12]} position={[-0.3, 1.2, 0]} color="#f2f2f2" roughness={0.3} />
        {[
          ['#f2b632', 0.0],
          ['#8bc34a', 0.17],
          ['#e57373', 0.34],
        ].map(([c, x]) => (
          <group key={String(x)} position={[Number(x), 0.75, 0.05]}>
            <Cyl args={[0.065, 0.065, 0.2, 14]} position={[0, 0.1, 0]} color="#f0f6f8" roughness={0.05} opacity={0.3} />
            <Cyl args={[0.058, 0.058, 0.12, 14]} position={[0, 0.06, 0]} color={String(c)} roughness={0.5} cast={false} />
          </group>
        ))}
        <Cyl args={[0.18, 0.15, 0.24, 18]} position={[0.32, 0.87, -0.12]} color="#2e7d32" roughness={0.4} />
      </group>

      {/* shophouses behind */}
      <Shophouse position={[-3.6, 0, -4.6]} width={3.4} height={6.2} color="#e8c169" sign="TẠP HÓA" signBg="#1565c0" signFg="#ffffff" />
      <Shophouse position={[0, 0, -4.6]} width={3.6} height={7.0} color="#a7d3c2" sign="PHỞ BÒ" signBg="#fbc02d" signFg="#b71c1c" />
      <Shophouse position={[3.6, 0, -4.6]} width={3.4} height={5.6} color="#e7a7a0" sign="SỬA XE" signBg="#2e7d32" signFg="#ffffff" />
      <Shophouse position={[-4.6, 0, -0.4]} rotation={[0, Math.PI / 2, 0]} width={3.4} height={6.6} color="#d9cdb4" sign="CƠM BÌNH DÂN" signBg="#b71c1c" signFg="#fff59d" />

      <Tree position={[1.25, 0, -1.9]} scale={0.9} />
      {!lite && <PowerLines />}
      <Motorbike position={[1.5, 0, -0.6]} rotation={[0, -1.2, 0]} />
      {!lite && <Motorbike position={[2.0, 0, -2.6]} rotation={[0, -1.7, 0]} color="#1e4fa3" />}

      {/* warm bulb hanging from the tree over the table */}
      <HangingBulb position={[0.15, tableTop + 1.15, -0.35]} intensity={lite ? 1.2 : 1.8} />
    </group>
  );
};

const CaPheVenue: React.FC<{ lite: boolean; tableTop: number }> = ({ lite, tableTop }) => {
  const floor = useMemo(() => getPlankTexture('#6d4325', '#2c170a'), []);
  const brick = useMemo(() => getBrickTexture(), []);
  const wood = useMemo(() => getPlankTexture('#5b3519', '#26130a'), []);
  return (
    <group>
      <color attach="background" args={['#1b120c']} />
      <hemisphereLight args={['#ffd9ae', '#2a1a10', 0.45]} />
      <SunLight position={[-3, 4, 2]} color="#ffe4c2" intensity={1.2} lite={lite} />
      {!lite && <WarmEnvironment tint="#ffc58a" />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial map={floor} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.6, -3]} receiveShadow>
        <planeGeometry args={[9, 3.2]} />
        <meshStandardMaterial map={brick} roughness={0.95} />
      </mesh>
      <mesh position={[-3.5, 1.6, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[9, 3.2]} />
        <meshStandardMaterial color="#e6d6bd" roughness={0.95} />
      </mesh>
      <mesh position={[3.5, 1.6, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[9, 3.2]} />
        <meshStandardMaterial color="#d8c5a6" roughness={0.95} />
      </mesh>
      {/* window with daylight */}
      <mesh position={[3.49, 1.6, -0.8]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.6, 1.2]} />
        <meshStandardMaterial color="#fff3d1" emissive="#ffe0a8" emissiveIntensity={1.4} />
      </mesh>
      <Sign text="CÀ PHÊ CỜ TƯỚNG" bg="#2b1a0f" fg="#f6c26b" position={[0, 2.4, -2.98]} size={[2.4, 0.6]} />
      {/* shelves with cups */}
      {[1.2, 1.6].map((y) => (
        <group key={y}>
          <Box size={[1.6, 0.04, 0.25]} position={[-1.8, y, -2.85]} color="#4a2a14" />
          {[-0.6, -0.3, 0, 0.3, 0.6].map((x) => (
            <Cyl key={x} args={[0.04, 0.035, 0.08, 12]} position={[-1.8 + x, y + 0.06, -2.85]} color={x > 0 ? '#f1ece2' : '#2f6f5e'} roughness={0.3} />
          ))}
        </group>
      ))}
      <Table top={tableTop} size={[0.8, 0.8]} color="#5b3519" map={wood} legColor="#2c170a" />
      {/* opponent chair */}
      <group position={[0, 0, -0.75]}>
        <Box size={[0.45, 0.04, 0.42]} position={[0, 0.46, 0]} color="#4a2a14" />
        <Box size={[0.45, 0.5, 0.04]} position={[0, 0.72, -0.2]} color="#4a2a14" />
        {[-1, 1].map((sx) => [-1, 1].map((sz) => <Box key={`${sx}${sz}`} size={[0.04, 0.46, 0.04]} position={[sx * 0.2, 0.23, sz * 0.18]} color="#2c170a" />))}
      </group>
      <TeaGlass position={[0.3, tableTop, 0.3]} />
      {/* phin coffee */}
      <group position={[-0.3, tableTop, -0.28]}>
        <Cyl args={[0.03, 0.026, 0.07, 14]} position={[0, 0.035, 0]} color="#e9eef0" roughness={0.05} opacity={0.3} />
        <Cyl args={[0.027, 0.024, 0.04, 14]} position={[0, 0.02, 0]} color="#2a160a" roughness={0.3} />
        <Cyl args={[0.036, 0.03, 0.05, 16]} position={[0, 0.095, 0]} color="#c9c9c9" metalness={0.9} roughness={0.25} />
      </group>
      <HangingBulb position={[0, tableTop + 0.95, 0]} intensity={lite ? 1.4 : 2.2} cordLength={1.4} />
      <HangingBulb position={[-1.8, 2.2, -1.6]} intensity={1.0} cordLength={0.8} />
    </group>
  );
};

const HoaVienVenue: React.FC<{ lite: boolean; tableTop: number }> = ({ lite, tableTop }) => {
  const grass = useMemo(() => getGrassTexture(), []);
  const bamboo = useMemo(
    () =>
      Array.from({ length: lite ? 14 : 30 }, (_, i) => {
        const a = (i / 30) * Math.PI * 1.3 + Math.PI * 0.85;
        const r = 3 + (i % 5) * 0.25;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r - 0.5, h: 3.5 + (i % 7) * 0.4 };
      }),
    [lite]
  );
  return (
    <group>
      <Sky distance={4500} sunPosition={[-4, 0.6, -8]} turbidity={9} rayleigh={3} mieCoefficient={0.008} mieDirectionalG={0.88} />
      <fog attach="fog" args={['#cdb79a', 7, 26]} />
      <hemisphereLight args={['#ffe6c4', '#3d4a28', 0.7]} />
      <SunLight position={[-4, 4.5, -3]} color="#ffd6a0" intensity={2.0} lite={lite} />
      {!lite && <WarmEnvironment />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.8, 0.01, -1.8]}>
        <circleGeometry args={[1.1, 32]} />
        <meshStandardMaterial color="#2c4a55" roughness={0.08} metalness={0.3} />
      </mesh>
      {bamboo.map((b, i) => (
        <Cyl key={i} args={[0.035, 0.04, b.h, 6]} position={[b.x, b.h / 2, b.z]} color={i % 3 ? '#6f8f3a' : '#829f45'} roughness={0.7} />
      ))}
      {/* stone round table + drum stools */}
      <Cyl args={[0.46, 0.46, 0.06, 28]} position={[0, tableTop - 0.03, 0]} color="#9b968c" roughness={0.9} />
      <Cyl args={[0.12, 0.2, tableTop - 0.06, 12]} position={[0, (tableTop - 0.06) / 2, 0]} color="#8a857b" roughness={0.95} />
      <Cyl args={[0.17, 0.17, 0.42, 14]} position={[0, 0.21, -0.75]} color="#8f8a80" roughness={0.95} />
      {/* stone lantern */}
      <group position={[-1.4, 0, -1.2]}>
        <Box size={[0.3, 0.6, 0.3]} position={[0, 0.3, 0]} color="#8a857b" />
        <Box size={[0.4, 0.3, 0.4]} position={[0, 0.75, 0]} color="#9b968c" emissive="#ffb055" emissiveIntensity={0.4} />
        <mesh position={[0, 1.02, 0]} castShadow>
          <coneGeometry args={[0.36, 0.25, 4]} />
          <meshStandardMaterial color="#77736a" roughness={0.95} />
        </mesh>
      </group>
      {/* red lanterns */}
      {[
        [-0.7, 2.0, -0.9],
        [0.8, 2.1, -1.1],
      ].map((p, i) => (
        <group key={i} position={p as V3}>
          <mesh scale={[1, 1.25, 1]}>
            <sphereGeometry args={[0.16, 16, 12]} />
            <meshStandardMaterial color="#c62828" emissive="#ff5a2a" emissiveIntensity={1.2} roughness={0.6} />
          </mesh>
          <pointLight color="#ff8a4a" intensity={0.8} distance={3} />
        </group>
      ))}
      <TeaGlass position={[0.28, tableTop, 0.26]} />
      <Teapot position={[-0.28, tableTop, -0.26]} color="#6d8f86" />
    </group>
  );
};

const DauTruongVenue: React.FC<{ lite: boolean; tableTop: number }> = ({ lite, tableTop }) => {
  const seats = useMemo(() => {
    const out: V3[] = [];
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 14; i++) {
        const a = Math.PI * 1.15 + (i / 13) * Math.PI * 0.7;
        const r = 3.2 + row * 0.7;
        out.push([Math.cos(a) * r, 0.25 + row * 0.35, Math.sin(a) * r + 0.6]);
      }
    }
    return out;
  }, []);
  return (
    <group>
      <color attach="background" args={['#07070a']} />
      <fog attach="fog" args={['#07070a', 5, 16]} />
      <hemisphereLight args={['#9fb0ff', '#200808', 0.25]} />
      <spotLight position={[0, 4.5, 1]} angle={0.45} penumbra={0.6} intensity={30} color="#fff1d6" castShadow={!lite} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0004} />
      {!lite && <WarmEnvironment tint="#ffe9c9" />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[12, 48]} />
        <meshStandardMaterial color="#1a0f10" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[1.8, 48]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.9} />
      </mesh>
      <Table top={tableTop} size={[0.85, 0.85]} color="#3b1d0e" cloth="#8e1b1b" />
      {seats.map((p, i) => (
        <Box key={i} size={[0.38, 0.3, 0.38]} position={p} color={i % 5 === 0 ? '#3b3b44' : '#5b1a1a'} roughness={0.8} cast={false} />
      ))}
      <Sign text="GIẢI CỜ ÚP" sub="Đấu Trường Kỳ Vương" bg="#7f1d1d" fg="#ffd54f" position={[0, 2.6, -4.2]} size={[3.2, 0.8]} />
      <Box size={[0.45, 0.04, 0.42]} position={[0, 0.46, -0.75]} color="#222" />
      <TeaGlass position={[0.33, tableTop, 0.33]} />
    </group>
  );
};

const GoTramVenue: React.FC<{ lite: boolean; tableTop: number }> = ({ lite, tableTop }) => {
  const floor = useMemo(() => getPlankTexture('#3b2414', '#120804'), []);
  const wood = useMemo(() => getPlankTexture('#4a2c17', '#1a0c05'), []);
  return (
    <group>
      <color attach="background" args={['#0f0a07']} />
      <hemisphereLight args={['#ffdcb0', '#140c06', 0.3]} />
      {!lite && <WarmEnvironment tint="#ffcc8f" />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial map={floor} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.5, -2.6]} receiveShadow>
        <planeGeometry args={[8, 3]} />
        <meshStandardMaterial color="#2b1a0e" roughness={0.9} />
      </mesh>
      <Table top={tableTop} size={[0.8, 0.8]} color="#4a2c17" map={wood} legColor="#1a0c05" />
      <Box size={[0.5, 0.08, 0.5]} position={[0, 0.04, -0.72]} color="#5b1f1f" roughness={1} />
      {/* bonsai + incense */}
      <group position={[-1.2, 0, -1.6]}>
        <Box size={[0.5, 0.5, 0.5]} position={[0, 0.25, 0]} color="#2a1a0e" />
        <Cyl args={[0.12, 0.09, 0.1, 12]} position={[0, 0.55, 0]} color="#3b5f7a" roughness={0.4} />
        <mesh position={[0, 0.8, 0]} castShadow>
          <icosahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color="#3e6a2d" flatShading roughness={1} />
        </mesh>
      </group>
      <group position={[0, tableTop + 1.0, 0]}>
        <mesh>
          <sphereGeometry args={[0.18, 18, 14]} />
          <meshStandardMaterial color="#fff0d0" emissive="#ffb560" emissiveIntensity={1.6} roughness={0.9} />
        </mesh>
        <pointLight color="#ffbf73" intensity={lite ? 2 : 3} distance={5} castShadow={!lite} shadow-mapSize-width={512} shadow-mapSize-height={512} shadow-bias={-0.002} />
      </group>
      <TeaGlass position={[0.3, tableTop, 0.3]} />
    </group>
  );
};

export const Venue3D: React.FC<{ scene: BackgroundScene3D; lite: boolean }> = ({ scene, lite }) => {
  const tableTop = VENUE_LAYOUT[scene].tableTop;
  switch (scene) {
    case 'ca_phe':
      return <CaPheVenue lite={lite} tableTop={tableTop} />;
    case 'hoa_vien':
      return <HoaVienVenue lite={lite} tableTop={tableTop} />;
    case 'dau_truong':
      return <DauTruongVenue lite={lite} tableTop={tableTop} />;
    case 'go_tram':
      return <GoTramVenue lite={lite} tableTop={tableTop} />;
    case 'tra_da':
    default:
      return <TraDaVenue lite={lite} tableTop={tableTop} />;
  }
};
