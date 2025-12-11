-- 强制开启 Realtime 并配置发布
-- 1. 确保 supabase_realtime publication 存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- 2. 将 messages 表添加到 publication (如果尚未添加)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 3. 确保 messages 表启用了 REPLICA IDENTITY (通常默认是 DEFAULT，但在某些从未收到消息的情况下，强制 FULL 可能有帮助， though DEFAULT is usually enough for INSERTs)
ALTER TABLE messages REPLICA IDENTITY FULL;

-- 4. 再次确认 RLS (虽然之前做过，这里做双重保险，确保 authenticated 用户至少能读)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can select messages" ON messages;
CREATE POLICY "Authenticated users can select messages" ON messages
    FOR SELECT
    TO authenticated
    USING (true); -- 暂时允许读取所有，排查关联问题。生产环境应改为 checking conversation_members

-- 5. 确保 conversation_members 也是可读的 (为了鉴权)
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can select members" ON conversation_members;
CREATE POLICY "Authenticated users can select members" ON conversation_members
    FOR SELECT
    TO authenticated
    USING (true);
