# PikaJieQi trên web — 29/10/2026

Người thường (`easy`) dùng PikaJieQi WebAssembly trong Web Worker của thiết bị.
Ham chơi và Lão quái trên web vẫn dùng AI TypeScript dự phòng; bản local tiếp tục
gọi đúng ba native engine theo `AI_PROFILES`. Không dùng Pika để giả làm jqe/AB.

## Bản dựng

- Nguồn và thay đổi port: `vendor/pikajieqi/PORT.md`. Không sửa bộ sinh nước đi
  hay đánh giá cổ điển. Chuyển chạy một luồng trong Worker, bỏ cấp phát NNUE
  không dùng. Threads cố định 1, Hash mặc định 16 MB; không khởi tạo lại các bảng
  này sau khi nạp module để tránh tăng RAM không cần thiết.
- Emscripten 3.1.64; script `scripts/build-pikajieqi.py`. Không dùng pthreads,
  SIMD, SharedArrayBuffer hay yêu cầu COOP/COEP.
- WASM 383.057 byte + loader 66.189 byte, khoảng 0,45 MB chưa nén. Bridge Worker
  nhỏ được tải cùng; không tải file NNUE. Chỉ nạp khi Người thường cần tính nước.
- Bộ nhớ WebAssembly: khởi tạo 64 MiB và tăng theo nhu cầu, trần 256 MiB. Trong
  bài thử đo được 116,06 MiB sau khởi tạo và khoảng 116,44 MiB sau 7 thế; đây
  không phải tổng RAM của cả app/trình duyệt. Chưa đo trên điện thoại thật.
- Tái sử dụng Worker rảnh. Hủy lúc đang nạp/tính sẽ terminate Worker thực sự.
  Watchdog và lỗi nạp chuyển về AI TypeScript; đợi 60 giây trước khi thử nạp lại.
- Giữ ngân sách Người thường: depth tối đa 2, 15% thời gian chọn, tối thiểu 100 ms.

## Thông tin và luật

Chỉ gửi public FEN và danh sách nước hợp lệ; không gửi board, trueRole hay lịch
sử có quân bí mật. Engine chọn trong `searchmoves`; app kiểm lại nước trả về.
Không gọi máy chủ tính cờ. Giới hạn chiếu/đuổi của app hiện tại vẫn giữ nguyên;
Hiến pháp mới được ghi nhận nhưng chưa tự thay luật trong tác vụ này.

## Kiểm tra

`npm run engine:wasm:check`: 7/7 thế đạt, gồm khai cuộc hai màu, thế đã mở quân,
thế toàn quân ngửa, giới hạn một nước gốc, Sĩ và Tượng vượt sông. Kiểm tra FEN
không đổi khi thay danh tính quân đang úp. Kết quả ở
`engine-results/pikajieqi-wasm-smoke.json`.

37 test app đạt, gồm Worker reuse/cancel/stale response và loại nước WASM sai
luật để dùng dự phòng. TypeScript và build Hosting đạt. Trình duyệt bản build
tĩnh xác nhận log `PikaJieQi WASM` và trả nước thật. Không suy ra Elo/tỷ lệ thắng
hoặc hỗ trợ mọi điện thoại từ các kiểm tra này.

## Giấy phép và nguồn tương ứng

GPL-3.0-or-later. Bản phân phối có `COPYING.txt`, `AUTHORS.txt`, `source.zip`
(nguồn đã sửa và công thức build), cùng `version.json` chứa commit và SHA-256.
Các file này nằm trong `/engines/pikajieqi/`; liên kết được đặt trong Luật chơi.
File zip nguồn chỉ tải khi người dùng bấm, không nằm trong tải engine ban đầu.
