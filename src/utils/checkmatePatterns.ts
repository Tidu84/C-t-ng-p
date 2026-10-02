/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Move, Piece, PlayerColor } from '../types';

import assassinImg from '../assets/images/assassin_ink_wash_1789829364027.webp';
import chariotImg from '../assets/images/chariot_ink_wash_1789829332081.webp';
import cannonImg from '../assets/images/cannon_ink_wash_1789829347666.webp';
import kingImg from '../assets/images/king_ink_wash_1789829380484.webp';
import trappedImg from '../assets/images/trapped_ink_wash_1790745499409.webp';

export interface CheckmatePattern {
  id: string;
  name: string; // e.g. "Cục: Bó tay chịu trói", "Cục: Nhất xa sát vạn tử"
  subtitle: string;
  description: string;
  image: string; // path to ink wash painting (tranh thủy mặc đen trắng trên nền giấy trắng)
  poem: string;
  badge: string;
}

export function detectCheckmatePattern(
  lastMove: Move | null,
  board: (Piece | null)[][],
  winner: PlayerColor,
  _moveCount: number,
  isStalemate?: boolean
): CheckmatePattern {
  const loser: PlayerColor = winner === 'red' ? 'black' : 'red';

  // 1. CỤC ĐẶC BIỆT: BÓ TAY CHỊU TRÓI (Khốn tễ / Hết nước đi)
  // Khi đối thủ không còn bất kỳ nước đi hợp lệ nào (không bị chiếu nhưng hết nước đi, hoặc bị vây khốn tê liệt toàn quân)
  if (isStalemate || (lastMove && !lastMove.isCheck)) {
    return {
      id: 'bo_tay_chiu_troi',
      name: 'Cục: Bó tay chịu trói',
      subtitle: 'Khốn tễ diệt cờ - Vạn quân thúc thủ',
      description:
        'Đối phương bị vây hãm tầng tầng lớp lớp, trên dưới nghẽn mạch không còn bất kỳ nước đi nào để đi! Tướng như cá trong chậu, chim trong lồng, đành bó tay chịu trói quy hàng!',
      image: trappedImg,
      poem: 'Bốn bề bủa lưới ngút trùng khơi,\nTiến thoái lưỡng nan lệ ngậm ngùi!',
      badge: 'Khốn Tễ Tuyệt Diệt',
    };
  }

  // 2. CỤC ĐẶC BIỆT: THÍCH KHÁCH DẠ HÀNH
  // Đòn sát thủ lật úp bất ngờ
  if (lastMove?.wasCovered) {
    return {
      id: 'thich_khach_da_hanh',
      name: 'Cục: Thích khách dạ hành',
      subtitle: 'Ám tiễn xuất động - Xuất quỷ nhập thần',
      description:
        'Quân úp bí ẩn vừa lật mở đã lập tức tung đòn sấm sét chém rơi đầu Tướng địch! Thích khách ẩn mình bấy lâu trong bóng tối nay xuất chiêu định đoạt giang sơn!',
      image: assassinImg,
      poem: 'Ảo ảnh trong mây bỗng lộ hình,\nMột chiêu đoạt mạng định thư hùng!',
      badge: 'Sát Pháp Bí Truyền',
    };
  }

  const killerRole = lastMove?.revealedRole || (lastMove ? board[lastMove.to.y][lastMove.to.x]?.trueRole : undefined);

  // Tìm vị trí Tướng đối phương
  let enemyKingPos: { x: number; y: number } | null = null;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p && p.color === loser && p.trueRole === 'king') {
        enemyKingPos = { x, y };
        break;
      }
    }
    if (enemyKingPos) break;
  }

  // Thu thập quân chiến thắng trên bàn
  const winnerPieces: { role: string; x: number; y: number }[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p && p.color === winner) {
        const effectiveRole = !p.isCovered ? p.trueRole : (p.initialRole || p.trueRole);
        winnerPieces.push({ role: effectiveRole, x, y });
      }
    }
  }

  const winnerChariots = winnerPieces.filter((p) => p.role === 'chariot');
  const winnerCannons = winnerPieces.filter((p) => p.role === 'cannon');
  const winnerHorses = winnerPieces.filter((p) => p.role === 'horse');

  // 3. CỤC ĐẶC BIỆT: MÃ HẬU PHÁO
  // Pháo núp sau lưng Mã bắn đạn diệt Tướng (trứ danh trong cờ tướng)
  if (enemyKingPos && (killerRole === 'cannon' || killerRole === 'horse')) {
    const hasHorseCannonCombo = winnerCannons.some((c) =>
      winnerHorses.some((h) => {
        // Cùng cột hoặc cùng hàng với King
        const sameCol = c.x === h.x && h.x === enemyKingPos!.x;
        const sameRow = c.y === h.y && h.y === enemyKingPos!.y;
        if (sameCol) {
          const horseBetween =
            (c.y < h.y && h.y < enemyKingPos!.y) ||
            (enemyKingPos!.y < h.y && h.y < c.y);
          return horseBetween;
        }
        if (sameRow) {
          const horseBetween =
            (c.x < h.x && h.x < enemyKingPos!.x) ||
            (enemyKingPos!.x < h.x && h.x < c.x);
          return horseBetween;
        }
        return false;
      })
    );

    if (hasHorseCannonCombo) {
      return {
        id: 'ma_hau_phao',
        name: 'Cục: Mã hậu pháo',
        subtitle: 'Mã tiền khống chế - Pháo hậu đoạt hồn',
        description:
          'Đòn phối hợp trứ danh muôn thuở giữa Mã và Pháo! Chiến mã phong tỏa mọi ngả tiến thoái, Pháo lệnh núp sau lưng bất thần khai hỏa xuyên thủng cấm cung địch thủ!',
        image: cannonImg,
        poem: 'Mã phi khống chế cửa sinh tồn,\nPháo hậu khai hỏa đoạt hoàng hôn!',
        badge: 'Mã Hậu Pháo Thần Sầu',
      };
    }
  }

  // 4. CỤC ĐẶC BIỆT: TRÙNG PHÁO (Song pháo trùng điệp)
  // Hai Pháo cùng nằm trên một cột hoặc hàng nã thẳng vào cấm cung
  if (killerRole === 'cannon' && winnerCannons.length >= 2) {
    const [c1, c2] = winnerCannons;
    const sameCol = c1.x === c2.x && (enemyKingPos ? c1.x === enemyKingPos.x : true);
    const sameRow = c1.y === c2.y && (enemyKingPos ? c1.y === enemyKingPos.y : false);
    if (sameCol || sameRow) {
      return {
        id: 'trung_phao',
        name: 'Cục: Trùng pháo',
        subtitle: 'Song pháo trùng liên - Thiên lôi giáng thế',
        description:
          'Hai cỗ thần công xếp thẳng hàng uy lực vô song, pháo trước làm ngòi cho pháo sau nã đạn xé toạc cấm cung. Hỏa lực trùng điệp không gì cản nổi!',
        image: cannonImg,
        poem: 'Trùng pháo gầm vang chấn cửu châu,\nHoàng triều sụp đổ bóng hoàng hôn!',
        badge: 'Song Pháo Trùng Điệp',
      };
    }
  }

  // 5. CỤC ĐẶC BIỆT: THIẾT MÔN THUYÊN (Then sắt khóa cung)
  // Xe hoặc Pháo chiếm giữ trung lộ (lộ 5 / x=4) bóp nghẹt hoàng cung
  if (lastMove && lastMove.to.x === 4 && (killerRole === 'chariot' || killerRole === 'cannon')) {
    return {
      id: 'thiet_mon_thuyen',
      name: 'Cục: Thiết môn thuyên',
      subtitle: 'Then sắt khóa cung - Trung lộ tuyệt mệnh',
      description:
        'Khóa then sắt ở chính giữa trung lộ bóp nghẹt khí tức Tướng đối phương, khiến toàn bộ tuyến phòng ngự hoàng cung tê liệt hoàn toàn đành nhận thua!',
      image: chariotImg,
      poem: 'Then sắt khóa chặt chốn hoàng cung,\nTrung lộ tuyệt mệnh dứt anh hùng!',
      badge: 'Thiết Môn Thuyên',
    };
  }

  // 6. CỤC ĐẶC BIỆT: SONG XA ĐOẠT MỆNH (Song xa phá trận)
  // Hai Xe cùng tham chiến xông thẳng vào trận địa
  if (killerRole === 'chariot' && winnerChariots.length >= 2) {
    return {
      id: 'song_xa_doat_menh',
      name: 'Cục: Song xa đoạt mệnh',
      subtitle: 'Nhị xa hoành hành - Phá tan long mạch',
      description:
        'Hai cỗ chiến xa kẹp hai cánh tả hữu như song long xuất hải, liên hoàn công phá không cho Tướng địch bất kỳ một khe hở nào để đào tẩu!',
      image: chariotImg,
      poem: 'Song xa tung hoành xé trời xanh,\nCung cấm ngút trời lửa chiến chinh!',
      badge: 'Bá Vương Song Xa',
    };
  }

  // 7. Nhất Xa Sát Vạn Tử (Chariot checkmate)
  if (killerRole === 'chariot') {
    return {
      id: 'nhat_xa_sat_van_tu',
      name: 'Cục: Nhất xa sát vạn tử',
      subtitle: 'Thiết xa phá trận - Vạn quân nan đào',
      description:
        'Một cỗ chiến xa dũng mãnh xông thẳng vào cấm địa, càn quét ba quân như vào chỗ không người. Một nhát gươm chém tướng đoạt cờ, định đoạt thiên hạ!',
      image: chariotImg,
      poem: 'Chiến xa gầm thét rung bờ cõi,\nNhất kiếm đoạt đầu vạn tướng kinh!',
      badge: 'Bá Vương Chiến Xa',
    };
  }

  // 8. Pháo Lồng (Cannon checkmate)
  if (killerRole === 'cannon') {
    return {
      id: 'phao_long',
      name: 'Cục: Pháo lồng',
      subtitle: 'Hỏa pháo giăng thiên võng - Tuyệt lộ hoàng cung',
      description:
        'Mượn quân đối phương làm ngòi nổ, Pháo lệnh khai hỏa khóa chặt bốn phương cấm cung. Tướng địch như cá nằm trong lồng son, bốn bề hỏa lực không lối thoát!',
      image: cannonImg,
      poem: 'Đạn nổ lưng trời tan bách trận,\nPháo lồng khóa cửa diệt ba quân!',
      badge: 'Thần Pháo Đoạt Mạng',
    };
  }

  // 9. Mã Ngọa Tào (Horse checkmate)
  if (killerRole === 'horse') {
    return {
      id: 'ma_ngoa_tao',
      name: 'Cục: Mã ngọa tào',
      subtitle: 'Hí lộng cấm cung - Mã bộ tung hoành',
      description:
        'Chiến mã tung vó nhảy vào cung cấm, ngọa tào sát cục phong tỏa mọi ngả đường tiến thoái của Tướng đối phương. Tuyệt kỹ giang hồ lưu danh thiên cổ!',
      image: chariotImg,
      poem: 'Vó ngựa tung hoành xuyên tử huyệt,\nVung đao khép lại ván cờ tàn!',
      badge: 'Tuyệt Kỹ Thần Mã',
    };
  }

  // 10. Thiết Tốt Phá Thành (Soldier checkmate)
  if (killerRole === 'soldier') {
    return {
      id: 'thiet_tot_doat_hon',
      name: 'Cục: Thiết tốt phá thành',
      subtitle: 'Dũng tốt sang sông - Nhất bộ định giang sơn',
      description:
        'Tốt qua sông như cọp thêm cánh, từng bước vững chãi áp sát long sàng cắm kiếm trúng tim Tướng địch. Kẻ tưởng như bình dị lại lập nên kỳ công cái thế!',
      image: kingImg,
      poem: 'Tốt tiến một phân dời biển lớn,\nTướng cùng đường cụt lệ tuôn rơi!',
      badge: 'Dũng Tốt Đoạt Kỳ',
    };
  }

  // 11. Đột Tử Quân Vương (Default / Sudden King)
  return {
    id: 'dot_tu_quan_vuong',
    name: 'Cục: Đột tử quân vương',
    subtitle: 'Chúa công nghênh kiếm - Vận nước tiêu tan',
    description:
      'Trời đất biến sắc, Tướng soái ngã gục trong tích tắc bất ngờ! Đòn sát cục sấm sét khiến đối phương trở tay không kịp, sơn hà xã tắc chính thức đổi chủ!',
    image: kingImg,
    poem: 'Sấm chớp ngang trời rung cấm điện,\nQuân vương đột tử dứt cơ đồ!',
    badge: 'Kỳ Nghệ Vô Song',
  };
}
