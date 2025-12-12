import { useState, useRef, useEffect } from 'react';
import { Image, X, Smile, Calendar, MapPin, BarChart2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { compressImage } from '../utils/imageCompressor';
import EmojiPicker from './EmojiPicker';

export default function ComposePost() {
    const { currentUser, createPost, showToast } = useApp();
    const [content, setContent] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef(null);
    const emojiButtonRef = useRef(null);

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiButtonRef.current && !emojiButtonRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                // Check if file is too large (> 10MB) - Block completely
                if (file.size > 10 * 1024 * 1024) {
                    showToast.error(
                        '图片过大',
                        '图片大小不能超过 10MB。',
                        'https://help.jelly.chat/image-size'
                    );
                    return;
                }

                let fileToUpload = file;

                // Compress if > 2MB
                if (file.size > 2 * 1024 * 1024) {
                    showToast.info('正在压缩', '图片大于 2MB，正在自动压缩中...');
                    try {
                        fileToUpload = await compressImage(file);
                    } catch (compressErr) {
                        console.error("Compression failed:", compressErr);
                        showToast.warning('压缩失败', '图片压缩失败，将尝试原图上传。');
                        // Fallback to original if compression fails, but it might fail upload if > bucket limit
                    }
                }

                setSelectedImage(fileToUpload);
                const url = URL.createObjectURL(fileToUpload);
                setPreviewUrl(url);
            } catch (error) {
                console.error("Image select error:", error);
                showToast.error('图片处理失败', error.message);
            }
        }
    };

    const handleEmojiSelect = (emoji) => {
        setContent(prev => prev + emoji);
    };

    const handlePost = async () => {
        if (!content.trim() && !selectedImage) return;

        setIsSubmitting(true);
        const result = await createPost('', content, selectedImage);
        setIsSubmitting(false);

        if (result?.error) {
            showToast.error('发送失败', result.error.message);
        } else {
            showToast.success('发布成功', '您的动态已发布！');
            setContent('');
            setSelectedImage(null);
            setPreviewUrl('');
        }
    };

    return (
        <div className="border-b border-white/10 p-4 flex gap-4 relative">
            {/* Avatar */}
            <div className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden">
                    <img
                        src={currentUser?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${currentUser?.id}`}
                        alt="avatar"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            {/* Input Area */}
            <div className="flex-1">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="今天分享些什么呢？"
                    className="w-full bg-transparent text-xl theme-text-primary placeholder-gray-500 outline-none resize-none min-h-[50px]"
                    rows={1}
                    onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                />

                {/* Data Preview */}
                {previewUrl && (
                    <div className="relative mt-3 mb-3 rounded-2xl overflow-hidden mb-2 max-w-full inline-block">
                        <img src={previewUrl} alt="preview" className="max-h-[300px] object-cover rounded-2xl border border-white/10" />
                        <button
                            onClick={() => {
                                setSelectedImage(null);
                                setPreviewUrl('');
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Toolbar */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex gap-1 text-cyan-500 relative">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageSelect}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 hover:bg-cyan-500/10 rounded-full transition-colors"
                            title="Media"
                        >
                            <Image className="w-5 h-5" />
                        </button>


                        {/* Emoji Button Wrapper */}
                        <div ref={emojiButtonRef} className="relative">
                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="p-2 hover:bg-cyan-500/10 rounded-full transition-colors"
                                title="Emoji"
                            >
                                <Smile className="w-5 h-5" />
                            </button>
                            {showEmojiPicker && (
                                <EmojiPicker onSelect={handleEmojiSelect} />
                            )}
                        </div>


                    </div>

                    <button
                        onClick={handlePost}
                        disabled={(!content.trim() && !selectedImage) || isSubmitting}
                        className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
                    >
                        {isSubmitting ? '发送中...' : '发帖'}
                    </button>
                </div>
            </div>
        </div>
    );
}
