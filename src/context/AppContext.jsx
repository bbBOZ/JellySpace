import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase, auth, profiles, settings, friendships, conversations, messages, posts as postsAPI, storage } from '../lib/supabase';
import { cache, CACHE_KEYS, isOnline, onNetworkChange } from '../lib/cache';
import { chat as aiChat } from '../lib/ai';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    // 认证状态
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    // UI 状态
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('chats');
    const [activeChatId, setActiveChatId] = useState(null);

    // 设置
    const [theme, setTheme] = useState('dark');
    const [bgStyle, setBgStyle] = useState('static');
    const [bubbleStyle, setBubbleStyle] = useState('default');
    const [fontStyle, setFontStyle] = useState('系统默认');

    // 网络状态
    const [isOffline, setIsOffline] = useState(!isOnline());
    const [realtimeStatus, setRealtimeStatus] = useState('disconnected'); // 'connected', 'disconnected', 'connecting'

    // 数据
    const [chats, setChats] = useState([]);
    const [messagesList, setMessagesList] = useState({});
    const [posts, setPosts] = useState([]);
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});

    // 防止重复 AI 调用的锁（使用 useRef 保持跨渲染稳定）
    const jellyReplyLockRef = useRef(new Set());

    // 追踪 activeChatId 用于在回调中访问最新值 (关键：单一数据源)
    const activeChatIdRef = useRef(activeChatId);
    useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

    // 全局消息订阅引用
    const globalSubscriptionRef = useRef(null);

    // 模态框和覆盖层
    const [modals, setModals] = useState({
        addFriend: false,
        createGroup: false,
        createPost: false,
        settings: false,
        decoStore: false,
        postDetail: false,
        friendRequests: false,
        groupProfile: false
    });

    const [overlays, setOverlays] = useState({
        profile: false,
        about: false,
        starLink: false
    });

    const [viewedPost, setViewedPost] = useState(null);
    const [viewedProfile, setViewedProfile] = useState(null);

    // Sidebar collapse state
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

    // 初始化认证状态
    useEffect(() => {
        const initAuth = async () => {
            try {
                const user = await auth.getUser();
                if (user) {
                    console.log('Init auth found user:', user.id);
                    setCurrentUser(user);
                    setIsAuthenticated(true);
                    await loadUserData(user.id);
                }
            } catch (error) {
                console.error('Auth init error:', error);
            } finally {
                setAuthLoading(false);
            }
        };

        initAuth();

        // 监听认证状态变化
        const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
            console.log('Auth State Change:', event, session?.user?.id);
            if (event === 'SIGNED_IN' && session?.user) {
                console.log('User signed in, loading data...');
                setCurrentUser(session.user);
                setIsAuthenticated(true);
                try {
                    setIsLoading(true);
                    await loadUserData(session.user.id);
                } catch (err) {
                    console.error('Error loading user data:', err);
                } finally {
                    setIsLoading(false);
                }
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
                setCurrentUser(null);
                setUserProfile(null);
                setIsAuthenticated(false);
                resetState();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 监听网络状态变化
    useEffect(() => {
        const cleanup = onNetworkChange((online) => {
            setIsOffline(!online);
            if (online && currentUser) {
                syncFromBackend(currentUser.id);
            }
        });
        return cleanup;
    }, [currentUser]);

    // =========================================================================
    // 核心逻辑：单一数据源 (Global Single Source of Truth)
    // =========================================================================
    useEffect(() => {
        if (!currentUser?.id) return;

        console.log('📡 [Global] 启动全局消息监听, 用户:', currentUser.id);
        setRealtimeStatus('connecting');

        // 订阅所有消息
        // subscribeToAll 返回的是 channel 对象
        const channel = messages.subscribeToAll(async (newMsg) => {
            console.log('📨 [Realtime] 收到原始事件:', newMsg);

            // 忽略自己发送的消息（已经在 sendMessage 中处理乐观更新）
            if (newMsg.sender_id === currentUser.id) return;

            // 1. 获取发送者资料 (如果缓存没有)
            let sender = cache.getData(CACHE_KEYS.USER_PROFILE, newMsg.sender_id);
            if (!sender) {
                const { data } = await profiles.get(newMsg.sender_id);
                sender = data;
                if (sender) cache.set(CACHE_KEYS.USER_PROFILE, sender, newMsg.sender_id);
            }

            const formattedMsg = {
                id: newMsg.id,
                senderId: newMsg.sender_id,
                text: newMsg.content,
                time: formatTime(newMsg.created_at),
                timestamp: newMsg.created_at, // Add timestamp for sorting/diff
                message_type: newMsg.message_type || 'text',
                media_url: newMsg.media_url,
                sender: sender // Ensure sender is attached
            };

            const chatId = newMsg.conversation_id;

            // 2. 更新消息列表 MAP (无论是否当前会话，都更新数据源)
            setMessagesList(prev => {
                const currentList = prev[chatId] || [];
                // 去重检查
                if (currentList.some(m => m.id === newMsg.id)) {
                    console.log('⚠️ [Realtime] 忽略重复消息:', newMsg.id);
                    return prev;
                }

                console.log('✅ [Realtime] 更新消息列表:', chatId);
                const updated = {
                    ...prev,
                    [chatId]: [...currentList, formattedMsg]
                };
                return updated;
            });

            // 3. 更新会话列表 (移动到顶部 + 更新最后一条消息)
            setChats(prev => {
                const chatIndex = prev.findIndex(chat => chat.id === chatId);

                // 如果是新会话 (即列表中不存在)
                if (chatIndex === -1) {
                    console.log('🆕 [Realtime] 收到新会话消息，刷新列表...');
                    syncConversations(currentUser.id);
                    return prev;
                }

                const updatedChat = {
                    ...prev[chatIndex],
                    lastMessage: newMsg.content,
                    time: formatTime(newMsg.created_at),
                    lastMessageTime: newMsg.created_at // 用于排序
                };

                // 移除旧的位置，添加到头部，但这里我们最好还是统一排序
                // 因为可能有多个会话同时更新 (虽少见)，或者想要绝对的时间顺序
                const tempChats = [updatedChat, ...prev.filter(c => c.id !== chatId)];
                return sortChats(tempChats);
            });

            // 4. 更新未读计数 (如果不是当前活动会话)
            const currentActiveId = activeChatIdRef.current;
            if (currentActiveId !== chatId) {
                console.log('🔔 [Realtime] 增加未读计数 (active:', currentActiveId, 'target:', chatId, ')');
                setUnreadCounts(prev => ({
                    ...prev,
                    [chatId]: (prev[chatId] || 0) + 1
                }));
            }
        });

        // 监听连接状态
        channel.on('system', { event: 'postgres_changes' }, (payload) => {
            // 这里的 system 事件可能不直接反映连接，通常 subscribe 回调里的 status 更准
        })
            .subscribe((status, err) => {
                console.log('📡 [Global] 订阅状态变更:', status, err);
                if (status === 'SUBSCRIBED') {
                    setRealtimeStatus('connected');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setRealtimeStatus('disconnected');
                } else {
                    setRealtimeStatus('connecting');
                }
            });

        globalSubscriptionRef.current = channel;

        return () => {
            if (globalSubscriptionRef.current) {
                console.log('🔌 [Global] 停止全局监听');
                globalSubscriptionRef.current.unsubscribe();
                globalSubscriptionRef.current = null;
                setRealtimeStatus('disconnected');
            }
        };
    }, [currentUser?.id]); // 这一层只依赖 user ID，绝对不依赖 activeChatId

    // 从缓存加载数据（立即显示）
    const loadFromCache = (userId) => {
        console.log('Loading data from cache for:', userId);

        // 加载用户资料缓存
        const cachedProfile = cache.getData(CACHE_KEYS.USER_PROFILE, userId);
        if (cachedProfile) {
            setUserProfile(cachedProfile);
        }

        // 加载设置缓存
        const cachedSettings = cache.getData(CACHE_KEYS.USER_SETTINGS, userId);
        if (cachedSettings) {
            setTheme(cachedSettings.theme || 'dark');
            setBgStyle(cachedSettings.bg_style || 'static');
            setBubbleStyle(cachedSettings.bubble_style || 'default');
            setFontStyle(cachedSettings.font_style || '系统默认');
        }

        // 加载好友列表缓存
        const cachedFriends = cache.getData(CACHE_KEYS.FRIENDS_LIST, userId);
        if (cachedFriends) {
            setFriends(cachedFriends);
        }

        // 加载会话列表缓存
        const cachedChats = cache.getData(CACHE_KEYS.CONVERSATIONS, userId);
        if (cachedChats) {
            setChats(cachedChats);
        }

        // 加载消息缓存
        const cachedMessages = cache.getData(CACHE_KEYS.MESSAGES, userId);
        if (cachedMessages) {
            setMessagesList(cachedMessages);
        }

        // 加载帖子缓存（帖子是公共数据，不带userId）
        const cachedPosts = cache.getData(CACHE_KEYS.POSTS);
        if (cachedPosts) {
            setPosts(cachedPosts);
        }

        return {
            hasProfile: !!cachedProfile,
            hasSettings: !!cachedSettings,
            hasFriends: !!cachedFriends,
            hasChats: !!cachedChats,
            hasPosts: !!cachedPosts
        };
    };

    // 从后端同步数据并更新缓存
    const syncFromBackend = async (userId) => {
        if (!isOnline()) {
            console.log('Offline, skipping backend sync');
            return;
        }

        console.log('Syncing data from backend for:', userId);

        try {
            await Promise.all([
                // 同步用户资料
                (async () => {
                    const { data: profile } = await profiles.get(userId);
                    if (profile) {
                        setUserProfile(profile);
                        cache.set(CACHE_KEYS.USER_PROFILE, profile, userId);
                    }
                })(),

                // 同步用户设置
                (async () => {
                    const { data: userSettings } = await settings.get(userId);
                    if (userSettings) {
                        setTheme(userSettings.theme || 'dark');
                        setBgStyle(userSettings.bg_style || 'static');
                        setBubbleStyle(userSettings.bubble_style || 'default');
                        setFontStyle(userSettings.font_style || '系统默认');
                        cache.set(CACHE_KEYS.USER_SETTINGS, userSettings, userId);
                    }
                })(),

                // 同步好友列表
                (async () => {
                    const { data: friendList } = await friendships.list(userId);
                    if (friendList) {
                        const friendsData = friendList.map(f => f.friend);
                        setFriends(friendsData);
                        cache.set(CACHE_KEYS.FRIENDS_LIST, friendsData, userId);
                    }
                })(),

                // 同步帖子
                syncPosts(),

                // 确保与果冻的好友关系和会话（先创建，再同步会话列表）
                (async () => {
                    await ensureJellyFriend(userId);
                    // 在 Jelly 会话创建后再同步会话列表
                    await syncConversations(userId);
                })()
            ]);
        } catch (error) {
            console.error('Backend sync error:', error);
        }
    };

    // 加载用户数据（缓存优先 + 后台同步）
    const loadUserData = async (userId) => {
        console.log('Loading user data for:', userId);

        try {
            // 第一步：立即从缓存加载数据
            const cacheStatus = loadFromCache(userId);

            // 如果有缓存数据，先让用户看到
            const hasAnyCache = Object.values(cacheStatus).some(v => v);

            if (hasAnyCache) {
                console.log('Loaded from cache, syncing in background...');
                // 后台静默同步
                syncFromBackend(userId).catch(err => {
                    console.error('Background sync failed:', err);
                });
            } else {
                console.log('No cache found, loading from backend...');
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('数据加载超时')), 15000)
                );

                await Promise.race([
                    syncFromBackend(userId),
                    timeoutPromise
                ]);
            }
        } catch (error) {
            console.error('Load user data exception:', error);
        }
    };

    // 同步会话列表
    const syncConversations = async (userId) => {
        const { data } = await conversations.list(userId);
        if (data) {
            const chatList = await Promise.all(data.map(async (item) => {
                const conv = item.conversation;

                // 并行获取成员和最后消息
                const [membersRes, msgsRes] = await Promise.all([
                    conversations.getMembers(conv.id),
                    messages.list(conv.id, 1)
                ]);

                const members = membersRes.data;
                const msgs = msgsRes.data;

                const otherMember = members?.find(m => m.user.id !== userId)?.user;
                const lastMsg = msgs?.[0];

                return {
                    id: conv.id,
                    type: conv.type,
                    name: conv.name || otherMember?.username,
                    created_by: conv.created_by,
                    userId: otherMember?.id,
                    avatar: otherMember?.avatar_url,
                    lastMessage: lastMsg?.content || '',
                    time: lastMsg ? formatTime(lastMsg.created_at) : '',
                    lastMessageTime: lastMsg?.created_at || item.created_at, // 增加这个字段用于精确排序
                    unread: 0,
                    lastReadAt: item.last_read_at
                };
            }));
            // 使用 sortChats 进行排序
            setChats(sortChats(chatList));
            cache.set(CACHE_KEYS.CONVERSATIONS, sortChats(chatList), userId);
        }
    };

    // 同步帖子
    const syncPosts = async () => {
        const { data } = await postsAPI.list();
        if (data) {
            const postsList = data.map(post => ({
                id: post.id,
                title: post.title,
                content: post.content,
                date: post.is_pinned ? '置顶' : formatDate(post.created_at),
                authorId: post.author_id,
                author: post.author,
                likedBy: post.likes?.map(l => l.user_id) || [],
                commentsList: [],
                shares: post.shares || 0,
                isPinned: post.is_pinned
            }));
            setPosts(postsList);
            cache.set(CACHE_KEYS.POSTS, postsList);
        }
    };

    // 重置状态
    const resetState = () => {
        setChats([]);
        setMessagesList({});
        setPosts([]);
        setFriends([]);
        setActiveChatId(null);
        setRealtimeStatus('disconnected');
    };

    // 登录
    const login = async (identifier, password, isEmail = false) => {
        console.log('Attempting login for:', identifier);
        setIsLoading(true);
        try {
            let result;
            let emailToUse = identifier;
            if (!isEmail && !identifier.includes('@')) {
                emailToUse = `${identifier}@jelly.chat`;
            }

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('登录请求超时，请检查网络连接')), 10000)
            );

            result = await Promise.race([
                auth.signIn(emailToUse, password),
                timeoutPromise
            ]);

            if (result.error) {
                console.error('Login error:', result.error);
                if (!isEmail && !identifier.includes('@')) {
                    const { data: profile } = await profiles.getByDisplayId(identifier);
                    if (!profile) {
                        return { success: false, message: '用户不存在' };
                    }
                    return { success: false, message: '密码错误' };
                }
                return { success: false, message: result.error.message };
            }

            return { success: true };
        } catch (error) {
            console.error('Login exception:', error);
            return { success: false, message: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    // 注册
    const register = async (customId, password, nickname = null, email = null) => {
        console.log('Starting registration for:', customId);
        setIsLoading(true);
        try {
            const displayId = customId || 'user_' + Math.random().toString(36).substr(2, 6);
            if (!/^[a-zA-Z0-9_]+$/.test(displayId)) {
                return { success: false, message: 'ID 只能包含字母、数字和下划线' };
            }
            const username = nickname || displayId;
            const userEmail = email || `${displayId}@jelly.chat`;

            const { data, error } = await auth.signUp(userEmail, password, username, displayId);

            if (error) {
                return { success: false, message: error.message };
            }

            if (data.user) {
                // 创建用户资料
                const { error: profileError } = await profiles.create({
                    id: data.user.id,
                    username,
                    display_id: displayId,
                    avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${displayId}`
                });
                if (profileError) throw profileError;

                // 创建默认设置
                const { error: settingsError } = await settings.update(data.user.id, {
                    theme: 'dark',
                    bg_style: 'static',
                    bubble_style: 'default',
                    font_style: '系统默认'
                });
                if (settingsError) throw settingsError;

                await ensureJellyFriend(data.user.id);
            }

            return { success: true, displayId };
        } catch (error) {
            console.error('Registration exception:', error);
            return { success: false, message: error.message || '注册过程中发生未知错误' };
        } finally {
            setIsLoading(false);
        }
    };

    // 确保与果冻的好友关系和会话
    const ensureJellyFriend = async (userId) => {
        try {
            const { data: jellyProfile, error: jellyError } = await profiles.getByDisplayId('jelly');
            if (jellyError || !jellyProfile || userId === jellyProfile.id) return null;

            const { data: existingFriend } = await friendships.check(userId, jellyProfile.id);
            if (!existingFriend || existingFriend.status !== 'accepted') {
                const { error: addError } = await friendships.sendRequest(userId, jellyProfile.id, '来自系统的自动添加');
                if (!addError) {
                    const { data: pendingReq } = await friendships.check(userId, jellyProfile.id);
                    if (pendingReq) {
                        await friendships.acceptRequest(pendingReq.id, jellyProfile.id);
                    }
                }
            }

            const { data: convList } = await conversations.list(userId);
            let jellyConv = null;

            if (convList && convList.length > 0) {
                for (const item of convList) {
                    const conv = item.conversation;
                    if (conv.type === 'private') {
                        const { data: members } = await conversations.getMembers(conv.id);
                        if (members?.some(m => m.user.id === jellyProfile.id)) {
                            jellyConv = conv;
                            break;
                        }
                    }
                }
            }

            if (!jellyConv) {
                const { data: newConv, error: convError } = await conversations.create(
                    'private',
                    null,
                    [userId, jellyProfile.id],
                    userId
                );
                if (!convError) jellyConv = newConv;
                if (jellyConv) {
                    await messages.send(
                        jellyConv.id,
                        jellyProfile.id,
                        '你好！我是果冻，很高兴认识你！有什么我可以帮助你的吗？ 😊'
                    );
                }
            }
            return jellyConv?.id;
        } catch (error) {
            console.error('Error ensuring Jelly friend:', error);
            return null;
        }
    };

    // 登出
    const logout = async () => {
        setIsLoading(true);
        try {
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
            await Promise.race([
                auth.signOut().catch(err => console.error('Supabase signOut error:', err)),
                timeoutPromise
            ]);
        } catch (error) {
            console.error('Logout exception:', error);
        } finally {
            cache.clearUser(currentUser?.id);
            setCurrentUser(null);
            setUserProfile(null);
            setIsAuthenticated(false);
            resetState();
            setIsLoading(false);
        }
    };

    const createGroup = async (name, memberIds) => {
        const { data, error } = await conversations.create('group', name, [currentUser.id, ...memberIds], currentUser.id);
        if (error) {
            console.error('Create group error:', error);
            return null;
        }
        await syncConversations(currentUser.id);
        return data.id;
    };

    const addGroupMembers = async (groupId, memberIds) => {
        const { error } = await conversations.addMembers(groupId, memberIds);
        if (error) {
            console.error('Add members error:', error);
            return { success: false, message: error.message };
        }
        return { success: true };
    };

    const createPrivateChat = async (targetUserId) => {
        // 1. Check local cache
        const existing = chats.find(c => c.type === 'private' && c.userId === targetUserId);
        if (existing) return existing.id;

        // 2. Check remote database (Prevent duplicates)
        const { data: remoteExisting } = await conversations.findPrivate(currentUser.id, targetUserId);
        if (remoteExisting) {
            console.log('Found existing private chat on server:', remoteExisting.id);
            await syncConversations(currentUser.id);
            return remoteExisting.id;
        }

        // 3. Create new
        const { data, error } = await conversations.create('private', null, [currentUser.id, targetUserId], currentUser.id);
        if (error) {
            console.error('Create private chat error:', error);
            return null;
        }

        await syncConversations(currentUser.id);
        return data.id;
    };

    // 发送消息
    const sendMessage = async (chatId, content) => {
        if (!currentUser || !content.trim()) return;

        const { data, error } = await messages.send(chatId, currentUser.id, content);

        if (error) {
            console.error('❌ 发送消息失败:', error);
            return { data: null, error };
        }

        if (data) {
            const newMessage = {
                id: data.id,
                senderId: data.sender_id,
                text: data.content,
                time: formatTime(data.created_at),
                timestamp: data.created_at,
                sender: currentUser // Add sender for immediate display
            };

            setMessagesList(prev => {
                const updated = {
                    ...prev,
                    [chatId]: [...(prev[chatId] || []), newMessage]
                };
                cache.set(CACHE_KEYS.MESSAGES, updated, currentUser.id);
                return updated;
            });

            setChats(prev => {
                const chatIndex = prev.findIndex(chat => chat.id === chatId);
                if (chatIndex === -1) return prev;

                const updatedChat = {
                    ...prev[chatIndex],
                    lastMessage: content,
                    time: '刚刚',
                    lastMessageTime: new Date().toISOString()
                };

                const tempChats = [updatedChat, ...prev.filter(c => c.id !== chatId)];
                const sortedChats = sortChats(tempChats);

                cache.set(CACHE_KEYS.CONVERSATIONS, sortedChats, currentUser.id);
                return sortedChats;
            });


            // 检查 AI 回复
            const chat = chats.find(c => c.id === chatId);
            const isJellyChat = chat?.name?.toLowerCase() === 'jelly' ||
                chat?.userId?.toLowerCase?.() === 'jelly' ||
                chat?.name === '果冻';
            if (isJellyChat) {
                triggerJellyReply(chatId, content);
            }
        }
        return { data, error };
    };

    // Jelly AI 回复
    const triggerJellyReply = async (chatId, userMessage) => {
        if (jellyReplyLockRef.current.has(chatId)) return;

        try {
            jellyReplyLockRef.current.add(chatId);
            const history = messagesList[chatId] || [];
            const historyForAI = history.slice(-10).map(msg => ({
                text: msg.text,
                isFromJelly: msg.senderId !== currentUser?.id
            }));

            const aiReply = await aiChat(userMessage, historyForAI);
            const { data: jellyProfile } = await profiles.getByDisplayId('jelly');
            if (!jellyProfile) return;

            const { data: replyData } = await messages.send(chatId, jellyProfile.id, aiReply);

            if (replyData) {
                // 注意：这里我们不需要手动更新 messagesList，因为我们相信 Realtime 订阅会推送这个新消息
                // 但是为了即时响应性，且 AI 回复不像对端用户可能离线，这里也可以乐观更新。
                // 不过既然做了架构优化，我们这里只让后端插入，前端坐等 Realtime 回调！
                // ... 实际上，为了保险（万一 Realtime 还是挂了），还是手动插一下比较好，
                // 记得我们在 subscribeToAll 里做了去重吗？所以这里手动插也是安全的。

                const jellyMessage = {
                    id: replyData.id,
                    senderId: replyData.sender_id,
                    text: replyData.content,
                    time: formatTime(replyData.created_at)
                };

                setMessagesList(prev => {
                    const updated = {
                        ...prev,
                        [chatId]: [...(prev[chatId] || []), jellyMessage]
                    };
                    return updated;
                });
            }
        } catch (error) {
            console.error('Jelly reply error:', error);
        } finally {
            jellyReplyLockRef.current.delete(chatId);
        }
    };

    // 加载聊天消息
    const loadMessages = async (chatId) => {
        const { data } = await messages.list(chatId);
        if (data) {
            setMessagesList(prev => {
                const updated = {
                    ...prev,
                    [chatId]: data.map(msg => ({
                        id: msg.id,
                        senderId: msg.sender_id,
                        text: msg.content,
                        time: formatTime(msg.created_at),
                        timestamp: msg.created_at,
                        sender: msg.sender, // Preserve sender from join
                        message_type: msg.message_type,
                        media_url: msg.media_url
                    }))
                };
                if (currentUser?.id) {
                    cache.set(CACHE_KEYS.MESSAGES, updated, currentUser.id);
                }
                return updated;
            });
        }
    };

    // 这里删除了原来针对 activeChatId 的 useEffect
    // 因为所有消息都由全局 subscribeToAll 处理

    // 切换聊天时加载消息
    useEffect(() => {
        if (activeChatId) {
            // 每次切换都尝试从后端拉取此回话最新消息，防止 Realtime 之前丢失了数据
            loadMessages(activeChatId);
            // 标记已读
            markChatAsRead(activeChatId);
        }
    }, [activeChatId]);

    // 创建帖子、点赞、评论等其他逻辑保持不变...
    // 此处简化，只保留核心，假设未修改部分照旧

    const createPost = async (title, content) => {
        if (!currentUser) return;
        const { data, error } = await postsAPI.create(currentUser.id, title, content);
        if (data) await loadPosts();
        return { data, error };
    };

    const likePost = async (postId) => {
        if (!currentUser) return;
        const post = posts.find(p => p.id === postId);
        const isLiked = post?.likedBy?.includes(currentUser.id);
        if (isLiked) await postsAPI.unlike(postId, currentUser.id);
        else await postsAPI.like(postId, currentUser.id);
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const newLikedBy = isLiked ? p.likedBy.filter(id => id !== currentUser.id) : [...p.likedBy, currentUser.id];
                return { ...p, likedBy: newLikedBy };
            }
            return p;
        }));
    };

    const addComment = async (postId, content) => {
        if (!currentUser || !content) return;
        const { data, error } = await postsAPI.addComment(postId, currentUser.id, content);
        if (data) {
            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    return { ...p, commentsList: [...(p.commentsList || []), { ...data, date: '刚刚' }] };
                }
                return p;
            }));
        }
        return { data, error };
    };

    const saveSettings = async (newSettings) => {
        if (!currentUser) return;
        const updates = {};
        if (newSettings.theme !== undefined) updates.theme = newSettings.theme;
        if (newSettings.bgStyle !== undefined) updates.bg_style = newSettings.bgStyle;
        if (newSettings.bubbleStyle !== undefined) updates.bubble_style = newSettings.bubbleStyle;
        if (newSettings.fontStyle !== undefined) updates.font_style = newSettings.fontStyle;
        await settings.update(currentUser.id, updates);
        const cachedSettings = cache.getData(CACHE_KEYS.USER_SETTINGS, currentUser.id) || {};
        cache.set(CACHE_KEYS.USER_SETTINGS, { ...cachedSettings, ...updates }, currentUser.id);
    };

    useEffect(() => { if (currentUser && !authLoading) saveSettings({ theme }); }, [theme]);
    useEffect(() => { if (currentUser && !authLoading) saveSettings({ bgStyle }); }, [bgStyle]);
    useEffect(() => { if (currentUser && !authLoading) saveSettings({ bubbleStyle }); }, [bubbleStyle]);

    const updateProfile = async (updates) => {
        if (!currentUser) return { error: 'Not authenticated' };
        const { data, error } = await profiles.update(currentUser.id, updates);
        if (data) {
            setUserProfile(data);
            setCurrentUser(prev => ({ ...prev, ...data }));
            cache.set(CACHE_KEYS.USER_PROFILE, data, currentUser.id);
        }
        return { data, error };
    };

    const uploadAvatar = async (file) => {
        if (!currentUser) return { error: 'Not authenticated' };
        const { url, error } = await storage.uploadAvatar(currentUser.id, file);
        if (url) await updateProfile({ avatar_url: url });
        return { url, error };
    };

    const searchUser = async (query) => {
        const { data } = await profiles.search(query);
        return data?.[0] || null;
    };

    const sendFriendRequest = async (friendProfile, message = '') => {
        if (!currentUser) return { success: false, message: 'Not authenticated' };
        const { data, error } = await friendships.sendRequest(currentUser.id, friendProfile.id, message);
        if (error) return { success: false, message: error.message };
        if (data?.status === 'accepted') {
            setFriends(prev => {
                const updated = [...prev, friendProfile];
                cache.set(CACHE_KEYS.FRIENDS_LIST, updated, currentUser.id);
                return updated;
            });
            const { data: conv } = await conversations.create('private', null, [currentUser.id, friendProfile.id], currentUser.id);
            if (conv) {
                await syncConversations(currentUser.id);
                setActiveChatId(conv.id);
            }
            return { success: true, message: '已成为好友！' };
        }
        return { success: true, message: '好友请求已发送' };
    };

    const loadPendingRequests = async () => {
        if (!currentUser) return;
        const { data } = await friendships.getPendingRequests(currentUser.id);
        setPendingRequests(data || []);
    };

    const acceptFriendRequest = async (requestId, senderProfile) => {
        if (!currentUser) return { success: false };
        const { error } = await friendships.acceptRequest(requestId, currentUser.id);
        if (error) return { success: false, message: error.message };
        setFriends(prev => {
            const updated = [...prev, senderProfile];
            cache.set(CACHE_KEYS.FRIENDS_LIST, updated, currentUser.id);
            return updated;
        });
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        const { data: conv } = await conversations.create('private', null, [currentUser.id, senderProfile.id], currentUser.id);
        if (conv) await syncConversations(currentUser.id);
        return { success: true };
    };

    const rejectFriendRequest = async (requestId) => {
        if (!currentUser) return { success: false };
        const { error } = await friendships.rejectRequest(requestId, currentUser.id);
        if (error) return { success: false, message: error.message };
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        return { success: true };
    };

    const addFriend = sendFriendRequest;



    const loadUnreadCounts = () => { };
    const markChatAsRead = (chatId) => {
        if (!chatId) return;
        setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
    };
    const enterChat = async (chatId) => {
        setActiveChatId(chatId);
        if (chatId) await markChatAsRead(chatId);
    };

    const openModal = (name) => {
        console.log('openModal called with:', name);
        console.log('Current modals state:', modals);
        setModals(prev => {
            const newState = { ...prev, [name]: true };
            console.log('New modals state:', newState);
            return newState;
        });
    };
    const closeModal = (name) => setModals(prev => ({ ...prev, [name]: false }));
    const openOverlay = (name) => setOverlays(prev => ({ ...prev, [name]: true }));
    const closeOverlay = (name) => setOverlays(prev => ({ ...prev, [name]: false }));

    const openPostDetail = async (post) => {
        setViewedPost(post);
        const { data: comments } = await postsAPI.getComments(post.id);
        if (comments) {
            setViewedPost(prev => ({
                ...prev,
                commentsList: comments.map(c => ({
                    id: c.id,
                    authorId: c.author_id,
                    content: c.content,
                    date: formatDate(c.created_at),
                    author: c.author
                }))
            }));
        }
        openModal('postDetail');
    };

    // 获取用户信息（本地缓存）
    const getUserById = (userId) => {
        if (userId === currentUser?.id) return userProfile;
        return friends.find(f => f.id === userId) || null;
    };

    const fetchFullProfile = async (userId) => {
        if (!userId) return null;
        if (userId === currentUser?.id) return userProfile || currentUser;
        try {
            const { data } = await profiles.get(userId);
            return data;
        } catch (error) {
            return null;
        }
    };

    const formatTime = (dateString, isFullDate = false) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const diff = now - date;

        // 如果需要完整日期 (如帖子详情)
        if (isFullDate) {
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // 刚刚 (1分钟内)
        if (diff < 60000) return '刚刚';

        // 分钟前 (1小时内)
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;

        // 小时前 (24小时内)
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;

        // 昨天
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (date.getDate() === yesterday.getDate() &&
            date.getMonth() === yesterday.getMonth() &&
            date.getFullYear() === yesterday.getFullYear()) {
            return '昨天';
        }

        // 几天前 (7天内)
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

        // 日期 (超过7天)
        return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    };

    const formatDate = (dateString) => {
        return formatTime(dateString, true);
    };

    // 排序辅助函数
    const sortChats = (chats) => {
        return [...chats].sort((a, b) => {
            // 优先使用时间戳排序
            const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            return timeB - timeA;
        });
    };

    // 计算群聊列表（用于好友页显示）
    const groupChats = useMemo(() => {
        return chats
            .filter(c => c.type === 'group')
            .map(c => ({
                id: c.id,
                name: c.name,
                memberCount: c.memberCount || 0
            }));
    }, [chats]);

    const value = {
        currentUser: userProfile || currentUser,
        isAuthenticated,
        authLoading,
        login, register, logout,
        isLoading, setIsLoading,
        activeTab, setActiveTab,
        activeChatId, setActiveChatId,
        theme, setTheme,
        bgStyle, setBgStyle,
        bubbleStyle, setBubbleStyle,
        fontStyle, setFontStyle,
        chats, messages: messagesList, posts, friends, groupChats,
        sendMessage, createPost, likePost, addComment, searchUser,
        addFriend, sendFriendRequest, loadPendingRequests, acceptFriendRequest, rejectFriendRequest,
        pendingRequests, createGroup, addGroupMembers, createPrivateChat, updateProfile, uploadAvatar, getUserById, fetchFullProfile,
        unreadCounts, loadUnreadCounts, markChatAsRead, enterChat,
        modals, openModal, closeModal,
        overlays, openOverlay, closeOverlay,
        viewedPost, setViewedPost, openPostDetail,
        viewedProfile, setViewedProfile,
        isSidebarCollapsed, toggleSidebar,
        realtimeStatus // 暴露连接状态
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within an AppProvider');
    return context;
}
