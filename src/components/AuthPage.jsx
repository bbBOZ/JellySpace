import { useState, useEffect, useRef } from 'react';
import { User, Lock, Mail, Hash, ArrowLeft, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function AuthPage() {
    const { login, register, isLoading } = useApp();
    const [authView, setAuthView] = useState('login'); // 'login' | 'register'
    const [regMode, setRegMode] = useState('user'); // 'user' | 'email'

    // 表单状态
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regId, setRegId] = useState('');
    const [regPassword, setRegPassword] = useState('');

    const canvasRef = useRef(null);

    // 初始化着色器
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl2');
        if (!gl) return;

        const vsSource = `#version 300 es
      in vec4 position;
      void main() { gl_Position = position; }
    `;

        const fsSource = `#version 300 es
      precision highp float;
      uniform vec3 iResolution;
      uniform float iTime;
      out vec4 fragColor;
      
      void mainImage( out vec4 O, vec2 I ) {
        O = vec4(0.0);
        float i = 0.0, d = 0.0, s = 0.0, m = 0.0, l = 0.0;
        float x = abs(mod(iTime*0.5/4., 2.) - 1.);
        float a = x < .5 ? -(exp2(12.*x - 6.) * sin((20.*x - 11.125) * 1.396)) / 2. : (exp2(-12.*x + 6.) * sin((20.*x - 11.125) * 1.396)) / 2. + 1.;
        vec3 p,k,r = iResolution;
        for(O*=i; i++<1e2; O += max(sin(vec4(1,2,3,1)+i*.5)*1.3/s,-length(k*k))) {
          k = vec3(((I+I-r.xy)/r.y)*d, d-9.);
          if(abs(k.x)>6.) break;
          l = length(.2*k.xy-vec2(sin(iTime*0.5)/9.,.6+sin(iTime)/9.));
          k.y < -5. ? k.y = -k.y-10., m = .5 : m = 1.;
          k.xz *= mat2(cos(a*6.28 + k.y * .3 * smoothstep(.2, .5, x) * smoothstep(.7, .5, x)+ vec4(0,33,11,0)));
          for(p=k*.5,s = .01; s < 1.; s += s) p.y += .95+abs(dot(sin(p.x + 2.*iTime*0.5+p/s), .2+p-p )) * s;
          l = mix(sin(length(k*k.x)),mix(sin(length(p)),l,.5-l),smoothstep(5.5, 6., p.y));
          p = abs(k);
          d += s =.012+.09*abs(max(sin(length(k)+l), max(max(max(p.x, p.y), p.z), dot(p, vec3(.577)) * mix(.5, .9, a))-3.)-i/1e2);
        }
        O = tanh(O*O/1e6)*m;
        O.a = 1.0;
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
        gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource));
        gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
        gl.linkProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const uResolution = gl.getUniformLocation(program, 'iResolution');
        const uTime = gl.getUniformLocation(program, 'iTime');

        let animId;
        const render = (time) => {
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
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (loginUsername.trim()) {
            // 判断是否为邮箱
            const isEmail = loginUsername.includes('@');
            const result = await login(loginUsername, loginPassword, isEmail);
            if (!result.success) {
                alert(result.message);
            }
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        // 邮箱注册模式必须填写邮箱
        if (regMode === 'email' && !regEmail.trim()) {
            alert('请输入邮箱地址');
            return;
        }
        // 邮箱格式验证
        if (regMode === 'email' && regEmail.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(regEmail)) {
                alert('请输入有效的邮箱地址');
                return;
            }
        }
        if (regUsername.trim()) {
            // 验证 ID 格式
            if (!/^[a-zA-Z0-9_]+$/.test(regUsername)) {
                alert('账号 ID 只能包含字母、数字和下划线');
                return;
            }

            // 调用注册：register(customId, password, nickname, email)
            // 这里我们将输入的 regUsername 作为 ID，昵称暂时也设为 ID (或者留空让后端处理)
            const result = await register(regUsername, regPassword, null, regEmail || null);

            if (!result.success) {
                alert(result.message);
            } else {
                alert(`注册成功！您的 ID 是: ${result.displayId}`);
                setAuthView('login');
            }
        }
    };

    // 登录视图样式
    const loginCardStyle = authView === 'login'
        ? { transform: 'translateZ(0) rotateX(0deg)', opacity: 1 }
        : { transform: 'translateX(-30%) translateZ(-400px) rotateY(30deg) rotateX(5deg)', opacity: 0.7, pointerEvents: 'none' };

    // 注册视图样式
    const registerCardStyle = authView === 'register'
        ? { visibility: 'visible', opacity: 1, transform: 'translateX(25%) translateZ(0px) rotateY(-5deg)' }
        : { visibility: 'hidden', opacity: 0, transform: 'translateX(150%) translateZ(200px) rotateY(-45deg)' };

    return (
        <div id="auth-page" className="absolute inset-0 z-50 flex items-center justify-center stage-3d transition-opacity duration-500">
            {/* 登录卡片 */}
            <div
                id="login-card"
                className="absolute preserve-3d transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] card-reflection w-[95vw] md:w-[92vw] lg:w-[85vw] max-w-[1600px] min-h-[60vh] rounded-[40px] bg-[#050505] flex overflow-hidden group border border-white/5 shadow-2xl"
                style={loginCardStyle}
            >
                {/* 左侧着色器区域 */}
                <div className="w-[40%] relative overflow-hidden rounded-l-[40px] border-r border-white/5 z-10 pointer-events-none hidden md:block">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/40 to-black z-0"></div>
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-90 scale-110 z-10"></canvas>
                </div>

                {/* 右侧表单区域 */}
                <div className="w-full md:w-[60%] flex flex-col justify-center px-10 md:px-20 lg:px-28 relative z-50 py-10">
                    <div className="mb-6">
                        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] animate-pulse"></span>
                            果冻
                        </h2>
                        <p className="text-gray-500 mt-2 text-sm tracking-[0.2em] uppercase font-medium">沉浸式空间终端</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5 max-w-lg relative z-50">
                        <div className="flex flex-col gap-2 relative z-50">
                            <label className="text-xs font-bold uppercase text-gray-500">账号</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10">
                                    <User className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    value={loginUsername}
                                    onChange={(e) => setLoginUsername(e.target.value)}
                                    className="w-full rounded-2xl px-4 py-3.5 pl-12 glass-input outline-none focus:border-cyan-500 transition-colors"
                                    placeholder="请输入用户名"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 relative z-50">
                            <label className="text-xs font-bold uppercase text-gray-500">密码</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    className="w-full rounded-2xl px-4 py-3.5 pl-12 glass-input outline-none focus:border-cyan-500 transition-colors"
                                    placeholder="请输入密码"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-4 py-4 text-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold transition-all hover:scale-[1.02] cursor-pointer relative z-50 disabled:opacity-50"
                        >
                            {isLoading ? '登录中...' : '登录'}
                        </button>

                        <div className="flex items-center justify-between px-1 mt-4 text-xs text-gray-500/80 font-mono relative z-50">
                            <span className="flex items-center gap-1.5 hover:text-cyan-500 cursor-help transition-colors">
                                <ShieldCheck className="w-3 h-3" /> 连接: 安全
                            </span>
                            <span
                                onClick={() => setAuthView('register')}
                                className="text-cyan-500 hover:text-cyan-300 cursor-pointer transition-colors uppercase tracking-wider flex items-center gap-1 hover:gap-2 duration-300"
                            >
                                注册账号 &gt;
                            </span>
                        </div>
                    </form>
                </div>
            </div>

            {/* 注册卡片 */}
            <div
                id="register-card"
                className="absolute w-[90vw] max-w-[480px] p-10 rounded-[30px] bg-black/90 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] z-50"
                style={registerCardStyle}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-white tracking-tight">新用户注册</h2>
                    <button
                        onClick={() => setAuthView('login')}
                        className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 注册标签页 */}
                <div className="flex gap-6 mb-6 border-b border-white/10">
                    <div
                        className={`auth-tab ${regMode === 'user' ? 'active' : ''}`}
                        onClick={() => setRegMode('user')}
                    >
                        普通注册
                    </div>
                    <div
                        className={`auth-tab ${regMode === 'email' ? 'active' : ''}`}
                        onClick={() => setRegMode('email')}
                    >
                        邮箱注册 <span className="text-yellow-500 text-xs ml-1">Pro</span>
                    </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-5 relative">
                    {regMode === 'email' && (
                        <>
                            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-xs text-yellow-500">
                                ✨ Pro 会员特权：专属徽章、更多装扮、优先体验新功能
                            </div>
                            <div className="flex flex-col gap-2 relative z-50">
                                <label className="text-xs font-bold uppercase tracking-wider ml-1 text-gray-500">邮箱 <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="email"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        className="w-full rounded-2xl px-4 py-3.5 pl-12 outline-none font-medium glass-input placeholder-gray-500 focus:border-cyan-500 transition-colors"
                                        placeholder="your@email.com"
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex flex-col gap-2 relative z-50">
                        <label className="text-xs font-bold uppercase tracking-wider ml-1 text-gray-500">账号 ID (字母/数字/下划线)</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10">
                                <Hash className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)}
                                className="w-full rounded-2xl px-4 py-3.5 pl-12 outline-none font-medium glass-input placeholder-gray-500 focus:border-cyan-500 transition-colors"
                                placeholder="设置您的唯一 ID"
                                required
                            />
                        </div>
                    </div>

                    {/* ID 输入框已移除，由系统自动生成 */}

                    <div className="flex flex-col gap-2 relative z-50">
                        <label className="text-xs font-bold uppercase tracking-wider ml-1 text-gray-500">密码</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                type="password"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                className="w-full rounded-2xl px-4 py-3.5 pl-12 outline-none font-medium glass-input placeholder-gray-500 focus:border-cyan-500 transition-colors"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-6 py-3 text-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium border-none shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] flex items-center justify-center cursor-pointer disabled:opacity-50"
                    >
                        {isLoading ? '注册中...' : '立即注册'}
                    </button>

                    <div className="mt-6 text-center">
                        <span
                            onClick={() => setAuthView('login')}
                            className="text-sm text-gray-500 hover:text-white cursor-pointer transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> 返回登录
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
}
