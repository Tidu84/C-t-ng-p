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
import { MangaChessWatcher, MangaTeaHost, MangaCyclist, MangaStreetVendor } from './MangaStreetCharacters';
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
      return false; // Mac dinh tat cac nhan vat hoat hinh ben ngoai
    } catch {
      return false;
    }
  });

  const isWalkersEnabled = propIsChibiEnabled !== undefined ? propIsChibiEnabled : internalWalkersEnabled;

  // Preserve saved style keys: color manga / monochrome ink.
  const [characterStyle, setCharacterStyle] = useState<'realistic' | 'chibi'>(() => {
    try {
      const saved = localStorage.getItem('co_up_character_style');
      return saved === 'chibi' ? 'chibi' : 'realistic'; // Mặc định truyện màu
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
        return 'Em ơi, cho một nâu đá nhiều sữa bàn cờ úp nhé!';
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
                <MangaTeaHost pouring={serverState === 'pouring_tea'} walking={serverState === 'serving_walk' || serverState === 'serving_back'} blink={serverIsBlinking} mono={characterStyle === 'chibi'} />
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
              <MangaChessWatcher action={uncleState} blink={uncleIsBlinking} hasGlass={uncleHasGlass} mono={characterStyle === 'chibi'} />
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

    {/* Hoạt cảnh giữ phía sau vùng chơi trên mobile; desktop giữ thứ tự lớp cũ. */}
    {isWalkersEnabled && scene !== 'cathedral' && (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 lg:z-30 select-none">
        {/* Bóng xe đạp lướt qua ở xa trên phố */}
        {cyclistActive && (
          <div className="absolute bottom-[20%] sm:bottom-[23%] left-0 pointer-events-none z-30 animate-chibi-cross-street">
            <MangaCyclist mono={characterStyle === 'chibi'} />
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

            <MangaStreetVendor mono={characterStyle === 'chibi'} />
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

      {/* Nút chuyển đổi phong cách: Truyện màu / Nét mực */}
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
          title="Chuyển giữa truyện màu và nét mực đen trắng"
        >
          <span>{characterStyle === 'realistic' ? 'Truyện màu' : 'Nét mực'}</span>
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
            title="Nhân vật truyện tranh đạp xe ngang phố, kèm tiếng chuông xe đạp"
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
