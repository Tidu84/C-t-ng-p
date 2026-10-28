# Đấu vòng tròn ba engine cờ úp — 28/10/2026

Đây là kết quả đấu thực tế trên máy local của anh, theo bộ luật hiện tại của app. Không suy ra Elo 2400 hay khẳng định thứ hạng trên mọi thiết bị/thời gian.

## Kết quả

| Thời gian mỗi nước | Engine | Thắng–Hòa–Thua | Điểm | Lỗi/bất hợp lệ |
|---|---|---|---|---|
| 300 ms (chưa lọc nước gốc) | pikajieqi | 5–0–3 | 5/8 | 0 |
| 300 ms (chưa lọc nước gốc) | jqe | 4–0–4 | 4/8 | 1 |
| 300 ms (chưa lọc nước gốc) | abjchess | 3–0–5 | 3/8 | 0 |
| 700 ms (lọc nước gốc) | jqe | 7–0–1 | 7/8 | 0 |
| 700 ms (lọc nước gốc) | abjchess | 3–0–5 | 3/8 | 0 |
| 700 ms (lọc nước gốc) | pikajieqi | 2–0–6 | 2/8 | 0 |

Tổng điểm các lượt thử: jqe **11 điểm** (11 thắng, 0 hòa, 5 thua); pikajieqi **7 điểm** (7 thắng, 0 hòa, 9 thua); abjchess **6 điểm** (6 thắng, 0 hòa, 10 thua).

## Điều kiện công bằng

- Đấu vòng tròn cả ba cặp; mỗi thế chia quân cố định được đấu hai lần, hoán đổi engine cầm Đỏ/Đen. Hạt giống và toàn bộ quân chia được lưu để phát lại.
- Mỗi engine 1 thread, Hash 32 MB; chỉ một bên đang tìm nước, không chạy các ván song song. Cùng thời gian movetime ở từng lượt thử, không so bằng độ sâu hay số node.
- Tiến trình được giữ suốt lượt thử và nạp mạng trước khi bấm giờ. AB-JChess 0.2d nạp mạng abjchess-20261010.nnue; jqe nạp it014.jqn; PikaJieQi dùng đánh giá cổ điển.
- Nước đi sai/lỗi engine bị ghi riêng và xử thua; không cho AI dự phòng đi hộ.
- Sau giải, phát lại mọi nước, kiểm lại kết quả và kiểm tra payload công khai không thay đổi khi thay toàn bộ danh tính quân còn úp.

## Từng cặp

### 300 ms/nước — chưa gửi searchmoves — 12 ván


- jqe gặp pikajieqi: **1 thắng, 0 hòa, 3 thua** (theo jqe).
- jqe gặp abjchess: **3 thắng, 0 hòa, 1 thua** (theo jqe).
- pikajieqi gặp abjchess: **2 thắng, 0 hòa, 2 thua** (theo pikajieqi).

Phát lại: 864 nửa nước hợp lệ; 1 nước bị từ chối; 0 ván hòa do trần 220 nửa nước thử nghiệm. Tất cả cặp chia quân đã đổi màu.

Biên bản: `../engine-lab/results/round-robin-300ms/games.jsonl`; cấu hình/hash/mạng: `manifest.json`; kiểm phát lại: `replay-check.json`.

### 700 ms/nước — có searchmoves theo luật app — 12 ván


- jqe gặp pikajieqi: **4 thắng, 0 hòa, 0 thua** (theo jqe).
- jqe gặp abjchess: **3 thắng, 0 hòa, 1 thua** (theo jqe).
- pikajieqi gặp abjchess: **2 thắng, 0 hòa, 2 thua** (theo pikajieqi).

Phát lại: 905 nửa nước hợp lệ; 0 nước bị từ chối; 0 ván hòa do trần 220 nửa nước thử nghiệm. Tất cả cặp chia quân đã đổi màu.

Biên bản: `../engine-lab/results/round-robin-root-700ms/games.jsonl`; cấu hình/hash/mạng: `manifest.json`; kiểm phát lại: `replay-check.json`.

## Giới hạn

Hai lượt có thể khác cả thời gian tính và cơ chế lọc nước gốc; không thể quy chênh lệch kết quả chỉ cho một yếu tố. Tổng điểm chỉ tóm tắt các bài thử, không phải thang sức cờ chuẩn hóa.

Đây là một mẫu nhỏ, thời gian ngắn trên CPU Windows; kết quả có thể đổi khi tăng thời gian, đổi mạng, đổi phiên bản hoặc chạy trên điện thoại. Luật app khác một số nền tảng Jieqi: quân bị bắt lúc úp không lộ cho bên nào; chiếu/đuổi cùng quân lần thứ sáu bị cấm; 80 nửa nước không bắt quân xử hòa. Mỗi lượt gửi FEN hiện tại, chưa gửi toàn bộ lịch sử lặp cho engine; trọng tài app vẫn giữ lịch sử. Vì vậy đây là so sánh sức cờ kèm độ tương thích trong app, không phải bảng xếp hạng engine Jieqi tiêu chuẩn.

Khác biệt bản dựng: jqe và PikaJieQi được biên dịch portable bằng Zig với -O2; AB-JChess dùng binary Windows AVX2 của tác giả. Kết quả phản ánh các bản dựng/mạng đang thử, không tách riêng chất lượng thuật toán khỏi tối ưu phần cứng.

Kiểm tra tích hợp sau giải: 33/33 test đạt; TypeScript và production build đạt; API localhost truyền searchmoves đúng, từ chối dữ liệu sai và giải phóng lượt tìm khi hủy. Tình huống chiếu lần thứ sáu từ biên bản được tái hiện và native engine đã chọn nước thay thế hợp lệ.
