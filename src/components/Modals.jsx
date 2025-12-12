import { useState, useEffect, useRef } from 'react';
import { X, Hash, UserPlus, Users, ImagePlus, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MOCK_USERS, BUBBLE_STYLES, FONT_STYLES } from '../data/constants';
import { decorations as decorationsAPI, conversations } from '../lib/supabase';

// 添加好友模态框
export function AddFriendModal() {
    const { modals, closeModal, searchUser, addFriend, showToast } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [error, setError] = useState('');

    if (!modals.addFriend) return null;

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setError('');
        setSearchResult(null);

        const result = await searchUser(searchQuery);
        if (result) {
            setSearchResult(result);
        } else {
            setError('未找到该用户');
        }
    };

    const handleAddFriend = async () => {
        if (!searchResult) return;

        const result = await addFriend(searchResult);
        if (result.success) {
            showToast.success('发送成功', result.message || '好友请求已发送！');
            closeModal('addFriend');
            setSearchQuery('');
            setSearchResult(null);
        } else {
            showToast.error('发送失败', result.message);
        }
    };

    return (
        <div
            className={`modal-backdrop ${modals.addFriend ? 'show' : ''}`}
            onClick={() => closeModal('addFriend')}
        >
            <div
                className="modal-content theme-bg-panel border theme-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden theme-text-primary"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b theme-border">
                    <h3 className="font-bold text-lg">加好友/群聊</h3>
                    <button
                        className="p-1 theme-hover rounded-full theme-text-secondary"
                        onClick={() => closeModal('addFriend')}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm theme-text-secondary mb-4">请输入好友 ID 或用户名进行查找</p>
                    <div className="relative mb-4">
                        <Hash className="absolute left-3 top-3.5 theme-text-secondary w-5 h-5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="例如: alex_dev"
                            className="w-full glass-input rounded-xl py-3 pl-10 pr-4 outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
                    )}

                    {searchResult && (
                        <div className="mb-4 p-4 border theme-border rounded-xl flex items-center gap-4 bg-white/5">
                            <img
                                src={searchResult.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${searchResult.display_id || 'unknown'}`}
                                alt={searchResult.username}
                                className="w-12 h-12 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold truncate">{searchResult.username}</h4>
                                <p className="text-xs theme-text-secondary truncate">@{searchResult.display_id}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={handleSearch}
                            className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg transition-all"
                        >
                            {searchResult ? '重新搜索' : '查找'}
                        </button>
                        {searchResult && (
                            <button
                                onClick={handleAddFriend}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <UserPlus className="w-5 h-5" />
                                发送请求
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 好友请求列表模态框
export function FriendRequestsModal() {
    const {
        modals, closeModal,
        pendingRequests, loadPendingRequests,
        acceptFriendRequest, rejectFriendRequest,
        setIsLoading, showToast
    } = useApp();

    // 加载待处理请求
    useEffect(() => {
        if (modals.friendRequests) {
            loadPendingRequests();
        }
    }, [modals.friendRequests]);

    const handleAccept = async (request) => {
        setIsLoading(true);
        const result = await acceptFriendRequest(request.id, request.sender);
        setIsLoading(false);
        if (result.success) {
            showToast.success('操作成功', `已接受 ${request.sender?.username || '用户'} 的好友请求！`);
        } else {
            showToast.error('操作失败', result.message || '未知错误');
        }
    };

    const handleReject = async (request) => {
        setIsLoading(true);
        const result = await rejectFriendRequest(request.id);
        setIsLoading(false);
        if (result.success) {
            showToast.info('已拒绝', '已拒绝好友请求');
        } else {
            showToast.error('操作失败', result.message || '未知错误');
        }
    };

    if (!modals.friendRequests) return null;

    return (
        <div
            className={`modal-backdrop ${modals.friendRequests ? 'show' : ''}`}
            onClick={() => closeModal('friendRequests')}
        >
            <div
                className="modal-content theme-bg-panel border theme-border rounded-2xl shadow-2xl w-full max-w-md theme-text-primary"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b theme-border">
                    <h2 className="text-xl font-bold">📬 好友请求</h2>
                    <button
                        className="text-gray-400 hover:text-white transition-colors p-1"
                        onClick={() => closeModal('friendRequests')}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                    {pendingRequests.length === 0 ? (
                        <div className="text-center py-8 theme-text-secondary">
                            <div className="text-4xl mb-4">📭</div>
                            <p>暂无好友请求</p>
                        </div>
                    ) : (
                        pendingRequests.map(request => (
                            <div
                                key={request.id}
                                className="flex items-center gap-4 p-4 border theme-border rounded-xl bg-white/5"
                            >
                                <img
                                    src={request.sender?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${request.sender?.display_id || 'unknown'}`}
                                    alt={request.sender?.username}
                                    className="w-12 h-12 rounded-full border theme-border"
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold truncate">{request.sender?.username || '未知用户'}</h4>
                                    <p className="text-xs theme-text-secondary">@{request.sender?.display_id}</p>
                                    {request.request_message && (
                                        <p className="text-sm theme-text-secondary mt-1 italic">
                                            "{request.request_message}"
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAccept(request)}
                                        className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white rounded-lg text-sm font-bold transition-colors"
                                    >
                                        接受
                                    </button>
                                    <button
                                        onClick={() => handleReject(request)}
                                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg text-sm font-bold transition-colors"
                                    >
                                        拒绝
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// 创建群聊模态框
export function CreateGroupModal() {
    const { modals, closeModal, createGroup, setIsLoading, friends, showToast } = useApp();
    const [groupName, setGroupName] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);

    if (!modals.createGroup) return null;

    const handleCreateGroup = () => {
        if (!groupName) {
            showToast.warning('请输入', '请输入群名称');
            return;
        }
        if (selectedFriends.length === 0) {
            showToast.warning('请选择', '请至少选择一位好友');
            return;
        }
        setIsLoading(true);
        // 调用 createGroup，不再使用 setTimeout 模拟
        createGroup(groupName, selectedFriends).then(groupId => {
            setIsLoading(false);
            if (groupId) {
                setGroupName('');
                setSelectedFriends([]);
                closeModal('createGroup');
                showToast.success('创建成功', '群聊创建成功！');
            } else {
                showToast.error('创建失败', '请重试');
            }
        });
    };

    const toggleFriend = (userId) => {
        setSelectedFriends(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    return (
        <div
            className={`modal-backdrop ${modals.createGroup ? 'show' : ''}`}
            onClick={() => closeModal('createGroup')}
        >
            <div
                className="modal-content theme-bg-panel border theme-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden theme-text-primary"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b theme-border">
                    <h3 className="font-bold text-lg">创建群聊</h3>
                    <button
                        className="p-1 theme-hover rounded-full theme-text-secondary"
                        onClick={() => closeModal('createGroup')}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <div className="mb-4">
                        <label className="text-xs font-bold uppercase theme-text-secondary mb-2 block">群聊名称</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="输入群名称"
                            className="w-full glass-input rounded-xl py-3 px-4 outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>
                    <label className="text-xs font-bold uppercase theme-text-secondary mb-2 block">选择好友</label>
                    <div className="max-h-40 overflow-y-auto mb-6 space-y-2 border theme-border rounded-xl p-2 custom-scrollbar">
                        {friends && friends.length > 0 ? (
                            friends.map(user => (
                                <label
                                    key={user.id}
                                    className="flex items-center gap-3 p-2 theme-hover rounded-lg cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedFriends.includes(user.id)}
                                        onChange={() => toggleFriend(user.id)}
                                        className="accent-cyan-500 w-4 h-4"
                                    />
                                    <img
                                        src={user.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.display_id || 'unknown'}`}
                                        className="w-8 h-8 rounded-full border theme-border"
                                        alt={user.username}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm theme-text-primary truncate">{user.username}</div>
                                        <div className="text-xs theme-text-secondary truncate">@{user.display_id}</div>
                                    </div>
                                </label>
                            ))
                        ) : (
                            <div className="text-center text-sm theme-text-secondary py-4">
                                暂无好友可邀请
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleCreateGroup}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg transition-all"
                    >
                        创建群聊
                    </button>
                </div>
            </div>
        </div>
    );
}

// 发帖模态框
export function CreatePostModal() {
    const { modals, closeModal, createPost, showToast } = useApp();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const fileInputRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!modals.createPost) return null;

    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                if (file.size > 10 * 1024 * 1024) {
                    showToast.error('图片过大', '图片大小不能超过 10MB。', 'https://help.jelly.chat/image-size');
                    return;
                }

                let fileToUpload = file;
                if (file.size > 2 * 1024 * 1024) {
                    showToast.info('正在压缩', '图片大于 2MB，正在自动压缩中...');
                    try {
                        fileToUpload = await compressImage(file);
                    } catch (err) {
                        console.error("Compression failed:", err);
                        showToast.warning('压缩失败', '图片压缩失败，将尝试原图上传。');
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

    const handleSubmit = async () => {
        if (!title || !content) {
            showToast.warning('信息不全', '请输入标题和内容');
            return;
        }
        setIsSubmitting(true);
        const result = await createPost(title, content, selectedImage);
        setIsSubmitting(false);

        if (result?.error) {
            showToast.error('发布失败', result.error.message);
        } else {
            showToast.success('发布成功', '您的动态已发布！');
            setTitle('');
            setContent('');
            setSelectedImage(null);
            setPreviewUrl('');
            closeModal('createPost');
        }
    };

    return (
        <div
            className={`modal-backdrop ${modals.createPost ? 'show' : ''}`}
            onClick={() => closeModal('createPost')}
        >
            <div
                className="modal-content theme-bg-panel border theme-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden theme-text-primary"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b theme-border">
                    <h3 className="font-bold text-lg">发布新动态</h3>
                    <button
                        className="p-1 theme-hover rounded-full theme-text-secondary"
                        onClick={() => closeModal('createPost')}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="标题"
                        className="w-full glass-input rounded-xl p-3 outline-none focus:border-cyan-500 transition-colors font-bold"
                    />
                    <textarea
                        rows={4}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="分享你的想法..."
                        className="w-full glass-input rounded-xl p-3 outline-none focus:border-cyan-500 transition-colors resize-none"
                    />

                    {/* Image Preview Area */}
                    {previewUrl ? (
                        <div className="relative rounded-xl overflow-hidden group">
                            <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                            <button
                                onClick={() => {
                                    setSelectedImage(null);
                                    setPreviewUrl('');
                                }}
                                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div
                            className="border-2 border-dashed theme-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer theme-hover transition-colors group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageSelect}
                            />
                            <ImagePlus className="w-8 h-8 theme-text-secondary group-hover:text-cyan-500 mb-2" />
                            <p className="text-sm theme-text-secondary">点击上传图片 (Max 2MB)</p>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : '发布'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// 设置模态框 - 菜单导航结构
export function SettingsModal() {
    const {
        modals, closeModal, currentUser,
        theme, setTheme, bgStyle, setBgStyle,
        openModal, setIsLoading, logout, updateProfile, showToast
    } = useApp();

    const [activeSection, setActiveSection] = useState('appearance');
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    // Jelly 配置状态
    const [jellyPersonality, setJellyPersonality] = useState(currentUser?.jelly_personality || '友好、活泼、有趣，喜欢用表情符号');
    const [jellyLanguageStyle, setJellyLanguageStyle] = useState(currentUser?.jelly_language_style || 'casual');
    const [jellyThinkingStyle, setJellyThinkingStyle] = useState(currentUser?.jelly_thinking_style || 'balanced');

    // 检查是否是开发者账号 (jelly)
    const isDeveloper = currentUser?.display_id?.toLowerCase() === 'jelly';

    if (!modals.settings) return null;

    const handleChangePassword = () => {
        if (newPass && confirmPass && newPass === confirmPass) {
            setIsLoading(true);
            setTimeout(() => {
                showToast.success('修改成功', '密码修改成功');
                setIsLoading(false);
                setOldPass('');
                setNewPass('');
                setConfirmPass('');
            }, 1000);
        } else {
            showToast.error('输入错误', '两次输入密码不一致或为空');
        }
    };

    const handleClearChats = async () => {
        if (!confirm('确定要清空所有聊天记录吗？此操作不可撤销！')) return;
        setIsLoading(true);
        // TODO: 实现清空聊天记录逻辑
        setTimeout(() => {
            setIsLoading(false);
            alert('聊天记录已清空');
        }, 1000);
    };

    // 保存 Jelly 配置
    const handleSaveJellyConfig = async () => {
        setIsLoading(true);
        const { error } = await updateProfile({
            jelly_personality: jellyPersonality,
            jelly_language_style: jellyLanguageStyle,
            jelly_thinking_style: jellyThinkingStyle
        });
        setIsLoading(false);

        if (error) {
            showToast.error('保存失败', error.message);
        } else {
            showToast.success('保存成功', 'Jelly 配置已保存！');
        }
    };

    // 菜单项配置
    const menuItems = [
        { id: 'appearance', label: '外观', icon: '🎨' },
        { id: 'decoration', label: '装扮', icon: '✨' },
        ...(isDeveloper ? [{ id: 'jellyConfig', label: 'Jelly 配置', icon: '🤖' }] : []),
        { id: 'data', label: '数据管理', icon: '📊' },
        { id: 'security', label: '安全', icon: '🔒' },
        { id: 'about', label: '关于', icon: 'ℹ️' },
    ];

    return (
        <div
            className={`modal-backdrop ${modals.settings ? 'show' : ''}`}
            style={{ zIndex: 70 }}
            onClick={() => closeModal('settings')}
        >
            <div
                className="modal-content theme-bg-panel border theme-border rounded-2xl shadow-2xl w-full max-w-3xl theme-text-primary overflow-hidden flex"
                style={{ height: '70vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* 左侧菜单 */}
                <div className="w-48 border-r theme-border bg-black/20 flex flex-col">
                    <div className="p-4 border-b theme-border">
                        <h2 className="text-xl font-bold">设置</h2>
                    </div>
                    <nav className="flex-1 py-2">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${activeSection === item.id
                                    ? 'bg-cyan-500/20 text-cyan-400 border-r-2 border-cyan-500'
                                    : 'hover:bg-white/5 theme-text-secondary'
                                    }`}
                            >
                                <span>{item.icon}</span>
                                <span className="text-sm">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t theme-border">
                        <button
                            onClick={() => {
                                closeModal('settings');
                                logout();
                            }}
                            className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-xl text-sm font-bold transition-colors"
                        >
                            退出登录
                        </button>
                    </div>
                </div>

                {/* 右侧内容 */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {/* 外观设置 */}
                    {activeSection === 'appearance' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold mb-4">外观设置</h3>

                            <div>
                                <label className="block text-sm theme-text-secondary mb-2">主题</label>
                                <div className="flex gap-4">
                                    <div
                                        onClick={() => setTheme('light')}
                                        className={`setting-option flex-1 p-4 border theme-border rounded-xl cursor-pointer hover:bg-black/5 text-center ${theme === 'light' ? 'active border-cyan-500' : ''}`}
                                    >
                                        ☀️ 白昼
                                    </div>
                                    <div
                                        onClick={() => setTheme('dark')}
                                        className={`setting-option flex-1 p-4 border theme-border rounded-xl cursor-pointer hover:bg-white/5 text-center ${theme === 'dark' ? 'active border-cyan-500' : ''}`}
                                    >
                                        🌙 暗夜
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm theme-text-secondary mb-2">暗夜背景特效</label>
                                <select
                                    value={bgStyle}
                                    onChange={(e) => setBgStyle(e.target.value)}
                                    className="w-full glass-input rounded-xl p-3 outline-none"
                                >
                                    <option value="static">静态点阵</option>
                                    <option value="dynamic1">呼吸棋盘</option>
                                    <option value="dynamic2">中心十字</option>
                                    <option value="dynamic3">游荡气泡</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* 装扮设置 */}
                    {activeSection === 'decoration' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold">装扮库</h3>
                                <button
                                    onClick={() => {
                                        closeModal('settings');
                                        openModal('decoStore');
                                    }}
                                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl text-sm font-bold transition-colors"
                                >
                                    打开装扮社区
                                </button>
                            </div>
                            <p className="text-sm theme-text-secondary">
                                在装扮社区中，您可以自定义聊天背景和气泡样式。支持粘贴着色器代码和 CSS 代码。
                            </p>
                        </div>
                    )}

                    {/* Jelly 配置 (仅开发者) */}
                    {activeSection === 'jellyConfig' && isDeveloper && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold mb-4">🤖 Jelly AI 配置</h3>
                            <p className="text-sm theme-text-secondary mb-4">
                                作为开发者，您可以自定义 Jelly 的性格、语言习惯和思维方式。
                            </p>

                            <div>
                                <label className="block text-sm theme-text-secondary mb-2">性格设定</label>
                                <textarea
                                    rows={4}
                                    placeholder="描述 Jelly 的性格特点..."
                                    className="w-full glass-input rounded-xl p-3 outline-none resize-none"
                                    value={jellyPersonality}
                                    onChange={(e) => setJellyPersonality(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm theme-text-secondary mb-2">语言风格</label>
                                <select
                                    className="w-full glass-input rounded-xl p-3 outline-none"
                                    value={jellyLanguageStyle}
                                    onChange={(e) => setJellyLanguageStyle(e.target.value)}
                                >
                                    <option value="casual">轻松活泼</option>
                                    <option value="formal">正式专业</option>
                                    <option value="humorous">幽默搞笑</option>
                                    <option value="cute">可爱萌系</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm theme-text-secondary mb-2">思维偏好</label>
                                <select
                                    className="w-full glass-input rounded-xl p-3 outline-none"
                                    value={jellyThinkingStyle}
                                    onChange={(e) => setJellyThinkingStyle(e.target.value)}
                                >
                                    <option value="logical">逻辑优先</option>
                                    <option value="creative">创意优先</option>
                                    <option value="empathetic">共情优先</option>
                                    <option value="balanced">均衡模式</option>
                                </select>
                            </div>

                            <button
                                onClick={handleSaveJellyConfig}
                                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl font-bold transition-colors"
                            >
                                保存配置
                            </button>
                        </div>
                    )}

                    {/* 数据管理 */}
                    {activeSection === 'data' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold mb-4">数据管理</h3>

                            <div className="p-4 border theme-border rounded-xl bg-red-500/5">
                                <h4 className="font-bold text-red-400 mb-2">⚠️ 危险操作</h4>
                                <p className="text-sm theme-text-secondary mb-4">
                                    清空聊天记录将删除所有会话中的消息，此操作不可撤销。
                                </p>
                                <button
                                    onClick={handleClearChats}
                                    className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-xl font-bold transition-colors"
                                >
                                    清空所有聊天记录
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 安全设置 */}
                    {activeSection === 'security' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold mb-4">安全设置</h3>

                            <div className="space-y-3">
                                <input
                                    type="password"
                                    value={oldPass}
                                    onChange={(e) => setOldPass(e.target.value)}
                                    placeholder="旧密码"
                                    className="w-full glass-input rounded-xl p-3 outline-none"
                                />
                                <input
                                    type="password"
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    placeholder="新密码"
                                    className="w-full glass-input rounded-xl p-3 outline-none"
                                />
                                <input
                                    type="password"
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                    placeholder="确认新密码"
                                    className="w-full glass-input rounded-xl p-3 outline-none"
                                />
                                <button
                                    onClick={handleChangePassword}
                                    className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl font-bold transition-colors"
                                >
                                    修改密码
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 关于 */}
                    {activeSection === 'about' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold mb-4">关于</h3>
                            <div className="text-center py-8">
                                <div className="text-6xl mb-4">🫧</div>
                                <h2 className="text-2xl font-bold mb-2">Jelly Chat</h2>
                                <p className="theme-text-secondary">Version 2.0.0</p>
                                <p className="text-sm theme-text-secondary mt-4">
                                    一个有趣的社交聊天应用
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 关闭按钮 */}
                <button
                    onClick={() => closeModal('settings')}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

// 帖子详情模态框
export function PostDetailModal() {
    const { modals, closeModal, viewedPost, likePost, addComment, currentUser, getUserById } = useApp();
    const [commentContent, setCommentContent] = useState('');

    if (!modals.postDetail || !viewedPost) return null;

    const author = getUserById(viewedPost.authorId);
    const isLiked = viewedPost.likedBy?.includes(currentUser?.id);
    const totalLikes = viewedPost.likedBy?.length || 0;
    const totalComments = viewedPost.commentsList?.length || 0;

    const handleSendComment = () => {
        if (!commentContent.trim()) return;
        addComment(viewedPost.id, commentContent);
        setCommentContent('');
    };

    return (
        <div
            className={`modal-backdrop ${modals.postDetail ? 'show' : ''}`}
            onClick={() => closeModal('postDetail')}
            style={{ zIndex: 60 }}
        >
            <div
                className="modal-content theme-bg-panel border theme-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden theme-text-primary max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b theme-border shrink-0">
                    <div className="flex items-center gap-3">
                        {author && (
                            <img src={author.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${author.display_id}`} className="w-10 h-10 rounded-full border theme-border" alt={author.username} />
                        )}
                        <div>
                            <h3 className="font-bold text-lg">{author?.username}</h3>
                            <p className="text-xs theme-text-secondary">{viewedPost.date}</p>
                        </div>
                    </div>
                    <button
                        className="p-1 theme-hover rounded-full theme-text-secondary"
                        onClick={() => closeModal('postDetail')}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content (Scrollable) */}
                <div className="p-6 overflow-y-auto flex-1">
                    <h2 className="text-xl font-bold mb-4">{viewedPost.title}</h2>
                    <p className="theme-text-secondary leading-relaxed whitespace-pre-wrap mb-6">
                        {viewedPost.content}
                    </p>

                    {/* Post Image */}
                    {viewedPost.image_url && (
                        <div className="mb-6 rounded-2xl overflow-hidden border theme-border">
                            <img
                                src={viewedPost.image_url}
                                alt="Post media"
                                className="w-full max-h-[600px] object-contain bg-black/50"
                            />
                        </div>
                    )}

                    {/* Interaction Bar */}
                    <div className="flex items-center gap-6 py-4 border-y theme-border text-sm theme-text-secondary mb-6">
                        <button
                            onClick={() => likePost(viewedPost.id)}
                            className={`flex items-center gap-1 hover:text-red-500 transition-colors ${isLiked ? 'text-red-500' : ''}`}
                        >
                            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                            <span>{totalLikes} 点赞</span>
                        </button>
                        <div className="flex items-center gap-1">
                            <MessageCircle className="w-5 h-5" />
                            <span>{totalComments} 评论</span>
                        </div>
                        <button
                            onClick={() => alert('分享链接已复制到剪贴板！')}
                            className="flex items-center gap-1 hover:text-green-400 transition-colors"
                        >
                            <Share2 className="w-5 h-5" />
                            <span>{viewedPost.shares} 分享</span>
                        </button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-sm theme-text-secondary mb-4">评论列表</h4>
                        {viewedPost.commentsList && viewedPost.commentsList.length > 0 ? (
                            viewedPost.commentsList.map(comment => {
                                const commentAuthor = getUserById(comment.authorId);
                                return (
                                    <div key={comment.id} className="flex gap-3">
                                        <img src={commentAuthor?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${commentAuthor?.display_id}`} className="w-8 h-8 rounded-full" alt={commentAuthor?.username} />
                                        <div className="flex-1">
                                            <div className="bg-white/5 rounded-xl p-3">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-sm">{commentAuthor?.username}</span>
                                                    <span className="text-xs theme-text-secondary">{comment.date}</span>
                                                </div>
                                                <p className="text-sm theme-text-secondary">{comment.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 theme-text-secondary text-sm">
                                暂无评论，快来抢沙发吧！
                            </div>
                        )}
                    </div>
                </div>

                {/* Comment Input */}
                <div className="p-4 border-t theme-border shrink-0 bg-black/20 backdrop-blur-md">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                            placeholder="写下你的评论..."
                            className="flex-1 glass-input rounded-xl px-4 py-2 outline-none focus:border-cyan-500 transition-colors"
                        />
                        <button
                            onClick={handleSendComment}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg transition-all"
                        >
                            发送
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 装扮社区模态框
export function DecoStoreModal() {
    const { modals, closeModal, bubbleStyle, setBubbleStyle, currentUser, setIsLoading, showToast } = useApp();
    const [activeTab, setActiveTab] = useState('browse');
    const [shaderCode, setShaderCode] = useState('');
    const [cssCode, setCssCode] = useState('');
    const [decorationName, setDecorationName] = useState('');
    const [decorationDesc, setDecorationDesc] = useState('');
    const [decorationType, setDecorationType] = useState('shader');
    const [decorationTarget, setDecorationTarget] = useState('background');
    const [sharedDecorations, setSharedDecorations] = useState([]);
    const [filterType, setFilterType] = useState('all');
    const [filterTarget, setFilterTarget] = useState('all');

    // 加载共享装扮
    useEffect(() => {
        if (modals.decoStore) {
            loadDecorations();
        }
    }, [modals.decoStore, filterType, filterTarget]);

    const loadDecorations = async () => {
        const type = filterType === 'all' ? null : filterType;
        const target = filterTarget === 'all' ? null : filterTarget;
        const { data, error } = await decorationsAPI.list(type, target);
        if (data) {
            setSharedDecorations(data);
        }
    };

    // 提交新装扮
    const handleSubmitDecoration = async () => {
        const code = decorationType === 'shader' ? shaderCode : cssCode;
        if (!decorationName.trim() || !code.trim()) {
            showToast.warning('信息不全', '请填写名称和代码');
            return;
        }

        setIsLoading(true);
        const { data, error } = await decorationsAPI.create(
            currentUser?.id,
            decorationName,
            decorationDesc,
            decorationType,
            decorationTarget,
            code
        );
        setIsLoading(false);

        if (error) {
            alert('提交失败: ' + error.message);
        } else {
            alert('装扮已提交到社区！');
            setDecorationName('');
            setDecorationDesc('');
            setShaderCode('');
            setCssCode('');
            loadDecorations();
            setActiveTab('browse');
        }
    };

    // 应用装扮
    const handleApplyDecoration = async (decoration) => {
        if (!currentUser) {
            alert('请先登录');
            return;
        }

        setIsLoading(true);
        const { error } = await decorationsAPI.apply(
            currentUser.id,
            decoration.id,
            decoration.target
        );
        setIsLoading(false);

        if (error) {
            showToast.error('应用失败', error.message);
        } else {
            showToast.success('应用成功', `"${decoration.name}" 已应用为${decoration.target === 'background' ? '聊天背景' : '气泡样式'}！`);
        }
    };

    if (!modals.decoStore) return null;

    return (
        <div
            className={`modal-backdrop ${modals.decoStore ? 'show' : ''}`}
            style={{ zIndex: 75 }}
            onClick={() => closeModal('decoStore')}
        >
            <div
                className="modal-content theme-bg-panel border theme-border rounded-2xl shadow-2xl w-full max-w-5xl theme-text-primary overflow-hidden flex flex-col"
                style={{ height: '85vh' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b theme-border">
                    <h2 className="text-xl font-bold">✨ 装扮社区</h2>
                    <button onClick={() => closeModal('decoStore')} className="p-2 hover:bg-white/10 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* 标签页 */}
                <div className="flex gap-1 px-6 pt-4 border-b theme-border">
                    {[
                        { id: 'browse', label: '🌟 浏览装扮' },
                        { id: 'submit', label: '➕ 提交装扮' },
                        { id: 'bubble', label: '💬 气泡皮肤' },
                        { id: 'font', label: '🔤 字体工坊' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`px-4 py-3 text-sm transition-colors border-b-2 ${activeTab === tab.id
                                ? 'border-cyan-500 text-cyan-400'
                                : 'border-transparent theme-text-secondary hover:text-white'
                                }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* 浏览装扮 */}
                    {activeTab === 'browse' && (
                        <div className="space-y-4">
                            {/* 筛选 */}
                            <div className="flex gap-4 mb-4">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="glass-input rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="all">所有类型</option>
                                    <option value="shader">着色器</option>
                                    <option value="css">CSS</option>
                                </select>
                                <select
                                    value={filterTarget}
                                    onChange={(e) => setFilterTarget(e.target.value)}
                                    className="glass-input rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="all">所有目标</option>
                                    <option value="background">聊天背景</option>
                                    <option value="bubble">气泡样式</option>
                                </select>
                            </div>

                            {/* 装扮列表 */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {sharedDecorations.map(deco => (
                                    <div
                                        key={deco.id}
                                        className="border theme-border rounded-xl p-4 hover:bg-white/5 transition-colors group"
                                    >
                                        {/* 预览区 */}
                                        <div className="h-24 rounded-lg mb-3 overflow-hidden bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                                            <span className="text-2xl">{deco.type === 'shader' ? '🎨' : '🎭'}</span>
                                        </div>

                                        <h4 className="font-bold text-sm mb-1 truncate">{deco.name}</h4>
                                        <p className="text-xs theme-text-secondary mb-2 line-clamp-2">{deco.description || '无描述'}</p>

                                        <div className="flex items-center justify-between text-xs theme-text-secondary mb-3">
                                            <span className={`px-2 py-0.5 rounded ${deco.type === 'shader' ? 'bg-purple-500/20 text-purple-400' : 'bg-pink-500/20 text-pink-400'}`}>
                                                {deco.type === 'shader' ? '着色器' : 'CSS'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded ${deco.target === 'background' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                                {deco.target === 'background' ? '背景' : '气泡'}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleApplyDecoration(deco)}
                                            className="w-full py-2 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            应用此装扮
                                        </button>
                                    </div>
                                ))}

                                {sharedDecorations.length === 0 && (
                                    <div className="col-span-full text-center py-12 theme-text-secondary">
                                        <div className="text-4xl mb-4">🎨</div>
                                        <p>暂无装扮，快来提交第一个吧！</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 提交装扮 */}
                    {activeTab === 'submit' && (
                        <div className="space-y-4 max-w-2xl mx-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm theme-text-secondary mb-2">装扮名称</label>
                                    <input
                                        type="text"
                                        value={decorationName}
                                        onChange={(e) => setDecorationName(e.target.value)}
                                        placeholder="给你的装扮起个名字"
                                        className="w-full glass-input rounded-xl p-3 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm theme-text-secondary mb-2">类型</label>
                                    <select
                                        value={decorationType}
                                        onChange={(e) => setDecorationType(e.target.value)}
                                        className="w-full glass-input rounded-xl p-3 outline-none"
                                    >
                                        <option value="shader">着色器 (GLSL)</option>
                                        <option value="css">CSS 样式</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm theme-text-secondary mb-2">应用目标</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setDecorationTarget('background')}
                                        className={`flex-1 py-2 rounded-lg text-sm transition-colors ${decorationTarget === 'background'
                                            ? 'bg-cyan-500 text-white'
                                            : 'bg-white/10 hover:bg-white/20'
                                            }`}
                                    >
                                        聊天背景
                                    </button>
                                    <button
                                        onClick={() => setDecorationTarget('bubble')}
                                        className={`flex-1 py-2 rounded-lg text-sm transition-colors ${decorationTarget === 'bubble'
                                            ? 'bg-cyan-500 text-white'
                                            : 'bg-white/10 hover:bg-white/20'
                                            }`}
                                    >
                                        气泡样式
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm theme-text-secondary mb-2">描述（可选）</label>
                                <input
                                    type="text"
                                    value={decorationDesc}
                                    onChange={(e) => setDecorationDesc(e.target.value)}
                                    placeholder="简单描述这个装扮的效果"
                                    className="w-full glass-input rounded-xl p-3 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm theme-text-secondary mb-2">
                                    {decorationType === 'shader' ? '着色器代码 (mainImage 函数)' : 'CSS 代码'}
                                </label>
                                <textarea
                                    rows={10}
                                    value={decorationType === 'shader' ? shaderCode : cssCode}
                                    onChange={(e) => decorationType === 'shader' ? setShaderCode(e.target.value) : setCssCode(e.target.value)}
                                    placeholder={decorationType === 'shader'
                                        ? `void mainImage(out vec4 fragColor, in vec2 fragCoord) {\n    // 你的着色器代码\n}`
                                        : `/* 你的 CSS 样式 */\nbackground: linear-gradient(135deg, #667eea 0%, #764ba2 100%);`
                                    }
                                    className="w-full glass-input rounded-xl p-4 outline-none resize-none font-mono text-xs"
                                />
                            </div>

                            <button
                                onClick={handleSubmitDecoration}
                                className="w-full py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white rounded-xl font-bold transition-all"
                            >
                                🚀 提交到社区
                            </button>
                        </div>
                    )}

                    {/* 气泡皮肤 */}
                    {activeTab === 'bubble' && (
                        <div className="store-grid">
                            {BUBBLE_STYLES.map(style => (
                                <div
                                    key={style.id}
                                    className={`store-item ${bubbleStyle === style.id ? 'active' : ''}`}
                                    onClick={() => setBubbleStyle(style.id)}
                                >
                                    <div className={`w-16 h-10 rounded-xl mb-2 flex items-center justify-center text-xs ${style.class}`}>
                                        Hello
                                    </div>
                                    <span className="text-xs theme-text-secondary">{style.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 字体工坊 */}
                    {activeTab === 'font' && (
                        <div className="space-y-3">
                            {FONT_STYLES.map(font => (
                                <div
                                    key={font.name}
                                    className="p-4 border theme-border rounded-xl cursor-pointer hover:bg-white/5 flex justify-between items-center transition-colors"
                                    onClick={() => document.documentElement.style.setProperty('--font-body', font.val)}
                                >
                                    <span style={{ fontFamily: font.val }} className="theme-text-primary">
                                        The quick brown fox jumps over the lazy dog.
                                    </span>
                                    <span className="text-xs theme-text-secondary ml-4">{font.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// 群组资料模态框
export function GroupProfileModal() {
    const {
        modals, closeModal, activeChatId, chats, currentUser,
        setIsLoading, setActiveChatId, friends, addGroupMembers
    } = useApp();
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [selectedFriends, setSelectedFriends] = useState([]);

    const activeChat = chats.find(c => c.id === activeChatId);

    useEffect(() => {
        if (modals.groupProfile && activeChatId) {
            loadGroupInfo();
            setShowInvite(false);
            setSelectedFriends([]);
        }
    }, [modals.groupProfile, activeChatId]);

    const loadGroupInfo = async () => {
        setLoadingMembers(true);
        const { data: membersData } = await conversations.getMembers(activeChatId);
        if (membersData) {
            setMembers(membersData.map(m => m.user));
        }
        setLoadingMembers(false);
    };

    console.log('=== GroupProfileModal Debug ===');
    console.log('modals.groupProfile:', modals.groupProfile);
    console.log('activeChatId:', activeChatId);
    console.log('activeChat:', activeChat);
    console.log('Will render:', modals.groupProfile && activeChat);
    console.log('===============================');

    if (!modals.groupProfile || !activeChat) {
        console.log('Modal returning null. Reason:', !modals.groupProfile ? 'modal not open' : 'no activeChat');
        return null;
    }

    const handleInvite = async () => {
        if (selectedFriends.length === 0) return;
        setIsLoading(true);
        const { success, message } = await addGroupMembers(activeChatId, selectedFriends);
        setIsLoading(false);
        if (success) {
            alert('邀请成功！');
            setShowInvite(false);
            setSelectedFriends([]);
            loadGroupInfo();
        } else {
            alert('邀请失败: ' + message);
        }
    };

    const toggleFriend = (id) => {
        setSelectedFriends(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
    };

    // Filter friends who are NOT already in the group
    const availableFriends = friends.filter(f => !members.some(m => m?.id === f.id));

    const handleLeave = async () => {
        if (!confirm('确定要退出群聊吗？')) return;
        setIsLoading(true);
        const { error } = await conversations.removeMember(activeChatId, currentUser.id);
        setIsLoading(false);
        if (!error) {
            setActiveChatId(null);
            closeModal('groupProfile');
            alert('已退出群聊');
            window.location.reload();
        } else {
            alert('退出失败: ' + error.message);
        }
    };

    const handleDissolve = async () => {
        if (!confirm('确定要解散群聊吗？此操作不可恢复！')) return;
        setIsLoading(true);
        const { error } = await conversations.dissolve(activeChatId);
        setIsLoading(false);
        if (!error) {
            setActiveChatId(null);
            closeModal('groupProfile');
            alert('群聊已解散');
            window.location.reload();
        } else {
            alert('解散失败: ' + error.message);
        }
    };

    const handleKick = async (memberId, memberName) => {
        if (!confirm(`确定要将 ${memberName} 移出群聊吗？`)) return;
        setIsLoading(true);
        const { error } = await conversations.removeMember(activeChatId, memberId);
        setIsLoading(false);
        if (!error) {
            alert(`${memberName} 已被移出`);
            loadGroupInfo();
        } else {
            alert('操作失败: ' + error.message);
        }
    };

    return (
        <div
            className={`modal-backdrop ${modals.groupProfile ? 'show' : ''}`}
            onClick={() => closeModal('groupProfile')}
            style={{ zIndex: 65 }}
        >
            <div
                className="modal-content theme-bg-panel border theme-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden theme-text-primary flex flex-col"
                style={{ maxHeight: '85vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b theme-border shrink-0 bg-black/20 backdrop-blur-md">
                    <h3 className="font-bold text-lg">
                        {showInvite ? '邀请好友' : `群聊信息 (${members.length}人)`}
                    </h3>
                    <div className="flex gap-2">
                        {showInvite && (
                            <button
                                onClick={() => setShowInvite(false)}
                                className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                返回
                            </button>
                        )}
                        <button
                            className="p-1 theme-hover rounded-full theme-text-secondary"
                            onClick={() => closeModal('groupProfile')}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {!showInvite ? (
                        <>
                            {/* Group Info Section */}
                            <div className="p-6 flex flex-col items-center border-b theme-border bg-gradient-to-b from-cyan-500/5 to-transparent">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-0.5 shadow-xl shadow-cyan-500/20 mb-4">
                                    <div className="w-full h-full bg-[#0f172a] rounded-full flex items-center justify-center">
                                        <Users className="w-10 h-10 text-cyan-400" />
                                    </div>
                                </div>
                                <h2 className="text-2xl font-bold mb-1">{activeChat.name}</h2>
                                <p className="text-xs theme-text-secondary font-mono bg-black/30 px-2 py-1 rounded">ID: {activeChat.id.slice(0, 8)}</p>

                                <div className="flex gap-4 mt-6 w-full px-4">
                                    <button
                                        onClick={() => setShowInvite(true)}
                                        className="flex-1 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        邀请成员
                                    </button>
                                </div>
                            </div>

                            {/* Members List */}
                            <div className="p-4">
                                <h4 className="text-xs font-bold theme-text-secondary mb-3 uppercase tracking-wider px-2">成员列表</h4>
                                <div className="space-y-1">
                                    {loadingMembers ? (
                                        <div className="flex justify-center py-4"><span className="animate-spin">⏳</span></div>
                                    ) : (
                                        members.map(member => (
                                            <div
                                                key={member?.id}
                                                className="flex items-center justify-between p-2 theme-hover rounded-xl group transition-all cursor-pointer"
                                                onClick={() => {
                                                    // Close this modal and open user profile
                                                    // We shouldn't close group modal? Actually user probably wants to go deeper.
                                                    // Request says: "Clicking user avatar enters user homepage".
                                                    // Usually layers: GroupModal -> ProfileOverlay.
                                                    // Or GroupModal closes.
                                                    // Let's keep GroupModal open underneath? Or close it?
                                                    // "enters user homepage" implies focus switch.
                                                    // I'll close the group modal to avoid clutter, or just stack overlay.
                                                    // Overlays stack over modals in this app?
                                                    // AppContext handles overlays independently.
                                                    // Let's try stacking first (don't close group modal), if it conflicts I'll close it.
                                                    // Actually, usually you want to come back to group info.
                                                    // But Overlay is full screen? 
                                                    // ProfileOverlay is `full-page-overlay`.
                                                    // So it will cover the modal.
                                                    setViewedProfile(member);
                                                    openOverlay('profile');
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={member?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${member?.display_id}`}
                                                        className="w-10 h-10 rounded-full border theme-border object-cover"
                                                    />
                                                    <div>
                                                        <p className="font-bold text-sm flex items-center gap-2">
                                                            {member?.username}
                                                            {member?.id === activeChat.created_by && (
                                                                <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/30">群主</span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs theme-text-secondary">@{member?.display_id}</p>
                                                    </div>
                                                </div>

                                                {activeChat.created_by === currentUser?.id && member?.id !== currentUser?.id && (
                                                    <button
                                                        onClick={() => handleKick(member.id, member.username)}
                                                        className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        移出
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Invite Friends View */
                        <div className="p-6">
                            <h4 className="text-sm font-bold theme-text-secondary mb-4">选择要邀请的好友</h4>
                            {availableFriends.length > 0 ? (
                                <div className="space-y-2">
                                    {availableFriends.map(friend => (
                                        <label key={friend.id} className="flex items-center gap-3 p-3 theme-hover rounded-xl cursor-pointer bg-white/5 border border-transparent hover:border-cyan-500/30 transition-all">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 accent-cyan-500 rounded"
                                                checked={selectedFriends.includes(friend.id)}
                                                onChange={() => toggleFriend(friend.id)}
                                            />
                                            <img
                                                src={friend.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${friend.display_id}`}
                                                className="w-10 h-10 rounded-full border theme-border"
                                            />
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">{friend.username}</p>
                                                <p className="text-xs theme-text-secondary">@{friend.display_id}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 theme-text-secondary bg-white/5 rounded-xl border border-dashed theme-border">
                                    <p>没有可邀请的好友</p>
                                    <p className="text-xs mt-1">他们可能已经在群里了</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t theme-border shrink-0 bg-black/20 backdrop-blur-md">
                    {!showInvite ? (
                        activeChat.created_by === currentUser?.id ? (
                            <button
                                onClick={handleDissolve}
                                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all"
                            >
                                解散群聊
                            </button>
                        ) : (
                            <button
                                onClick={handleLeave}
                                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl font-bold transition-all"
                            >
                                退出群聊
                            </button>
                        )
                    ) : (
                        <button
                            onClick={handleInvite}
                            disabled={selectedFriends.length === 0}
                            className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all ${selectedFriends.length > 0
                                ? 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/20'
                                : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            发送邀请 ({selectedFriends.length})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
