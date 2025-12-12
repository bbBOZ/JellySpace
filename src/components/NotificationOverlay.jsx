import { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { notifications } from '../lib/supabase';

export default function NotificationOverlay() {
    const { overlays, closeOverlay, currentUser, showToast, addComment } = useApp(); // Destructure addComment here
    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Reply state
    const [replyingTo, setReplyingTo] = useState(null); // notification object
    const [replyContent, setReplyContent] = useState('');

    useEffect(() => {
        if (overlays.notifications && currentUser) {
            loadNotifications();
        }
    }, [overlays.notifications, currentUser]);

    const loadNotifications = async () => {
        setIsLoading(true);
        const { data, error } = await notifications.list(currentUser.id);
        if (error) {
            console.error('Failed to load notifications:', error);
            showToast.error('加载通知失败');
        } else {
            console.log('Loaded notifications:', data);
            setList(data || []);
        }
        setIsLoading(false);
    };

    const submitReply = async () => {
        if (!replyingTo || !replyContent.trim()) return;

        const contentWithMention = `回复 @${replyingTo.user?.username}: ${replyContent}`;

        const { error } = await addComment(replyingTo.postId, currentUser.id, contentWithMention);

        if (error) {
            showToast.error('回复失败');
        } else {
            showToast.success('回复成功');
            setReplyingTo(null);
            setReplyContent('');
        }
    };

    if (!overlays.notifications) return null;

    return (
        <div className={`full-page-overlay ${overlays.notifications ? 'active' : ''} bg-black/95 text-white overflow-y-auto`}>
            <div className="max-w-2xl mx-auto min-h-screen relative p-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8 sticky top-0 bg-black/95 z-10 py-4 border-b border-white/10">
                    <button
                        onClick={() => closeOverlay('notifications')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold">通知</h2>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-10 opacity-50">加载中...</div>
                    ) : list.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">暂无新通知</div>
                    ) : (
                        list.map(item => (
                            <div key={item.id} className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex gap-4">
                                    <img
                                        src={item.user?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${item.user?.id}`}
                                        className="w-10 h-10 rounded-full bg-gray-700 object-cover"
                                        alt={item.user?.username}
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-bold text-cyan-400">{item.user?.username}</span>
                                                <span className="text-gray-400 ml-2 text-sm">
                                                    {item.type === 'like' ? '赞了你的帖子' : '评论了你的帖子'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-600">
                                                {new Date(item.timestamp).toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="mt-2 text-sm text-gray-300 bg-white/5 p-2 rounded border-l-2 border-cyan-500/50">
                                            {item.type === 'like' ? (
                                                <p className="italic text-gray-500">《{item.postTitle}》</p>
                                            ) : (
                                                <>
                                                    <p>{item.content}</p>
                                                    <p className="mt-1 text-xs text-gray-500">源自帖子: 《{item.postTitle}》</p>
                                                </>
                                            )}
                                        </div>

                                        {item.type === 'comment' && (
                                            <div className="mt-3">
                                                {replyingTo?.id === item.id ? (
                                                    <div className="flex gap-2 animate-fade-in">
                                                        <input
                                                            type="text"
                                                            value={replyContent}
                                                            onChange={e => setReplyContent(e.target.value)}
                                                            placeholder={`回复 ${item.user?.username}...`}
                                                            className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-1 text-sm focus:border-cyan-500 outline-none"
                                                            autoFocus
                                                            onKeyDown={(e) => e.key === 'Enter' && submitReply()}
                                                        />
                                                        <button
                                                            onClick={submitReply}
                                                            className="px-3 py-1 bg-cyan-600 rounded-lg text-xs font-bold hover:bg-cyan-500"
                                                        >
                                                            发送
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setReplyingTo(null);
                                                                setReplyContent('');
                                                            }}
                                                            className="px-3 py-1 bg-white/10 rounded-lg text-xs hover:bg-white/20"
                                                        >
                                                            取消
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setReplyingTo(item)}
                                                        className="text-xs text-cyan-500 hover:text-cyan-400 font-bold flex items-center gap-1"
                                                    >
                                                        <MessageCircle className="w-3 h-3" /> 回复
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
