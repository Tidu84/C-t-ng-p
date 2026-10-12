/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundScene3D } from '../types';
import { sound } from '../utils/audio';
import { ambience } from '../utils/ambienceEngine';
import { drinkOrders, DrinkOrder } from '../utils/drinkOrders';
import { Footprints, Sparkles, Coffee, UserCheck, EyeOff, Megaphone } from 'lucide-react';

interface AnimatedBackgroundBackdropProps {
  scene: BackgroundScene3D;
  imageUrl?: string;
  sceneName?: string;
  isLiteMode?: boolean;
  isWideLayout?: boolean;
}

type UncleActionState =
  | 'sitting_relax'
  | 'calling_drink'
  | 'standing_up'
  | 'walking_to_stall'
  | 'receiving_drink'
  | 'drinking_sip'
  | 'walking_back'
  | 'sitting_down';

type ServerActionState = 'idle_counter' | 'pouring_tea' | 'serving_walk' | 'serving_back';

export const AnimatedBackgroundBackdrop: React.FC<AnimatedBackgroundBackdropProps> = ({
  scene,
  imageUrl,
  sceneName,
  isLiteMode = false,
  isWideLayout = false,
}) => {
  // Cài đặt lưu trong localStorage
  const [isAnimationEnabled, setIsAnimationEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('co_up_animated_bg');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [isWalkersEnabled, setIsWalkersEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('co_up_bg_walkers');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // State của Khách xem cờ (Bác Ba / Chú Năm)
  const [uncleState, setUncleState] = useState<UncleActionState>('sitting_relax');
  const [uncleX, setUncleX] = useState<number>(14); // % từ lề trái
  const [uncleFacing, setUncleFacing] = useState<'right' | 'left'>('right');
  const [uncleSpeech, setUncleSpeech] = useState<string | null>(null);
  const [uncleHasGlass, setUncleHasGlass] = useState<boolean>(false);

  // State của Chủ quán / Người phục vụ tại quầy nước
  const [serverState, setServerState] = useState<ServerActionState>('idle_counter');
  const [serverSpeech, setServerSpeech] = useState<string | null>(null);
  const [serverX, setServerX] = useState<number>(84); // % từ lề trái

  // Vị trí của quầy nước (Drink stall counter)
  const stallX = isWideLayout ? 82 : 80;

  // Refs điều khiển hoạt ảnh và thời gian
  const uncleWalkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFootstepTimeRef = useRef<number>(0);

  // Xe đạp thoáng qua ở xa trên phố (Quán trà đá)
  const [cyclistActive, setCyclistActive] = useState<boolean>(false);

  // Người bán hàng rong đi qua ở xa ngoài đường (Bánh mì nóng giòn, tào phớ, bắp xào...)
  const [streetVendorActive, setStreetVendorActive] = useState<boolean>(false);
  const [vendorQuote, setVendorQuote] = useState<string | null>(null);

  // Kích hoạt tiếng và hình ảnh rao hàng rong ngoài đường phố
  const triggerStreetVendorCry = useCallback(() => {
    const quotes = [
      'Bánh mì nóng giòn đặc ruột đâyy!',
      'Ai tào phớ nước đường hoa nhài nàooo!',
      'Bắp xào, khoai lang nướng thơm lừng đâyy!',
      'Kem bông, kẹo kéo đêyyy!',
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    setVendorQuote(quote);
    setStreetVendorActive(true);
    ambience.playStreetVendorCry();

    setTimeout(() => {
      setStreetVendorActive(false);
      setVendorQuote(null);
    }, 8500);
  }, []);

  // 1. LỜI THOẠI KHI GỌI ĐỒ UỐNG
  const getCallDrinkQuote = useCallback(() => {
    switch (scene) {
      case 'ca_phe':
        return 'Em ơi, cho một nâu đá nhiều sữa bàn cờ tướng nhé!';
      case 'hoa_vien':
        return 'Tiểu nhị, cho xin một ấm trà sen Tây Hồ thanh khiết!';
      case 'dau_truong':
        return 'Ban tổ chức ơi, cho xin thêm ly nước giải khát!';
      case 'go_tram':
        return 'Cho xin một chén trà thiền ấm nóng tĩnh tâm.';
      case 'tra_da':
      default:
        return 'Bác Ba ơi, cho cháu một cốc trà đá nhiều đá nhé!';
    }
  }, [scene]);

  // 2. LỜI THOẠI CỦA CHỦ QUÁN KHI RÓT NƯỚC / ĐƯA NƯỚC
  const getServerResponseQuote = useCallback(() => {
    switch (scene) {
      case 'ca_phe':
        return 'Dạ có ngay anh ơi! Cà phê phin thơm lừng đây ạ!';
      case 'hoa_vien':
        return 'Trà sen hảo hạng kính mời quý khách thưởng lãm!';
      case 'dau_truong':
        return 'Nước mát cho các kỳ thủ tập trung thi đấu!';
      case 'go_tram':
        return 'Trà thiền an yên mời đạo hữu nhâm nhi.';
      case 'tra_da':
      default:
        return 'Có ngay bác ơi! Trà tươi mới hãm mát lạnh đây!';
    }
  }, [scene]);

  // 3. HOẠT CẢNH: KHÁCH GIƠ TAY GỌI ĐỒ UỐNG ("gọi đồ uống")
  const triggerCallingDrink = useCallback(
    (customQuote?: string) => {
      if (uncleState !== 'sitting_relax') return;

      const quote = customQuote || getCallDrinkQuote();
      setUncleFacing('right');
      setUncleState('calling_drink');
      setUncleSpeech(quote);

      // Phát âm thanh tiếng thìa gõ / đá viên clink và giọng gọi đồ uống
      drinkOrders.triggerOrder(scene);

      // Sau 1 giây, chủ quán tại quầy bắt đầu rót nước và đáp lời
      setTimeout(() => {
        setServerState('pouring_tea');
        setServerSpeech(getServerResponseQuote());
      }, 1200);

      // Sau 4 giây, kết thúc gọi đồ uống và trở về tư thế ngồi thoải mái (hoặc chuẩn bị đi lấy nước)
      actionTimeoutRef.current = setTimeout(() => {
        setUncleSpeech(null);
        setServerSpeech(null);
        setServerState('idle_counter');
        setUncleState('sitting_relax');
      }, 5500);
    },
    [uncleState, getCallDrinkQuote, getServerResponseQuote, scene],
  );

  // 4. HOẠT CẢNH: ĐỨNG LÊN ĐI LẤY ĐỒ UỐNG ("đứng lên lấy đồ uống")
  const triggerStandingUpToGetDrink = useCallback(() => {
    if (uncleState !== 'sitting_relax' && uncleState !== 'calling_drink') return;

    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    if (uncleWalkIntervalRef.current) clearInterval(uncleWalkIntervalRef.current);

    // Bước 1: Khách đứng dậy từ ghế (nghe tiếng ghế nhựa xê dịch)
    setUncleState('standing_up');
    setUncleFacing('right');
    sound.playChairShiftSound(scene);
    setUncleSpeech('Đứng lên ra quầy làm cốc trà đá cho mát họng!');

    // Bước 2: Sau 1.1s (đã đứng thẳng), bắt đầu sải bước đi sang quầy nước
    actionTimeoutRef.current = setTimeout(() => {
      setUncleState('walking_to_stall');
      setServerState('pouring_tea');
      setServerSpeech('Bác sang lấy trà tươi nóng hổi này!');

      let currentX = 14;
      const targetX = isWideLayout ? stallX - 8 : stallX - 10;
      const speed = 0.32;

      uncleWalkIntervalRef.current = setInterval(() => {
        currentX += speed;
        setUncleX(currentX);

        // Phát âm thanh bước chân nhịp nhàng
        const now = Date.now();
        if (now - lastFootstepTimeRef.current > 420) {
          lastFootstepTimeRef.current = now;
          sound.playFootstepSound();
        }

        // Bước 3: Đã đến quầy nước -> nhận cốc nước từ chủ quán
        if (currentX >= targetX) {
          if (uncleWalkIntervalRef.current) clearInterval(uncleWalkIntervalRef.current);
          setUncleState('receiving_drink');
          setUncleHasGlass(true);
          setServerState('idle_counter');
          setServerSpeech('Mời bác làm ngụm trà đá!');

          // Bước 4: Nâng cốc lên miệng nhấp một ngụm trà sảng khoái (kèm âm thanh clink + gulp)
          actionTimeoutRef.current = setTimeout(() => {
            setUncleState('drinking_sip');
            sound.playDrinkSip();
            setUncleSpeech('Khàaa! Trà đá mát lạnh tỉnh cả người!');

            // Bước 5: Sau khi uống ngụm, cầm cốc nước bước đi thong dong quay trở lại bàn cờ
            actionTimeoutRef.current = setTimeout(() => {
              setUncleState('walking_back');
              setUncleFacing('left');
              setUncleSpeech('Cầm cốc về bàn xem nước Xe chém Tướng nào!');
              setServerSpeech(null);

              let returnX = currentX;
              const originalX = 14;

              uncleWalkIntervalRef.current = setInterval(() => {
                returnX -= speed;
                setUncleX(returnX);

                const stepNow = Date.now();
                if (stepNow - lastFootstepTimeRef.current > 420) {
                  lastFootstepTimeRef.current = stepNow;
                  sound.playFootstepSound();
                }

                // Bước 6: Về đến ghế -> đặt cốc xuống bàn và ngồi xuống
                if (returnX <= originalX) {
                  if (uncleWalkIntervalRef.current) clearInterval(uncleWalkIntervalRef.current);
                  setUncleX(originalX);
                  setUncleFacing('right');
                  setUncleState('sitting_down');
                  sound.playChairShiftSound(scene);

                  // Ngồi yên vị thư thái xem cờ
                  actionTimeoutRef.current = setTimeout(() => {
                    setUncleState('sitting_relax');
                    setUncleSpeech(null);
                  }, 1200);
                }
              }, 50);
            }, 3500);
          }, 1800);
        }
      }, 50);
    }, 1100);
  }, [uncleState, scene, stallX, isWideLayout]);

  // 5. ĐỒNG BỘ VỚI HỆ THỐNG GỌI ĐỒ UỐNG: Khi drinkOrders phát sự kiện (định kỳ mỗi ~1 phút)
  useEffect(() => {
    const unsubscribe = drinkOrders.subscribe((order: DrinkOrder) => {
      if (!isWalkersEnabled) return;

      // Chọn ngẫu nhiên: 50% đứng lên đi lấy đồ uống, 50% giơ tay gọi đồ uống tại chỗ
      if (Math.random() > 0.45) {
        triggerStandingUpToGetDrink();
      } else {
        triggerCallingDrink(order.quote);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isWalkersEnabled, triggerCallingDrink, triggerStandingUpToGetDrink]);

  // 6. TỰ ĐỘNG LÊN LỊCH HOẠT CẢNH ĐỊNH KỲ (nếu chưa có sự kiện)
  useEffect(() => {
    if (!isWalkersEnabled) return;

    // Cứ 30 - 45 giây có hành động tự nhiên (gọi nước hoặc đứng dậy lấy đồ uống)
    const scheduleNextAction = () => {
      const delay = 32000 + Math.random() * 18000;
      return setTimeout(() => {
        if (uncleState === 'sitting_relax') {
          if (Math.random() > 0.5) {
            triggerStandingUpToGetDrink();
          } else {
            triggerCallingDrink();
          }
        }
        timer = scheduleNextAction();
      }, delay);
    };

    // Xe đạp chạy qua ở xa (quán trà đá)
    const scheduleCyclist = () => {
      if (scene !== 'tra_da') return null;
      const delay = 35000 + Math.random() * 25000;
      return setTimeout(() => {
        setCyclistActive(true);
        setTimeout(() => setCyclistActive(false), 9000);
        cyclistTimer = scheduleCyclist();
      }, delay);
    };

    // Tiếng và hình bóng người bán hàng rong đi qua ở xa ngoài đường (vỉa hè hoặc cà phê)
    const scheduleStreetVendor = () => {
      if (scene !== 'tra_da' && scene !== 'ca_phe') return null;
      const delay = 42000 + Math.random() * 28000;
      return setTimeout(() => {
        triggerStreetVendorCry();
        vendorTimer = scheduleStreetVendor();
      }, delay);
    };

    let timer = scheduleNextAction();
    let cyclistTimer = scheduleCyclist();
    let vendorTimer = scheduleStreetVendor();

    return () => {
      if (timer) clearTimeout(timer);
      if (cyclistTimer) clearTimeout(cyclistTimer);
      if (vendorTimer) clearTimeout(vendorTimer);
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
      if (uncleWalkIntervalRef.current) clearInterval(uncleWalkIntervalRef.current);
    };
  }, [isWalkersEnabled, scene, uncleState, triggerCallingDrink, triggerStandingUpToGetDrink, triggerStreetVendorCry]);

  const toggleAnimation = () => {
    const next = !isAnimationEnabled;
    setIsAnimationEnabled(next);
    try {
      localStorage.setItem('co_up_animated_bg', String(next));
    } catch {}
  };

  const toggleWalkers = () => {
    const next = !isWalkersEnabled;
    setIsWalkersEnabled(next);
    try {
      localStorage.setItem('co_up_bg_walkers', String(next));
    } catch {}
    if (!next) {
      setUncleState('sitting_relax');
      setUncleSpeech(null);
      setServerSpeech(null);
    }
  };

  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* 1. LỚP ẢNH NỀN CHÍNH CÓ HIỆU ỨNG THỞ CAMERA PARALLAX MƯỢT MÀ */}
      <div
        className={`w-full h-full relative transition-all duration-700 ${
          isAnimationEnabled && !isLiteMode ? 'animate-ambient-backdrop' : ''
        }`}
      >
        <img
          src={imageUrl}
          alt={sceneName || 'Bối cảnh bàn cờ'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center filter brightness-[0.70] contrast-[1.08]"
        />

        {/* 2. HIỆU ỨNG MÔI TRƯỜNG: VỆT NẮNG, LÁ BAY, LÀN KHÓI TRÀ */}
        {isAnimationEnabled && !isLiteMode && (
          <>
            {scene === 'tra_da' && (
              <div
                className="absolute inset-0 pointer-events-none animate-dapple-sway opacity-35"
                style={{
                  background:
                    'radial-gradient(circle at 25% 35%, rgba(254,240,138,0.22) 0%, transparent 40%), radial-gradient(circle at 75% 45%, rgba(253,224,71,0.18) 0%, transparent 45%)',
                }}
              />
            )}

            {(scene === 'tra_da' || scene === 'hoa_vien') && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[
                  { left: '16%', delay: '0s', dur: '11s', size: 14 },
                  { left: '42%', delay: '4s', dur: '13s', size: 18 },
                  { left: '72%', delay: '2s', dur: '10s', size: 15 },
                  { left: '88%', delay: '7s', dur: '14s', size: 16 },
                ].map((leaf, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 animate-leaf-flutter opacity-70"
                    style={{
                      left: leaf.left,
                      animationDelay: leaf.delay,
                      animationDuration: leaf.dur,
                    }}
                  >
                    <svg
                      width={leaf.size}
                      height={leaf.size}
                      viewBox="0 0 24 24"
                      fill="#eab308"
                      className="drop-shadow-sm transform rotate-45 opacity-80"
                    >
                      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-11 5Z" />
                    </svg>
                  </div>
                ))}
              </div>
            )}

            {/* Khói nghi ngút bốc lên từ ấm tích trà nóng */}
            <div
              className="absolute pointer-events-none animate-steam-rise opacity-45"
              style={{
                bottom: '16%',
                left: `${stallX + 2}%`,
              }}
            >
              <svg width="40" height="85" viewBox="0 0 40 85" fill="none">
                <path
                  d="M12 80 C 22 65, 4 45, 18 28 C 26 14, 8 5, 22 0"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter="blur(1.5px)"
                />
              </svg>
            </div>

            {/* Bóng xe đạp lướt qua ở xa trên phố (Quán trà đá) */}
            {scene === 'tra_da' && cyclistActive && (
              <div
                className="absolute bottom-[44%] -left-[10%] w-24 h-16 pointer-events-none filter blur-[0.8px] opacity-45 transition-transform duration-[8500ms] ease-linear"
                style={{
                  transform: cyclistActive ? 'translateX(130vw)' : 'translateX(0)',
                }}
              >
                <svg viewBox="0 0 100 65" className="w-full h-full fill-stone-900">
                  <circle cx="20" cy="50" r="14" fill="none" stroke="#262626" strokeWidth="3" />
                  <circle cx="80" cy="50" r="14" fill="none" stroke="#262626" strokeWidth="3" />
                  <path d="M20 50 L45 50 L65 28 L35 28 Z" fill="none" stroke="#262626" strokeWidth="3" />
                  <circle cx="36" cy="12" r="7" fill="#1c1917" />
                  <path d="M36 19 L40 38 L55 45" stroke="#1c1917" strokeWidth="4" strokeLinecap="round" />
                  <path d="M38 25 L65 26" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            )}

            {/* Người bán hàng rong đi qua ở xa ngoài đường (Quán trà đá & Cà phê) */}
            {(scene === 'tra_da' || scene === 'ca_phe') && streetVendorActive && (
              <div
                className="absolute bottom-[42%] -left-[12%] w-28 h-20 pointer-events-none filter blur-[0.6px] opacity-65 transition-transform duration-[8200ms] ease-linear z-10"
                style={{
                  transform: streetVendorActive ? 'translateX(128vw)' : 'translateX(0)',
                }}
              >
                {/* Lời rao hàng rong ngoài đường phố */}
                {vendorQuote && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-amber-900/90 text-amber-100 border border-amber-400/70 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-lg whitespace-nowrap animate-pulse">
                    <span>📣 {vendorQuote}</span>
                  </div>
                )}
                {/* Gánh hàng rong / Xe đẩy bánh mì dạo */}
                <svg viewBox="0 0 120 75" className="w-full h-full">
                  {/* Người bán đội nón lá */}
                  <polygon points="55,18 40,26 70,26" fill="#d97706" />
                  <circle cx="55" cy="28" r="6" fill="#1c1917" />
                  {/* Thân người */}
                  <path d="M55 34 L 55 58 L 50 72 M 55 58 L 60 72" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" />
                  {/* Đòn gánh hoặc xe đẩy hàng */}
                  <path d="M22 38 L 88 38" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
                  <path d="M28 38 L 22 55 L 34 55 Z" fill="#b45309" stroke="#78350f" strokeWidth="1.5" />
                  <path d="M82 38 L 76 55 L 88 55 Z" fill="#b45309" stroke="#78350f" strokeWidth="1.5" />
                </svg>
              </div>
            )}
          </>
        )}

        {/* 3. QUẦY NƯỚC / BÀN TRÀ ĐÁ VỈA HÈ / QUẦY CÀ PHÊ (DRINK STALL COUNTER) */}
        {isWalkersEnabled && (
          <div
            className="absolute pointer-events-none z-10 transition-all duration-300"
            style={{
              right: isWideLayout ? '6%' : '4%',
              bottom: isWideLayout ? '12%' : '8%',
              transform: `scale(${isWideLayout ? 1.05 : 0.88})`,
              transformOrigin: 'bottom right',
            }}
          >
            {/* Lời thoại của Chủ quán khi rót nước / đưa nước */}
            {serverSpeech && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-amber-950/95 text-amber-100 border border-amber-400/80 text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md whitespace-nowrap animate-bounce z-30">
                <span>{serverSpeech}</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-400/80" />
              </div>
            )}

            {/* Bóng đổ dưới chân quầy nước */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-6 bg-black/60 rounded-full filter blur-[3px]" />

            {/* Hình thể Cô Chủ Quán / Người phục vụ rót nước */}
            <div className="relative w-44 h-56">
              {/* Cô chủ quán đứng cạnh quầy */}
              <div className="absolute bottom-12 left-6 w-20 h-40">
                <svg viewBox="0 0 100 180" className="w-full h-full drop-shadow-lg">
                  <circle cx="50" cy="28" r="13" fill="#d97706" />
                  {/* Tóc búi gọn gàng kiểu phụ nữ Việt Nam */}
                  <circle cx="50" cy="18" r="8" fill="#1f2937" />
                  <path d="M36 28 Q 50 16 64 28" fill="#1f2937" />
                  <circle cx="57" cy="29" r="2.2" fill="#111827" />
                  {/* Miệng cười duyên */}
                  <path d="M54 36 Q 58 39 62 36" stroke="#92400e" strokeWidth="1.8" fill="none" />

                  {/* Thân áo hoa / Tạp dề màu đỏ bordeaux */}
                  <path d="M34 48 L 66 48 L 70 125 L 30 125 Z" fill="#991b1b" stroke="#7f1d1d" strokeWidth="1.5" />
                  <path d="M40 48 L 40 125 M 60 48 L 60 125" stroke="#fca5a5" strokeWidth="1" opacity="0.6" />

                  {/* Cánh tay cầm ấm rót nước hoặc đưa cốc */}
                  {serverState === 'pouring_tea' ? (
                    <g className="animate-pulse">
                      {/* Cánh tay nghiêng ấm trà Rạng Đông rót nước */}
                      <path
                        d="M58 56 L 78 72 L 90 78"
                        stroke="#d97706"
                        strokeWidth="7"
                        strokeLinecap="round"
                        fill="none"
                      />
                      {/* Ấm trà / Phích nước màu đỏ nghiêng */}
                      <rect
                        x="84"
                        y="68"
                        width="15"
                        height="24"
                        rx="3"
                        fill="#dc2626"
                        transform="rotate(25 90 80)"
                        stroke="#7f1d1d"
                        strokeWidth="1.2"
                      />
                      {/* Vòi rót dòng trà vàng */}
                      <path d="M96 86 L 98 108" stroke="#fef08a" strokeWidth="2.5" strokeDasharray="3 2" />
                    </g>
                  ) : (
                    <g>
                      {/* Cánh tay gác quầy tươi cười */}
                      <path
                        d="M58 56 L 75 75 L 82 92"
                        stroke="#d97706"
                        strokeWidth="7"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <ellipse cx="82" cy="94" rx="5" ry="4" fill="#d97706" />
                    </g>
                  )}
                  {/* Váy / Quần */}
                  <path d="M32 125 L 68 125 L 66 170 L 34 170 Z" fill="#1e293b" />
                  <ellipse cx="45" cy="172" rx="8" ry="3.5" fill="#0f172a" />
                  <ellipse cx="58" cy="172" rx="8" ry="3.5" fill="#0f172a" />
                </svg>
              </div>

              {/* Chiếc bàn gỗ / Quầy nước vỉa hè với đồ nghề chân thực */}
              <div className="absolute bottom-0 right-0 w-36 h-28 z-20">
                <svg viewBox="0 0 160 120" className="w-full h-full drop-shadow-xl">
                  {/* Mặt bàn gỗ mộc mạc */}
                  <rect x="10" y="38" width="140" height="12" rx="3" fill="#78350f" stroke="#451a03" strokeWidth="1.5" />
                  {/* Chân bàn */}
                  <rect x="22" y="50" width="8" height="65" fill="#451a03" />
                  <rect x="130" y="50" width="8" height="65" fill="#451a03" />

                  {/* Bình thủy / Phích nước Rạng Đông đỏ hoa văn */}
                  <rect x="25" y="10" width="18" height="30" rx="3" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
                  <rect x="28" y="5" width="12" height="6" rx="2" fill="#cbd5e1" />
                  <circle cx="34" cy="24" r="4" fill="#fef08a" opacity="0.9" />

                  {/* Thùng đá giữ nhiệt màu xanh dương */}
                  <rect x="52" y="16" width="28" height="24" rx="4" fill="#0284c7" stroke="#0369a1" strokeWidth="1.5" />
                  <rect x="50" y="14" width="32" height="5" rx="2" fill="#38bdf8" />

                  {/* Khay cốc trà đá / ly cà phê xếp chồng */}
                  <rect x="90" y="32" width="46" height="7" rx="2" fill="#a1a1aa" />
                  {/* 3 cốc trà đá trong suốt có nước vàng và đá viên */}
                  <rect x="94" y="16" width="10" height="17" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" opacity="0.85" />
                  <rect x="107" y="14" width="10" height="19" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" opacity="0.9" />
                  <rect x="120" y="16" width="10" height="17" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" opacity="0.85" />
                  {/* Ống hút & Thìa kim loại */}
                  <line x1="112" y1="8" x2="114" y2="28" stroke="#ef4444" strokeWidth="1.5" />
                  <line x1="125" y1="10" x2="127" y2="28" stroke="#3b82f6" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* 4. NHÂN VẬT CHÍNH: KHÁCH XEM CỜ (BÁC BA) - GỌI ĐỒ UỐNG, ĐỨNG LÊN LẤY NƯỚC, UỐNG VÀ ĐI VỀ */}
        {isWalkersEnabled && (
          <div
            className="absolute pointer-events-none transition-all duration-300 z-20"
            style={{
              left: `${uncleX}%`,
              bottom: isWideLayout ? '12%' : '8%',
              transform: `scale(${isWideLayout ? 1.05 : 0.88}) ${
                uncleFacing === 'left' ? 'scaleX(-1)' : 'scaleX(1)'
              }`,
              transformOrigin: 'bottom center',
            }}
          >
            {/* Bong bóng lời thoại của Bác Ba */}
            {uncleSpeech && (
              <div
                className="absolute -top-16 left-1/2 -translate-x-1/2 bg-stone-950/95 text-amber-200 border border-amber-500/70 text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md whitespace-nowrap animate-bounce z-40"
                style={{
                  transform: uncleFacing === 'left' ? 'scaleX(-1) translateX(50%)' : 'translateX(-50%)',
                }}
              >
                <span>{uncleSpeech}</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-500/70" />
              </div>
            )}

            {/* Bóng đổ dưới chân */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-black/55 rounded-full filter blur-[3px] scale-y-75" />

            {/* Chiếc ghế nhựa xanh lúc bác Ba ngồi hoặc rời ghế */}
            <div className="absolute bottom-1 left-2 w-14 h-12 z-0">
              <svg viewBox="0 0 60 50" className="w-full h-full drop-shadow-md">
                <rect x="10" y="16" width="40" height="7" rx="2" fill="#1e40af" stroke="#172554" strokeWidth="1.5" />
                <path d="M14 23 L10 46" stroke="#1e40af" strokeWidth="4" strokeLinecap="round" />
                <path d="M46 23 L50 46" stroke="#1e40af" strokeWidth="4" strokeLinecap="round" />
                <path d="M26 23 L24 45" stroke="#172554" strokeWidth="3" strokeLinecap="round" />
                <path d="M34 23 L36 45" stroke="#172554" strokeWidth="3" strokeLinecap="round" />
                {/* Chiếc bàn con và cốc nước đặt cạnh ghế khi ngồi */}
                {uncleState.startsWith('sitting') && (
                  <g>
                    <rect x="52" y="26" width="7" height="12" rx="1" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" opacity="0.9" />
                    <line x1="56" y1="21" x2="57" y2="34" stroke="#ef4444" strokeWidth="1" />
                  </g>
                )}
              </svg>
            </div>

            {/* Hình thể Bác Ba với các trạng thái hoạt ảnh sinh động */}
            <div
              className={`relative w-28 h-52 filter contrast-105 drop-shadow-xl ${
                uncleState === 'standing_up'
                  ? 'animate-stand-up'
                  : uncleState === 'sitting_down'
                  ? 'animate-sit-down'
                  : ''
              }`}
            >
              <svg viewBox="0 0 100 180" className="w-full h-full">
                <defs>
                  <linearGradient id="skinG" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                  <linearGradient id="shirtG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f1f5f9" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>
                  <linearGradient id="pantsG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>

                {/* --- TRẠNG THÁI A: NGỒI THƯ THÁI XEM CỜ (SITTING_RELAX) --- */}
                {uncleState === 'sitting_relax' && (
                  <g className="animate-pulse" style={{ animationDuration: '4s' }}>
                    <circle cx="48" cy="40" r="14" fill="url(#skinG)" />
                    <path d="M36 34 Q 48 24 60 34 Q 48 28 36 34" fill="#57534e" />
                    <circle cx="56" cy="40" r="2.5" fill="#1c1917" />
                    <path d="M36 54 Q 30 78 36 98 L 62 98 Q 66 74 58 54 Z" fill="url(#shirtG)" stroke="#475569" strokeWidth="1.5" />
                    {/* Tay chống cằm suy ngẫm nước cờ */}
                    <path d="M58 64 L 68 85 L 56 50" stroke="url(#skinG)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M38 64 L 44 88 L 54 88" stroke="url(#skinG)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    {/* Chân gập ngồi */}
                    <path d="M36 98 Q 58 98 68 116 L 62 144" stroke="url(#pantsG)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M34 98 Q 42 108 46 142" stroke="url(#pantsG)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <ellipse cx="64" cy="146" rx="9" ry="3.5" fill="#0f172a" />
                    <ellipse cx="48" cy="144" rx="8" ry="3.5" fill="#0f172a" />
                  </g>
                )}

                {/* --- TRẠNG THÁI B: GIƠ TAY GỌI ĐỒ UỐNG (CALLING_DRINK) --- */}
                {uncleState === 'calling_drink' && (
                  <g>
                    {/* Đầu ngước về phía quầy trà đá */}
                    <circle cx="50" cy="38" r="14" fill="url(#skinG)" />
                    <path d="M38 32 Q 50 22 62 32 Q 50 26 38 32" fill="#57534e" />
                    <circle cx="58" cy="38" r="2.5" fill="#1c1917" />
                    {/* Miệng mở gọi to */}
                    <ellipse cx="60" cy="45" rx="3.5" ry="4" fill="#451a03" />

                    <path d="M36 54 Q 30 78 36 98 L 62 98 Q 66 74 58 54 Z" fill="url(#shirtG)" stroke="#475569" strokeWidth="1.5" />
                    {/* Cánh tay phải GIƠ CAO VẪY GỌI ĐỒ UỐNG RẤT SINH ĐỘNG */}
                    <g className="animate-bounce" style={{ animationDuration: '0.9s' }}>
                      <path d="M58 64 L 75 42 L 85 18" stroke="url(#skinG)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      {/* Bàn tay vẫy chào */}
                      <circle cx="86" cy="16" r="4.5" fill="url(#skinG)" />
                      <line x1="86" y1="12" x2="88" y2="8" stroke="url(#skinG)" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="89" y1="13" x2="92" y2="10" stroke="url(#skinG)" strokeWidth="2.5" strokeLinecap="round" />
                    </g>
                    {/* Chân gập ngồi */}
                    <path d="M36 98 Q 58 98 68 116 L 62 144" stroke="url(#pantsG)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M34 98 Q 42 108 46 142" stroke="url(#pantsG)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <ellipse cx="64" cy="146" rx="9" ry="3.5" fill="#0f172a" />
                    <ellipse cx="48" cy="144" rx="8" ry="3.5" fill="#0f172a" />
                  </g>
                )}

                {/* --- TRẠNG THÁI C: ĐI BỘ (WALKING_TO_STALL HOẶC WALKING_BACK) --- */}
                {(uncleState === 'walking_to_stall' || uncleState === 'walking_back') && (
                  <g className="animate-walk-bob">
                    {/* Chân trái */}
                    <g className="animate-walk-leg-left">
                      <path d="M44 100 L 40 136 L 38 168" stroke="url(#pantsG)" strokeWidth="11" strokeLinecap="round" fill="none" />
                      <ellipse cx="40" cy="170" rx="9" ry="3.5" fill="#0f172a" />
                    </g>
                    {/* Chân phải */}
                    <g className="animate-walk-leg-right">
                      <path d="M56 100 L 60 136 L 64 168" stroke="url(#pantsG)" strokeWidth="11" strokeLinecap="round" fill="none" />
                      <ellipse cx="66" cy="170" rx="9" ry="3.5" fill="#0f172a" />
                    </g>

                    {/* Thân áo */}
                    <path d="M34 50 Q 32 78 38 102 L 62 102 Q 68 76 66 50 Z" fill="url(#shirtG)" stroke="#475569" strokeWidth="1.5" />
                    <rect x="36" y="99" width="28" height="5" rx="1" fill="#0f172a" />
                    <circle cx="50" cy="30" r="13" fill="url(#skinG)" />
                    <path d="M38 24 Q 50 14 62 24 Q 50 19 38 24" fill="#57534e" />
                    <circle cx="58" cy="30" r="2.2" fill="#1c1917" />

                    {/* Nếu đang cầm cốc trà đá trên tay khi đi về */}
                    {uncleHasGlass ? (
                      <g>
                        <path d="M58 54 L 72 75 L 75 88" stroke="url(#shirtG)" strokeWidth="8" strokeLinecap="round" fill="none" />
                        <ellipse cx="75" cy="88" rx="4.5" ry="4" fill="url(#skinG)" />
                        {/* Cốc trà đá cầm trên tay */}
                        <rect x="73" y="78" width="9" height="15" rx="2" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
                        <line x1="77" y1="73" x2="78" y2="88" stroke="#ef4444" strokeWidth="1.2" />
                      </g>
                    ) : (
                      // Đi thong dong chắp tay sau lưng
                      <g className="animate-walk-arm-left">
                        <path d="M34 54 Q 26 75 38 88 L 48 86" stroke="url(#shirtG)" strokeWidth="8" strokeLinecap="round" fill="none" />
                        <path d="M66 54 Q 74 75 62 88 L 52 86" stroke="url(#shirtG)" strokeWidth="8" strokeLinecap="round" fill="none" />
                      </g>
                    )}
                  </g>
                )}

                {/* --- TRẠNG THÁI D: ĐẾN QUẦY NHẬN NƯỚC (RECEIVING_DRINK) --- */}
                {uncleState === 'receiving_drink' && (
                  <g>
                    <path d="M44 100 L 44 168 M 56 100 L 56 168" stroke="url(#pantsG)" strokeWidth="11" strokeLinecap="round" fill="none" />
                    <ellipse cx="44" cy="170" rx="9" ry="3.5" fill="#0f172a" />
                    <ellipse cx="56" cy="170" rx="9" ry="3.5" fill="#0f172a" />
                    <path d="M34 50 Q 32 78 38 102 L 62 102 Q 68 76 66 50 Z" fill="url(#shirtG)" stroke="#475569" strokeWidth="1.5" />
                    <circle cx="50" cy="30" r="13" fill="url(#skinG)" />
                    <path d="M38 24 Q 50 14 62 24" fill="#57534e" />
                    <circle cx="58" cy="30" r="2.2" fill="#1c1917" />
                    {/* Hai tay đưa ra phía trước đón nhận cốc nước từ cô chủ quán */}
                    <path d="M58 56 L 78 72 L 92 72" stroke="url(#skinG)" strokeWidth="6.5" strokeLinecap="round" fill="none" />
                    <rect x="88" y="64" width="10" height="17" rx="2" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
                  </g>
                )}

                {/* --- TRẠNG THÁI E: UỐNG MỘT NGỤM TRÀ SẢNG KHOÁI (DRINKING_SIP) --- */}
                {uncleState === 'drinking_sip' && (
                  <g className="animate-pulse" style={{ animationDuration: '1.2s' }}>
                    <path d="M44 100 L 44 168 M 56 100 L 56 168" stroke="url(#pantsG)" strokeWidth="11" strokeLinecap="round" fill="none" />
                    <ellipse cx="44" cy="170" rx="9" ry="3.5" fill="#0f172a" />
                    <ellipse cx="56" cy="170" rx="9" ry="3.5" fill="#0f172a" />
                    <path d="M34 50 Q 32 78 38 102 L 62 102 Q 68 76 66 50 Z" fill="url(#shirtG)" stroke="#475569" strokeWidth="1.5" />
                    <circle cx="50" cy="30" r="13" fill="url(#skinG)" />
                    {/* Đầu hơi ngửa lên uống nước */}
                    <path d="M38 20 Q 50 12 62 20" fill="#57534e" />
                    {/* Cánh tay nâng cốc trà lên sát miệng */}
                    <path d="M58 56 L 72 45 L 64 36" stroke="url(#skinG)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <rect x="60" y="28" width="9" height="16" rx="2" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" transform="rotate(-15 64 36)" />
                  </g>
                )}
              </svg>
            </div>
          </div>
        )}

        {/* 5. LỚP VIGNETTE BÓNG ĐEN BÀN CỜ ĐỂ BÀN CỜ LUÔN NỔI BẬT & KHÔNG BỊ CHÓI */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0.14) 0%, rgba(20,12,6,0.50) 58%, rgba(6,3,1,0.92) 100%)',
          }}
        />
      </div>

      {/* 6. THANH ĐIỀU KHIỂN TINH TẾ GÓC MÀN HÌNH: CÓ 2 NÚT "GỌI ĐỒ UỐNG" & "LẤY ĐỒ UỐNG" TRỰC TIẾP */}
      <div className="fixed bottom-2 left-2 z-30 pointer-events-auto flex items-center gap-1.5 bg-stone-950/90 backdrop-blur-md border border-white/10 px-2 py-1 rounded-full shadow-2xl text-[10px] sm:text-xs">
        {/* Nút bật/tắt người đi lại */}
        <button
          type="button"
          onClick={toggleWalkers}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-colors font-medium ${
            isWalkersEnabled
              ? 'text-amber-300 hover:text-amber-200 bg-amber-950/60'
              : 'text-stone-400 hover:text-stone-300'
          }`}
          title={isWalkersEnabled ? 'Đang bật nhân vật chuyển động (Click để tắt)' : 'Đã tắt nhân vật chuyển động (Click để bật)'}
        >
          <Footprints className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Nhân vật:</span>
          <span className="font-bold">{isWalkersEnabled ? 'Bật' : 'Tắt'}</span>
        </button>

        {isWalkersEnabled && (
          <>
            {/* Nút 1: GỌI ĐỒ UỐNG NGAY */}
            <button
              type="button"
              onClick={() => triggerCallingDrink()}
              disabled={uncleState !== 'sitting_relax'}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40 font-semibold active:scale-95 transition-all disabled:opacity-50"
              title="Khách giơ tay gọi đồ uống, chủ quán rót nước và đáp lời ngay!"
            >
              <Coffee className="w-3 h-3 text-amber-300" />
              <span>Gọi đồ uống</span>
            </button>

            {/* Nút 2: ĐỨNG LÊN LẤY NƯỚC NGAY */}
            <button
              type="button"
              onClick={triggerStandingUpToGetDrink}
              disabled={uncleState !== 'sitting_relax'}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 border border-emerald-500/40 font-semibold active:scale-95 transition-all disabled:opacity-50"
              title="Khách đứng dậy, sải bước sang quầy lấy nước, uống ngụm trà mát lạnh rồi về chỗ!"
            >
              <UserCheck className="w-3 h-3 text-emerald-300" />
              <span>Lấy đồ uống</span>
            </button>

            {/* Nút 3: THỬ TIẾNG RAO HÀNG RONG NGOÀI ĐƯỜNG */}
            {(scene === 'tra_da' || scene === 'ca_phe') && (
              <button
                type="button"
                onClick={triggerStreetVendorCry}
                disabled={streetVendorActive}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 hover:bg-sky-500/35 text-sky-200 border border-sky-500/40 font-semibold active:scale-95 transition-all disabled:opacity-50"
                title="Tiếng rao hàng rong ngoài đường (Bánh mì nóng giòn, tào phớ, bắp xào...)"
              >
                <Megaphone className="w-3 h-3 text-sky-300" />
                <span className="hidden sm:inline">Tiếng rao</span>
                <span className="sm:hidden">Rao</span>
              </button>
            )}
          </>
        )}

        {/* Nút bật/tắt ảnh động nền */}
        <button
          type="button"
          onClick={toggleAnimation}
          className={`p-1 rounded-full transition-colors ${
            isAnimationEnabled ? 'text-amber-400 hover:text-amber-300' : 'text-stone-500 hover:text-stone-400'
          }`}
          title={isAnimationEnabled ? 'Ảnh động nền đang bật' : 'Ảnh động nền đang tắt'}
        >
          {isAnimationEnabled ? <Sparkles className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
