/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Victory Celebration Component (Hiệu ứng chúc mừng chiến thắng bàn cờ)
 * Bắn pháo hoa rực rỡ nhiều đợt, mưa hoa đăng ngũ sắc, dải ruy băng hoàng gia
 * mừng kỳ thủ đại thắng, mang không khí hội cờ dân gian tưng bừng.
 */

import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, Flame } from 'lucide-react';
import { PlayerColor } from '../types';

export interface VictoryCelebrationProps {
  winner: PlayerColor | 'draw';
  onDismiss?: () => void;
  isInspecting?: boolean;
}

interface FireworkRocket {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  trail: { x: number; y: number; alpha: number }[];
  exploded: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
}

export const VictoryCelebration: React.FC<VictoryCelebrationProps> = ({
  winner,
  onDismiss,
  isInspecting = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [burstCount, setBurstCount] = useState<number>(0);
  const isRedWin = winner === 'red';
  const isDraw = winner === 'draw';

  // Trigger grand confetti bursts in sequence
  const launchConfettiWave = () => {
    const festiveColors = ['#f59e0b', '#ef4444', '#10b981', '#fbbf24', '#ffffff', '#ec4899'];

    // Left cannon
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 65,
      origin: { x: 0.05, y: 0.8 },
      colors: festiveColors,
      zIndex: 9999,
    });

    // Right cannon
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 65,
      origin: { x: 0.95, y: 0.8 },
      colors: festiveColors,
      zIndex: 9999,
    });

    // Center starburst
    setTimeout(() => {
      confetti({
        particleCount: 75,
        spread: 100,
        origin: { x: 0.5, y: 0.45 },
        colors: festiveColors,
        scalar: 1.15,
        shapes: ['circle', 'square'],
        zIndex: 9999,
      });
    }, 280);
  };

  // Launch initial confetti waves
  useEffect(() => {
    launchConfettiWave();
    const t1 = setTimeout(launchConfettiWave, 1400);
    const t2 = setTimeout(launchConfettiWave, 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [winner]);

  // Canvas-based sparkling fireworks rocket animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const palette = ['#fbbf24', '#ef4444', '#f59e0b', '#10b981', '#38bdf8', '#f43f5e', '#ffffff'];

    const rockets: FireworkRocket[] = [];
    const sparks: Spark[] = [];

    const spawnRocket = () => {
      const x = width * 0.15 + Math.random() * (width * 0.7);
      const targetY = height * 0.15 + Math.random() * (height * 0.35);
      const color = palette[Math.floor(Math.random() * palette.length)];
      rockets.push({
        x,
        y: height,
        targetY,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(8.5 + Math.random() * 4),
        color,
        trail: [],
        exploded: false,
      });
    };

    const explodeRocket = (r: FireworkRocket) => {
      const sparkCount = 36 + Math.floor(Math.random() * 24);
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 5.5;
        sparks.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: r.color,
          alpha: 1.0,
          decay: 0.015 + Math.random() * 0.018,
          size: 1.8 + Math.random() * 2.2,
        });
      }
    };

    // Initial rockets
    spawnRocket();
    setTimeout(spawnRocket, 400);
    setTimeout(spawnRocket, 900);

    let spawnTimer = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      spawnTimer++;
      if (spawnTimer % 65 === 0 && rockets.length < 4) {
        spawnRocket();
      }

      // Update rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.trail.push({ x: r.x, y: r.y, alpha: 0.8 });
        if (r.trail.length > 8) r.trail.shift();

        r.x += r.vx;
        r.y += r.vy;

        // Draw trail
        for (const t of r.trail) {
          t.alpha *= 0.85;
          ctx.save();
          ctx.fillStyle = r.color;
          ctx.globalAlpha = t.alpha;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Rocket head
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Explode condition
        if (r.y <= r.targetY || r.vy >= 0) {
          explodeRocket(r);
          rockets.splice(i, 1);
        }
      }

      // Update sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.96;
        s.vy = s.vy * 0.96 + 0.12; // Gravity
        s.alpha -= s.decay;

        if (s.alpha <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * s.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleManualBurst = () => {
    launchConfettiWave();
    setBurstCount((c) => c + 1);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-45 overflow-hidden">
      {/* Background fireworks canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Triumphant Floating Banner at top when inspecting board */}
      {isInspecting && (
        <div className="pointer-events-auto absolute top-14 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-500 max-w-[92vw]">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-950/90 border-2 border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.6)] backdrop-blur-md">
            <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
            <span className="font-thu-phap text-lg sm:text-xl text-amber-300 tracking-wider">
              {isDraw ? 'HÒA CỜ THỎA HIỆP' : isRedWin ? 'BÊN ĐỎ ĐẠI THẮNG!' : 'BÊN ĐEN ĐẠI THẮNG!'}
            </span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualBurst}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-stone-950 font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="Bắn thêm pháo hoa ăn mừng"
            >
              <Flame className="w-3.5 h-3.5 text-stone-950" />
              <span>Bắn Pháo Hoa 🎉 {burstCount > 0 ? `(${burstCount})` : ''}</span>
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-2.5 py-1 rounded-full bg-stone-900/90 hover:bg-stone-800 text-stone-300 border border-white/20 text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                Ẩn bớt
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
