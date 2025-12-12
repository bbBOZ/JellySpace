import { useState, useRef, useEffect } from 'react';
import { Search, Plus, MoreVertical, MessageSquare, Users, X, Bell, UserPlus, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UniversalAvatar } from './UniversalAvatar';


export default function Sidebar() {
    const { chats, activeChatId, enterChat, activeTab, friends, groupChats, openModal, setViewedProfile, openOverlay, unreadCounts, realtimeStatus, isSidebarCollapsed, toggleSidebar, pendingRequests, loadPendingRequests, currentUser } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [sidebarTab, setSidebarTab] = useState('chats'); // 'chats' | 'friends'
    const [showQuickActions, setShowQuickActions] = useState(false);

    // Sidebar Drag Logic
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const newX = e.clientX - dragStartRef.current.x;
            const newY = e.clientY - dragStartRef.current.y;
            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    // 加载待处理的好友请求
    useEffect(() => {
        if (currentUser) {
            loadPendingRequests();
        }
    }, [currentUser, loadPendingRequests]);

    if (activeTab !== 'chat') return null;

    const getChatInfo = (chat) => {
        return {
            name: chat.name || chat.groupName || '未知对话',
            avatar: chat.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${chat.userId || 'Unknown'}`,
            isOnline: true,
            userId: chat.userId
        };
    };

    // 按拼音首字母分组好友
    const getSortedFriends = () => {
        if (!friends || friends.length === 0) return {};

        const grouped = {};
        const sortedFriends = [...friends].sort((a, b) => {
            const nameA = (a.username || '').toUpperCase();
            const nameB = (b.username || '').toUpperCase();
            return nameA.localeCompare(nameB, 'zh-CN');
        });

        sortedFriends.forEach(friend => {
            const name = friend.username || '';
            const firstChar = name.charAt(0).toUpperCase();
            // 判断是否为英文字母
            const isLetter = /^[A-Z]$/i.test(firstChar);
            const key = isLetter ? firstChar : '#';

            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(friend);
        });

        return grouped;
    };

    const groupedFriends = getSortedFriends();

    return (
        <div
            className={`
                fixed top-1/2 left-1/2 z-50
                ${isSidebarCollapsed
                    ? 'opacity-0 scale-90 pointer-events-none'
                    : 'opacity-100 scale-100 pointer-events-auto'} 
                w-80 sm:w-[420px] h-[600px] max-h-[85vh]
                bg-[#0f172a]/90 backdrop-blur-3xl
                border border-white/10
                rounded-[32px]
                flex flex-col
                shadow-[0_0_100px_-20px_rgba(0,0,0,0.7)]
                transition-all cubic-bezier(0.16, 1, 0.3, 1)
                overflow-hidden
                -translate-x-1/2 -translate-y-1/2
                ${isDragging ? 'duration-0 cursor-grabbing' : 'duration-300'}
            `}
            style={{
                left: `calc(50% + ${position.x}px)`,
                top: `calc(50% + ${position.y}px)`
            }}
        >
            {/* 状态栏 + 标题 */}
            <div
                className="px-5 pt-5 pb-3 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
            >
                <h2 className="text-xl font-bold text-white tracking-wide pointer-events-none">消息</h2>
                <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <X size={20} />
                </button>
            </div>

            {/* 搜索栏 */}
            <div className="px-4 pb-4">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary" />
                    <input
                        type="text"
                        placeholder={sidebarTab === 'chats' ? '搜索对话...' : '搜索好友...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    />
                </div>
            </div>

            {/* 聊天列表 */}
            {sidebarTab === 'chats' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
                    {chats.map(chat => {
                        const { name, avatar, userId } = getChatInfo(chat);
                        const isActive = chat.id === activeChatId;
                        const isJelly = userId === 'jelly';
                        const unreadCount = unreadCounts[chat.id] || 0;

                        return (
                            <div
                                key={chat.id}
                                onClick={() => enterChat(chat.id)}
                                className={`w-full p-3 flex items-center gap-3 transition-all duration-200 cursor-pointer rounded-xl mx-2
                                    ${isActive
                                        ? 'bg-blue-600/20 md:bg-blue-500/10 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                                        : 'hover:bg-white/5 border border-transparent'}
                                    w-[calc(100%-16px)]
                                `}
                            >
                                <div className="relative flex-shrink-0">
                                    <UniversalAvatar
                                        user={{
                                            ...chat,
                                            id: chat.userId,
                                            avatar_url: avatar
                                        }}
                                        chatType={chat.type}
                                        size="w-10 h-10"
                                        className={`transition-colors rounded-full ${isActive ? 'ring-2 ring-blue-500/50' : ''}`}
                                    />
                                    {/* Status Dot */}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h3 className={`font-medium text-sm truncate ${isActive ? 'text-blue-100' : 'text-gray-200 group-hover:text-white'}`}>
                                            {name}
                                        </h3>
                                        <span className="text-[10px] text-gray-500 font-mono tracking-tight">{chat.time}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-xs truncate max-w-[160px] ${isActive ? 'text-blue-200/60' : 'text-gray-500'}`}>
                                            {chat.lastMessage || '暂无消息'}
                                        </p>
                                        {unreadCount > 0 && (
                                            <span className="min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-full shadow-lg shadow-blue-500/30">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 好友列表 */}
            {sidebarTab === 'friends' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* 群聊区域 */}
                    {groupChats && groupChats.length > 0 && (
                        <div className="px-2 py-3">
                            <h3 className="text-xs font-bold theme-text-secondary uppercase mb-2 px-2">
                                群聊
                            </h3>
                            <div className="space-y-1">
                                {groupChats.map(group => (
                                    <div
                                        key={group.id}
                                        onClick={() => enterChat(group.id)}
                                        className="flex items-center gap-3 p-2 theme-hover rounded-lg cursor-pointer transition-colors"
                                    >
                                        <UniversalAvatar chatType="group" size="w-10 h-10" />
                                        <div className="flex-1">
                                            <p className="font-bold text-sm theme-text-primary">{group.name}</p>
                                            <p className="text-xs theme-text-secondary">
                                                {group.memberCount} 成员
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 分隔线 */}
                    {groupChats && groupChats.length > 0 && Object.keys(groupedFriends).length > 0 && (
                        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-2"></div>
                    )}

                    {/* 好友列表 */}
                    <div className="px-2">
                        {Object.keys(groupedFriends).length === 0 ? (
                            <div className="text-center py-12 theme-text-secondary">
                                <div className="text-4xl mb-4">👥</div>
                                <p>暂无好友</p>
                                <button
                                    onClick={() => openModal('addFriend')}
                                    className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm transition-colors"
                                >
                                    添加好友
                                </button>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xs font-bold theme-text-secondary uppercase mb-2 px-2">
                                    好友
                                </h3>
                                {Object.keys(groupedFriends).sort().map(letter => (
                                    <div key={letter}>
                                        {/* 字母分组标题 */}
                                        <div className="sticky top-0 px-3 py-2 text-xs font-bold theme-text-secondary bg-[#0f172a]/90 backdrop-blur-sm">
                                            {letter}
                                        </div>
                                        {/* 该字母下的好友 */}
                                        {groupedFriends[letter].map(friend => (
                                            <div
                                                key={friend.id}
                                                onClick={() => {
                                                    setViewedProfile(friend);
                                                    openOverlay('profile');
                                                }}
                                                className="p-3 rounded-xl cursor-pointer transition-all duration-200 group hover:bg-white/5"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <UniversalAvatar
                                                        user={friend}
                                                        size="w-10 h-10"
                                                        className="bg-gray-800 border-2 border-transparent group-hover:border-cyan-500/50 transition-colors"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium truncate theme-text-secondary group-hover:theme-text-primary">
                                                            {friend.username}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 truncate">@{friend.display_id}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 底部工具栏：4个按钮 */}
            <div className="border-t theme-border p-3 flex items-center gap-2">
                {/* 聊天/好友切换 */}
                <button
                    onClick={() => setSidebarTab('chats')}
                    className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${sidebarTab === 'chats'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'theme-text-secondary hover:bg-white/5'
                        }`}
                    title="聊天"
                >
                    <MessageSquare className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setSidebarTab('friends')}
                    className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${sidebarTab === 'friends'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'theme-text-secondary hover:bg-white/5'
                        }`}
                    title="好友"
                >
                    <Users className="w-5 h-5" />
                </button>

                {/* 加号 - 快捷操作 */}
                <div className="relative">
                    <button
                        onClick={() => setShowQuickActions(!showQuickActions)}
                        className={`py-2 px-3 rounded-xl transition-all ${showQuickActions
                            ? 'bg-white/20 text-white rotate-45'
                            : 'theme-text-secondary hover:bg-white/10'
                            }`}
                        title="创建"
                    >
                        <Plus className="w-5 h-5" />
                    </button>

                    {/* 快捷操作菜单 */}
                    {showQuickActions && (
                        <div className="absolute bottom-full mb-2 right-0 theme-bg-panel rounded-xl shadow-xl border theme-border p-2 flex flex-col gap-1 min-w-[140px] animate-scale-in z-50">
                            <button
                                onClick={() => { openModal('addFriend'); setShowQuickActions(false); }}
                                className="flex items-center gap-3 px-3 py-2 theme-hover rounded-lg text-sm theme-text-primary transition-colors"
                            >
                                <UserPlus className="w-4 h-4 text-cyan-500" />
                                添加好友
                            </button>
                            <button
                                onClick={() => { openModal('createGroup'); setShowQuickActions(false); }}
                                className="flex items-center gap-3 px-3 py-2 theme-hover rounded-lg text-sm theme-text-primary transition-colors"
                            >
                                <Users className="w-4 h-4 text-purple-500" />
                                创建群聊
                            </button>
                        </div>
                    )}
                </div>

                {/* 好友请求 */}
                <button
                    onClick={() => openModal('friendRequests')}
                    className="py-2 px-3 rounded-xl theme-text-secondary hover:bg-white/10 transition-all relative"
                    title="好友请求"
                >
                    <Bell className="w-5 h-5" />
                    {pendingRequests.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                            {pendingRequests.length > 9 ? '9+' : pendingRequests.length}
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
}
