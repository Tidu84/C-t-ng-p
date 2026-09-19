/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Coffee, MessageCircle, Sparkles, Smile, X } from 'lucide-react';
import { BoardTheme, Move, Piece, PlayerColor } from '../types';

interface StreetBanterProps {
  lastMove: Move | null;
  isCheck: boolean;
  winner: PlayerColor | 'draw' | null;
  theme?: BoardTheme;
}

const FUN_QUOTES_DEFAULT = [
  '☕ Bác Ba quán cóc: "Cờ ngoài bài trong, bình tĩnh mà đi chú em ơi!"',
  '🍵 Chú Tư trà đá: "Cao cờ không bằng cao số, bốc trúng quân ngon là có cửa thắng!"',
  '🍉 Anh Năm hạt dưa: "Thế trận đang giằng co, cẩn thận kẻo lọt vào bẫy phục kích!"',
  '🍃 Bác Sáu quạt nan: "Ván này kịch tính à nghen, bên nào hớ hênh là mất Tướng liền!"',
];

const QUOTES_CHECK = [
  '⚡ Bác Ba quán cóc: "CHIẾU TƯỚNG! Tướng chạy đâu cho hết nắng mùa hè này!"',
  '🚨 Chú Tư trà đá: "Ối giồi ôi, cứu giá khẩn cấp không là bay màu cả triều đình!"',
  '🔥 Anh Năm hạt dưa: "Chiếu thẳng mặt rồi, toát hết mồ hôi hột chưa kìa!"',
];

const QUOTES_REVEAL_GOOD = [
  '✨ Bác Ba quán cóc: "Lật được quân to rồi! Thơm nức nở như bát phở bò tái nạm!"',
  '🎉 Chú Tư trà đá: "Tuyệt phẩm quân úp! Pha này đối phương tái mét mặt mày!"',
  '💥 Anh Năm hạt dưa: "Trời độ rồi chú em ơi, quân cờ này đáng giá ngàn vàng!"',
];

const QUOTES_REVEAL_PAWN = [
  '🍉 Bác Sáu quạt nan: "Bốc trúng hạt dưa rồi! Nhưng Tốt qua sông là biến thành Hổ đấy nhé!"',
  '🌱 Chú Tư trà đá: "Lại là Tốt úp, xui như cơm nguội nhưng biết đâu lập đại công!"',
];

const QUOTES_CAPTURE = [
  '⚔️ Bác Ba quán cóc: "Chém ngọt xớt! Nuốt trọn quân địch sướng rơn cả bàn tay!"',
  '🎯 Chú Tư trà đá: "Một bước đi sấm sét, vạn dặm quân thù tan tác!"',
];

export const StreetBanter: React.FC<StreetBanterProps> = ({
  lastMove,
  isCheck,
  winner,
  theme,
}) => {
  const [currentQuote, setCurrentQuote] = useState<string>(
    '☕ Bác Ba quán cóc: "Trà ngon cờ đẹp, xin mời hai kỳ thủ khai cuộc vui vẻ!"'
  );
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (winner) {
      setCurrentQuote(
        winner === 'red'
          ? '🏆 Bác Ba quán cóc: "Chúc mừng Bên Đỏ! Sát pháp quá ảo diệu, tâm phục khẩu phục!"'
          : '🏆 Bác Ba quán cóc: "Bên Đen lật kèo ngoạn mục! Cả quán cóc xin ngả mũ thán phục!"'
      );
      return;
    }

    if (isCheck) {
      const q = QUOTES_CHECK[Math.floor(Math.random() * QUOTES_CHECK.length)];
      setCurrentQuote(q);
      return;
    }

    if (lastMove?.wasCovered) {
      const role = lastMove.revealedRole;
      if (role === 'chariot' || role === 'cannon' || role === 'horse') {
        const q = QUOTES_REVEAL_GOOD[Math.floor(Math.random() * QUOTES_REVEAL_GOOD.length)];
        setCurrentQuote(q);
        return;
      } else if (role === 'soldier') {
        const q = QUOTES_REVEAL_PAWN[Math.floor(Math.random() * QUOTES_REVEAL_PAWN.length)];
        setCurrentQuote(q);
        return;
      }
    }

    if (lastMove?.captured) {
      const q = QUOTES_CAPTURE[Math.floor(Math.random() * QUOTES_CAPTURE.length)];
      setCurrentQuote(q);
      return;
    }

    // Occasional gentle banter
    if (lastMove && Math.random() < 0.45) {
      const q = FUN_QUOTES_DEFAULT[Math.floor(Math.random() * FUN_QUOTES_DEFAULT.length)];
      setCurrentQuote(q);
    }
  }, [lastMove, isCheck, winner]);

  if (!isVisible) return null;

  return (
    <div
      className={`w-full max-w-[590px] mx-auto px-3.5 py-2 rounded-xl border flex items-center justify-between gap-2 shadow-md transition-all duration-300 ${
        theme === 'quan_coc'
          ? 'bg-amber-950/40 border-amber-600/40 text-amber-200'
          : 'bg-zinc-900/60 border-zinc-700/50 text-stone-300'
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="shrink-0 text-amber-400 text-sm">
          {theme === 'quan_coc' ? '☕' : '💬'}
        </span>
        <p className="text-xs sm:text-[13px] font-medium italic truncate">
          {currentQuote}
        </p>
      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="text-stone-500 hover:text-stone-300 p-1 shrink-0 transition-colors"
        title="Đóng bình luận"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
