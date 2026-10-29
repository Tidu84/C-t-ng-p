# Đối chiếu bản thiết kế AI

Ngày ghi nhận: 28/10/2026. Bản gốc của anh được giữ nguyên tại `AI_SYSTEM_DESIGN.md`. Lần ghi nhận này chỉ bổ sung tài liệu, chưa thay đổi hành vi app.

Cập nhật 29/10/2026: `PROJECT_CONSTITUTION.md` là quy tắc ưu tiên mới. Không push khi chưa liệt kê thay đổi và nhận “đồng ý”. Các thay đổi luật, đồng hồ và autosave bên dưới vẫn là công việc riêng, chưa được triển khai trong phần ghép Pika WASM.

## Quy ước làm việc

Giữ độc lập bàn cờ, quân cờ, ngoại cảnh; xác định tầng 2D/3D/4D và chủ đề đích trước mỗi lần sửa. Không đổi tên hay chuyển nghĩa chế độ 4D hiện tại của app trong một thay đổi khác phạm vi. Định nghĩa 4D trong bản thiết kế là hướng phát triển cần đối chiếu riêng với code đang có.

## Trạng thái và các điểm cần xử lý khi triển khai

| Hạng mục | Đối chiếu |
|---|---|
| Ba cấp máy | Chốt mới: Người thường = PikaJieQi; Ham chơi = AB-JChess; Lão quái = jqe. Giữ khóa lưu easy/medium/hard. Đã kiểm tra API gọi đúng cả ba engine. |
| Engine | Bản local dùng ba engine theo cấp đã chốt sau giải 24 ván. Web đã ghép PikaJieQi WASM cho Người thường và kiểm tra trên trình duyệt desktop; hai cấp còn lại dùng AI dự phòng. Chưa đo điện thoại thật. Xem `PIKA_WEB.md`. |
| Chuyển pha Stockfish | Là đề xuất trong bản thiết kế, chưa triển khai. Bộ ba Xe–Pháo–Mã ngửa không làm mất luật cờ úp của những quân khác. Chỉ chuyển khi engine đích hỗ trợ đúng biến thể và vượt kiểm tra luật; không chuyển sang engine cờ vua/cờ tướng thường một cách mặc định. |
| Chống trường chiếu/trường tróc | Hiến pháp mới yêu cầu chiếu quá 3 lần không đổi biến bị cấm; thay yêu cầu 4 lần trong bản trước. Code hiện vẫn chặn lần thứ sáu của cùng quân. Cần triển khai riêng khái niệm đổi biến, ngưỡng đuổi quân và đồng bộ trọng tài/lịch sử/root moves/thông báo/test. Không tự coi mô tả này là toàn bộ luật thi đấu chuẩn. |
| Hòa, đồng hồ và autosave | Hiến pháp mới yêu cầu 60 nước không ăn hoặc mở nắp, hòa do lặp bắt buộc, đồng hồ giải đấu và lưu sau mỗi nước. Cần làm rõ đơn vị “nước” và điều kiện hòa/xin hòa khi triển khai riêng; không sửa trong tác vụ ghép engine. |
| Thời gian 5/10/15 giây | Định hướng ngân sách. Giữ UI phản hồi trong lúc tìm nước, hủy được và có nước hợp lệ khi hết giờ; giới hạn depth/thread/hash cần đo theo engine/thiết bị, không xem depth giữa các engine là tương đương. |
| Kỹ năng mở úp | Ưu tiên hàng Tốt, mở kiêm khóa, thử trường hợp Tốt/Sĩ, giữ nắp Xe và hạn chế mở Pháo là định hướng chiến thuật. Cần so sánh thực nghiệm; không ép thứ tự đến mức bỏ qua thoát chiếu, đòn thắng hoặc cứu quân. Câu “mở Xe 90% yếu đi” chưa được đo. |
| Đọc vị đối thủ, nghịch cảnh, quân nhỏ | Là yêu cầu phát triển; cần định nghĩa tín hiệu công khai, bài kiểm tra và giải đấu kiểm chứng trước khi công bố hoàn thành. Không tự đầu hàng là mục tiêu; vẫn phải kết thúc khi trọng tài xử thắng/thua/hòa. |
| Opening book và tự học | Chưa được xác nhận hoàn thành. Khóa tra cứu chỉ dùng thông tin công khai, luật và lịch sử liên quan; nước lưu phải được kiểm hợp lệ trước khi dùng. Thắng bot chưa đủ chứng minh một nước hay: phải phân biệt chất lượng quyết định với may rủi khi mở quân. Không hứa thời gian 0.1 giây trước khi đo. |
| Sức cờ | “10 thắng 9” và Elo 2400 là mục tiêu, không phải kết quả đo hiện tại. |

Đọc cùng `../ENGINE_TRIAL.md` để biết giới hạn tích hợp đang chạy. Bản thiết kế gốc không thay thế biên bản kiểm thử thực tế.
