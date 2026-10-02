/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { BackgroundScene3D } from '../types';
import { sound } from '../utils/audio';
import imgTraDa from '../assets/images/vietnamese_iced_tea_glass_1790907070184.jpg';
import imgCaPhe from '../assets/images/vietnamese_phin_coffee_cup_1790907086461.jpg';
import imgHoaVien from '../assets/images/lotus_tea_ceramic_cup_1790907112889.jpg';

interface TableDrinkPropProps {
  bgScene: BackgroundScene3D;
  onTakeSip: (message: string, avatar: string, name: string) => void;
  is3D?: boolean;
}

export const TableDrinkProp: React.FC<TableDrinkPropProps> = ({
  bgScene,
  onTakeSip,
  is3D = true,
}) => {
  const [isDrinking, setIsDrinking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chọn hình ảnh và câu thoại đặc trưng theo không gian quán
  const getPropConfig = () => {
    switch (bgScene) {
      case 'ca_phe':
        return {
          image: imgCaPhe,
          title: 'Ly cà phê phin nâu',
          actionText: 'Nhấp ngụm cà phê',
          avatar: '☕',
          name: 'Anh Hoàng Cà Phê',
          quotes: [
            'Cà phê phin đậm đặc, nước cờ này cũng đắng cay cho đối thủ lắm đây!',
            'Khàaa! Cà phê ngấm rồi, chuẩn bị xem màn sát phạt nảy lửa!',
            'Một ngụm cà phê phin tỉnh táo, nước cờ này tính sâu 5 bước!',
          ],
        };
      case 'hoa_vien':
        return {
          image: imgHoaVien,
          title: 'Chén trà sen Bát Tràng',
          actionText: 'Thưởng trà sen',
          avatar: '🎋',
          name: 'Trà Sư Mặc Khách',
          quotes: [
            'Nhất ẩm tiêu vạn sầu, kỳ phong tự tại như mây trôi nước chảy.',
            'Hương trà thơm ngát tĩnh tâm, nước cờ này ung dung mà thâm sâu tuyệt luân.',
            'Thưởng ngụm trà sen thanh tịnh, tâm an thì vạn biến đều trong tầm tay.',
          ],
        };
      case 'dau_truong':
        return {
          image: imgTraDa,
          title: 'Ly nước tăng lực kỳ thủ',
          actionText: 'Tiếp nước thi đấu',
          avatar: '🏆',
          name: 'Đại Sư Bình Luận',
          quotes: [
            'Tiếp nước nạp năng lượng! Cả kỳ đài đang nín thở chờ nước cờ then chốt!',
            'Bình tĩnh giữ nhịp thở, trận chung kết cờ úp đỉnh cao đang bước vào hồi gay cấn!',
          ],
        };
      case 'go_tram':
        return {
          image: imgHoaVien,
          title: 'Chén trà thiền cổ thụ',
          actionText: 'Nhấp ngụm trà thiền',
          avatar: '🪵',
          name: 'Thiền Sư Kỳ Đạo',
          quotes: [
            'Tĩnh tâm như nước mùa thu, một nước cờ thấu suốt càn khôn.',
            'Uống trà ngộ đạo, thắng không kiêu, bại không nản, tâm bất biến.',
          ],
        };
      case 'tra_da':
      default:
        return {
          image: imgTraDa,
          title: 'Cốc trà đá vỉa hè',
          actionText: 'Uống ngụm trà đá',
          avatar: '🍵',
          name: 'Bác Ba Trà Đá',
          quotes: [
            'Làm ngụm trà đá mát họng rồi điều Xe bắt Tướng chú em ơi!',
            'Khàaa! Trà đá phong thủy của bác Ba là đánh đâu thắng đó!',
            'Uống ngụm trà đá lấy lại bình tĩnh, cờ tàn mới biết ai khôn ai dại!',
            'Trà đá mát lạnh, điếu thuốc lào thơm, đánh ván cờ sướng nhất trần đời!',
          ],
        };
    }
  };

  const config = getPropConfig();

  const handleSip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDrinking) return;

    setIsDrinking(true);
    sound.playDrinkSip();

    const randomQuote = config.quotes[Math.floor(Math.random() * config.quotes.length)];
    setActiveSpeech(randomQuote);
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => {
      setActiveSpeech(null);
      speechTimerRef.current = null;
    }, 10000);

    onTakeSip(randomQuote, config.avatar, config.name);

    setTimeout(() => {
      setIsDrinking(false);
    }, 1200);
  };

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => setIsMinimized(false)}
        className="absolute bottom-2 right-2 z-20 px-2 py-1 bg-stone-900/80 hover:bg-stone-800 border border-amber-500/40 rounded-full text-[10px] text-amber-300 flex items-center gap-1 shadow-md transition-all hover:scale-105 backdrop-blur-sm"
        title="Mở lại ly nước góc bàn"
      >
        <span>{config.avatar}</span>
        <span className="hidden sm:inline">Quán nước</span>
      </button>
    );
  }

  return (
    <div
      className={`absolute z-20 transition-all duration-300 pointer-events-auto select-none ${
        is3D
          ? 'bottom-2 sm:bottom-4 right-1 sm:right-3 md:right-5'
          : 'bottom-1 sm:bottom-2 right-1 sm:right-2'
      }`}
      style={{
        perspective: is3D ? '800px' : 'none',
      }}
    >
      <div className="relative group flex flex-col items-center">
        {/* Nút thu nhỏ nhỏ xíu ở góc */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(true);
          }}
          className="absolute -top-1.5 -right-1.5 z-30 w-4 h-4 rounded-full bg-stone-900/90 text-stone-400 hover:text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px]"
          title="Thu nhỏ ly nước"
        >
          ✕
        </button>

        {/* Khung ly nước chân thực đặt trên mặt bàn gỗ */}
        <div
          onClick={handleSip}
          className={`relative cursor-pointer transition-transform duration-200 active:scale-90 ${
            isDrinking ? 'scale-105 -translate-y-1' : 'hover:scale-105'
          }`}
          title={`${config.title} - Chạm để nhấp ngụm!`}
        >
          {/* Bong bóng lời nói khi uống trà/cà phê hiển thị rõ ràng 10 giây */}
          {activeSpeech && (
            <div className="absolute bottom-full mb-3 right-0 w-52 sm:w-60 p-2.5 bg-stone-950/98 border border-amber-500/70 rounded-xl shadow-2xl z-50 text-[11.5px] sm:text-xs text-amber-100 animate-in fade-in zoom-in-95 pointer-events-auto">
              <div className="flex items-center justify-between pb-1 border-b border-white/10 mb-1.5 font-bold text-amber-300">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">{config.avatar}</span>
                  <span>{config.name}</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpeech(null);
                  }}
                  className="text-stone-400 hover:text-white text-xs px-1"
                  title="Đóng"
                >
                  ✕
                </button>
              </div>
              <p className="leading-relaxed font-medium">“{activeSpeech}”</p>
              {/* Mũi tên chỉ xuống ly nước */}
              <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-stone-950 rotate-45 border-r border-b border-amber-500/70" />
            </div>
          )}

          {/* Bóng đổ tròn chân thực xuống mặt bàn gỗ */}
          <div
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-14 sm:w-16 h-4 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 80%)',
              filter: 'blur(3px)',
            }}
          />

          {/* Vòng lót ly đọng sương */}
          <div className="relative w-12 h-12 sm:w-15 sm:h-15 md:w-16 md:h-16 rounded-full overflow-hidden border border-amber-500/30 shadow-2xl ring-1 ring-white/10 bg-black">
            <img
              src={config.image}
              alt={config.title}
              className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-110"
              style={{
                filter: 'contrast(1.08) brightness(1.02)',
              }}
            />

            {/* Hiệu ứng gợn sóng khi nhấp ngụm */}
            {isDrinking && (
              <div className="absolute inset-0 bg-amber-400/20 rounded-full animate-ping pointer-events-none" />
            )}
          </div>

          {/* Nhãn gợi ý nhỏ xinh, tinh tế */}
          <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-950/85 border border-amber-500/40 rounded-full px-1.5 py-0.2 text-[8px] sm:text-[9px] text-amber-200/90 font-medium opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
            {config.avatar} Chạm uống
          </div>
        </div>
      </div>
    </div>
  );
};
