# Hướng Dẫn Thiết Lập Supabase cho Wedding Invitation

## Bước 1: Tạo Project trên Supabase

1. Truy cập https://supabase.com và đăng ký/đăng nhập
2. Tạo một project mới
3. Lưu lại **Project URL** và **anon/public key** từ Settings > API

## Bước 2: Tạo Database Schema

1. Vào SQL Editor trong Supabase Dashboard
2. Chạy file `supabase-schema.sql` để tạo bảng và policies

Hoặc copy nội dung từ file `supabase-schema.sql` và chạy trong SQL Editor.

## Bước 3: Cấu Hình trong HTML

Mở file `index.html` và cập nhật thông tin Supabase:

```html
<script>
    // Thay thế bằng thông tin project của bạn
    window.SUPABASE_URL = "https://your-project-id.supabase.co";
    window.SUPABASE_ANON_KEY = "your-anon-key-here";
</script>
```

## Bước 4: Cấu Trúc Database

Bảng `comments` có các cột:

-   `id` (UUID) - Primary key
-   `name` (VARCHAR) - Tên người bình luận
-   `presence` (BOOLEAN) - Xác nhận tham dự
-   `comment` (TEXT) - Nội dung bình luận
-   `gif_url` (TEXT) - URL của GIF (nếu có)
-   `parent_id` (UUID) - ID của comment cha (để tạo reply)
-   `created_at` (TIMESTAMP) - Thời gian tạo
-   `updated_at` (TIMESTAMP) - Thời gian cập nhật
-   `is_admin` (BOOLEAN) - Có phải admin không
-   `ip` (VARCHAR) - IP address
-   `user_agent` (TEXT) - User agent
-   `like_count` (INTEGER) - Số lượng likes

## Bước 5: Row Level Security (RLS)

Các policies đã được tạo trong schema:

-   ✅ Mọi người có thể đọc comments
-   ✅ Mọi người có thể thêm comments
-   ✅ Mọi người có thể cập nhật comments
-   ✅ Mọi người có thể xóa comments

**Lưu ý:** Bạn có thể tùy chỉnh các policies này trong Supabase Dashboard > Authentication > Policies để bảo mật hơn.

## Bước 6: Real-time Updates

Hệ thống đã được cấu hình để tự động cập nhật comments khi có thay đổi thông qua Supabase Realtime.

## Troubleshooting

### Lỗi "Supabase client chưa được khởi tạo"

-   Kiểm tra xem đã thêm script Supabase vào HTML chưa
-   Kiểm tra xem `SUPABASE_URL` và `SUPABASE_ANON_KEY` đã được cấu hình đúng chưa

### Lỗi khi insert/update/delete

-   Kiểm tra RLS policies trong Supabase Dashboard
-   Kiểm tra xem bảng `comments` đã được tạo chưa

### Real-time không hoạt động

-   Kiểm tra xem Realtime đã được enable trong Supabase Dashboard chưa
-   Kiểm tra xem channel `comments` có đang hoạt động không

## Tùy Chỉnh

Bạn có thể tùy chỉnh:

-   RLS policies để kiểm soát quyền truy cập
-   Thêm các cột mới vào bảng `comments`
-   Thêm validation trong database
-   Thêm triggers để tự động xử lý dữ liệu
