# Quy ước dự án Cờ Úp Việt Nam

- Ưu tiên bản quy tắc mới tại `docs/PROJECT_CONSTITUTION.md`: sửa đúng phạm vi, không quét/dọn lại dự án khi không cần. Không tự viết lại thuật toán đánh cờ; chỉ sửa bộ ghép/port engine và lớp lọc trong phạm vi anh giao.
- Không in code dài. Khi giao việc cho Antigravity, dùng chỉ thị `/edit`, `/test`, `/checkpoint`, `/undo` ngắn, rõ phạm vi; không coi chúng là API/lệnh đã được cài sẵn.
- GitHub Push Guard: trước mọi lần push mới, liệt kê thay đổi và chờ anh xác nhận “đồng ý”. Có thể tạo checkpoint/commit local để sao lưu; giữ ít nhất ba phiên gần nhất trong lịch sử Git. Không suy diễn quyền push cũ thành quyền cho thay đổi mới.
- Yêu cầu luật mới (chiếu quá 3 lần, hòa sau 60 nước không ăn/không mở, đồng hồ giải đấu và autosave) là đặc tả cần triển khai/kiểm tra riêng khi anh giao; không tự sửa luật trong việc ghép WASM.

- Gọi người dùng là anh, xưng em; trả lời tiếng Việt, ngắn gọn. Không hiển thị code dài trừ khi anh yêu cầu. Khi anh cần giao việc cho Antigravity, ưu tiên câu lệnh `/` ngắn, dùng được ngay; không bịa tên lệnh có sẵn của công cụ.
- Đọc `docs/AI_SYSTEM_DESIGN.md` và `docs/AI_DESIGN_STATUS.md` trước khi sửa AI hoặc kiến trúc giao diện. Bản thiết kế gốc là định hướng được anh cung cấp, không phải mô tả mọi tính năng đã hoàn thành.
- Trước khi sửa UI, xác định phạm vi: bàn cờ, quân cờ hay ngoại cảnh; tầng 2D/3D/4D; bộ bàn/quân hoặc không gian cụ thể. Giữ các phạm vi độc lập, không sửa lan sang đối tượng khác. Chỉ đồng bộ tất cả khi anh yêu cầu rõ. Giữ nguyên chibi/ngoại cảnh khi chỉ sửa bàn hoặc quân.
- Quân úp có nắp bảo vệ riêng: mở nắp trước, sau đó mới lật thân quân để lộ mặt. Mặc định chữ quân là chữ Hán. Sông bàn Thánh địa dùng “Tidu Production”.
- Ba cấp máy theo chốt mới nhất: Người thường = PikaJieQi (easy), Ham chơi = AB-JChess (medium), Lão quái = jqe (hard). Giữ khóa lưu easy/medium/hard và avatar tương ứng; không gộp ba cấp về một engine. Định hướng chạy AI trên thiết bị, điều chỉnh ngân sách theo sức máy; không tự đưa tính cờ lên dịch vụ trả phí/server.
- Giữ kín danh tính quân đang úp và quân bị bắt lúc úp theo quy tắc app; không cho engine hoặc sổ tay tra cứu đọc dữ liệu bí mật. App là trọng tài; kiểm tra mọi nước trả về.
- Không tự thay engine đã thử bằng engine cờ tướng thường. Mọi engine thay thế phải kiểm chứng luật cờ úp, gồm Sĩ/Tượng vượt sông, và so sánh trên cùng điều kiện.
- Không tuyên bố Elo 2400, tỷ lệ thắng 90%, tự học hoặc hỗ trợ mobile native/WASM khi chưa triển khai và đo kiểm.
- Yêu cầu hiện tại của anh được ưu tiên hơn tài liệu này. Không tự triển khai toàn bộ bản thiết kế chỉ vì đọc tài liệu; thực hiện theo phạm vi công việc anh giao.
