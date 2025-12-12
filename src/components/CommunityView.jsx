import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import PostCard from './PostCard';
import ComposePost from './ComposePost';
import CommunitySidebar from './CommunitySidebar';

export default function CommunityView() {
    const { posts, friends, currentUser } = useApp();
    const [activeTab, setActiveTab] = useState('recommended'); // 'recommended' or 'friends'

    // Filter posts based on active tab
    const displayPosts = activeTab === 'friends'
        ? posts.filter(post => friends?.some(f => f.id === post.author_id) || post.author_id === currentUser?.id)
        : posts;

    return (
        <div className="w-full h-full flex justify-center bg-black">
            {/* Wrapper for max width constraint */}
            <div className="w-full max-w-7xl flex h-full">

                {/* Left Sidebar (Desktop Only) */}
                <CommunitySidebar />

                {/* Main Feed */}
                <div className="flex-1 h-full overflow-y-auto custom-scrollbar border-x border-white/10 bg-black max-w-2xl w-full">
                    {/* Sticky Tabs */}
                    <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 flex">
                        <button
                            onClick={() => setActiveTab('recommended')}
                            className={`flex-1 py-4 hover:bg-white/5 transition-colors font-bold text-center relative ${activeTab === 'recommended' ? "theme-text-primary after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-16 after:h-1 after:bg-cyan-500 after:rounded-full" : "theme-text-secondary"}`}
                        >
                            推荐
                        </button>
                        <button
                            onClick={() => setActiveTab('friends')}
                            className={`flex-1 py-4 hover:bg-white/5 transition-colors font-bold text-center relative ${activeTab === 'friends' ? "theme-text-primary after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-16 after:h-1 after:bg-cyan-500 after:rounded-full" : "theme-text-secondary"}`}
                        >
                            好友
                        </button>
                    </div>

                    {/* Compose Post */}
                    <ComposePost />

                    {/* Post List */}
                    <div className="divide-y divide-white/10">  {/* Darker dividers */}
                        {displayPosts.map((post, index) => (
                            <PostCard key={post.id} post={post} index={index} />
                        ))}
                    </div>

                    {displayPosts.length === 0 && (
                        <div className="text-center py-20 theme-text-secondary">
                            <p className="text-xl font-bold">
                                {activeTab === 'friends' ? '暂无好友动态' : '这里的世界还在沉睡'}
                            </p>
                            <p className="text-sm mt-2">
                                {activeTab === 'friends' ? '快去添加好友吧' : '成为第一个唤醒它的人吧'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Sidebar (Optional, maybe Trending later) - Hidden for now or space filler */}
                <div className="hidden lg:block w-[300px] p-4 pl-8">
                    {/* Placeholder for trending */}
                </div>
            </div>
        </div>
    );
}
