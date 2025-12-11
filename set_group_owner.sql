-- =============================================
-- 为没有群主的群聊设置群主
-- Set owner for groups without created_by
-- =============================================

-- 第一步: 查找 Jwu 的用户 ID
-- Step 1: Find Jwu's user ID
DO $$
DECLARE
    jwu_user_id UUID;
BEGIN
    -- 获取 display_id 为 'jwu' 的用户 ID (不区分大小写)
    SELECT id INTO jwu_user_id 
    FROM profiles 
    WHERE LOWER(display_id) = 'jwu' 
    LIMIT 1;

    IF jwu_user_id IS NULL THEN
        RAISE NOTICE 'User with display_id "jwu" not found!';
    ELSE
        RAISE NOTICE 'Jwu user ID: %', jwu_user_id;
        
        -- 第二步: 更新所有 type='group' 且 created_by 为 NULL 的记录
        -- Step 2: Update all group conversations where created_by is NULL
        UPDATE conversations
        SET created_by = jwu_user_id
        WHERE type = 'group' AND created_by IS NULL;
        
        RAISE NOTICE 'Updated % group(s)', (SELECT COUNT(*) FROM conversations WHERE type = 'group' AND created_by = jwu_user_id);
    END IF;
END $$;

-- =============================================
-- 执行后刷新前端即可看到群主信息
-- Refresh frontend after execution to see owner info
-- =============================================
