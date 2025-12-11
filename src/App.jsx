import { AppProvider, useApp } from './context/AppContext';
import AuthPage from './components/AuthPage';
import NavRail from './components/NavRail';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import CommunityView from './components/CommunityView';
import Background from './components/Background';
import Loader from './components/Loader';
import ProfileOverlay from './components/ProfileOverlay';
import AboutOverlay from './components/AboutOverlay';
import {
    AddFriendModal,
    FriendRequestsModal,
    CreateGroupModal,
    CreatePostModal,
    SettingsModal,
    DecoStoreModal,
    PostDetailModal,
    GroupProfileModal
} from './components/Modals';

function AppContent() {
    const { isAuthenticated, activeTab, isLoading, isSidebarCollapsed } = useApp();

    return (
        <div className="relative w-full h-screen overflow-hidden flex">
            {/* 背景 */}
            <Background />

            {/* 加载动画 */}
            {isLoading && <Loader />}

            {!isAuthenticated && <AuthPage />}
            {isAuthenticated && (
                <div className="w-full h-full flex opacity-100 transition-opacity duration-500 z-40">
                    {/* 左侧导航栏 */}
                    <NavRail />

                    {/* 侧边栏 */}
                    <Sidebar />

                    {/* 主内容区域 */}
                    <div className="flex-1 h-full relative theme-bg-chat flex flex-col overflow-hidden">
                        {/* 聊天视图 */}
                        {(activeTab === 'chat' || activeTab === 'chats') && (
                            <ChatView key={isSidebarCollapsed ? 'collapsed' : 'expanded'} />
                        )}

                        {/* 社区视图 (暂时隐藏以免重叠) */}
                        {/* {activeTab === 'community' && <CommunityView />} */}
                    </div>
                </div>
            )}

            {/* 叠加层 */}
            <ProfileOverlay />
            <AboutOverlay />

            {/* 模态框 */}
            <AddFriendModal />
            <FriendRequestsModal />
            <CreateGroupModal />
            <CreatePostModal />
            <SettingsModal />
            <DecoStoreModal />
            <PostDetailModal />
            <GroupProfileModal />
        </div>
    );
}

export default function App() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}
