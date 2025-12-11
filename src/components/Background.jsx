import { useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Background() {
    const { theme, bgStyle, isLoggedIn } = useApp();
    const canvasRef = useRef(null);
    const particlesRef = useRef(null);
    const bubbleRef = useRef({ x: 0, y: 0, vx: 1.5, vy: 1 });

    // 初始化粒子 - 只在登录后执行
    useEffect(() => {
        if (!isLoggedIn) return;

        const el = particlesRef.current;
        if (!el) return;

        const shadows = [];
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const s = Math.random();
            const a = Math.random() * 0.8 + 0.2;
            shadows.push(`${x}vw ${y}vh 0 ${s}px rgba(255,255,255,${a})`);
        }
        el.style.boxShadow = shadows.join(',');
    }, [isLoggedIn]);

    // 背景动画 - 只在登录后执行
    useEffect(() => {
        if (!isLoggedIn) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
                if (bubbleRef.current.x === 0) {
                    bubbleRef.current.x = canvas.width / 2;
                    bubbleRef.current.y = canvas.height / 2;
                }
            }
        };

        resize();
        window.addEventListener('resize', resize);

        let animId;
        const animate = () => {
            if (!canvas) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const w = canvas.width;
            const h = canvas.height;
            const time = Date.now() / 1000;

            const style = getComputedStyle(document.body);
            const dotColor = style.getPropertyValue('--dot-color').trim() || '255, 255, 255';

            // 气泡运动
            if (bgStyle === 'dynamic3') {
                bubbleRef.current.x += bubbleRef.current.vx;
                bubbleRef.current.y += bubbleRef.current.vy;
                if (bubbleRef.current.x < 0 || bubbleRef.current.x > w) bubbleRef.current.vx *= -1;
                if (bubbleRef.current.y < 0 || bubbleRef.current.y > h) bubbleRef.current.vy *= -1;
            }

            // 绘制点阵
            for (let x = 15; x < w; x += 30) {
                for (let y = 15; y < h; y += 30) {
                    let alpha = 0.2;

                    if (theme === 'dark') {
                        if (bgStyle === 'dynamic1') {
                            const bx = Math.floor(x / 120);
                            const by = Math.floor(y / 120);
                            if ((bx + by) % 2 === 0) {
                                alpha = 0.2 + Math.sin(time * 2) * 0.15;
                            }
                        } else if (bgStyle === 'dynamic2') {
                            const cx = w / 2;
                            const cy = h / 2;
                            const dx = Math.abs(x - cx);
                            const dy = Math.abs(y - cy);
                            const glow = Math.max(Math.max(0, 1 - dy / 100), Math.max(0, 1 - dx / 100));
                            const dfc = Math.sqrt(dx * dx + dy * dy);
                            alpha = 0.15 + (glow * Math.max(0, 1 - dfc / (Math.min(w, h) * 0.4)) * 0.8);
                        } else if (bgStyle === 'dynamic3') {
                            const d = Math.sqrt(
                                Math.pow(x - bubbleRef.current.x, 2) +
                                Math.pow(y - bubbleRef.current.y, 2)
                            );
                            if (d < 150) {
                                alpha = 0.8 * (1 - d / 150) + 0.1;
                            }
                        }
                    }

                    ctx.fillStyle = `rgba(${dotColor}, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            animId = requestAnimationFrame(animate);
        };

        animId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animId);
        };
    }, [theme, bgStyle, isLoggedIn]);

    // 未登录时显示静态背景
    if (!isLoggedIn) {
        return (
            <div className="absolute inset-0 -z-10 bg-black">
                <img
                    src="/login-bg.jpg"
                    alt="Background"
                    className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
            </div>
        );
    }

    // 登录后显示动态背景
    return (
        <div className="absolute inset-0 -z-10 bg-black pointer-events-none">
            {/* 粒子 */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    ref={particlesRef}
                    className="w-[1px] h-[1px] rounded-full animate-particle-float opacity-70"
                    style={{ position: 'absolute', top: '-10vh' }}
                />
            </div>

            {/* 底部渐变 */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150vw] h-[50vh] blur-[60px]"
                style={{ background: 'radial-gradient(ellipse at center top, rgba(6,182,212,0.08) 0%, transparent 60%)' }}
            />

            {/* 点阵画布 */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        </div>
    );
}
