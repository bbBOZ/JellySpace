import { useRef, useEffect, useState } from 'react';
import orbitalShaderSource from '../shaders/OrbitalMegastructure.glsl?raw';
import SystemStatusPanel from './SystemStatusPanel';

/**
 * 空聊天状态 - 轨道巨型结构 (Orbital Megastructure) Shader
 * 包含各种性能优化：降低光线步进次数、纹理采样层数等
 */
export default function EmptyChatState() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    // 使用视口位置代替鼠标位置，用于键盘控制
    // 初始值经过调整以匹配特定截图视角 (Elevated view)
    const viewRef = useRef({
        x: window.innerWidth * 0.61,
        y: window.innerHeight * 0.33
    });
    const keysRef = useRef(new Set());



    // 键盘交互
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                keysRef.current.add(e.code);
            }
        };
        const handleKeyUp = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                keysRef.current.delete(e.code);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // WebGL 着色器
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;

        if (!canvas || !container) return;

        // 初始化 WebGL
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            console.error('[EmptyChatState] WebGL2 not supported!');
            return;
        }

        // 顶点着色器
        const vs = `#version 300 es
            in vec4 p;
            void main() { gl_Position = p; }
        `;

        // 片段着色器 (注入 Common 代码和主 Image 代码)
        // 注意：Vite 的 ?raw 导入将文件内容作为字符串提供
        const fs = orbitalShaderSource;

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
        const vertShader = createShader(gl.VERTEX_SHADER, vs);
        const fragShader = createShader(gl.FRAGMENT_SHADER, fs);

        if (!vertShader || !fragShader) return;

        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(program, 'p');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const uTime = gl.getUniformLocation(program, 'iTime');
        const uResolution = gl.getUniformLocation(program, 'iResolution');
        const uMouse = gl.getUniformLocation(program, 'iMouse');
        const uChannel2 = gl.getUniformLocation(program, 'iChannel2');

        // --- 生成程序化噪声纹理 (替代 iChannel2) ---
        const createNoiseTexture = () => {
            const size = 256;
            const data = new Uint8Array(size * size * 4);

            // 简单的 Value Noise 模拟
            for (let i = 0; i < size * size * 4; i += 4) {
                const val = Math.floor(Math.random() * 255);
                // 稍微偏向某种色调以模拟地形
                data[i] = val;              // R
                data[i + 1] = val * 0.8;    // G
                data[i + 2] = val * 0.6;    // B
                data[i + 3] = 255;          // A
            }

            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

            // 设置纹理参数 (Linear, Repeat)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.generateMipmap(gl.TEXTURE_2D);

            return texture;
        };

        const texture2 = createNoiseTexture();

        // 渲染循环
        let animId;
        const speed = 5.0; // 键盘控制灵敏度

        const render = (time) => {
            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                gl.viewport(0, 0, canvas.width, canvas.height);
            }

            // 更新键盘控制的视角
            if (keysRef.current.has('ArrowLeft')) viewRef.current.x -= speed;
            if (keysRef.current.has('ArrowRight')) viewRef.current.x += speed;
            if (keysRef.current.has('ArrowUp')) viewRef.current.y += speed;
            if (keysRef.current.has('ArrowDown')) viewRef.current.y -= speed;

            gl.useProgram(program);

            gl.uniform1f(uTime, time * 0.001);
            gl.uniform3f(uResolution, canvas.width, canvas.height, 1);

            // 将 viewRef 使得其行为像鼠标位置一样传递给 shader
            // iMouse.x 对应水平，iMouse.y 对应垂直
            // 传递 click 状态（z, w）为正看似点击，这里如果不点击可能 shader 会用默认动画
            // 我们一直传递正的 x, y 来覆盖默认动画
            gl.uniform4f(uMouse, viewRef.current.x, viewRef.current.y, 1.0, 1.0);

            // 绑定纹理到单元 0
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture2);
            gl.uniform1i(uChannel2, 0);

            gl.drawArrays(gl.TRIANGLES, 0, 3);
            animId = requestAnimationFrame(render);
        };

        animId = requestAnimationFrame(render);
        setIsReady(true);

        // ResizeObserver
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width && height && (canvas.width !== width || canvas.height !== height)) {
                    canvas.width = width;
                    canvas.height = height;
                    gl.viewport(0, 0, width, height);
                }
            }
        });
        resizeObserver.observe(container);

        return () => {
            cancelAnimationFrame(animId);
            resizeObserver.disconnect();
            gl.deleteProgram(program);
            gl.deleteTexture(texture2);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black z-10"
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ display: 'block' }}
            />
            {/* 系统状态面板 */}
            <SystemStatusPanel />
        </div>
    );
}

