// System Status Panel Component
import { useState, useEffect } from 'react';
import { calculateCurrentLocation } from '../utils/orbitSimulator';
import { Clock, MapPin, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import StarLinkChat from './StarLinkChat';

export default function SystemStatusPanel() {
    // Shared State
    const { currentUser } = useApp();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [location, setLocation] = useState(calculateCurrentLocation());
    const [ping, setPing] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // UI State
    const [isGlitching, setIsGlitching] = useState(false);
    const [showFullStarLink, setShowFullStarLink] = useState(false);

    // 1. Time Update (1s) & Location
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            setLocation(calculateCurrentLocation());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Ping / Latency Check (15s)
    useEffect(() => {
        const checkPing = async () => {
            const start = Date.now();
            try {
                await fetch('/?ping=' + Date.now(), { method: 'HEAD' });
                const end = Date.now();
                setPing(end - start);
                setIsOnline(true);
            } catch (e) {
                setPing(-1);
                setIsOnline(false);
            }
        };
        checkPing();
        const pingTimer = setInterval(checkPing, 15000);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            clearInterval(pingTimer);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const formatDate = date => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const formatTime = date => {
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return (
        <>
            {showFullStarLink && (
                <StarLinkChat onClose={() => setShowFullStarLink(false)} />
            )}

            <div className={`absolute bottom-8 right-8 z-10 w-80 font-pixel transition-all duration-200 ${isGlitching ? 'opacity-50 translate-x-1 skew-x-2' : 'opacity-100'}`}>
                <div className="relative overflow-hidden bg-blue-900/30 backdrop-blur-md border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.2)] rounded-tl-2xl rounded-br-2xl p-4 text-cyan-100 flex flex-col gap-3 transition-colors duration-300">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/50 rounded-tl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/50 rounded-br-lg"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_4px,3px_100%]"></div>

                    <div className="relative z-10 flex flex-col gap-3 min-h-[140px]">
                        <div className="flex items-start justify-between border-b border-cyan-500/20 pb-2">
                            <div className="flex flex-col">
                                <span className="text-xs text-cyan-400/80 tracking-widest uppercase mb-0.5">系统时间 (北京时间)</span>
                                <div className="text-3xl tracking-widest text-shadow-glow font-bold leading-none">
                                    {formatTime(currentTime)}
                                </div>
                                <span className="text-sm text-cyan-300/60 mt-0.5 tracking-wider">
                                    {formatDate(currentTime)}
                                </span>
                            </div>
                            <Clock className="text-cyan-400/60 w-5 h-5 animate-pulse" />
                        </div>

                        <div className="flex justify-between items-center gap-2">
                            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                <div className="flex items-center gap-2 text-xs text-cyan-400/80 tracking-widest uppercase">
                                    <MapPin size={14} />
                                    <span>当前轨道位置</span>
                                </div>
                                <div className="text-lg text-white/90 truncate tracking-wide pl-1">
                                    {location.name}
                                </div>
                                <div className="w-full bg-cyan-900/50 h-1 rounded-full overflow-hidden mt-1">
                                    <div className="bg-cyan-400 h-full w-1/3 animate-[shimmer_2s_infinite]"></div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowFullStarLink(true)}
                                className="bg-transparent border-0 outline-none cursor-pointer group/btn p-2"
                                title="进入 StarLink 终端"
                            >
                                <div className="w-8 h-8 border-2 border-white rounded-full shadow-[0_0_10px_white,inset_0_0_5px_white] opacity-60 group-hover/btn:opacity-100 group-hover/btn:shadow-[0_0_20px_white,inset_0_0_10px_white] transition-all duration-300 flex items-center justify-center">
                                    <div className="w-full h-full rounded-full bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                </div>
                            </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs font-mono">
                            <div className="flex items-center gap-2">
                                <Activity size={14} className={isOnline ? 'text-green-400' : 'text-red-400'} />
                                <span className={isOnline ? 'text-green-400/90' : 'text-red-400/90'}>
                                    {isOnline ? '系统在线' : '系统离线'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-cyan-400/60">延迟:</span>
                                <span className={`${ping > 200 ? 'text-yellow-400' : ping < 0 ? 'text-red-400' : 'text-cyan-300'}`}>
                                    {ping < 0 ? '错误' : `${ping}ms`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
