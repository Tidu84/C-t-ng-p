/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AnimatedCheckmateScene: Tranh Thủy Mặc Động Sát Cuộc Cổ Phong
 * Biến các bức tranh thủy mặc chiến thắng tĩnh thành cảnh động hào hùng sống động:
 * - Cưỡi xe áp sát (Bánh xe quay tít, 3 chiến mã phi nước đại, bụi tung mù mịt, cờ bay phấp phới)
 * - Cưỡi chiến mã xung trận (Vó ngựa tung hoành, mũi giáo lóe sáng, vệt gió xé gió)
 * - Tốt ám sát tướng (Thích khách lướt trong sương mực, đường kiếm chí mạng chém xé không gian)
 * - Tượng bị tròng xích chịu trói (Xích sắt siết chặt rung lắc, bão tố sấm sét chớp nháy, phong ấn phát sáng)
 * - Thần pháo nã đạn (Pháo giật khói lửa bùng nổ, đạn pháo xé trời, tàn lửa bay lượn)
 * - Đột tử quân vương (Sấm chớp giáng thế, vương miện rơi rụng, kiếm gãy khói sương)
 */

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Play, Pause } from 'lucide-react';
import { CheckmatePattern } from '../utils/checkmatePatterns';
import { PlayerColor } from '../types';

interface AnimatedCheckmateSceneProps {
  pattern: CheckmatePattern;
  winner: PlayerColor | 'draw';
  className?: string;
}

type SceneCategory = 'chariot' | 'horse' | 'soldier' | 'trapped' | 'cannon' | 'king';

function getSceneCategory(patternId: string): SceneCategory {
  if (patternId === 'bo_tay_chiu_troi') return 'trapped';
  if (patternId === 'thich_khach_da_hanh' || patternId === 'thiet_tot_doat_hon') return 'soldier';
  if (patternId === 'ma_ngoa_tao' || patternId === 'ma_hau_phao') return 'horse';
  if (patternId === 'trung_phao' || patternId === 'phao_long') return 'cannon';
  if (
    patternId === 'nhat_xa_sat_van_tu' ||
    patternId === 'song_xa_doat_menh' ||
    patternId === 'thiet_mon_thuyen'
  ) {
    return 'chariot';
  }
  return 'king';
}

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  rotation: number;
  rotSpeed: number;
}

interface SpeedLine {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

export const AnimatedCheckmateScene: React.FC<AnimatedCheckmateSceneProps> = ({
  pattern,
  winner,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const baseImgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const sceneCat = getSceneCategory(pattern.id);

  // Tải hình ảnh nền thủy mặc chất lượng cao
  useEffect(() => {
    const img = new Image();
    img.src = pattern.image;
    img.onload = () => {
      baseImgRef.current = img;
      setImgLoaded(true);
    };
    img.onerror = () => {
      setImgLoaded(true); // Vẫn chạy canvas procedural nếu ảnh lỗi
    };
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [pattern.image]);

  // Vòng lặp hoạt họa Canvas tốc độ 60fps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 460);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 200);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Hệ thống hạt bụi bốc lên từ vó ngựa / bánh xe
    const dustParticles: DustParticle[] = [];
    const speedLines: SpeedLine[] = [];
    const embers: EmberParticle[] = [];

    // Khởi tạo các vệt gió xé không gian quanh nhân vật
    for (let i = 0; i < 16; i++) {
      speedLines.push({
        x: Math.random() * width,
        y: sceneCat === 'chariot' || sceneCat === 'horse'
          ? height * 0.38 + Math.random() * height * 0.36
          : Math.random() * height,
        length: 30 + Math.random() * 80,
        speed: 8 + Math.random() * 14,
        alpha: 0.15 + Math.random() * 0.35,
      });
    }

    let startTime = performance.now();
    let cannonLastShot = 0;
    let lightningFlash = 0;
    let slashTimer = 0;

    const render = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      // 1. VẼ NỀN TRANH THỦY MẶC CỐ ĐỊNH 100%
      // Yêu cầu: Phong cảnh (núi non, mây trời, thư pháp, cây cối) giữ nguyên tĩnh lặng tuyệt đối, không rung lắc hay zoom trôi
      if (baseImgRef.current && baseImgRef.current.complete) {
        ctx.drawImage(baseImgRef.current, 0, 0, width, height);
      } else {
        // Nền giấy xuyến chỉ cổ phong
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#1c1917');
        grad.addColorStop(0.5, '#26221d');
        grad.addColorStop(1, '#141210');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. HOẠT HỌA THEO TỪNG CỤC SÁT PHÁP ĐẶC TRƯNG: CHỈ NHÂN VẬT (XE & NGỰA) CHUYỂN ĐỘNG

      // === CẢNH 1: CƯỠI XE ÁP SÁT (Chariot & 3 Chiến mã) ===
      if (sceneCat === 'chariot') {
        // A. BÁNH XE CHIẾN XA: Tọa độ chuẩn xác 100% khớp với bánh xe trong tranh thủy mặc
        // Center: x=0.6555, y=0.5417 | Bán kính elip phối cảnh 3/4: rx=0.0632, ry=0.1367
        const wheelCenterX = width * 0.6555;
        const wheelCenterY = height * 0.5417;
        const rx = width * 0.0632;
        const ry = height * 0.1367;
        const wheelRot = elapsed * 24; // Tốc độ quay nhanh dồn dập

        ctx.save();
        ctx.translate(wheelCenterX, wheelCenterY);
        // Co elip phối cảnh theo chiều rộng/cao của bánh xe
        ctx.scale(rx / ry, 1);
        ctx.rotate(wheelRot);

        // Nan hoa bánh xe gỗ quay tít (8 nan hoa xoay quanh trục)
        ctx.strokeStyle = 'rgba(28, 22, 18, 0.45)';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(-Math.cos(a) * (ry - 4), -Math.sin(a) * (ry - 4));
          ctx.lineTo(Math.cos(a) * (ry - 4), Math.sin(a) * (ry - 4));
          ctx.stroke();
        }

        // Vệt mờ chuyển động bánh xe lăn (Motion Blur)
        ctx.beginPath();
        ctx.arc(0, 0, ry - 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200, 160, 110, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ổ trục trung tâm bánh xe
        ctx.beginPath();
        ctx.arc(0, 0, ry * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(30, 24, 20, 0.6)';
        ctx.fill();
        ctx.restore();

        // B. LÁ CỜ ĐỎ TRÊN CHIẾN XA: Tọa độ chuẩn xác gắn trên cọc cờ của chiến xa
        // Cọc cờ tại x=0.7064, ngọn cờ y=0.280, đáy cờ y=0.430
        const poleX = width * 0.7064;
        const flagTopY = height * 0.285;
        const flagBottomY = height * 0.425;
        const flagLength = width * 0.062;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(poleX, flagTopY);

        // Mép trên lá cờ bay uốn lượn theo sóng gió
        const steps = 6;
        for (let i = 1; i <= steps; i++) {
          const fx = poleX + (flagLength * i) / steps;
          const wave = Math.sin(elapsed * 18 + i * 0.8) * (height * 0.016 * (i / steps));
          const fy = flagTopY + (flagBottomY - flagTopY) * 0.35 * (i / steps) + wave;
          ctx.lineTo(fx, fy);
        }

        // Đuôi ngọn cờ phất phới trong gió
        const tailX = poleX + flagLength + Math.sin(elapsed * 20) * (width * 0.008);
        const tailY = (flagTopY + flagBottomY) / 2 + Math.cos(elapsed * 18) * (height * 0.018);
        ctx.lineTo(tailX, tailY);

        // Mép dưới lá cờ uốn sóng quay về chân cọc
        for (let i = steps - 1; i >= 0; i--) {
          const fx = poleX + (flagLength * i) / steps;
          const wave = Math.sin(elapsed * 18 + i * 0.8 + 0.5) * (height * 0.014 * (i / steps));
          const fy = flagBottomY - (flagBottomY - flagTopY) * 0.15 * (i / steps) + wave;
          ctx.lineTo(fx, fy);
        }

        ctx.closePath();
        // Màu cờ đỏ son mực nước truyền thống
        const flagGrad = ctx.createLinearGradient(poleX, flagTopY, poleX + flagLength, flagBottomY);
        flagGrad.addColorStop(0, 'rgba(185, 28, 28, 0.82)');
        flagGrad.addColorStop(0.7, 'rgba(220, 38, 38, 0.75)');
        flagGrad.addColorStop(1, 'rgba(153, 27, 27, 0.65)');
        ctx.fillStyle = flagGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // C. VÓ NGỰA VÀ CHIẾN XA: Bụi đất sỏi đá cuộn trào dồn dập
        // Bụi từ móng 3 con ngựa đang phi nước đại (x: 0.22 đến 0.52, y: 0.70 đến 0.76)
        if (Math.random() < 0.65) {
          dustParticles.push({
            x: width * (0.22 + Math.random() * 0.30),
            y: height * (0.71 + Math.random() * 0.05),
            vx: -1.8 - Math.random() * 3.2, // Bụi bay ngược về phía sau chiến mã
            vy: -0.4 - Math.random() * 1.2,
            size: 6 + Math.random() * 14,
            alpha: 0.6,
            maxLife: 0.8,
            life: 0,
            rotation: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.12,
          });
        }

        // Bụi đất sỏi đá cuốn sau bánh xe chiến xa (x: 0.64 đến 0.74, y: 0.66 đến 0.74)
        if (Math.random() < 0.45) {
          dustParticles.push({
            x: width * (0.64 + Math.random() * 0.08),
            y: height * (0.66 + Math.random() * 0.06),
            vx: 1.8 + Math.random() * 2.5,
            vy: -0.3 - Math.random() * 0.8,
            size: 5 + Math.random() * 12,
            alpha: 0.55,
            maxLife: 0.7,
            life: 0,
            rotation: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.1,
          });
        }
      }

      // === CẢNH 2: CƯỠI CHIẾN MÃ XUNG TRẬN (Horse) ===
      if (sceneCat === 'horse') {
        // Vó ngựa dồn dập, đất cát và tia lửa bắn ra từ móng ngựa
        const gallopBeat = Math.sin(elapsed * 12);
        if (gallopBeat > 0.85 && Math.random() < 0.7) {
          for (let p = 0; p < 4; p++) {
            dustParticles.push({
              x: width * (0.28 + Math.random() * 0.3),
              y: height * (0.78 + Math.random() * 0.1),
              vx: 2.0 + Math.random() * 3.5,
              vy: -0.8 - Math.random() * 1.5,
              size: 10 + Math.random() * 16,
              alpha: 0.7,
              maxLife: 0.7,
              life: 0,
              rotation: Math.random() * Math.PI,
              rotSpeed: (Math.random() - 0.5) * 0.15,
            });
          }
        }

        // Mũi giáo / đao thương của kỵ sĩ lóe sáng lấp lánh
        const spearX = width * 0.42 + Math.sin(elapsed * 8) * 8;
        const spearY = height * 0.38 + Math.cos(elapsed * 8) * 4;
        const glint = (Math.sin(elapsed * 6) + 1) / 2;
        if (glint > 0.7) {
          ctx.save();
          ctx.translate(spearX, spearY);
          ctx.fillStyle = `rgba(255, 255, 255, ${(glint - 0.7) * 3.3})`;
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(254, 240, 138, ${(glint - 0.7) * 2.5})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-12, 0);
          ctx.lineTo(12, 0);
          ctx.moveTo(0, -12);
          ctx.lineTo(0, 12);
          ctx.stroke();
          ctx.restore();
        }
      }

      // === CẢNH 3: TỐT ÁM SÁT TƯỚNG (Soldier / Assassin) ===
      if (sceneCat === 'soldier') {
        slashTimer += 0.016;
        if (slashTimer > 1.8) slashTimer = 0;

        // Vệt sương khói bóng đen thích khách lướt đi
        const shadowX = width * 0.45 + Math.sin(elapsed * 2) * 20;
        const shadowGrad = ctx.createRadialGradient(shadowX, height * 0.5, 5, shadowX, height * 0.5, 70);
        shadowGrad.addColorStop(0, 'rgba(10, 8, 6, 0.6)');
        shadowGrad.addColorStop(1, 'rgba(10, 8, 6, 0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(shadowX, height * 0.5, 70, 0, Math.PI * 2);
        ctx.fill();

        // Đường kiếm ánh thép chí mạng xé toạc màn sương
        if (slashTimer < 0.45) {
          const slashProgress = slashTimer / 0.45;
          ctx.save();
          ctx.strokeStyle = `rgba(255, 255, 255, ${1 - slashProgress})`;
          ctx.lineWidth = 4 * (1 - slashProgress * 0.7);
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.moveTo(width * 0.25 + slashProgress * width * 0.35, height * 0.25 + slashProgress * height * 0.45);
          ctx.lineTo(width * 0.45 + slashProgress * width * 0.35, height * 0.4 + slashProgress * height * 0.45);
          ctx.stroke();

          // Tia chớp máu đỏ lạnh lùng
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 * (1 - slashProgress)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }

      // === CẢNH 4: TƯỢNG BỊ TRÒNG XÍCH CHỊU TRÓI (Trapped / Elephant) ===
      if (sceneCat === 'trapped') {
        // Tia chớp sấm sét giáng xuống bầu trời mực đen
        lightningFlash -= 0.02;
        if (Math.random() < 0.015 && lightningFlash <= 0) {
          lightningFlash = 0.6; // Chớp sáng đột ngột
        }

        if (lightningFlash > 0) {
          ctx.fillStyle = `rgba(240, 246, 255, ${lightningFlash * 0.45})`;
          ctx.fillRect(0, 0, width, height);

          // Tia sét phân nhánh
          ctx.strokeStyle = `rgba(255, 255, 255, ${lightningFlash})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          let lx = width * 0.35;
          let ly = 0;
          ctx.moveTo(lx, ly);
          while (ly < height * 0.75) {
            lx += (Math.random() - 0.5) * 26;
            ly += 15 + Math.random() * 20;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke();
        }

        // Xích sắt rung lắc dữ dội quanh con Tượng / Tướng
        const chainShake = Math.sin(elapsed * 24) * 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(160, 160, 165, 0.75)';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;

        // Vòng xích 1: vắt chéo từ vai xuống
        ctx.beginPath();
        for (let x = width * 0.22; x < width * 0.78; x += 16) {
          const cy = height * 0.48 + Math.sin(x * 0.05 + elapsed * 6) * 14 + chainShake;
          ctx.ellipse(x, cy, 7, 4, 0.25, 0, Math.PI * 2);
        }
        ctx.stroke();

        // Vòng xích 2: vắt ngang siết chặt
        ctx.beginPath();
        for (let x = width * 0.28; x < width * 0.72; x += 18) {
          const cy = height * 0.62 + Math.cos(x * 0.06 - elapsed * 5) * 10 - chainShake;
          ctx.ellipse(x, cy, 8, 4.5, -0.2, 0, Math.PI * 2);
        }
        ctx.stroke();

        // Chữ bùa phong ấn phát sáng "TRÓI" / Bát Quái
        const sealPulse = (Math.sin(elapsed * 4) + 1) / 2;
        ctx.fillStyle = `rgba(245, 158, 11, ${0.4 + sealPulse * 0.4})`;
        ctx.font = 'bold 16px serif';
        ctx.fillText('⚡ PHONG ẤN ⚡', width * 0.42, height * 0.58 + chainShake);
        ctx.restore();
      }

      // === CẢNH 5: THẦN PHÁO NÃ ĐẠN (Cannon) ===
      if (sceneCat === 'cannon') {
        if (elapsed - cannonLastShot > 2.0) {
          cannonLastShot = elapsed;
          // Tạo chùm tàn lửa và khói nổ
          for (let e = 0; e < 15; e++) {
            embers.push({
              x: width * 0.34,
              y: height * 0.46,
              vx: 4 + Math.random() * 8,
              vy: (Math.random() - 0.5) * 4,
              size: 2 + Math.random() * 4,
              alpha: 0.95,
              color: Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
            });
          }
        }

        // Tia lửa nổ đầu nòng pháo
        const blastTime = elapsed - cannonLastShot;
        if (blastTime < 0.2) {
          const blastScale = blastTime / 0.2;
          ctx.save();
          ctx.translate(width * 0.35, height * 0.46);
          const blastGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 36 * (1 - blastScale));
          blastGrad.addColorStop(0, '#ffffff');
          blastGrad.addColorStop(0.3, '#f59e0b');
          blastGrad.addColorStop(0.7, '#dc2626');
          blastGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = blastGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 36 * (1 - blastScale), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Đạn pháo bay xé gió
        if (blastTime < 0.9) {
          const bulletX = width * 0.36 + blastTime * width * 0.65;
          const bulletY = height * 0.46 + blastTime * height * 0.08;
          ctx.save();
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.arc(bulletX, bulletY, 7, 0, Math.PI * 2);
          ctx.fill();

          // Đuôi lửa đạn pháo
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bulletX - 25, bulletY);
          ctx.lineTo(bulletX, bulletY);
          ctx.stroke();
          ctx.restore();
        }
      }

      // === CẢNH 6: ĐỘT TỬ QUÂN VƯƠNG (King) ===
      if (sceneCat === 'king') {
        // Lá phong / cánh hoa mực bay lượn trong gió sầu
        if (Math.random() < 0.15) {
          dustParticles.push({
            x: Math.random() * width,
            y: -10,
            vx: 1 + Math.random() * 2,
            vy: 1.5 + Math.random() * 2,
            size: 4 + Math.random() * 6,
            alpha: 0.7,
            maxLife: 2.2,
            life: 0,
            rotation: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.08,
          });
        }
      }

      // 3. CẬP NHẬT & VẼ CÁC VỆT GIÓ XÉ KHÔNG GIAN (Speed Lines quanh chiến mã và chiến xa)
      ctx.save();
      for (const line of speedLines) {
        line.x += line.speed;
        if (line.x > width + 100) {
          line.x = -line.length - Math.random() * 50;
          // Chỉ xuất hiện ngang tầm thân chiến mã và chiến xa (không che núi non, mây trời trên cao)
          line.y = sceneCat === 'chariot' || sceneCat === 'horse'
            ? height * 0.38 + Math.random() * height * 0.36
            : Math.random() * height;
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${line.alpha * 0.35})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x - line.length, line.y);
        ctx.stroke();
      }
      ctx.restore();

      // 4. CẬP NHẬT & VẼ CÁC HẠT BỤI MÙ MỊT (Dust & Smoke)
      for (let i = dustParticles.length - 1; i >= 0; i--) {
        const p = dustParticles[i];
        p.life += 0.016;
        p.x += p.vx;
        p.y += p.vy;
        p.size += 0.35;
        p.rotation += p.rotSpeed;
        const fade = 1 - p.life / p.maxLife;

        if (fade <= 0) {
          dustParticles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        grad.addColorStop(0, `rgba(180, 160, 140, ${p.alpha * fade * 0.45})`);
        grad.addColorStop(0.7, `rgba(100, 90, 80, ${p.alpha * fade * 0.25})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. CẬP NHẬT & VẼ TÀN LỬA / TIA LỬA (Embers)
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.x += e.vx;
        e.y += e.vy;
        e.vy += 0.08; // Trọng lực
        e.alpha -= 0.025;

        if (e.alpha <= 0) {
          embers.splice(i, 1);
          continue;
        }

        ctx.fillStyle = e.color;
        ctx.globalAlpha = e.alpha;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (!isPaused) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [pattern, sceneCat, isPaused]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-44 sm:h-52 rounded-lg overflow-hidden border border-stone-800 bg-[#121110] select-none group shadow-inner ${className}`}
    >
      {/* Canvas vẽ hoạt họa động 60fps */}
      <canvas ref={canvasRef} className="w-full h-full block object-cover" />

      {/* Dấu Triện Cổ Phong "KỲ ĐẠO" với nhịp rung cổ phong */}
      <div className="absolute top-2 right-2 border-2 border-red-700 bg-red-950/85 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold font-serif tracking-widest pointer-events-none rotate-2 shadow-md animate-pulse">
        KỲ ĐẠO
      </div>

      {/* Huy hiệu Cục Sát Pháp động bên góc trái */}
      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-amber-500/40 text-[10px] font-bold text-amber-300 flex items-center gap-1 shadow">
        <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
        <span>
          {sceneCat === 'chariot' && '⚡ Chiến Xa Áp Sát'}
          {sceneCat === 'horse' && '🐎 Chiến Mã Xung Trận'}
          {sceneCat === 'soldier' && '🗡️ Tốt Ám Sát Tướng'}
          {sceneCat === 'trapped' && '⛓️ Tròng Xích Chịu Trói'}
          {sceneCat === 'cannon' && '💥 Thần Pháo Oanh Kích'}
          {sceneCat === 'king' && '👑 Long Sàng Đổi Chủ'}
        </span>
      </div>

      {/* Nút Tạm Dừng / Tiếp Tục xem động */}
      <button
        type="button"
        onClick={() => setIsPaused(!isPaused)}
        className="absolute bottom-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/90 text-stone-300 hover:text-white border border-white/20 text-xs transition-colors opacity-70 hover:opacity-100"
        title={isPaused ? 'Phát tiếp hoạt họa' : 'Tạm dừng hoạt họa'}
      >
        {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
      </button>
    </div>
  );
};
