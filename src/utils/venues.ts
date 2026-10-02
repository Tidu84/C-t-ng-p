import { BackgroundScene3D, VenueType } from '../types';

export interface VenueInfo {
  id: VenueType;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  icon: string;
  badge: string;
  bannerBg: string;
  commentaryStyle: string;
  spectatorPersona: string;
  matchingScene: BackgroundScene3D;
}

export const VENUES: Record<VenueType, VenueInfo> = {
  via_he: {
    id: 'via_he',
    name: 'Cờ Vỉa Hè',
    shortName: 'Vỉa Hè',
    tagline: 'Trà đá cóc hè phố, bàn cờ gỗ mộc, chém gió vui rôm rả',
    description: 'Không gian cờ bình dân góc phố thân quen với chén trà đá phong thủy và những pha chém gió tếu táo của các bác mê cờ.',
    icon: '🍵',
    badge: 'Phố Phường Bình Dân',
    bannerBg: 'from-amber-900/50 via-stone-900 to-amber-950/40',
    commentaryStyle: 'Chém gió tếu táo, dân dã',
    spectatorPersona: 'Bác Ba Trà Đá & Chú Tư',
    matchingScene: 'tra_da',
  },
  hoi_quan: {
    id: 'hoi_quan',
    name: 'Hội Quán Kỳ Trà',
    shortName: 'Hội Quán',
    tagline: 'Trầm hương vấn vương, chén trà thanh tao, kỳ đạo đàm luận',
    description: 'Nơi quy tụ các bậc danh kỳ đàm đạo nước cờ, phong cách tao nhã, thanh thoát như mây trôi nước chảy.',
    icon: '🏯',
    badge: 'Tao Nhã Cổ Kính',
    bannerBg: 'from-emerald-950/60 via-stone-900 to-stone-950',
    commentaryStyle: 'Thi vị, tao nhã, đàm đạo',
    spectatorPersona: 'Trà Sư Mặc Khách & Cụ Lương',
    matchingScene: 'hoa_vien',
  },
  co_phui: {
    id: 'co_phui',
    name: 'Cờ Phủi Quán Cà Phê',
    shortName: 'Cờ Phủi',
    tagline: 'Cà phê phin đậm đà, chiến thuật sắc sảo, tranh tiên nảy lửa',
    description: 'Không gian quán cà phê cờ tướng sành sỏi, phân tích nước biến thâm sâu, sát khí ngút trời.',
    icon: '☕',
    badge: 'Sát Phạt Chiến Thuật',
    bannerBg: 'from-red-950/60 via-stone-900 to-stone-950',
    commentaryStyle: 'Sành sỏi, sắc bén, cà phê',
    spectatorPersona: 'Anh Hoàng Cà Phê & Kỳ Thủ Bàn Bên',
    matchingScene: 'ca_phe',
  },
  clb_co_up: {
    id: 'clb_co_up',
    name: 'Đấu Trường CLB Cờ Úp',
    shortName: 'CLB Cờ Úp',
    tagline: 'Đấu trường chuyên nghiệp, chuẩn mực học thuật, tranh cúp Kỳ Vương',
    description: 'Sân chơi đẳng cấp chính quy với ban giám khảo chuyên môn, phân tích thế trận chuẩn giáo trình kỳ viện.',
    icon: '🏆',
    badge: 'Đấu Trường Chuyên Nghiệp',
    bannerBg: 'from-blue-950/60 via-stone-900 to-indigo-950/40',
    commentaryStyle: 'Học thuật, chuẩn kỳ viện',
    spectatorPersona: 'Đại Sư & Kiện Tướng Quốc Gia',
    matchingScene: 'dau_truong',
  },
};

export const VENUE_LIST: VenueInfo[] = Object.values(VENUES);
