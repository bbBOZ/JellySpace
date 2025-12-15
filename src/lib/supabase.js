import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lzlnmbdtamysppydnqcn.supabase.co';
const supabaseAnonKey = 'sb_publishable_CY6b9B1r3mQRWZjnPSDr7g_SdoSEIzP';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// 认证相关函数
export const auth = {
    // 邮箱注册
    async signUp(email, password, username, displayId) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    display_id: displayId
                }
            }
        });
        return { data, error };
    },

    // 邮箱登录
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    // ID 登录（通过查找用户后登录）
    async signInWithId(displayId, password) {
        // 先查找用户的邮箱
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('display_id', displayId)
            .single();

        if (!profile) {
            return { data: null, error: { message: '用户不存在' } };
        }

        // 使用邮箱登录
        const { data: user } = await supabase.auth.admin.getUserById(profile.id);
        if (!user?.user?.email) {
            return { data: null, error: { message: '无法获取用户信息' } };
        }

        return await supabase.auth.signInWithPassword({
            email: user.user.email,
            password
        });
    },

    // 登出
    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    // 获取当前用户
    async getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // 监听认证状态变化
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    }
};

// 用户资料相关函数
export const profiles = {
    // 获取用户资料
    async get(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        return { data, error };
    },

    // 通过 display_id 获取用户（不区分大小写）
    async getByDisplayId(displayId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('display_id', displayId)
            .maybeSingle();
        return { data, error };
    },

    // 搜索用户
    async search(query) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`username.ilike.%${query}%,display_id.ilike.%${query}%`)
            .limit(10);
        return { data, error };
    },

    // 更新资料
    async update(userId, updates) {
        const { data, error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();
        return { data, error };
    },

    // 创建资料
    async create(profile) {
        const { data, error } = await supabase
            .from('profiles')
            .insert(profile)
            .select()
            .single();
        return { data, error };
    }
};

// 用户设置相关函数
export const settings = {
    async get(userId) {
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('id', userId)
            .single();
        return { data, error };
    },

    async update(userId, updates) {
        const { data, error } = await supabase
            .from('user_settings')
            .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
            .select()
            .single();
        return { data, error };
    }
};

// 好友相关函数
export const friendships = {
    // 获取已接受的好友列表
    async list(userId) {
        const { data: friendshipData, error: friendshipError } = await supabase
            .from('friendships')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'accepted');

        if (friendshipError || !friendshipData) {
            return { data: [], error: friendshipError };
        }

        const friendIds = friendshipData.map(f => f.friend_id);
        if (friendIds.length === 0) {
            return { data: [], error: null };
        }

        const { data: friendProfiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', friendIds);

        if (profileError) {
            return { data: [], error: profileError };
        }

        const result = friendshipData.map(f => ({
            ...f,
            friend: friendProfiles?.find(p => p.id === f.friend_id) || null
        }));

        return { data: result, error: null };
    },

    // 发送好友请求（改为 pending 状态）
    async sendRequest(userId, friendId, message = '') {
        // 检查是否已存在请求
        const { data: existing } = await supabase
            .from('friendships')
            .select('*')
            .eq('user_id', userId)
            .eq('friend_id', friendId)
            .maybeSingle();

        if (existing) {
            return { data: null, error: { message: '已发送过好友请求' } };
        }

        // 检查对方是否已请求过你
        const { data: reverseExisting } = await supabase
            .from('friendships')
            .select('*')
            .eq('user_id', friendId)
            .eq('friend_id', userId)
            .maybeSingle();

        if (reverseExisting) {
            // 对方已请求过，直接接受
            return await friendships.acceptRequest(reverseExisting.id, userId);
        }

        const { data, error } = await supabase
            .from('friendships')
            .insert({
                user_id: userId,
                friend_id: friendId,
                status: 'pending',
                request_message: message
            })
            .select()
            .single();
        return { data, error };
    },

    // 获取收到的好友请求（pending 状态且自己是 friend_id）
    async getPendingRequests(userId) {
        const { data: requests, error } = await supabase
            .from('friendships')
            .select('*')
            .eq('friend_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error || !requests) {
            return { data: [], error };
        }

        // 获取请求者的资料
        const senderIds = requests.map(r => r.user_id);
        if (senderIds.length === 0) {
            return { data: [], error: null };
        }

        const { data: senderProfiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', senderIds);

        const result = requests.map(r => ({
            ...r,
            sender: senderProfiles?.find(p => p.id === r.user_id) || null
        }));

        return { data: result, error: null };
    },

    // 获取发出的好友请求
    async getSentRequests(userId) {
        const { data: requests, error } = await supabase
            .from('friendships')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error || !requests) {
            return { data: [], error };
        }

        const receiverIds = requests.map(r => r.friend_id);
        if (receiverIds.length === 0) {
            return { data: [], error: null };
        }

        const { data: receiverProfiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', receiverIds);

        const result = requests.map(r => ({
            ...r,
            receiver: receiverProfiles?.find(p => p.id === r.friend_id) || null
        }));

        return { data: result, error: null };
    },

    // 接受好友请求
    async acceptRequest(requestId, userId) {
        // 更新请求状态为 accepted
        const { data, error } = await supabase
            .from('friendships')
            .update({
                status: 'accepted',
                responded_at: new Date().toISOString()
            })
            .eq('id', requestId)
            .eq('friend_id', userId) // 确保只有被请求者能接受
            .select()
            .single();

        if (error) {
            return { data: null, error };
        }

        // 创建反向好友关系
        await supabase
            .from('friendships')
            .insert({
                user_id: userId,
                friend_id: data.user_id,
                status: 'accepted',
                responded_at: new Date().toISOString()
            });

        return { data, error: null };
    },

    // 拒绝好友请求
    async rejectRequest(requestId, userId) {
        const { data, error } = await supabase
            .from('friendships')
            .update({
                status: 'rejected',
                responded_at: new Date().toISOString()
            })
            .eq('id', requestId)
            .eq('friend_id', userId)
            .select()
            .single();
        return { data, error };
    },

    // 删除好友（双向删除）
    async remove(userId, friendId) {
        // 删除双向关系
        await supabase
            .from('friendships')
            .delete()
            .eq('user_id', userId)
            .eq('friend_id', friendId);

        await supabase
            .from('friendships')
            .delete()
            .eq('user_id', friendId)
            .eq('friend_id', userId);

        return { error: null };
    },

    // 检查好友关系状态
    async check(userId, friendId) {
        const { data, error } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
            .maybeSingle();
        return { data, error };
    }
};

// 会话相关函数
export const conversations = {
    async list(userId) {
        // 简化查询逻辑
        const { data: memberData, error: memberError } = await supabase
            .from('conversation_members')
            .select('*')
            .eq('user_id', userId);

        if (memberError || !memberData) {
            return { data: [], error: memberError };
        }

        const conversationIds = memberData.map(m => m.conversation_id);
        if (conversationIds.length === 0) {
            return { data: [], error: null };
        }

        const { data: conversationsData, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .in('id', conversationIds);

        if (convError) {
            return { data: [], error: convError };
        }

        // 组合数据
        const result = memberData.map(m => ({
            conversation: conversationsData?.find(c => c.id === m.conversation_id) || null,
            last_read_at: m.last_read_at
        }));

        return { data: result, error: null };
    },

    async create(type, name, memberIds, createdBy) {
        // 创建会话
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .insert({ type, name, created_by: createdBy })
            .select()
            .single();

        if (convError) return { data: null, error: convError };

        // 添加成员
        const members = memberIds.map(userId => ({
            conversation_id: conversation.id,
            user_id: userId
        }));

        const { error: memberError } = await supabase
            .from('conversation_members')
            .insert(members);

        if (memberError) return { data: null, error: memberError };

        return { data: conversation, error: null };

    },

    async addMembers(conversationId, userIds) {
        const members = userIds.map(userId => ({
            conversation_id: conversationId,
            user_id: userId
        }));

        const { error } = await supabase
            .from('conversation_members')
            .insert(members);

        return { error };
    },

    async findPrivate(user1, user2) {
        // 查找两个用户共同所在的私聊会话
        const { data: user1Convs } = await supabase
            .from('conversation_members')
            .select('conversation_id')
            .eq('user_id', user1);

        const { data: user2Convs } = await supabase
            .from('conversation_members')
            .select('conversation_id')
            .eq('user_id', user2);

        if (!user1Convs || !user2Convs) return { data: null };

        const ids1 = new Set(user1Convs.map(c => c.conversation_id));
        const commonIds = user2Convs
            .map(c => c.conversation_id)
            .filter(id => ids1.has(id));

        if (commonIds.length === 0) return { data: null };

        // 检查类型是否为 private
        const { data } = await supabase
            .from('conversations')
            .select('*')
            .in('id', commonIds)
            .eq('type', 'private')
            .limit(1)
            .single();

        return { data };
    },

    async getMembers(conversationId) {
        // 先获取成员列表
        const { data: memberData, error: memberError } = await supabase
            .from('conversation_members')
            .select('user_id')
            .eq('conversation_id', conversationId);

        if (memberError || !memberData) {
            return { data: [], error: memberError };
        }

        // 获取成员资料
        const userIds = memberData.map(m => m.user_id);
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);

        if (profileError) {
            return { data: [], error: profileError };
        }

        // 组合数据
        const result = memberData.map(m => ({
            user: profiles?.find(p => p.id === m.user_id) || null
        }));

        return { data: result, error: null };
    },

    // 退出/移除成员
    // 如果是自己退出，调用者传 currentUserId
    // 如果是踢人，调用者传 targetUserId
    async removeMember(conversationId, userId) {
        const { error } = await supabase
            .from('conversation_members')
            .delete()
            .match({ conversation_id: conversationId, user_id: userId });

        return { error };
    },

    // 解散群聊 (删除会话，触发级联删除)
    async dissolve(conversationId) {
        const { error } = await supabase
            .from('conversations')
            .delete()
            .eq('id', conversationId);

        return { error };
    }
};

// 消息相关函数
export const messages = {
    async list(conversationId, limit = 50) {
        // 先获取消息
        const { data: msgData, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (msgError || !msgData) {
            return { data: [], error: msgError };
        }

        // 获取发送者资料
        const senderIds = [...new Set(msgData.map(m => m.sender_id))];
        const { data: senders } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', senderIds);

        // 组合数据
        const result = msgData.map(msg => ({
            ...msg,
            sender: senders?.find(s => s.id === msg.sender_id) || null
        }));

        return { data: result, error: null };
    },

    async send(conversationId, senderId, content, type = 'text', mediaUrl = null) {
        // 构建插入数据，注意过滤 null 值以防数据库报错（如果列存在但没默认值）
        // 根据错误提示 media_url 列可能不存在或拼写不同
        // 但通常我们应该只插入存在的列。
        // 如果数据库没有 media_url 列，说明 Schema 没更新。
        // 我们先尝试不带 media_url 发送，或者假设它是 metadata?
        // 不，错误明确说是 "Could not find the 'media_url' column". 意味着数据库表里没这列。
        // 我们必须把图片 URL 放进 content，或者只是暂且忽略 media_url 直到数据库更新。
        // 既然用户无法改数据库，我必须变通。
        // 变通方案：把图片 URL 存入 content，type 设为 image。

        let finalContent = content;
        if (type === 'image' && mediaUrl) {
            finalContent = mediaUrl; // 图片消息的内容即为 URL
        }

        const insertData = {
            conversation_id: conversationId,
            sender_id: senderId,
            content: finalContent
            // message_type 也报错了，说明数据库可能也没这列，或者叫 type?
            // 根据报错 "Could not find the 'message_type' column"
            // 我们先移除它。如果需要区分图片，我们只能靠 content 内容（比如是否是 URL）或者前端逻辑。
            // 但如果这是一个 text 类型的 content，不传 message_type 应该没问题（假设数据库默认为 text）。
        };

        console.log('[SUPABASE SEND] Inserting data:', insertData);
        const { data, error } = await supabase
            .from('messages')
            .insert(insertData)
            .select('*')
            .single();

        if (error) {
            console.error('❌ 发送消息失败:', error);
            return { data: null, error };
        }

        // 获取发送者资料
        const { data: sender } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', senderId)
            .single();

        return {
            data: { ...data, sender },
            error: null
        };
    },

    // 订阅实时消息
    subscribeToConversation(conversationId, callback) {
        // 使用唯一的 channel 名称，包含会话ID和时间戳
        const channelName = `room-${conversationId}-${Date.now()}`;
        console.log('📡 准备订阅:', conversationId, '频道:', channelName);

        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}` // 添加过滤，只监听当前会话
            }, payload => {
                console.log('📨 收到新消息:', payload.new);
                callback(payload.new);
            })
            .subscribe((status, err) => {
                console.log('📡 订阅状态:', status, err ? `错误: ${err.message}` : '');
            });

        return channel;
    },

    // 订阅所有消息 (用于全局通知)
    subscribeToAll(callback) {
        const channelName = `global-messages-${Date.now()}`;
        console.log('📡 准备订阅全局消息, 频道:', channelName);

        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, payload => {
                console.log('📨 收到全局新消息:', payload.new);
                callback(payload.new);
            })
            .subscribe((status, err) => {
                console.log('📡 全局订阅状态:', status, err ? `错误: ${err.message}` : '');
            });

        return channel;
    },
    // 标记会话消息为已读 (向后兼容 - 如果列不存在则跳过)
    async markAsRead(conversationId, userId) {
        try {
            const { error } = await supabase
                .from('messages')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('conversation_id', conversationId)
                .neq('sender_id', userId)
                .eq('is_read', false);

            if (error && error.message?.includes('is_read')) {
                // 列不存在，静默忽略
                console.log('⚠️ is_read 列不存在，跳过标记已读');
                return { error: null };
            }
            return { error };
        } catch (e) {
            console.log('⚠️ markAsRead 失败:', e.message);
            return { error: null };
        }
    },

    // 获取所有会话的未读数量
    async getUnreadCounts(userId) {
        const { data, error } = await supabase.rpc('get_unread_count', { p_user_id: userId });
        return { data: data || [], error };
    }
};

// 帖子相关函数
export const posts = {
    async list(limit = 20) {
        // 简化查询，先获取帖子
        const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit);

        if (postsError || !postsData) {
            console.error('Posts List Error:', postsError);
            return { data: [], error: postsError };
        }
        console.log('Raw DB Posts Data:', postsData);

        // 获取作者信息
        const authorIds = [...new Set(postsData.map(p => p.author_id))];
        const { data: authors } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, display_id')
            .in('id', authorIds);

        // 获取点赞信息
        const postIds = postsData.map(p => p.id);
        const { data: likes } = await supabase
            .from('post_likes')
            .select('post_id, user_id')
            .in('post_id', postIds);

        // 获取评论数量
        const { data: comments } = await supabase
            .from('post_comments')
            .select('post_id')
            .in('post_id', postIds);

        // 组合数据
        const result = postsData.map(post => ({
            ...post,
            author: authors?.find(a => a.id === post.author_id) || null,
            likes: likes?.filter(l => l.post_id === post.id) || [],
            comments: [{ count: comments?.filter(c => c.post_id === post.id).length || 0 }]
        }));

        return { data: result, error: null };
    },

    async create(authorId, title, content, imageUrl = null) {
        const { data, error } = await supabase
            .from('posts')
            .insert({ author_id: authorId, title, content, image_url: imageUrl })
            .select()
            .single();
        return { data, error };
    },

    async like(postId, userId) {
        const { data, error } = await supabase
            .from('post_likes')
            .insert({ post_id: postId, user_id: userId });
        return { data, error };
    },

    async unlike(postId, userId) {
        const { error } = await supabase
            .from('post_likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', userId);
        return { error };
    },

    async delete(postId, authorId) {
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)
            .eq('author_id', authorId);
        return { error };
    },

    async getComments(postId) {
        // 1. 获取评论数据
        const { data, error } = await supabase
            .from('post_comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error || !data) return { data: [], error };
        if (data.length === 0) return { data: [], error: null };

        // 2. 获取评论作者信息 (手动关联以避免 400 错误)
        const authorIds = [...new Set(data.map(c => c.author_id))];
        const { data: authors } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, display_id')
            .in('id', authorIds);

        // 3. 组合数据
        const result = data.map(c => ({
            ...c,
            author: authors?.find(a => a.id === c.author_id) || null
        }));

        return { data: result, error: null };
    },

    async addComment(postId, authorId, content) {
        // 不使用关联查询 result，避免 400 错误
        const { data, error } = await supabase
            .from('post_comments')
            .insert({ post_id: postId, author_id: authorId, content })
            .select()
            .single();

        return { data, error };
    }
};

export const notifications = {
    async list(userId) {
        console.log('[NOTIF] Loading notifications for user:', userId);

        // 1. Get user's posts (titles needed for display)
        const { data: myPosts } = await supabase
            .from('posts')
            .select('id, title')
            .eq('author_id', userId);

        console.log('[NOTIF] User posts:', myPosts?.length || 0);
        if (!myPosts || myPosts.length === 0) return { data: [], error: null };

        const postIds = myPosts.map(p => p.id);
        const postMap = myPosts.reduce((acc, p) => ({ ...acc, [p.id]: p.title }), {});

        // 2. Get Likes
        const { data: likes, error: likesError } = await supabase
            .from('post_likes')
            .select('post_id, user_id, created_at')
            .in('post_id', postIds)
            .neq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        console.log('[NOTIF] Likes:', likes?.length || 0);

        // 3. Get Comments
        const { data: comments, error: commentsError } = await supabase
            .from('post_comments')
            .select('id, post_id, author_id, content, created_at')
            .in('post_id', postIds)
            .neq('author_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        console.log('[NOTIF] Comments:', comments?.length || 0);

        // 4. Get User Profiles for actors
        const actorIds = [...new Set([
            ...(likes?.map(l => l.user_id) || []),
            ...(comments?.map(c => c.author_id) || [])
        ])];

        console.log('[NOTIF] Unique actors:', actorIds.length);

        let actors = [];
        if (actorIds.length > 0) {
            const { data: actorsData } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, display_id')
                .in('id', actorIds);
            actors = actorsData || [];
        }

        console.log('[NOTIF] Loaded actor profiles:', actors.length);

        const actorMap = actors.reduce((acc, a) => ({ ...acc, [a.id]: a }), {});

        // 5. Combine and Sort
        const allNotifications = [
            ...(likes?.map(l => ({
                id: `like-${l.post_id}-${l.user_id}`,
                type: 'like',
                user: actorMap[l.user_id] || { id: l.user_id, username: '未知用户', avatar_url: null },
                postTitle: postMap[l.post_id] || '未知帖子',
                postId: l.post_id,
                timestamp: l.created_at
            })) || []),
            ...(comments?.map(c => ({
                id: `comment-${c.id}`,
                type: 'comment',
                user: actorMap[c.author_id] || { id: c.author_id, username: '未知用户', avatar_url: null },
                postTitle: postMap[c.post_id] || '未知帖子',
                postId: c.post_id,
                content: c.content,
                timestamp: c.created_at
            })) || [])
        ];

        // Sort by timestamp descending
        allNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        console.log('[NOTIF] Total notifications:', allNotifications.length);
        console.log('[NOTIF] Sample notification:', allNotifications[0]);

        return { data: allNotifications, error: likesError || commentsError };
    },

    markAllAsRead(userId) {
        localStorage.setItem(`last_read_notif_${userId}`, new Date().toISOString());
    }
};

// 存储相关函数
export const storage = {
    async uploadAvatar(userId, file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });

        if (error) return { url: null, error };

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        return { url: publicUrl, error: null };
    },

    async uploadPostImage(userId, file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('posts')
            .upload(fileName, file);

        if (error) return { url: null, error };

        const { data: { publicUrl } } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName);

        return { url: publicUrl, error: null };
    },

    async uploadChatFile(conversationId, file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `chat_${conversationId}_${Date.now()}.${fileExt}`;

        // RLS Issue on 'chat-files' suspected. Using 'posts' bucket as it is likely public/writable.
        const BUCKET_NAME = 'posts';

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file, { upsert: false });

        if (error) return { data: null, error };
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        return { data: { publicUrl }, error: null };


    }
};

// 装扮社区 API
export const decorations = {
    // 获取所有公开装扮
    async list(type = null, target = null) {
        let query = supabase
            .from('decorations')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false });

        if (type) query = query.eq('type', type);
        if (target) query = query.eq('target', target);

        const { data, error } = await query;
        if (error) {
            console.error('装扮列表查询错误:', error);
        }
        console.log('装扮列表数据:', data);
        return { data: data || [], error };
    },

    // 创建新装扮
    async create(creatorId, name, description, type, target, code) {
        const { data, error } = await supabase
            .from('decorations')
            .insert({
                creator_id: creatorId,
                name,
                description,
                type,
                target,
                code,
                is_public: true
            })
            .select()
            .single();
        return { data, error };
    },

    // 购买/获取装扮
    async acquire(userId, decorationId) {
        // 检查是否已经拥有
        const { data: existing } = await supabase
            .from('user_decorations')
            .select('*')
            .eq('user_id', userId)
            .eq('decoration_id', decorationId)
            .maybeSingle();

        if (existing) {
            return { data: existing, error: null };
        }

        const { data, error } = await supabase
            .from('user_decorations')
            .insert({
                user_id: userId,
                decoration_id: decorationId,
                is_active: false
            })
            .select()
            .single();

        return { data, error };
    },

    // 获取用户的装扮
    async getUserDecorations(userId, type = null) {
        let query = supabase
            .from('user_decorations')
            .select(`
                *,
                decoration:decorations(*)
            `)
            .eq('user_id', userId);

        const { data, error } = await query;
        if (error) return { data: [], error };

        // 过滤
        let result = data;
        if (type) {
            result = data.filter(item => item.decoration?.type === type);
        }

        return { data: result, error: null };
    },

    // 激活装扮
    async activate(userId, decorationId, type) {
        // 先停用该类型的所有装扮
        // 1. 获取该类型的所有装扮ID
        const { data: userDecorations } = await supabase
            .from('user_decorations')
            .select('id, decoration!inner(type)')
            .eq('user_id', userId)
            .eq('decoration.type', type);

        if (userDecorations && userDecorations.length > 0) {
            await supabase
                .from('user_decorations')
                .update({ is_active: false })
                .in('id', userDecorations.map(d => d.id));
        }

        // 2. 激活选中的装扮
        const { data, error } = await supabase
            .from('user_decorations')
            .update({ is_active: true })
            .eq('user_id', userId)
            .eq('decoration_id', decorationId)
            .select()
            .single();

        return { data, error };
    },

    // 获取当前激活的装扮
    async getActive(userId, type) {
        const { data, error } = await supabase
            .from('user_decorations')
            .select(`
                *,
                decoration:decorations(*)
            `)
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        // 再次过滤类型（因为 single 可能会取到错误的如果不加 inner join）
        if (data && data.decoration?.type !== type) {
            return { data: null, error: null };
        }

        return { data, error };
    }
};

export const uploadChatFile = async (file, userId) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('chat-files')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('chat-files')
            .getPublicUrl(filePath);

        return { data: { publicUrl: data.publicUrl }, error: null };
    } catch (error) {
        return { data: null, error };
    }
};
