-- 扑克游戏排位系统数据库表

-- 1. 玩家积分表
CREATE TABLE IF NOT EXISTS poker_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER DEFAULT 1000 NOT NULL,  -- 当前积分
    peak_rating INTEGER DEFAULT 1000,      -- 历史最高积分
    games_played INTEGER DEFAULT 0,        -- 总场次
    games_won INTEGER DEFAULT 0,           -- 胜场
    games_lost INTEGER DEFAULT 0,          -- 负场
    win_rate DECIMAL(5,2) DEFAULT 0.00,    -- 胜率
    season_month VARCHAR(7) NOT NULL,      -- 赛季月份 (YYYY-MM)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, season_month)
);

-- 2. 游戏历史记录表
CREATE TABLE IF NOT EXISTS poker_game_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    player_count INTEGER NOT NULL,         -- 游戏人数
    is_victory BOOLEAN NOT NULL,           -- 是否胜利
    rating_change INTEGER NOT NULL,        -- 积分变化
    rating_after INTEGER NOT NULL,         -- 变化后的积分
    season_month VARCHAR(7) NOT NULL,      -- 赛季月份
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 赛季历史表（用于记录每月的排名快照）
CREATE TABLE IF NOT EXISTS poker_season_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    season_month VARCHAR(7) NOT NULL,
    final_rating INTEGER NOT NULL,
    final_rank INTEGER NOT NULL,
    games_played INTEGER NOT NULL,
    games_won INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, season_month)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_poker_ratings_user_season ON poker_ratings(user_id, season_month);
CREATE INDEX IF NOT EXISTS idx_poker_ratings_season_rating ON poker_ratings(season_month, rating DESC);
CREATE INDEX IF NOT EXISTS idx_poker_game_history_user ON poker_game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_poker_season_history_season ON poker_season_history(season_month, final_rank);

-- RLS (Row Level Security) 策略
ALTER TABLE poker_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_season_history ENABLE ROW LEVEL SECURITY;

-- 允许用户读取所有排位数据（排行榜需要）
CREATE POLICY "Anyone can view poker ratings"
    ON poker_ratings FOR SELECT
    USING (true);

-- 只有用户自己可以修改自己的积分（通过应用逻辑）
CREATE POLICY "Users can update own poker ratings"
    ON poker_ratings FOR ALL
    USING (auth.uid() = user_id);

-- 用户可以查看所有游戏历史
CREATE POLICY "Anyone can view game history"
    ON poker_game_history FOR SELECT
    USING (true);

-- 用户只能插入自己的游戏记录
CREATE POLICY "Users can insert own game history"
    ON poker_game_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 查看赛季历史
CREATE POLICY "Anyone can view season history"
    ON poker_season_history FOR SELECT
    USING (true);

-- 自动更新 updated_at 时间戳的函数
CREATE OR REPLACE FUNCTION update_poker_rating_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_poker_rating_timestamp ON poker_ratings;
CREATE TRIGGER update_poker_rating_timestamp
    BEFORE UPDATE ON poker_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_poker_rating_timestamp();

-- 自动更新胜率的函数
CREATE OR REPLACE FUNCTION update_win_rate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.games_played > 0 THEN
        NEW.win_rate = (NEW.games_won::DECIMAL / NEW.games_played::DECIMAL) * 100;
    ELSE
        NEW.win_rate = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS calculate_win_rate ON poker_ratings;
CREATE TRIGGER calculate_win_rate
    BEFORE INSERT OR UPDATE ON poker_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_win_rate();

-- 初始化当前月份排位数据的函数
CREATE OR REPLACE FUNCTION init_poker_rating(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    current_season VARCHAR(7);
BEGIN
    current_season := TO_CHAR(NOW(), 'YYYY-MM');
    
    INSERT INTO poker_ratings (user_id, season_month)
    VALUES (p_user_id, current_season)
    ON CONFLICT (user_id, season_month) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
