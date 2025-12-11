import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, MoreVertical, Phone, Video, Search, PanelLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MOCK_USERS, BUBBLE_STYLES, FONT_STYLES } from '../data/constants';
import { decorations as decorationsAPI } from '../lib/supabase';
import { UniversalAvatar } from './UniversalAvatar';
import EmptyChatState from './EmptyChatState';

// 聊天空状态着色器组件
function EmptyStateShader() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl2');
        if (!gl) return;

        const vs = `#version 300 es
            in vec4 p;
            void main() { gl_Position = p; }
        `;

        const fs = `#version 300 es
            precision highp float;
            uniform float iTime;
            uniform vec3 iResolution;
            out vec4 fragColor;
            
            void mainImage( out vec4 O, vec2 I ) {
                vec2 p = (2.*I-iResolution.xy) / iResolution.y; 
                float a = atan(p.x,p.y);
                float r = length(p);
                vec2 uv = vec2(0.0,r);
                uv = (2.0 * uv) -1.0;     
                float beamWidth = abs(5.0 / (40.0 * uv.y));
                vec3 horBeam = vec3(beamWidth);
                O = vec4( horBeam , 1.0);
            }
            
            void main() { mainImage(fragColor, gl_FragCoord.xy); }
        `;

        const createShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        };

        const program = gl.createProgram();
        gl.attachShader(program, createShader(gl.VERTEX_SHADER, vs));
        gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(program, 'p');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const uTime = gl.getUniformLocation(program, 'iTime');
        const uResolution = gl.getUniformLocation(program, 'iResolution');

        let animId;
        const render = (time) => {
            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
            gl.useProgram(program);
            gl.uniform1f(uTime, time * 0.001);
            gl.uniform3f(uResolution, canvas.width, canvas.height, 1);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            animId = requestAnimationFrame(render);
        };

        animId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full absolute inset-0"
        />
    );
}

// Jelly 着色器头像组件
function JellyShaderAvatar({ size = 'w-10 h-10' }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl2');
        if (!gl) return;

        const vs = `#version 300 es
            in vec4 p;
            void main() { gl_Position = p; }
        `;

        const fs = `#version 300 es
            precision highp float;
            uniform float iTime;
            uniform float iTimeDelta;
            uniform vec3 iResolution;
            out vec4 O;
            
            #define t ( iTime + fract(1e4*sin(dot(gl_FragCoord.xy,vec2(137,-13))))* iTimeDelta )
            #define S smoothstep

            void main() {
                vec2 I = gl_FragCoord.xy;
                float i,d,s,m,l,
                x = abs(mod(t/4., 2.) - 1.),
                a = x < .5  ? -(exp2(12.*x - 6.) * sin((20.*x - 11.125) * 1.396)) / 2.
                                      : (exp2(-12.*x + 6.) * sin((20.*x - 11.125) * 1.396)) / 2. + 1.;                
                vec3 p,k,r = iResolution;

                for(O*=i; i++<1e2; O += max(sin(vec4(1,2,3,1)+i*.5)*1.3/s,-length(k*k))){

                    k = vec3((I+I-r.xy)/r.y*d, d-9.);
                    
                    if(abs(k.x)>6.) break;
                    
                    l = length(.2*k.xy-vec2(sin(t)/9.,.6+sin(t+t)/9.));

                    k.y < -5. ? k.y = -k.y-10., m = .5 : m = 1.;
                    
                    k.xz *= mat2(cos(a*6.28 + k.y * .3 * S(.2, .5, x) * S(.7, .5, x)+ vec4(0,33,11,0)));
                    
                    for(p=k*.5,s = .01; s < 1.; s += s)
                        p.y += .95+abs(dot(sin(p.x + 2.*t+p/s),  .2+p-p )) * s;
                    
                    l = mix(sin(length(k*k.x)),mix(sin(length(p)),l,.5-l),S(5.5, 6., p.y));

                    p = abs(k);
                    d += s =.012+.09*abs(max(sin(length(k)+l),
                                            max(max(max(p.x, p.y), p.z), dot(p, vec3(.577)) * mix(.5, .9, a))-3.)-i/1e2);
                }
             
                O = tanh(O*O/1e6)*m;  
                O.a = 1.0;
            }
        `;

        const createShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        };

        const program = gl.createProgram();
        gl.attachShader(program, createShader(gl.VERTEX_SHADER, vs));
        gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(program, 'p');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const uTime = gl.getUniformLocation(program, 'iTime');
        const uTimeDelta = gl.getUniformLocation(program, 'iTimeDelta');
        const uResolution = gl.getUniformLocation(program, 'iResolution');

        let animId;
        let lastTime = 0;
        const render = (time) => {
            const delta = (time - lastTime) / 1000;
            lastTime = time;

            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
            gl.useProgram(program);
            gl.uniform1f(uTime, time * 0.001);
            gl.uniform1f(uTimeDelta, delta);
            gl.uniform3f(uResolution, canvas.width, canvas.height, 1);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            animId = requestAnimationFrame(render);
        };

        animId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`${size} rounded-full`}
        />
    );
}

export default function ChatView() {
    console.log('[ChatView] Component rendering');
    const {
        activeChatId,
        chats,
        messages,
        currentUser,
        sendMessage,
        theme,
        bubbleStyle,
        fontStyle,
        openModal,
        openOverlay,
        setViewedProfile,
        fetchFullProfile,
        toggleSidebar,
        isSidebarCollapsed
    } = useApp();

    const [inputText, setInputText] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [activeDecoration, setActiveDecoration] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const fileInputRef = useRef(null);

    const activeChat = chats.find(c => c.id === activeChatId);
    const chatMessages = messages[activeChatId] || [];

    // 获取聊天对象信息 - 直接使用 activeChat 数据
    const getChatPartner = () => {
        if (!activeChat) return null;
        return {
            id: activeChat.userId,
            username: activeChat.name,
            avatar_url: activeChat.avatar,
            display_id: activeChat.name?.toLowerCase() || activeChat.userId,
            isOnline: true
        };
    };

    const chatPartner = getChatPartner();
    // 检测是否是 Jelly 聊天（通过名称或 display_id）
    const isJellyChat = activeChat?.name?.toLowerCase() === 'jelly' ||
        chatPartner?.display_id?.toLowerCase() === 'jelly';

    // 打开聊天对象/群组的详细资料
    const handleViewProfile = async () => {
        console.log('handleViewProfile called, activeChat:', activeChat);
        if (activeChat?.type === 'group') {
            console.log('Opening group profile modal for:', activeChat.id);
            openModal('groupProfile');
            console.log('openModal called');
            return;
        }

        if (!chatPartner?.id) return;

        // 从数据库获取完整资料
        const fullProfile = await fetchFullProfile(chatPartner.id);
        if (fullProfile) {
            setViewedProfile(fullProfile);
            openOverlay('profile');
        }
    };

    // 自动滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages, activeChatId]);

    // 加载用户的活动聊天背景装扮
    useEffect(() => {
        const loadActiveDecoration = async () => {
            if (!currentUser?.id) return;

            const { data, error } = await decorationsAPI.getActive(currentUser.id, 'background');
            if (data?.decoration) {
                console.log('加载活动装扮:', data.decoration);
                setActiveDecoration(data.decoration);
            }
        };
        loadActiveDecoration();
    }, [currentUser?.id]);

    const handleSend = (e) => {
        e.preventDefault();
        if (inputText.trim()) {
            sendMessage(activeChatId, inputText);
            setInputText('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
        }
    };

    // 处理图片选择
    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                alert('图片大小不能超过 10MB');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    // 取消图片预览
    const handleCancelImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // 查看大图
    const handleViewImage = (imageUrl) => {
        setViewingImage(imageUrl);
        setShowImageModal(true);
    };

    // 解析 CSS 字符串为 React style 对象
    const parseCssToStyle = (cssCode) => {
        if (!cssCode) return {};
        try {
            const style = {};
            // 移除注释
            const cleanedCss = cssCode.replace(/\/\*[\s\S]*?\*\//g, '');
            // 分割样式
            const rules = cleanedCss.split(';').filter(r => r.trim());

            rules.forEach(rule => {
                const [property, value] = rule.split(':').map(s => s.trim());
                if (property && value) {
                    // 转换 CSS 属性名为 camelCase
                    const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                    style[camelProperty] = value;
                }
            });

            return style;
        } catch (e) {
            console.error('CSS 解析错误:', e);
            return {};
        }
    };

    // 获取气泡样式类
    const getBubbleClass = (isMe, isJellyMessage) => {
        // 果冻专属气泡样式
        if (isJellyMessage && !isMe) {
            return 'bg-gradient-to-r from-purple-600/80 via-pink-500/80 to-cyan-500/80 text-white rounded-tl-none backdrop-blur-sm border border-white/20 shadow-lg shadow-purple-500/20';
        }
        if (!isMe) return 'bg-white text-gray-900 rounded-tl-none';

        const style = BUBBLE_STYLES.find(s => s.id === bubbleStyle) || BUBBLE_STYLES[0];
        return `${style.class} text-white rounded-tr-none`;
    };

    // 获取字体样式
    const getFontStyle = () => {
        const style = FONT_STYLES.find(s => s.name === fontStyle) || FONT_STYLES[0];
        return { fontFamily: style.val };
    };

    // 空状态 - 显示着色器 + 时间
    console.log('[ChatView] activeChat=', activeChat, 'activeChatId=', activeChatId);
    if (!activeChat) {
        console.log('[ChatView] Rendering EmptyChatState - no active chat');
        return (
            <div className="w-full h-full relative">
                <EmptyChatState />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative" style={getFontStyle()}>
            {/* 聊天顶栏 */}
            <div className="h-16 px-6 flex items-center justify-between border-b theme-border bg-white/5 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    {/* Sidebar Toggle Button */}
                    <button
                        onClick={toggleSidebar}
                        className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                        title={isSidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
                    >
                        <PanelLeft className={`w-5 h-5 ${isSidebarCollapsed ? 'theme-text-secondary' : 'theme-text-primary'}`} />
                    </button>

                    {/* Clickable Profile Area */}
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-lg px-2 py-1 -mx-2 transition-colors" onClick={handleViewProfile}>
                        <div className="relative">
                            <UniversalAvatar
                                user={chatPartner}
                                chatType={activeChat?.type}
                                size="w-10 h-10"
                                className="border theme-border"
                            />
                            {chatPartner?.isOnline && (
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                        </div>
                        <div>
                            <h2 className="font-bold theme-text-primary text-lg">
                                {chatPartner?.username || activeChat.name}
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 theme-text-secondary">
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <Video className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <Search className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 消息区域 */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 relative"
                style={activeDecoration?.type === 'css' ? parseCssToStyle(activeDecoration.code) : {}}
            >
                {chatMessages.map((msg, index) => {
                    const isMe = msg.senderId === currentUser.id;
                    const showTime = index === 0 || (new Date(msg.timestamp) - new Date(chatMessages[index - 1].timestamp) > 5 * 60 * 1000);

                    const showNickname = activeChat?.type === 'group' && !isMe;

                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {/* Time display placeholder - logic needs fix */}
                            {showTime && (
                                <div className="w-full flex justify-center mb-4">
                                    <span className="text-xs text-gray-400 bg-black/10 px-2 py-1 rounded-full">
                                        {msg.time}
                                    </span>
                                </div>
                            )}

                            <div className={`flex items-end gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                {!isMe && (
                                    isJellyChat ? (
                                        <div
                                            className="w-8 h-8 mb-1 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                                            onClick={handleViewProfile}
                                        >
                                            <JellyShaderAvatar size="w-8 h-8" />
                                        </div>
                                    ) : (
                                        <img
                                            src={msg.sender?.avatar_url || chatPartner?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${msg.senderId || 'Unknown'}`}
                                            className="w-8 h-8 rounded-full mb-1 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                                            onClick={handleViewProfile}
                                        />
                                    )
                                )}

                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    {showNickname && (
                                        <span className="text-xs theme-text-secondary mb-1 ml-1">{msg.sender?.username || '用户'}</span>
                                    )}
                                    <div className={`px-4 py-2.5 shadow-sm text-sm break-words whitespace-pre-wrap leading-relaxed ${getBubbleClass(isMe, isJellyChat)}`}>
                                        {/* 图片消息 */}
                                        {msg.message_type === 'image' && msg.media_url ? (
                                            <img
                                                src={msg.media_url}
                                                alt="图片"
                                                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => handleViewImage(msg.media_url)}
                                            />
                                        ) : (
                                            msg.text
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="p-4 border-t theme-border bg-white/5 backdrop-blur-md">
                {/* 图片预览 */}
                {imagePreview && (
                    <div className="mb-3 max-w-4xl mx-auto">
                        <div className="relative inline-block">
                            <img
                                src={imagePreview}
                                alt="预览"
                                className="max-h-32 rounded-xl border theme-border"
                            />
                            <button
                                type="button"
                                onClick={handleCancelImage}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-400"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSend} className="flex items-end gap-3 max-w-4xl mx-auto">
                    {/* 隐藏的文件输入 */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-gray-400 hover:text-cyan-500 hover:bg-white/10 rounded-xl transition-all"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>

                    <div className="flex-1 bg-white/10 rounded-2xl flex items-center p-1 relative">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="输入消息..."
                            rows={1}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm px-4 py-2.5 theme-text-primary placeholder-gray-400 resize-none max-h-32 custom-scrollbar"
                            style={{ minHeight: '44px' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowEmoji(!showEmoji)}
                            className={`p-2 rounded-xl transition-colors ${showEmoji ? 'text-yellow-500 bg-yellow-500/10' : 'text-gray-400 hover:text-yellow-500 hover:bg-white/10'}`}
                        >
                            <Smile className="w-5 h-5" />
                        </button>

                        {/* 表情选择器 (简化版) */}
                        {showEmoji && (
                            <div className="absolute bottom-full right-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border theme-border grid grid-cols-6 gap-1 w-64">
                                {['😀', '😂', '🤣', '😍', '🥰', '😎', '🤔', '🙄', '😴', '😭', '🤯', '🥳', '👍', '👎', '👋', '🙏', '❤️', '🔥'].map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setInputText(prev => prev + emoji);
                                        }}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xl transition-transform hover:scale-110"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!inputText.trim() && !imagePreview}
                        className="p-3 bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>

            {/* 图片大图查看模态框 */}
            {showImageModal && viewingImage && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => {
                        setShowImageModal(false);
                        setViewingImage(null);
                    }}
                >
                    <img
                        src={viewingImage}
                        alt="大图"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={e => e.stopPropagation()}
                    />
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl"
                        onClick={() => {
                            setShowImageModal(false);
                            setViewingImage(null);
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}
