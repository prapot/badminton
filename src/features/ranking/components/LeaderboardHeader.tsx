interface Props {
    totalPlayers: number;
}

export function LeaderboardHeader({ totalPlayers }: Props) {
    return (
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a2236] to-[#0f1923] border border-white/10 p-8 sm:p-10">
            <div className="absolute inset-0 pointer-events-none opacity-5">
                <svg className="w-full h-full" viewBox="0 0 900 200" preserveAspectRatio="xMidYMid slice">
                    <rect x="50" y="20" width="800" height="160" fill="none" stroke="#2ecc71" strokeWidth="2" />
                    <line x1="450" y1="20" x2="450" y2="180" stroke="#2ecc71" strokeWidth="3" />
                </svg>
            </div>
            <div className="absolute -top-4 -right-4 sm:top-4 sm:right-8 text-7xl sm:text-9xl opacity-10 select-none animate-pulse">🏆</div>
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20 mb-3 uppercase tracking-widest">
                    <span>🏅</span> ตารางอันดับผู้เล่น
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 tracking-tight">Leaderboard</h1>
                <p className="text-slate-400 text-sm sm:text-base">อัปเดตล่าสุด: {new Date().toLocaleDateString("th-TH")} · {totalPlayers} ผู้เล่นทั้งหมด</p>
            </div>
        </div>
    );
}
