import { useState, useEffect, useRef } from 'react';
import { X, Send, Radio, Activity, Globe, Shield, Wifi } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function StarLinkOverlay() {
    const { overlays, closeOverlay, currentUser } = useApp();
    const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
    const [wsUrl, setWsUrl] = useState('');
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [serverInfo, setServerInfo] = useState(null);

    // WebSocket reference
    const wsRef = useRef(null);
    const scrollRef = useRef(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle WebSocket setup
    const connectToStarLink = () => {
        if (!wsUrl) return;

        // Close existing connection if any
        if (wsRef.current) {
            wsRef.current.close();
        }

        setConnectionStatus('connecting');

        try {
            const socket = new WebSocket(wsUrl);
            wsRef.current = socket;

            socket.onopen = () => {
                setConnectionStatus('connected');
                // Send initial handshake
                socket.send(JSON.stringify({
                    user: currentUser?.username || 'Guest',
                    text: `[SYSTEM] Uplink established from JellySpace Node ${currentUser?.display_id}`
                }));
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Filter system commands if needed
                    if (data.text && data.text.includes("CMD:")) return;

                    const newMessage = {
                        id: Date.now() + Math.random(),
                        sender: data.user || 'Unknown',
                        content: data.text,
                        time: data.time || new Date().toLocaleTimeString(),
                        isSelf: false // Incoming messages are never "self" in this context usually, unless we echo
                    };

                    setMessages(prev => [...prev, newMessage]);
                } catch (err) {
                    console.warn('Non-JSON message received:', event.data);
                }
            };

            socket.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setConnectionStatus('error');
            };

            socket.onclose = () => {
                setConnectionStatus('disconnected');
            };

        } catch (err) {
            setConnectionStatus('error');
            console.error('Connection failed:', err);
        }
    };

    const handleSendMessage = () => {
        if (!inputText.trim() || !wsRef.current || connectionStatus !== 'connected') return;

        const payload = {
            user: currentUser?.username || 'JellyUser',
            text: inputText
        };

        try {
            wsRef.current.send(JSON.stringify(payload));

            // Add optimistic message to our view
            const myMessage = {
                id: Date.now(),
                sender: currentUser?.username || 'Me',
                content: inputText,
                time: new Date().toLocaleTimeString(),
                isSelf: true
            };

            setMessages(prev => [...prev, myMessage]);
            setInputText('');
        } catch (err) {
            console.error('Send failed:', err);
        }
    };

    const handleDisconnect = () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        setConnectionStatus('disconnected');
        setMessages([]);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    if (!overlays.starLink) return null;

    return (
        <div className={`full-page-overlay ${overlays.starLink ? 'active' : ''} bg-black/90 backdrop-blur-xl z-50`}>
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-16 border-b border-cyan-500/30 flex items-center justify-between px-6 bg-black/40">
                <div className="flex items-center gap-3">
                    <Globe className={`w-6 h-6 ${connectionStatus === 'connected' ? 'text-cyan-400 animate-pulse' : 'text-gray-500'}`} />
                    <h2 className="text-xl font-bold font-mono text-cyan-400 tracking-widest">STARLINK PROTOCOL</h2>
                </div>
                <button
                    onClick={() => closeOverlay('starLink')}
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="w-full h-full pt-16 flex flex-col items-center justify-center p-4">

                {/* Connection Interface */}
                {connectionStatus === 'disconnected' || connectionStatus === 'error' ? (
                    <div className="max-w-md w-full bg-black/50 border border-cyan-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.1)] backdrop-blur-md">
                        <div className="flex justify-center mb-6">
                            <Shield className="w-16 h-16 text-cyan-500/50" />
                        </div>
                        <h3 className="text-xl text-center text-cyan-100 font-bold mb-2">Secure Channel Uplink</h3>
                        <p className="text-sm text-center text-cyan-500/70 mb-8 font-mono">Enter the frequency coordinates provided by the operator.</p>

                        <div className="space-y-4">
                            <div className="relative">
                                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-500/50" />
                                <input
                                    type="text"
                                    placeholder="wss://..."
                                    value={wsUrl}
                                    onChange={(e) => setWsUrl(e.target.value.trim())}
                                    className="w-full bg-black/50 border border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-cyan-100 placeholder-cyan-900/50 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.2)] font-mono transition-all"
                                />
                            </div>

                            <button
                                onClick={connectToStarLink}
                                disabled={!wsUrl}
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2"
                            >
                                <Wifi className="w-5 h-5" />
                                ESTABLISH CONNECTION
                            </button>
                        </div>

                        {connectionStatus === 'error' && (
                            <p className="text-red-400 text-xs text-center mt-4 font-mono uppercase bg-red-500/10 py-2 rounded">
                                Connection Handshake Failed
                            </p>
                        )}
                    </div>
                ) : (
                    /* Chat Interface */
                    <div className="w-full max-w-4xl h-[80vh] flex flex-col bg-black/40 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-2xl">
                        {/* Status Bar */}
                        <div className="h-10 bg-cyan-950/30 border-b border-cyan-500/20 flex items-center justify-between px-4 text-xs font-mono text-cyan-500">
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                CONNECTED TO: {wsUrl}
                            </span>
                            <button onClick={handleDisconnect} className="hover:text-red-400 transition-colors uppercase">
                                Terminate Signal
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-end gap-2 max-w-[80%] ${msg.isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${msg.isSelf ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'
                                            }`}>
                                            {msg.sender[0]?.toUpperCase()}
                                        </div>
                                        <div className={`px-4 py-2.5 rounded-2xl ${msg.isSelf
                                                ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-100 rounded-tr-none'
                                                : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
                                            }`}>
                                            <div className="flex justify-between items-center gap-4 mb-1 border-b border-white/5 pb-1">
                                                <span className="text-[10px] font-bold opacity-75">{msg.sender}</span>
                                                <span className="text-[10px] opacity-50 font-mono">{msg.time}</span>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {connectionStatus === 'connecting' && (
                                <div className="flex justify-center py-4">
                                    <span className="animate-pulse text-cyan-500 font-mono text-xs">SCANNING FREQUENCIES...</span>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-black/60 border-t border-cyan-500/20">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Enter transmission data..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 font-mono text-sm"
                                    autoFocus
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="p-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white transition-colors disabled:opacity-50"
                                    disabled={!inputText.trim()}
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
