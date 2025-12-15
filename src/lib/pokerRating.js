import { supabase } from './supabase';

// 获取当前赛季 (YYYY-MM格式)
export const getCurrentSeason = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// 初始化用户排位数据
export const initPlayerRating = async (userId) => {
    const season = getCurrentSeason();

    const { data, error } = await supabase
        .from('poker_ratings')
        .upsert({
            user_id: userId,
            season_month: season,
            rating: 1000,
            peak_rating: 1000,
            games_played: 0,
            games_won: 0,
            games_lost: 0
        }, {
            onConflict: 'user_id,season_month'
        })
        .select()
        .single();

    return { data, error };
};

// 获取用户当前排位信息
export const getPlayerRating = async (userId) => {
    const season = getCurrentSeason();

    // 先尝试获取
    let { data, error } = await supabase
        .from('poker_ratings')
        .select('*')
        .eq('user_id', userId)
        .eq('season_month', season)
        .single();

    // 如果不存在，初始化
    if (error && error.code === 'PGRST116') {
        const initResult = await initPlayerRating(userId);
        data = initResult.data;
        error = initResult.error;
    }

    return { data, error };
};

// 计算积分变化（基于ELO系统改进）
export const calculateRatingChange = (currentRating, isVictory, opponentCount) => {
    const K = 32; // K因子
    const baseChange = Math.floor(K / opponentCount); // 对手越多，单次变化越小

    // 根据当前分段调整
    let multiplier = 1;
    if (currentRating < 1200) multiplier = 1.5;      // 低分段涨分快
    else if (currentRating > 1800) multiplier = 0.8; // 高分段涨分慢

    const change = Math.floor(baseChange * multiplier);

    return isVictory ? change : -change;
};

// 记录游戏结果并更新积分
export const recordGameResult = async (userId, playerCount, isVictory) => {
    try {
        // 获取当前排位数据
        const { data: rating, error: getRatingError } = await getPlayerRating(userId);
        if (getRatingError) throw getRatingError;

        // 计算积分变化
        const ratingChange = calculateRatingChange(rating.rating, isVictory, playerCount - 1);
        const newRating = Math.max(0, rating.rating + ratingChange); // 最低0分
        const newPeakRating = Math.max(rating.peak_rating, newRating);

        // 更新排位数据
        const { error: updateError } = await supabase
            .from('poker_ratings')
            .update({
                rating: newRating,
                peak_rating: newPeakRating,
                games_played: rating.games_played + 1,
                games_won: rating.games_won + (isVictory ? 1 : 0),
                games_lost: rating.games_lost + (isVictory ? 0 : 1)
            })
            .eq('id', rating.id);

        if (updateError) throw updateError;

        // 记录游戏历史
        const { error: historyError } = await supabase
            .from('poker_game_history')
            .insert({
                user_id: userId,
                player_count: playerCount,
                is_victory: isVictory,
                rating_change: ratingChange,
                rating_after: newRating,
                season_month: getCurrentSeason()
            });

        if (historyError) throw historyError;

        return {
            success: true,
            newRating,
            ratingChange,
            peakRating: newPeakRating
        };
    } catch (error) {
        console.error('Error recording game result:', error);
        return { success: false, error };
    }
};

// 获取排行榜（本赛季）
export const getLeaderboard = async (limit = 100) => {
    const season = getCurrentSeason();

    const { data, error } = await supabase
        .from('poker_ratings')
        .select(`
            *,
            profiles:user_id (
                username,
                display_id,
                avatar_url
            )
        `)
        .eq('season_month', season)
        .order('rating', { ascending: false })
        .limit(limit);

    return { data, error };
};

// 获取用户排名
export const getUserRank = async (userId) => {
    const season = getCurrentSeason();

    // 获取用户积分
    const { data: userRating } = await getPlayerRating(userId);
    if (!userRating) return { rank: null };

    // 计算排名（比用户分数高的人数+1）
    const { count, error } = await supabase
        .from('poker_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('season_month', season)
        .gt('rating', userRating.rating);

    if (error) return { rank: null, error };

    return { rank: count + 1 };
};

// 获取游戏历史
export const getGameHistory = async (userId, limit = 20) => {
    const { data, error } = await supabase
        .from('poker_game_history')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(limit);

    return { data, error };
};

// 归档赛季数据（每月1号执行）
export const archiveSeasonData = async () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastSeason = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    // 获取上个月的所有排位数据
    const { data: ratings, error } = await supabase
        .from('poker_ratings')
        .select('*')
        .eq('season_month', lastSeason)
        .order('rating', { ascending: false });

    if (error || !ratings) return;

    // 插入到赛季历史表
    const seasonHistory = ratings.map((rating, index) => ({
        user_id: rating.user_id,
        season_month: lastSeason,
        final_rating: rating.rating,
        final_rank: index + 1,
        games_played: rating.games_played,
        games_won: rating.games_won
    }));

    await supabase
        .from('poker_season_history')
        .insert(seasonHistory);
};

export default {
    getCurrentSeason,
    initPlayerRating,
    getPlayerRating,
    recordGameResult,
    getLeaderboard,
    getUserRank,
    getGameHistory,
    archiveSeasonData,
    calculateRatingChange
};
