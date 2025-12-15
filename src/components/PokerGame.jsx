import { useState, useEffect } from 'react';
import { X, Trophy, TrendingUp, Medal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getPlayerRating, recordGameResult, getLeaderboard, getUserRank } from '../lib/pokerRating';
import GameLobby from './GameLobby';

// 精致小卡牌组件
const PokerCard = ({ suit, value, onClick, disabled }) => {
    const suitColors = {
        '♠': '#000',
        '♥': '#dc2626',
        '♣': '#000',
        '♦': '#dc2626'
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`relative bg-white rounded-lg shadow-lg border border-gray-300 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-2 hover:shadow-2xl cursor-pointer'
                }`}
            style={{ width: '60px', height: '84px' }}
        >
            <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
                <span className="text-base font-bold" style={{ color: suitColors[suit] }}>{value}</span>
                <span className="text-sm" style={{ color: suitColors[suit] }}>{suit}</span>
            </div>
            <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180">
                <span className="text-base font-bold" style={{ color: suitColors[suit] }}>{value}</span>
                <span className="text-sm" style={{ color: suitColors[suit] }}>{suit}</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl" style={{ color: suitColors[suit] }}>{suit}</span>
            </div>
        </button>
    );
};

// 卡牌背面
const CardBack = () => (
    <div className="relative bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg shadow-lg border-2 border-blue-800"
        style={{ width: '60px', height: '84px' }}>
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                ))}
            </div>
        </div>
    </div>
);

// 排行榜弹窗
const Leaderboard = ({ onClose }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useApp();

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        const { data } = await getLeaderboard(50);
        setLeaderboard(data || []);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
            <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-white/20">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-cyan-900/30 to-blue-900/30">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-cyan-400" />
                        <div>
                            <h2 className="text-3xl font-bold text-white">排行榜</h2>
                            <p className="text-gray-400 text-sm">本赛季全服排名</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(85vh-100px)]">
                    {loading ? (
                        <div className="text-center py-16 text-gray-400">加载中...</div>
                    ) : (
                        leaderboard.map((entry, idx) => (
                            <div
                                key={entry.id}
                                className={`p-4 border-b border-white/5 flex items-center gap-4 transition-colors ${entry.user_id === currentUser?.id ? 'bg-cyan-500/10' : 'hover:bg-white/5'
                                    }`}
                            >
                                <div className="w-12 text-center">
                                    {idx === 0 && <Trophy className="w-7 h-7 text-yellow-500 mx-auto" />}
                                    {idx === 1 && <Medal className="w-7 h-7 text-gray-400 mx-auto" />}
                                    {idx === 2 && <Medal className="w-7 h-7 text-orange-600 mx-auto" />}
                                    {idx > 2 && <span className="text-gray-500 font-bold">#{idx + 1}</span>}
                                </div>
                                <div className="flex-1">
                                    <div className="text-white font-bold text-lg">{entry.profiles?.username || '匿名'}</div>
                                    <div className="text-sm text-gray-500">
                                        {entry.games_won}胜 {entry.games_lost}负 · 胜率 {entry.win_rate?.toFixed(1)}%
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-cyan-400">{entry.rating}</div>
                                    <div className="text-xs text-gray-500">积分</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default function PokerGame() {
    const { currentUser, showToast, setActiveTab } = useApp();
    const [showLobby, setShowLobby] = useState(true); // 显示大厅或游戏
    const [gameMode, setGameMode] = useState('menu');
    const [playerCount, setPlayerCount] = useState(3);
    const [players, setPlayers] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState(0);
    const [hands, setHands] = useState({});
    const [playedCards, setPlayedCards] = useState([]);
    const [winnerId, setWinnerId] = useState(null);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [playerRating, setPlayerRating] = useState(null);
    const [ratingChange, setRatingChange] = useState(null);

    useEffect(() => {
        if (currentUser) {
            loadRating();
        }
    }, [currentUser]);

    const loadRating = async () => {
        const { data } = await getPlayerRating(currentUser.id);
        setPlayerRating(data);
    };

    const handleEnterPoker = () => {
        setShowLobby(false);
    };

    const handleBackToLobby = () => {
        setShowLobby(true);
        setGameMode('menu');
    };

    const getAIStrategy = rating => {
        if (!rating) return 0.5;
        const winRate = rating.win_rate || 50;
        if (winRate < 55) return 0.3;
        if (winRate < 60) return 0.4;
        if (winRate < 65) return 0.6;
        return 0.7;
    };

    const createDeck = () => {
        const suits = ['♠', '♥', '♣', '♦'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck = [];
        suits.forEach(suit =>
            values.forEach(value =>
                deck.push({ suit, value, id: `${suit}-${value}`, power: values.indexOf(value) })
            )
        );
        return deck.sort(() => Math.random() - 0.5);
    };

    const startGame = () => {
        const deck = createDeck();
        const newPlayers = [
            { id: 'player', name: '你', isAI: false },
            ...Array.from({ length: playerCount - 1 }, (_, i) => ({
                id: `ai${i + 1}`,
                name: `AI ${i + 1}`,
                isAI: true
            }))
        ];

        const cardsPerPlayer = Math.floor(52 / playerCount);
        const newHands = {};
        newPlayers.forEach((player, idx) => {
            newHands[player.id] = deck.slice(idx * cardsPerPlayer, (idx + 1) * cardsPerPlayer)
                .sort((a, b) => a.power - b.power);
        });

        setPlayers(newPlayers);
        setHands(newHands);
        setCurrentPlayer(0);
        setPlayedCards([]);
        setWinnerId(null);
        setGameMode('playing');
    };

    const aiPlay = playerId => {
        const hand = hands[playerId];
        if (!hand || hand.length === 0) return;

        const aiDifficulty = getAIStrategy(playerRating);
        const card = Math.random() < aiDifficulty
            ? hand.reduce((min, c) => (c.power < min.power ? c : min), hand[0])
            : hand[Math.floor(Math.random() * hand.length)];

        setTimeout(() => playCard(playerId, card), 800);
    };

    const playCard = (playerId, card) => {
        const newHands = { ...hands };
        newHands[playerId] = newHands[playerId].filter(c => c.id !== card.id);

        setHands(newHands);
        setPlayedCards(prev => [...prev, { ...card, playerId }]);

        if (newHands[playerId].length === 0) {
            setWinnerId(playerId);
            finishGame(playerId);
            return;
        }

        const nextPlayerIndex = (currentPlayer + 1) % players.length;
        setCurrentPlayer(nextPlayerIndex);

        if (players[nextPlayerIndex].isAI) {
            aiPlay(players[nextPlayerIndex].id);
        }
    };

    const finishGame = async winnerId => {
        const isVictory = winnerId === 'player';
        if (currentUser) {
            const result = await recordGameResult(currentUser.id, playerCount, isVictory);
            if (result.success) {
                setRatingChange(result.ratingChange);
                await loadRating();
                showToast.success(
                    isVictory ? '胜利！' : '失败',
                    `积分${result.ratingChange > 0 ? '+' : ''}${result.ratingChange}`
                );
            }
        }
        setGameMode('finished');
    };

    return (
        <>
            {/* 显示大厅 */}
            {showLobby ? (
                <GameLobby onEnterPoker={handleEnterPoker} />
            ) : (
                /* 显示扑克游戏 */
                <div className="w-full h-full bg-gradient-to-br from-green-900 via-green-800 to-green-900 relative overflow-hidden">
                    {/* 退出按钮 */}
                    <button
                        onClick={handleBackToLobby}
                        className="absolute top-4 right-4 z-50 p-3 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur transition-all"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    {/* 主菜单 */}
                    {gameMode === 'menu' && (
                        <div className="w-full h-full flex items-center justify-center p-8">
                            <div className="max-w-5xl w-full">
                                <div className="text-center mb-12">
                                    <h1 className="text-6xl font-bold text-white mb-3 drop-shadow-lg">扑克游戏</h1>
                                    <p className="text-xl text-green-200">排位赛 · 本月积分赛</p>
                                </div>

                                {playerRating && (
                                    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 mb-8 border border-white/20">
                                        <div className="grid grid-cols-4 gap-8">
                                            <div className="text-center">
                                                <div className="text-green-300 text-sm mb-2">当前积分</div>
                                                <div className="text-5xl font-bold text-white">{playerRating.rating}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-green-300 text-sm mb-2">历史最高</div>
                                                <div className="text-3xl font-bold text-yellow-400">{playerRating.peak_rating}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-green-300 text-sm mb-2">胜率</div>
                                                <div className="text-3xl font-bold text-white">{playerRating.win_rate?.toFixed(1)}%</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-green-300 text-sm mb-2">战绩</div>
                                                <div className="text-xl text-white">
                                                    {playerRating.games_won}W {playerRating.games_lost}L
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-6">
                                    <button
                                        onClick={() => setGameMode('setup')}
                                        className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 hover:bg-white/20 transition-all border border-white/20 group"
                                    >
                                        <div className="text-6xl mb-4">🎮</div>
                                        <h3 className="text-3xl font-bold text-white mb-2">开始游戏</h3>
                                        <p className="text-green-200">与AI对战，赢取积分</p>
                                    </button>

                                    <button
                                        onClick={() => setShowLeaderboard(true)}
                                        className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 hover:bg-white/20 transition-all border border-white/20"
                                    >
                                        <div className="text-6xl mb-4">🏆</div>
                                        <h3 className="text-3xl font-bold text-white mb-2">排行榜</h3>
                                        <p className="text-green-200">查看全服排名</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 游戏设置 */}
                    {gameMode === 'setup' && (
                        <div className="w-full h-full flex items-center justify-center p-8">
                            <div className="max-w-4xl w-full">
                                <h2 className="text-4xl font-bold text-white text-center mb-8">选择游戏人数</h2>
                                <div className="grid grid-cols-4 gap-6 mb-12">
                                    {[3, 4, 5, 6].map(count => (
                                        <button
                                            key={count}
                                            onClick={() => setPlayerCount(count)}
                                            className={`p-8 rounded-2xl border-4 transition-all ${playerCount === count
                                                ? 'border-white bg-white/20 scale-110'
                                                : 'border-white/30 hover:border-white/60 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="text-6xl font-bold text-white mb-2">{count}</div>
                                            <div className="text-lg text-green-200">人游戏</div>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setGameMode('menu')}
                                        className="flex-1 py-5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xl transition-all border border-white/20"
                                    >
                                        返回
                                    </button>
                                    <button
                                        onClick={startGame}
                                        className="flex-1 py-5 bg-white hover:bg-green-100 text-green-900 rounded-xl font-bold text-xl transition-all shadow-xl"
                                    >
                                        开始游戏
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 游戏中 */}
                    {gameMode === 'playing' && (
                        <div className="w-full h-full flex flex-col p-6">
                            {/* 顶部信息栏 */}
                            <div className="flex justify-between mb-6">
                                <div className="bg-black/40 backdrop-blur px-6 py-3 rounded-xl border border-white/20">
                                    <div className="text-green-300 text-sm">当前回合</div>
                                    <div className="text-2xl font-bold text-white">{players[currentPlayer]?.name}</div>
                                </div>
                                {players.slice(1).map(player => (
                                    <div
                                        key={player.id}
                                        className={`bg-black/40 backdrop-blur px-6 py-3 rounded-xl border ${players.indexOf(player) === currentPlayer ? 'border-white' : 'border-white/20'
                                            }`}
                                    >
                                        <div className="text-green-300 text-sm">{player.name}</div>
                                        <div className="text-xl font-bold text-white">{hands[player.id]?.length || 0} 张</div>
                                    </div>
                                ))}
                            </div>

                            {/* 牌桌中心 */}
                            <div className="flex-1 flex items-center justify-center mb-6">
                                <div className="bg-green-700/50 rounded-3xl p-12 border-4 border-green-600/50 min-w-[600px] min-h-[300px] flex items-center justify-center shadow-2xl">
                                    <div className="flex gap-4">
                                        {playedCards.slice(-4).map((card, idx) => (
                                            <div key={`${card.id}-${idx}`} className="relative">
                                                <PokerCard suit={card.suit} value={card.value} disabled />
                                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/80 whitespace-nowrap">
                                                    {players.find(p => p.id === card.playerId)?.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 玩家手牌 */}
                            <div className="bg-black/40 backdrop-blur rounded-xl p-6 border border-white/20">
                                <div className="text-white font-bold mb-3 text-lg">你的手牌 ({hands['player']?.length || 0})</div>
                                <div className="flex gap-2 flex-wrap justify-center">
                                    {(hands['player'] || []).map(card => (
                                        <PokerCard
                                            key={card.id}
                                            suit={card.suit}
                                            value={card.value}
                                            disabled={currentPlayer !== 0}
                                            onClick={() => currentPlayer === 0 && playCard('player', card)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 游戏结束 */}
                    {gameMode === 'finished' && (
                        <div className="w-full h-full flex items-center justify-center p-8">
                            <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-12 max-w-2xl w-full border border-white/20">
                                <div className="text-center">
                                    <div className="text-8xl mb-6">{winnerId === 'player' ? '🎉' : '💪'}</div>
                                    <h2 className="text-5xl font-bold text-white mb-6">
                                        {winnerId === 'player' ? '胜利！' : '继续加油'}
                                    </h2>

                                    {ratingChange !== null && (
                                        <div className={`text-4xl font-bold mb-8 ${ratingChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            积分 {ratingChange > 0 ? '+' : ''}{ratingChange}
                                            <div className="text-xl text-gray-300 mt-2">当前: {playerRating?.rating || 1000}</div>
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setGameMode('menu')}
                                            className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xl transition-all"
                                        >
                                            返回菜单
                                        </button>
                                        <button
                                            onClick={startGame}
                                            className="flex-1 py-4 bg-white hover:bg-green-100 text-green-900 rounded-xl font-bold text-xl transition-all"
                                        >
                                            再来一局
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
                </div>
            )}
        </>
    );
}
