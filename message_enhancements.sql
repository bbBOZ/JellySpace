-- =============================================
-- Phase 2: 消息功能增强数据库变更
-- 请在 Supabase SQL Editor 中执行
-- =============================================

-- 1. 添加消息已读状态字段
DO $$
BEGIN
    -- is_read 字段
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_read') THEN
        ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;
    
    -- read_at 时间戳
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'read_at') THEN
        ALTER TABLE messages ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. 添加消息类型字段（支持图片发送）
DO $$
BEGIN
    -- message_type 字段 (text, image, file)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message_type') THEN
        ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text';
    END IF;
    
    -- media_url 字段（图片/文件的URL）
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'media_url') THEN
        ALTER TABLE messages ADD COLUMN media_url TEXT;
    END IF;
END $$;

-- 3. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read ON messages(conversation_id, is_read);

-- 4. 创建标记已读的函数
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS void AS $$
BEGIN
    UPDATE messages
    SET is_read = true, read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND is_read = false;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建获取未读数量的函数
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT m.conversation_id, COUNT(*) as unread_count
    FROM messages m
    JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
    WHERE cm.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND m.is_read = false
    GROUP BY m.conversation_id;
END;
$$ LANGUAGE plpgsql;

-- 6. 通知 PostgREST 重新加载 schema
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 执行完成后请刷新页面
-- =============================================
