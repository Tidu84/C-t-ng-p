/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

/**
 * Hàm giải động học ngược (2-bone Inverse Kinematics)
 * Tính vị trí đầu gối chuẩn xác dựa trên hông (x1, y1), bàn đạp/bàn chân (x2, y2),
 * chiều dài đùi (l1) và bắp chân (l2). Đầu gối luôn gập tự nhiên về phía trước.
 */
function solveIK(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  l1: number,
  l2: number,
  bendForward = true
): [number, number] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const d = Math.min(dist, l1 + l2 - 0.001);
  const baseAngle = Math.atan2(dy, dx);
  const cosA = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const angleA = Math.acos(cosA);
  const kneeAngle = bendForward ? baseAngle - angleA : baseAngle + angleA;
  const kx = x1 + l1 * Math.cos(kneeAngle);
  const ky = y1 + l1 * Math.sin(kneeAngle);
  return [kx, ky];
}

/**
 * Nhân vật người đi xe đạp 2D tả thực (Articulated Cyclist)
 * - Bánh xe gắn liền trục xe, căm xe quay 360 độ mượt mà, không lệch
 * - Hai chân đạp guồng quay tròn 360 độ liên tục chuẩn động học người thật
 * - Khung xe, giỏ mây, người lái, ba lô, dằn xóc nhịp nhàng
 */
export const ArticulatedCyclist: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Tốc độ đạp: ~1.25 vòng/giây
      const crankAngle = (elapsed * Math.PI * 2 * 1.25) % (Math.PI * 2);
      // Bánh xe quay nhanh hơn theo tỉ số truyền: ~2.8 vòng/giây
      const wheelAngle = (elapsed * Math.PI * 2 * 2.8) % (Math.PI * 2);
      // Dằn xóc nhẹ của mặt đường
      const bikeBob = Math.sin(elapsed * Math.PI * 4 * 1.25) * 1.5;

      // Tọa độ các trục chính
      const rwX = 56;
      const rwY = 138 + bikeBob;
      const fwX = 216;
      const fwY = 138 + bikeBob;
      const bbX = 124;
      const bbY = 138 + bikeBob;
      const seatX = 104;
      const seatY = 82 + bikeBob;
      const headX = 194;
      const headY = 74 + bikeBob;

      // Bàn đạp gần & xa (bán kính giò đĩa 15px)
      const rCrank = 15;
      const pNearX = bbX + rCrank * Math.cos(crankAngle);
      const pNearY = bbY + rCrank * Math.sin(crankAngle);
      const pFarX = bbX - rCrank * Math.cos(crankAngle);
      const pFarY = bbY - rCrank * Math.sin(crankAngle);

      // Vị trí hông trên yên
      const hipX = 102;
      const hipY = 76 + bikeBob;

      // Chiều dài đùi & bắp chân
      const lThigh = 44;
      const lCalf = 43;

      // Giải động học ngược cho 2 chân
      const [kneeFarX, kneeFarY] = solveIK(hipX, hipY, pFarX, pFarY, lThigh, lCalf, true);
      const [kneeNearX, kneeNearY] = solveIK(hipX, hipY, pNearX, pNearY, lThigh, lCalf, true);

      // --- 1. BÓNG ĐỔ MẶT ĐƯỜNG ---
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(136, 178, 92, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.fill();
      ctx.restore();

      // --- 2. CHÂN XA (vẽ sau khung xe, tối màu tạo khối 3D) ---
      ctx.save();
      // Đùi xa
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#1e293b';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeFarX, kneeFarY);
      ctx.stroke();

      // Bắp chân xa
      ctx.lineWidth = 11;
      ctx.strokeStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(kneeFarX, kneeFarY);
      ctx.lineTo(pFarX, pFarY);
      ctx.stroke();

      // Giày xa
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(pFarX + 3, pFarY + 2, 8, 4.5, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- 3. BÁNH SAU & BÁNH TRƯỚC ---
      const drawWheel = (wx: number, wy: number) => {
        ctx.save();
        // Lốp cao su đen
        ctx.beginPath();
        ctx.arc(wx, wy, 36, 0, Math.PI * 2);
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = '#1e293b';
        ctx.stroke();

        // Niềng nhôm sáng
        ctx.beginPath();
        ctx.arc(wx, wy, 33.5, 0, Math.PI * 2);
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = '#94a3b8';
        ctx.stroke();

        // Căm xe quay tròn theo wheelAngle
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.75)';
        for (let i = 0; i < 16; i++) {
          const a = wheelAngle + (i * Math.PI) / 8;
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + 33 * Math.cos(a), wy + 33 * Math.sin(a));
          ctx.stroke();
        }

        // Moay-ơ trục giữa
        ctx.beginPath();
        ctx.arc(wx, wy, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();
        ctx.restore();
      };

      drawWheel(rwX, rwY);
      drawWheel(fwX, fwY);

      // --- 4. KHUNG XE ĐẠP (Cổ điển, xanh lam đậm thanh lịch) ---
      ctx.save();
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = '#1d4ed8'; // Khung xe xanh dương thể thao
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Khung tam giác sau (Chainstay & Seatstay)
      ctx.beginPath();
      ctx.moveTo(rwX, rwY);
      ctx.lineTo(bbX, bbY);
      ctx.lineTo(seatX, seatY);
      ctx.lineTo(rwX, rwY);
      ctx.stroke();

      // Gác-ba-ga phía sau
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(seatX - 4, seatY + 12);
      ctx.lineTo(rwX - 12, rwY - 24);
      ctx.lineTo(rwX + 16, rwY - 24);
      ctx.lineTo(rwX, rwY);
      ctx.stroke();

      // Ống ngồi (Seat tube)
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.moveTo(bbX, bbY);
      ctx.lineTo(seatX, seatY - 4);
      ctx.stroke();

      // Cốt yên & Yên da nâu
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(seatX, seatY - 4);
      ctx.lineTo(seatX - 2, seatY - 10);
      ctx.stroke();

      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(seatX - 3, seatY - 12, 14, 4.5, -0.12, 0, Math.PI * 2);
      ctx.fill();

      // Ống chéo (Down tube) & Ống ngang (Top tube)
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.moveTo(bbX, bbY);
      ctx.lineTo(headX, headY);
      ctx.moveTo(seatX, seatY + 4);
      ctx.lineTo(headX, headY - 2);
      ctx.stroke();

      // Ống cổ phuộc & Phuộc trước
      ctx.lineWidth = 4.0;
      ctx.strokeStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(headX, headY - 14);
      ctx.lineTo(headX, headY + 4);
      ctx.lineTo(fwX, fwY);
      ctx.stroke();

      // Ghi đông & Tay lái xe đạp
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(headX, headY - 14);
      ctx.lineTo(headX + 4, headY - 26);
      ctx.lineTo(headX - 10, headY - 20); // Tay nắm
      ctx.stroke();

      // Giỏ mây đan phía trước
      ctx.fillStyle = '#d97706';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(headX + 4, headY - 16, 22, 17, 3);
      ctx.fill();
      ctx.stroke();
      // Bánh mì baguette thò ra khỏi giỏ
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(headX + 18, headY - 22, 5, 11, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Đĩa xích & Bàn đạp xa
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(bbX, bbY, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Cần đạp xa
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(bbX, bbY);
      ctx.lineTo(pFarX, pFarY);
      ctx.stroke();

      ctx.restore();

      // --- 5. NGƯỜI LÁI XE (Thân trên, Áo sơ mi hoa văn nhã nhặn, Ba lô) ---
      ctx.save();
      const shoulderX = 138;
      const shoulderY = 52 + bikeBob;
      const handX = headX - 10;
      const handY = headY - 20;

      // Ba lô sau lưng
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(116, 56 + bikeBob, 11, 16, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Thân người (Áo sơ mi màu sáng thanh lịch)
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(hipX - 6, hipY - 2);
      ctx.lineTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX + 10, shoulderY + 8);
      ctx.lineTo(hipX + 10, hipY);
      ctx.closePath();
      ctx.fill();

      // Cánh tay hướng tới ghi đông
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(handX + 2, handY + 2);
      ctx.stroke();

      // Cổ tay & Bàn tay cầm ghi đông
      ctx.fillStyle = '#fbcfe8'; // Màu da tự nhiên
      ctx.beginPath();
      ctx.arc(handX, handY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Đầu & Khuôn mặt
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(148, 30 + bikeBob, 10, 12, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Mái tóc vuốt gọn gàng
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(146, 23 + bikeBob, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // --- 6. CHÂN GẦN (Vẽ phía trước khung xe, đạp guồng tròn 360 độ) ---
      ctx.save();
      // Đùi gần (Quần âu sẫm màu)
      ctx.lineWidth = 15;
      ctx.strokeStyle = '#334155';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hipX + 2, hipY);
      ctx.lineTo(kneeNearX, kneeNearY);
      ctx.stroke();

      // Bắp chân gần
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(kneeNearX, kneeNearY);
      ctx.lineTo(pNearX, pNearY);
      ctx.stroke();

      // Giày thể thao trắng gần tiếp xúc bàn đạp
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(pNearX + 4, pNearY + 2, 9, 5, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#94a3b8';
      ctx.stroke();

      // Giò đĩa & Bàn đạp gần
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(bbX, bbY);
      ctx.lineTo(pNearX, pNearY);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(pNearX - 4, pNearY + 3, 10, 3);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={190}
      className={`w-48 sm:w-60 md:w-72 h-auto object-contain filter drop-shadow-[0_12px_16px_rgba(0,0,0,0.65)] ${className ?? ''}`}
    />
  );
};

/**
 * Nhân vật người phụ nữ gánh hàng rong 2D tả thực (Articulated Street Vendor)
 * - Đôi chân sải bước nhịp nhàng với khớp gối co gập tự nhiên (không còn cứng đờ như zombie)
 * - Đòn gánh tre uốn lượn đàn hồi theo nhịp bước chân
 * - Hai thúng tre chở hàng đong đưa nhịp nhàng
 * - Nón lá, áo bà ba nâu/đất truyền thống
 */
export const ArticulatedStreetVendor: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Nhịp bước chân: ~1.35 bước/giây
      const walkPhase = (elapsed * Math.PI * 2 * 1.35) % (Math.PI * 2);

      // Độ nhún của hông và thân người theo nhịp bước
      const hipBob = -3.5 * Math.abs(Math.sin(walkPhase));
      const hipX = 118;
      const hipY = 108 + hipBob;

      // Chiều cao mặt đất cho bàn chân tiếp đất
      const groundY = 196;
      const lThigh = 46;
      const lCalf = 44;

      // Tính vị trí bàn chân theo pha đi bộ (Stance phase và Swing phase co gối)
      const computeFoot = (phase: number) => {
        const p = (phase % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        let fx: number;
        let fy: number;

        if (p < Math.PI) {
          // Giai đoạn tiếp đất & miết chân về sau (Stance phase)
          fx = hipX + 26 * Math.cos(p);
          fy = groundY;
        } else {
          // Giai đoạn nhấc chân co gối đưa về phía trước (Swing phase)
          const prog = (p - Math.PI) / Math.PI; // 0 -> 1
          fx = hipX - 26 * Math.cos(prog * Math.PI);
          // Nâng bàn chân lên khỏi mặt đất để gập gối tự nhiên
          fy = groundY - 16 * Math.sin(prog * Math.PI);
        }
        return { fx, fy };
      };

      // Chân xa (pha lệch Pi) và chân gần
      const footFar = computeFoot(walkPhase + Math.PI);
      const footNear = computeFoot(walkPhase);

      const [kneeFarX, kneeFarY] = solveIK(hipX, hipY, footFar.fx, footFar.fy, lThigh, lCalf, true);
      const [kneeNearX, kneeNearY] = solveIK(hipX, hipY, footNear.fx, footNear.fy, lThigh, lCalf, true);

      // Độ nảy đàn hồi của đòn gánh tre (trễ pha nhẹ tạo lực quán tính vật lý chân thực)
      const poleBounce = 7.5 * Math.sin(walkPhase - 0.45);
      const shoulderX = 118;
      const shoulderY = 74 + hipBob;

      // --- 1. BÓNG ĐỔ MẶT ĐƯỜNG DƯỚI CHÂN VÀ THÚNG ---
      ctx.save();
      // Bóng thúng trước
      ctx.beginPath();
      ctx.ellipse(36, groundY - 2, 22, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fill();

      // Bóng thúng sau
      ctx.beginPath();
      ctx.ellipse(204, groundY - 2, 22, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bóng bước chân người
      ctx.beginPath();
      ctx.ellipse(hipX, groundY + 1, 32, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.36)';
      ctx.fill();
      ctx.restore();

      // --- 2. CHÂN XA (vẽ sau thân người, đổ bóng đậm hơn tạo chiều sâu) ---
      ctx.save();
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#1e293b';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hipX - 2, hipY);
      ctx.lineTo(kneeFarX, kneeFarY);
      ctx.stroke();

      ctx.lineWidth = 11;
      ctx.strokeStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(kneeFarX, kneeFarY);
      ctx.lineTo(footFar.fx, footFar.fy);
      ctx.stroke();

      // Dép xa
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(footFar.fx + 4, footFar.fy, 7, 3, 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- 3. ĐÒN GÁNH TRE UỐN LƯỢN & 2 THÚNG HÀNG ---
      ctx.save();
      const leftTipX = 36;
      const leftTipY = 94 + hipBob + poleBounce;
      const rightTipX = 204;
      const rightTipY = 96 + hipBob + poleBounce;

      // Đòn gánh tre cong uốn qua vai
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = '#92400e'; // Màu tre già óng vàng
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(leftTipX, leftTipY);
      ctx.quadraticCurveTo(shoulderX, shoulderY - 8, rightTipX, rightTipY);
      ctx.stroke();

      // 4 dây quang gánh thúng trước & thúng sau
      const drawBasket = (bx: number, by: number) => {
        // Dây quang gánh
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = '#a16207';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - 16, by + 52);
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + 16, by + 52);
        ctx.stroke();

        // Thúng tre tròn đan tinh xảo
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(bx, by + 54, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#78350f';
        ctx.stroke();

        // Bánh mì / hàng hóa thơm nức trong thúng
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(bx, by + 52, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      };

      drawBasket(leftTipX, leftTipY);
      drawBasket(rightTipX, rightTipY);
      ctx.restore();

      // --- 4. THÂN NGƯỜI, ÁO BÀ BA, NÓN LÁ TRUYỀN THỐNG ---
      ctx.save();
      // Áo bà ba truyền thống màu nâu gụ
      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.moveTo(hipX - 10, hipY - 2);
      ctx.lineTo(shoulderX - 8, shoulderY);
      ctx.lineTo(shoulderX + 8, shoulderY);
      ctx.lineTo(hipX + 10, hipY - 2);
      ctx.closePath();
      ctx.fill();

      // Vạt áo bà ba phủ nhẹ xuống hông
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.moveTo(hipX - 11, hipY - 6);
      ctx.lineTo(hipX + 11, hipY - 6);
      ctx.lineTo(hipX + 8, hipY + 12);
      ctx.lineTo(hipX - 8, hipY + 12);
      ctx.closePath();
      ctx.fill();

      // Tay phải giữ đòn gánh trên vai
      ctx.lineWidth = 7.5;
      ctx.strokeStyle = '#9a3412';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shoulderX + 4, shoulderY + 6);
      ctx.lineTo(shoulderX + 16, shoulderY - 4);
      ctx.stroke();

      // Nón lá Việt Nam che nghiêng duyên dáng
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(shoulderX - 24, shoulderY - 14);
      ctx.lineTo(shoulderX + 6, shoulderY - 38); // Chóp nón
      ctx.lineTo(shoulderX + 28, shoulderY - 12);
      ctx.closePath();
      ctx.fill();

      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#ca8a04';
      ctx.stroke();

      // Vành nón lá cong nhẹ
      ctx.beginPath();
      ctx.ellipse(shoulderX + 2, shoulderY - 13, 26, 4.5, 0.08, 0, Math.PI * 2);
      ctx.stroke();

      // Quai nón nhung xanh/tím mềm mại
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#7c3aed';
      ctx.beginPath();
      ctx.moveTo(shoulderX - 6, shoulderY - 11);
      ctx.lineTo(shoulderX, shoulderY - 1);
      ctx.lineTo(shoulderX + 10, shoulderY - 10);
      ctx.stroke();
      ctx.restore();

      // --- 5. CHÂN GẦN (Co gối tự nhiên khi nhấc bước, sải chân mượt mà) ---
      ctx.save();
      ctx.lineWidth = 15;
      ctx.strokeStyle = '#334155'; // Quần lụa đen truyền thống
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hipX + 2, hipY);
      ctx.lineTo(kneeNearX, kneeNearY);
      ctx.stroke();

      ctx.lineWidth = 12;
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(kneeNearX, kneeNearY);
      ctx.lineTo(footNear.fx, footNear.fy);
      ctx.stroke();

      // Dép quai kẹp gần
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(footNear.fx + 5, footNear.fy, 8, 3.5, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={220}
      className={`w-44 sm:w-56 md:w-64 h-auto object-contain filter drop-shadow-[0_12px_16px_rgba(0,0,0,0.60)] ${className ?? ''}`}
    />
  );
};
