-- Supabase Database Schema cho Wedding Invitation Comments
-- Chạy script này trong SQL Editor của Supabase Dashboard

-- Tạo bảng comments
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    presence BOOLEAN DEFAULT false,
    comment TEXT,
    gif_url TEXT,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT false,
    ip VARCHAR(45),
    user_agent TEXT,
    like_count INTEGER DEFAULT 0
);

-- Tạo index để tối ưu query
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: Cho phép mọi người đọc comments
CREATE POLICY "Anyone can read comments"
    ON comments
    FOR SELECT
    USING (true);

-- Policy: Cho phép mọi người thêm comments
CREATE POLICY "Anyone can insert comments"
    ON comments
    FOR INSERT
    WITH CHECK (true);

-- Policy: Cho phép mọi người cập nhật comments của chính họ (dựa vào name hoặc có thể thêm user_id)
-- Lưu ý: Bạn có thể tùy chỉnh policy này theo nhu cầu
CREATE POLICY "Anyone can update comments"
    ON comments
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Policy: Cho phép mọi người xóa comments (hoặc chỉ admin)
-- Lưu ý: Bạn có thể thêm điều kiện is_admin = true nếu muốn chỉ admin mới xóa được
CREATE POLICY "Anyone can delete comments"
    ON comments
    FOR DELETE
    USING (true);

-- Tạo function để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tạo trigger để tự động cập nhật updated_at
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tạo bảng likes (nếu bạn muốn track likes riêng)
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
    user_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_ip)
);

-- Index cho likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);

-- Enable RLS cho likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Policy cho likes
CREATE POLICY "Anyone can read likes"
    ON comment_likes
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert likes"
    ON comment_likes
    FOR INSERT
    WITH CHECK (true);

-- Function để đếm likes (có thể gọi từ application)
CREATE OR REPLACE FUNCTION get_comment_like_count(comment_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM comment_likes WHERE comment_id = comment_uuid);
END;
$$ LANGUAGE plpgsql;

