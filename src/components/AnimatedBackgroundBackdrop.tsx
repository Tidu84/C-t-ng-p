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

  // Hiệu ứng chớp mắt ngẫu nhiên sống động (Dynamic Randomized Blink State)
  const [uncleIsBlinking, setUncleIsBlinking] = useState<boolean>(false);
  const [serverIsBlinking, setServerIsBlinking] = useState<boolean>(false);

  // Random blink timer cho nhân vật khách (Bác Ba)
  useEffect(() => {
    if (!isWalkersEnabled) return;
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleUncleBlink = () => {
      // Khoảng thời gian ngẫu nhiên 2.5s - 5.5s giữa các lần chớp mắt
      const nextDelay = 2500 + Math.random() * 3000;
      timeoutId = setTimeout(() => {
        setUncleIsBlinking(true);
        // Nhắm mắt trong 110ms - 150ms rồi mở lại
        setTimeout(() => {
          setUncleIsBlinking(false);
          // 25% cơ hội double-blink (chớp mắt 2 cái liên tiếp siêu đáng yêu)
          if (Math.random() < 0.25) {
            setTimeout(() => {
              setUncleIsBlinking(true);
              setTimeout(() => setUncleIsBlinking(false), 90);
            }, 120);
          }
        }, 120);

        scheduleUncleBlink();
      }, nextDelay);
    };

    scheduleUncleBlink();
    return () => clearTimeout(timeoutId);
  }, [isWalkersEnabled]);

  // Random blink timer cho cô chủ quán
  useEffect(() => {
    if (!isWalkersEnabled) return;
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleServerBlink = () => {
      // Độ trễ ngẫu nhiên 2.8s - 6s lệch pha với Bác Ba để tạo sự tự nhiên
      const nextDelay = 2800 + Math.random() * 3200;
      timeoutId = setTimeout(() => {
        setServerIsBlinking(true);
        setTimeout(() => {
          setServerIsBlinking(false);
          if (Math.random() < 0.3) {
            setTimeout(() => {
              setServerIsBlinking(true);
              setTimeout(() => setServerIsBlinking(false), 90);
            }, 130);
          }
        }, 120);

        scheduleServerBlink();
      }, nextDelay);
    };

    scheduleServerBlink();
    return () => clearTimeout(timeoutId);
  }, [isWalkersEnabled]);

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

            {/* Bóng xe đạp Chibi lướt qua ở xa trên phố (Quán trà đá) */}
            {scene === 'tra_da' && cyclistActive && (
              <div
                className="absolute bottom-[44%] -left-[10%] w-24 h-18 pointer-events-none filter blur-[0.6px] opacity-60 transition-transform duration-[8500ms] ease-linear"
                style={{
                  transform: cyclistActive ? 'translateX(130vw)' : 'translateX(0)',
                }}
              >
                <svg viewBox="0 0 100 70" className="w-full h-full">
                  {/* Bánh xe tròn múp */}
                  <circle cx="22" cy="50" r="14" fill="#38bdf8" stroke="#0284c7" strokeWidth="2.5" opacity="0.8" />
                  <circle cx="22" cy="50" r="4" fill="#0f172a" />
                  <circle cx="78" cy="50" r="14" fill="#38bdf8" stroke="#0284c7" strokeWidth="2.5" opacity="0.8" />
                  <circle cx="78" cy="50" r="4" fill="#0f172a" />
                  <path d="M22 50 L45 50 L65 30 L36 30 Z" fill="none" stroke="#e11d48" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Chibi em bé đạp xe đầu to tròn đội mũ bảo hiểm mini */}
                  <circle cx="44" cy="18" r="11" fill="#fed7aa" />
                  <path d="M33 16 C 35 6, 53 6, 55 16 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />
                  {/* Mắt chớp nhỏ */}
                  <circle cx="48" cy="18" r="1.5" fill="#1e1b4b" />
                  {/* Thân áo & chân đạp */}
                  <ellipse cx="44" cy="34" rx="8" ry="7" fill="#3b82f6" />
                  <path d="M44 38 L 48 50" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
            )}

            {/* Người bán hàng rong Chibi đi qua ở xa ngoài đường (Quán trà đá & Cà phê) */}
            {(scene === 'tra_da' || scene === 'ca_phe') && streetVendorActive && (
              <div
                className="absolute bottom-[41%] -left-[14%] w-32 h-24 pointer-events-none filter blur-[0.5px] opacity-80 transition-transform duration-[8200ms] ease-linear z-10"
                style={{
                  transform: streetVendorActive ? 'translateX(130vw)' : 'translateX(0)',
                }}
              >
                {/* Lời rao hàng rong ngoài đường phố */}
                {vendorQuote && (
                  <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-amber-950/95 text-amber-200 border border-amber-400/80 text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-xl whitespace-nowrap animate-bounce">
                    <span>📣 {vendorQuote}</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-400/80" />
                  </div>
                )}
                {/* Cô bán hàng Chibi gánh hàng rong nón lá xinh xắn */}
                <svg viewBox="0 0 130 90" className="w-full h-full drop-shadow-md">
                  {/* Đòn gánh uốn cong mềm mại */}
                  <path d="M15 44 Q 65 34 115 44" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  {/* Thúng hàng 1 bên trái tròn trĩnh */}
                  <path d="M22 44 L 16 66 L 36 66 Z" fill="none" stroke="#92400e" strokeWidth="1.5" />
                  <ellipse cx="26" cy="66" rx="14" ry="6" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
                  <ellipse cx="26" cy="64" rx="10" ry="3" fill="#fef08a" />

                  {/* Thúng hàng 2 bên phải tròn trĩnh */}
                  <path d="M108 44 L 102 66 L 122 66 Z" fill="none" stroke="#92400e" strokeWidth="1.5" />
                  <ellipse cx="112" cy="66" rx="14" ry="6" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
                  <ellipse cx="112" cy="64" rx="10" ry="3" fill="#fef08a" />

                  {/* Thân người Chibi ở giữa */}
                  <ellipse cx="65" cy="54" rx="12" ry="11" fill="#ec4899" stroke="#be185d" strokeWidth="1" />
                  {/* Đôi chân Chibi bước thoăn thoắt */}
                  <path d="M60 64 L 56 78 M 70 64 L 74 78" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
                  <ellipse cx="55" cy="80" rx="5" ry="3" fill="#0f172a" />
                  <ellipse cx="75" cy="80" rx="5" ry="3" fill="#0f172a" />

                  {/* Đầu Chibi tròn xoe */}
                  <circle cx="65" cy="30" r="14" fill="#fed7aa" />
                  <circle cx="58" cy="36" r="3.5" fill="#fb7185" opacity="0.6" />
                  <circle cx="72" cy="36" r="3.5" fill="#fb7185" opacity="0.6" />
                  {/* Mắt cười híp mí siêu yêu */}
                  <path d="M57 30 Q 60 27 63 30" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M67 30 Q 70 27 73 30" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M63 35 Q 65 37 67 35" stroke="#be123c" strokeWidth="1.5" strokeLinecap="round" fill="none" />

                  {/* Chiếc nón lá Chibi chóp nón xinh xắn */}
                  <polygon points="65,10 40,24 90,24" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
                  <path d="M40 24 Q 65 26 90 24" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
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

            {/* Hình thể Cô Chủ Quán Chibi đáng yêu & Quầy nước vỉa hè chuẩn đẹp */}
            <div className="relative w-52 h-62">
              {/* Cô chủ quán phong cách Chibi siêu dễ thương, đứng cân đối sau quầy */}
              <div className="absolute bottom-8 left-6 w-32 h-50 z-10 animate-chibi-idle">
                <svg viewBox="0 0 120 180" className="w-full h-full drop-shadow-xl overflow-visible">
                  <defs>
                    {/* Da Chibi mịn màng ửng hồng */}
                    <linearGradient id="chibiGirlSkin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fff7ed" />
                      <stop offset="60%" stopColor="#ffedd5" />
                      <stop offset="100%" stopColor="#fed7aa" />
                    </linearGradient>
                    {/* Tóc đen nâu ánh than mềm mại */}
                    <linearGradient id="chibiHairGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2d2b38" />
                      <stop offset="65%" stopColor="#1f1d2b" />
                      <stop offset="100%" stopColor="#14131d" />
                    </linearGradient>
                    {/* Áo xanh pastel nhã nhặn */}
                    <linearGradient id="chibiShirtGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#bae6fd" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                    {/* Tạp dề hồng dâu ngọt ngào */}
                    <linearGradient id="chibiApronGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb7185" />
                      <stop offset="100%" stopColor="#e11d48" />
                    </linearGradient>
                    {/* Mắt Chibi lung linh anime */}
                    <linearGradient id="chibiEyeIris" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e1b4b" />
                      <stop offset="60%" stopColor="#312e81" />
                      <stop offset="100%" stopColor="#4338ca" />
                    </linearGradient>
                    {/* Ấm trà nhôm Rạng Đông đỏ son */}
                    <linearGradient id="chibiKettle" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f87171" />
                      <stop offset="40%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#b91c1c" />
                    </linearGradient>
                  </defs>

                  {/* 1. TÓC PHÍA SAU ĐẦU (BACK HAIR) */}
                  <ellipse cx="60" cy="54" rx="35" ry="34" fill="url(#chibiHairGrad)" />
                  {/* Búi tóc củ tỏi tròn xinh trên đỉnh đầu */}
                  <circle cx="60" cy="20" r="14" fill="url(#chibiHairGrad)" />
                  {/* Bông hoa anh đào/hoa đào hồng cài búi tóc */}
                  <circle cx="68" cy="21" r="6" fill="#fb7185" />
                  <circle cx="68" cy="21" r="2.5" fill="#fef08a" />
                  {/* Dải ruy băng hồng bay nhẹ */}
                  <path d="M72 24 Q 77 30 75 36" stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round" fill="none" />

                  {/* 2. CHÂN & ĐÔI GIÀY BÚP BÊ CHIBI XINH XẮN */}
                  <ellipse cx="49" cy="158" rx="8" ry="5.5" fill="#e11d48" />
                  <ellipse cx="71" cy="158" rx="8" ry="5.5" fill="#e11d48" />
                  <ellipse cx="49" cy="157" rx="6" ry="3.5" fill="#fb7185" />
                  <ellipse cx="71" cy="157" rx="6" ry="3.5" fill="#fb7185" />

                  {/* 3. THÂN NGƯỜI CHIBI: ÁO XANH & TẠP DÈ HỒNG */}
                  <path
                    d="M44 94 Q 38 126 40 148 L 80 148 Q 82 126 76 94 Z"
                    fill="url(#chibiShirtGrad)"
                    stroke="#0284c7"
                    strokeWidth="1.2"
                  />
                  {/* Tạp dề hồng dâu viền ren */}
                  <path
                    d="M47 98 L 73 98 L 76 148 L 44 148 Z"
                    fill="url(#chibiApronGrad)"
                    stroke="#be123c"
                    strokeWidth="1.2"
                  />
                  {/* Dây đeo tạp dề */}
                  <line x1="49" y1="94" x2="48" y2="108" stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="71" y1="94" x2="72" y2="108" stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round" />
                  {/* Túi tạp dề có thêu chiếc lá trà xanh */}
                  <rect x="52" y="120" width="16" height="15" rx="3" fill="#fecdd3" stroke="#f43f5e" strokeWidth="1" />
                  <path d="M60 124 Q 64 127 60 131 Q 56 127 60 124 Z" fill="#16a34a" />

                  {/* 4. ĐẦU CHIBI TRÒN XINH, MÁ PHÚNG PHÍNH (TỶ LỆ CHUẨN ANIME CHIBI) */}
                  <path
                    d="M28 54 C 27 78, 40 92, 60 92 C 80 92, 93 78, 92 54 C 92 34, 28 34, 28 54 Z"
                    fill="url(#chibiGirlSkin)"
                    stroke="#fed7aa"
                    strokeWidth="0.8"
                  />
                  {/* Tai chibi tròn xinh xắn */}
                  <ellipse cx="26" cy="62" rx="4.5" ry="6" fill="#fecdd3" />
                  <ellipse cx="94" cy="62" rx="4.5" ry="6" fill="#fecdd3" />
                  {/* Khuyên tai ngọc trai nhỏ */}
                  <circle cx="26" cy="66" r="1.8" fill="#ffffff" />
                  <circle cx="94" cy="66" r="1.8" fill="#ffffff" />

                  {/* Cổ áo lá sen trắng thanh lịch */}
                  <path d="M50 94 Q 56 99 60 95 Q 64 99 70 94" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />

                  {/* Lọn tóc mai ôm nhẹ hai bên má */}
                  <path d="M26 48 Q 23 68 28 76 Q 30 68 31 54 Z" fill="url(#chibiHairGrad)" />
                  <path d="M94 48 Q 97 68 92 76 Q 90 68 89 54 Z" fill="url(#chibiHairGrad)" />

                  {/* Tóc mái thưa Chibi búp bê ngọt ngào uốn nhẹ */}
                  <path
                    d="M28 42 C 34 32, 86 32, 92 42 C 90 53, 82 51, 76 56 C 72 49, 66 49, 60 55 C 54 49, 48 49, 44 56 C 38 51, 30 53, 28 42 Z"
                    fill="url(#chibiHairGrad)"
                  />
                  {/* Vòng sáng bóng tóc (Angel Ring Highlight) */}
                  <path d="M36 38 Q 60 33 84 38" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.38" fill="none" />

                  {/* Đôi lông mày thanh tú cong nhẹ */}
                  <path d="M40 52 Q 47 48 54 51" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  <path d="M66 51 Q 73 48 80 52" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" fill="none" />

                  {/* ĐÔI MẮT CHIBI ANIME LONG LANH TO TRÒN CỰC KỲ DỄ THƯƠNG */}
                  <g
                    className={`animate-chibi-blink-alt ${serverIsBlinking ? 'chibi-eye-blinking' : 'chibi-eye-open'}`}
                    style={{ transformOrigin: '60px 62px' }}
                  >
                    {/* Mắt trái */}
                    <ellipse cx="47" cy="62" rx="6.5" ry="7.5" fill="url(#chibiEyeIris)" />
                    <path d="M43 64 Q 47 68 51 64" stroke="#f43f5e" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.75" />
                    <circle cx="45" cy="59.5" r="2.8" fill="#ffffff" />
                    <circle cx="49" cy="64.5" r="1.4" fill="#ffffff" />
                    {/* Hàng mi cong vút */}
                    <path d="M39 56 Q 47 52 55 57" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                    <path d="M39 56 L 37 54" stroke="#18181b" strokeWidth="1.6" strokeLinecap="round" />

                    {/* Mắt phải */}
                    <ellipse cx="73" cy="62" rx="6.5" ry="7.5" fill="url(#chibiEyeIris)" />
                    <path d="M69 64 Q 73 68 77 64" stroke="#f43f5e" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.75" />
                    <circle cx="71" cy="59.5" r="2.8" fill="#ffffff" />
                    <circle cx="75" cy="64.5" r="1.4" fill="#ffffff" />
                    {/* Hàng mi cong vút */}
                    <path d="M65 57 Q 73 52 81 56" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                    <path d="M81 56 L 83 54" stroke="#18181b" strokeWidth="1.6" strokeLinecap="round" />
                  </g>

                  {/* ĐÔI MÁ HỒNG BÁNH BAO PHÚNG PHÍNH & ĐIỂM SÁNG LẤP LÁNH */}
                  <ellipse cx="37" cy="72" rx="7" ry="4.5" fill="#fb7185" opacity="0.6" />
                  <ellipse cx="83" cy="72" rx="7" ry="4.5" fill="#fb7185" opacity="0.6" />
                  <circle cx="36" cy="71" r="1.5" fill="#ffffff" opacity="0.8" />
                  <circle cx="84" cy="71" r="1.5" fill="#ffffff" opacity="0.8" />

                  {/* Chấm mũi nhỏ xíu & Miệng cười chúm chím hình hoa */}
                  <circle cx="60" cy="69" r="0.8" fill="#f43f5e" opacity="0.6" />
                  <path d="M55 75 Q 60 80 65 75" stroke="#be123c" strokeWidth="2.2" strokeLinecap="round" fill="#fda4af" />

                  {/* 5. CÁC TƯ THẾ TAY CHIBI KHÔNG BỊ LỆCH HAY CO KÉO */}
                  {serverState === 'pouring_tea' ? (
                    <g>
                      {/* Tay trái gác mép bàn tự nhiên */}
                      <path d="M42 98 Q 32 108 38 118" stroke="url(#chibiGirlSkin)" strokeWidth="6" strokeLinecap="round" fill="none" />
                      <circle cx="39" cy="118" r="4" fill="url(#chibiGirlSkin)" />

                      {/* Tay phải nghiêng ấm rót trà điệu nghệ */}
                      <path d="M76 98 Q 92 100 100 94" stroke="url(#chibiGirlSkin)" strokeWidth="6" strokeLinecap="round" fill="none" />
                      <g transform="translate(12, 0)">
                        {/* Thân ấm nhôm tròn xinh đỏ Rạng Đông */}
                        <rect x="88" y="80" width="20" height="24" rx="5" fill="url(#chibiKettle)" stroke="#991b1b" strokeWidth="1.2" transform="rotate(28 98 92)" />
                        <ellipse cx="98" cy="80" rx="7" ry="3.5" fill="#fca5a5" transform="rotate(28 98 92)" />
                        {/* Quai ấm */}
                        <path d="M84 84 Q 78 92 86 98" stroke="#7f1d1d" strokeWidth="2.5" fill="none" />
                        {/* Vòi ấm */}
                        <path d="M110 93 L 118 96" stroke="#b91c1c" strokeWidth="3.2" strokeLinecap="round" />
                        {/* Dòng nước trà vàng óng ánh chảy xuống cốc */}
                        <path d="M118 97 Q 120 115 118 132" stroke="#f59e0b" strokeWidth="3.2" strokeDasharray="5 3" strokeLinecap="round" className="animate-tea-flow" />
                        <circle cx="118" cy="133" r="2.5" fill="#fef08a" opacity="0.9" />
                      </g>
                    </g>
                  ) : (
                    <g>
                      {/* Tay trái đặt cạnh eo nhẹ nhàng */}
                      <path d="M42 98 Q 32 108 38 118" stroke="url(#chibiGirlSkin)" strokeWidth="6" strokeLinecap="round" fill="none" />
                      <circle cx="39" cy="118" r="4" fill="url(#chibiGirlSkin)" />

                      {/* Tay phải vẫy nhẹ chào khách đon đả (Dùng keyframe animate-chibi-wave an toàn) */}
                      <g className="animate-chibi-wave">
                        <path d="M76 98 Q 90 102 96 90" stroke="url(#chibiGirlSkin)" strokeWidth="6" strokeLinecap="round" fill="none" />
                        <circle cx="97" cy="88" r="4.5" fill="url(#chibiGirlSkin)" />
                        <ellipse cx="98" cy="84" rx="2" ry="3.5" fill="url(#chibiGirlSkin)" />
                      </g>
                    </g>
                  )}
                </svg>
              </div>

              {/* Chiếc bàn gỗ / Quầy nước phong cách Chibi tròn trịa xinh xắn */}
              <div className="absolute bottom-0 right-0 w-44 h-34 z-20">
                <svg viewBox="0 0 176 130" className="w-full h-full drop-shadow-2xl">
                  {/* Mặt quầy gỗ bo tròn góc ấm áp */}
                  <rect x="8" y="40" width="160" height="16" rx="8" fill="#b45309" stroke="#78350f" strokeWidth="2" />
                  <rect x="12" y="42" width="152" height="5" rx="2" fill="#f59e0b" opacity="0.7" />
                  {/* Thân quầy gỗ màu nâu cánh gián */}
                  <rect x="16" y="56" width="144" height="66" rx="5" fill="#92400e" stroke="#78350f" strokeWidth="1.5" />
                  {/* Các nan gỗ trang trí đối xứng đẹp mắt */}
                  <rect x="22" y="62" width="26" height="54" rx="3" fill="#78350f" />
                  <rect x="54" y="62" width="30" height="54" rx="3" fill="#78350f" />
                  <rect x="90" y="62" width="30" height="54" rx="3" fill="#78350f" />
                  <rect x="126" y="62" width="28" height="54" rx="3" fill="#78350f" />

                  {/* Phích nước Rạng Đông đỏ sọc vàng kinh điển phong cách Chibi */}
                  <rect x="20" y="14" width="22" height="28" rx="6" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
                  <rect x="23" y="10" width="16" height="6" rx="3" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                  <circle cx="31" cy="26" r="5" fill="#fef08a" />
                  <circle cx="31" cy="26" r="2.5" fill="#f59e0b" />

                  {/* Thùng giữ nhiệt đá xanh ngọc bích mát lạnh */}
                  <rect x="48" y="18" width="32" height="24" rx="6" fill="#0284c7" stroke="#0369a1" strokeWidth="1.5" />
                  <rect x="45" y="16" width="38" height="6" rx="3" fill="#38bdf8" />
                  <circle cx="64" cy="29" r="3" fill="#bae6fd" />

                  {/* Khay trà đá Chibi với những cốc nước vàng long lanh mát lạnh */}
                  <rect x="88" y="34" width="60" height="8" rx="3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                  {/* Cốc trà 1 */}
                  <rect x="92" y="16" width="13" height="20" rx="3" fill="#fef08a" stroke="#eab308" strokeWidth="1.2" />
                  <rect x="94" y="20" width="9" height="5" rx="1.5" fill="#ffffff" opacity="0.75" />
                  <line x1="98" y1="9" x2="100" y2="30" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
                  {/* Cốc trà 2 (nơi rót trà) */}
                  <rect x="110" y="14" width="15" height="22" rx="3" fill="#fde047" stroke="#ca8a04" strokeWidth="1.2" />
                  <rect x="112" y="18" width="11" height="6" rx="1.5" fill="#ffffff" opacity="0.85" />
                  <line x1="118" y1="7" x2="116" y2="30" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
                  {/* Cốc trà 3 */}
                  <rect x="130" y="16" width="13" height="20" rx="3" fill="#fef08a" stroke="#eab308" strokeWidth="1.2" />
                  <line x1="136" y1="9" x2="135" y2="30" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />

                  {/* Đĩa hạt hướng dương nhỏ xinh xắn trên bàn */}
                  <ellipse cx="158" cy="38" rx="8" ry="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
                  <ellipse cx="158" cy="37" rx="6" ry="2.5" fill="#451a03" />
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

            {/* Chiếc ghế nhựa xanh Chibi lúc bác Ba ngồi hoặc rời ghế */}
            <div className="absolute bottom-1 left-2 w-16 h-14 z-0">
              <svg viewBox="0 0 64 52" className="w-full h-full drop-shadow-md">
                {/* Mặt ghế nhựa bo góc tròn múp míp */}
                <rect x="8" y="16" width="46" height="9" rx="3.5" fill="#2563eb" stroke="#1e40af" strokeWidth="1.5" />
                <rect x="12" y="18" width="38" height="3" rx="1.5" fill="#60a5fa" opacity="0.6" />
                {/* 4 chân ghế tròn */}
                <path d="M14 25 L 10 48" stroke="#1d4ed8" strokeWidth="5" strokeLinecap="round" />
                <path d="M48 25 L 52 48" stroke="#1d4ed8" strokeWidth="5" strokeLinecap="round" />
                <path d="M26 25 L 24 47" stroke="#1e3a8a" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M36 25 L 38 47" stroke="#1e3a8a" strokeWidth="3.5" strokeLinecap="round" />
                {/* Chiếc bàn con và cốc nước đặt cạnh ghế khi ngồi */}
                {uncleState.startsWith('sitting') && (
                  <g>
                    <rect x="54" y="24" width="9" height="15" rx="2" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
                    <line x1="59" y1="18" x2="60" y2="34" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                )}
              </svg>
            </div>

            {/* Hình thể Bác Ba Chibi cực kỳ dễ thương, đầu to tròn trĩnh, biểu cảm sinh động */}
            <div
              className={`relative w-32 h-48 filter contrast-105 drop-shadow-2xl overflow-visible ${
                uncleState === 'standing_up'
                  ? 'animate-stand-up'
                  : uncleState === 'sitting_down'
                  ? 'animate-sit-down'
                  : uncleState === 'sitting_relax'
                  ? 'animate-chibi-idle'
                  : ''
              }`}
            >
              <svg viewBox="0 0 120 180" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="chibiSkin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffedd5" />
                    <stop offset="100%" stopColor="#fed7aa" />
                  </linearGradient>
                  <linearGradient id="chibiShirt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                  </linearGradient>
                  <linearGradient id="chibiShorts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  <linearGradient id="chibiCap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                </defs>

                {/* --- TRẠNG THÁI A: NGỒI THƯ THÁI XEM CỜ (SITTING_RELAX CHIBI) --- */}
                {uncleState === 'sitting_relax' && (
                  <g>
                    {/* Chân Chibi ngắn cũn lùn ngồi gập gối */}
                    <ellipse cx="46" cy="146" rx="9" ry="6" fill="#0f172a" />
                    <ellipse cx="74" cy="146" rx="9" ry="6" fill="#0f172a" />
                    <path d="M38 108 Q 36 136 46 142 L 74 142 Q 84 136 82 108 Z" fill="url(#chibiShorts)" />

                    {/* Thân người Chibi tròn trịa với áo phông trắng bo tròn */}
                    <ellipse cx="60" cy="106" rx="22" ry="19" fill="url(#chibiShirt)" stroke="#94a3b8" strokeWidth="1.2" />

                    {/* Tay Chibi múp míp chống cằm trầm ngâm suy nghĩ nước cờ */}
                    <path d="M42 104 Q 40 122 52 118" stroke="url(#chibiSkin)" strokeWidth="7" strokeLinecap="round" fill="none" />
                    <path d="M78 104 Q 84 116 74 92" stroke="url(#chibiSkin)" strokeWidth="7" strokeLinecap="round" fill="none" />
                    <circle cx="72" cy="88" r="5" fill="url(#chibiSkin)" />

                    {/* ĐẦU CHIBI TO TRÒN TRĨNH CỰC DỄ THƯƠNG */}
                    <ellipse cx="60" cy="54" rx="33" ry="31" fill="url(#chibiSkin)" stroke="#fed7aa" strokeWidth="1" />
                    {/* Tai tròn */}
                    <circle cx="27" cy="56" r="5.5" fill="#fecdd3" />
                    <circle cx="93" cy="56" r="5.5" fill="#fecdd3" />

                    {/* Mũ lưỡi trai cam / nâu cá tính đội lệch một chút */}
                    <path d="M28 48 C 30 24, 90 24, 92 48 Z" fill="url(#chibiCap)" />
                    {/* Vành mũ lưỡi trai vểnh lên */}
                    <ellipse cx="66" cy="46" rx="28" ry="7" fill="#f59e0b" stroke="#b45309" strokeWidth="1.2" />

                    {/* Đôi mắt Chibi to tròn đen láy, chớp mắt tự nhiên kết hợp Random Blink */}
                    <g
                      className={`animate-chibi-blink ${uncleIsBlinking ? 'chibi-eye-blinking' : 'chibi-eye-open'}`}
                      style={{ transformOrigin: '60px 58px' }}
                    >
                      <ellipse cx="46" cy="58" rx="6.5" ry="8" fill="#1e1b4b" />
                      <circle cx="44.5" cy="55" r="2.8" fill="#ffffff" />
                      <circle cx="48" cy="61" r="1.3" fill="#ffffff" />
                      {/* Lông mày xếch nhẹ tinh anh */}
                      <path d="M38 48 Q 46 45 54 49" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" fill="none" />

                      <ellipse cx="74" cy="58" rx="6.5" ry="8" fill="#1e1b4b" />
                      <circle cx="72.5" cy="55" r="2.8" fill="#ffffff" />
                      <circle cx="76" cy="61" r="1.3" fill="#ffffff" />
                      <path d="M66 49 Q 74 45 82 48" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </g>

                    {/* Đôi má hồng tròn xoe */}
                    <ellipse cx="37" cy="66" rx="6" ry="3.5" fill="#fb7185" opacity="0.65" />
                    <ellipse cx="83" cy="66" rx="6" ry="3.5" fill="#fb7185" opacity="0.65" />

                    {/* Miệng cười mỉm thích thú khi xem cờ */}
                    <path d="M55 68 Q 60 74 65 68" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="#fdba74" />
                  </g>
                )}

                {/* --- TRẠNG THÁI B: GIƠ TAY GỌI ĐỒ UỐNG (CALLING_DRINK CHIBI) --- */}
                {uncleState === 'calling_drink' && (
                  <g>
                    <ellipse cx="46" cy="146" rx="9" ry="6" fill="#0f172a" />
                    <ellipse cx="74" cy="146" rx="9" ry="6" fill="#0f172a" />
                    <path d="M38 108 Q 36 136 46 142 L 74 142 Q 84 136 82 108 Z" fill="url(#chibiShorts)" />
                    <ellipse cx="60" cy="106" rx="22" ry="19" fill="url(#chibiShirt)" stroke="#94a3b8" strokeWidth="1.2" />

                    {/* Tay trái chống đùi */}
                    <path d="M40 104 Q 34 118 46 122" stroke="url(#chibiSkin)" strokeWidth="7" strokeLinecap="round" fill="none" />

                    {/* Cánh tay phải giơ cao vẫy gọi đồ uống hào hứng (chuẩn keyframe không bị méo) */}
                    <g className="animate-uncle-call-wave">
                      <path d="M76 102 Q 92 82 100 52" stroke="url(#chibiSkin)" strokeWidth="7.5" strokeLinecap="round" fill="none" />
                      <circle cx="101" cy="48" r="6" fill="url(#chibiSkin)" />
                      {/* Ngón tay vẫy chào */}
                      <ellipse cx="100" cy="42" rx="2.2" ry="4" fill="url(#chibiSkin)" />
                      <ellipse cx="105" cy="44" rx="2" ry="3.5" fill="url(#chibiSkin)" />
                    </g>

                    {/* Đầu Chibi quay nghiêng hướng về quầy nước */}
                    <ellipse cx="62" cy="54" rx="33" ry="31" fill="url(#chibiSkin)" stroke="#fed7aa" strokeWidth="1" />
                    <circle cx="28" cy="56" r="5.5" fill="#fecdd3" />
                    <circle cx="95" cy="56" r="5.5" fill="#fecdd3" />

                    <path d="M30 48 C 32 24, 92 24, 94 48 Z" fill="url(#chibiCap)" />
                    <ellipse cx="68" cy="46" rx="28" ry="7" fill="#f59e0b" stroke="#b45309" strokeWidth="1.2" />

                    {/* Mắt to tròn mở to gọi nước */}
                    <g
                      className={`animate-chibi-blink ${uncleIsBlinking ? 'chibi-eye-blinking' : 'chibi-eye-open'}`}
                      style={{ transformOrigin: '62px 57px' }}
                    >
                      <ellipse cx="48" cy="57" rx="6.5" ry="8" fill="#1e1b4b" />
                      <circle cx="46.5" cy="54" r="2.8" fill="#ffffff" />
                      <ellipse cx="76" cy="57" rx="6.5" ry="8" fill="#1e1b4b" />
                      <circle cx="74.5" cy="54" r="2.8" fill="#ffffff" />
                    </g>

                    <ellipse cx="39" cy="65" rx="6" ry="3.5" fill="#fb7185" opacity="0.65" />
                    <ellipse cx="85" cy="65" rx="6" ry="3.5" fill="#fb7185" opacity="0.65" />

                    {/* Miệng mở to chữ O đáng yêu gọi to */}
                    <ellipse cx="63" cy="68" rx="5.5" ry="6.5" fill="#b91c1c" />
                    <circle cx="63" cy="71" r="3" fill="#fca5a5" />
                  </g>
                )}

                {/* --- TRẠNG THÁI C: ĐI BỘ CHIBI (WALKING_TO_STALL HOẶC WALKING_BACK) --- */}
                {(uncleState === 'walking_to_stall' || uncleState === 'walking_back') && (
                  <g className="animate-walk-bob">
                    {/* Chân trái bước Chibi lắc lư */}
                    <g className="animate-walk-leg-left">
                      <path d="M46 112 Q 42 136 38 152" stroke="url(#chibiShorts)" strokeWidth="13" strokeLinecap="round" fill="none" />
                      <ellipse cx="38" cy="154" rx="9" ry="5.5" fill="#0f172a" />
                    </g>
                    {/* Chân phải bước Chibi lắc lư */}
                    <g className="animate-walk-leg-right">
                      <path d="M72 112 Q 76 136 80 152" stroke="url(#chibiShorts)" strokeWidth="13" strokeLinecap="round" fill="none" />
                      <ellipse cx="80" cy="154" rx="9" ry="5.5" fill="#0f172a" />
                    </g>

                    {/* Thân áo Chibi tròn lẳn */}
                    <ellipse cx="59" cy="104" rx="22" ry="20" fill="url(#chibiShirt)" stroke="#94a3b8" strokeWidth="1.2" />

                    {/* Đầu Chibi lắc lư bước đi */}
                    <ellipse cx="59" cy="50" rx="33" ry="31" fill="url(#chibiSkin)" stroke="#fed7aa" strokeWidth="1" />
                    <circle cx="26" cy="52" r="5.5" fill="#fecdd3" />
                    <circle cx="92" cy="52" r="5.5" fill="#fecdd3" />
                    <path d="M28 44 C 30 20, 90 20, 92 44 Z" fill="url(#chibiCap)" />
                    <ellipse cx="66" cy="42" rx="28" ry="7" fill="#f59e0b" stroke="#b45309" strokeWidth="1.2" />

                    <g
                      className={`animate-chibi-blink ${uncleIsBlinking ? 'chibi-eye-blinking' : 'chibi-eye-open'}`}
                      style={{ transformOrigin: '59px 54px' }}
                    >
                      <ellipse cx="46" cy="54" rx="6.5" ry="8" fill="#1e1b4b" />
                      <circle cx="44.5" cy="51" r="2.8" fill="#ffffff" />
                      <ellipse cx="74" cy="54" rx="6.5" ry="8" fill="#1e1b4b" />
                      <circle cx="72.5" cy="51" r="2.8" fill="#ffffff" />
                    </g>

                    <ellipse cx="37" cy="62" rx="6" ry="3.5" fill="#fb7185" opacity="0.65" />
                    <ellipse cx="83" cy="62" rx="6" ry="3.5" fill="#fb7185" opacity="0.65" />
                    <path d="M54 64 Q 59 70 64 64" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="#fdba74" />

                    {/* Nếu đang cầm cốc trà đá trên tay khi đi về */}
                    {uncleHasGlass ? (
                      <g>
                        <path d="M74 100 Q 86 102 92 90" stroke="url(#chibiSkin)" strokeWidth="7" strokeLinecap="round" fill="none" />
                        <circle cx="92" cy="88" r="5" fill="url(#chibiSkin)" />
                        {/* Cốc trà đá Chibi cầm tay */}
                        <rect x="88" y="74" width="12" height="18" rx="3" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
                        <rect x="90" y="78" width="8" height="5" rx="1.5" fill="#ffffff" opacity="0.8" />
                        <line x1="94" y1="68" x2="95" y2="86" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
                      </g>
                    ) : (
                      // Đi thong dong hai tay vung vẩy vui tươi
                      <g>
                        <g className="animate-walk-arm-left">
                          <path d="M38 100 Q 24 112 30 126" stroke="url(#chibiSkin)" strokeWidth="7" strokeLinecap="round" fill="none" />
                          <circle cx="30" cy="126" r="4.5" fill="url(#chibiSkin)" />
                        </g>
                        <g className="animate-walk-arm-right">
                          <path d="M80 100 Q 94 112 88 126" stroke="url(#chibiSkin)" strokeWidth="7" strokeLinecap="round" fill="none" />
                          <circle cx="88" cy="126" r="4.5" fill="url(#chibiSkin)" />
                        </g>
                      </g>
                    )}
                  </g>
                )}

                {/* --- TRẠNG THÁI D: ĐẾN QUẦY NHẬN NƯỚC (RECEIVING_DRINK CHIBI) --- */}
                {uncleState === 'receiving_drink' && (
                  <g>
                    <ellipse cx="46" cy="148" rx="9" ry="6" fill="#0f172a" />
                    <ellipse cx="72" cy="148" rx="9" ry="6" fill="#0f172a" />
                    <path d="M40 110 L 40 144 M 68 110 L 68 144" stroke="url(#chibiShorts)" strokeWidth="14" strokeLinecap="round" fill="none" />
                    <ellipse cx="58" cy="106" rx="22" ry="20" fill="url(#chibiShirt)" stroke="#94a3b8" strokeWidth="1.2" />

                    <ellipse cx="58" cy="52" rx="33" ry="31" fill="url(#chibiSkin)" stroke="#fed7aa" strokeWidth="1" />
                    <circle cx="25" cy="54" r="5.5" fill="#fecdd3" />
                    <circle cx="91" cy="54" r="5.5" fill="#fecdd3" />
                    <path d="M27 46 C 29 22, 89 22, 91 46 Z" fill="url(#chibiCap)" />
                    <ellipse cx="65" cy="44" rx="28" ry="7" fill="#f59e0b" stroke="#b45309" strokeWidth="1.2" />

                    <g
                      className={`animate-chibi-blink ${uncleIsBlinking ? 'chibi-eye-blinking' : 'chibi-eye-open'}`}
                      style={{ transformOrigin: '58px 56px' }}
                    >
                      <ellipse cx="45" cy="56" rx="6.5" ry="8" fill="#1e1b4b" />
                      <circle cx="43.5" cy="53" r="2.8" fill="#ffffff" />
                      <ellipse cx="73" cy="56" rx="6.5" ry="8" fill="#1e1b4b" />
                      <circle cx="71.5" cy="53" r="2.8" fill="#ffffff" />
                    </g>

                    <ellipse cx="36" cy="64" rx="6" ry="3.5" fill="#fb7185" opacity="0.65" />
                    <ellipse cx="82" cy="64" rx="6" ry="3.5" fill="#fb7185" opacity="0.65" />
                    <path d="M53 66 Q 58 72 63 66" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="#fdba74" />

                    {/* Hai bàn tay Chibi xòe ra trước ngực nhận cốc trà đá hân hoan */}
                    <path d="M74 100 Q 90 98 102 92" stroke="url(#chibiSkin)" strokeWidth="7" strokeLinecap="round" fill="none" />
                    <rect x="98" y="78" width="13" height="19" rx="3" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
                    <rect x="100" y="82" width="9" height="5" rx="1.5" fill="#ffffff" opacity="0.8" />
                    <line x1="104" y1="72" x2="105" y2="92" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
                  </g>
                )}

                {/* --- TRẠNG THÁI E: UỐNG MỘT NGỤM TRÀ SẢNG KHOÁI (DRINKING_SIP CHIBI) --- */}
                {uncleState === 'drinking_sip' && (
                  <g className="animate-pulse" style={{ animationDuration: '1.2s' }}>
                    <ellipse cx="46" cy="148" rx="9" ry="6" fill="#0f172a" />
                    <ellipse cx="72" cy="148" rx="9" ry="6" fill="#0f172a" />
                    <path d="M40 110 L 40 144 M 68 110 L 68 144" stroke="url(#chibiShorts)" strokeWidth="14" strokeLinecap="round" fill="none" />
                    <ellipse cx="58" cy="106" rx="22" ry="20" fill="url(#chibiShirt)" stroke="#94a3b8" strokeWidth="1.2" />

                    {/* Đầu Chibi hơi ngửa lên uống nước */}
                    <ellipse cx="58" cy="48" rx="33" ry="31" fill="url(#chibiSkin)" stroke="#fed7aa" strokeWidth="1" />
                    <path d="M27 42 C 29 18, 89 18, 91 42 Z" fill="url(#chibiCap)" />
                    <ellipse cx="65" cy="40" rx="28" ry="7" fill="#f59e0b" stroke="#b45309" strokeWidth="1.2" />

                    {/* Mắt tít lại thành hình cung tròn cười mãn nguyện (Happy eye arc) */}
                    <path d="M40 54 Q 46 48 52 54" stroke="#1e1b4b" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                    <path d="M68 54 Q 74 48 80 54" stroke="#1e1b4b" strokeWidth="2.8" strokeLinecap="round" fill="none" />

                    <ellipse cx="36" cy="58" rx="6.5" ry="4" fill="#fb7185" opacity="0.8" />
                    <ellipse cx="82" cy="58" rx="6.5" ry="4" fill="#fb7185" opacity="0.8" />

                    {/* Cánh tay Chibi nâng cốc trà lên miệng */}
                    <path d="M74 100 Q 84 88 72 68" stroke="url(#chibiSkin)" strokeWidth="7" strokeLinecap="round" fill="none" />
                    {/* Cốc trà nghiêng 15 độ kề vào miệng */}
                    <rect x="66" y="52" width="13" height="19" rx="3" fill="#fde047" stroke="#ca8a04" strokeWidth="1.2" transform="rotate(-20 72 61)" />
                    <line x1="72" y1="46" x2="73" y2="66" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" transform="rotate(-20 72 61)" />
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
