-- =============================================
-- 清理重复的私聊会话 (Deduplicate Private Chats)
-- 保留最新创建的一个，删除其余重复项
-- 请在 Supabase SQL Editor 中执行
--WARNING：这会删除重复会话及其消息！
-- =============================================

WITH Pairs AS (
    SELECT 
        cm.conversation_id,
        array_agg(cm.user_id ORDER BY cm.user_id) as members,
        c.created_at
    FROM conversation_members cm
    JOIN conversations c ON c.id = cm.conversation_id
    WHERE c.type = 'private'
    GROUP BY cm.conversation_id, c.created_at
),
Ranked AS (
    SELECT 
        conversation_id,
        members,
        ROW_NUMBER() OVER (PARTITION BY members ORDER BY created_at DESC) as rn
    FROM Pairs
)
-- 1. 删除重复会话 (假设级联删除会处理 messages 和 members)
-- 如果没有设置级联删除，请取消注释以下部分：

-- DELETE FROM messages WHERE conversation_id IN (SELECT conversation_id FROM Ranked WHERE rn > 1);
-- DELETE FROM conversation_members WHERE conversation_id IN (SELECT conversation_id FROM Ranked WHERE rn > 1);

DELETE FROM conversations
WHERE id IN (
    SELECT conversation_id FROM Ranked WHERE rn > 1
);

-- =============================================
-- 执行后，前端侧边栏的重复项应该在刷新后消失
-- =============================================
