-- 启用 messages 表的 Realtime 功能
-- 在 Supabase SQL Editor 中执行此脚本

-- 方法 1: 添加 messages 表到 supabase_realtime publication
ALTER publication supabase_realtime ADD TABLE messages;

-- 如果上面的命令报错 "relation already exists"，可以尝试先移除再添加：
-- ALTER publication supabase_realtime DROP TABLE IF EXISTS messages;
-- ALTER publication supabase_realtime ADD TABLE messages;

-- 验证是否成功
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
