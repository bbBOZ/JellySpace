import { useRef, useState } from 'react';
import { X, Download, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useApp } from '../context/AppContext';

export default function ShareCardModal() {
    const { modals, closeModal, viewedPost } = useApp();
    const cardRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);

    if (!modals.shareCard || !viewedPost) return null;

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);

        try {
            // Wait for images to load
            const images = cardRef.current.getElementsByTagName('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                scale: 2, // Retina quality
                backgroundColor: '#0f172a', // Match theme background
                logging: false
            });

            const link = document.createElement('a');
            link.download = `jelly-share-${viewedPost.id}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            closeModal('shareCard');
        } catch (err) {
            console.error('Failed to generate image:', err);
            alert('生成图片失败，请重试');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div
            className={`modal-backdrop ${modals.shareCard ? 'show' : ''}`}
            onClick={() => closeModal('shareCard')}
            style={{ zIndex: 80 }}
        >
            <div
                className="modal-content flex flex-col items-center gap-6"
                onClick={e => e.stopPropagation()}
            >
                {/* The Card to be Captured */}
                <div
                    ref={cardRef}
                    className="w-[375px] bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
                >
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -ml-10 -mb-10"></div>

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-cyan-400 to-purple-500">
                            <img
                                src={viewedPost.author?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${viewedPost.author?.display_id}`}
                                className="w-full h-full rounded-full bg-black object-cover"
                                crossOrigin="anonymous"
                                alt="avatar"
                            />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">{viewedPost.author?.username || 'Jelly User'}</h3>
                            <p className="text-cyan-400/80 text-xs font-mono">@{viewedPost.author?.display_id}</p>
                        </div>
                        <div className="ml-auto">
                            <i className="text-4xl">❝</i>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 mb-6 min-h-[100px]">
                        <p className="text-white text-lg leading-relaxed font-medium">
                            {viewedPost.content}
                        </p>
                        {viewedPost.image_url && (
                            <div className="mt-4 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                                <img
                                    src={viewedPost.image_url}
                                    className="w-full object-cover"
                                    crossOrigin="anonymous"
                                    alt="post content"
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                <span className="text-lg">🫧</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Jelly Space</p>
                                <p className="text-[10px] text-gray-400">{new Date().toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-500 font-mono">Scan to Join</p>
                            {/* Placeholder QR Code effect */}
                            <div className="flex gap-0.5 mt-1 justify-end opacity-50">
                                <div className="w-1 h-4 bg-white"></div>
                                <div className="w-1 h-3 bg-white"></div>
                                <div className="w-1 h-5 bg-white"></div>
                                <div className="w-1 h-2 bg-white"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        onClick={() => closeModal('shareCard')}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-full shadow-lg shadow-cyan-500/30 flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:transform-none"
                    >
                        {isGenerating ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                        <span>保存分享卡片</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
