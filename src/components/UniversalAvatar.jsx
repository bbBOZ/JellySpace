import { JellyShaderAvatar } from './JellyShaderAvatar';
import { GroupAvatar } from './GroupAvatar';

/**
 * 统一头像组件
 * 根据用户类型和聊天类型自动选择正确的头像显示方式
 * 
 * @param {Object} user - 用户对象 (包含 display_id, username, avatar_url)
 * @param {string} chatType - 聊天类型 ('group' | 'private')
 * @param {string} size - Tailwind 尺寸类 (默认: 'w-10 h-10')
 * @param {string} className - 额外的 CSS 类
 */
export function UniversalAvatar({
    user,
    chatType,
    size = 'w-10 h-10',
    className = ''
}) {
    // 群聊 -> 白色圆环
    if (chatType === 'group') {
        return <GroupAvatar size={size} className={className} />;
    }

    // Jelly -> 着色器效果
    const isJelly = user?.display_id?.toLowerCase() === 'jelly' ||
        user?.username?.toLowerCase() === 'jelly';

    if (isJelly) {
        return <JellyShaderAvatar size={size} className={className} />;
    }

    // 普通用户 -> notionists 头像
    const avatarUrl = user?.avatar_url ||
        `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.display_id || user?.username || 'default'}`;

    return (
        <img
            src={avatarUrl}
            alt={user?.username || 'User'}
            className={`${size} rounded-full object-cover border theme-border ${className}`}
        />
    );
}
