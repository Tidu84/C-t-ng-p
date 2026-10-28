# BẢN THIẾT KẾ HỆ THỐNG & BỘ KỸ NĂNG AI CỜ ÚP (DỰ ÁN CỜ ÚP VIỆT NAM)

Hãy ghi nhớ toàn bộ các quy tắc kiến trúc và kỹ năng chiến thuật dưới đây để phối hợp cùng tôi xây dựng và tối ưu hóa dự án Cờ Úp. Tôi làm việc theo phong cách "vibe coding" (không hiển thị code rườm rà trừ khi tôi yêu cầu, ưu tiên xuất các câu lệnh gạch chéo `/` ngắn gọn để tôi nạp thẳng vào công cụ AI lập trình Antigravity).

---

## PHẦN 1: QUY TẮC KIẾN TRÚC & PHÂN VÙNG GIAO DIỆN (UI/UX BOUNDARIES)

1. **Phân định 3 vùng độc lập:** Bàn cờ, Quân cờ, và Ngoại cảnh. Sửa vùng nào chỉ can thiệp đúng vùng đó.
2. **Khóa chiều không gian độc lập (2D - 3D - 4D):**
   - **2D:** Giao diện phẳng, menu, nút bấm, điểm số, thông báo.
   - **3D:** Mô hình quân cờ 3D, bề mặt bàn cờ có chiều sâu, ánh sáng/đổ bóng, góc camera.
   - **4D:** Dòng thời gian tua lại ván cờ, hiệu ứng biến dạng không-thời gian, hoạt ảnh động theo trục thời gian.
   - *Nguyên tắc:* Trước khi sửa phải xác định rõ thuộc tầng 2D, 3D hay 4D. Tuyệt đối không lấy lệnh/camera/logic của 4D áp sang 3D hoặc 2D.
3. **Khóa chủ đề độc lập (5 Bộ Bàn Cờ - 5 Bộ Quân Cờ - 5 Không Gian Chơi):**
   - Dự án có 5 bộ bàn cờ (gắn khớp 5 bộ quân cờ tương ứng) và 5 không gian ngoại cảnh (quán cà phê, quán trà đá vỉa hè, công viên...).
   - *Nguyên tắc:* Chỉ định sửa bộ nào/không gian nào thì chỉ sửa đúng đối tượng đó, cấm ghi đè sang 4 bộ còn lại. Chỉ khi có lệnh rõ ràng: "Đồng bộ tất cả không gian" hoặc "Đồng bộ tất cả quân cờ/bàn cờ" mới được áp dụng hàng loạt.

---

## PHẦN 2: BỘ KỸ NĂNG CHIẾN THUẬT CỦA AI CỜ ÚP ("KỲ THÁNH THỰC CHIẾN")

Mục tiêu: Xây dựng con bot đánh 10 thắng 9, kết hợp giữa độ quái của cờ úp giang hồ và sức mạnh tính toán của máy tính.

### Skill 1: Nghệ thuật Mở Úp Thủ & Kèm Chặt Đối Phương
- **Tranh thủ "Nước nguội":** Khi bàn cờ đang tĩnh, cung Tướng an toàn, không có quân sáng bị đe dọa, lập tức tranh thủ mở nắp úp, không đi nước điều quân sáng vô nghĩa.
- **Bài test giả định "Lật ra Tốt vẫn phải ưu" (Worst-Case Pawn Test):** Trước khi mở bất kỳ nắp úp nào, phải giả định kịch bản đen nhất là lật ra quân Tốt (hoặc Sĩ). Vị trí đứng mới của con Tốt đó vẫn phải mang lại lợi thế (kiểm soát lộ, che chắn, làm ngòi Pháo, thông đường quân sau) và không bị ăn trắng thì mới được mở.
- **Mở cây kiêm khóa địch (Open & Suppress):** Mỗi nước mở úp phải ưu tiên đè đầu Tốt úp, chẹn mắt Tượng úp, cản chân Mã úp của đối phương, bóp nghẹt không gian không cho địch mở cây.
- **Thứ tự mở úp nghiêm ngặt:** 
  1. Ưu tiên mở hàng Tốt trên cùng trước để thông đường.
  2. Mở hàng dưới theo thứ tự: Tượng úp -> Mã úp -> Sĩ úp.
  3. **Cấm kỵ Pháo giả:** Không tự ý mở Pháo úp nếu không có lý do sống còn hoặc ăn được quân lớn an toàn.
  4. **Giữ Xe úp mở sau cùng:** Nắp Xe úp có sức cơ động của Xe và giá trị "dọa tâm lý / tung hỏa mù" cực lớn (mở ra 90% là yếu đi). Luôn găm giữ Xe úp để kiểm soát lộ và dọa ma đối thủ.

### Skill 2: Động Cơ Lai (Hybrid Engine) & Chuyển Pha Tác Chiến
- **3 mức thời gian suy nghĩ:** Hỗ trợ 3 chế độ 5 giây (Cờ chớp), 10 giây (Tiêu chuẩn), 15 giây (Nghiền ngẫm). Hết giờ là hạ quân dứt khoát.
- **Pha 1 - Cờ Úp & Thủ Lấy Thế:** Khi còn nhiều quân úp hoặc chưa đủ lực lượng, ưu tiên 100% logic cờ úp tùy chỉnh. Giữ thế thủ chắc chắn, tính xác suất các quân còn ẩn trong nắp úp của hai bên.
- **Pha 2 - Kích hoạt sát thủ Stockfish (Chuyển pha):** 
  - *Điều kiện kép:* Chỉ bàn giao toàn quyền cho engine Stockfish/Fairy-Stockfish (bản WebAssembly/JS nhẹ chạy trên thiết bị, depth 8-10, threads = 1, Hash = 16MB) khi ĐÃ mở đủ bộ ba **Xe - Pháo - Mã sáng** VÀ **thế trận an toàn sẵn sàng phát động tấn công**. Nếu thiếu 1 trong 2 điều kiện, kiên quyết thủ rình cơ hội phản công.

### Skill 3: Đọc Vị Tâm Lý & Khắc Chế Lối Chơi (Opponent Profiling)
- Phân loại đối thủ qua 5-10 nước đầu:
  - **Gặp kẻ "Ham Đỏ Đen / Liều Mạng":** Bot dựng "Bức Tường Thép", tuyệt đối không đôi công may rủi, thủ chắc chờ đối thủ tự mở ra quân bất lợi hoặc hở sườn rồi mới phản đòn.
  - **Gặp kẻ "Quá Ham Thủ / Co Cụm":** Bot chủ động đưa quân úp vào thế ép đổi, tạo biến số đỏ đen để phá vỡ cấu trúc phòng ngự tĩnh khiến họ rối loạn.

### Skill 4: Tử Chiến Nghịch Cảnh & Trọng Dụng Quân Nhỏ
- **Khi cờ quá đen (mở toàn quân nhỏ, thiệt quân sáng):** 
  - Cấm tuyệt đối đổi quân sáng; cố tình giữ bàn cờ nhiều quân cản để phế võ công Xe địch.
  - Dùng Xe úp và nắp úp giăng bẫy, rình đánh đòn **"Chiếu rút mở nắp"** (sát thương kép).
  - **Vô hiệu hóa đầu hàng (No Resign):** Đánh đến quân cuối cùng, tìm đường gài bẫy sát cục trộm hoặc ép cờ hòa cưỡng bức.
- **Triết lý "Gặp thời một Tốt cũng thành công":** Tận dụng tối đa luật Sĩ - Tượng vượt sông trong cờ úp để làm lá chắn, làm ngòi Pháo và công thành. Tăng vọt trọng số của quân Tốt khi áp sát Cửu cung để tung đòn khóa hầu chí mạng.

### Skill 5: Sổ Tay Trí Nhớ & Tự Học Tinh Hoa Có Chọn Lọc
- **Sổ tay thế trận (Opening Book / Fast Lookup):** Ghi nhớ các hình cờ đã chơi để lần sau gặp lại đi ngay trong 0.1s mà không cần tính lại.
- **Khiêm nhu học hỏi đối thủ (Quality Filtered Learning):** Nếu đối thủ có cách mở úp hay hơn, tâm lý bình tĩnh thoát hiểm tốt hơn hoặc phối hợp quân sắc bén hơn, bot tự động trích xuất và học theo.
- **Bộ lọc chống rác:** Chỉ học từ các ván đối thủ **đánh thắng bot** hoặc tạo ra **thế cờ áp đảo thực sự**. Tuyệt đối loại bỏ các nước đi ẩu, cờ rùa để tránh làm hỏng tư duy của bot.

### Skill 6: Chuẩn Mực Thi Đấu & Cảm Xúc Con Người
- **Luật chống cù nhầy:** Cấm trường chiếu (chiếu dai quá 4 lần) và trường tróc (đuổi dai 1 quân), tự động đổi biến để ván cờ văn minh, dứt khoát.
- **Nhịp thở & Khẩu chiến vỉa hè:** Giả lập độ trễ suy nghĩ tự nhiên (nước dễ đi nhanh, nước khó ngẫm nghĩ) và buông các câu bình luận (trash-talk) đúng chất kỳ thủ thực chiến.