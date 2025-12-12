import { createContext, useContext, useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = (type, title, message, actionLink = null) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, title, message, actionLink }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const showToast = {
        success: (title, message, link) => addToast('success', title, message, link),
        error: (title, message, link) => addToast('error', title, message, link),
        warning: (title, message, link) => addToast('warning', title, message, link),
        info: (title, message, link) => addToast('info', title, message, link),
    };

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto transform transition-all duration-300 animate-in slide-in-from-right fade-in rounded-xl shadow-2xl p-4 border flex gap-3 backdrop-blur-md ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                                toast.type === 'error' ? 'bg-red-500/10 border-red-500/30' :
                                    toast.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                        'bg-blue-500/10 border-blue-500/30'
                            }`}
                    >
                        <div className={`mt-0.5 ${toast.type === 'success' ? 'text-green-500' :
                                toast.type === 'error' ? 'text-red-500' :
                                    toast.type === 'warning' ? 'text-yellow-500' :
                                        'text-blue-500'
                            }`}>
                            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                            {toast.type === 'info' && <Info className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                            <h4 className={`font-bold text-sm ${toast.type === 'success' ? 'text-green-400' :
                                    toast.type === 'error' ? 'text-red-400' :
                                        toast.type === 'warning' ? 'text-yellow-400' :
                                            'text-blue-400'
                                }`}>{toast.title}</h4>
                            <p className="text-sm text-gray-300 mt-1">{toast.message}</p>
                            {toast.actionLink && (
                                <button
                                    onClick={() => window.open(toast.actionLink, '_blank')}
                                    className="text-xs font-bold underline mt-2 hover:opacity-80 transition-opacity"
                                    style={{
                                        color: toast.type === 'success' ? '#4ade80' :
                                            toast.type === 'error' ? '#f87171' :
                                                toast.type === 'warning' ? '#facc15' : '#60a5fa'
                                    }}
                                >
                                    查看详情 &rarr;
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-gray-500 hover:text-white transition-colors self-start"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
