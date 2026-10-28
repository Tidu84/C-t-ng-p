# Kiểm tra và cải thiện ngày 28/10/2026

Repo: Tidu84/C-t-ng-p, bản gốc 131a933. Các thay đổi đang ở máy local, chưa push.

## Đã sửa

- Không tự xử hòa khi còn Sĩ/Tượng: quân ngửa này có thể qua sông và chiếu Tướng theo luật hiện có. Chỉ tự nhận diện thiếu quân với hai Tướng trơ.
- AI tính bí nước là thua, thống nhất với giao diện. Ưu tiên thắng sớm và trì hoãn thua.
- Cache AI phân biệt Xe/Pháo, vai trò của quân trong mô phỏng và bên đang được đánh giá. Nhãn exact/lower/upper dùng cửa sổ alpha/beta ban đầu, tránh ghi sai loại kết quả.
- Hủy tìm nước dừng hẳn worker bận, giải phóng CPU; vẫn tái sử dụng worker rảnh. Worker lỗi được loại bỏ để lần sau có thể khởi tạo lại.
- Quân 3D không bị đặt thẳng vào ô đích trước animation; giữ vị trí cũ để chuyển động chạy được.
- Không render lại cả scene khi con trỏ vẫn nằm trong cùng ô.
- Giới hạn DPR ở 1 cho chế độ máy yếu, 1.75 cho chế độ thường.
- Lửa trang trí chỉ yêu cầu render tối đa khoảng 24 lần/giây lúc rảnh và ngừng yêu cầu khi tab ẩn; di chuyển quân/camera vẫn có nhịp riêng.
- Thêm viền bàn nhiều lớp, đường chỉ kim loại và ánh sáng phụ lạnh cho cảnh bàn gỗ.
- Sửa prompt Gemini nói sai rằng Sĩ không thể qua sông.
- Thêm npm lockfile đầy đủ đa nền tảng; CI dùng npm ci và chạy cả test.

## Đã kiểm tra

- TypeScript: đạt.
- Bộ test: 26/26 đạt, gồm test hồi quy Sĩ/Tượng, cache và vòng đời worker.
- Production build: đạt.
- npm ci dry run: đạt; lockfile có dependencies native cho Linux và Windows.
- Trình duyệt local: mở quân trên bàn 3D, AI trả nước và chuyển lại lượt người; không ghi nhận lỗi runtime trong lượt thử. Có cảnh báo THREE.Clock deprecated từ stack Three hiện tại.
- Quan sát bố cục 1280×800 và 390×844; kiểm tra cảnh trà đá và Thánh địa, góc toàn cảnh.

Chưa đo FPS/điện năng trên thiết bị Android thật; chưa kiểm tra toàn bộ ván dài, iOS, APK hay Gemini với API key thật. Không coi bộ test hiện tại là chứng minh đầy đủ mọi luật cờ.

## Những việc còn nên làm

1. AI hiện có nhiều luật thưởng/phạt rất mạnh cho các mẫu khai cuộc cụ thể. Cần bộ thế cờ chuẩn và đấu tự động nhiều ván để đo sức cờ, thay vì tiếp tục thêm ngoại lệ theo từng ván.
2. Mô phỏng quân úp hiện dùng vai trò đại diện đã che thông tin, chưa lấy mẫu nhiều khả năng lật quân. Có thể nâng cấp tìm kiếm bất định, nhưng cần benchmark thời gian trước.
3. Đo GPU frame time trên máy Android mục tiêu trước khi thêm phản chiếu, hậu kỳ hay cảnh phức tạp. Nên tự điều chỉnh chất lượng theo tải, giữ chữ quân và điểm đi rõ.
4. Muốn nâng hình ảnh mạnh hơn: làm lại chất liệu gỗ/đá, bộ quân có cạnh vát và bố trí ánh sáng nhất quán; dùng ảnh so sánh cùng góc máy và cùng chất lượng để đánh giá.
5. Bổ sung bài tập thế cờ và phát lại ván từng nước là các tính năng hữu ích tiếp theo, tận dụng lịch sử ván hiện có.
