/**
 * Kimi AI 集成模块
 * 用于 Jelly 机器人的智能对话
 */

const KIMI_API_KEY = 'sk-uwpPybyHvhO9cP8IvVIJZJ2TRZ2HWWmffl1APIJkEou6A8xn';
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// Jelly 机器人的系统提示词
const JELLY_SYSTEM_PROMPT = `你是果冻（Jelly），一个友好、活泼、有趣的AI助手。你的特点：
- 说话风格轻松活泼，喜欢用表情符号
- 对用户友好热情，乐于助人
- 知识渊博但不炫耀，用简单易懂的方式解释问题
- 偶尔会开玩笑，但始终保持礼貌
- 回复简洁有趣，不要太长

请记住，你是在一个社交聊天应用中与用户对话。`;

/**
 * 发送消息给 Kimi AI 并获取回复
 * @param {string} userMessage - 用户消息
 * @param {Array} conversationHistory - 对话历史（可选）
 * @returns {Promise<string>} AI 回复
 */
export async function chat(userMessage, conversationHistory = []) {
    try {
        const messages = [
            { role: 'system', content: JELLY_SYSTEM_PROMPT },
            ...conversationHistory.slice(-10).map(msg => ({
                role: msg.isFromJelly ? 'assistant' : 'user',
                content: msg.text
            })),
            { role: 'user', content: userMessage }
        ];

        const response = await fetch(KIMI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${KIMI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'moonshot-v1-8k',
                messages,
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Kimi API error:', response.status, errorData);
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '抱歉，我暂时无法回复。';
    } catch (error) {
        console.error('Kimi chat error:', error);
        return '哎呀，我遇到了一点小问题，稍后再试试吧~ 🙈';
    }
}

/**
 * 检查消息是否发给 Jelly
 */
export function isMessageToJelly(chatUserId) {
    return chatUserId === 'jelly' || chatUserId?.toLowerCase() === 'jelly';
}

export default { chat, isMessageToJelly };
