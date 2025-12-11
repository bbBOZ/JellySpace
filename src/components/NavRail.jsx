import { MessageSquare, Users, Settings, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function NavRail() {
    const {
        activeTab,
        setActiveTab,
        currentUser,
        logout,
        openModal,
        openOverlay,
        setViewedProfile,
        theme
    } = useApp();

    const navItems = [
        { id: 'chat', icon: MessageSquare, label: '聊天' },
        { id: 'community', icon: Users, label: '社区' },
    ];

    return (
        <div className="w-[72px] h-full theme-bg-nav flex flex-col items-center py-6 gap-6 relative z-50 border-r theme-border transition-colors duration-300">
            {/* 头像 */}
            <div className="relative group cursor-pointer" onClick={() => {
                setViewedProfile(currentUser);
                openOverlay('profile');
            }}>
                <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-300">
                    <img
                        src={currentUser?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${currentUser?.display_id || 'Unknown'}`}
                        alt="User"
                        className="w-full h-full rounded-[14px] object-cover bg-black"
                    />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0f172a]"></div>
            </div>

            {/* 导航按钮 */}
            <div className="flex-1 flex flex-col gap-4 w-full px-3 mt-4">
                {navItems.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-300 relative group ${isActive
                                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                                : 'theme-text-secondary hover:bg-white/10 hover:theme-text-primary'
                                }`}
                        >
                            <item.icon className={`w-6 h-6 ${isActive ? 'animate-pulse-slow' : ''}`} />

                            {/* Tooltip */}
                            <div className="absolute left-full ml-4 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap backdrop-blur-sm">
                                {item.label}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* 底部按钮 */}
            <div className="flex flex-col gap-4 w-full px-3 pb-4">
                {/* 设置按钮 */}
                <button
                    onClick={() => openModal('settings')}
                    className="w-full aspect-square rounded-xl flex items-center justify-center theme-text-secondary hover:bg-white/10 hover:theme-text-primary transition-all relative group"
                >
                    <Settings className="w-6 h-6" />
                    <div className="absolute left-full ml-4 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap backdrop-blur-sm">
                        设置
                    </div>
                </button>

                {/* 退出按钮 */}
                <button
                    onClick={logout}
                    className="w-full aspect-square rounded-xl flex items-center justify-center theme-text-secondary hover:bg-red-500/20 hover:text-red-500 transition-all relative group"
                >
                    <LogOut className="w-6 h-6" />
                    <div className="absolute left-full ml-4 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap backdrop-blur-sm">
                        退出登录
                    </div>
                </button>
            </div>
        </div>
    );
}
