import { useState } from 'react';

const COMMON_EMOJIS = [
    '😀', '😂', '🤣', '😊', '🥰', '😍', '🤩', '😘', '😋', '😎',
    '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮',
    '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤',
    '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖',
    '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯',
    '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '🥴', '😠',
    '😡', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🤠',
    '🥳', '🥺', '🤫', '🤭', '🧐', '🤓', '😈', '👿', '🤡', '👻',
    '💩', '👽', '👾', '🤖', '👏', '👋', '👍', '👎', '👊', '✌️',
    '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️'
];

export default function EmojiPicker({ onSelect, onClose }) {
    return (
        <div
            className="absolute z-50 top-full left-0 mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-2xl w-64 p-3 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                {COMMON_EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => {
                            onSelect(emoji);
                            // Optional: onClose(); // Keep open for multiple? Or close? usually close.
                            // But for "X" style, maybe keep open? Let's not auto-close for now.
                        }}
                        className="text-xl hover:bg-white/10 rounded p-1 transition-colors"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            {/* Small close button/footer if needed, but click outside handles simple cases usually. */}
        </div>
    );
}
