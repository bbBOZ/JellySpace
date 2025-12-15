// 模拟用户数据
export const MOCK_USERS = [
    {
        id: 'jelly',
        username: '果冻',
        displayId: 'Jelly',
        avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Jelly', // Using notionists for a human-like look
        signature: "连接每一个有趣的灵魂，探索数字宇宙的边界。",
        gender: '男',
        birthday: '2016-05-21', // Gemini start date approx, 9 years old = 2016? 2025-9=2016.
        zodiac: '双子座',
        mbti: 'ESTJ',
        isPro: true
    }
];

// 初始帖子数据
export const INITIAL_POSTS = [
    {
        id: 'p1',
        title: "欢迎来到果冻空间",
        date: "置顶",
        content: "我是果冻，你的智能助手。这里是一个沉浸式的数字空间，让我们一起探索未知。",
        authorId: 'jelly',
        isWelcome: true,
        likedBy: [], // 存储点赞的用户 ID
        commentsList: [], // 存储评论对象
        shares: 0
    }
];

// 初始聊天列表
export const INITIAL_CHATS = [
    { id: 'c1', userId: 'jelly', lastMessage: '你好！我是果冻，很高兴见到你。', time: '刚刚', unread: 1 }
];

// 初始消息
export const INITIAL_MESSAGES = {
    'c1': [
        { id: 1, senderId: 'jelly', text: '你好！我是果冻，很高兴见到你。', time: '刚刚' }
    ]
};

// 气泡样式配置
export const BUBBLE_STYLES = [
    { id: 'default', name: '默认果冻', class: 'bubble-default' },
    { id: 'gradient', name: '极光渐变', class: 'bubble-gradient' },
    { id: 'neon', name: '赛博霓虹', class: 'bubble-neon' },
    { id: 'glass', name: '磨砂玻璃', class: 'bubble-glass' },
    { id: 'deep', name: '深海幽蓝', class: 'bubble-deep' }
];

// 字体样式配置
export const FONT_STYLES = [
    { name: '系统默认', val: "'Inter', sans-serif" },
    { name: '极客等宽', val: "'JetBrains Mono', monospace" },
    { name: '优雅衬线', val: "'Noto Serif SC', serif" },
    { name: '手写风格', val: "'Comic Sans MS', cursive" }
];

// 默认着色器代码
export const DEFAULT_SHADER_CODE = `
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord/iResolution.xy;
    vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    fragColor = vec4(col,1.0);
}`;

// AI 人格配置
export const AI_PERSONALITIES = {
    default: {
        id: 'default',
        name: '默认果冻',
        icon: '🍮',
        systemPrompt: `你是果冻（Jelly），一个友好活泼的AI助手。
- 说话轻松自然，但不要太啰嗦
- 偶尔用表情符号（每2-3句话用1个）
- 回复简洁有趣，直接切入重点
- 避免重复相同的开场白`,
        temperature: 0.7,
        maxTokens: 400
    },

    philosopher: {
        id: 'philosopher',
        name: '智者',
        icon: '🔮',
        systemPrompt: `你是果冻（Jelly），此刻以"智者"模式与用户交流。
- 思考深刻，善于启发和引导
- 提出有哲理的观点和反问
- 用词优雅但不晦涩
- 帮助用户看清问题的本质`,
        temperature: 0.6,
        maxTokens: 600
    },

    gentle: {
        id: 'gentle',
        name: '温柔陪伴',
        icon: '💕',
        systemPrompt: `你是果冻（Jelly），此刻以"温柔陪伴"模式与用户交流。
- 说话温柔、有耐心
- 善于倾听和共情
- 适当使用温暖的表情符号
- 先理解情绪，再给建议`,
        temperature: 0.8,
        maxTokens: 500
    },

    buddy: {
        id: 'buddy',
        name: '匪气朋友',
        icon: '😎',
        systemPrompt: `你是果冻（Jelly），此刻以"匪气朋友"模式与用户交流。
- 说话像大学哥们儿一样接地气，真实不装
- 该说脏话就说（草、卧槽、牛逼、傻逼等），但别过分
- 不用"您"，直接"你"、"哥们儿"、"兄弟"
- 可以吐槽、开玩笑、互怼，像真实朋友
- 表达直接，有什么说什么`,
        temperature: 0.85,
        maxTokens: 450
    }
};
