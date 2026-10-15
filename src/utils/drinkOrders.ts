/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drink Order Sound & Ambience System (Hệ thống âm thanh gọi đồ uống quán nước định kỳ)
 * Tự động gọi đồ uống (Trà đá, Cà phê phin, Trà sen, Hướng dương, Điếu cày...)
 * định kỳ khoảng 1 phút (55s - 65s) một lần để tạo không gian quán cờ sống động, chân thực.
 */

import { BackgroundScene3D } from '../types';
import { sound } from './audio';
import { voiceCommentary } from './voiceCommentary';

export interface DrinkOrder {
  quote: string;
  name: string;
  avatar: string;
  scene: BackgroundScene3D;
}

export const SCENE_DRINK_ORDERS: Record<
  BackgroundScene3D,
  { name: string; avatar: string; quotes: string[] }
> = {
  tra_da: {
    name: 'Bác Ba Trà Đá',
    avatar: '🍵',
    quotes: [
      'Bác ơi, cho cháu một cốc trà đá nhiều đá với đĩa hướng dương nhé!',
      'Bác Ba ơi, cho xin cốc trà đá phong thủy giải xui với!',
      'Bác ơi, cho một ấm chè nóng đậm đặc xem cờ nào!',
      'Cho xin cốc nhân trần mát rượi giải khát bác tài ơi!',
      'Bác ơi, cho hai cốc trà đá với cái điếu cày nhé!',
      'Cho hai cốc trà đá đĩa kẹo lạc bàn này nhé bác ơi!',
      'Bác ơi, cho cốc sắn dây chanh đá mát lạnh nào!',
      'Bác Ba ơi, cho cốc trà đá mát họng bắt Tướng nào!',
      'Cho thêm cốc trà đá với bao Thăng Long bác ơi!',
      'Bác ơi, cho cốc nhân trần ít đá với gói hướng dương nhé!',
    ],
  },
  ca_phe: {
    name: 'Anh Hoàng Cà Phê',
    avatar: '☕',
    quotes: [
      'Em ơi, cho một ly đen đá không đường đậm đặc nhé!',
      'Cho một nâu đá nhiều sữa bàn cờ tướng em ơi!',
      'Em ơi, cho một ly cà phê phin truyền thống nhiều đá nhé!',
      'Cho ly bạc xỉu đá mát lạnh nhâm nhi tính cờ nào!',
      'Em ơi, cho thêm ly trà đá tráng miệng với nhé!',
      'Cho một ly cà phê trứng thơm béo xem trận cờ đỉnh cao nào!',
      'Cho ly cà phê sữa đá đậm vị bàn số 2 em ơi!',
      'Em ơi, châm thêm bình trà nóng cho bàn cờ này nhé!',
    ],
  },
  hoa_vien: {
    name: 'Trà Sư Mặc Khách',
    avatar: '🎋',
    quotes: [
      'Tiểu nhị, cho xin một ấm trà sen Tây Hồ thanh khiết!',
      'Cho một bình trà ô long thượng hạng thưởng cờ nào!',
      'Xin một chén trà nhài thơm ngát tĩnh tâm tính nước cờ!',
      'Cho thêm ấm nước sôi châm trà sen nhé bạn trà ơi!',
      'Thưởng ấm trà sen ngắm hoa, nước cờ thanh thoát ung dung!',
    ],
  },
  dau_truong: {
    name: 'Ban Tổ Chức',
    avatar: '🏆',
    quotes: [
      'Tiếp nước cho kỳ thủ bàn số 1 nhé phục vụ ơi!',
      'Cho một chai nước suối ướp lạnh nạp năng lượng thi đấu nào!',
      'Cho ly nước tăng lực lạnh tiếp sức trận cờ căng thẳng này!',
      'Phục vụ ơi, cho thêm bình nước lọc cho hai kỳ thủ nhé!',
    ],
  },
  go_tram: {
    name: 'Thiền Sư Kỳ Đạo',
    avatar: '🪵',
    quotes: [
      'Xin một ấm trà phổ nhĩ cổ thụ tĩnh tâm ngộ cờ.',
      'Cho thêm chén trà thiết quan âm thanh tịnh đạo kỳ.',
      'Châm thêm ấm trà nóng hương trầm thư thái tâm hồn.',
    ],
  },
};

export type DrinkOrderListener = (order: DrinkOrder) => void;

class DrinkOrderEngine {
  private enabled: boolean = true;
  private currentScene: BackgroundScene3D = 'tra_da';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<DrinkOrderListener> = new Set();
  private lastQuoteIndex: Record<BackgroundScene3D, number> = {
    tra_da: -1,
    ca_phe: -1,
    hoa_vien: -1,
    dau_truong: -1,
    go_tram: -1,
  };

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('co_up_drink_orders_enabled');
      if (saved !== null) {
        this.enabled = saved === 'true';
      } else {
        this.enabled = true; // Mặc định tự động bật
      }
    } catch {}
  }

  public saveSettings() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('co_up_drink_orders_enabled', String(this.enabled));
    } catch {}
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.saveSettings();
    if (!enabled) {
      this.stop();
    } else {
      this.start();
    }
  }

  public setScene(scene: BackgroundScene3D) {
    this.currentScene = scene;
  }

  public subscribe(listener: DrinkOrderListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Bắt đầu chu kỳ định kỳ gọi đồ uống: Cứ khoảng 1 phút (55s - 65s) lại có 1 lần
   */
  public start(scene?: BackgroundScene3D) {
    if (scene) this.currentScene = scene;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.enabled) return;

    this.scheduleNextOrder();
  }

  public stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Lên lịch gọi đồ uống tiếp theo: khoảng 1 phút (55 - 65 giây)
   */
  private scheduleNextOrder() {
    if (!this.enabled) return;

    // Khoảng 1 phút (55.000ms đến 65.000ms, trung bình 60 giây)
    const nextIntervalMs = 55000 + Math.random() * 10000;

    this.timer = setTimeout(() => {
      if (!this.enabled) return;

      // Nếu hệ thống bình luận đang nói dở nước cờ, hoãn lại 5 giây để tránh giẫm chân
      if (voiceCommentary.isSpeakingCurrently()) {
        this.timer = setTimeout(() => this.triggerOrder(), 5000);
        return;
      }

      this.triggerOrder();
      this.scheduleNextOrder();
    }, nextIntervalMs);
  }

  /**
   * Kích hoạt phát một lần âm thanh gọi đồ uống (có thể gọi thử nghiệm bất kỳ lúc nào)
   */
  public triggerOrder(customScene?: BackgroundScene3D): DrinkOrder {
    const scene = customScene || this.currentScene;
    const sceneConfig = SCENE_DRINK_ORDERS[scene] || SCENE_DRINK_ORDERS.tra_da;
    const quotes = sceneConfig.quotes;

    // Chọn ngẫu nhiên câu thoại không trùng với câu liền trước
    let nextIdx = Math.floor(Math.random() * quotes.length);
    if (quotes.length > 1 && nextIdx === this.lastQuoteIndex[scene]) {
      nextIdx = (nextIdx + 1) % quotes.length;
    }
    this.lastQuoteIndex[scene] = nextIdx;

    const quote = quotes[nextIdx];
    const order: DrinkOrder = {
      quote,
      name: sceneConfig.name,
      avatar: sceneConfig.avatar,
      scene,
    };

    // 1. Phát âm thanh tiếng đá viên / thìa gõ ly / châm nước sống động
    sound.playDrinkOrderSound(scene);

    // 2. Cất giọng đọc câu gọi đồ uống bằng lời nói chân thực (sau 200ms tiếng đá clink)
    setTimeout(() => {
      if (this.enabled) {
        voiceCommentary.speak(quote, { delayMs: 80 });
      }
    }, 200);

    // 3. Thông báo cho các component lắng nghe (hiện toast, bong bóng thoại ở ly nước góc bàn)
    this.listeners.forEach((listener) => {
      try {
        listener(order);
      } catch {}
    });

    return order;
  }
}

export const drinkOrders = new DrinkOrderEngine();
