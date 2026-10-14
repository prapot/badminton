interface JoinTournamentCardProps {
    isOngoing: boolean;
    playerCount: number;
    joining: boolean;
    onJoin: () => void;
}

/** Call to join, shown above the tabs so it is visible whichever tab is open. */
export default function JoinTournamentCard({ isOngoing, playerCount, joining, onJoin }: JoinTournamentCardProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-500/15 to-indigo-500/10 border border-blue-500/25">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl shrink-0">🏸</div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-white">คุณยังไม่ได้เข้าร่วมรายการนี้</p>
                    <p className="text-xs text-slate-400">
                        {isOngoing
                            ? "กำลังแข่งอยู่ ยังเข้าร่วมได้ ระบบจะจัดคิวให้ทันคนอื่น"
                            : `ลงชื่อร่วมแข่งกับอีก ${playerCount} คน`}
                    </p>
                </div>
            </div>
            <button
                onClick={onJoin}
                disabled={joining}
                className="min-h-11 w-full sm:w-auto flex items-center justify-center gap-2 px-6 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
                {joining ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                )}
                เข้าร่วมการแข่งขัน
            </button>
        </div>
    );
}
