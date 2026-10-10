/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Voice Commentary & Audio Reactions (Bình luận âm thanh khi mở quân cờ)
 * Chuyển những lời bình luận dân dã, hóm hỉnh khi mở quân cờ thành GIỌNG NÓI & ÂM THANH
 * thay vì hiện chữ che bàn cờ, mang lại cảm giác có bác khán giả vỉa hè ngồi cạnh tán thưởng!
 */

import { PieceRole, PlayerColor } from '../types';
import { sound } from './audio';

const REVEAL_VOICE_QUOTES: Record<PieceRole, { red: string[]; black: string[] }> = {
  chariot: {
    red: [
      'Ối giồi ôi! Mở đúng con Xe chiến! Đỏ như son thế này thì ai đỡ nổi!',
      'Mở trúng Xe rồi các bác ơi! Đại quân xuất trận, thắng chắc!',
      'Xe chiến xuất kích! Phen này công thành phá trại!',
    ],
    black: [
      'Bên Đen mở trúng Xe rồi kìa các bác! Thế trận đảo chiều!',
      'Đen lật được Xe chiến! Cẩn thận coi chừng mất tiên!',
      'Đối thủ vừa mở được Xe, trận này căng thẳng rồi đây!',
    ],
  },
  cannon: {
    red: [
      'Mở trúng Pháo thần công! Khói lửa ngút trời, bên kia toát mồ hôi!',
      'Pháo nổ vang rền! Một phát bắn hạ vạn binh!',
      'Lật được Pháo rồi! Coi chừng ăn đòn sấm sét!',
    ],
    black: [
      'Bên Đen mở được Pháo! Cẩn thận pháo lồng pháo giằng!',
      'Đen lật trúng Pháo thần! Coi chừng nó bắn tỉa góc hiểm!',
      'Đối thủ có Pháo rồi, phải canh chừng nắp cờ kỹ vào!',
    ],
  },
  horse: {
    red: [
      'Mở được Mã phi đường trường! Bát tuấn tung vó, chuẩn bị nhảy góc hiểm!',
      'Khởi Mã tung hoành! Nước cờ quá thoáng!',
      'Mã chiến xuất chuồng! Cản chân sao nổi!',
    ],
    black: [
      'Bên Đen lật được Mã! Coi chừng Mã ngọa tào sát cục!',
      'Đen mở trúng Mã phi rồi! Chú ý đường nhảy của nó!',
    ],
  },
  advisor: {
    red: [
      'Lật được quân Sĩ! Sĩ qua sông cơ động, phòng tuyến vững như bàn thạch!',
      'Mở được Sĩ rồi! Chạy chéo thông thoáng, công thủ vẹn toàn!',
    ],
    black: [
      'Bên Đen vừa mở được Sĩ thủ thành kiên cố!',
      'Đen lật được Sĩ rồi, thế thủ thêm chắc chắn!',
    ],
  },
  elephant: {
    red: [
      'Lật được Tượng tự do qua sông! Bộ giáp hộ vệ vững như bàn thạch!',
      'Tượng chiến mở cánh! Không gian quá rộng rãi!',
    ],
    black: [
      'Bên Đen vừa mở được Tượng qua sông rồi!',
      'Đen lật được Tượng, thế cờ thêm kiên cố!',
    ],
  },
  soldier: {
    red: [
      'Haha, mở trúng con Chốt! Khởi đầu gian nan, cờ tàn mới biết!',
      'Lật được Chốt qua sông, một Tốt cũng thành công!',
    ],
    black: [
      'Đối thủ vừa mở được con Tốt, thở phào nhẹ nhõm một nhịp!',
      'Đen mở trúng Tốt rồi, cơ hội phản công cho ta!',
    ],
  },
  king: {
    red: ['Mở được Tướng!'],
    black: ['Đối thủ lật Tướng!'],
  },
};

class VoiceCommentaryController {
  private enabled: boolean = true;
  private isSpeaking: boolean = false;
  private cachedViVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('co_up_voice_commentary_enabled');
        if (saved !== null) {
          this.enabled = saved === 'true';
        }
      } catch {}

      this.initVoices();
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const findVi = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        this.cachedViVoice =
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('vi') ||
              v.name.toLowerCase().includes('vietnam') ||
              v.name.toLowerCase().includes('tieng viet')
          ) || null;
      } catch {}
    };

    findVi();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = findVi;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('co_up_voice_commentary_enabled', String(enabled));
      } catch {}
      if (!enabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }

  /**
   * Thử giọng bình luận mở quân hoặc nhận xét nước cờ
   */
  public speakTest(type: 'reveal' | 'check' | 'accurate' = 'reveal', role: PieceRole = 'chariot') {
    if (type === 'check') {
      this.speak('Chiếu tướng giật mình rơi điếu thuốc lào! Ép đối thủ chạy té khói, hay lắm bác ơi!');
    } else if (type === 'accurate') {
      this.speak('Nước cờ nét như Sony! Tí nữa nhớ khao tôi chén trà đá phong thủy nhé!');
    } else {
      this.speakReveal(role, 'red');
    }
  }

  /**
   * Cất giọng đọc trực tiếp câu nhận xét nước cờ bằng lời nói tự nhiên, sinh động
   * Thay thế hoàn toàn việc hiện text che bàn cờ, giúp bàn cờ luôn thông thoáng!
   */
  public speak(
    text: string,
    options?: { role?: PieceRole; color?: PlayerColor; delayMs?: number }
  ) {
    // 1. Nếu có quân cờ (như mở quân), phát âm thanh cảm thán sống động
    if (options?.role) {
      this.playAudioReaction(options.role);
    }

    // 2. Kiểm tra bật/tắt và hỗ trợ SpeechSynthesis
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // Làm sạch chuỗi trước khi đưa vào Text-To-Speech:
      // Bỏ emoji và các dấu ngoặc kép để giọng đọc trôi chảy, không vấp
      const cleanText = text
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/[“""”*•❖]/g, '')
        .trim();

      if (!cleanText) return;

      // Hủy bỏ lời nói cũ nếu đang nói dở để phản hồi nước cờ mới ngay lập tức
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.05; // Tốc độ đàm đạo vừa vặn, sống động
      utterance.pitch = 1.05; // Âm sắc hồ hởi, vui vẻ

      if (this.cachedViVoice) {
        utterance.voice = this.cachedViVoice;
      } else {
        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith('vi') ||
            v.name.toLowerCase().includes('vietnam') ||
            v.name.toLowerCase().includes('tieng viet')
        );
        if (viVoice) {
          this.cachedViVoice = viVoice;
          utterance.voice = viVoice;
        }
      }

      this.isSpeaking = true;
      utterance.onend = () => {
        this.isSpeaking = false;
      };
      utterance.onerror = () => {
        this.isSpeaking = false;
      };

      const delay = options?.delayMs ?? 150;
      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch {}
      }, delay);
    } catch {}
  }

  /**
   * Cất giọng đọc bình luận và phát âm thanh cảm thán khi mở quân cờ
   */
  public speakReveal(role: PieceRole, color: PlayerColor) {
    const quotes = REVEAL_VOICE_QUOTES[role]?.[color] || REVEAL_VOICE_QUOTES.soldier.red;
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    this.speak(quote, { role, color, delayMs: 180 });
  }

  /**
   * Phát âm thanh cảm thán tổng hợp khi mở quân cờ (tiếng trầm trồ, vỗ tay, pháo reo...)
   */
  private playAudioReaction(role: PieceRole) {
    switch (role) {
      case 'chariot':
        sound.playLuckyReveal('chariot');
        break;
      case 'cannon':
        sound.playLuckyReveal('cannon');
        break;
      case 'horse':
        sound.playLuckyReveal('horse');
        break;
      default:
        sound.playFlip();
        break;
    }
  }
}

export const voiceCommentary = new VoiceCommentaryController();
