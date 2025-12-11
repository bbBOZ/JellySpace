-- =============================================
-- Jelly2 数据库修改 SQL
-- 请在 Supabase SQL Editor 中执行以下脚本
-- =============================================

-- 1. 确保 friendships 表支持好友请求状态
-- 如果表已存在，添加 status 列；如果不存在，创建表
DO $$
BEGIN
    -- 检查表是否存在
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'friendships') THEN
        -- 表存在，确保 status 列存在并有正确的默认值
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'friendships' AND column_name = 'status') THEN
            ALTER TABLE friendships ADD COLUMN status TEXT DEFAULT 'pending';
        END IF;
    ELSE
        -- 创建 friendships 表
        CREATE TABLE friendships (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, friend_id)
        );
    END IF;
END $$;

-- 2. 创建好友请求相关的 RLS 策略
-- 首先启用 RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can insert friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update their received requests" ON friendships;
DROP POLICY IF EXISTS "Users can delete their own friendships" ON friendships;

-- 创建新策略
-- 用户可以查看自己发送或接收的好友关系
CREATE POLICY "Users can view their own friendships" ON friendships
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 用户可以发送好友请求
CREATE POLICY "Users can insert friendships" ON friendships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户可以更新收到的好友请求（接受/拒绝）
CREATE POLICY "Users can update their received requests" ON friendships
    FOR UPDATE USING (auth.uid() = friend_id);

-- 用户可以删除自己的好友关系
CREATE POLICY "Users can delete their own friendships" ON friendships
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 3. 确保 profiles 表有必要的字段
DO $$
BEGIN
    -- 添加可能缺失的字段
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'signature') THEN
        ALTER TABLE profiles ADD COLUMN signature TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
        ALTER TABLE profiles ADD COLUMN gender TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'birthday') THEN
        ALTER TABLE profiles ADD COLUMN birthday DATE;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'zodiac') THEN
        ALTER TABLE profiles ADD COLUMN zodiac TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'mbti') THEN
        ALTER TABLE profiles ADD COLUMN mbti TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_shader') THEN
        ALTER TABLE profiles ADD COLUMN profile_shader TEXT;
    END IF;
    -- 装扮社区相关字段
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'chat_bg_shader') THEN
        ALTER TABLE profiles ADD COLUMN chat_bg_shader TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'chat_bg_css') THEN
        ALTER TABLE profiles ADD COLUMN chat_bg_css TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bubble_shader') THEN
        ALTER TABLE profiles ADD COLUMN bubble_shader TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bubble_css') THEN
        ALTER TABLE profiles ADD COLUMN bubble_css TEXT;
    END IF;
    -- Jelly AI 配置字段 (仅开发者使用)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'jelly_personality') THEN
        ALTER TABLE profiles ADD COLUMN jelly_personality TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'jelly_language_style') THEN
        ALTER TABLE profiles ADD COLUMN jelly_language_style TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'jelly_thinking_style') THEN
        ALTER TABLE profiles ADD COLUMN jelly_thinking_style TEXT;
    END IF;
END $$;

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- =============================================
-- 执行完成后，请确认以下几点：
-- 1. friendships 表存在且有 status 列
-- 2. profiles 表有所有需要的字段
-- 3. RLS 策略已正确创建
-- =============================================
