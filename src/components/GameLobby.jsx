import { useState } from 'react';
import { Gamepad2, Lock, Sparkles } from 'lucide-react';

const IOSGlassCard = ({ title, description, icon: Icon, available, onClick, index }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`relative group transition-all duration-500 ${isHovered ? 'scale-105 z-10' : 'scale-100'
                }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={available ? onClick : null}
        >
            {/* iOS 风格玻璃卡片 */}
            <div
                className={`relative w-72 h-80 rounded-[2.5rem] overflow-hidden transition-all duration-300 ${available
                        ? 'cursor-pointer'
                        : 'cursor-not-allowed opacity-60'
                    }`}
                style={{
                    background: available
                        ? 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(100,100,100,0.2) 0%, rgba(80,80,80,0.15) 100%)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    boxShadow: isHovered && available
                        ? '0 24px 48px rgba(0,0,0,0.4), 0 0 80px rgba(59,130,246,0.3)'
                        : '0 8px 32px rgba(0,0,0,0.3)'
                }}
            >
                {/* 顶部光泽效果 */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/30 to-transparent opacity-40" />

                {/* 内容 */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-8">
                    {/* iOS 风格图标容器 */}
                    <div
                        className={`relative mb-8 transition-transform duration-300 ${isHovered && available ? 'scale-110' : 'scale-100'
                            }`}
                    >
                        <div
                            className="w-32 h-32 rounded-[2rem] flex items-center justify-center relative overflow-hidden"
                            style={{
                                background: available
                                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                            }}
                        >
                            {/* 高光效果 */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent" />

                            {/* 图标 */}
                            <Icon className="w-16 h-16 text-white relative z-10" strokeWidth={2} />

                            {/* 锁定图标 */}
                            {!available && (
                                <div className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-white" />
                                </div>
                            )}
                        </div>

                        {/* 图标下方阴影 */}
                        <div
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-3 rounded-full blur-xl"
                            style={{
                                background: available
                                    ? 'rgba(102, 126, 234, 0.5)'
                                    : 'rgba(107, 114, 128, 0.3)'
                            }}
                        />
                    </div>

                    {/* 标题 */}
                    <h3 className="text-3xl font-bold text-white mb-3 text-center tracking-tight">
                        {title}
                    </h3>

                    {/* 描述 */}
                    <p className={`text-base text-center leading-relaxed ${available ? 'text-white/90' : 'text-gray-400'
                        }`}>
                        {description}
                    </p>

                    {/* 悬停提示 */}
                    {available && isHovered && (
                        <div className="mt-6 flex items-center gap-2 px-5 py-2 bg-white/20 backdrop-blur-sm rounded-full animate-pulse">
                            <Sparkles className="w-4 h-4 text-white" />
                            <span className="text-white text-sm font-semibold">轻触进入</span>
                        </div>
                    )}
                </div>

                {/* 底部光泽 */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
        </div>
    );
};

export default function GameLobby({ onEnterPoker }) {
    const games = [
        {
            title: '扑克游戏',
            description: '经典扑克对战\n支持3-6人排位赛',
            icon: Gamepad2,
            available: true,
            action: onEnterPoker
        },
        {
            title: '敬请期待',
            description: '更多精彩游戏\n即将上线',
            icon: Lock,
            available: false,
            action: null
        }
    ];

    return (
        <div className="w-full h-full relative overflow-hidden">
            {/* 黑白格子背景 */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        repeating-conic-gradient(
                            #1a1a1a 0% 25%,
                            #2d2d2d 0% 50%
                        )`,
                    backgroundSize: '80px 80px',
                    backgroundPosition: '0 0, 40px 40px'
                }}
            />

            {/* 渐变遮罩层 */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/40" />

            {/* 顶部标题 */}
            <div className="absolute top-0 left-0 right-0 z-20 pt-16 pb-8">
                <div className="text-center">
                    <h1
                        className="text-7xl font-bold mb-4 tracking-wider"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}
                    >
                        游戏中心
                    </h1>
                    <p className="text-2xl text-white/80 drop-shadow-lg">选择你的游戏</p>
                </div>
            </div>

            {/* 游戏卡片 */}
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-16 px-4">
                {games.map((game, index) => (
                    <IOSGlassCard
                        key={index}
                        title={game.title}
                        description={game.description}
                        icon={game.icon}
                        available={game.available}
                        onClick={game.action}
                        index={index}
                    />
                ))}
            </div>

            {/* 底部装饰 */}
            <div className="absolute bottom-8 left-0 right-0 z-20 text-center">
                <div
                    className="inline-block px-6 py-3 rounded-full backdrop-blur-xl"
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.18)'
                    }}
                >
                    <p className="text-white/60 text-sm font-medium">Powered by React · iOS Design</p>
                </div>
            </div>
        </div>
    );
}
