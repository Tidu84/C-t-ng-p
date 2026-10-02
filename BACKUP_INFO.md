# SAO LƯU PHIÊN BẢN 2.0 (VERSION 2.0 BACKUP)
**Dự án:** Cờ Tướng Úp Việt Nam (Co Tuong Up)  
**Phiên bản:** `v2.0.0` (Milestone Stable Release)  
**Thời gian tạo:** 2026-09-30  
**Tác giả:** Tidu84  

---

## 📌 Tổng quan phiên bản 2.0 (Chốt mốc trước khi tối ưu gọn code)

Phiên bản 2.0 là bản phát hành đầy đủ tính năng hoàn thiện, ổn định và đã được kiểm tra 100% không có lỗi biên dịch:

### 1. Luật cờ & Thế trận chuyên sâu:
- **Luật Cờ Úp chuẩn giải đấu:**
  - Quân úp di chuyển theo vị trí quân cờ truyền thống ban đầu cho đến khi đi nước đầu tiên.
  - Luật "Thích khách dạ hành": Mở quân úp trực tiếp ăn Tướng đối phương.
  - Ẩn danh quân úp: Khi đối phương ăn quân úp của mình, hệ thống không để lộ danh tính quân úp đó.
  - Giới hạn chiếu tướng: Tối đa 5 lần liên tiếp (có cảnh báo toast và chặn vi phạm).
  - Giới hạn đuổi quân vô căn: Tối đa 5 lần liên tiếp.
- **Hệ thống nhận diện thế cục kết liễu:**
  - `Cục: Bó tay chịu trói`: Xuất hiện khi đối thủ hết mọi nước đi hợp lệ (kẹt cờ/stalemate).
  - `Cục: Song xa đoạt mệnh`: Hai cỗ xe phối hợp tả hữu công thành.
  - `Cục: Thiết môn thuyên`: Khóa chặt trung lộ đoạt mạng.
  - `Cục: Mã ngọa tào`, `Pháo lồng`, `Nhất xa sát vạn tử`, `Thiết tốt phá thành`.

### 2. Tinh chỉnh rung phản hồi thiết bị di động (Mobile Haptics):
- **Phân định rõ người chơi và đối thủ:**
  - Hoàn toàn KHÔNG rung khi đối thủ ăn quân của người chơi.
  - Chỉ rung khi người chơi trực tiếp thực hiện nước đi bắt quân.
- **Số nhịp rung theo loại quân:**
  - Bắt quân úp: Rung 1 lần duy nhất (`200ms`).
  - Bắt quân Xe: Rung 2 lần (`[180ms, 100ms, 180ms]`).
  - Bắt các quân khác: Không rung.
- **Khi giành chiến thắng:**
  - Không rung điện thoại khi thắng (chỉ hiện bảng vinh danh hào quang, pháo hoa chúc mừng và nhạc khải hoàn).
- **An toàn kỹ thuật:**
  - Sử dụng API `navigator.vibrate` có kiểm tra an toàn điều kiện môi trường, bọc `try...catch` chống lỗi trên mọi trình duyệt/iframe.
  - Hỗ trợ đa nền tảng: Capacitor Android, iOS WebHaptics, và Loa rung trầm Sub-bass song hành.

### 3. Đồ họa & Hiệu năng:
- Bàn cờ 2D và 3D góc nghiêng tinh xảo, tùy chọn các danh thắng (Hoàng Cung, Thủy Các, Trúc Lâm, Đình Làng,...).
- Chế độ Lite Mode (Tối ưu mượt mà 60fps trên Poco M4 Pro & máy cấu hình thấp).
- Lưu trạng thái, hồ sơ kỳ thủ, lịch sử đấu và thống kê ván cờ.

---

## 💾 Hướng dẫn Khôi phục phiên bản 2.0 (Restore Guide)

Nếu trong quá trình tối ưu code ở khung chat mới gặp bất kỳ vấn đề gì, bạn có thể khôi phục lại nguyên trạng phiên bản 2.0 bằng các cách sau:

1. **Khôi phục qua commit v2.0.0 (`a6847c5`):**
   ```bash
   git checkout a6847c5
   ```
   File nén `backup_v2.0.tar.gz` đã được gỡ khỏi cây thư mục (vẫn còn trong lịch sử git). Nếu cần lấy lại:
   ```bash
   git show a6847c5:backup_v2.0.tar.gz > backup_v2.0.tar.gz && tar -xzf backup_v2.0.tar.gz
   ```
2. **Khôi phục qua Git Tag** (nếu đã tạo tag, ví dụ `git tag v2.0 a6847c5 && git push origin v2.0`):
   ```bash
   git checkout v2.0
   ```
3. **Kiểm tra trạng thái sau khôi phục:**
   ```bash
   npm run lint
   npm run build
   ```
