# Một nơi build phát hành

Dự án chính: `C:/Users/Tidu/StudioProjects/C-t-ng-p`. Bản OneDrive chỉ giữ làm bản lưu.

Chạy `npm run android:release` tại thư mục chính. Quy trình kiểm tra kiểu dữ liệu và test, build web mới, đồng bộ Capacitor, xuất AAB/APK bằng khóa ký hiện có. Android Studio gọi cùng bước chuẩn bị qua `preReleaseBuild`, không đóng gói web cũ.

Kết quả dễ lấy tại `release/`, kèm `latest.json` ghi phiên bản và SHA-256. Chỉ tải AAB đã kiểm tra lên Play; cài APK release trên điện thoại để xem mép trên, trang Tùy chỉnh và icon launcher trước.

Mỗi bản gửi Play phải tăng `versionCode` trong `android/app/build.gradle`; không đổi applicationId hoặc khóa ký. Khi thay icon gốc `public/pwa-512x512.png`, chạy `npm run android:icons`. Build sẽ từ chối khi icon chưa đồng bộ.

Khóa ký và `android/keystore.properties` giữ riêng trên máy, không đưa vào Git. Không tự push hoặc tải AAB lên Play.
