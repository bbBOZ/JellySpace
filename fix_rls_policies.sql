-- =============================================
-- 修复 RLS 策略无限递归问题
-- 请在 Supabase SQL Editor 中执行
-- =============================================

-- 1. 删除 conversation_members 表的所有现有策略
DROP POLICY IF EXISTS "Users can view conversation members" ON conversation_members;
DROP POLICY IF EXISTS "Users can insert conversation members" ON conversation_members;
DROP POLICY IF EXISTS "Users can view their conversation members" ON conversation_members;
DROP POLICY IF EXISTS "Users can insert members as conversation creator" ON conversation_members;

-- 2. 删除 conversations 表的所有现有策略
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;

-- 3. 暂时禁用 RLS（测试用，之后可以重新启用更简单的策略）
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- 4. 如果需要 RLS，使用以下简单策略：
-- （取消注释以启用）

/*
-- 启用 RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- conversations 策略
CREATE POLICY "Allow all for authenticated users" ON conversations
    FOR ALL USING (auth.uid() IS NOT NULL);

-- conversation_members 策略
CREATE POLICY "Allow all for authenticated users" ON conversation_members
    FOR ALL USING (auth.uid() IS NOT NULL);

-- messages 策略
CREATE POLICY "Allow all for authenticated users" ON messages
    FOR ALL USING (auth.uid() IS NOT NULL);
*/

-- =============================================
-- 执行完成后刷新页面测试
-- =============================================
