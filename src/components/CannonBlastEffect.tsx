/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cannon Blast Particle System (Hiệu ứng bùng nổ hỏa tiễn khi Pháo ăn quân)
 * Mang lại trải nghiệm thị giác sống động, uy lực sấm sét đặc trưng của quân Pháo trong Cờ Tướng Úp.
 */

import React, { useEffect, useRef } from 'react';
import { PlayerColor, Position } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  spark: boolean;
}

interface Smoke {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  decay: number;
}

export interface CannonBlastEffectProps {
  pos: Position;
  color?: PlayerColor;
  onComplete?: () => void;
  /** Width/height of the local blast canvas container */
  size?: number;
}

export const CannonBlastEffect: React.FC<CannonBlastEffectProps> = ({
  onComplete,
  size = 180,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;

    // Generate blast particles (fiery sparks & ember chunks)
    const particleColors = [
      '#ffffff', // White-hot core
      '#fef08a', // Bright yellow
      '#facc15', // Amber gold
      '#fb923c', // Fiery orange
      '#f97316', // Deep orange
      '#ef4444', // Crimson red
    ];

    const particles: Particle[] = [];
    const particleCount = 38;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.5;
      const isSpark = Math.random() > 0.35;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: isSpark ? 1.5 + Math.random() * 2.2 : 2.5 + Math.random() * 3.5,
        alpha: 1.0,
        decay: 0.018 + Math.random() * 0.024,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        spark: isSpark,
      });
    }

    // Smoke wisps
    const smokes: Smoke[] = [];
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      smokes.push({
        x: cx + (Math.random() - 0.5) * 12,
        y: cy + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6, // Slight upward drift
        radius: 8 + Math.random() * 6,
        maxRadius: 24 + Math.random() * 14,
        alpha: 0.55,
        decay: 0.012 + Math.random() * 0.010,
      });
    }

    let progress = 0; // 0 to 1
    const totalFrames = 50;
    let frame = 0;
    let animId: number;

    const render = () => {
      frame++;
      progress = frame / totalFrames;

      ctx.clearRect(0, 0, size, size);

      // 1. Initial Muzzle Flash Burst (frames 0 to 12)
      if (progress < 0.28) {
        const flashAlpha = Math.max(0, 1 - progress / 0.28);
        const flashRadius = 14 + progress * 70;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashRadius);
        grad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha * 0.95})`);
        grad.addColorStop(0.3, `rgba(254, 240, 138, ${flashAlpha * 0.85})`);
        grad.addColorStop(0.65, `rgba(249, 115, 22, ${flashAlpha * 0.6})`);
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');

        ctx.save();
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, flashRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Expanding Shockwave Ring 1 (Gold/Amber)
      const ring1Radius = Math.min(size * 0.46, 6 + progress * (size * 0.44));
      const ring1Alpha = Math.max(0, (1 - progress) * 0.9);
      if (ring1Alpha > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(245, 158, 11, ${ring1Alpha})`;
        ctx.lineWidth = Math.max(1, (1 - progress) * 4);
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, ring1Radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Expanding Shockwave Ring 2 (Fiery Red/Orange, slightly delayed)
      if (progress > 0.08) {
        const ring2Progress = (progress - 0.08) / 0.92;
        const ring2Radius = Math.min(size * 0.42, 4 + ring2Progress * (size * 0.40));
        const ring2Alpha = Math.max(0, (1 - ring2Progress) * 0.7);
        if (ring2Alpha > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(239, 68, 68, ${ring2Alpha})`;
          ctx.lineWidth = Math.max(1, (1 - ring2Progress) * 2.5);
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(cx, cy, ring2Radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 4. Render Billowing Smoke Puffs
      for (const s of smokes) {
        s.x += s.vx;
        s.y += s.vy;
        s.radius += (s.maxRadius - s.radius) * 0.06;
        s.alpha -= s.decay;

        if (s.alpha > 0.01) {
          const sGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
          sGrad.addColorStop(0, `rgba(180, 140, 105, ${s.alpha * 0.45})`);
          sGrad.addColorStop(0.6, `rgba(120, 90, 70, ${s.alpha * 0.25})`);
          sGrad.addColorStop(1, 'rgba(60, 45, 35, 0)');

          ctx.save();
          ctx.fillStyle = sGrad;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 5. Render Flying Embers & Fire Sparks
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94; // Air drag
        p.vy = p.vy * 0.94 + 0.12; // Slight gravity
        p.alpha -= p.decay;

        if (p.alpha > 0.01) {
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.spark ? 6 : 4;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.4 + p.alpha * 0.6), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (frame < totalFrames) {
        animId = requestAnimationFrame(render);
      } else {
        onComplete?.();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [size, onComplete]);

  return (
    <div
      className="pointer-events-none absolute z-40 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none"
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
        className="w-full h-full"
      />
      {/* Floating calligraphic battle title */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap animate-in fade-in zoom-in-50 duration-300">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-stone-950 font-black text-[11px] sm:text-xs shadow-[0_2px_12px_rgba(239,68,68,0.9)] border border-amber-200 uppercase tracking-wider drop-shadow-md">
          <span>🔥</span>
          <span className="font-thu-phap text-[13px] tracking-wide text-stone-950">PHÁO KHAI HỎA!</span>
          <span>💥</span>
        </div>
      </div>
    </div>
  );
};
