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
import {
  evaluateBoard,
  isCoveredCannonTradingCoveredHorse,
  isPrematureAttackMobilization,
  isBlunderLeavingCoveredHorseToCannon,
} from './aiEngine';
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

  // 3. Đấu Trường Kỳ Vương: Chuẩn học thuật nhưng tấu hài thể thao cực dí dỏm
  dau_truong: {
    accurate: [
      'Nước đi đạt chuẩn giáo trình! Đẹp không tì vết, đối thủ xem xong xin phép ngất tạm 5 phút để hoàn hồn!',
      'Chuẩn 99.8% sách giáo khoa! Ban giám sát kỳ viện suýt làm rơi mic vì nước cờ quá bén!',
      'Nước đi như vẽ trong tranh! Đỉnh thế này thì đối phương chỉ có nước xin hoãn ván đấu về luyện thêm!',
      'Thế trận vững như bàn thạch! Các kiện tướng hàng đầu cũng phải gật gù xin chụp ảnh kỷ niệm!',
    ],
    reckless: [
      'Một pha biểu diễn xiếc trên dây! Hội đồng chuyên môn đang phải uống trà an thần để theo dõi!',
      'Nước đi quá liều! Máy tính siêu cấp chạy hết công suất suýt bốc khói vì không hiểu bác tính chiêu gì!',
      'Pha canh bạc thế kỷ! Hoặc là đi vào sử sách kỳ viện, hoặc là được ghi danh vào bảng vàng... tấu hài!',
    ],
    brilliant: [
      'Đại kiện tướng tái xuất! Nước cờ mang tầm vũ trụ khiến cả hội đồng trọng tài đồng loạt đứng dậy vỗ tay!',
      'Tuyệt phẩm bàn cờ! Đỉnh nóc kịch trần, nước này xứng đáng được khắc bia đá tại kỳ viện quốc gia!',
      'Chiêu thức ảo diệu! Đối thủ đang hoang mang tột độ, mắt tròn xoe nhìn bàn cờ không hiểu chuyện gì xảy ra!',
    ],
    inaccurate: [
      'Sai số 200 centipawns! Nước này sách giáo khoa có hẳn một chương cảnh báo: Tuyệt đối không bắt chước!',
      'Lộ sườn rồi! Một phút mơ màng ngắm người đẹp khán đài đã khiến thế trận nghiêng ngả!',
      'Tính toán nước biến hơi vội! Giáo trình kỳ viện gọi đây là pha đi cờ "thử thách lòng kiên nhẫn"!',
    ],
    blunder: [
      'Đại bại chiêu đi vào lòng đất! Ban giám sát kỳ viện đồng loạt ôm trán, pha tự hủy không thể đỡ nổi!',
      'Cú vấp thế kỷ! Đang từ cửa thắng rực rỡ bỗng chốc trượt chân rơi thẳng xuống vực thẳm!',
      'Pha dâng quân chấn động khán đài! Trọng tài suýt thổi còi vì tưởng bác đang thi đấu nhầm môn!',
    ],
    tactical_flip: [
      'Học thuyết xác suất cờ úp: Hồi hộp nín thở chờ mở bát, xem ra rồng vàng hay ra... giun đất!',
      'Xác suất ngẫu nhiên thử thách bản lĩnh! Để xem vũ trụ hôm nay độ cho ai gáy to hơn!',
    ],
    check: [
      'Chiếu tướng sấm sét! Tiếng gõ quân cờ làm rung chuyển cả đấu trường, đối phương giật bắn cả người!',
      'Chiếu tướng cưỡng bức! Buộc Tướng đối phương phải thượng lầu đón gió rét căm căm!',
    ],
  },

  // 4. Hoa Viên Kỳ Trà: Thanh tịnh tao nhã nhưng thi vị tưng tửng, châm chọc dí dỏm
  hoa_vien: {
    accurate: [
      'Thanh thoát như gió lướt rặng trúc! Đối phương nhìn thấy nước cờ chỉ muốn buông tay đi hái hoa bắt bướm!',
      'Vừa thưởng trà sen vừa đi nước cờ bén ngót! Đối thủ ngồi đối diện toát mồ hôi ướt cả áo!',
      'Đĩnh đạc tựa tùng bách! Nước cờ đẹp tới mức chim trên cành cũng ngừng hót để ngắm nhìn!',
    ],
    reckless: [
      'Khẩu khí phong trần! Thân ở hoa viên thanh tịnh mà ra chiêu cay xè như ớt chỉ thiên, liều lĩnh lắm thay!',
      'Nước cờ bốc lửa giữa vườn hoa! Coi chừng gió xuân thổi bay mất cả cơ nghiệp đấy nhé!',
    ],
    brilliant: [
      'Tuyệt kỹ thần sầu! Nước cờ xuất thần làm trà sư sặc nước chè sen vì quá đỗi kinh ngạc!',
      'Tuyệt đỉnh phong hoa! Một nước cờ làm hoa ghen liễu hờn, đối phương chỉ biết ngửa mặt than trời!',
    ],
    inaccurate: [
      'Tâm chưa tịnh rồi! Mải nhìn bướm lượn hoa bay hay sao mà đi nước cờ hở sườn to tướng thế kia?',
      'Trà chưa kịp ngấm mà tay đã vội! Nước đi này khiến hoa lá trong vườn cũng phải rầu rĩ lắc đầu!',
    ],
    blunder: [
      'Hoa rơi hữu ý, nước cờ vô tình! Một phút lơ đãng tự dâng quân vào miệng cọp, đắng cay hơn bã trà thiu!',
      'Vừa đánh cờ vừa mải làm thơ đúng không? Dâng quân thế này thì hoa trong vườn cũng rụng tơi bời!',
    ],
    tactical_flip: [
      'Duyên kỳ ngộ đến từ hư không, để xem hoa nở ra Xe Pháo đại bàng hay ra chú Tốt ngơ ngác!',
      'Tùy duyên hoa nở! Mở ra chiến mã thì cười toe toét, mở ra con sâu thì ngậm ngùi ngắm hoa!',
    ],
    check: [
      'Gõ cờ một cái vang động hoa viên! Nhẹ nhàng điểm huyệt làm đối thủ giật bắn mình đánh rơi chén trà!',
      'Sát khí cuồn cuộn giữa vườn hoa! Đòn chiếu tướng rát mặt ép Tướng địch chạy tán loạn!',
    ],
  },

  // 5. Gỗ Trầm Tối Giản: Thiền định thâm sâu nhưng hài hước, tếu táo thâm thúy
  go_tram: {
    accurate: [
      'Tâm tịnh như nước! Nước cờ trầm mặc mà hiểm hóc, cây gỗ trầm trăm tuổi cũng phải gật gù khen khét!',
      'Tối giản kỳ đạo! Không thừa một động tác, ép đối phương vào thế ngồi thiền suy ngẫm sự đời!',
      'Tĩnh lặng mà uy lực khôn lường! Đánh cờ thế này thì đối thủ thiền định cỡ nào cũng phải sốt ruột!',
    ],
    reckless: [
      'Tâm động gió giục! Tưởng thiền định an yên ai dè ra đòn bốc lửa thế này, hơi phiêu lưu rồi thí chủ!',
      'Đi một bước mạo hiểm! Coi chừng gió cuốn mây tan, trút giận lên khúc gỗ trầm vô tội nhé!',
    ],
    brilliant: [
      'Cực giản mà cực hiểm! Một đòn điểm huyệt êm như lông hồng nhưng làm đối thủ đơ người bất động!',
      'Ngộ đạo cờ tướng! Nước cờ đạt đến cảnh giới xuất quỷ nhập thần, đối phương xin phép quỳ lạy bái phục!',
    ],
    inaccurate: [
      'Một thoáng tạp niệm! Tâm chưa buông bỏ được trần duyên nên tay đi cờ hơi vội vàng rồi!',
      'Khói trầm chưa tan mà sườn đã lộ! Tĩnh tâm lại một nhịp xem nào thí chủ ơi!',
    ],
    blunder: [
      'Vạn sự tùy duyên, nhưng dâng quân thế này thì Phật tổ từ bi cũng phải lắc đầu phì cười!',
      'Pha buông bỏ đi vào lòng đất! Buông luôn cả thế trận thế này thì duyên hết thật rồi thí chủ ơi!',
    ],
    tactical_flip: [
      'Mở nắp vô thường, được mất tùy duyên! Xem hạt cát bàn cờ hóa thành ngọc quý hay sỏi đá!',
    ],
    check: [
      'Một tiếng chuông chùa xé toang hư không! Chiếu tướng bất ngờ khiến đối thủ toát mồ hôi hột!',
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

  // CẤM KỴ TUYỆT ĐỐI TRONG CỜ ÚP: Mang pháo giả đi đổi mã giả
  if (isCoveredCannonTradingCoveredHorse(move)) {
    grade = 'blunder';
    comment = 'Ối giồi ôi! Cờ úp ai lại mang Pháo giả cơ động đi đổi lấy con Mã giả què cụt bao giờ! Pha đổi vàng lấy rác đi vào lòng đất rồi bạn ơi!';
  } else if (isBlunderLeavingCoveredHorseToCannon(prevBoard, move, playerColor).isBlunder) {
    grade = 'blunder';
    const blunderHorseQuotes = [
      'Sao lại có nước ăn xe úp lên thế này? Thế mã úp không quân nào giữ thì bỏ để pháo giả bên đối phương ăn xuống à? Nước cờ tự hủy kinh điển!',
      'Ối giồi ôi! Ăn xe úp lên làm toác cả góc sườn! Bỏ rơi Mã úp không ai giữ để Pháo giả đối phương ăn xuống, tự dâng mỡ miệng mèo rồi!',
      'Nước cờ cúng cụ rồi bạn ơi! Ăn xe úp lên bỏ mặc con Mã úp cho Pháo đối thủ bắn hạ, toang cả một cánh giang sơn!',
    ];
    comment = blunderHorseQuotes[Math.floor(Math.random() * blunderHorseQuotes.length)];
  } else if (isPrematureAttackMobilization(prevBoard, move, playerColor)) {
    grade = 'inaccurate';
    comment = 'Ối giồi ôi! Chưa đủ cây chiến để chiếu cục mà đã vội vàng xua quân sang đánh à? Một cây làm chẳng nên non, đi lẻ loi thế này khác nào tự nạp mạng vào mồm địch! Về mở nắp gom quân trước đi bạn ơi!';
  }

  // Nếu là nước lật mở quân úp (và không phải blunder chí mạng như đổi pháo lấy mã hay ăn xe úp bỏ rơi mã)
  if (move.wasCovered && grade !== 'blunder') {
    const role = move.piece.trueRole;
    if (role === 'chariot') {
      const chariotQuotes = [
        'Trong cờ gì đẹp bằng xe! Uy phong lẫm liệt, một cỗ xe chiến quét sạch giang sơn!',
        'Trong cờ gì đẹp bằng xe! Xe xuất trận đỏ rực một góc trời, đối thủ phen này run tay rồi!',
        'Ối giồi ôi! Mở đúng con XE chiến! Đỏ như son thế này thì ai đỡ nổi!',
        'Mở trúng Xe rồi! Cờ úp mà có Xe sớm thì coi như nắm 7 phần thắng!',
      ];
      comment = chariotQuotes[Math.floor(Math.random() * chariotQuotes.length)];
    } else if (role === 'cannon') {
      const cannonQuotes = [
        'Láo nháo là pháo ăn xe luôn! Thần công xuất trận, bên kia bắt đầu toát mồ hôi hột rồi!',
        'Láo nháo là pháo ăn xe luôn bạn ơi! Khói lửa ngút trời, tiếng nổ rền vang quán cờ!',
        'Mở trúng PHÁO thần công! Pháo giăng khắp lối, đối thủ lo thủ cung cấm ngay!',
        'Pháo xuất kích! Nổ rung chuyển bàn cờ, trận này bắt đầu khét lẹt rồi!',
      ];
      comment = cannonQuotes[Math.floor(Math.random() * cannonQuotes.length)];
    } else if (role === 'horse') {
      const horseQuotes = [
        'Quất mã truy phong luôn bạn ơi! Bát tuấn tung vó, chuẩn bị đạp đổ thành trì đối thủ!',
        'Quất mã truy phong luôn! Mã đạp giang hồ phi nước đại, đối thủ cản chân sao nổi!',
        'Mở được MÃ dũng mãnh! Nước cờ quá thoáng, biến hóa khôn lường!',
        'Lật ra con Mã chiến! Tung hoành ngang dọc, góc hiểm nào cũng nhảy tới!',
      ];
      comment = horseQuotes[Math.floor(Math.random() * horseQuotes.length)];
    } else if (role === 'soldier') {
      const soldierQuotes = [
        'Một tốt sang sông, chổng mông mà đỡ! Haha, phen này đối thủ tha hồ mà toát mồ hôi hột!',
        'Một tốt sang sông, chổng mông mà đỡ bạn ơi! Đừng khinh chú Tốt cùi bắp, sang sông là hóa rồng đấy!',
        'Haha, lật trúng con Tốt! Khởi đầu gian nan, cờ tàn mới biết ai khôn ai dại!',
        'Mở được chú Tốt! Không sao, một Tốt qua sông cũng thành Xe chiến thôi!',
      ];
      comment = soldierQuotes[Math.floor(Math.random() * soldierQuotes.length)];
    } else if (role === 'elephant') {
      const elephantQuotes = [
        'Một con tượng nhỏ chẳng làm nên mùa xuân! Bay nhảy ngắm hoa bắt bướm thôi chứ công thủ gì tầm này!',
        'Một con tượng nhỏ chẳng làm nên mùa xuân bạn ơi! Trấn giữ biên thùy cho vui cửa vui nhà vậy!',
        'Lật được Tượng phòng thủ! Củng cố bờ cõi, còn việc xông pha trận mạc thì nhường anh em khác!',
      ];
      comment = elephantQuotes[Math.floor(Math.random() * elephantQuotes.length)];
    } else if (role === 'advisor') {
      const isFromPawn = move.piece.initialRole === 'soldier' || move.from.y === 6 || move.from.y === 3;
      
      const pawnToAdvisorQuotes = [
        'Cờ có sĩ như đĩ vén váy rồi! Chân ngắn lạch bạch đi chéo một bước, tấu hài cho cả xóm xem!',
        'Cờ có sĩ như đĩ vén váy rồi bạn ơi! Vừa xấu vừa tù túng, đối thủ nhìn thấy cười đau cả ruột!',
        'Mở Tốt mà lộn ra con Sĩ chân ngắn, đúng là đen thôi rồi! Chẳng qua sông được mà cũng chẳng về cung được, đứng làm kiểng luôn bác tài ơi!',
        'Cứ ngỡ mở Tốt ra Xe Pháo đại bác, ai ngờ đẻ ra con Sĩ rùa bò! Đúng là cú lừa ngoạn mục của bàn cờ úp!',
        'Lên Tốt hóa ra Sĩ! Đi chéo lạch bạch một bước như chú vịt bầu, phen này cười trừ cho đỡ quê nhé!',
      ];

      const sceneAdvisorQuotes: Record<BackgroundScene3D, string[]> = {
        tra_da: [
          'Ối giồi ôi, bốc trúng con Sĩ rồi! Bàn tay vàng trong làng bốc thăm trúng gió, đen như than tổ ong!',
          'Lật ra con Sĩ đứng ngơ ngác giữa đồng! Đi chéo một bước thì khéo sang năm mới tới nơi bác tài ơi!',
          'Mở trúng giải an ủi: Một chú Sĩ phế phẩm! Phen này cười trừ một cái rồi tối về rửa bát cho vợ nhé!',
          'Lên con Sĩ rùa bò thế này thì đối thủ nhìn thấy đang bụm miệng cười thầm kìa! Khóc một dòng sông rồi bác ơi!',
          'Trời xanh khéo đùa, mở trúng ngay con xấu nhất bàn cờ! Tí nữa nhớ uống cốc trà đá phong thủy giải xui ngay nhé!',
          'Bác vừa thắp hương muỗi trước khi đánh cờ đúng không? Mở ngay trúng quả Sĩ chân ngắn nghễu ngện giữa đường!',
        ],
        ca_phe: [
          'Đắng hơn cả ly cà phê đen không đường! Bốc trúng ngay con Sĩ chân ngắn nghễu ngện giữa đường!',
          'Một pha mở nắp trúng ngay giải rút! Con Sĩ này đi chéo từng bước một thì biết bao giờ mới tới nơi?',
          'Cả quán cà phê đang chờ đợi một siêu phẩm, ai ngờ bác lại bốc trúng con Sĩ phế phẩm cười đau cả ruột!',
          'Duyên phận trớ trêu! Lật ra con Sĩ tù túng thế này thì đối phương đang mừng thầm trong bụng kìa!',
        ],
        dau_truong: [
          'Xác suất 1/7 rơi đúng vào biến thể đen đủi nhất! Một chú Sĩ chân ngắn xuất trận trong sự ngơ ngác của cả hội trường!',
          'Thần may mắn hôm nay bận đi vắng rồi! Lật trúng quân cờ xấu nhất giáo trình cờ úp, ban giám sát cũng phải ôm bụng cười!',
          'Một pha bốc thăm mang đậm tính thử thách lòng kiên nhẫn! Mở ra con Sĩ phế phẩm thì sách giáo khoa cũng chịu thua!',
        ],
        hoa_vien: [
          'Gió thoảng mây trôi mang theo nỗi sầu nhân thế, mở ra chú Sĩ chân ngắn đứng ngơ ngác ngắm hoa rơi bên thềm!',
          'Duyên kỳ ngộ hóa duyên trớ trêu, mở trúng con Sĩ rùa bò thì thôi ta nhấp ngụm trà đắng ngẫm sự đời vậy!',
          'Hoa rơi hữu ý nước chảy vô tình, mở ra cụ Sĩ phế phẩm thế này thì thanh tịnh mấy cũng phải phì cười!',
        ],
        go_tram: [
          'Vạn sự tùy duyên, nhưng lật trúng con Sĩ chân ngắn thế này thì tâm thiền cũng phải dậy sóng phì cười.',
          'Vô ưu vô lo, nhặt được chú Sĩ đứng im ngắm mây trời, một bài học sâu sắc thử thách sự nhẫn nại của kỳ thủ.',
        ],
      };

      if (isFromPawn && Math.random() < 0.65) {
        comment = pawnToAdvisorQuotes[Math.floor(Math.random() * pawnToAdvisorQuotes.length)];
      } else {
        const pool = sceneAdvisorQuotes[bgScene] || sceneAdvisorQuotes.tra_da;
        comment = pool[Math.floor(Math.random() * pool.length)];
      }
    }
  }

  const meta = GRADE_METADATA[grade];
  let gradeLabel = meta.label;
  let tagColor = meta.tagColor;
  let badgeIcon = meta.badgeIcon;

  // Nếu mở trúng quân Sĩ (quân xấu nhất có thể lật), gắn nhãn trêu đùa hài hước
  if (move.wasCovered && move.piece.trueRole === 'advisor') {
    gradeLabel = 'Bốc trúng Sĩ 😂';
    badgeIcon = '🤦';
    tagColor = 'text-amber-400 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]';
  }

  return {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    moveNotation: move.notation,
    grade,
    gradeLabel,
    tagColor,
    badgeIcon,
    comment,
    spectatorName: spectator.name,
    spectatorAvatar: spectator.avatar,
    spectatorTitle: spectator.title,
    isAiGenerated: false,
  };
}

/**
 * Địa chỉ API nhận xét AI. Mặc định là đường dẫn tương đối `/api/move-commentary`
 * (khi chạy cùng server.ts). Với bản build tĩnh (Vercel, Capacitor Android/iOS) đặt
 * `VITE_COMMENTARY_API_URL=https://<server-da-deploy>/api/move-commentary` lúc build;
 * đặt `off` để tắt hẳn việc gọi AI. Lỗi/timeout luôn rơi về câu bình luận có sẵn.
 */
const COMMENTARY_API_URL: string | null = (() => {
  const raw = String(import.meta.env.VITE_COMMENTARY_API_URL ?? '').trim();
  if (raw.toLowerCase() === 'off') return null;
  return raw || '/api/move-commentary';
})();

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
  if (!COMMENTARY_API_URL) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(COMMENTARY_API_URL, {
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
