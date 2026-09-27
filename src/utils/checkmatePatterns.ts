/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Move, Piece, PlayerColor } from '../types';

import assassinImg from '../assets/images/assassin_ink_wash_1789829364027.jpg';
import chariotImg from '../assets/images/chariot_ink_wash_1789829332081.jpg';
import cannonImg from '../assets/images/cannon_ink_wash_1789829347666.jpg';
import kingImg from '../assets/images/king_ink_wash_1789829380484.jpg';

export interface CheckmatePattern {
  id: string;
  name: string; // e.g. "Cục: Nhất xa sát vạn tử"
  subtitle: string;
  description: string;
  image: string; // path to ink wash painting (tranh thủy mặc đen trắng trên nền giấy trắng)
  poem: string;
  badge: string;
}

export function detectCheckmatePattern(
  lastMove: Move | null,
  board: (Piece | null)[][],
  _winner: PlayerColor,
  _moveCount: number
): CheckmatePattern {
  // If the killer move was uncovering a secret covered piece!
  if (lastMove?.wasCovered) {
    return {
      id: 'thich_khach_da_hanh',
      name: 'Cục: Thích khách dạ hành',
      subtitle: 'Ám tiễn xuất động - Xuất quỷ nhập thần',
      description:
        'Quân úp bí ẩn vừa lật mở đã lập tức tung đòn sấm sét chém rơi đầu Tướng địch! Thích khách ẩn mình bấy lâu trong bóng tối nay xuất chiêu định đoạt giang sơn!',
      image: assassinImg,
      poem: 'Ảo ảnh trong mây bỗng lộ hình / Một chiêu đoạt mạng định thư hùng!',
      badge: 'Sát Pháp Bí Truyền',
    };
  }

  const killerRole = lastMove?.revealedRole || (lastMove ? board[lastMove.to.y][lastMove.to.x]?.trueRole : undefined);

  // 1. Nhất Xa Sát Vạn Tử (Chariot checkmate)
  if (killerRole === 'chariot') {
    return {
      id: 'nhat_xa_sat_van_tu',
      name: 'Cục: Nhất xa sát vạn tử',
      subtitle: 'Thiết xa phá trận - Vạn quân nan đào',
      description:
        'Một cỗ chiến xa dũng mãnh xông thẳng vào cấm địa, càn quét ba quân như vào chỗ không người. Một nhát gươm chém tướng đoạt cờ, định đoạt thiên hạ!',
      image: chariotImg,
      poem: 'Chiến xa gầm thét rung bờ cõi / Nhất kiếm đoạt đầu vạn tướng kinh!',
      badge: 'Bá Vương Chiến Xa',
    };
  }

  // 2. Pháo Lồng (Cannon checkmate)
  if (killerRole === 'cannon') {
    return {
      id: 'phao_long',
      name: 'Cục: Pháo lồng',
      subtitle: 'Hỏa pháo giăng thiên võng - Tuyệt lộ hoàng cung',
      description:
        'Mượn quân đối phương làm ngòi nổ, Pháo lệnh khai hỏa khóa chặt bốn phương cấm cung. Tướng địch như cá nằm trong lồng son, bốn bề hỏa lực không lối thoát!',
      image: cannonImg,
      poem: 'Đạn nổ lưng trời tan bách trận / Pháo lồng khóa cửa diệt ba quân!',
      badge: 'Thần Pháo Đoạt Mạng',
    };
  }

  // 3. Mã Ngọa Tào (Horse checkmate)
  if (killerRole === 'horse') {
    return {
      id: 'ma_ngoa_tao',
      name: 'Cục: Mã ngọa tào',
      subtitle: 'Hí lộng cấm cung - Mã bộ tung hoành',
      description:
        'Chiến mã tung vó nhảy vào cung cấm, ngọa tào sát cục phong tỏa mọi ngả đường tiến thoái của Tướng đối phương. Tuyệt kỹ giang hồ lưu danh thiên cổ!',
      image: chariotImg,
      poem: 'Vó ngựa tung hoành xuyên tử huyệt / Vung đao khép lại ván cờ tàn!',
      badge: 'Tuyệt Kỹ Thần Mã',
    };
  }

  // 4. Thiết Tốt Đoạt Hồn (Soldier checkmate)
  if (killerRole === 'soldier') {
    return {
      id: 'thiet_tot_doat_hon',
      name: 'Cục: Thiết tốt phá thành',
      subtitle: 'Dũng tốt sang sông - Nhất bộ định giang sơn',
      description:
        'Tốt qua sông như cọp thêm cánh, từng bước vững chãi áp sát long sàng cắm kiếm trúng tim Tướng địch. Kẻ tưởng như bình dị lại lập nên kỳ công cái thế!',
      image: kingImg,
      poem: 'Tốt tiến một phân dời biển lớn / Tướng cùng đường cụt lệ tuôn rơi!',
      badge: 'Dũng Tốt Đoạt Kỳ',
    };
  }

  // 5. Default / Sudden King: Đột Tử Quân Vương
  return {
    id: 'dot_tu_quan_vuong',
    name: 'Cục: Đột tử quân vương',
    subtitle: 'Chúa công nghênh kiếm - Vận nước tiêu tan',
    description:
      'Trời đất biến sắc, Tướng soái ngã gục trong tích tắc bất ngờ! Đòn sát cục sấm sét khiến đối phương trở tay không kịp, sơn hà xã tắc chính thức đổi chủ!',
    image: kingImg,
    poem: 'Sấm chớp ngang trời rung cấm điện / Quân vương đột tử dứt cơ đồ!',
    badge: 'Kỳ Nghệ Vô Song',
  };
}
