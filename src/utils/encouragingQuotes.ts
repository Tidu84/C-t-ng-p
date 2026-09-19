// Các câu động viên ý nghĩa khi người chơi xin hòa hoặc xin thua theo yêu cầu
export const RESIGN_ENCOURAGING_QUOTES = [
  'Thắng bại là chuyện thường tình của binh gia, ván sau ắt sẽ phục thù!',
  'Cố gắng lên bạn, kỳ lộ còn dài, cùng làm lại ván mới nhé!',
  'Thua một nước cờ, ngộ ra ngàn thế trận! Đứng dậy chơi tiếp nào!',
  'Cao thủ không nản chí, rút kinh nghiệm ván sau ắt đại thắng!',
  'Một bước lùi để tiến ba bước! Cố lên bạn, kỳ nghệ ngày một thăng hoa!',
  'Kỳ lộ vô cùng, thắng không kiêu bại không nản mới là bậc đại trượng phu!',
];

export const DRAW_ENCOURAGING_QUOTES = [
  'Kỳ hòa vi quý! Hai bên ngang tài ngang sức, bắt tay hòa hoãn!',
  'Nước cờ quá chặt chẽ, kỳ phùng địch thủ, một ván cờ tuyệt vời!',
  'Cờ hòa đẹp như một bức tranh, hai kỳ thủ đều xứng đáng nhận tràng pháo tay!',
  'Bất phân thắng bại, anh hùng trọng anh hùng!',
  'Đôi bên điều binh kín kẽ, thủ vững như bàn thạch, hòa cờ đẹp lòng đôi bên!',
];

export function getRandomResignQuote(): string {
  const index = Math.floor(Math.random() * RESIGN_ENCOURAGING_QUOTES.length);
  return RESIGN_ENCOURAGING_QUOTES[index];
}

export function getRandomDrawQuote(): string {
  const index = Math.floor(Math.random() * DRAW_ENCOURAGING_QUOTES.length);
  return DRAW_ENCOURAGING_QUOTES[index];
}
