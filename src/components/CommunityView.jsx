import { useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Jelly 着色器头像组件
function JellyShaderAvatar({ size = 40 }) {
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
            className="rounded-full"
            style={{ width: size, height: size }}
        />
    );
}

export default function CommunityView() {
    const { posts, likePost, openPostDetail, currentUser } = useApp();

    return (
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* 顶部标题 */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold theme-text-primary mb-2">社区动态</h1>
                        <p className="theme-text-secondary">探索有趣的灵魂</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white/10 hover:bg-white/20 theme-text-primary rounded-xl transition-colors text-sm font-medium">
                            最新
                        </button>
                        <button className="px-4 py-2 theme-text-secondary hover:bg-white/10 rounded-xl transition-colors text-sm font-medium">
                            热门
                        </button>
                    </div>
                </div>

                {/* 帖子列表 */}
                {posts.map((post, index) => {
                    const isLiked = post.likedBy?.includes(currentUser?.id);
                    const likeCount = post.likedBy?.length || 0;
                    const commentCount = post.commentsList?.length || 0;
                    const shareCount = post.shares || 0;
                    const isJelly = post.authorId === 'jelly';

                    return (
                        <div
                            key={post.id}
                            className="post-card animate-scale-in cursor-pointer hover:bg-white/5 transition-colors"
                            style={{ animationDelay: `${index * 0.05}s` }}
                            onClick={() => openPostDetail(post)}
                        >
                            {/* 作者信息 */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 overflow-hidden">
                                        {isJelly ? (
                                            <JellyShaderAvatar size={40} />
                                        ) : (
                                            <img
                                                src={post.author?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${post.authorId}`}
                                                alt="Avatar"
                                                className="w-full h-full rounded-full bg-black"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold theme-text-primary text-sm">{post.author?.username || post.author?.display_id || '未知用户'}</h3>
                                        <p className="text-xs theme-text-secondary">{post.date}</p>
                                    </div>
                                </div>
                                <button className="p-2 theme-text-secondary hover:theme-text-primary rounded-full hover:bg-white/10 transition-colors">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>

                            {/* 帖子内容 */}
                            <div className="mb-4">
                                <h2 className="text-xl font-bold theme-text-primary mb-2">{post.title}</h2>
                                <p className="theme-text-secondary leading-relaxed line-clamp-3">
                                    {post.content}
                                </p>
                            </div>

                            {/* 互动按钮 - 使用真实数据 */}
                            <div className="flex items-center gap-6 border-t theme-border pt-4">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        likePost(post.id);
                                    }}
                                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${isLiked
                                        ? 'text-pink-500'
                                        : 'theme-text-secondary hover:text-pink-500'
                                        }`}
                                >
                                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                                    <span>{likeCount}</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openPostDetail(post);
                                    }}
                                    className="flex items-center gap-2 text-sm font-medium theme-text-secondary hover:text-cyan-500 transition-colors"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    <span>{commentCount}</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        alert('分享链接已复制到剪贴板！');
                                    }}
                                    className="flex items-center gap-2 text-sm font-medium theme-text-secondary hover:text-green-500 transition-colors"
                                >
                                    <Share2 className="w-5 h-5" />
                                    <span>{shareCount}</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
