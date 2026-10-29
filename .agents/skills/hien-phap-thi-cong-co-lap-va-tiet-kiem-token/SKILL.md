---
name: hien-phap-thi-cong-co-lap-va-tiet-kiem-token
description: >-
  Hiến Pháp Thi Công Cô Lập & Tiết Kiệm Token (Surgical Execution & Project Isolation Rules) - Quy tắc tối cao cho toàn bộ dự án Cờ Úp Việt Nam:
  (1) Kỷ luật phẫu thuật chính xác, tiết kiệm token tối đa: Chỉ đọc/sửa đúng hàm/component chỉ định, cấm quét toàn bộ hay viết lại cả file dài, cấm sửa lan sang vùng khác, không hiển thị code ra chat;
  (2) Khóa cô lập phân vùng & không gian: Tách bạch 3 vùng (Bàn cờ - Quân cờ - Ngoại cảnh), 3 chiều (2D - 3D - 4D), 5 bộ bàn/quân & 5 không gian chơi;
  (3) Chuẩn hóa Trọng tài cờ úp & Cầu nối Engine: Luật Cờ Tướng 2024 & Cờ Úp, 3 mức thời gian 5s-10s-15s, định giá thực chiến, thứ tự mở úp chuẩn;
  (4) Chốt chặn an toàn: Tự tạo Checkpoint, sẵn sàng /undo /redo 3 bước, khóa chặt GitHub Push Guard.
---

# Hiến Pháp Thi Công Cô Lập & Tiết Kiệm Token (Surgical Execution & Project Isolation Rules)
### Quy Tắc Tối Cao Cho Toàn Bộ Dự Án Cờ Úp Việt Nam

Hiến pháp này là bộ luật chỉ đạo cao nhất cho mọi hành động lập trình, bảo trì, cấu hình AI và phát triển tính năng trên toàn bộ dự án Cờ Úp Việt Nam. Mọi thao tác đều phải tuân thủ nghiêm ngặt 4 điều khoản cốt lõi dưới đây:

---

## ĐIỀU 1: KỶ LUẬT PHẪU THUẬT CHÍNH XÁC - TIẾT KIỆM TOKEN TỐI ĐA (SURGICAL EDIT ONLY)

1. **Phạm vi tác động tối thiểu:**
   - Khi nhận lệnh chỉnh sửa một phần nhỏ hoặc tính năng cụ thể, **CHỈ ĐƯỢC PHÉP đọc và sửa đúng hàm, component hoặc phân vùng được chỉ định**.
   - Cấm dùng các lệnh quét mù quáng (scan) toàn bộ mã nguồn hoặc đọc hàng loạt file không liên quan.

2. **Chống viết lại toàn bộ (No Full Rewrites):**
   - Tuyệt đối cấm ghi đè lại cả tệp dài hàng trăm dòng chỉ để đổi vài dòng code.
   - Bắt buộc dùng cơ chế sửa nhắm đích (`edit_file`) đúng khối thay đổi để bảo toàn tính toàn vẹn của mã nguồn.
   - Cấm tự ý sửa lan sang các module khác đang chạy ổn định.

3. **Giao tiếp tinh gọn - Không hiển thị code ra màn hình chat:**
   - Thực thi toàn bộ thay đổi ở chế độ ngầm (stealth execution).
   - Tuyệt đối **không in các khối mã nguồn dài lê thê** ra màn hình chat để tiết kiệm context window và token.
   - Chỉ xuất báo cáo ngắn gọn, súc tích về kết quả thay đổi, trạng thái kiểm thử và hướng dẫn trải nghiệm.

---

## ĐIỀU 2: KHÓA CÔ LẬP PHÂN VÙNG & KHÔNG GIAN (STRICT ISOLATION)

1. **Cô lập 3 vùng giao diện độc lập:**
   - **Vùng 1 (Bàn cờ):** Khung gỗ, đường kẻ, hoa văn bàn, lưới tọa độ.
   - **Vùng 2 (Quân cờ):** Khối tròn quân cờ, mặt chữ, chất liệu, nắp úp, hiệu ứng nhấc/hạ quân.
   - **Vùng 3 (Ngoại cảnh & Nhân vật):** Không gian phòng, bàn trà, đèn chiếu, nhân vật phụ/chibi.
   - *Quy tắc:* Sửa vùng nào chỉ chạm đúng file của vùng đó; tuyệt đối không để thay đổi của vùng này làm méo mó hoặc ghi đè thuộc tính của 2 vùng còn lại.

2. **Cô lập 3 chiều không gian (2D - 3D - 4D):**
   - **Tầng 2D (UI phẳng):** Bàn cờ SVG/CSS, các modal, nút bấm, menu, thanh trạng thái.
   - **Tầng 3D (Three.js WebGL):** Mô hình đa giác, camera OrbitControls/Perspective, đổ bóng, chất liệu PBR.
   - **Tầng 4D (Trục thời gian & Chuyển động):** Dòng thời gian nước đi, hiệu ứng lật nắp, di chuyển quân, âm thanh và đồng hồ.
   - *Quy tắc:* Cấm để rò rỉ biến trạng thái hoặc camera giữa 2D, 3D và 4D.

3. **Cô lập Chủ đề (Theme Isolation):**
   - Dự án có **5 Bộ Bàn Cờ, 5 Bộ Quân Cờ và 5 Không Gian Chơi** độc lập.
   - Mỗi bộ mang style, texture, ánh sáng riêng biệt.
   - Cấm tự ý đồng bộ hàng loạt sang các bộ khác trừ khi có lệnh nguyên văn:
     - *"Đồng bộ tất cả không gian"* hoặc
     - *"Đồng bộ tất cả bàn cờ/quân cờ"*.

---

## ĐIỀU 3: CHUẨN HÓA TRỌNG TÀI CỜ ÚP & CẦU NỐI ENGINE MÃ NGUỒN MỞ

1. **Cầu nối Engine & Nhịp thời gian:**
   - Giữ kết nối mượt mà với Engine cờ mã nguồn mở riêng biệt.
   - Hỗ trợ 3 mức thời gian tính toán chuẩn thi đấu: **5 giây - 10 giây - 15 giây** đi kèm đồng hồ giải đấu (Tournament Clock).

2. **Thực thi nghiêm ngặt Luật Cờ Tướng 2024 & Luật Cờ Úp:**
   - **Chặn nước đi phạm quy:** Chặn nước tự sát, lộ mặt Tướng trước Tướng đối phương.
   - **Cản chân / Mắt / Ngòi:** Tính toán chính xác cản chân Mã, mắt Tượng, ngòi Pháo cho cả quân sáng lẫn quân đang úp.
   - **Đặc quyền cờ úp:** Sĩ và Tượng sau khi mở nắp được phép vượt sông tham chiến bình thường.
   - **Minh bạch hồ quân úp:** Quản lý chặt chẽ túi ẩn 15 quân úp mỗi bên (không bao gồm Tướng), đếm chính xác số lượng quân chưa lật.
   - **Luật hòa & Chống tiêu cực:** Tự động phát hiện và cấm trường chiếu, trường tróc liên tục (tối đa 4 lần phải đổi nước đi).
   - **Tự động lưu ván đấu (Auto-Save):** Ghi nhớ tức thì trạng thái bàn cờ sau mỗi nước đi để bảo vệ dữ liệu người chơi.

3. **Kỷ luật mở úp & Định giá thực chiến:**
   - **Thứ tự ưu tiên mở nắp:** Ưu tiên hàng Tốt (tuyến đầu) $\rightarrow$ Tuyến dưới (Tượng $\rightarrow$ Mã $\rightarrow$ Sĩ) $\rightarrow$ Pháo giả (chỉ khi có lợi thế) $\rightarrow$ **Xe úp tuyệt đối giữ mở sau cùng**.
   - **Định giá khi mở nắp:** Luôn mặc định ra Tốt; chỉ tính xác suất quân lớn khi đã hết 5 Tốt trong bể.
   - **Định giá khi ăn nắp:** Luôn mặc định chỉ là Sĩ/Tượng (310đ) để cấm tuyệt đối việc thí Xe, Pháo, Mã lấy nắp rác có căn giữ.

---

## ĐIỀU 4: CHỐT CHẶN AN TOÀN DỰ ÁN

1. **Cơ chế Checkpoint tự động:**
   - Tự động tạo mốc lưu Checkpoint nội bộ sau **3 thay đổi lớn** hoặc **5 thay đổi nhỏ**.
   - Luôn sẵn sàng cho lệnh `/undo` và `/redo` lùi/tiến 3 bước khi người dùng yêu cầu khôi phục trạng thái.

2. **Khóa chặt an toàn Git (GitHub Push Guard):**
   - **Tuyệt đối cấm tự ý chạy `git push`** sau khi sửa file hay thêm tính năng.
   - Mọi thao tác deploy hoặc push lên GitHub đều ở trạng thái chờ (BLOCKED).
   - Chỉ được phép push khi đã tóm tắt nội dung thay đổi, nêu rõ branch/remote và nhận được sự đồng ý rõ ràng ("đồng ý", "push đi", "ok") từ người dùng.

---

### ÁP DỤNG & HIỆU LỰC
Hiến pháp này có hiệu lực tức thì và ràng buộc tối cao đối với mọi hành động trong toàn bộ phiên làm việc của dự án Cờ Úp Việt Nam.
