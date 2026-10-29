# HIẾN PHÁP & QUY TẮC THI CÔNG DỰ ÁN: CỜ ÚP VIỆT NAM
(Áp dụng bắt buộc cho ChatGPT và Antigravity)

Tôi làm việc theo phong cách "Vibe Coding" (không biết lập trình, điều khiển qua lệnh tắt `/`). Nhiệm vụ của bạn là phối hợp cùng tôi và công cụ Antigravity để phát triển App Cờ Úp. Bạn BẮT BUỘC phải tuân thủ tuyệt đối 5 bộ quy tắc sống còn dưới đây trong mọi câu trả lời:

---

## I. KỶ LUẬT TIẾT KIỆM TOKEN & CẤM SỬA LAN MAN (SURGICAL EDIT & TOKEN SAVING)
1. **Nguyên tắc "Hỏi đâu đánh đấy" (Micro-Scope Only):**
   - Khi tôi yêu cầu sửa một chi tiết nhỏ (ví dụ: chỉnh 1 nút bấm, sửa 1 quy tắc quân cờ, đổi 1 màu sắc), chỉ được phép can thiệp ĐÚNG vào phần/file chứa chi tiết đó.
   - **CẤM TUYỆT ĐỐI:** Không tự ý quét lại toàn bộ dự án, không viết lại (rewrite) cả file dài, không tự ý "tối ưu hóa" hay "dọn dẹp" các phần code khác đang chạy ổn định làm tốn token và gây lỗi dây chuyền.
2. **Cấm xả Code rườm rà:**
   - Không in hàng trăm dòng code ra màn hình chat trừ khi tôi yêu cầu rõ ràng.
   - Mọi giải pháp phải được đóng gói thành các lệnh gạch chéo (`/edit`, `/new-skill`, `/test`, `/checkpoint`, `/undo`) ngắn gọn, chỉ định rõ vùng cần sửa để tôi copy-paste sang Antigravity.

---

## II. KỶ LUẬT PHÂN VÙNG GIAO DIỆN & KHÔNG GIAN (UI/UX ISOLATION)
1. **3 Phân Vùng Vật Lý Độc Lập:**
   - **Vùng 1 (Bàn cờ):** Mặt bàn, kẻ ô, tọa độ, viền bàn.
   - **Vùng 2 (Quân cờ):** Hình dáng quân, mặt chữ, nắp úp, hiệu ứng chọn/ăn quân.
   - **Vùng 3 (Ngoại cảnh):** Phông nền xung quanh, bàn ghế, chén trà, âm thanh môi trường.
   - *Luật khóa:* Lệnh sửa vùng nào chỉ được chạm vào đúng vùng đó. Sửa Quân cờ cấm động vào Bàn cờ; sửa Ngoại cảnh cấm làm lệch tọa độ Bàn cờ.
2. **3 Chiều Không Gian Độc Lập (2D - 3D - 4D):**
   - **2D:** Menu, nút bấm, bảng điểm, thông báo, bàn cờ phẳng.
   - **3D:** Mô hình 3D, ánh sáng, đổ bóng, góc nghiêng camera.
   - **4D:** Tua lại dòng thời gian (Timeline replay), hiệu ứng biến thiên theo trục thời gian.
   - *Luật khóa:* Xác định rõ đang sửa ở tầng 2D, 3D hay 4D. Cấm lấy thông số camera/logic của 4D áp sang 3D hoặc 2D.
3. **Khóa Chủ Đề (5 Bộ Bàn/Quân Cờ & 5 Không Gian Chơi):**
   - Hệ thống có 5 bộ bàn/quân cờ và 5 không gian (quán trà đá, cà phê, công viên...).
   - *Luật khóa:* Khi tôi yêu cầu sửa bộ số mấy hoặc không gian nào, CHỈ sửa đúng bộ đó. Cấm tự động đồng bộ sang 4 bộ còn lại, trừ khi tôi ra lệnh nguyên văn: **"Đồng bộ tất cả không gian"** hoặc **"Đồng bộ tất cả bàn cờ/quân cờ"**.

---

## III. LUẬT TRỌNG TÀI CỜ TƯỚNG - CỜ ÚP & KẾT NỐI ENGINE RIÊNG
Dự án sử dụng **Engine mã nguồn mở riêng** để tính nước đi. Không tự viết lại thuật toán AI đánh cờ trừ khi được yêu cầu chỉnh lớp lọc bên ngoài:
1. **Kế thừa Luật Cờ Tướng chuẩn (2024):**
   - Đỏ đi trước, Đen đi sau. Cấm đi nước tự đưa Tướng mình vào thế bị chiếu.
   - **Cấm Lộ mặt Tướng:** 2 Tướng không được nhìn trực diện nhau trên cùng 1 lộ dọc khi không có quân chắn (cả quân sáng và quân úp đều tính là quân chắn hợp lệ).
   - **Luật cản:** Nắp đang úp và quân đã mở đều tính là vật cản chân Mã, chẹn mắt Tượng và làm ngòi cho Pháo.
   - **Hết nước đi (Stalemate):** Bên nào đến lượt mà không còn nước đi hợp lệ nào thì bị xử THUA.
2. **Luật Đặc Thù Cờ Úp:**
   - **Nước đầu tiên (Khi đang úp):** Đứng ở vị trí quân nào đi theo luật quân đó trong Cờ Tướng gốc, đi xong lập tức lật ngửa nắp.
   - **Sĩ & Tượng sau khi lật sáng:** Được giải phóng hoàn toàn khỏi Cửu cung và Sông — Sĩ sáng (đi chéo 1 ô) và Tượng sáng (đi chéo 2 ô, có cản mắt) được phép qua sông sang sân đối phương tấn công/phòng thủ.
   - **Tốt lật ở sân nhà:** Mở nắp ở hàng dưới (Xe, Pháo, Mã, Sĩ, Tượng) ra quân Tốt thì Tốt đó tính là chưa qua sông (chỉ được đi thẳng 1 ô, qua sông mới được đi ngang).
   - **Quản lý Hồ Quân Úp (15 quân mỗi bên):** Xáo trộn công bằng, minh bạch, không bao giờ sinh thừa/thiếu quân, máy không được dùng code đọc trộm mặt dưới nắp úp.
3. **Đồng Hồ, Chống Cù Nhầy & Hòa Cờ:**
   - Hỗ trợ 3 mốc nghĩ của máy (5s - 10s - 15s) và đồng hồ giải đấu (ví dụ 15 phút + 5s tích lũy mỗi nước). Hết giờ tự động xử thua.
   - Cấm trường chiếu (chiếu dai quá 3 lần không đổi biến) và trường tróc (đuổi dai 1 quân).
   - Tự động xử Hòa hoặc bật quyền Xin Hòa khi lặp lại thế cờ bất khả kháng hoặc sau 60 nước không ăn quân / không mở thêm nắp úp.

---

## IV. BỘ LỌC CHIẾN THUẬT CỜ ÚP (KHI CẦN TINH CHỈNH LỚP ĐIỀU PHỐI)
Khi tôi yêu cầu tinh chỉnh tư duy mở úp hoặc định giá quân cho bot:
1. **Định giá Quân Úp:**
   - *Khi MỞ quân úp:* Mặc định định giá quân sắp mở chỉ là **Tốt** (chỉ khi hồ quân đã lộ hết 5 Tốt mới nâng bậc giả định). Mở ra Tốt ở vị trí đó vẫn phải có lợi thế thì mới mở.
   - *Khi ĂN quân úp địch:* Mặc định định giá nắp úp địch chỉ là **Sĩ/Tượng** (chống lấy quân lớn thí ăn quân úp cầu may; chỉ khi địch lộ hết 2 Sĩ + 2 Tượng mới tính xác suất thực).
2. **Chiến thuật Mở Úp & Chuyển Pha:**
   - Tranh thủ mở úp ở "nước nguội"; mở cây mình kiêm đè chặt nắp úp địch.
   - Thứ tự mở: Hàng Tốt trên cùng -> Tượng úp -> Mã úp -> Sĩ úp. Cấm mở Pháo giả vô cớ. Giữ chặt **Xe úp mở sau cùng** để giữ sức cơ động của Xe và dọa tâm lý đối thủ.
   - Chỉ khi mở đủ bộ ba **Xe - Pháo - Mã sáng** VÀ **thế trận an toàn** mới phát động tổng công kích; nếu cờ đen thì bật chế độ "Tử chiến nghịch cảnh" (cấm đổi quân sáng, dùng Xe úp giăng bẫy, tận dụng Sĩ/Tượng/Tốt qua sông, tuyệt đối cấm tự đầu hàng).

---

## V. CHỐT CHẶN AN TOÀN HỆ THỐNG (SAFETY GUARDRAILS)
1. **Auto-Save:** Tự động lưu trạng thái ván cờ sau mỗi nước đi để thoát app vào lại đánh tiếp được ngay.
2. **Auto-Checkpoint & Undo 3 bước:** Tự động tạo điểm sao lưu sau 3 thay đổi lớn hoặc 5 thay đổi nhỏ. Duy trì lịch sử 3 phiên gần nhất qua các lệnh `/checkpoint`, `/undo`, `/redo`, `/history`.
3. **GitHub Push Guard:** CẤM tự động chạy lệnh `git push`. Bắt buộc liệt kê thay đổi và hỏi ý kiến, chỉ khi tôi gõ xác nhận "đồng ý" mới được push lên GitHub.