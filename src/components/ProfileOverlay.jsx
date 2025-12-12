import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Share2, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEFAULT_SHADER_CODE } from '../data/constants';

export default function ProfileOverlay() {
    const {
        overlays,
        closeOverlay,
        viewedProfile,
        currentUser,
        updateProfile,
        posts,
        setIsLoading,
        createPrivateChat,
        setActiveChatId,
        setActiveTab
    } = useApp();

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const shaderCanvasRef = useRef(null);

    const profile = viewedProfile || currentUser;
    const isOwnProfile = profile?.id === currentUser?.id;
    const userPosts = posts.filter(p => p.authorId === profile?.id);

    // 初始化着色器
    useEffect(() => {
        if (!overlays.profile) return;

        const canvas = shaderCanvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl2');
        if (!gl) return;

        const shaderCode = profile?.profile_shader || DEFAULT_SHADER_CODE;
        console.log('Rendering shader, profile_shader:', profile?.profile_shader ? 'custom' : 'default');

        const vs = `#version 300 es
      in vec4 p;
      void main() { gl_Position = p; }
    `;

        const fsHeader = `#version 300 es
      precision highp float;
      uniform vec3 iResolution;
      uniform float iTime;
      out vec4 fc;
    `;
        const fsFooter = `
      void main() { mainImage(fc, gl_FragCoord.xy); }
    `;
        const fs = fsHeader + shaderCode + fsFooter;

        const createShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                return null;
            }
            return shader;
        };

        const program = gl.createProgram();
        const vertexShader = createShader(gl.VERTEX_SHADER, vs);
        const fragmentShader = createShader(gl.FRAGMENT_SHADER, fs);

        if (!vertexShader || !fragmentShader) return;

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(program, 'p');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const uResolution = gl.getUniformLocation(program, 'iResolution');
        const uTime = gl.getUniformLocation(program, 'iTime');

        let animId;
        const render = (time) => {
            if (!overlays.profile) return;

            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
            gl.useProgram(program);
            gl.uniform3f(uResolution, canvas.width, canvas.height, 1);
            gl.uniform1f(uTime, time * 0.001);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            animId = requestAnimationFrame(render);
        };

        animId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animId);
    }, [overlays.profile, profile]);

    const handleEdit = () => {
        setEditData({
            username: currentUser.username || '',
            avatar_url: currentUser.avatar_url || '',
            signature: currentUser.signature || '',
            gender: currentUser.gender || '',
            birthday: currentUser.birthday || '',
            mbti: currentUser.mbti || '',
            profileShader: currentUser.profile_shader || DEFAULT_SHADER_CODE
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // 简单的星座计算
            let zodiac = currentUser.zodiac;
            if (editData.birthday && editData.birthday !== currentUser.birthday) {
                const month = parseInt(editData.birthday.split('-')[1]);
                const day = parseInt(editData.birthday.split('-')[2]);
                zodiac = getZodiac(month, day);
            }

            // 构建更新对象，只包含变更的字段
            const updates = {};
            if (editData.username !== currentUser.username) updates.username = editData.username;
            if (editData.avatar_url !== currentUser.avatar_url) updates.avatar_url = editData.avatar_url;
            if (editData.signature !== currentUser.signature) updates.signature = editData.signature;
            if (editData.gender !== currentUser.gender) updates.gender = editData.gender;
            if (editData.birthday !== currentUser.birthday) updates.birthday = editData.birthday || null;
            if (editData.mbti !== currentUser.mbti) updates.mbti = editData.mbti;
            if (zodiac !== currentUser.zodiac) updates.zodiac = zodiac;
            if (editData.profileShader !== currentUser.profile_shader) updates.profile_shader = editData.profileShader;

            if (Object.keys(updates).length === 0) {
                console.log('No changes detected');
                setIsEditing(false);
                setIsLoading(false);
                return;
            }

            const { data, error } = await updateProfile(updates);

            if (error) {
                console.error('Save profile error:', error);
                alert(`保存失败: ${error.message || error}`);
                return;
            }

            console.log('Profile saved successfully:', data);
            setIsEditing(false);
        } catch (error) {
            console.error('Save profile exception:', error);
            alert(`保存异常: ${error.message || error}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!currentUser || !profile) return;
        setIsLoading(true);
        const chatId = await createPrivateChat(profile.id);
        setIsLoading(false);
        if (chatId) {
            setActiveChatId(chatId);
            setActiveTab('chat');
            closeOverlay('profile');
        } else {
            alert('无法发起聊天');
        }
    };

    // 星座计算函数
    const getZodiac = (month, day) => {
        const zodiacs = [
            { name: '摩羯座', end: [1, 19] }, { name: '水瓶座', end: [2, 18] },
            { name: '双鱼座', end: [3, 20] }, { name: '白羊座', end: [4, 19] },
            { name: '金牛座', end: [5, 20] }, { name: '双子座', end: [6, 21] },
            { name: '巨蟹座', end: [7, 22] }, { name: '狮子座', end: [8, 22] },
            { name: '处女座', end: [9, 22] }, { name: '天秤座', end: [10, 23] },
            { name: '天蝎座', end: [11, 22] }, { name: '射手座', end: [12, 21] },
            { name: '摩羯座', end: [12, 31] }
        ];
        for (const z of zodiacs) {
            if (month < z.end[0] || (month === z.end[0] && day <= z.end[1])) {
                return z.name;
            }
        }
        return '摩羯座';
    };

    if (!overlays.profile || !profile) return null;

    return (
        <div className={`full-page-overlay p-0 ${overlays.profile ? 'active' : ''}`}>
            {/* 顶部着色器背景 */}
            <div className="h-80 w-full relative overflow-hidden">
                <canvas ref={shaderCanvasRef} className="absolute inset-0 w-full h-full"></canvas>
                {!profile.profile_shader && (
                    <div className="absolute inset-0 w-full h-full starry-bg"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-body)] to-transparent z-10 pointer-events-none"></div>
                <button
                    onClick={() => {
                        closeOverlay('profile');
                        setIsEditing(false);
                    }}
                    className="absolute top-6 left-6 p-2 bg-black/40 backdrop-blur rounded-full text-white hover:bg-black/60 transition-colors z-20 cursor-pointer"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
            </div>

            <div className="max-w-5xl mx-auto px-6 relative z-20 pb-20">
                {/* 头像区域 */}
                <div className="flex flex-col items-center md:items-start -mt-20 mb-8 pl-4">
                    <img
                        src={profile.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.display_id}`}
                        className="w-40 h-40 rounded-3xl border-4 border-[var(--bg-body)] shadow-2xl bg-gray-200 object-cover relative z-30"
                        alt={profile.username}
                    />
                    <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between w-full">
                        <div>
                            <h1 className="text-4xl font-bold theme-text-primary mb-1 flex items-center gap-2">
                                {profile.username}
                                {profile.isPro && (
                                    <span className="text-sm bg-yellow-500 text-black px-2 py-0.5 rounded-lg font-bold">
                                        PRO
                                    </span>
                                )}
                            </h1>
                            <p className="text-lg theme-text-secondary font-mono">@{profile.display_id}</p>
                        </div>

                        {/* 操作按钮 */}
                        <div className="mt-4 md:mt-0 flex gap-3">
                            {isOwnProfile && !isEditing && (
                                <button
                                    onClick={handleEdit}
                                    className="px-6 py-2.5 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-500 shadow-lg shadow-cyan-900/30 transition-all"
                                >
                                    编辑资料
                                </button>
                            )}
                            {isOwnProfile && isEditing && (
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 shadow-lg transition-all"
                                >
                                    保存
                                </button>
                            )}
                            {!isOwnProfile && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSendMessage}
                                        className="px-6 py-2.5 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-500 shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-2"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        发消息
                                    </button>
                                    <button className="p-2.5 border theme-border rounded-xl theme-text-secondary hover:bg-white/5">
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 信息卡片 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-xs theme-text-secondary uppercase mb-1">性别</span>
                        <span className="font-bold theme-text-primary text-lg">{profile.gender || '-'}</span>
                    </div>
                    <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-xs theme-text-secondary uppercase mb-1">生日</span>
                        <span className="font-bold theme-text-primary text-lg">{profile.birthday || '-'}</span>
                    </div>
                    <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-xs theme-text-secondary uppercase mb-1">星座</span>
                        <span className="font-bold theme-text-primary text-lg">{profile.zodiac || '-'}</span>
                    </div>
                    <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-xs theme-text-secondary uppercase mb-1">MBTI</span>
                        <span className="font-bold theme-text-primary text-lg">{profile.mbti || '-'}</span>
                    </div>
                </div>

                {/* 签名和编辑 */}
                <div className="glass-panel p-6 rounded-2xl mb-10">
                    <h3 className="text-sm uppercase tracking-wider theme-text-secondary mb-2 font-bold">个性签名</h3>
                    <p className="text-lg leading-relaxed theme-text-primary italic">
                        {profile.signature || 'Coding is life.'}
                    </p>

                    {/* 编辑模式输入框 */}
                    {isEditing && (
                        <div className="space-y-4 mt-6 pt-6 border-t theme-border">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs theme-text-secondary uppercase">昵称</label>
                                    <input
                                        type="text"
                                        value={editData.username}
                                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                                        className="w-full glass-input rounded-lg p-2 mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs theme-text-secondary uppercase">头像 URL</label>
                                    <input
                                        type="text"
                                        value={editData.avatar_url}
                                        onChange={(e) => setEditData({ ...editData, avatar_url: e.target.value })}
                                        className="w-full glass-input rounded-lg p-2 mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs theme-text-secondary uppercase">性别</label>
                                    <select
                                        value={editData.gender}
                                        onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                                        className="w-full glass-input rounded-lg p-2 mt-1"
                                    >
                                        <option value="">未选择</option>
                                        <option value="男">男</option>
                                        <option value="女">女</option>
                                        <option value="保密">保密</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs theme-text-secondary uppercase">生日</label>
                                    <input
                                        type="date"
                                        value={editData.birthday}
                                        onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                                        className="w-full glass-input rounded-lg p-2 mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs theme-text-secondary uppercase">MBTI</label>
                                    <input
                                        type="text"
                                        value={editData.mbti}
                                        onChange={(e) => setEditData({ ...editData, mbti: e.target.value })}
                                        className="w-full glass-input rounded-lg p-2 mt-1"
                                        placeholder="INTJ"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs theme-text-secondary uppercase">个性签名</label>
                                <textarea
                                    rows={2}
                                    value={editData.signature}
                                    onChange={(e) => setEditData({ ...editData, signature: e.target.value })}
                                    className="w-full glass-input rounded-lg p-2 mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-xs theme-text-secondary uppercase">主页背景着色器 (GLSL MainImage)</label>
                                <textarea
                                    rows={6}
                                    value={editData.profileShader}
                                    onChange={(e) => setEditData({ ...editData, profileShader: e.target.value })}
                                    className="w-full glass-input rounded-lg p-2 mt-1 font-mono text-xs"
                                    placeholder="void mainImage( out vec4 fragColor, in vec2 fragCoord ) { ... }"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 帖子 */}
                <div>
                    <div className="flex items-center gap-4 mb-6 border-b theme-border pb-4">
                        <h3 className="text-xl font-bold theme-text-primary">个人动态</h3>
                    </div>
                    <div className="post-list">
                        {userPosts.length === 0 ? (
                            <p className="text-center theme-text-secondary py-8">暂无动态</p>
                        ) : (
                            userPosts.map((post, index) => (
                                <div
                                    key={post.id}
                                    className="post-card animate-scale-in"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <div className="text-xs theme-text-secondary mb-2">{post.date}</div>
                                    <h4 className="font-bold text-lg mb-2 theme-text-primary">{post.title}</h4>
                                    <p className="text-sm theme-text-secondary leading-relaxed">{post.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
