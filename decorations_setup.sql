-- =============================================
-- 装扮社区表 - 简化版本
-- 请在 Supabase SQL Editor 中执行
-- =============================================

-- 1. 删除旧表（如果存在）
DROP TABLE IF EXISTS user_decorations CASCADE;
DROP TABLE IF EXISTS decorations CASCADE;

-- 2. 创建装扮表
CREATE TABLE decorations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('shader', 'css')),
    target TEXT NOT NULL CHECK (target IN ('background', 'bubble', 'profile')),
    code TEXT NOT NULL,
    preview_url TEXT,
    likes_count INTEGER DEFAULT 0,
    uses_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建用户应用记录表
CREATE TABLE user_decorations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    decoration_id UUID NOT NULL REFERENCES decorations(id) ON DELETE CASCADE,
    target TEXT NOT NULL CHECK (target IN ('background', 'bubble')),
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, decoration_id, target)
);

-- 4. 禁用 RLS（开发阶段）
ALTER TABLE decorations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_decorations DISABLE ROW LEVEL SECURITY;

-- 5. 创建索引
CREATE INDEX idx_decorations_type ON decorations(type);
CREATE INDEX idx_decorations_target ON decorations(target);
CREATE INDEX idx_decorations_public ON decorations(is_public);

-- 6. 授予权限（重要！）
GRANT ALL ON decorations TO anon;
GRANT ALL ON decorations TO authenticated;
GRANT ALL ON user_decorations TO anon;
GRANT ALL ON user_decorations TO authenticated;

-- 7. 通知 PostgREST 重新加载 schema
NOTIFY pgrst, 'reload schema';

-- 8. 插入预设装扮
INSERT INTO decorations (name, description, type, target, code) VALUES
('渐变彩虹', '彩虹渐变背景', 'shader', 'background', 
'void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime * 0.3;
    vec3 col = 0.5 + 0.5 * cos(t + uv.xyx * 3.0 + vec3(0, 2, 4));
    fragColor = vec4(col, 1.0);
}'),
('流光溢彩', '动态流光效果', 'shader', 'bubble',
'void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float wave = sin(uv.x * 10.0 + iTime * 2.0) * 0.5 + 0.5;
    vec3 col = mix(vec3(0.1, 0.3, 0.6), vec3(0.4, 0.1, 0.5), wave);
    fragColor = vec4(col, 0.8);
}'),
('极光背景', 'CSS 极光渐变', 'css', 'background',
'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);'),
('玻璃气泡', 'CSS 毛玻璃效果', 'css', 'bubble',
'background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);');

-- =============================================
-- 执行完成后，请刷新网页测试
-- 如果仍有问题，请在 Supabase Dashboard 中：
-- 1. 进入 Settings -> API
-- 2. 点击 "Reload schema cache" 按钮
-- =============================================
