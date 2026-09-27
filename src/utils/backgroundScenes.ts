/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import bgTraDa from '../assets/images/bg_tra_da_via_he_1790500124345.jpg';
import bgCaPhe from '../assets/images/bg_quan_ca_phe_1790500142355.jpg';
import bgHoaVien from '../assets/images/bg_hoa_vien_ky_tra_1790500159198.jpg';
import bgDauTruong from '../assets/images/bg_dau_truong_ky_vuong_1790500173408.jpg';

export type BackgroundScene3D = 'tra_da' | 'ca_phe' | 'hoa_vien' | 'dau_truong' | 'go_tram';

export interface SceneConfig {
  id: BackgroundScene3D;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  imageUrl?: string;
}

export const SCENE_CONFIGS: SceneConfig[] = [
  {
    id: 'tra_da',
    name: 'Quán Trà Đá Vỉa Hè',
    shortName: 'Trà đá vỉa hè',
    icon: '🍵',
    description: 'Bàn gỗ mộc mạc, cốc trà đá mát lạnh dưới tán cây chiều thu',
    imageUrl: bgTraDa,
  },
  {
    id: 'ca_phe',
    name: 'Quán Cà Phê Cờ Tướng',
    shortName: 'Quán Cà Phê',
    icon: '☕',
    description: 'Không gian ấm cúng, đèn vàng vintage, bàn gỗ nâu trầm hoài niệm',
    imageUrl: bgCaPhe,
  },
  {
    id: 'hoa_vien',
    name: 'Hoa Viên Kỳ Trà',
    shortName: 'Hoa viên kỳ trà',
    icon: '🎋',
    description: 'Sân vườn thanh tịnh, trúc xanh, non bộ, ánh đèn lồng tĩnh tâm',
    imageUrl: bgHoaVien,
  },
  {
    id: 'dau_truong',
    name: 'Đấu Trường Kỳ Vương',
    shortName: 'Đấu trường kỳ vương',
    icon: '🏆',
    description: 'Sân khấu đại hội cờ tướng đỉnh cao, ánh đèn rọi danh giá',
    imageUrl: bgDauTruong,
  },
  {
    id: 'go_tram',
    name: 'Gỗ Trầm Tối Giản',
    shortName: 'Gỗ trầm',
    icon: '🪵',
    description: 'Không gian tĩnh lặng, ánh sáng thiền định cổ điển',
  },
];
