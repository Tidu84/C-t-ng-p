/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, Handshake, Flag, X } from 'lucide-react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  type: 'draw' | 'resign' | 'resume' | null;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  encouragingQuote?: string;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  type,
  onConfirm,
  onCancel,
  title,
  message,
  encouragingQuote,
}) => {
  if (!isOpen || !type) return null;

  const isResign = type === 'resign';
  const isDraw = type === 'draw';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181c] border border-amber-500/50 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative flex flex-col text-center">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-stone-400 hover:text-white p-1 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-stone-800 border border-white/10">
          {isResign ? (
            <Flag className="w-6 h-6 text-red-400" />
          ) : isDraw ? (
            <Handshake className="w-6 h-6 text-amber-400" />
          ) : (
            <AlertCircle className="w-6 h-6 text-emerald-400" />
          )}
        </div>

        <h3 className="font-bold text-base text-stone-100 mb-1.5">
          {title || (isResign ? 'Xác Nhận Đầu Hàng' : isDraw ? 'Đề Nghị Cầu Hòa' : 'Xác Nhận')}
        </h3>

        <p className="text-xs text-stone-300 mb-3 leading-relaxed">
          {message ||
            (isResign
              ? 'Bạn có chắc chắn muốn nhận thua ván cờ này? Chiến thắng sẽ thuộc về đối phương.'
              : isDraw
              ? 'Bạn có muốn gửi lời xin hòa ván cờ đến đối thủ không?'
              : 'Bạn có muốn tiếp tục hành động này?')}
        </p>

        {/* Poetic Encouraging Quote Callout (Lời động viên kỳ hữu) */}
        {encouragingQuote && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs italic font-serif leading-snug">
            "{encouragingQuote}"
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs border border-white/10 transition-colors"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 ${
              isResign
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
            }`}
          >
            {isResign ? 'Đầu Hàng' : isDraw ? 'Xin Hòa' : 'Đồng Ý'}
          </button>
        </div>
      </div>
    </div>
  );
};
