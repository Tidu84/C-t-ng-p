# Hai cấp máy và thuê bao Android

Build duy nhất: `C:\Users\Tidu\StudioProjects\C-t-ng-p`.

Người thường chạy PikaJieQi WASM miễn phí. Ham chơi chạy AB-JChess native; Lão quái chạy jqe native. Hai engine tính trên thiết bị, dùng FEN công khai và danh sách nước được trọng tài cho phép. Không gửi danh tính quân úp đến engine. App kiểm tra nước trả về; lỗi native được báo để thử lại, không đổi sang AI dự phòng.

## Bản thử và bản phát hành

- Debug có mã ứng dụng `com.cotuongup.game.enginecheck`, tên **Cờ Úp · Thử AI**: mở hai cấp để kiểm tra engine, cài riêng với bản Play.
- Release `com.cotuongup.game`: chỉ mở hai cấp khi có chứng nhận thuê bao ký RSA hợp lệ. Chưa có cấu hình sẽ hiển thị thuê bao chưa sẵn sàng, không mở thanh toán.
- Chưa có phép đo sức cờ trên Poco M4 Pro; không công bố Elo hoặc tỷ lệ thắng.

## Cấu hình trước khi bán

1. Play Console: tạo subscription **ai_premium**, hai base plan tự gia hạn **monthly** (P1M), **yearly** (P1Y). Cả hai mở cùng Ham chơi và Lão quái. Anh đặt giá/vùng bán trên Play; app lấy giá thực từ Play, không ghi giá giả trong giao diện.
2. Triển khai server có `POST /api/play/verify` tại HTTPS. Server dùng Google Application Default Credentials có quyền đọc và quản lý đơn hàng của ứng dụng trong Android Publisher API. Server chỉ xác minh thanh toán, không tính cờ.
3. Tạo khóa RSA ít nhất 2048 bit ngoài ứng dụng. Khóa riêng đặt trên server, đường dẫn qua `PLAY_ENTITLEMENT_PRIVATE_KEY_FILE`. Các biến còn lại: `PLAY_PACKAGE_NAME=com.cotuongup.game`, `PLAY_PREMIUM_PRODUCT_ID=ai_premium`, `GOOGLE_APPLICATION_CREDENTIALS` nếu dùng tệp service account. Không commit khóa hoặc tệp tài khoản.
4. Copy `android/premium.properties.example` thành `android/premium.properties` (được Git bỏ qua). Điền `verifyUrl=https://<server>/api/play/verify`, `publicKey=<Base64 DER SPKI của khóa công khai>`, `productId=ai_premium`. Chỉ khóa công khai vào APK.
5. Build `npm run android:release`; đưa bản đã ký lên internal testing. Thử bằng license tester: gói tháng/năm, hủy thanh toán, giao dịch chờ, khôi phục sau cài lại, hết hạn, gia hạn, grace period, account hold, hoàn tiền/thu hồi. Chỉ phát hành sau khi những trường hợp này đạt trên Google Play.

Server kiểm tra subscription qua Google, xác nhận (acknowledge) giao dịch và cấp JWT tối đa 24 giờ, không vượt ngày hết hạn thuê bao. App kiểm tra chữ ký, ứng dụng, sản phẩm, thời hạn. Giao dịch pending/paused/on-hold/expired không mở cấp máy. Hủy gia hạn vẫn được chơi đến hết hạn. Khi mở lại app có mạng, trạng thái được kiểm tra lại; giấy phép đã xác minh dùng offline tối đa 24 giờ. Thu hồi khi offline có thể trễ đến thời điểm giấy phép hết hạn. Chưa có xử lý RTDN chủ động; không coi đây là thu hồi tức thời.

## Kiểm thử và build

`npm run lint`, `npm test`, `npm run test:billing`.

Android: `gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.cotuongup.game.NativeEngineTest` kiểm tra JNI của hai engine, nước gốc bị giới hạn, Sĩ/Tượng qua sông, hủy thế hệ cũ, mặc định không có quyền premium.

Các tệp mạng học máy lớn được giữ tại `android/app/src/main/assets/native-engines/`, tên và SHA-256 ở `android/native-engines.json`. Build kiểm tra nội dung trước đóng gói; không tự tải một mạng khác khi thiếu hoặc sai hash. Nguồn native và phần ghép nằm ở `android/app/src/main/cpp`; giấy phép đi kèm trong từng engine. Bản nguồn tương ứng được đóng kèm ứng dụng tại `assets/native-engines/source.zip`.
