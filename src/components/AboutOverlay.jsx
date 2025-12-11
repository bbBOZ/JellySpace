import { useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Jelly Abracadabra 着色器组件
function JellyAbracadabraShader() {
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
            className="w-full h-full rounded-full"
        />
    );
}

export default function AboutOverlay() {
    const { overlays, closeOverlay } = useApp();

    if (!overlays.about) return null;

    return (
        <div className={`full-page-overlay p-0 flex items-center justify-center ${overlays.about ? 'active' : ''}`}>
            {/* 背景图片 */}
            <img
                src="/login-bg.jpg"
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
            />

            {/* 返回按钮 */}
            <div className="absolute top-6 left-6 z-50">
                <button
                    onClick={() => closeOverlay('about')}
                    className="p-2 bg-black/40 backdrop-blur rounded-full text-white hover:bg-black/60 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
            </div>

            {/* 内容 */}
            <div className="text-center z-10 max-w-2xl px-6">
                {/* 果冻图标 - 使用 Abracadabra 着色器 */}
                <div className="w-32 h-32 mx-auto mb-8 relative z-10 rounded-full overflow-hidden">
                    <JellyAbracadabraShader />
                </div>

                <h1 className="text-5xl font-bold text-white mb-4">Project Jelly</h1>
                <p className="text-xl text-gray-400 mb-10 leading-relaxed">
                    这是果冻空间终端的核心。<br />连接每一个有趣的灵魂，探索数字宇宙的边界。
                </p>

                <div className="grid grid-cols-3 gap-8 text-center border-t border-white/10 pt-8">
                    <div>
                        <h3 className="text-2xl font-bold text-white">v1.0.5</h3>
                        <p className="text-sm text-gray-500">版本</p>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white">100%</h3>
                        <p className="text-sm text-gray-500">开源</p>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white">∞</h3>
                        <p className="text-sm text-gray-500">可能性</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
