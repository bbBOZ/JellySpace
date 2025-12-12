import { Heart, MessageCircle, Share2, MoreHorizontal, Download, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function PostCard({ post, index }) {
    const { likePost, openPostDetail, openOverlay, currentUser, setViewedPost, openModal, setViewedProfile, deletePost } = useApp();

    // Debug
    console.log('PostCard:', post.id, 'Image:', post.image_url);


    // Check if liked by current user
    const isLiked = post.likedBy?.includes(currentUser?.id);
    const likeCount = post.likedBy?.length || 0;
    const commentCount = post.commentsList?.length || 0;
    const shareCount = post.shares || 0;

    // Check if author is developer (special UI)
    const isJelly = post.author?.display_id?.toLowerCase() === 'jelly';

    const handleShare = (e) => {
        e.stopPropagation();
        setViewedPost(post);
        openModal('shareCard');
    };

    return (
        <div
            className="cursor-pointer hover:bg-white/[0.03] transition-colors p-4"
            onClick={() => openPostDetail(post)}
        >
            <div className="flex gap-3">
                {/* Avatar Column */}
                <div className="shrink-0">
                    <div
                        className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden"
                        onClick={(e) => {
                            e.stopPropagation();
                            setViewedProfile(post.author);
                            openOverlay('profile');
                        }}
                    >
                        <img
                            src={post.author?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${post.author?.display_id}`}
                            alt="Avatar"
                            className="w-full h-full object-cover bg-black"
                            loading="lazy"
                        />
                    </div>
                </div>

                {/* Content Column */}
                <div className="flex-1 min-w-0">
                    {/* Header: Name @Handle · Time */}
                    <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 overflow-hidden text-[15px]">
                            <span className="font-bold theme-text-primary truncate">
                                {post.author?.username || 'Unknown'}
                            </span>
                            {isJelly && (
                                <span className="shrink-0 px-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded uppercase border border-cyan-500/30">
                                    DEV
                                </span>
                            )}
                            <span className="theme-text-secondary truncate text-sm">@{post.author?.display_id}</span>
                            <span className="theme-text-secondary text-sm">·</span>
                            <span className="theme-text-secondary text-sm flex-shrink-0 hover:underline">
                                {post.timeAgo || '刚刚'}
                            </span>
                        </div>
                        {currentUser?.id === post.authorId && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('确定要删除这条动态吗？')) {
                                        deletePost(post.id);
                                    }
                                }}
                                className="p-2 -mr-2 text-gray-500 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Post Content */}
                    <div className="theme-text-primary whitespace-pre-wrap text-[15px] leading-6 mb-2">
                        {post.content}
                    </div>

                    {/* Media Attachment */}
                    {post.image_url && (
                        <div
                            className="rounded-2xl overflow-hidden border theme-border mb-3 max-w-full"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            <img
                                src={post.image_url}
                                alt="Post media"
                                className="w-full max-h-[500px] object-cover"
                                loading="lazy"
                            />
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between -ml-2 max-w-[425px]">
                        {/* Comments */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openPostDetail(post);
                            }}
                            className="group flex items-center gap-1 theme-text-secondary transition-colors hover:text-cyan-500"
                        >
                            <div className="p-2 rounded-full group-hover:bg-cyan-500/10">
                                <MessageCircle className="w-4.5 h-4.5" />
                            </div>
                            <span className="text-xs">{commentCount || ''}</span>
                        </button>

                        {/* Likes */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                likePost(post.id);
                            }}
                            className={`group flex items-center gap-1 transition-colors ${isLiked ? 'text-pink-600' : 'theme-text-secondary hover:text-pink-600'}`}
                        >
                            <div className="p-2 rounded-full group-hover:bg-pink-600/10">
                                <Heart className={`w-4.5 h-4.5 ${isLiked ? 'fill-current' : ''}`} />
                            </div>
                            <span className="text-xs">{likeCount || ''}</span>
                        </button>

                        {/* Share */}
                        <button
                            onClick={handleShare}
                            className="group flex items-center gap-1 theme-text-secondary transition-colors hover:text-green-500"
                        >
                            <div className="p-2 rounded-full group-hover:bg-green-500/10">
                                <Share2 className="w-4.5 h-4.5" />
                            </div>
                            <span className="text-xs">{shareCount || ''}</span>
                        </button>

                        {/* Download/Other (Placeholder for View Count or Share) */}
                        <button
                            className="group flex items-center gap-1 theme-text-secondary transition-colors hover:text-blue-500"
                        >
                            <div className="p-2 rounded-full group-hover:bg-blue-500/10">
                                <MoreHorizontal className="w-4.5 h-4.5 rotate-90" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
