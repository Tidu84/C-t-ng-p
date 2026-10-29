import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { getPlankTexture, getSignTexture, getPieceShadowTexture } from './textures';

type V3 = [number, number, number];
// Static shared shapes: the room never schedules animation frames or downloads a model.
const archShape = new THREE.Shape();
archShape.moveTo(-0.59, 0); archShape.lineTo(-0.59, 1.65);
archShape.absarc(0, 1.65, 0.59, Math.PI, 0, true);
archShape.lineTo(0.59, 0); archShape.closePath();
const archPane = new THREE.ShapeGeometry(archShape, 24);
const archTrim = new THREE.TorusGeometry(0.63, 0.038, 6, 32, Math.PI);
const leafGeometry = new THREE.SphereGeometry(1, 7, 5);
let floorTexture: THREE.CanvasTexture | undefined;
let courtyardTexture: THREE.CanvasTexture | undefined;

function getFloorTexture() {
  if (floorTexture) return floorTexture;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#c9b898'; c.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    const px = x * 128, py = y * 128;
    c.fillStyle = '#263f39'; c.fillRect(px + 2, py + 2, 124, 124);
    c.strokeStyle = '#b4a887'; c.lineWidth = 2; c.strokeRect(px + 12, py + 12, 104, 104);
    c.save(); c.translate(px + 64, py + 64); c.rotate(Math.PI / 4);
    c.fillStyle = '#a99872'; c.fillRect(-23, -23, 46, 46);
    c.fillStyle = '#384f45'; c.fillRect(-15, -15, 30, 30); c.restore();
    c.fillStyle = '#a99872';
    for (const [dx, dy] of [[25,25], [103,25], [25,103], [103,103]]) {
      c.beginPath(); c.arc(px + dx, py + dy, 3, 0, Math.PI * 2); c.fill();
    }
  }
  floorTexture = new THREE.CanvasTexture(canvas); floorTexture.colorSpace = THREE.SRGBColorSpace;
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(12, 12); floorTexture.anisotropy = 4;
  return floorTexture;
}

/** A small painted distance layer; all nearby pillars, shutters and furniture have real depth. */
function getCourtyardTexture() {
  if (courtyardTexture) return courtyardTexture;
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
  const c = canvas.getContext('2d')!;
  const sky = c.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#102737'); sky.addColorStop(0.55, '#456469'); sky.addColorStop(1, '#172a2b');
  c.fillStyle = sky; c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 12; i++) {
    const x = i * 96 - 30, h = 130 + ((i * 37) % 90);
    c.fillStyle = i % 2 ? '#233c3e' : '#2c4446'; c.fillRect(x, 290 - h, 82, h + 120);
    c.fillStyle = '#d8b479';
    for (let y = 320 - h; y < 330; y += 39) for (let j = 0; j < 3; j++) {
      c.globalAlpha = 0.2 + ((i + j) % 3) * 0.16; c.fillRect(x + 12 + j * 22, y, 8, 17);
    }
  }
  c.globalAlpha = 1;
  c.fillStyle = '#152c2c'; c.fillRect(0, 360, 1024, 152);
  c.strokeStyle = '#b6a67a'; c.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x = 50 + i * 143;
    c.fillStyle = '#112c27'; c.fillRect(x, 190, 8, 200);
    for (let j = 0; j < 5; j++) { c.beginPath(); c.ellipse(x + (j - 2) * 22, 175 + (j % 2) * 24, 52, 30, -0.3, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#edc98c'; c.fillRect(x + 50, 290, 3, 80);
    c.beginPath(); c.arc(x + 51, 284, 5, 0, Math.PI * 2); c.fill();
    const glow = c.createRadialGradient(x + 51, 284, 1, x + 51, 284, 28);
    glow.addColorStop(0, '#ffd09c55'); glow.addColorStop(1, '#ffd09c00');
    c.fillStyle = glow; c.fillRect(x + 23, 256, 56, 56);
  }
  courtyardTexture = new THREE.CanvasTexture(canvas); courtyardTexture.colorSpace = THREE.SRGBColorSpace;
  return courtyardTexture;
}

/** Merge opaque static decor by surface, with vertex colors, to keep draw calls low. */
const StaticRoom: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert();
    const batches = new Map<string, { material: THREE.MeshStandardMaterial; parts: THREE.BufferGeometry[]; cast: boolean; receive: boolean }>();
    const originals: THREE.Mesh[] = [];
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.visible || Array.isArray(object.material)) return;
      const material = object.material;
      if (!(material instanceof THREE.MeshStandardMaterial) || material.transparent) return;
      const key = [material.map?.uuid ?? '', material.roughness, material.metalness, material.side,
        material.emissive.getHex(), material.emissiveMap?.uuid ?? '', material.emissiveIntensity,
        object.castShadow, object.receiveShadow].join(':');
      let batch = batches.get(key);
      if (!batch) {
        const copy = material.clone(); copy.color.set('#ffffff'); copy.vertexColors = true;
        batch = { material: copy, parts: [], cast: object.castShadow, receive: object.receiveShadow };
        batches.set(key, batch);
      }
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      const colors = new Float32Array(geometry.getAttribute('position').count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = material.color.r; colors[i + 1] = material.color.g; colors[i + 2] = material.color.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometry.clearGroups();
      batch.parts.push(geometry); originals.push(object); object.visible = false;
    });
    const baked = new THREE.Group(); baked.name = 'CafeStaticBatches';
    for (const batch of batches.values()) {
      const geometry = mergeGeometries(batch.parts);
      batch.parts.forEach((part) => part.dispose());
      if (!geometry) { batch.material.dispose(); continue; }
      const mesh = new THREE.Mesh(geometry, batch.material);
      mesh.castShadow = batch.cast; mesh.receiveShadow = batch.receive;
      baked.add(mesh);
    }
    root.add(baked);
    return () => {
      root.remove(baked); originals.forEach((mesh) => { mesh.visible = true; });
      baked.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); } });
    };
  }, []);
  return <group ref={ref}>{children}</group>;
};

const Block: React.FC<{ at: V3; size: V3; color: string; map?: THREE.Texture; metal?: number; cast?: boolean }> = ({ at, size, color, map, metal = 0, cast = false }) => (
  <mesh position={at} castShadow={cast} receiveShadow>
    <boxGeometry args={size} /><meshStandardMaterial color={color} map={map} roughness={metal ? 0.38 : 0.76} metalness={metal} />
  </mesh>
);
const Cylinder: React.FC<{ at: V3; radius: number; height: number; color: string; metal?: number }> = ({ at, radius, height, color, metal = 0 }) => (
  <mesh position={at} receiveShadow><cylinderGeometry args={[radius, radius * 0.92, height, 12]} />
    <meshStandardMaterial color={color} roughness={metal ? 0.3 : 0.75} metalness={metal} />
  </mesh>
);
const ContactShadow: React.FC<{ at: V3; size: [number, number]; opacity?: number }> = ({ at, size, opacity = 0.3 }) => (
  <mesh position={at} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={size} /><meshBasicMaterial map={getPieceShadowTexture()} transparent opacity={opacity} depthWrite={false} />
  </mesh>
);
function Chair({ at, rotation = 0 }: { at: V3; rotation?: number }) {
  return <group position={at} rotation={[0, rotation, 0]}>
    <Block at={[0, 0.43, 0]} size={[0.38, 0.045, 0.37]} color="#513b28" cast />
    {[-1, 1].map((x) => [-1, 1].map((z) => <Block key={`${x}${z}`} at={[x * 0.15, 0.22, z * 0.15]} size={[0.035, 0.43, 0.035]} color="#30271f" />))}
    {[-0.16, 0.16].map((x) => <Block key={x} at={[x, 0.66, -0.16]} size={[0.032, 0.48, 0.032]} color="#513b28" />)}
    <Block at={[0, 0.85, -0.16]} size={[0.35, 0.065, 0.035]} color="#513b28" />
    {[-0.105, -0.035, 0.035, 0.105].map((x) => <Block key={x} at={[x, 0.68, -0.16]} size={[0.025, 0.26, 0.025]} color="#9f8a62" />)}
  </group>;
}
function Plant({ at, scale = 1 }: { at: V3; scale?: number }) {
  return <group position={at} scale={scale}>
    <Cylinder at={[0, 0.15, 0]} radius={0.16} height={0.3} color="#69513a" />
    {[0,1,2,3,4,5].map((i) => <group key={i} rotation={[0, i * 2.4, 0]}>
      <Block at={[0.035, 0.48 + i * 0.035, 0]} size={[0.008, 0.6, 0.008]} color="#617247" />
      <mesh geometry={leafGeometry} position={[0.13, 0.65 + i * 0.035, 0]} rotation={[0, 0, -0.65]} scale={[0.09, 0.26, 0.025]}>
        <meshStandardMaterial color={i % 2 ? '#466652' : '#284d40'} roughness={0.9} />
      </mesh>
    </group>)}
  </group>;
}
function Pendant({ at, lite }: { at: V3; lite: boolean }) {
  return <group position={at}>
    <Cylinder at={[0, 0.28, 0]} radius={0.006} height={0.55} color="#30291f" />
    <mesh rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.19, 0.12, 20, 1, true]} />
      <meshStandardMaterial color="#365348" side={THREE.DoubleSide} metalness={0.45} roughness={0.38} />
    </mesh>
    <mesh position={[0, -0.045, 0]}><sphereGeometry args={[0.035, 10, 8]} />
      <meshBasicMaterial color="#ffe0a0" />
    </mesh>
    {!lite && <pointLight position={[0, -0.1, 0]} color="#ffd29a" intensity={1.1} distance={3.4} decay={2} />}
  </group>;
}
function ArchedWindow({ x }: { x: number }) {
  return <group position={[x, 0.35, -2.65]}>
    <mesh geometry={archPane}><meshStandardMaterial color="#193d43" emissive="#447077" emissiveIntensity={0.16} transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={archTrim} position={[0, 1.65, 0.035]}><meshStandardMaterial color="#a58b5d" metalness={0.5} roughness={0.55} /></mesh>
    {[-1,1].map((side) => <group key={side}>
      <Block at={[side * 0.63, 0.82, 0]} size={[0.075, 1.65, 0.12]} color="#5f4c33" />
      <group position={[side * 0.8, 0.82, 0.17]} rotation={[0, side * 0.38, 0]}>
        <Block at={[0, 0, 0]} size={[0.27, 1.64, 0.045]} color="#25483f" />
        {Array.from({length: 13}, (_, i) => <Block key={i} at={[0, -0.7 + i * 0.11, 0.035]} size={[0.23, 0.028, 0.035]} color="#3b5d4b" />)}
      </group>
    </group>)}
    <Block at={[0, 0.95, 0.045]} size={[0.026, 1.85, 0.035]} color="#745d3d" />
    <Block at={[0, 1.38, 0.045]} size={[1.16, 0.025, 0.035]} color="#745d3d" />
    <Block at={[0, -0.025, 0.06]} size={[1.45, 0.1, 0.34]} color="#c5b38b" />
  </group>;
}

export const CafeVenue: React.FC<{ lite: boolean; tableTop: number }> = ({ lite, tableTop }) => {
  const wood = useMemo(() => getPlankTexture('#6c4b30', '#332417'), []);
  const sign = useMemo(() => getSignTexture('CÀ PHÊ KỲ ĐẠO', '#183e36', '#e8ce95', 'CHẬM MỘT NHỊP · SÂU MỘT NƯỚC'), []);
  const menu = useMemo(() => getSignTexture('CÀ PHÊ PHIN', '#192c29', '#d7cbb1', 'ĐEN ĐÁ   ·   SỮA ĐÁ   ·   TRÀ SEN'), []);
  return <group>
    <color attach="background" args={['#1c2b2c']} />
    <fog attach="fog" args={['#263b3a', 7, 18]} />
    <hemisphereLight args={['#f9e6c9', '#343c34', 1.1]} />
    <directionalLight position={[2, 4, 3]} color="#ffe0af" intensity={2.1} castShadow={!lite}
      shadow-mapSize-width={1024} shadow-mapSize-height={1024}
      shadow-camera-left={-1.2} shadow-camera-right={1.2} shadow-camera-top={1.2} shadow-camera-bottom={-1.2}
      shadow-camera-near={0.5} shadow-camera-far={8} shadow-bias={-0.0004} shadow-normalBias={0.012} />
    <directionalLight position={[-4, 3, -3]} color="#adcbd4" intensity={0.8} />
    <StaticRoom key={`${lite}:${tableTop}`}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[8, 10]} />
      <meshStandardMaterial map={getFloorTexture()} roughness={0.86} />
    </mesh>
    {/* A distant painted courtyard behind actual window openings. */}
    <mesh position={[0, 1.6, -3.25]}><planeGeometry args={[8, 3.3]} /><meshBasicMaterial map={getCourtyardTexture()} /></mesh>
    <Block at={[0, 0.16, -2.75]} size={[7, 0.32, 0.2]} color="#234239" />
    <Block at={[0, 2.98, -2.75]} size={[7, 0.72, 0.2]} color="#d3c3a1" />
    {[-3.3, -1.25, 1.25, 3.3].map((x) => <group key={x}>
      <Block at={[x, 1.5, -2.7]} size={[0.35, 3, 0.3]} color="#d6c7a7" />
      <Block at={[x, 0.22, -2.65]} size={[0.43, 0.44, 0.4]} color="#9c8e70" />
      <Block at={[x, 2.65, -2.65]} size={[0.48, 0.1, 0.38]} color="#e2d3b1" />
    </group>)}
    <ArchedWindow x={-2.25} /><ArchedWindow x={2.25} />
    {/* Central green alcove and coffee bar. */}
    <Block at={[0, 1.55, -2.72]} size={[2.15, 2.8, 0.18]} color="#284f43" />
    <mesh position={[0, 2.15, -2.60]}><planeGeometry args={[1.85, 0.52]} /><meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.12} roughness={0.8} /></mesh>
    <Block at={[0, 0.48, -2.05]} size={[2.05, 0.96, 0.57]} color="#2d3e32" />
    {Array.from({length: lite ? 10 : 20}, (_, i) => <Block key={i} at={[-0.95 + i * (lite ? 0.21 : 0.1), 0.5, -1.75]} size={[0.025, 0.78, 0.025]} color="#957a47" />)}
    <Block at={[0, 0.98, -2.05]} size={[2.18, 0.06, 0.66]} color="#594230" map={wood} />
    {[1.33, 1.64].map((y) => <group key={y}>
      <Block at={[-0.48, y, -2.47]} size={[0.92, 0.035, 0.21]} color="#80613d" />
      {[-0.8, -0.58, -0.36, -0.14].map((x) => <Cylinder key={x} at={[x, y + 0.055, -2.46]} radius={0.035} height={0.075} color="#e1d6b8" />)}
    </group>)}
    <mesh position={[0.58, 1.55, -2.55]}><planeGeometry args={[0.72, 0.7]} /><meshStandardMaterial map={menu} roughness={1} /></mesh>
    <Block at={[-0.52, 1.16, -1.98]} size={[0.49, 0.3, 0.28]} color="#b7b1a1" metal={0.65} />
    <Block at={[-0.52, 1.14, -1.82]} size={[0.4, 0.16, 0.035]} color="#28332e" />
    <Cylinder at={[0.47, 1.13, -2.05]} radius={0.075} height={0.24} color="#6c5034" />
    {[-1, 1].map((side) => <group key={side}>
      <Block at={[side * 3.5, 1.5, 0.8]} size={[0.18, 3.1, 7]} color="#c1b18e" />
      <Block at={[side * 3.39, 0.58, 0.8]} size={[0.08, 1.16, 7]} color="#24473d" />
      <Block at={[side * 3.33, 1.18, 0.8]} size={[0.08, 0.05, 7]} color="#b59c6d" metal={0.35} />
      <Plant at={[side * 1.35, 0, -2.15]} scale={1.2} />
    </group>)}
    <Block at={[0, 3.24, 0]} size={[7, 0.16, 8]} color="#b8a483" />
    {[-2.5, -0.8, 0.9, 2.6].map((z) => <Block key={z} at={[0, 3.1, z]} size={[7, 0.15, 0.12]} color="#514330" />)}
    <Pendant at={[-0.78, 2.45, -1]} lite={lite} /><Pendant at={[0.78, 2.45, -1]} lite={lite} />
    {!lite && <Pendant at={[0, 2.6, 1.4]} lite={false} />}
    {/* The real tabletop stays exactly under the existing board's world coordinates. */}
    <Block at={[0, tableTop - 0.025, 0]} size={[1.06, 0.05, 0.93]} color="#96704a" map={wood} cast />
    <Block at={[0, tableTop - 0.065, 0]} size={[0.96, 0.045, 0.83]} color="#3e3024" />
    {[-1,1].map((x) => [-1,1].map((z) => <Block key={`${x}${z}`} at={[x * 0.44, tableTop / 2 - 0.04, z * 0.38]} size={[0.055, tableTop - 0.08, 0.055]} color="#3d3024" />))}
    <ContactShadow at={[0, 0.004, 0]} size={[1.5, 1.3]} opacity={0.45} />
    <Chair at={[0, 0, -0.76]} />
    <Chair at={[0, 0, 0.83]} rotation={Math.PI} />
    <group position={[-0.39, tableTop + 0.007, -0.24]}>
      <ContactShadow at={[0, 0.001, 0]} size={[0.15, 0.13]} opacity={0.3} />
      <Cylinder at={[0, 0.006, 0]} radius={0.056} height={0.009} color="#dbd6c3" />
      <Cylinder at={[0, 0.035, 0]} radius={0.033} height={0.05} color="#e7dfc9" />
      <Cylinder at={[0, 0.064, 0]} radius={0.04} height={0.009} color="#b5bab6" metal={0.7} />
      <Cylinder at={[0, 0.091, 0]} radius={0.032} height={0.045} color="#9da9a5" metal={0.75} />
      <Cylinder at={[0, 0.117, 0]} radius={0.037} height={0.009} color="#c3c8bb" metal={0.75} />
      <Cylinder at={[0, 0.128, 0]} radius={0.009} height={0.014} color="#4e4d40" />
    </group>
    <Block at={[0.39, tableTop + 0.007, 0.19]} size={[0.12, 0.009, 0.14]} color="#b7a27a" />
    <Cylinder at={[0.39, tableTop + 0.04, 0.19]} radius={0.031} height={0.06} color="#506c58" />
    {!lite && <>
      <group position={[-1.8, 0, -0.55]}>
        <Cylinder at={[0, 0.68, 0]} radius={0.3} height={0.04} color="#765635" />
        <Cylinder at={[0, 0.34, 0]} radius={0.04} height={0.65} color="#2b342c" metal={0.4} />
        <ContactShadow at={[0, 0.004, 0]} size={[0.9, 0.9]} />
        <Chair at={[0, 0, -0.49]} /><Chair at={[0.48, 0, 0.12]} rotation={-Math.PI / 2} />
      </group>
      <Plant at={[2.65, 0, 0.8]} scale={1.3} />
    </>}
    </StaticRoom>
  </group>;
};
