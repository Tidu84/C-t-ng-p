# Thử engine cờ úp — 28/10/2026

## Những gì đang hoạt động

- Ba tên cấp máy trong bộ chọn, tiêu đề người chơi và lịch sử: **Người thường**, **Ham chơi**, **Lão quái**. Giá trị lưu vẫn là easy/medium/hard để đọc được ván cũ.
- Đã tải và chạy native trên Windows: [jqe](https://github.com/devinokeefe/jieqi), [PikaJieQi](https://github.com/brianhliou/pikafish-jieqi-wasm), [AB-JChess](https://github.com/lxsgx23/AB-JChess).
- App dev trên localhost chọn engine theo cấp: **PikaJieQi / AB-JChess / jqe**, cho cả thế còn úp và đã ngửa. Không chuyển sang Pikafish cờ tướng thường, vì Sĩ/Tượng phải giữ luật cờ úp.
- Khi không có engine, hết thời gian, vị trí không biểu diễn được hoặc nước đề xuất vi phạm luật app, quay về AI TypeScript trong worker.
- Chỉ gửi FEN công khai: không gửi trueRole/ID của quân đang úp hoặc danh tính quân bị bắt lúc còn úp. Quân đã mở và quân bị bắt sau khi đã mở được trừ khỏi túi quân chưa biết.
- Mọi nước engine trả về phải qua getAllLegalMoves của app, kể cả giới hạn chiếu/đuổi riêng.
- Hủy tìm nước sẽ ngắt HTTP và dừng tiến trình native tương ứng. API chỉ nhận loopback, tối đa một tiến trình tìm nước cùng lúc, 1 thread, Hash 32 MB.

## Phân cấp bản thử

| Cấp | Engine | Giới hạn thời gian so với cài đặt | Độ sâu trần |
|---|---|---|---|
| Người thường | PikaJieQi | 15% | 2 |
| Ham chơi | AB-JChess + NNUE | 45% | 5 |
| Lão quái | jqe + it014.jqn | 100% | 64, thường bị chặn bởi thời gian trước |

Mỗi cấp chạy engine riêng theo yêu cầu của anh dựa trên bảng đấu 700 ms. Giữ ngân sách để người mới dễ làm quen; chưa có Elo xác nhận. AB-JChess được nạp mạng qua tìm depth 1 trước khi bắt đầu tính giờ nước đi.

## Kết quả kiểm tra ban đầu

`npm run engine:trial` kiểm tra cùng bốn vị trí cho ba engine: khai cuộc Đỏ, khai cuộc Đen, thế sau 12 nửa nước mở quân và thế chỉ có quân ngửa. Cả 12/12 nước trả về được bộ luật app chấp nhận. Đây là smoke test, không phải 12 ván đấu hay bằng chứng engine nào mạnh hơn. Bộ test app: 31/31 đạt; TypeScript và production build đạt. Bài kiểm API local xác nhận dữ liệu sai bị từ chối, hủy tìm nước dừng tiến trình và lượt sau vẫn chạy được.

jqe nạp thành công mạng `engine/nets/it014.jqn`. PikaJieQi dùng đánh giá cổ điển. AB-JChess 0.2d nạp gói `abjchess-20261010.nnue`. Smoke test ban đầu chưa làm nóng mạng nên không đủ cơ sở xếp hạng. Giải đấu sau đã nạp mạng trước khi bấm giờ cho cả ba engine.

API local, cùng vị trí khai cuộc và giới hạn 0.8 giây: Bình thường đạt depth 2, Ham chơi depth 5, Lão quái depth 13 trong khoảng 0.8 giây. Không so depth giữa các engine vì cách đếm và tìm kiếm khác nhau.

Kết quả thô: `../engine-lab/results/smoke.json`. Nguồn và commit: `../engine-lab/results/sources.json`.

## Chạy lại và đổi engine

```powershell
npm run dev
npm run engine:trial
```

Dev tự nhận `../engine-lab/bin/jqe.exe`, working directory `../engine-lab/jqe`, mạng `engine/nets/it014.jqn`. Có thể đặt `JIEQI_ENGINE_PATH`, `JIEQI_ENGINE_CWD`, `JIEQI_EVAL_FILE` cho Lão quái; tiền tố `ABJCHESS_` cho Ham chơi và `PIKAJIEQI_` cho Người thường (cùng hậu tố `ENGINE_PATH`, `ENGINE_CWD`, `EVAL_FILE`); xem `.env.example`. Khởi động lại server sau khi đổi biến môi trường. `VITE_JIEQI_ENGINE_URL=off` tắt thử native.

## Giới hạn trước khi phát hành

- **Engine native này chỉ bật trên máy local.** Bản build tĩnh/Android/iOS vẫn dùng AI TypeScript trừ khi có tích hợp engine riêng phù hợp. Chưa đóng gói WASM hay triển khai dịch vụ cloud.
- App hiện không cho biết danh tính quân bị bắt lúc còn úp cho hai bên; một số engine áp dụng capturer-only reveal. Adapter giữ nguyên thông tin mà app cho phép, chưa chứng minh tương đương hoàn toàn về đánh giá xác suất.
- FEN khởi tạo lại từng lần; engine chưa nhận toàn bộ chu kỳ lặp. App vẫn là trọng tài và chặn nước cấm, nhưng đánh giá tương lai của engine chưa tuân thủ đầy đủ luật chiếu/đuổi 5 lần của app.
- Chưa đấu giải dài, đo sức cờ trên điện thoại hay chứng nhận Elo 2400. Cần dùng cùng bộ chia quân, đổi màu và cùng thời gian để đo.

## Nguồn và bản sửa Windows

Các nguồn/binary/mạng thử nằm ngoài repo app tại `../engine-lab`, không nằm trong thư mục public hoặc dist. Compiler portable là Zig 0.16.0 từ gói PyPI ziglang, cài ở `../engine-lab/toolchain`, không sửa cài đặt hệ thống.

jqe được biên dịch từ nguồn với bản sửa Windows: tránh macro HUGE của MinGW và ghép đúng _aligned_malloc/_aligned_free. Bản vá ở `../engine-lab/results/jqe-windows.patch`. Không thay thuật toán hay mạng. PikaJieQi được biên dịch với C++20 để hợp compiler portable. AB-JChess dùng gói Windows 0.2d từ release tác giả, không sửa hoặc phân phối lại.

jqe có giấy phép MIT; PikaJieQi và mã AB-JChess có GPL. Các gói NNUE và điều kiện phân phối cần kiểm tra riêng trước khi đưa vào bản phát hành. Bản thử hiện không nhúng chúng vào app.


## Bổ sung từ đấu vòng tròn

Sau giải so sánh cả ba engine (xem `ENGINE_TOURNAMENT.md`), adapter gửi thêm danh sách nước gốc hợp lệ của app bằng UCI `searchmoves`. Điều này ngăn engine chọn nước chiếu cùng quân lần thứ sáu mà không phải nhờ AI dự phòng chọn hộ. Engine vẫn phải qua bộ kiểm luật sau khi trả nước. Mô phỏng sâu bên trong engine vẫn chưa dùng toàn bộ luật lịch sử riêng của app.

Đã hoàn thành và phát lại 24 ván (hai lượt, mỗi lượt 12 ván). Lượt 700 ms/nước có lọc nước gốc: jqe 7 thắng/1 thua, AB-JChess 3 thắng/5 thua, PikaJieQi 2 thắng/6 thua; không có nước bất hợp lệ. Theo yêu cầu tiếp theo của anh, gán jqe cho Lão quái, AB-JChess cho Ham chơi, PikaJieQi cho Người thường. Đây là mẫu nhỏ trên Windows, chưa kết luận sức cờ trên điện thoại hay Elo.

Kiểm tra sau sửa: 33/33 test đạt, TypeScript và production build đạt. Tình huống chiếu lần thứ sáu lấy từ biên bản đã được chạy lại bằng native engine và trả nước hợp lệ. API localhost đã kiểm tra hủy tìm nước, yêu cầu tiếp theo và truyền `searchmoves` tới engine.

## Kiểm tra phân cấp mới

35/35 test, TypeScript và build đạt. Bài API thực tế xác nhận easy trả pikajieqi, medium trả abjchess, hard trả jqe; cả ba tuân theo danh sách nước hợp lệ. Thiếu engine hoặc mạng sẽ báo không sẵn sàng để client dùng AI TypeScript dự phòng, không tráo sang engine của cấp khác. Tên cũ Bình thường đổi thành Người thường; khóa easy và file avatar được giữ để tương thích dữ liệu cũ.
