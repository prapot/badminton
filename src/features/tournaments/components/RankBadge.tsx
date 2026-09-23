import React from 'react';
import { getMaxStarsForRank } from '../utils/TournamentUtils';

interface RankBadgeProps {
    rank?: string;
    stars?: number;
    showName?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const RankBadge: React.FC<RankBadgeProps> = ({ rank: initialRank, stars = 0, showName = true, size = 'md' }) => {
    let rank = initialRank || "Bronze V";
    
    // Normalize rank string (e.g., Bronze 5 -> Bronze V)
    if (rank) {
        rank = rank.replace(/\s5$/, ' V')
                   .replace(/\s4$/, ' IV')
                   .replace(/\s3$/, ' III')
                   .replace(/\s2$/, ' II')
                   .replace(/\s1$/, ' I');
    }

    const getRankDetails = (rankName: string) => {
        const name = rankName.split(' ')[0].toLowerCase();
        if (name.includes('bronze')) return { 
            color: 'from-[#cc6e3c] via-[#b87333] to-[#8b4513]', 
            icon: '🥉', 
            textColor: 'text-orange-100',
            glow: 'shadow-orange-900/40',
            border: 'border-orange-400/30'
        };
        if (name.includes('silver')) return { 
            color: 'from-[#bdc3c7] via-[#95a5a6] to-[#7f8c8d]', 
            icon: '🥈', 
            textColor: 'text-slate-100',
            glow: 'shadow-slate-500/30',
            border: 'border-slate-300/30'
        };
        if (name.includes('gold')) return { 
            color: 'from-[#f1c40f] via-[#f39c12] to-[#d35400]', 
            icon: '🥇', 
            textColor: 'text-yellow-50 text-shadow-sm',
            glow: 'shadow-yellow-500/40',
            border: 'border-yellow-300/40'
        };
        if (name.includes('platinum')) return { 
            color: 'from-[#3498db] via-[#2980b9] to-[#1a5276]', 
            icon: '💎', 
            textColor: 'text-blue-50',
            glow: 'shadow-blue-500/50',
            border: 'border-blue-300/40'
        };
        if (name.includes('diamond')) return { 
            color: 'from-[#9b59b6] via-[#8e44ad] to-[#5b2c6f]', 
            icon: '💠', 
            textColor: 'text-purple-50',
            glow: 'shadow-purple-500/50',
            border: 'border-purple-300/40'
        };
        if (name.includes('master')) return { 
            color: 'from-[#e74c3c] via-[#c0392b] to-[#78281f]', 
            icon: '🏆', 
            textColor: 'text-red-50 font-black tracking-tighter animate-pulse',
            glow: 'shadow-red-500/60',
            border: 'border-red-400/50'
        };
        return { 
            color: 'from-slate-600 via-slate-700 to-slate-800', 
            icon: '❓', 
            textColor: 'text-slate-400',
            glow: 'shadow-black/20',
            border: 'border-slate-500/20'
        };
    };

    const details = getRankDetails(rank);

    const sizeClasses = {
        sm: { 
            container: 'px-1.5 py-0.5 min-w-[60px]', 
            text: 'text-[8px]', 
            star: 'w-2.5 h-2.5', 
            icon: 'text-[9px]',
            gap: 'gap-0.5'
        },
        md: { 
            container: 'px-3 py-1 min-w-[90px]', 
            text: 'text-[11px]', 
            star: 'w-3.5 h-3.5', 
            icon: 'text-xs',
            gap: 'gap-1'
        },
        lg: { 
            container: 'px-4 py-2 min-w-[120px]', 
            text: 'text-sm', 
            star: 'w-4.5 h-4.5', 
            icon: 'text-base',
            gap: 'gap-1.5'
        }
    };

    const s = sizeClasses[size];
    const maxStars = getMaxStarsForRank(rank);
    const isMaster = rank.toLowerCase().includes('master');

    return (
        <div className={`flex flex-col items-center ${s.gap} perspective-[1000px]`}>
            {/* Main Badge Container */}
            <div className={`
                relative flex items-center justify-center gap-1.5 ${s.container} 
                rounded-full bg-gradient-to-br ${details.color} 
                ${details.glow} shadow-lg border-2 ${details.border}
                group hover:scale-105 transition-all duration-300 transform-gpu
            `}>
                {/* Shimmer Effect */}
                <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none opacity-20">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                </div>

                <span className={`${s.icon} drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]`}>{details.icon}</span>

                {showName && (
                    <span className={`
                        font-black uppercase tracking-wider ${details.textColor} ${s.text}
                        drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]
                    `}>
                        {rank}
                    </span>
                )}
            </div>

            {/* Stars Section */}
            {rank !== 'Unranked' && rank !== 'None' && (
                <div className="flex items-center justify-center min-h-[14px]">
                    {isMaster ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/40 backdrop-blur-sm shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                            <span className="text-[9px] leading-none drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]">⭐</span>
                            <span className={`${s.text} font-black text-yellow-300 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]`}>x{stars}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            {[...Array(maxStars)].map((_, i) => (
                                <div key={i} className="relative flex items-center justify-center">
                                    {i < stars ? (
                                        <svg
                                            viewBox="0 0 24 24"
                                            className={`${s.star} text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)] transition-all duration-300 transform scale-105`}
                                            fill="currentColor"
                                        >
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                    ) : (
                                        <svg
                                            viewBox="0 0 24 24"
                                            className={`${s.star} text-white/20 transition-all duration-300`}
                                            fill="rgba(255,255,255,0.06)"
                                            stroke="rgba(255,255,255,0.3)"
                                            strokeWidth="1.5"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RankBadge;
