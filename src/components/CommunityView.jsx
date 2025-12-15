import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import PostCard from './PostCard';
import ComposePost from './ComposePost';
import CommunitySidebar from './CommunitySidebar';

export default function CommunityView() {
    const { posts, friends, currentUser } = useApp();

    return (
        <div className="w-full h-full flex justify-center bg-black">
            <div className="w-full max-w-7xl flex h-full">
                <CommunitySidebar />

                <div className="flex-1 h-full overflow-y-auto custom-scrollbar border-x border-white/10 bg-black max-w-2xl w-full">
                    <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 flex">
                        <div className="flex-1 py-4 font-bold text-center theme-text-primary relative after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-16 after:h-1 after:bg-cyan-500 after:rounded-full">
                            推荐
                        </div>
                    </div>

                    <ComposePost />

                    <div className="divide-y divide-white/10">
                        {posts.map((post, index) => (
                            <PostCard key={post.id} post={post} index={index} />
                        ))}
                    </div>

                    {posts.length === 0 && (
                        <div className="text-center py-20 theme-text-secondary">
                            <p className="text-xl font-bold">这里的世界还在沉睡</p>
                            <p className="text-sm mt-2">成为第一个唤醒它的人吧</p>
                        </div>
                    )}
                </div>

                <div className="hidden lg:block w-[300px] p-4 pl-8">
                </div>
            </div>
        </div>
    );
}
