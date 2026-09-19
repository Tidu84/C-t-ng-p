import { VenueType } from '../types';

export interface VenueInfo {
  id: VenueType;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  icon: string;
  badge: string;
  bannerBg: string;
}

export const VENUES: Record<VenueType, VenueInfo> = {
  via_he: {
    id: 'via_he',
    name: 'Cờ Vỉa Hè',
    shortName: 'Vỉa Hè',
    tagline: 'Cà phê cóc hè phố, bàn cờ gỗ mộc, tiếng cười vui rôm rả',
    description: 'Không gian cờ bình dân góc phố thân quen với ly cà phê đá và những pha bình cờ rôm rả của các bác mê cờ.',
    icon: '☕',
    badge: 'Phố Phường Bình Dân',
    bannerBg: 'from-amber-900/50 via-stone-900 to-amber-950/40',
  },
  hoi_quan: {
    id: 'hoi_quan',
    name: 'Hội Quán Cờ',
    shortName: 'Hội Quán',
    tagline: 'Trầm hương vấn vương, chén trà thanh tao, kỳ đạo đàm luận',
    description: 'Nơi quy tụ các bậc danh kỳ đàm đạo nước cờ, phong cách tao nhã, âm vang tiếng gõ quân thanh thúy.',
    icon: '🏯',
    badge: 'Tao Nhã Cổ Kính',
    bannerBg: 'from-emerald-950/60 via-stone-900 to-stone-950',
  },
  co_phui: {
    id: 'co_phui',
    name: 'Cờ Phủi Giang Hồ',
    shortName: 'Cờ Phủi',
    tagline: 'Sát phạt nảy lửa, giang hồ tao ngộ, một nước định giang sơn',
    description: 'Chốn võ lâm kỳ nghệ không khoan nhượng, nước đi táo bạo, sát khí ngút trời của các cao thủ ẩn dật.',
    icon: '⚔️',
    badge: 'Sát Phạt Quyết Liệt',
    bannerBg: 'from-red-950/60 via-stone-900 to-stone-950',
  },
  clb_co_up: {
    id: 'clb_co_up',
    name: 'CLB Cờ Úp Kỳ Vương',
    shortName: 'CLB Cờ Úp',
    tagline: 'Đấu trường chuyên nghiệp, đồng hồ thi đấu, tranh cúp Kỳ Vương',
    description: 'Sân chơi đẳng cấp chính quy với thể lệ chặt chẽ, nơi các kỳ thủ tranh tài từng điểm số để vươn lên ngôi vị Đặc Cấp Kỳ Vương.',
    icon: '🏛️',
    badge: 'Đấu Trường Chuyên Nghiệp',
    bannerBg: 'from-blue-950/60 via-stone-900 to-indigo-950/40',
  },
};

export const VENUE_LIST: VenueInfo[] = Object.values(VENUES);
