-- =============================================
-- 好友请求系统数据库变更
-- 请在 Supabase SQL Editor 中执行
-- =============================================

-- 1. 添加好友请求相关字段到 friendships 表
DO $$
BEGIN
    -- 请求消息字段
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'friendships' AND column_name = 'request_message') THEN
        ALTER TABLE friendships ADD COLUMN request_message TEXT;
    END IF;
    
    -- 响应时间字段
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'friendships' AND column_name = 'responded_at') THEN
        ALTER TABLE friendships ADD COLUMN responded_at TIMESTAMPTZ;
    END IF;
    
    -- 确保 status 字段存在
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'friendships' AND column_name = 'status') THEN
        ALTER TABLE friendships ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 2. 添加状态检查约束（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'friendships_status_check'
    ) THEN
        ALTER TABLE friendships 
        ADD CONSTRAINT friendships_status_check 
        CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'));
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON friendships(friend_id, status);

-- 4. 更新现有的 accepted 记录（如果有）
-- 这确保双向好友关系
-- 不需要修改现有数据

-- 5. 禁用 RLS（开发阶段）
ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;

-- 6. 授予权限
GRANT ALL ON friendships TO anon;
GRANT ALL ON friendships TO authenticated;

-- 7. 通知 PostgREST 重新加载 schema
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 执行完成后刷新页面测试好友请求功能
-- =============================================
