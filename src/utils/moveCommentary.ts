/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BackgroundScene3D,
  Move,
  MoveAccuracyGrade,
  MoveCommentary,
  Piece,
  PieceRole,
  PlayerColor,
} from '../types';
import { evaluateBoard } from './aiEngine';
import { isSquareDefendedBy } from './chessRules';

export interface SidewalkSpectator {
  name: string;
  avatar: string;
  title: string;
  sceneId: BackgroundScene3D;
}

// Danh sách khán giả theo từng bối cảnh
export const SCENE_SPECTATORS: Record<BackgroundScene3D, SidewalkSpectator[]> = {
  tra_da: [
    {
      name: 'Bác Ba Trà Đá',
      avatar: '🍵',
      title: 'Khán giả chém gió vỉa hè',
      sceneId: 'tra_da',
    },
    {
      name: 'Chú Tư Thuốc Lào',
      avatar: '🪵',
      title: 'Chuyên gia xúi thí quân',
      sceneId: 'tra_da',
    },
    {
      name: 'Anh Bảy Báo Thủ',
      avatar: '📣',
      title: 'Kỳ thủ phong trào hay mách nước',
      sceneId: 'tra_da',
    },
  ],
  ca_phe: [
    {
      name: 'Anh Hoàng Cà Phê',
      avatar: '☕',
      title: 'Kỳ thủ quen quán, có kiến thức sâu',
      sceneId: 'ca_phe',
    },
    {
      name: 'Bác Minh Phin Đen',
      avatar: '🗞️',
      title: 'Sành cờ và mê thế trận sắc sảo',
      sceneId: 'ca_phe',
    },
    {
      name: 'Kỳ Thủ Bàn Bên',
      avatar: '👓',
      title: 'Chuyên gia phân tích khai cuộc',
      sceneId: 'ca_phe',
    },
  ],
  dau_truong: [
    {
      name: 'Đại Sư Bình Luận',
      avatar: '🏆',
      title: 'Bình luận viên thể thao cờ tướng',
      sceneId: 'dau_truong',
    },
    {
      name: 'Kiện Tướng Quốc Gia',
      avatar: '🎖️',
      title: 'Nhà phân tích chiến thuật đỉnh cao',
      sceneId: 'dau_truong',
    },
    {
      name: 'Giáo Sư Cờ Tướng',
      avatar: '🏛️',
      title: 'Viện trưởng viện nghiên cứu kỳ nghệ',
      sceneId: 'dau_truong',
    },
  ],
  hoa_vien: [
    {
      name: 'Trà Sư Mặc Khách',
      avatar: '🎋',
      title: 'Đàm đạo kỳ phong bên khóm trúc',
      sceneId: 'hoa_vien',
    },
    {
      name: 'Cụ Lương Trà Đạo',
      avatar: '🍵',
      title: 'Ẩn sĩ ngắm hoa ngẫm thế sự',
      sceneId: 'hoa_vien',
    },
    {
      name: 'Kỳ Nhân Thanh Phong',
      avatar: '🪕',
      title: 'Kỳ thủ thi sĩ, vịnh thơ đối cờ',
      sceneId: 'hoa_vien',
    },
  ],
  go_tram: [
    {
      name: 'Thiền Sư Kỳ Đạo',
      avatar: '🪵',
      title: 'Tĩnh tâm quán sát từng nước biến',
      sceneId: 'go_tram',
    },
    {
      name: 'Cư Sĩ Tĩnh Tâm',
      avatar: '🕯️',
      title: 'Thiền định bàn cờ gỗ trầm',
      sceneId: 'go_tram',
    },
  ],
};

export const SIDEWALK_SPECTATORS: SidewalkSpectator[] = SCENE_SPECTATORS.tra_da;

// Kho nhận xét dí dỏm, sinh động, đậm chất đời thường (1 - 2 câu, hiển thị 15s thoải mái đọc)
const SCENE_HUMOROUS_QUOTES: Record<
  BackgroundScene3D,
  Record<MoveAccuracyGrade, string[]>
> = {
  // 1. Quán Trà Đá Vỉa Hè: Dân dã, tếu táo, vui vẻ
  tra_da: {
    accurate: [
      'Nước cờ nét như Sony! Tí nữa nhớ khao tôi chén trà đá phong thủy nhé!',
      'Nước đi chuẩn đét! Gừng càng già càng cay, ép đối thủ toát mồ hôi hột rồi!',
      'Bắt bài chuẩn chỉ! Nước này cao thủ núi Ngũ Hành Sơn cũng phải gật gù khen hay!',
      'Đánh quá bén! Tôi mà đi được nước này là về kể cho cả xóm nghe từ sáng tới đêm!',
      'Chuẩn từng milimet! Tôi đứng ngoài nhìn mà tim đập thình thịch vì sướng!',
      'Nước cờ rất có phong phạm! Nhìn bác đánh cờ mà tôi lại nhớ thời thanh niên suýt vô địch xã!',
    ],
    reckless: [
      'Pha này hơi liều! Được ăn cả ngã về không, nhưng tôi thích người có gan làm giàu!',
      'Hơi mạo hiểm rồi! Cảm giác như đang vít ga 90km/h không đội mũ bảo hiểm vậy!',
      'Nước đi phiêu lưu! Phen này hoặc là thành anh hùng thiên hạ, hoặc tối về rửa bát cho vợ!',
      'Nước cờ bốc lửa! Đi quả này tim người xem phải lắp van một chiều mới dám nhìn tiếp!',
      'Pha thí quân giật gân! Tôi đứng ngoài còn giật thót tim, tính một mất một còn với nó à bác?',
    ],
    brilliant: [
      'Nước cờ thần sầu! Đỉnh nóc kịch trần, quán trà đá hôm nay vinh dự đón đại cao thủ tái xuất!',
      'Tuyệt chiêu giang hồ! Nước cờ mang tầm vũ trụ thế này thì máy tính siêu cấp cũng phải xin hàng!',
      'Bái phục, bái phục! Đánh xong nhớ chụp ảnh lại đóng khung mang về treo giữa phòng khách nhé!',
      'Ảo diệu vô cùng! Một pha xuất chiêu làm cả quán trà đá phải đồng loạt ồ lên vỗ tay!',
    ],
    inaccurate: [
      'Hơi sơ hở rồi! Chắc bác đang mải nghĩ xem trưa nay ăn bún chả hay cơm tấm đúng không?',
      'Nước cờ hơi vội! Theo kinh nghiệm 40 năm hóng cờ thì nước này gọi là "đi cho vui cửa vui nhà"!',
      'Lộ sườn rồi bạn ơi! Chậm lại một nhịp, đối thủ nó đang rình như mèo rình chuột kìa!',
      'Hơi lơ đễnh rồi! Gió mát quá làm chú buồn ngủ hả, cẩn thận kẻo rụng mất con hàng ngon!',
    ],
    blunder: [
      'Đi vào lòng đất rồi! Cứ tưởng giăng bẫy bắt giặc, hóa ra tự nhảy vào nồi lẩu rồi bạn ơi!',
      'Thôi xong con ong! Nước này gọi là dâng mỡ miệng mèo, đau hơn cả người yêu cũ đi lấy chồng!',
      'Hớ nặng rồi bác tài! Tôi đứng ngoài xem mà phải xin phép uống ngụm trà đá hạ hỏa hộ!',
      'Pha tự hủy cực mạnh! Vừa đánh cờ vừa liếc sang bàn bên cạnh đúng không, tôi biết tỏng rồi nhé!',
    ],
    tactical_flip: [
      'Lật nắp hồi hộp như mở bát xóc đĩa đầu năm, xem vía hôm nay đỏ như son hay đen như than nào!',
      'Mở trúng hàng ngon thì gáy to, mở trúng tốt cùi bắp coi như tích đức làm việc thiện!',
      'Bốc thăm trúng thưởng! Hồi hộp nín thở xem lật ra con Xe đại bác hay con Tốt sang sông nào!',
    ],
    check: [
      'Chiếu tướng giật mình rơi điếu thuốc lào! Ép đối thủ chạy té khói, hay lắm bác ơi!',
      'Chiếu tướng rát mặt! Đòn sấm sét giữa trời quang, chưa bí nhưng dọa cho đối thủ lạnh gáy chơi!',
      'Chiếu tướng chạy đằng trời! Đòn công kích bất ngờ khiến đối thủ toát mồ hôi hột!',
    ],
  },

  // 2. Quán Cà Phê Cờ Tướng: Khán giả sành cờ, sắc sảo
  ca_phe: {
    accurate: [
      'Nước cờ rất đĩnh đạc! Kiểm soát trung lộ chặt chẽ, ly cà phê phin đắng cũng hóa ngọt ngào!',
      'Nước đi có chiều sâu! Chặn đúng đầu Mã đối thủ, phong cách đánh rất sành sỏi bài bản!',
      'Thông lộ Xe bén ngót! Cứ phong độ này thì tí nữa tôi sẵn sàng bao bạn một ly cà phê trứng!',
      'Kiểm soát thế trận đỉnh cao! Bên kia bắt đầu bế tắc đường phản công rồi bạn ơi!',
    ],
    reckless: [
      'Thí quân hơi mạo hiểm! Ép trục sườn gắt quá, coi chừng phản đòn đắng hơn cà phê đen!',
      'Pha này hơi phiêu! Đi quả làm cả bàn cà phê đang nhâm nhi cũng phải ngẩng lên nín thở!',
      'Nước đi bốc lửa! Cà phê đậm vị thì cờ cũng phải cháy bỏng, nhưng cẩn thận hở sườn nhé!',
    ],
    brilliant: [
      'Tuyệt chiêu đỉnh cao! Pha điều quân đậm chất nghệ thuật, vị cà phê dường như thơm lừng hơn!',
      'Nước cờ triệu đô! Sắc như dao cạo, đối thủ phen này chỉ có nước gọi thêm ly nước lọc hạ hỏa!',
      'Bẻ lái chiến thuật ngoạn mục! Nước cờ đáng được cả quán cà phê đồng loạt đứng dậy vỗ tay tán thưởng!',
    ],
    inaccurate: [
      'Lộ sườn cánh phải rồi! Nhấp ngụm cà phê cho tỉnh táo lại xem nào bạn ơi, hơi vội vàng rồi!',
      'Chưa kịp ổn định đã xuất kích! Đi nước này dễ bị đối thủ phản tiên chiếm quyền chủ động lắm!',
      'Nước đi hơi thiếu tính toán! Theo tôi thì nên gác Sĩ trước, đi nước này bị động rồi!',
    ],
    blunder: [
      'Dâng quân miệng cọp rồi! Pha tự hủy đắng chát hơn cả bã cà phê cháy, tiếc hùi hụi!',
      'Mất toi thế trận! Đang từ cửa thắng bỗng chốc rơi thẳng xuống vực sâu, đau đớn quá bạn ơi!',
      'Pha đi cờ sơ sẩy! Tôi ngồi uống cà phê nhìn mà tiếc đứt ruột công sức gây dựng!',
    ],
    tactical_flip: [
      'Lật nắp hồi hộp như chờ từng giọt cà phê phin rơi, mở ra Xe Pháo thì thơm phức!',
      'Vận may gõ cửa! Để xem hạt cà phê may mắn hôm nay ban cho bạn chiến binh dũng mãnh nào!',
    ],
    check: [
      'Chiếu tướng đập bàn rầm một cái, khiến cả quán cà phê phải đồng loạt quay lại ngước nhìn!',
      'Đòn công kích hiểm hóc! Ép tướng đối phương phải thượng lầu hóng gió rồi!',
    ],
  },

  // 3. Đấu Trường Kỳ Vương: Chuẩn học thuật, lý luận cờ
  dau_truong: {
    accurate: [
      'Nước đi đạt chuẩn giáo trình kỳ viện! Vừa tranh tiên vừa khống chế trục lộ trọng yếu xuất sắc!',
      'Thế trận vững như bàn thạch! Tính toán chu toàn từng nước biến theo đúng nguyên lý cờ đỉnh cao!',
      'Độ chuẩn xác 99.8% theo sách giáo khoa! Ban giám sát kỳ viện cũng phải gật đầu tâm đắc!',
    ],
    reckless: [
      'Chiến thuật phế quân tranh thế đầy rủi ro, vượt ra ngoài mọi dự báo của máy tính phân tích!',
      'Một biến thể cực kỳ phiêu lưu! Quyết định mang tính canh bạc thực sự trên sàn đấu danh giá!',
      'Đi ngược lại nguyên tắc an toàn cung cấm! Hội đồng chuyên môn đang rất căng thẳng theo dõi!',
    ],
    brilliant: [
      'Nước cờ mang tầm cỡ đại kiện tướng quốc tế! Xứng đáng đưa vào tuyển tập danh cục kỳ viện năm nay!',
      'Thiên tài kỳ nghệ! Đỉnh cao của nghệ thuật điều binh khiển tướng, đối thủ hoàn toàn bất khả kháng cự!',
      'Tuyệt phẩm bàn cờ! Một nước đi thể hiện nhãn quan chiến thuật phi phàm, đại hội xin ngả mũ!',
    ],
    inaccurate: [
      'Sai số chiến thuật khoảng 150 centipawns! Lộ diện điểm yếu ở trục lộ sườn trái rồi!',
      'Thiếu chiều sâu dự đoán nước biến tiếp theo! Kỳ thủ đang dần đánh mất quyền kiểm soát trận đấu!',
    ],
    blunder: [
      'Sai lầm nghiêm trọng dẫn đến vỡ trận! Sai một ly đi một dặm, ban giám sát cũng phải ôm đầu!',
      'Đại bại chiêu! Một nước cờ phá hỏng toàn bộ công sức bài binh bố trận từ đầu trận đấu!',
    ],
    tactical_flip: [
      'Xác suất thống kê ngẫu nhiên đang thử thách bản lĩnh học thuật của kỳ thủ đỉnh cao!',
      'Yếu tố cờ úp chi phối cục diện! Xem ai là người làm chủ xác suất trên đấu trường danh giá!',
    ],
    check: [
      'Đòn hỏa lực trung lộ mang tính áp chế tinh thần cực mạnh! Ép đối phương tiêu hao nước đi quý giá!',
      'Chiếu tướng cưỡng bức! Buộc Tướng đối phương phải dời vị trí bảo vệ cung cấm!',
    ],
  },

  // 4. Hoa Viên Kỳ Trà: Thanh tịnh, tao nhã
  hoa_vien: {
    accurate: [
      'Nước cờ thanh thoát như mây trôi nước chảy, vừa thưởng ngụm trà ngon vừa đi nước cờ đẹp!',
      'Tĩnh tại mà vô cùng thâm sâu! Đĩnh đạc tựa tùng bách đón gió xuân, không gợn chút bụi trần!',
      'Thanh thoát như gió lướt ngọn trúc! Vừa giữ vững cội nguồn vừa mở ra vạn dặm giang sơn!',
    ],
    reckless: [
      'Thân ở hoa viên thanh tịnh mà nước cờ lại cuồn cuộn sát khí phong trần, táo bạo lắm thay!',
      'Một bước lỡ chân có thể khiến hoa rơi tuyết phủ, nước cờ này có phần mạo hiểm quá rồi!',
    ],
    brilliant: [
      'Tuyệt kỹ kỳ phong! Tinh hoa hội tụ trong một nước cờ, xứng đáng ngâm một bài thơ mừng giai tác!',
      'Thần cơ diệu toán! Tiếng gõ quân cờ vang giữa hoa viên như tiếng đàn tri âm tri kỷ tuyệt luân!',
    ],
    inaccurate: [
      'Tâm đã động rồi! Hương trà chưa kịp ngấm mà người đã vội xuất quân, lộ ra chút sơ sót rồi!',
    ],
    blunder: [
      'Hoa rụng bên thềm! Một phút lơ đễnh để đối phương nắm mất chuôi đao, uổng phí công phu bài bố!',
    ],
    tactical_flip: [
      'Duyên kỳ ngộ đến từ hư không, tùy duyên mà hóa tựa như cánh hoa nở đúng tiết trời xuân!',
    ],
    check: [
      'Tiếng gõ quân cờ vang động hoa viên! Nhẹ nhàng điểm một chỉ nhưng uy lực chấn động cả bàn cờ!',
    ],
  },

  // 5. Gỗ Trầm Tối Giản: Thiền định, súc tích
  go_tram: {
    accurate: [
      'Một bước định hình cục diện! Trầm mặc như gỗ cổ, vững chãi không thể lay chuyển.',
      'Ít lời nhưng thấu suốt cội nguồn! Đúng tinh thần tối giản kỳ đạo thâm sâu.',
    ],
    reckless: [
      'Gió lặng mây ngừng nhưng trong lòng dậy sóng phong ba, nước cờ này ẩn chứa nhiều hiểm hóc.',
    ],
    brilliant: [
      'Vô chiêu thắng hữu chiêu! Cực giản mà cực diệu, một nước cờ đạt đến cảnh giới thuần khiết.',
    ],
    inaccurate: [
      'Một thoáng tạp niệm đã để lộ sơ hở trước đối phương, tâm chưa tịnh mà tay đã vội.',
    ],
    blunder: [
      'Vạn sự tùy duyên, nhưng buông bỏ nhầm vị trí thế này thì duyên hết thật rồi.',
    ],
    tactical_flip: [
      'Được mất bại thành tùy duyên, mở ra mới biết hư thực cõi bàn cờ.',
    ],
    check: [
      'Tĩnh lặng bấy lâu, nay xuất một đòn sấm sét xé toang hư không!',
    ],
  },
};

// Nhãn phân loại độ chính xác
const GRADE_METADATA: Record<
  MoveAccuracyGrade,
  { label: string; tagColor: string; badgeIcon: string }
> = {
  accurate: {
    label: 'Chính xác',
    tagColor: 'text-emerald-400 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
    badgeIcon: '🎯',
  },
  reckless: {
    label: 'Hơi liều',
    tagColor: 'text-amber-400 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
    badgeIcon: '⚡',
  },
  brilliant: {
    label: 'Xuất sắc',
    tagColor: 'text-purple-300 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
    badgeIcon: '💎',
  },
  inaccurate: {
    label: 'Sơ hở',
    tagColor: 'text-yellow-400 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
    badgeIcon: '⚠️',
  },
  blunder: {
    label: 'Hớ nặng',
    tagColor: 'text-rose-400 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
    badgeIcon: '🤦',
  },
  tactical_flip: {
    label: 'Lật úp',
    tagColor: 'text-cyan-400 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
    badgeIcon: '🎲',
  },
  check: {
    label: 'Chiếu tướng',
    tagColor: 'text-red-400 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
    badgeIcon: '👑',
  },
};

/**
 * Đánh giá độ chính xác nước đi và trả về câu nhận xét dí dỏm, thú vị
 */
export function evaluateMoveQuality(
  prevBoard: (Piece | null)[][],
  nextBoard: (Piece | null)[][],
  move: Move,
  playerColor: PlayerColor,
  bgScene: BackgroundScene3D = 'tra_da',
  spectatorOverride?: SidewalkSpectator
): MoveCommentary {
  const sceneSpectators = SCENE_SPECTATORS[bgScene] || SCENE_SPECTATORS.tra_da;
  const spectator =
    spectatorOverride ||
    sceneSpectators[Math.floor(Math.random() * sceneSpectators.length)];

  const scoreBefore = evaluateBoard(prevBoard, playerColor);
  const scoreAfter = evaluateBoard(nextBoard, playerColor);
  const delta = scoreAfter - scoreBefore;

  let grade: MoveAccuracyGrade = 'accurate';

  const oppColor: PlayerColor = playerColor === 'red' ? 'black' : 'red';
  const targetSquareAttacked = isSquareDefendedBy(nextBoard, move.to, oppColor);
  const isHighValue = ['chariot', 'cannon', 'horse'].includes(move.piece.trueRole);

  if (move.isCheck) {
    if (delta >= 100) {
      grade = 'brilliant';
    } else {
      grade = 'check';
    }
  } else if (move.wasCovered) {
    if (['chariot', 'cannon', 'horse'].includes(move.piece.trueRole)) {
      grade = 'brilliant';
    } else {
      grade = 'tactical_flip';
    }
  } else if (move.captured) {
    if (delta >= 150) {
      grade = 'brilliant';
    } else if (delta < -80) {
      grade = 'blunder';
    } else {
      grade = 'accurate';
    }
  } else if (targetSquareAttacked && isHighValue && delta < -100) {
    grade = 'blunder';
  } else if (delta <= -200) {
    grade = 'blunder';
  } else if (delta <= -80) {
    grade = 'inaccurate';
  } else if (targetSquareAttacked && isHighValue && delta >= -40) {
    grade = 'reckless';
  } else if (delta >= 120) {
    grade = 'brilliant';
  } else {
    grade = 'accurate';
  }

  const quotesForScene = SCENE_HUMOROUS_QUOTES[bgScene] || SCENE_HUMOROUS_QUOTES.tra_da;
  const quotesList = quotesForScene[grade] || SCENE_HUMOROUS_QUOTES.tra_da[grade];
  let comment = quotesList[Math.floor(Math.random() * quotesList.length)];

  // Nếu là nước lật mở quân úp, PHẢI nhận xét chuẩn xác 100% theo đúng quân cờ vừa lật
  if (move.wasCovered) {
    const role = move.piece.trueRole;
    if (role === 'chariot') {
      const chariotQuotes = [
        'Ối giồi ôi! Mở đúng con XE chiến! Đỏ như son thế này thì ai đỡ nổi!',
        'Mở trúng Xe rồi! Cờ úp mà có Xe sớm thì coi như nắm 7 phần thắng!',
        'Xe xuất trận! Đỏ rực một góc trời, đối thủ phen này run tay rồi!',
      ];
      comment = chariotQuotes[Math.floor(Math.random() * chariotQuotes.length)];
    } else if (role === 'cannon') {
      const cannonQuotes = [
        'Mở trúng PHÁO thần công! Khói lửa ngút trời, bên kia bắt đầu toát mồ hôi hột!',
        'Pháo xuất kích! Tiếng nổ rền vang quán cờ, trận này bắt đầu khét lẹt rồi!',
        'Lật được Pháo chiến! Pháo giăng khắp lối, đối thủ lo thủ cung cấm ngay!',
      ];
      comment = cannonQuotes[Math.floor(Math.random() * cannonQuotes.length)];
    } else if (role === 'horse') {
      const horseQuotes = [
        'Mở được MÃ dũng mãnh! Bát tuấn tung vó, chuẩn bị nhảy vào góc hiểm!',
        'Lật ra con Mã chiến! Mã đạp giang hồ, nước cờ biến hóa khôn lường!',
      ];
      comment = horseQuotes[Math.floor(Math.random() * horseQuotes.length)];
    } else if (role === 'soldier') {
      const soldierQuotes = [
        'Haha, lật trúng con Tốt! Khởi đầu gian nan, cờ tàn mới biết ai khôn ai dại!',
        'Mở được chú Tốt cùi bắp! Không sao, Tốt qua sông cũng thành Xe chiến thôi!',
        'Lật trúng con Chốt! Duyên phận trớ trêu nhưng đừng nản lòng chú em ơi!',
      ];
      comment = soldierQuotes[Math.floor(Math.random() * soldierQuotes.length)];
    } else if (role === 'elephant') {
      const elephantQuotes = [
        'Lật được Tượng phòng thủ! Trấn giữ biên thùy, cung thành vững như bàn thạch!',
        'Tượng xuất trận bảo vệ cung! Nước cờ củng cố phòng tuyến rất đĩnh đạc!',
      ];
      comment = elephantQuotes[Math.floor(Math.random() * elephantQuotes.length)];
    } else if (role === 'advisor') {
      const advisorQuotes = [
        'Lật trúng Sĩ áo giáp! Tướng có cận vệ hộ giá sát sườn, an tâm chiến đấu!',
        'Sĩ về hộ giá! Gia cố phòng thủ chặt chẽ trước khi phản công!',
      ];
      comment = advisorQuotes[Math.floor(Math.random() * advisorQuotes.length)];
    }
  }

  const meta = GRADE_METADATA[grade];

  return {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    moveNotation: move.notation,
    grade,
    gradeLabel: meta.label,
    tagColor: meta.tagColor,
    badgeIcon: meta.badgeIcon,
    comment,
    spectatorName: spectator.name,
    spectatorAvatar: spectator.avatar,
    spectatorTitle: spectator.title,
    isAiGenerated: false,
  };
}

/**
 * Gửi yêu cầu đến Gemini AI server:
 * Trả về câu nhận xét dí dỏm, sinh động 1-2 câu
 */
export async function fetchAiMoveCommentary(
  moveNotation: string,
  grade: MoveAccuracyGrade,
  gradeLabel: string,
  pieceRole: PieceRole,
  playerColor: PlayerColor,
  spectator: SidewalkSpectator,
  bgScene: BackgroundScene3D = 'tra_da',
  isCheck?: boolean,
  wasCovered?: boolean,
  revealedRole?: PieceRole,
  capturedRole?: PieceRole
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('/api/move-commentary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        moveNotation,
        grade,
        gradeLabel,
        pieceRole,
        playerColor,
        spectatorName: spectator.name,
        spectatorAvatar: spectator.avatar,
        spectatorTitle: spectator.title,
        bgScene,
        isCheck,
        wasCovered,
        revealedRole,
        capturedRole,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.comment === 'string' && data.comment.trim().length > 0) {
      return data.comment.trim();
    }
    return null;
  } catch {
    return null;
  }
}
