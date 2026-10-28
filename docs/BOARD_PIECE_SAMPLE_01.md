# Bộ mẫu 01 — Ngà sáng · Mực trầm

Theo yêu cầu ngày 28/10/2026: ưu tiên tách bàn/quân và chữ/mặt quân, nét khắc chìm, nắp có thể cùng tông chữ. Mẫu được dựng bằng SVG/CSS/canvas, dùng font Hán đã đóng gói trong dự án.

- Phạm vi: chỉ bộ `giang_ho` (bàn `giang_ho`, quân `giang_ho`). Không sửa bốn bộ còn lại, camera, chibi hay ngoại cảnh.
- Bàn: nâu óc chó tối `#51463c` → `#302720`, đường bàn màu lanh. Vân nền nhẹ để tránh cạnh tranh với chữ quân.
- Mặt quân ngửa: ngà `#fff3d9` → `#e5cfaa`, chữ đỏ son trầm `#9c231c` hoặc đen mực `#171c20`. Không dùng đỏ tươi nhạt trên nền vàng bóng.
- Nắp: đỏ trầm/đen than theo phe đã công khai, hai vòng ngà giúp nhìn thấy nắp trên bàn tối. Nắp không có ký hiệu tiết lộ loại quân bên trong.
- 2D: nét khắc giả lập bằng mép sáng phía dưới và mép tối phía trên; giữ nguyên hình chữ lớn, không thêm họa tiết giữa mặt quân.
- 3D: bản đồ độ cao tuyến tính có vùng chữ/vòng khắc thấp hơn mặt quân, vật liệu nhám vừa để phản ứng với ánh sáng. Đây là bump mapping mô phỏng rãnh khắc, không phải khoét hình học thật. Tái sử dụng texture cache, không tạo mesh cho từng nét chữ.
- Giữ trình tự mở nắp riêng rồi lật thân quân. Mặt lưng của thân quân vẫn là gỗ trơn; màu nắp không làm thay màu mặt ngửa.
- Bản xem: `http://localhost:3000/?preview=giang-ho`. Trang dùng cùng component/vật liệu của app với thế cờ trưng bày riêng, không đọc hoặc ghi ván của anh. Có nút đổi 2D/3D.

Nguyên tắc áp dụng lần sau: ưu tiên tương phản độ sáng và đường biên, không chỉ chọn hai sắc màu đối nhau; kiểm tra chữ ở kích thước quân nhỏ và dưới ánh sáng 3D. Chỉ mở rộng sang bộ khác khi anh yêu cầu.
