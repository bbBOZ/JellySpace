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
