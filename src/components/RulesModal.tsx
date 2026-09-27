/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, BookOpen, ShieldCheck, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[92dvh] flex flex-col bg-stone-900 border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden text-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-800 bg-stone-950/80">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-amber-200 font-serif">
              Luật Chơi Cờ Tướng Úp Việt Nam
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-stone-300">
          <div className="p-3.5 bg-amber-950/30 border border-amber-800/40 rounded-xl flex gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-300 mb-1">Đặc trưng hấp dẫn của Cờ Úp</h4>
              <p className="text-xs text-amber-200/80">
                Cờ Tướng Úp là biến thể dân gian cực kỳ thịnh hành tại Việt Nam. Trò chơi kết hợp giữa chiến thuật cờ tướng đỉnh cao và yếu tố bất ngờ, may rủi đầy kích thích khi lật mở từng quân cờ.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-stone-100 text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 1. Bố trí bàn cờ ban đầu
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-xs text-stone-300">
              <li>
                <strong className="text-stone-100">Quân Tướng:</strong> Là quân duy nhất được <span className="text-amber-400 font-semibold">ngửa sẵn</span> tại vị trí xuất phát ban đầu.
              </li>
              <li>
                <strong className="text-stone-100">15 quân còn lại:</strong> Gồm 2 Xe, 2 Pháo, 2 Mã, 2 Tượng, 2 Sĩ, 5 Tốt được úp mặt và tráo ngẫu nhiên đặt vào 15 vị trí xuất phát tiêu chuẩn của mỗi bên.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-stone-100 text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 2. Cách di chuyển và Lật quân
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-xs text-stone-300">
              <li>
                <strong className="text-stone-100">Khi quân đang Úp:</strong> Di chuyển và ăn quân theo <span className="text-amber-400 font-semibold">vai trò của vị trí nó đang đứng</span>.
                (Ví dụ: Quân úp ở ô Xe đi như Xe, ở ô Mã đi như Mã và có cản chân, ở ô Pháo cần ngòi để ăn, ở ô Voi đi chéo 2 ô có cản mắt, ở ô Sĩ đi chéo 1 ô trong cung, ở ô Tốt đi thẳng 1 ô).
              </li>
              <li>
                <strong className="text-stone-100">Nguyên tắc Lật mở:</strong> Ngay khi một quân úp thực hiện nước đi đầu tiên (dù đi nước trống hay ăn quân), quân đó <span className="text-emerald-400 font-semibold">ngay lập tức được lật ngửa</span> để lộ thân phận thật.
              </li>
              <li>
                <strong className="text-stone-100">Ăn quân úp:</strong> Khi bắt một quân úp của đối phương, quân bị bắt cũng được lật ngửa để hai bên cùng biết đó là quân gì.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-stone-100 text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 3. Đặc quyền Cờ Úp (Sĩ & Tượng tự do)
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-xs text-stone-300">
              <li>
                <strong className="text-amber-400 font-semibold">Sĩ sau khi mở:</strong> Được phép đi chéo 1 ô, <span className="text-stone-100 font-bold">ra khỏi Cửu cung và qua sông tự do</span> sang phần sân đối phương để tham chiến!
              </li>
              <li>
                <strong className="text-amber-400 font-semibold">Tượng sau khi mở:</strong> Được phép đi chéo 2 ô (vẫn có cản mắt tượng), <span className="text-stone-100 font-bold">được phép qua sông</span> tấn công trực diện!
              </li>
              <li>
                <strong className="text-stone-100">Tốt:</strong> Chưa qua sông chỉ đi thẳng; qua sông được đi thẳng và đi ngang.
              </li>
              <li>
                <strong className="text-stone-100">Tướng:</strong> Chỉ di chuyển trong Cửu cung và không được để 2 Tướng đối mặt trực diện (Lộ mặt Tướng).
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-stone-100 text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 4. Điều kiện Chiến thắng
            </h3>
            <p className="text-xs text-stone-300">
              Chiến thắng khi bạn <strong className="text-red-400">Chiếu bí</strong> (đối phương không còn nước cản chiếu), bắt được Tướng đối phương, hoặc khi đối phương rơi vào thế <strong className="text-amber-400">hết nước đi hợp lệ</strong>.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-amber-300 text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> 5. Luật Cấm Trường Chiếu & Trường Tróc (Quy định lặp nước)
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-stone-300">
              <li>
                <strong className="text-stone-100 font-semibold">Cấm chiếu tướng quá 5 lần liên tiếp:</strong> Một quân cờ <span className="text-red-400 font-semibold">không được phép chiếu Tướng đối phương quá 5 lần liên tiếp</span>. Đến lần thứ 6, nếu quân này cố tình đi nước chiếu tiếp sẽ bị xem là nước đi phạm luật (bị khóa, bắt buộc phải đổi nước).
              </li>
              <li>
                <strong className="text-stone-100 font-semibold">Cấm đuổi quân vô căn quá 5 lần liên tiếp:</strong> Một quân cờ <span className="text-amber-400 font-semibold">không được phép đuổi (đe dọa bắt) một quân cờ khác quá 5 lần liên tiếp</span> khi quân đối phương đó <span className="text-amber-300 font-semibold">không có quân nào che chở / giữ hộ (quân vô căn)</span>.
              </li>
              <li>
                Nếu chỉ còn những nước đi vi phạm 2 luật trên mà không còn nước đi hợp lệ nào khác, bên đó sẽ bị xử thua theo luật cờ tướng.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm shadow-md transition-all"
          >
            Đã hiểu, vào ván cờ
          </button>
        </div>
      </div>
    </div>
  );
};
