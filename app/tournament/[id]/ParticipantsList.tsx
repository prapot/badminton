import React from 'react';
import { TournamentInfo, User } from '../TournamentTypes';
import Swal from 'sweetalert2';

interface ParticipantsListProps {
    tournamentInfo: TournamentInfo;
    user: User | null;
    jwt: string | null;
    isJoined: boolean;
    joining: boolean;
    leaving: boolean;
    handleJoin: () => void;
    handleLeave: () => void;
    drawnPairs: any[] | null;
    playerMatchCounts: Record<number, number>;
    STRAPI_BASE_URL: string;
    refreshInfo: () => void;
    showToast: (msg: string, type: "success" | "error") => void;
    router: any;
    pausedPlayerIds: Set<number>;
    setPausedPlayerIds: React.Dispatch<React.SetStateAction<Set<number>>>;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({
    tournamentInfo,
    user,
    jwt,
    isJoined,
    joining,
    leaving,
    handleJoin,
    handleLeave,
    drawnPairs,
    playerMatchCounts,
    STRAPI_BASE_URL,
    refreshInfo,
    showToast,
    router,
    pausedPlayerIds,
    setPausedPlayerIds,
}) => {
    const handleTogglePause = (player: any) => {
        const newPaused = new Set(pausedPlayerIds);
        if (newPaused.has(player.id)) {
            newPaused.delete(player.id);
            showToast("กลับมาเล่นแล้ว", "success");
        } else {
            newPaused.add(player.id);
            showToast("พักการเล่นชั่วคราว", "success");
        }
        setPausedPlayerIds(newPaused);
    };

    const myPlayerEntry = tournamentInfo.players.find(p => p.id === user?.id);
    const canJoinLeave = tournamentInfo.tournament_status === "upcoming" ||
        (tournamentInfo.format === "endless_mode" && tournamentInfo.tournament_status === "ongoing");

    const spinnerSvg = (
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {/* Header row */}
            <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between gap-2">
                <h2 className="font-semibold text-white flex items-center gap-1.5 text-sm">
                    <span>👥</span> ผู้เข้าร่วม
                    <span className="text-xs text-slate-400 font-normal">{tournamentInfo.players.length} คน</span>
                </h2>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {drawnPairs && tournamentInfo.tournament_status === 'upcoming' && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                            🎾 {drawnPairs.length} แมตซ์
                        </div>
                    )}

                    {canJoinLeave && (
                        isJoined ? (
                            <div className="flex items-center gap-1.5">
                                {/* Pause self */}
                                <button
                                    onClick={() => myPlayerEntry && handleTogglePause(myPlayerEntry)}
                                    className={`min-h-[36px] px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all active:scale-95 ${pausedPlayerIds.has(myPlayerEntry?.id || 0)
                                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`}
                                >
                                    {pausedPlayerIds.has(myPlayerEntry?.id || 0) ? "▶️ เล่นต่อ" : "⏸️ พัก"}
                                </button>
                                <button
                                    onClick={handleLeave}
                                    disabled={leaving}
                                    className="min-h-[36px] flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {leaving ? spinnerSvg : "🚶"} ออก
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleJoin}
                                disabled={joining}
                                className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                            >
                                {joining ? spinnerSvg
                                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                                เข้าร่วม
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Player list */}
            {tournamentInfo.players.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                    <p className="text-3xl mb-2">🏸</p>
                    <p className="text-sm">ยังไม่มีผู้เข้าร่วม</p>
                </div>
            ) : (
                <ul className="divide-y divide-white/5">
                    {tournamentInfo.players.map((player, idx) => {
                        const isPaused = pausedPlayerIds.has(player.id);
                        const isSelf = player.id === user?.id;
                        const isOwner = tournamentInfo.user_created?.id === user?.id;
                        const canManagePlayer = canJoinLeave && (isSelf || (isOwner && !isSelf));
                        const pUrl = player.picture?.url
                            ? (player.picture.url.startsWith("http") ? player.picture.url : `${STRAPI_BASE_URL}${player.picture.url}`)
                            : null;
                        const matchCount = playerMatchCounts[player.id] ||
                            drawnPairs?.filter(dp => [dp.teamA, dp.teamB].flat().some((p: any) => p?.id === player.id)).length || 0;

                        return (
                            <li key={player.id} className={`flex items-center gap-3 px-4 py-3 ${isPaused ? "opacity-60" : ""}`}>
                                {/* Index */}
                                <span className="w-5 text-center text-[10px] text-slate-600 shrink-0">{idx + 1}</span>

                                {/* Avatar */}
                                <div
                                    onClick={() => router.push(`/history/${player.id}`)}
                                    className="w-9 h-9 rounded-xl shrink-0 overflow-hidden border border-[#2ecc71]/40 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                                >
                                    {pUrl
                                        ? <img src={pUrl} alt={player.username} className="w-full h-full object-cover" />
                                        : <div className="w-full h-full bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-white font-bold text-sm">
                                            {player.username.charAt(0).toUpperCase()}
                                        </div>}
                                </div>

                                {/* Name + stats */}
                                <div
                                    onClick={() => router.push(`/history/${player.id}`)}
                                    className="flex-1 min-w-0 cursor-pointer"
                                >
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-sm font-bold text-white truncate">{player.username}</p>
                                        {isPaused && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold shrink-0">⏸ พัก</span>
                                        )}
                                        {matchCount > 0 && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${tournamentInfo.tournament_status === 'upcoming'
                                                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                                🏸 {matchCount}
                                            </span>
                                        )}
                                    </div>

                                    {/* Ranking stats - compact single line */}
                                    {tournamentInfo.mode === "ranking" && (
                                        <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-medium">
                                            <span className="text-yellow-500 font-bold">
                                                {player.rankings?.[0]?.mmr ?? 1500}
                                            </span>
                                            <span className="text-slate-600">MMR</span>
                                            <span className="text-green-400">W{player.rankings?.[0]?.win ?? 0}</span>
                                            <span className="text-red-400">L{player.rankings?.[0]?.lose ?? 0}</span>
                                            {(player.rankings?.[0]?.win_streak ?? 0) > 0 && (
                                                <span className="text-orange-400">🔥{player.rankings?.[0]?.win_streak}</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                {canManagePlayer && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => handleTogglePause(player)}
                                            className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all active:scale-90 flex items-center justify-center ${isPaused
                                                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                                : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`}
                                        >
                                            {isPaused ? "▶" : "⏸"}
                                        </button>
                                        {isOwner && !isSelf ? (
                                            <button
                                                onClick={async () => {
                                                    const result = await Swal.fire({
                                                        title: "ยืนยันการลบผู้เล่น?",
                                                        text: `ลบ ${player.username} ออกจากรายการ?`,
                                                        icon: "warning",
                                                        showCancelButton: true,
                                                        confirmButtonText: "ลบออก",
                                                        cancelButtonText: "ยกเลิก",
                                                        confirmButtonColor: "#ef4444",
                                                        background: "#1a2535",
                                                        color: "#f1f5f9",
                                                    });
                                                    if (result.isConfirmed) {
                                                        try {
                                                            const res = await fetch(`${STRAPI_BASE_URL}/api/tournament-players/${player.tpDocumentId}`, {
                                                                method: "DELETE",
                                                                headers: { Authorization: `Bearer ${jwt}` },
                                                            });
                                                            if (!res.ok) throw new Error("ลบไม่สำเร็จ");
                                                            showToast("ลบผู้เล่นออกแล้ว", "success");
                                                            refreshInfo();
                                                        } catch {
                                                            showToast("ลบไม่สำเร็จ", "error");
                                                        }
                                                    }
                                                }}
                                                className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs transition-all active:scale-90 flex items-center justify-center"
                                            >
                                                ✕
                                            </button>
                                        ) : isSelf ? (
                                            <button
                                                onClick={handleLeave}
                                                disabled={leaving}
                                                className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs transition-all active:scale-90 flex items-center justify-center disabled:opacity-50"
                                            >
                                                🚶
                                            </button>
                                        ) : null}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default ParticipantsList;
