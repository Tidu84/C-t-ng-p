/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ChessCharacters3D: Mô hình 3D hai đối thủ ngồi chơi cờ đối diện nhau bên bàn cờ
 * - Bên Đen (Đối thủ AI / Lão kỳ thủ): Ngồi phía Bắc (-Z), đội mũ kỳ thủ, ngẫm nghĩ nước cờ
 * - Bên Đỏ (Kỳ thủ bên Đỏ): Ngồi phía Nam (+Z), đối diện bên Đen
 * - Bàn cờ gỗ, ghế ngồi (ghế nhựa quán trà đá hoặc ghế gỗ quán cà phê) & ly nước
 */

import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { BackgroundScene3D, PlayerColor } from '../../types';

interface ChessPlayerProps {
  color: PlayerColor;
  tableTop: number;
  isThinking: boolean;
  bgScene: BackgroundScene3D;
  visible?: boolean;
}

export const ChessPlayerFigure: React.FC<ChessPlayerProps> = ({
  color,
  tableTop,
  isThinking,
  bgScene,
  visible = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const chestRef = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  const isBlack = color === 'black';
  const zSign = isBlack ? -1 : 1;
  const zPos = zSign * 0.48;
  const rotY = isBlack ? 0 : Math.PI;

  // Chiều cao ghế ngồi tương thích với từng không gian quán
  const stoolH = Math.max(0.24, tableTop * 0.58);

  // Animation thở nhẹ và cử động suy nghĩ sống động
  useFrame(({ clock }) => {
    if (!visible) return;
    const t = clock.elapsedTime;
    const phaseOffset = isBlack ? 0 : Math.PI * 0.6;

    // Nhịp thở ngực nhẹ
    if (chestRef.current) {
      const breath = Math.sin(t * 1.5 + phaseOffset) * 0.003;
      chestRef.current.position.y = stoolH + 0.28 + breath;
    }

    // Cử động đầu ngẫm nghĩ nước cờ khi đến lượt
    if (headRef.current) {
      if (isThinking) {
        // Hơi cúi đầu chăm chú nhìn thế cờ trên bàn
        const thinkTilt = 0.16 + Math.sin(t * 1.2 + phaseOffset) * 0.03;
        headRef.current.rotation.x = thinkTilt;
        headRef.current.rotation.y = Math.sin(t * 0.7 + phaseOffset) * 0.04;
      } else {
        // Tư thế ngồi ung dung quan sát
        headRef.current.rotation.x = 0.08 + Math.sin(t * 0.8 + phaseOffset) * 0.02;
        headRef.current.rotation.y = Math.sin(t * 0.4 + phaseOffset) * 0.02;
      }
    }
    invalidate();
  });

  if (!visible) return null;

  // Màu trang phục mang nét đặc trưng kỳ thủ cờ tướng Việt Nam
  const shirtColor = isBlack ? '#1e3a5f' : '#8c2d25'; // Đen: áo xanh than / cựu chiến binh, Đỏ: áo đỏ gạch
  const collarColor = isBlack ? '#162b46' : '#6b2019';
  const pantsColor = isBlack ? '#242a30' : '#2b2927';
  const skinColor = '#dca67a';
  const shoeColor = '#1a1816';

  // Ghế ngồi theo bối cảnh
  const stoolColor = bgScene === 'tra_da'
    ? (isBlack ? '#1e6091' : '#b71c1c') // Ghế nhựa xanh / đỏ vỉa hè
    : bgScene === 'ca_phe'
    ? '#4a2c17'
    : bgScene === 'hoa_vien'
    ? '#78716c'
    : '#262626';

  return (
    <group ref={groupRef} position={[0, 0, zPos]} rotation={[0, rotY, 0]}>
      {/* 1. Ghế ngồi (Stool / Chair) */}
      <group position={[0, 0, 0]}>
        {/* Mặt ghế */}
        <mesh position={[0, stoolH - 0.015, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.14, 0.145, 0.03, 24]} />
          <meshStandardMaterial color={stoolColor} roughness={0.4} />
        </mesh>
        {/* 4 Chân ghế choãi vững chãi */}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh
              key={`leg_${sx}_${sz}`}
              position={[sx * 0.09, stoolH / 2, sz * 0.09]}
              rotation={[sz * -0.05, 0, sx * 0.05]}
              castShadow
            >
              <cylinderGeometry args={[0.013, 0.016, stoolH, 12]} />
              <meshStandardMaterial color={stoolColor} roughness={0.5} />
            </mesh>
          ))
        )}
      </group>

      {/* 2. Phần chân và hông */}
      {/* Hông / Xương chậu */}
      <mesh position={[0, stoolH + 0.06, 0.02]} castShadow>
        <boxGeometry args={[0.26, 0.11, 0.22]} />
        <meshStandardMaterial color={pantsColor} roughness={0.8} />
      </mesh>

      {/* Đùi vươn về phía bàn cờ */}
      {[-0.08, 0.08].map((x) => (
        <group key={`leg_${x}`}>
          {/* Đùi */}
          <mesh position={[x, stoolH + 0.04, 0.13]} rotation={[0.22, 0, 0]} castShadow>
            <boxGeometry args={[0.09, 0.09, 0.22]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          {/* Đầu gối */}
          <mesh position={[x, stoolH + 0.02, 0.24]} castShadow>
            <sphereGeometry args={[0.05, 12, 10]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          {/* Cẳng chân buông xuống sàn */}
          <mesh position={[x, stoolH * 0.45, 0.24]} rotation={[-0.08, 0, 0]} castShadow>
            <boxGeometry args={[0.08, stoolH * 0.85, 0.08]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          {/* Giày / Dép trên sàn */}
          <mesh position={[x, 0.02, 0.27]} castShadow receiveShadow>
            <boxGeometry args={[0.085, 0.04, 0.15]} />
            <meshStandardMaterial color={shoeColor} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* 3. Thân người (Torso) */}
      <group ref={chestRef} position={[0, stoolH + 0.28, 0]}>
        {/* Bụng / Eo */}
        <mesh position={[0, -0.12, 0]} castShadow>
          <boxGeometry args={[0.24, 0.14, 0.17]} />
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </mesh>
        {/* Lồng ngực & Vai */}
        <mesh position={[0, 0, 0]} rotation={[0.06, 0, 0]} castShadow>
          <boxGeometry args={[0.29, 0.22, 0.19]} />
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </mesh>
        {/* Cổ áo */}
        <mesh position={[0, 0.12, 0.04]} rotation={[0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.13, 0.04, 0.12]} />
          <meshStandardMaterial color={collarColor} roughness={0.6} />
        </mesh>

        {/* 4. Cổ và Đầu */}
        <group ref={headRef} position={[0, 0.16, 0.02]}>
          {/* Cổ */}
          <mesh position={[0, 0.03, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.05, 0.07, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>
          {/* Khuôn mặt / Đầu */}
          <mesh position={[0, 0.11, 0.01]} castShadow>
            <sphereGeometry args={[0.09, 20, 18]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>

          {/* Mũ / Tóc kỳ thủ */}
          {isBlack ? (
            /* Lão kỳ thủ bên Đen đội mũ lưỡi trai cờ thủ */
            <group position={[0, 0.16, 0]}>
              {/* Thân mũ */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.094, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                <meshStandardMaterial color="#2d3748" roughness={0.8} />
              </mesh>
              {/* Lưỡi trai vươn về phía trước ngắm bàn cờ */}
              <mesh position={[0, -0.01, 0.09]} rotation={[-0.15, 0, 0]} castShadow>
                <boxGeometry args={[0.12, 0.012, 0.08]} />
                <meshStandardMaterial color="#1a202c" roughness={0.7} />
              </mesh>
            </group>
          ) : (
            /* Kỳ thủ bên Đỏ với mái tóc rẽ ngôi gọn gàng */
            <group position={[0, 0.16, -0.01]}>
              <mesh castShadow>
                <sphereGeometry args={[0.093, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                <meshStandardMaterial color="#1a1410" roughness={0.9} />
              </mesh>
            </group>
          )}
        </group>

        {/* 5. Hai cánh tay & Bàn tay */}
        {/* Tay trái: Tì nhẹ cẳng tay lên mép bàn cờ */}
        <group position={[-0.17, 0.06, 0.02]}>
          {/* Bắp tay */}
          <mesh position={[-0.02, -0.10, 0.06]} rotation={[0.45, 0.1, -0.18]} castShadow>
            <cylinderGeometry args={[0.038, 0.042, 0.19, 12]} />
            <meshStandardMaterial color={shirtColor} roughness={0.7} />
          </mesh>
          {/* Cẳng tay tì lên mép bàn */}
          <mesh position={[-0.01, -0.19, 0.17]} rotation={[1.1, 0.25, -0.2]} castShadow>
            <cylinderGeometry args={[0.032, 0.035, 0.18, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
          {/* Bàn tay trên bàn */}
          <mesh position={[-0.01, -0.22, 0.27]} castShadow>
            <boxGeometry args={[0.06, 0.028, 0.07]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
        </group>

        {/* Tay phải: Dáng chống cằm ngẫm cờ kinh điển của các danh thủ */}
        <group position={[0.17, 0.06, 0.02]}>
          {/* Bắp tay */}
          <mesh position={[0.02, -0.08, 0.08]} rotation={[0.65, -0.15, 0.25]} castShadow>
            <cylinderGeometry args={[0.038, 0.042, 0.18, 12]} />
            <meshStandardMaterial color={shirtColor} roughness={0.7} />
          </mesh>
          {/* Cẳng tay gập lên cằm */}
          <mesh position={[-0.04, 0.01, 0.15]} rotation={[-0.75, 0.35, -0.85]} castShadow>
            <cylinderGeometry args={[0.032, 0.035, 0.17, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
          {/* Bàn tay chống cằm */}
          <mesh position={[-0.07, 0.09, 0.11]} castShadow>
            <sphereGeometry args={[0.032, 12, 10]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

/** Bàn cờ gỗ lớn, chân bàn vững chãi và sàn nhà/vỉa hè bên dưới */
export const ChessTableAndEnvironment3D: React.FC<{
  tableTop: number;
  bgScene: BackgroundScene3D;
  isLiteMode?: boolean;
}> = ({ tableTop, bgScene, isLiteMode = false }) => {
  const tableW = 0.68;
  const tableD = 0.76;
  const tableThick = 0.035;

  // Màu bàn và sàn theo không gian
  const tableColor = bgScene === 'tra_da'
    ? '#5c381e'
    : bgScene === 'ca_phe'
    ? '#3e2415'
    : bgScene === 'hoa_vien'
    ? '#6b6359'
    : '#2b1b13';

  const floorColor = bgScene === 'tra_da'
    ? '#443f3b'
    : bgScene === 'ca_phe'
    ? '#2d1c12'
    : bgScene === 'hoa_vien'
    ? '#3a4731'
    : '#171419';

  return (
    <group>
      {/* 1. Mặt bàn lớn đỡ trọn khay cờ và có chỗ tựa tay của hai kỳ thủ */}
      <mesh position={[0, tableTop - tableThick / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[tableW, tableThick, tableD]} />
        <meshStandardMaterial color={tableColor} roughness={0.6} />
      </mesh>

      {/* 2. 4 Chân bàn chịu lực nối xuống mặt sàn y = 0 */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`tbl_leg_${sx}_${sz}`}
            position={[sx * (tableW / 2 - 0.04), (tableTop - tableThick) / 2, sz * (tableD / 2 - 0.04)]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.045, tableTop - tableThick, 0.045]} />
            <meshStandardMaterial color="#2c1a0f" roughness={0.7} />
          </mesh>
        ))
      )}

      {/* 3. Ly nước trà đá / cà phê trên mặt bàn cạnh kỳ thủ */}
      {/* Cốc trà bên Đen */}
      <group position={[-0.24, tableTop, -0.22]}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.026, 0.10, 16]} />
          <meshStandardMaterial color="#d8edf2" roughness={0.1} transparent opacity={0.45} />
        </mesh>
        {/* Nước trà vàng óng ánh bên trong */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.03, 0.024, 0.075, 16]} />
          <meshStandardMaterial color="#eab308" roughness={0.3} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* Cốc trà bên Đỏ */}
      <group position={[0.24, tableTop, 0.22]}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.026, 0.10, 16]} />
          <meshStandardMaterial color="#d8edf2" roughness={0.1} transparent opacity={0.45} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.03, 0.024, 0.075, 16]} />
          <meshStandardMaterial color="#eab308" roughness={0.3} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* 4. Sàn nhà / Vỉa hè hứng bóng đổ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <circleGeometry args={[2.8, 36]} />
        <meshStandardMaterial color={floorColor} roughness={0.95} />
      </mesh>
    </group>
  );
};
