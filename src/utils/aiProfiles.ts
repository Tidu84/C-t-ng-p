import type { AiDifficulty } from '../types';

export type JieqiEngineId = 'pikajieqi' | 'abjchess' | 'jqe';

export const AI_PROFILES: Record<AiDifficulty, { name: string; engine: JieqiEngineId; avatar: string; description: string; budgetFraction: number; depth: number }> = {
  easy: { name: 'Người thường', engine: 'pikajieqi', avatar: '/assets/ai-binh-thuong.png', description: 'Đánh chắc chắn, chiến thuật toàn diện.', budgetFraction: 0.75, depth: 10 },
  medium: { name: 'Ham chơi', engine: 'abjchess', avatar: '/assets/ai-ham-choi.png', description: 'Đủ sức giao lưu, thích so tài bàn quán.', budgetFraction: 0.85, depth: 12 },
  hard: { name: 'Lão quái', engine: 'jqe', avatar: '/assets/ai-lao-quai.png', description: 'Tính kỹ trong thời gian anh chọn, không nhìn trộm quân úp.', budgetFraction: 1, depth: 64 },
};
