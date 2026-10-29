/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackgroundScene3D } from '../types';
import { MobileOptionsSlot } from './MobileOptionsSlot';
import { sound } from '../utils/audio';
import { ambience } from '../utils/ambienceEngine';
import { drinkOrders, DrinkOrder } from '../utils/drinkOrders';
import { voiceCommentary } from '../utils/voiceCommentary';
import { ArticulatedCyclist, ArticulatedStreetVendor } from './ArticulatedCharacters';
import { Footprints, Sparkles, Coffee, UserCheck, EyeOff, Megaphone, Bike } from 'lucide-react';

interface AnimatedBackgroundBackdropProps {
  scene: BackgroundScene3D;
  imageUrl?: string;
  sceneName?: string;
  isLiteMode?: boolean;
  isWideLayout?: boolean;
  isChibiEnabled?: boolean;
  onToggleChibi?: () => void;
  isFullscreen?: boolean;
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
  isChibiEnabled: propIsChibiEnabled,
  onToggleChibi,
  isFullscreen = false,
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

  const [internalWalkersEnabled, setInternalWalkersEnabled] = useState<boolean>(() => {
    try {
      const explicit = localStorage.getItem('co_up_chibi_enabled');
      if (explicit !== null) return explicit === 'true';
      return true; // Default always enabled
    } catch {
      return true;
    }
  });

  const isWalkersEnabled = propIsChibiEnabled !== undefined ? propIsChibiEnabled : internalWalkersEnabled;

  // Phong cách nhân vật: 'realistic' (3D Tả thực chân thực cao) hoặc 'chibi' (Hoạt hình Chibi)
  const [characterStyle, setCharacterStyle] = useState<'realistic' | 'chibi'>(() => {
    try {
      const saved = localStorage.getItem('co_up_character_style');
      return saved === 'chibi' ? 'chibi' : 'realistic'; // Mặc định 3D Tả Thực theo yêu cầu
    } catch {
      return 'realistic';
    }
  });

  // State của Khách xem cờ (Bác Ba / Chú Năm) - ngồi sát mép trái màn hình theo yêu cầu
  const [uncleState, setUncleState] = useState<UncleActionState>('sitting_relax');
  const [uncleX, setUncleX] = useState<number>(1.5); // % từ lề trái
  const [uncleFacing, setUncleFacing] = useState<'right' | 'left'>('right');
  const [uncleSpeech, setUncleSpeech] = useState<string | null>(null);
  const [uncleHasGlass, setUncleHasGlass] = useState<boolean>(false);

  // State của Chủ quán / Người phục vụ tại quầy nước
  const [serverState, setServerState] = useState<ServerActionState>('idle_counter');
  const [serverSpeech, setServerSpeech] = useState<string | null>(null);
  const [serverX, setServerX] = useState<number>(84); // % từ lề trái

  // Window width để tính toán bố cục tránh bị che khuất bởi sidebar desktop
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Vị trí của quầy nước (Drink stall counter) - tính toán chính xác để luôn lộ rõ bên phải bàn cờ, không bao giờ bị sidebar che
  const stallX = React.useMemo(() => {
    if (windowWidth >= 1024 && !isFullscreen) {
      // Trên desktop khi có sidebar, thanh sidebar chiếm 360px (lg), 390px (xl), 420px (2xl)
      const sidebarWidth = windowWidth >= 1536 ? 420 : windowWidth >= 1280 ? 390 : 360;
      // Đặt mép phải của quầy nước (rộng 210px) cách mép trái sidebar 16px an toàn
      const availableRightPx = windowWidth - sidebarWidth - 216;
      const pct = (availableRightPx / windowWidth) * 100;
      return Math.max(48, Math.min(80, pct));
    }
    // Khi Toàn Màn Hình hoặc trên tablet/mobile: đặt ở lề phải 78% (rộng rãi, thoáng đãng)
    return isWideLayout ? 78 : 70;
  }, [windowWidth, isWideLayout, isFullscreen]);

  // Refs điều khiển hoạt ảnh và thời gian
  const uncleWalkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFootstepTimeRef = useRef<number>(0);
  const uncleStateRef = useRef<UncleActionState>(uncleState);

  useEffect(() => {
    uncleStateRef.current = uncleState;
  }, [uncleState]);

  // Đảm bảo lời thoại của Bác Ba tự động biến mất sau tối đa 4.5 giây, không bao giờ bị treo trên màn hình
  useEffect(() => {
    if (!uncleSpeech) return;
    const speechTimer = setTimeout(() => {
      setUncleSpeech(null);
    }, 4500);
    return () => clearTimeout(speechTimer);
  }, [uncleSpeech]);

  // Đảm bảo lời thoại của Chủ quán tự động biến mất sau tối đa 4.5 giây
  useEffect(() => {
    if (!serverSpeech) return;
    const speechTimer = setTimeout(() => {
      setServerSpeech(null);
    }, 4500);
    return () => clearTimeout(speechTimer);
  }, [serverSpeech]);

  // Cleanup toàn bộ timer hoạt ảnh khi unmount component
  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
      if (uncleWalkIntervalRef.current) clearInterval(uncleWalkIntervalRef.current);
    };
  }, []);

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
    ambience.resumeAudioContext();
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
    voiceCommentary.speak(quote);

    setTimeout(() => {
      setStreetVendorActive(false);
      setVendorQuote(null);
    }, 9200);
  }, []);

  // Kích hoạt em bé Chibi đạp xe lướt qua đường phố kèm tiếng chuông kính coong
  const triggerCyclistPass = useCallback(() => {
    ambience.resumeAudioContext();
    setCyclistActive(true);
    ambience.playBicycleBell();
    setTimeout(() => {
      setCyclistActive(false);
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
      if (uncleStateRef.current !== 'sitting_relax') return;

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
    [getCallDrinkQuote, getServerResponseQuote, scene],
  );

  // 4. HOẠT CẢNH: ĐỨNG LÊN ĐI LẤY ĐỒ UỐNG ("đứng lên lấy đồ uống")
  const triggerStandingUpToGetDrink = useCallback(() => {
    if (uncleStateRef.current !== 'sitting_relax' && uncleStateRef.current !== 'calling_drink') return;

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
      setUncleSpeech(null); // Xóa lời thoại đứng lên khi bắt đầu sải bước
      setServerState('pouring_tea');
      setServerSpeech('Bác sang lấy trà tươi nóng hổi này!');

      let currentX = 1.5;
      const targetX = Math.max(22, isWideLayout ? stallX - 8 : stallX - 9);
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
              const originalX = 1.5;

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
  }, [scene, stallX, isWideLayout]);

  // 5. ĐỒNG BỘ VỚI HỆ THỐNG GỌI ĐỒ UỐNG: Khi drinkOrders phát sự kiện (định kỳ mỗi ~1 phút)
  useEffect(() => {
    const unsubscribe = drinkOrders.subscribe((order: DrinkOrder) => {
      if (!isWalkersEnabled || scene === 'cathedral') return;

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
  }, [isWalkersEnabled, scene, triggerCallingDrink, triggerStandingUpToGetDrink]);

  // 6. TỰ ĐỘNG LÊN LỊCH HOẠT CẢNH ĐỊNH KỲ (nếu chưa có sự kiện)
  useEffect(() => {
    if (!isWalkersEnabled || scene === 'cathedral') return;

    // Cứ 30 - 45 giây có hành động tự nhiên (gọi nước hoặc đứng dậy lấy đồ uống)
    const scheduleNextAction = () => {
      const delay = 32000 + Math.random() * 18000;
      return setTimeout(() => {
        if (uncleStateRef.current === 'sitting_relax') {
          if (Math.random() > 0.5) {
            triggerStandingUpToGetDrink();
          } else {
            triggerCallingDrink();
          }
        }
        timer = scheduleNextAction();
      }, delay);
    };

    // Xe đạp chạy qua ở xa trên phố
    const scheduleCyclist = () => {
      const delay = 22000 + Math.random() * 18000;
      return setTimeout(() => {
        triggerCyclistPass();
        cyclistTimer = scheduleCyclist();
      }, delay);
    };

    // Tiếng và hình bóng người bán hàng rong đi qua ở xa ngoài đường
    const scheduleStreetVendor = () => {
      const delay = 35000 + Math.random() * 25000;
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
    };
  }, [isWalkersEnabled, scene, triggerCallingDrink, triggerStandingUpToGetDrink, triggerStreetVendorCry, triggerCyclistPass]);

  const toggleAnimation = () => {
    const next = !isAnimationEnabled;
    setIsAnimationEnabled(next);
    try {
      localStorage.setItem('co_up_animated_bg', String(next));
    } catch {}
  };

  const resetUncleToIdle = useCallback(() => {
    if (uncleWalkIntervalRef.current) {
      clearInterval(uncleWalkIntervalRef.current);
      uncleWalkIntervalRef.current = null;
    }
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = null;
    }
    setUncleState('sitting_relax');
    setUncleX(1.5);
    setUncleFacing('right');
    setUncleSpeech(null);
    setUncleHasGlass(false);
    setServerState('idle_counter');
    setServerSpeech(null);
    setCyclistActive(false);
    setStreetVendorActive(false);
    setVendorQuote(null);
  }, []);

  useEffect(() => {
    if (!isWalkersEnabled) {
      resetUncleToIdle();
    }
  }, [isWalkersEnabled, resetUncleToIdle]);

  const toggleWalkers = () => {
    ambience.resumeAudioContext();
    if (onToggleChibi) {
      onToggleChibi();
    } else {
      const next = !internalWalkersEnabled;
      setInternalWalkersEnabled(next);
      try {
        localStorage.setItem('co_up_chibi_enabled', String(next));
        localStorage.setItem('co_up_bg_walkers', String(next));
      } catch {}
      if (!next) {
        resetUncleToIdle();
      }
    }
  };

  if (!imageUrl) return null;

  return (
    <>
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
            {scene !== 'cathedral' && (
              <div
                className="absolute pointer-events-none animate-steam-rise opacity-45"
                style={{
                  bottom: isWideLayout ? '17%' : '13%',
                  left: `${stallX + 7}%`,
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
            )}

          </>
        )}

        {/* 4. QUẦY NƯỚC / BÀN TRÀ ĐÁ VỈA HÈ / QUẦY CÀ PHÊ (DRINK STALL COUNTER) */}
        {isWalkersEnabled && scene !== 'cathedral' && (
          <div
            className="absolute pointer-events-none z-10 transition-all duration-300"
            style={{
              left: `${stallX}%`,
              bottom: isWideLayout ? '12%' : '8%',
              transform: `scale(${isWideLayout ? (windowWidth < 1280 && windowWidth >= 1024 ? 0.90 : 1.02) : 0.88})`,
              transformOrigin: 'bottom left',
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

        {/* 4. ĐỊA ĐIỂM NGỒI XEM CỜ VỈA HÈ: GHẾ NHỰA XANH & BÀN TRÀ ĐÁ CỐ ĐỊNH TẠI CHỖ (1.5% - SÁT MÉP TRÁI) */}
        {isWalkersEnabled && scene !== 'cathedral' && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: '1.5%',
              bottom: isWideLayout ? '12%' : '8%',
              transform: `scale(${isWideLayout ? 1.05 : 0.88})`,
              transformOrigin: 'bottom left',
            }}
          >
            {/* Bóng đổ dưới chân ghế nhựa trên vỉa hè */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-32 h-6 bg-black/60 rounded-full filter blur-[3px] scale-y-75" />

            {/* Chiếc ghế nhựa xanh Chibi huyền thoại vỉa hè & bàn con mini đựng trà đá */}
            <div className="relative w-36 h-24 -mb-1">
              <svg viewBox="0 0 130 80" className="w-full h-full drop-shadow-md overflow-visible">
                <defs>
                  <linearGradient id="stoolBlueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                  <linearGradient id="redTableMiniGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#b91c1c" />
                  </linearGradient>
                </defs>

                {/* --- GHẾ NHỰA XANH DƯƠNG --- */}
                {/* 4 chân ghế xòe vững chãi chịu lực */}
                <path d="M28 36 L 22 72" stroke="#1e40af" strokeWidth="6" strokeLinecap="round" />
                <path d="M72 36 L 78 72" stroke="#1e40af" strokeWidth="6" strokeLinecap="round" />
                <path d="M42 36 L 39 70" stroke="#1d4ed8" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M58 36 L 61 70" stroke="#1d4ed8" strokeWidth="4.5" strokeLinecap="round" />
                {/* Thanh giằng ngang gia cố chân ghế */}
                <line x1="25" y1="54" x2="75" y2="54" stroke="#1e3a8a" strokeWidth="2.8" strokeLinecap="round" opacity="0.8" />

                {/* Mặt ghế nhựa xanh bóng bo góc mềm mại */}
                <rect x="22" y="24" width="56" height="13" rx="4.5" fill="url(#stoolBlueGrad)" stroke="#1e3a8a" strokeWidth="1.6" />
                <rect x="27" y="26.5" width="46" height="4" rx="2" fill="#93c5fd" opacity="0.65" />
                {/* Lỗ thoáng tròn giữa ghế nhựa đặc trưng Việt Nam */}
                <circle cx="50" cy="30.5" r="2.8" fill="#1e3a8a" opacity="0.75" />

                {/* --- BÀN CON NHỰA ĐỎ CẠNH GHẾ --- */}
                <rect x="86" y="38" width="34" height="9" rx="3" fill="url(#redTableMiniGrad)" stroke="#991b1b" strokeWidth="1.4" />
                <path d="M90 47 L 88 72" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
                <path d="M116 47 L 118 72" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />

                {/* Cốc trà đá vàng óng có ống hút đỏ trên bàn */}
                <rect x="98" y="24" width="11" height="16" rx="2.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
                <rect x="100" y="27" width="7" height="4" rx="1" fill="#ffffff" opacity="0.85" />
                <line x1="103" y1="17" x2="104" y2="35" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        )}

        {/* 5. NHÂN VẬT CHÍNH: KHÁCH XEM CỜ (BÁC BA) - CHIBI LIỀN MẠCH, ĐẸP MẮT, MẮT CHĂM CHÚ NHÌN BÀN CỜ */}
        {isWalkersEnabled && (
          <div
            className="absolute pointer-events-none transition-all duration-300 z-20"
            style={{
              left: `${uncleX}%`,
              bottom: isWideLayout ? '12%' : '8%',
              transform: `scale(${isWideLayout ? 1.05 : 0.88}) ${
                uncleFacing === 'left' ? 'scaleX(-1)' : 'scaleX(1)'
              }`,
              transformOrigin: 'bottom left',
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

            {/* Bóng đổ dưới chân di chuyển cùng Bác Ba */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-black/55 rounded-full filter blur-[3px] scale-y-75" />

            {/* Khung thể nhân vật Bác Ba Chibi */}
            <div
              className={`relative w-36 h-48 filter contrast-105 drop-shadow-2xl overflow-visible ${
                uncleState === 'standing_up'
                  ? 'animate-stand-up'
                  : uncleState === 'sitting_down'
                  ? 'animate-sit-down'
                  : uncleState === 'sitting_relax'
                  ? 'animate-uncle-chess-watch'
                  : ''
              }`}
            >
              <svg viewBox="0 0 130 180" className="w-full h-full overflow-visible">
                <defs>
                  {/* Da Chibi mịn màng ấm áp */}
                  <linearGradient id="chibiSkin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff1e6" />
                    <stop offset="50%" stopColor="#ffedd5" />
                    <stop offset="100%" stopColor="#fed7aa" />
                  </linearGradient>
                  {/* Bóng đổ trên da */}
                  <linearGradient id="chibiSkinShadow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fed7aa" />
                    <stop offset="100%" stopColor="#fba86c" />
                  </linearGradient>
                  {/* Áo phông trắng retro cotton có độ phồng & nếp gấp */}
                  <linearGradient id="chibiShirt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="65%" stopColor="#f1f5f9" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                  </linearGradient>
                  {/* Quần soóc kaki / denim xanh navy dày dặn */}
                  <linearGradient id="chibiShorts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  {/* Mũ lưỡi trai cam đất sành điệu */}
                  <linearGradient id="chibiCap" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="50%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#c2410c" />
                  </linearGradient>
                  {/* Vành mũ lưỡi trai */}
                  <linearGradient id="chibiCapBrim" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  {/* Dép tổ ong vàng rơm */}
                  <linearGradient id="chibiSandal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                </defs>

                {/* ============================================================== */}
                {/* 1. TRẠNG THÁI A: NGỒI XEM CỜ THƯ THÁI (SITTING_RELAX CHIBI)    */}
                {/* Liền mạch 100%, người hơi nhoài về trước, mắt dán chặt bàn cờ! */}
                {/* ============================================================== */}
                {uncleState === 'sitting_relax' && (
                  <g>
                    {/* --- A. Chân & Dép tổ ong (Ngồi gập gối tự nhiên trên ghế) --- */}
                    {/* Chân trái (phía xa) */}
                    <g opacity="0.95">
                      <path d="M46 122 Q 44 140 50 156" stroke="url(#chibiSkin)" strokeWidth="11" strokeLinecap="round" fill="none" />
                      {/* Tất trắng */}
                      <path d="M48 152 L 51 159" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
                      {/* Dép tổ ong trái */}
                      <rect x="42" y="158" width="20" height="9" rx="3.5" fill="url(#chibiSandal)" stroke="#ca8a04" strokeWidth="1.2" />
                      {/* Lỗ tổ ong trên dép */}
                      <circle cx="48" cy="161.5" r="1.1" fill="#a16207" />
                      <circle cx="53" cy="161.5" r="1.1" fill="#a16207" />
                      <circle cx="58" cy="161.5" r="1.1" fill="#a16207" />
                    </g>

                    {/* Quần đùi Chibi navy ngồi vững trên mặt ghế */}
                    <path
                      d="M34 114 C 32 126, 42 136, 56 136 C 68 136, 78 128, 76 114 C 74 106, 36 106, 34 114 Z"
                      fill="url(#chibiShorts)"
                      stroke="#0f172a"
                      strokeWidth="1.2"
                    />

                    {/* Chân phải (phía gần, gác/tì hướng về phía bàn cờ) */}
                    <g>
                      <path d="M60 120 Q 68 132 74 156" stroke="url(#chibiSkin)" strokeWidth="12" strokeLinecap="round" fill="none" />
                      {/* Tất trắng chân phải */}
                      <path d="M72 150 L 74 158" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
                      {/* Dép tổ ong phải */}
                      <rect x="66" y="158" width="22" height="9" rx="3.5" fill="url(#chibiSandal)" stroke="#ca8a04" strokeWidth="1.2" />
                      <circle cx="72" cy="161.5" r="1.1" fill="#a16207" />
                      <circle cx="77" cy="161.5" r="1.1" fill="#a16207" />
                      <circle cx="82" cy="161.5" r="1.1" fill="#a16207" />
                    </g>

                    {/* --- B. Thân mình & Áo phông (Hơi nhoài về phía bàn cờ bên phải) --- */}
                    <path
                      d="M38 108 C 36 94, 46 84, 58 84 C 72 84, 80 94, 76 108 C 74 116, 40 116, 38 108 Z"
                      fill="url(#chibiShirt)"
                      stroke="#94a3b8"
                      strokeWidth="1.2"
                    />

                    {/* Nếp gấp vải mềm mại trên áo */}
                    <path d="M52 94 Q 56 102 54 110" stroke="#cbd5e1" strokeWidth="1.5" fill="none" strokeLinecap="round" />

                    {/* --- C. Cổ áo & Khớp cổ kết nối với đầu không bao giờ bị hở --- */}
                    <path d="M52 86 L 52 74 L 64 74 L 64 86 Z" fill="url(#chibiSkin)" />
                    {/* Cổ áo phông bo tròn ôm sát cổ */}
                    <path d="M48 84 Q 58 89 68 84" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                    {/* --- D. Cánh tay trái: Ra từ ống tay áo, chống nhẹ lên đùi --- */}
                    {/* Ống tay áo trái */}
                    <ellipse cx="42" cy="88" rx="7" ry="5.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
                    {/* Cánh tay trái nối liền */}
                    <path d="M42 92 Q 40 108 52 116" stroke="url(#chibiSkin)" strokeWidth="8.5" strokeLinecap="round" fill="none" />
                    {/* Bàn tay trái đặt tự nhiên lên đầu gối */}
                    <circle cx="53" cy="116" r="5" fill="url(#chibiSkin)" />

                    {/* --- E. Cánh tay phải: Ra từ ống tay áo, CHỐNG CẰM SUY NGHĨ NƯỚC CỜ --- */}
                    {/* Ống tay áo phải */}
                    <ellipse cx="72" cy="88" rx="7" ry="5.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
                    {/* Cánh tay phải uốn lên cằm */}
                    <path d="M72 92 Q 82 104 80 84 Q 78 74 72 72" stroke="url(#chibiSkin)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    {/* Bàn tay Chibi khum lại nâng nhẹ cằm */}
                    <ellipse cx="71" cy="71" rx="5.5" ry="4.5" fill="url(#chibiSkin)" />
                    {/* Ngón tay tựa má đáng yêu */}
                    <circle cx="73" cy="68" r="2.8" fill="url(#chibiSkin)" />

                    {/* --- F. ĐẦU CHIBI TO TRÒN, NGHIÊNG HƯỚNG VỀ BÀN CỜ --- */}
                    {/* Bóng đổ cằm lên cổ */}
                    <ellipse cx="58" cy="74" rx="14" ry="4" fill="#fba86c" opacity="0.35" />

                    {/* Khuôn mặt tròn xoe phúng phính */}
                    <ellipse cx="58" cy="50" rx="32" ry="29" fill="url(#chibiSkin)" stroke="#fed7aa" strokeWidth="1" />

                    {/* Tai trái bo tròn có hõm tai */}
                    <circle cx="28" cy="52" r="6" fill="url(#chibiSkin)" />
                    <path d="M29 49 Q 27 52 29 55" stroke="#fba86c" strokeWidth="1.4" fill="none" strokeLinecap="round" />

                    {/* Tóc mai và mái tóc đen Chibi lấp ló dưới mũ */}
                    <path d="M30 46 Q 36 38 42 42" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M84 46 Q 80 40 76 43" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none" />

                    {/* Mũ lưỡi trai cam đất cá tính */}
                    <path d="M28 44 C 30 20, 86 20, 88 44 Z" fill="url(#chibiCap)" stroke="#c2410c" strokeWidth="1.2" />
                    {/* Núm tròn trên đỉnh mũ */}
                    <ellipse cx="58" cy="22" rx="3.5" ry="2" fill="#c2410c" />
                    {/* Đường chỉ may nổi trên múi mũ */}
                    <path d="M58 24 Q 58 34 58 44" stroke="#fdba74" strokeWidth="1" strokeDasharray="2,2" fill="none" />

                    {/* Vành mũ lưỡi trai hơi chúc xuống và vểnh về phía bàn cờ */}
                    <ellipse cx="64" cy="42" rx="28" ry="7" fill="url(#chibiCapBrim)" stroke="#b45309" strokeWidth="1.4" transform="rotate(3 64 42)" />
                    <ellipse cx="64" cy="41" rx="24" ry="3.5" fill="#fef08a" opacity="0.35" />

                    {/* --- G. ĐÔI MẮT CHIBI CHĂM CHÚ NHÌN VÀO BÀN CỜ (HƯỚNG GÓC DƯỚI PHẢI) --- */}
                    <g
                      className={`animate-chibi-blink ${uncleIsBlinking ? 'chibi-eye-blinking' : 'chibi-eye-open'}`}
                      style={{ transformOrigin: '58px 54px' }}
                    >
                      {/* Mắt trái: Đồng tử nhìn chếch xuống dưới - sang phải (về phía bàn cờ) */}
                      <ellipse cx="48" cy="54" rx="7" ry="8.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
                      {/* Tròng mắt đen tím than */}
                      <ellipse cx="50" cy="55.5" rx="5.2" ry="6.2" fill="#0f172a" />
                      <circle cx="51.2" cy="57" r="3.2" fill="#1e1b4b" />
                      {/* Điểm bắt sáng (catchlight) lung linh phản chiếu bàn cờ */}
                      <circle cx="49" cy="53" r="2.2" fill="#ffffff" />
                      <circle cx="52" cy="57.5" r="1.1" fill="#ffffff" />
                      {/* Mí mắt & Lông mi trên */}
                      <path d="M41 49 Q 48 45 55 48" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" fill="none" />

                      {/* Mắt phải: Đồng tử cũng dán chặt nhìn xuống bàn cờ */}
                      <ellipse cx="70" cy="54" rx="7" ry="8.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
                      <ellipse cx="72" cy="55.5" rx="5.2" ry="6.2" fill="#0f172a" />
                      <circle cx="73.2" cy="57" r="3.2" fill="#1e1b4b" />
                      <circle cx="71" cy="53" r="2.2" fill="#ffffff" />
                      <circle cx="74" cy="57.5" r="1.1" fill="#ffffff" />
                      <path d="M63 49 Q 70 45 77 48" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" fill="none" />

                      {/* Lông mày nhíu nhẹ đầy tập trung suy tính nước đi */}
                      <path d="M40 44 Q 48 41 55 45" stroke="#78350f" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                      <path d="M65 45 Q 72 41 80 43" stroke="#78350f" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                    </g>

                    {/* Đôi má ửng hồng phấn cực kỳ dễ thương */}
                    <ellipse cx="38" cy="61" rx="6.5" ry="4" fill="#fb7185" opacity="0.65" />
                    <ellipse cx="78" cy="61" rx="6.5" ry="4" fill="#fb7185" opacity="0.65" />
                    <line x1="36" y1="60" x2="40" y2="62" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
                    <line x1="76" y1="60" x2="80" y2="62" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.8" />

                    {/* Mũi nhỏ xíu tinh tế */}
                    <circle cx="59" cy="59" r="1.4" fill="#fba86c" />

                    {/* Miệng mỉm cười thích thú khi phát hiện nước cờ hiểm */}
                    <path d="M54 64 Q 60 70 66 64" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="#fdba74" />
                  </g>
                )}

                {/* ============================================================== */}
                {/* 2. TRẠNG THÁI B: GIƠ TAY GỌI ĐỒ UỐNG (CALLING_DRINK CHIBI)      */}
                {/* Liền mạch tay từ vai, không còn bị rời rạc!                   */}
                {/* ============================================================== */}
                {uncleState === 'calling_drink' && (
                  <g>
                    {/* Chân & Quần ngồi trên ghế */}
                    <path d="M34 114 C 32 126, 42 136, 56 136 C 68 136, 78 128, 76 114 Z" fill="url(#chibiShorts)" stroke="#0f172a" strokeWidth="1.2" />
                    <path d="M46 122 Q 44 140 50 156" stroke="url(#chibiSkin)" strokeWidth="11" strokeLinecap="round" fill="none" />
                    <rect x="42" y="158" width="20" height="9" rx="3.5" fill="url(#chibiSandal)" stroke="#ca8a04" strokeWidth="1.2" />
                    <path d="M60 120 Q 68 132 74 156" stroke="url(#chibiSkin)" strokeWidth="12" strokeLinecap="round" fill="none" />
                    <rect x="66" y="158" width="22" height="9" rx="3.5" fill="url(#chibiSandal)" stroke="#ca8a04" strokeWidth="1.2" />

                    {/* Thân áo */}
                    <path d="M38 108 C 36 94, 46 84, 58 84 C 72 84, 80 94, 76 108 Z" fill="url(#chibiShirt)" stroke="#94a3b8" strokeWidth="1.2" />
                    <path d="M52 86 L 52 74 L 64 74 L 64 86 Z" fill="url(#chibiSkin)" />
                    <path d="M48 84 Q 58 89 68 84" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                    {/* Tay trái tì nhẹ lên đầu gối */}
                    <ellipse cx="42" cy="88" rx="7" ry="5.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
                    <path d="M42 92 Q 38 108 48 116" stroke="url(#chibiSkin)" strokeWidth="8.5" strokeLinecap="round" fill="none" />
                    <circle cx="48" cy="116" r="5" fill="url(#chibiSkin)" />

                    {/* Cánh tay phải vẫy gọi nước liền từ khớp vai */}
                    <ellipse cx="72" cy="88" rx="7" ry="5.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
                    <g className="animate-uncle-call-wave">
                      <path d="M72 88 Q 86 70 94 48" stroke="url(#chibiSkin)" strokeWidth="8.5" strokeLinecap="round" fill="none" />
                      <circle cx="95" cy="44" r="5.5" fill="url(#chibiSkin)" />
                      {/* Ngón tay vẫy gọi */}
                      <ellipse cx="94" cy="38" rx="2.4" ry="4.5" fill="url(#chibiSkin)" />
                      <ellipse cx="99" cy="40" rx="2.2" ry="4" fill="url(#chibiSkin)" />
                    </g>

                    {/* Đầu Chibi ngước lên gọi to */}
                    <ellipse cx="58" cy="50" rx="32" ry="29" fill="url(#chibiSkin)" stroke="#fed7aa" strokeWidth="1" />
                    <circle cx="28" cy="52" r="6" fill="url(#chibiSkin)" />
                    <path d="M28 44 C 30 20, 86 20, 88 44 Z" fill="url(#chibiCap)" stroke="#c2410c" strokeWidth="1.2" />
                    <ellipse cx="64" cy="42" rx="28" ry="7" fill="url(#chibiCapBrim)" stroke="#b45309" strokeWidth="1.4" />

                    <g className={`animate-chibi-blink ${uncleIsBlinking ? 'chibi-eye-blinking' : 'chibi-eye-open'}`}>
                      <ellipse cx="48" cy="53" rx="7" ry="8.5" fill="#ffffff" />
                      <ellipse cx="50" cy="54" rx="5.2" ry="6.2" fill="#0f172a" />
                      <circle cx="48.5" cy="51.5" r="2.2" fill="#ffffff" />
                      <ellipse cx="70" cy="53" rx="7" ry="8.5" fill="#ffffff" />
                      <ellipse cx="72" cy="54" rx="5.2" ry="6.2" fill="#0f172a" />
                      <circle cx="70.5" cy="51.5" r="2.2" fill="#ffffff" />
                      <path d="M40 43 Q 48 39 55 43" stroke="#78350f" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                      <path d="M65 43 Q 72 39 80 43" stroke="#78350f" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                    </g>

                    <ellipse cx="38" cy="61" rx="6.5" ry="4" fill="#fb7185" opacity="0.65" />
                    <ellipse cx="78" cy="61" rx="6.5" ry="4" fill="#fb7185" opacity="0.65" />

                    {/* Miệng mở to chữ O gọi trà đá cực hào hứng */}
                    <ellipse cx="60" cy="65" rx="5.5" ry="7" fill="#991b1b" stroke="#7f1d1d" strokeWidth="0.8" />
                    <ellipse cx="60" cy="68" rx="3.5" ry="3.5" fill="#f87171" />
                  </g>
                )}

                {/* ============================================================== */}
                {/* 3. TRẠNG THÁI C & D: ĐỨNG LÊN / NGỒI XUỐNG (TRANSITION POSES)  */}
                {/* Có hình thể rõ ràng, không bị biến mất giữa chừng!             */}
                {/* ============================================================== */}
                {(uncleState === 'standing_up' || uncleState === 'sitting_down') && (
                  <g>
                    {/* Chân gập gối nhổm người đứng dậy / ngồi xuống */}
                    <path d="M44 116 Q 42 136 46 156" stroke="url(#chibiSkin)" strokeWidth="11" strokeLinecap="round" fill="none" />
                    <rect x="38" y="158" width="20" height="9" rx="3.5" fill="url(#chibiSandal)" stroke="#ca8a04" strokeWidth="1.2" />
                    <path d="M68 116 Q 72 136 76 156" stroke="url(#chibiSkin)" strokeWidth="11" strokeLinecap="round" fill="none" />
                    <rect x="70" y="158" width="20" height="9" rx="3.5" fill="url(#chibiSandal)" stroke="#ca8a04" strokeWidth="1.2" />

                    <path d="M38 110 C 36 122, 44 132, 58 132 C 70 132, 78 122, 76 110 Z" fill="url(#chibiShorts)" stroke="#0f172a" strokeWidth="1.2" />
                    <path d="M40 102 C 38 88, 48 80, 58 80 C 70 80, 78 88, 76 102 Z" fill="url(#chibiShirt)" stroke="#94a3b8" strokeWidth="1.2" />
                    <path d="M52 82 L 52 72 L 64 72 L 64 82 Z" fill="url(#chibiSkin)" />
                    <path d="M48 80 Q 58 85 68 80" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                    {/* Hai tay chống gối lấy đà vững chãi */}
                    <path d="M42 86 Q 36 102 48 114" stroke="url(#chibiSkin)" strokeWidth="8.5" strokeLinecap="round" fill="none" />
                    <path d="M74 86 Q 80 102 68 114" stroke="url(#chibiSkin)" strokeWidth="8.5" strokeLinecap="round" fill="none" />

                    {/* Đầu Chibi */}
                    <ellipse cx="58" cy="48" rx="32" ry="29" fill="url(#chibiSkin)" stroke="#fed7aa" strokeWidth="1" />
                    <circle cx="28" cy="50" r="6" fill="url(#chibiSkin)" />
                    <path d="M28 42 C 30 18, 86 18, 88 42 Z" fill="url(#chibiCap)" stroke="#c2410c" strokeWidth="1.2" />
                    <ellipse cx="64" cy="40" rx="28" ry="7" fill="url(#chibiCapBrim)" stroke="#b45309" strokeWidth="1.4" />

                    <ellipse cx="48" cy="51" rx="6.5" ry="8" fill="#0f172a" />
                    <circle cx="47" cy="49" r="2.2" fill="#ffffff" />
                    <ellipse cx="70" cy="51" rx="6.5" ry="8" fill="#0f172a" />
                    <circle cx="69" cy="49" r="2.2" fill="#ffffff" />
                    <ellipse cx="38" cy="59" rx="6.5" ry="4" fill="#fb7185" opacity="0.65" />
                    <ellipse cx="78" cy="59" rx="6.5" ry="4" fill="#fb7185" opacity="0.65" />
                    <path d="M54 62 Q 60 67 66 62" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="#fdba74" />
                  </g>
                )}

                {/* ============================================================== */}
                {/* 4. TRẠNG THÁI E: ĐI BỘ CHIBI (WALKING_TO_STALL HOẶC WALKING_BACK) */}
                {/* Chân tay gắn chặt vào khớp, xoay tự nhiên không bị văng rời!    */}
                {/* ============================================================== */}
                {(uncleState === 'walking_to_stall' || uncleState === 'walking_back') && (
                  <g className="animate-walk-bob">
                    {/* Chân trái bước đi tự nhiên từ khớp háng */}
                    <g className="animate-walk-leg-left">
                      <path d="M48 116 Q 44 136 40 154" stroke="url(#chibiSkin)" strokeWidth="11" strokeLinecap="round" fill="none" />
                      <rect x="32" y="156" width="20" height="9" rx="3.5" fill="url(#chibiSandal)" stroke="#ca8a04" strokeWidth="1.2" />
                    </g>
                    {/* Chân phải bước đi so le */}
                    <g className="animate-walk-leg-right">
                      <path d="M68 116 Q 72 136 78 154" stroke="url(#chibiSkin)" strokeWidth="11" strokeLinecap="round" fill="none" />
                      <rect x="72" y="156" width="20" height="9" rx="3.5" fill="url(#chibiSandal)" stroke="#ca8a04" strokeWidth="1.2" />
                    </g>

                    {/* Quần soóc */}
                    <path d="M38 110 C 36 122, 44 132, 58 132 C 70 132, 78 122, 76 110 Z" fill="url(#chibiShorts)" stroke="#0f172a" strokeWidth="1.2" />

                    {/* Thân áo Chibi */}
                    <path d="M40 102 C 38 88, 48 80, 58 80 C 70 80, 78 88, 76 102 Z" fill="url(#chibiShirt)" stroke="#94a3b8" strokeWidth="1.2" />
                    <path d="M52 82 L 52 72 L 64 72 L 64 82 Z" fill="url(#chibiSkin)" />
                    <path d="M48 80 Q 58 85 68 80" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                    {/* Đầu Chibi */}
                    <ellipse cx="58" cy="48" rx="32" ry="29" fill="url(#chibiSkin)" stroke="#fed7aa" strokeWidth="1" />
                    <circle cx="28" cy="50" r="6" fill="url(#chibiSkin)" />
                    <path d="M28 42 C 30 18, 86 18, 88 42 Z" fill="url(#chibiCap)" stroke="#c2410c" strokeWidth="1.2" />
                    <ellipse cx="64" cy="40" rx="28" ry="7" fill="url(#chibiCapBrim)" stroke="#b45309" strokeWidth="1.4" />

                    <g className={`animate-chibi-blink ${uncleIsBlinking ? 'chibi-eye-blinking' : 'chibi-eye-open'}`}>
                      <ellipse cx="48" cy="51" rx="6.5" ry="8" fill="#0f172a" />
                      <circle cx="47" cy="49" r="2.2" fill="#ffffff" />
                      <ellipse cx="70" cy="51" rx="6.5" ry="8" fill="#0f172a" />
                      <circle cx="69" cy="49" r="2.2" fill="#ffffff" />
                    </g>
                    <ellipse cx="38" cy="59" rx="6.5" ry="4" fill="#fb7185" opacity="0.65" />
                    <ellipse cx="78" cy="59" rx="6.5" ry="4" fill="#fb7185" opacity="0.65" />
                    <path d="M54 62 Q 60 67 66 62" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="#fdba74" />

                    {/* Tay khi đi bộ: nếu đang cầm cốc trà thì tay giữ cốc, nếu không thì đánh tay nhẹ */}
                    {uncleHasGlass ? (
                      <g>
                        {/* Tay trái đánh nhẹ */}
                        <g className="animate-walk-arm-left">
                          <ellipse cx="42" cy="84" rx="6" ry="5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                          <path d="M42 88 Q 36 102 40 114" stroke="url(#chibiSkin)" strokeWidth="8" strokeLinecap="round" fill="none" />
                        </g>
                        {/* Tay phải cầm chắc cốc trà đá mát lạnh mang về */}
                        <g>
                          <ellipse cx="74" cy="84" rx="6" ry="5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                          <path d="M74 88 Q 86 92 88 84" stroke="url(#chibiSkin)" strokeWidth="8" strokeLinecap="round" fill="none" />
                          <circle cx="89" cy="82" r="5" fill="url(#chibiSkin)" />
                          {/* Cốc trà đá trên tay */}
                          <rect x="85" y="68" width="12" height="18" rx="2.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
                          <rect x="87" y="71" width="8" height="5" rx="1" fill="#ffffff" opacity="0.8" />
                          <line x1="91" y1="62" x2="92" y2="80" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
                        </g>
                      </g>
                    ) : (
                      <g>
                        <g className="animate-walk-arm-left">
                          <ellipse cx="42" cy="84" rx="6" ry="5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                          <path d="M42 88 Q 34 102 38 114" stroke="url(#chibiSkin)" strokeWidth="8" strokeLinecap="round" fill="none" />
                        </g>
                        <g className="animate-walk-arm-right">
                          <ellipse cx="74" cy="84" rx="6" ry="5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                          <path d="M74 88 Q 82 102 78 114" stroke="url(#chibiSkin)" strokeWidth="8" strokeLinecap="round" fill="none" />
                        </g>
                      </g>
                    )}
                  </g>
                )}

                {/* ============================================================== */}
                {/* 5. TRẠNG THÁI F: NHẬN CỐC NƯỚC TẠI QUẦY (RECEIVING_DRINK)       */}
                {/* ============================================================== */}
                {uncleState === 'receiving_drink' && (
                  <g>
                    <path d="M46 116 L 46 156" stroke="url(#chibiSkin)" strokeWidth="11" strokeLinecap="round" fill="none" />
                    <rect x="38" y="158" width="20" height="9" rx="3.5" fill="url(#chibiSandal)" stroke="#ca8a04" strokeWidth="1.2" />
                    <path d="M70 116 L 70 156" stroke="url(#chibiSkin)" strokeWidth="11" strokeLinecap="round" fill="none" />
                    <rect x="64" y="158" width="20" height="9" rx="3.5" fill="url(#chibiSandal)" stroke="#ca8a04" strokeWidth="1.2" />

                    <path d="M38 110 C 36 122, 44 132, 58 132 C 70 132, 78 122, 76 110 Z" fill="url(#chibiShorts)" stroke="#0f172a" strokeWidth="1.2" />
                    <path d="M40 102 C 38 88, 48 80, 58 80 C 70 80, 78 88, 76 102 Z" fill="url(#chibiShirt)" stroke="#94a3b8" strokeWidth="1.2" />
                    <path d="M52 82 L 52 72 L 64 72 L 64 82 Z" fill="url(#chibiSkin)" />
                    <path d="M48 80 Q 58 85 68 80" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                    {/* Hai tay đưa ra đón nhận cốc trà đá từ cô chủ quán */}
                    <path d="M44 86 Q 58 92 78 88" stroke="url(#chibiSkin)" strokeWidth="8" strokeLinecap="round" fill="none" />
                    <path d="M74 86 Q 84 90 92 84" stroke="url(#chibiSkin)" strokeWidth="8" strokeLinecap="round" fill="none" />
                    <circle cx="82" cy="88" r="5" fill="url(#chibiSkin)" />
                    <circle cx="92" cy="84" r="5" fill="url(#chibiSkin)" />

                    {/* Cốc trà tươi vàng mát rượi */}
                    <rect x="84" y="70" width="13" height="19" rx="3" fill="#fde047" stroke="#ca8a04" strokeWidth="1.2" />
                    <rect x="86" y="73" width="9" height="5" rx="1.5" fill="#ffffff" opacity="0.85" />
                    <line x1="90" y1="64" x2="91" y2="84" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />

                    <ellipse cx="58" cy="48" rx="32" ry="29" fill="url(#chibiSkin)" stroke="#fed7aa" strokeWidth="1" />
                    <circle cx="28" cy="50" r="6" fill="url(#chibiSkin)" />
                    <path d="M28 42 C 30 18, 86 18, 88 42 Z" fill="url(#chibiCap)" stroke="#c2410c" strokeWidth="1.2" />
                    <ellipse cx="64" cy="40" rx="28" ry="7" fill="url(#chibiCapBrim)" stroke="#b45309" strokeWidth="1.4" />

                    <ellipse cx="48" cy="51" rx="6.5" ry="8" fill="#0f172a" />
                    <circle cx="47" cy="49" r="2.2" fill="#ffffff" />
                    <ellipse cx="70" cy="51" rx="6.5" ry="8" fill="#0f172a" />
                    <circle cx="69" cy="49" r="2.2" fill="#ffffff" />
                    <ellipse cx="38" cy="59" rx="6.5" ry="4" fill="#fb7185" opacity="0.65" />
                    <ellipse cx="78" cy="59" rx="6.5" ry="4" fill="#fb7185" opacity="0.65" />
                    <path d="M54 62 Q 60 68 66 62" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="#fdba74" />
                  </g>
                )}

                {/* ============================================================== */}
                {/* 6. TRẠNG THÁI G: UỐNG MỘT NGỤM TRÀ SẢNG KHOÁI (DRINKING_SIP)     */}
                {/* ============================================================== */}
                {uncleState === 'drinking_sip' && (
                  <g className="animate-pulse" style={{ animationDuration: '1.2s' }}>
                    <path d="M46 116 L 46 156" stroke="url(#chibiSkin)" strokeWidth="11" strokeLinecap="round" fill="none" />
                    <rect x="38" y="158" width="20" height="9" rx="3.5" fill="url(#chibiSandal)" stroke="#ca8a04" strokeWidth="1.2" />
                    <path d="M70 116 L 70 156" stroke="url(#chibiSkin)" strokeWidth="11" strokeLinecap="round" fill="none" />
                    <rect x="64" y="158" width="20" height="9" rx="3.5" fill="url(#chibiSandal)" stroke="#ca8a04" strokeWidth="1.2" />

                    <path d="M38 110 C 36 122, 44 132, 58 132 C 70 132, 78 122, 76 110 Z" fill="url(#chibiShorts)" stroke="#0f172a" strokeWidth="1.2" />
                    <path d="M40 102 C 38 88, 48 80, 58 80 C 70 80, 78 88, 76 102 Z" fill="url(#chibiShirt)" stroke="#94a3b8" strokeWidth="1.2" />
                    <path d="M52 82 L 52 72 L 64 72 L 64 82 Z" fill="url(#chibiSkin)" />
                    <path d="M48 80 Q 58 85 68 80" stroke="#475569" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                    {/* Đầu ngửa nhẹ lên tận hưởng vị trà mát */}
                    <ellipse cx="58" cy="46" rx="32" ry="29" fill="url(#chibiSkin)" stroke="#fed7aa" strokeWidth="1" />
                    <circle cx="28" cy="48" r="6" fill="url(#chibiSkin)" />
                    <path d="M28 40 C 30 16, 86 16, 88 40 Z" fill="url(#chibiCap)" stroke="#c2410c" strokeWidth="1.2" />
                    <ellipse cx="64" cy="38" rx="28" ry="7" fill="url(#chibiCapBrim)" stroke="#b45309" strokeWidth="1.4" />

                    {/* Mắt nhắm tít hình cánh cung cười mãn nguyện (^ _ ^) */}
                    <path d="M42 50 Q 48 44 54 50" stroke="#1e1b4b" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                    <path d="M66 50 Q 72 44 78 50" stroke="#1e1b4b" strokeWidth="2.8" strokeLinecap="round" fill="none" />

                    <ellipse cx="36" cy="56" rx="7" ry="4.5" fill="#fb7185" opacity="0.8" />
                    <ellipse cx="80" cy="56" rx="7" ry="4.5" fill="#fb7185" opacity="0.8" />

                    {/* Hai tay nâng cốc trà kề sát miệng */}
                    <path d="M46 86 Q 58 80 66 66" stroke="url(#chibiSkin)" strokeWidth="8" strokeLinecap="round" fill="none" />
                    <path d="M74 86 Q 80 78 72 64" stroke="url(#chibiSkin)" strokeWidth="8" strokeLinecap="round" fill="none" />

                    {/* Cốc trà nghiêng kề miệng uống */}
                    <rect x="64" y="50" width="13" height="19" rx="3" fill="#fde047" stroke="#ca8a04" strokeWidth="1.2" transform="rotate(-18 70 59)" />
                    <line x1="70" y1="44" x2="71" y2="64" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" transform="rotate(-18 70 59)" />
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
    </div>

    {/* 3. LỚP HOẠT CẢNH XE ĐẠP & HÀNG RONG CHIBI BĂNG QUA ĐƯỜNG (Z-30 TRÊN BÀN CỜ ĐỂ KHÔNG BỊ BÀN CỜ CHE KHUẤT) */}
    {isWalkersEnabled && scene !== 'cathedral' && (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-30 select-none">
        {/* Bóng xe đạp lướt qua ở xa trên phố */}
        {cyclistActive && (
          <div className="absolute bottom-[20%] sm:bottom-[23%] left-0 pointer-events-none z-30 animate-chibi-cross-street">
            {characterStyle === 'realistic' ? (
              <ArticulatedCyclist />
            ) : (
              <div className="w-28 h-20 filter drop-shadow-lg">
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
          </div>
        )}

        {/* Người bán hàng rong đi qua ở xa ngoài đường */}
        {streetVendorActive && (
          <div className="absolute bottom-[18%] sm:bottom-[21%] left-0 pointer-events-none z-30 animate-chibi-vendor-cross">
            {/* Lời rao hàng rong ngoài đường phố */}
            {vendorQuote && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-amber-950/95 text-amber-100 border border-amber-400/80 text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-2xl shadow-2xl whitespace-nowrap animate-bounce z-40 flex items-center gap-1.5 backdrop-blur-md">
                <span>📣 {vendorQuote}</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-400/80" />
              </div>
            )}

            {characterStyle === 'realistic' ? (
              <ArticulatedStreetVendor />
            ) : (
              <div className="w-36 h-28 filter drop-shadow-lg">
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
          </div>
        )}
      </div>
    )}

    {/* 6. THANH ĐIỀU KHIỂN TINH TẾ GÓC MÀN HÌNH (Z-40 HOÀN TOÀN TRÊN MAIN Z-10 ĐỂ NHẬN CLICK 100%) */}
      <MobileOptionsSlot title="Nhân vật và hoạt cảnh">
    <div
      className={`fixed ${
        isFullscreen ? 'bottom-3 sm:bottom-4' : 'bottom-13 lg:bottom-4'
      } left-3 sm:left-4 z-40 pointer-events-auto flex flex-wrap sm:flex-nowrap items-center gap-1 sm:gap-1.5 bg-stone-950/95 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full shadow-2xl text-[10px] sm:text-xs select-none max-w-[calc(100vw-24px)]`}
    >
      {/* Nút bật/tắt nhân vật */}
      <button
        type="button"
        onClick={toggleWalkers}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors font-medium border ${
          isWalkersEnabled
            ? 'text-amber-300 hover:text-amber-200 bg-amber-950/80 border-amber-500/50 shadow-sm'
            : 'text-stone-400 hover:text-stone-200 bg-stone-900/80 border-white/10'
        }`}
        title={isWalkersEnabled ? 'Đang bật nhân vật (Click để tắt)' : 'Đã tắt nhân vật (Click để bật lại)'}
      >
        <span className="text-xs">{characterStyle === 'realistic' ? '👤' : '🎎'}</span>
        <span className="hidden sm:inline">Nhân vật:</span>
        <span className="sm:hidden">Người:</span>
        <span className="font-bold">{isWalkersEnabled ? 'Bật' : 'Tắt'}</span>
      </button>

      {/* Nút chuyển đổi phong cách: 3D Thật vs Chibi */}
      {isWalkersEnabled && (
        <button
          type="button"
          onClick={() => {
            setCharacterStyle((prev) => {
              const next = prev === 'realistic' ? 'chibi' : 'realistic';
              try {
                localStorage.setItem('co_up_character_style', next);
              } catch {}
              return next;
            });
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all font-semibold border ${
            characterStyle === 'realistic'
              ? 'bg-purple-950/80 text-purple-200 border-purple-400/60 shadow-sm hover:bg-purple-900/80'
              : 'bg-amber-950/80 text-amber-200 border-amber-400/60 shadow-sm hover:bg-amber-900/80'
          }`}
          title="Chuyển đổi phong cách: 3D Tả thực hoặc Chibi hoạt hình"
        >
          <span>{characterStyle === 'realistic' ? '👤 3D Thật' : '🎎 Chibi'}</span>
        </button>
      )}

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

          {/* Nút 3: XE ĐẠP CHẠY QUA */}
          <button
            type="button"
            onClick={triggerCyclistPass}
            disabled={cyclistActive}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-500/40 font-semibold active:scale-95 transition-all disabled:opacity-50"
            title="Em bé Chibi đạp xe lướt qua kèm tiếng chuông kính coong vui tai!"
          >
            <Bike className="w-3 h-3 text-cyan-300" />
            <span className="hidden sm:inline">Xe đạp</span>
            <span className="sm:hidden">Xe</span>
          </button>

          {/* Nút 4: THỬ TIẾNG RAO HÀNG RONG NGOÀI ĐƯỜNG */}
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
    </MobileOptionsSlot>
  </>
);
};
