import { Bell, User, Users, Home, Settings, Gamepad2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function CommunitySidebar() {
    const { currentUser, openOverlay, activeTab, setActiveTab } = useApp();

    const menuItems = [
        {
            icon: Bell,
            label: '通知',
            onClick: () => openOverlay('notifications'),
            active: false
        },
        {
            icon: Gamepad2,
            label: '游戏',
            onClick: () => setActiveTab('game'),
            active: activeTab === 'game'
        },
        {
            icon: User,
            label: '个人主页',
            onClick: () => openOverlay('profile'),
            active: false
        }
    ];

    return (
        <div className="hidden md:flex flex-col w-[250px] shrink-0 sticky top-0 h-screen p-4 border-r border-white/10">
            <div className="space-y-2 mt-4">
                {/*  Extra "Home" or "Feed" tab just in case, though usually main feed is default */}
                <div className="p-3 rounded-full hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-4 text-xl font-bold theme-text-primary">
                    <Home className="w-7 h-7" />
                    <span>主页</span>
                </div>

                {menuItems.map((item, index) => (
                    <div
                        key={index}
                        onClick={item.onClick}
                        className={`p-3 rounded-full hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-4 text-xl ${item.active ? 'font-bold theme-text-primary' : 'font-normal theme-text-secondary'}`}
                    >
                        <item.icon className="w-7 h-7" />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>


        </div>
    );
}
