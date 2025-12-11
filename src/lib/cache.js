/**
 * 浏览器缓存管理模块
 * 使用 localStorage 实现数据持久化，支持离线模式
 */

// 缓存键常量
const CACHE_KEYS = {
    USER_PROFILE: 'jelly_user_profile',
    USER_SETTINGS: 'jelly_user_settings',
    FRIENDS_LIST: 'jelly_friends',
    CONVERSATIONS: 'jelly_conversations',
    MESSAGES: 'jelly_messages',
    POSTS: 'jelly_posts'
};

// 缓存过期时间 (5分钟)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * 生成带用户ID的缓存键
 */
const getCacheKey = (key, userId) => {
    return userId ? `${key}_${userId}` : key;
};

/**
 * 缓存管理对象
 */
export const cache = {
    /**
     * 保存数据到缓存
     * @param {string} key - 缓存键
     * @param {any} data - 要缓存的数据
     * @param {string} userId - 用户ID（可选）
     */
    set(key, data, userId = null) {
        try {
            const cacheKey = getCacheKey(key, userId);
            const cacheData = {
                data,
                timestamp: Date.now(),
                version: 1
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            return true;
        } catch (error) {
            console.warn('Cache set error:', error);
            return false;
        }
    },

    /**
     * 从缓存读取数据
     * @param {string} key - 缓存键
     * @param {string} userId - 用户ID（可选）
     * @returns {any} 缓存的数据，如果不存在或已过期则返回 null
     */
    get(key, userId = null) {
        try {
            const cacheKey = getCacheKey(key, userId);
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            
            // 检查是否过期（但在离线模式下仍然返回数据）
            const isExpired = Date.now() - timestamp > CACHE_TTL;
            
            return {
                data,
                isExpired,
                timestamp
            };
        } catch (error) {
            console.warn('Cache get error:', error);
            return null;
        }
    },

    /**
     * 获取缓存数据（仅数据，忽略元信息）
     */
    getData(key, userId = null) {
        const cached = this.get(key, userId);
        return cached ? cached.data : null;
    },

    /**
     * 删除指定缓存
     * @param {string} key - 缓存键
     * @param {string} userId - 用户ID（可选）
     */
    remove(key, userId = null) {
        try {
            const cacheKey = getCacheKey(key, userId);
            localStorage.removeItem(cacheKey);
            return true;
        } catch (error) {
            console.warn('Cache remove error:', error);
            return false;
        }
    },

    /**
     * 清除用户的所有缓存
     * @param {string} userId - 用户ID
     */
    clearUser(userId) {
        if (!userId) return;
        
        try {
            Object.values(CACHE_KEYS).forEach(key => {
                this.remove(key, userId);
            });
            // 也清除不带用户ID的通用缓存
            this.remove(CACHE_KEYS.POSTS);
            return true;
        } catch (error) {
            console.warn('Cache clear error:', error);
            return false;
        }
    },

    /**
     * 检查缓存是否有效（存在且未过期）
     */
    isValid(key, userId = null) {
        const cached = this.get(key, userId);
        return cached && !cached.isExpired;
    },

    /**
     * 检查是否有任何缓存数据（用于离线模式判断）
     */
    hasCache(key, userId = null) {
        const cached = this.get(key, userId);
        return cached !== null;
    },

    /**
     * 更新缓存中的部分数据（用于消息追加等场景）
     */
    update(key, userId, updater) {
        const cached = this.getData(key, userId);
        if (cached) {
            const updated = updater(cached);
            this.set(key, updated, userId);
            return updated;
        }
        return null;
    }
};

// 导出缓存键常量供外部使用
export { CACHE_KEYS, CACHE_TTL };

// 检测网络状态
export const isOnline = () => {
    return navigator.onLine;
};

// 监听网络状态变化
export const onNetworkChange = (callback) => {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
    
    // 返回取消监听的函数
    return () => {
        window.removeEventListener('online', () => callback(true));
        window.removeEventListener('offline', () => callback(false));
    };
};

export default cache;
