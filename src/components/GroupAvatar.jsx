import { Users } from 'lucide-react';

/**
 * 群聊头像组件 - 白色圆环样式
 * 使用 CSS 渲染，无需图片资源
 */
export function GroupAvatar({ size = 'w-10 h-10', className = '' }) {
    return (
        <div
            className={`${size} rounded-full bg-gradient-to-br from-white/20 to-white/5 border-2 border-white/60 flex items-center justify-center ${className}`}
            style={{
                boxShadow: '0 0 10px rgba(255, 255, 255, 0.2), inset 0 0 10px rgba(255, 255, 255, 0.1)'
            }}
        >
            <Users className="w-1/2 h-1/2 text-white/80" />
        </div>
    );
}
