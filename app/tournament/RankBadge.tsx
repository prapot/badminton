import React from 'react';

interface RankBadgeProps {
    rank?: string;
    stars?: number;
    showName?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const RankBadge: React.FC<RankBadgeProps> = ({ rank: initialRank, stars = 0, showName = true, size = 'md' }) => {
    const rank = initialRank || "Unranked";
    
    const getRankDetails = (rankName: string) => {
        const name = rankName.split(' ')[0].toLowerCase();
        if (name.includes('bronze')) return { color: 'from-[#cd7f32] to-[#a0522d]', icon: '🥉', textColor: 'text-orange-200' };
        if (name.includes('silver')) return { color: 'from-[#bdc3c7] to-[#7f8c8d]', icon: '🥈', textColor: 'text-slate-200' };
        if (name.includes('gold')) return { color: 'from-[#f1c40f] to-[#f39c12]', icon: '🥇', textColor: 'text-yellow-100' };
        if (name.includes('platinum')) return { color: 'from-[#3498db] to-[#2980b9]', icon: '💎', textColor: 'text-blue-100' };
        if (name.includes('diamond')) return { color: 'from-[#9b59b6] to-[#8e44ad]', icon: '💠', textColor: 'text-purple-100' };
        if (name.includes('master')) return { color: 'from-[#e74c3c] to-[#c0392b]', icon: '🏆', textColor: 'text-red-100' };
        return { color: 'from-slate-600 to-slate-800', icon: '❓', textColor: 'text-slate-400' };
    };

    const details = getRankDetails(rank);
    
    const sizeClasses = {
        sm: { container: 'px-1.5 py-0.5', text: 'text-[9px]', star: 'w-1.5 h-1.5', icon: 'text-[10px]' },
        md: { container: 'px-2 py-1', text: 'text-[11px]', star: 'w-2 h-2', icon: 'text-xs' },
        lg: { container: 'px-3 py-1.5', text: 'text-sm', star: 'w-3 h-3', icon: 'text-base' }
    };

    const s = sizeClasses[size];

    const getMaxStars = (rankName: string) => {
        if (rankName.includes('Bronze')) return 3;
        if (rankName.includes('Silver')) return 3;
        if (rankName.includes('Gold')) return 4;
        if (rankName.includes('Platinum')) return 5;
        if (rankName.includes('Diamond')) return 5;
        return 0; // Master handled separately
    };

    const maxStars = getMaxStars(rank);

    return (
        <div className={`flex flex-col items-center gap-1`}>
            <div className={`flex items-center gap-1.5 ${s.container} rounded-lg bg-gradient-to-br ${details.color} shadow-lg border border-white/20`}>
                <span className={s.icon}>{details.icon}</span>
                {showName && (
                    <span className={`font-black uppercase tracking-tight ${details.textColor} ${s.text}`}>
                        {rank}
                    </span>
                )}
            </div>
            
            {/* Stars Row */}
            {rank !== 'Unranked' && (
                <div className="flex items-center gap-1">
                    {rank.includes('Master') ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 shadow-inner">
                            <div className={`${s.star} bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.6)]`} />
                            <span className={`${s.text} font-black text-yellow-400 drop-shadow-sm`}>x{stars}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-0.5">
                            {[...Array(maxStars)].map((_, i) => (
                                <div key={i} className={`${s.star} rounded-full shadow-sm transition-all duration-500 ${i < stars ? 'bg-yellow-400 shadow-yellow-500/50 scale-110' : 'bg-black/40 border border-white/10'}`}>
                                    {i < stars && <div className="w-full h-full bg-white/30 rounded-full animate-pulse" />}
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
