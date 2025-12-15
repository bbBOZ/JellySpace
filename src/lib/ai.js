/**
 * Kimi AI 集成模块
 * 用于 Jelly 机器人的智能对话
 * 支持多人格切换
 */

import { AI_PERSONALITIES } from '../data/constants';

const KIMI_API_KEY = 'sk-uwpPybyHvhO9cP8IvVIJZJ2TRZ2HWWmffl1APIJkEou6A8xn';
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * 根据人格ID和响应风格获取AI配置
 * @param {string} personalityId - 人格ID (default/philosopher/gentle/buddy)
 * @param {string} responseStyle - 响应风格 (short/medium/long)
 * @returns {Object} AI配置对象
 */
export function getAIConfig(personalityId = 'default', responseStyle = 'medium') {
    const personality = AI_PERSONALITIES[personalityId] || AI_PERSONALITIES.default;

    // 根据响应风格调整 maxTokens
    const tokenMultiplier = {
        short: 0.6,
        medium: 1,
        long: 1.5
    };

    return {
        systemPrompt: personality.systemPrompt,
        temperature: personality.temperature,
        maxTokens: Math.floor(personality.maxTokens * (tokenMultiplier[responseStyle] || 1))
    };
}

/**
 * 发送消息给 Kimi AI 并获取回复
 * @param {string} userMessage - 用户消息
 * @param {Array} conversationHistory - 对话历史（可选）
 * @param {Object} config - AI配置（可选）
 * @returns {Promise<string>} AI 回复
 */
export async function chat(userMessage, conversationHistory = [], config = {}) {
    const {
        systemPrompt = AI_PERSONALITIES.default.systemPrompt,
        temperature = 0.7,
        maxTokens = 500
    } = config;

    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-8).map(msg => ({
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
                temperature,
                max_tokens: maxTokens
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

export default { chat, getAIConfig, isMessageToJelly };
