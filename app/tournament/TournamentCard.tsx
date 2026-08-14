import React from 'react';
import Image from 'next/image';
import { ListTournament, PlayerType, TournamentFormat, TournamentStatus } from './TournamentTypes';
import { useRouter } from 'next/navigation';

interface TournamentCardProps {
    tournament: ListTournament;
    joiningId: string | null;
    handleJoin: (tournamentId: string, isJoined: boolean) => void;
    STRAPI_BASE_URL: string;
}

const statusConfig: Record<TournamentStatus, { label: string; cls: string }> = {
    ongoing: { label: "● กำลังแข่ง", cls: "bg-green-500/10 text-green-400 border-green-500/20 animate-pulse" },
    upcoming: { label: "รอเริ่ม", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    completed: { label: "จบแล้ว", cls: "bg-white/5 text-slate-400 border-white/10" },
};

const formatLabel: Record<TournamentFormat, string> = {
    round_robin: "🔄 พบกันหมด",
    knockout: "⚡ แพ้คัดออก",
    americano: "🌀 อเมริกาโน",
    endless_mode: "♾️ โหมดต่อเนื่อง",
};

const typeLabel: Record<PlayerType, string> = {
    single: "🏸 เดี่ยว",
    double: "👥 คู่",
};

const TournamentCard: React.FC<TournamentCardProps> = ({
    tournament,
    joiningId,
    handleJoin,
    STRAPI_BASE_URL,
}) => {
    const router = useRouter();
    const sc = statusConfig[tournament.tournament_status];
    const isJoining = joiningId === tournament.documentId;

    return (
        <div
            className="group bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all duration-200 hover:bg-white/[0.07] cursor-pointer"
            onClick={() => router.push(`/tournament/${tournament.documentId}`)}
        >
            <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Left info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h2 className="text-base font-semibold text-white group-hover:text-green-300 transition-colors truncate">
                            {tournament.name}
                        </h2>
                        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sc.cls}`}>
                            {sc.label}
                        </span>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${tournament.mode === "ranking" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : tournament.mode === "party" ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                            {tournament.mode === "ranking" ? "🏆 Ranking" : tournament.mode === "party" ? "🎉 Party" : "🎮 Casual"}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 items-center">
                        <span className="flex items-center gap-1.5 text-[#2ecc71] font-bold">
                            📅 {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString("th-TH", { day: 'numeric', month: 'long', year: 'numeric' }) : "ไม่ระบุวันที่"}
                        </span>
                        <span className="w-px h-3 bg-white/10 hidden sm:block" />
                        <span>{typeLabel[tournament.type]}</span>
                        <span>{formatLabel[tournament.format]}</span>
                        <span>👥 {tournament.playerCount} ผู้เล่น</span>
                        <span className="w-px h-3 bg-white/10 hidden sm:block" />
                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                            {tournament.user_created?.picture?.url ? (
                                <Image
                                    src={tournament.user_created.picture.url.startsWith("http") ? tournament.user_created.picture.url : `${STRAPI_BASE_URL}${tournament.user_created.picture.url}`}
                                    alt={tournament.user_created.username}
                                    width={16}
                                    height={16}
                                    className="w-4 h-4 rounded-full object-cover border border-white/20"
                                />
                            ) : (
                                <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-300">
                                    {tournament.user_created?.username?.charAt(0).toUpperCase() || "?"}
                                </div>
                            )}
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">BY: {tournament.user_created?.username || "ADMIN"}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Join / Arrow */}
                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {tournament.tournament_status === "upcoming" && (
                        tournament.isJoined ? (
                            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold">
                                ✓ เข้าร่วมแล้ว
                            </span>
                        ) : (
                            <button
                                onClick={() => handleJoin(tournament.documentId, tournament.isJoined)}
                                disabled={isJoining}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-400 text-xs font-semibold transition-all disabled:opacity-50"
                            >
                                {isJoining ? (
                                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                )}
                                เข้าร่วม
                            </button>
                        )
                    )}

                    <div onClick={() => router.push(`/tournament/${tournament.documentId}`)}>
                        <svg className="w-5 h-5 text-slate-600 group-hover:text-green-400 transition-colors cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TournamentCard;
