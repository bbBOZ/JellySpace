import { useState, useEffect, useRef } from 'react';
import { X, Send, Wifi, WifiOff, Activity, Globe, Shield, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function StarLinkChat({ onClose }) {
    const { currentUser } = useApp();
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [wsUrl, setWsUrl] = useState('');
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const wsRef = useRef(null);
    const msgScrollRef = useRef(null);

    useEffect(() => {
        if (msgScrollRef.current) {
            msgScrollRef.current.scrollTop = msgScrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    const connectToStarLink = () => {
        if (!wsUrl) return;
        if (wsRef.current) wsRef.current.close();

        setConnectionStatus('connecting');
        try {
            const socket = new WebSocket(wsUrl);
            wsRef.current = socket;

            socket.onopen = () => {
                setConnectionStatus('connected');
                socket.send(JSON.stringify({
                    type: 'message',
                    user: currentUser?.username || 'Guest',
                    text: `[系统] 这里的JellySpace节点 ${currentUser?.display_id || 'Unknown'} 已建立上行链路`
                }));
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === "message" || !data.type) {
                        const messageText = data.text || data.content || data.message;
                        if (!messageText || messageText.includes("CMD:")) return;

                        setMessages(prev => [...prev, {
                            id: Date.now() + Math.random(),
                            type: 'text',
                            sender: data.user || 'Unknown',
                            content: messageText,
                            isSelf: false
                        }]);
                    }
                    else if (data.type === "image") {
                        setMessages(prev => [...prev, {
                            id: Date.now() + Math.random(),
                            type: 'image',
                            sender: data.user || 'Unknown',
                            content: data.data,
                            isSelf: false
                        }]);
                    }
                } catch (err) {
                    console.error('消息解析失败:', err);
                }
            };

            socket.onerror = () => setConnectionStatus('error');
            socket.onclose = () => setConnectionStatus('disconnected');
        } catch (err) {
            setConnectionStatus('error');
        }
    };

    const handleSendMessage = () => {
        if (!inputText.trim() || !wsRef.current || connectionStatus !== 'connected') return;
        const payload = {
            type: 'message',
            user: currentUser?.username || 'JellyUser',
            text: inputText
        };
        try {
            wsRef.current.send(JSON.stringify(payload));
            setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'text',
                sender: currentUser?.username || '我',
                content: inputText,
                isSelf: true
            }]);
            setInputText('');
        } catch (err) {
            console.error('发送消息失败:', err);
        }
    };

    const handleDisconnect = () => {
        if (wsRef.current) wsRef.current.close();
        setConnectionStatus('disconnected');
        setMessages([]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 星空背景 */}
            <div className="absolute inset-0 bg-black overflow-hidden">
                {/* 呼吸星空效果 */}
                <div className="absolute inset-0 stars-layer animate-pulse-slow"></div>
                <div className="absolute inset-0 stars-layer-2 animate-pulse-slower"></div>
                <div className="absolute inset-0 stars-layer-3 animate-pulse-slowest"></div>

                {/* 渐变叠加 */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-purple-950/10 to-black/40"></div>
            </div>

            {/* 关闭按钮 */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-xl border border-cyan-500/30 transition-all group"
            >
                <X className="w-6 h-6 text-cyan-400 group-hover:text-white transition-colors" />
            </button>

            {/* 主聊天界面 */}
            <div className="relative z-10 w-full max-w-4xl h-[85vh] mx-8">
                <div className="relative h-full bg-black/60 backdrop-blur-2xl rounded-3xl border border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.3)] overflow-hidden">
                    {/* 装饰性扫描线 */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>

                    {/* 顶部栏 */}
                    <div className="relative border-b border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Globe className="w-10 h-10 text-cyan-400 animate-spin-slow" />
                                    <div className="absolute inset-0 bg-cyan-400/20 blur-xl animate-pulse"></div>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white tracking-wider">STARLINK PROTOCOL</h1>
                                    <p className="text-cyan-400/70 text-sm mt-1">跨空间量子通信终端</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`px-4 py-2 rounded-full border ${connectionStatus === 'connected'
                                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                        : connectionStatus === 'connecting'
                                            ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                            : 'bg-red-500/20 border-red-500/50 text-red-400'
                                    }`}>
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        {connectionStatus === 'connected' && <Wifi className="w-4 h-4" />}
                                        {connectionStatus === 'connecting' && <Activity className="w-4 h-4 animate-spin" />}
                                        {(connectionStatus === 'disconnected' || connectionStatus === 'error') && <WifiOff className="w-4 h-4" />}
                                        {connectionStatus === 'connected' ? '已连接' :
                                            connectionStatus === 'connecting' ? '连接中' :
                                                connectionStatus === 'error' ? '连接失败' : '未连接'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 主内容区 */}
                    <div className="relative flex flex-col h-[calc(100%-88px)]">
                        {connectionStatus === 'connected' ? (
                            <>
                                {/* 消息区域 */}
                                <div
                                    ref={msgScrollRef}
                                    className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
                                    style={{
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: 'rgba(6,182,212,0.5) rgba(0,0,0,0.3)'
                                    }}
                                >
                                    {messages.length === 0 && (
                                        <div className="text-center py-12">
                                            <Shield className="w-16 h-16 text-cyan-500/30 mx-auto mb-4" />
                                            <p className="text-gray-500 text-lg">信道已建立，等待数据传输...</p>
                                        </div>
                                    )}
                                    {messages.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[70%] ${msg.isSelf ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                                <div className={`text-xs px-2 ${msg.isSelf ? 'text-cyan-400' : 'text-gray-500'}`}>
                                                    {msg.sender}
                                                </div>
                                                {msg.type === 'text' ? (
                                                    <div className={`px-4 py-3 rounded-2xl ${msg.isSelf
                                                            ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white'
                                                            : 'bg-white/10 backdrop-blur-sm text-gray-200 border border-white/10'
                                                        }`}>
                                                        <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                                                    </div>
                                                ) : msg.type === 'image' ? (
                                                    <div className={`rounded-2xl overflow-hidden ${msg.isSelf ? 'border-2 border-cyan-500' : 'border-2 border-white/20'
                                                        }`}>
                                                        <img
                                                            src={`data:image/jpeg;base64,${msg.content}`}
                                                            alt="发送的图片"
                                                            className="max-w-md max-h-96 object-contain cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => window.open(`data:image/jpeg;base64,${msg.content}`, '_blank')}
                                                        />
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 输入区域 */}
                                <div className="p-6 border-t border-cyan-500/30 bg-black/40 backdrop-blur-xl">
                                    <div className="flex gap-3">
                                        <input
                                            value={inputText}
                                            onChange={e => setInputText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                            placeholder="输入消息... (Enter发送, Shift+Enter换行)"
                                            className="flex-1 bg-white/5 border border-cyan-500/30 rounded-xl px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/50"
                                        >
                                            <Send className="w-5 h-5" />
                                            发送
                                        </button>
                                        <button
                                            onClick={handleDisconnect}
                                            className="px-4 py-3 bg-red-900/50 hover:bg-red-800/70 border border-red-500/30 text-red-400 rounded-xl transition-all"
                                            title="断开连接"
                                        >
                                            <WifiOff className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* 连接界面 */
                            <div className="flex-1 flex items-center justify-center p-12">
                                <div className="w-full max-w-md">
                                    <div className="text-center mb-8">
                                        <div className="relative inline-block mb-6">
                                            <Shield className="w-24 h-24 text-cyan-500/50" />
                                            <div className="absolute inset-0 bg-cyan-400/20 blur-2xl animate-pulse"></div>
                                        </div>
                                        <h2 className="text-2xl font-bold text-white mb-2">建立量子链路</h2>
                                        <p className="text-gray-400">请输入目标节点的安全频段坐标</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-cyan-400/80 mb-2 uppercase tracking-wider">
                                                WebSocket 安全地址 (WSS)
                                            </label>
                                            <input
                                                value={wsUrl}
                                                onChange={e => setWsUrl(e.target.value)}
                                                placeholder="wss://example.com/starlink"
                                                className="w-full bg-black/50 border border-cyan-500/30 rounded-xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:bg-black/70 transition-all font-mono"
                                            />
                                        </div>

                                        <button
                                            onClick={connectToStarLink}
                                            disabled={!wsUrl || connectionStatus === 'connecting'}
                                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl py-4 font-bold text-lg tracking-wider flex items-center justify-center gap-3 transition-all shadow-lg shadow-cyan-500/50 disabled:shadow-none"
                                        >
                                            {connectionStatus === 'connecting' ? (
                                                <>
                                                    <Activity className="w-6 h-6 animate-spin" />
                                                    正在建立链路...
                                                </>
                                            ) : (
                                                <>
                                                    <Wifi className="w-6 h-6" />
                                                    建立连接
                                                </>
                                            )}
                                        </button>

                                        {connectionStatus === 'error' && (
                                            <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                                <p className="text-red-400 text-sm">连接失败：信号丢失或节点不可达</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .stars-layer {
                    background-image: 
                        radial-gradient(2px 2px at 20px 30px, white, transparent),
                        radial-gradient(2px 2px at 60px 70px, white, transparent),
                        radial-gradient(1px 1px at 50px 50px, white, transparent),
                        radial-gradient(1px 1px at 130px 80px, white, transparent),
                        radial-gradient(2px 2px at 90px 10px, white, transparent);
                    background-size: 200px 200px;
                    animation: stars-move 120s linear infinite;
                }

                .stars-layer-2 {
                    background-image: 
                        radial-gradient(1px 1px at 40px 60px, rgba(99, 102, 241, 0.8), transparent),
                        radial-gradient(1px 1px at 110px 90px, rgba(59, 130, 246, 0.8), transparent),
                        radial-gradient(1px 1px at 80px 30px, rgba(167, 139, 250, 0.8), transparent);
                    background-size: 250px 250px;
                    animation: stars-move 180s linear infinite;
                }

                .stars-layer-3 {
                    background-image: 
                        radial-gradient(3px 3px at 150px 120px, rgba(6, 182, 212, 0.6), transparent),
                        radial-gradient(2px 2px at 200px 180px, rgba(14, 165, 233, 0.6), transparent);
                    background-size: 300px 300px;
                    animation: stars-move 240s linear infinite;
                }

                @keyframes stars-move {
                    from { transform: translateY(0); }
                    to { transform: translateY(-200px); }
                }

                .animate-pulse-slow {
                    animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                .animate-pulse-slower {
                    animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                .animate-pulse-slowest {
                    animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 4px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(6, 182, 212, 0.5);
                    border-radius: 4px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(6, 182, 212, 0.7);
                }
            `}</style>
        </div>
    );
}
