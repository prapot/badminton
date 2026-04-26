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

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-white flex items-center gap-2">
                    <span>👥</span> ผู้เข้าร่วม
                    <span className="text-xs text-slate-400 font-normal">{tournamentInfo.players.length} คน</span>
                </h2>
                <div className="flex items-center gap-2">
                    {drawnPairs && tournamentInfo.tournament_status === 'upcoming' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                            <span>🎾 คาดการณ์: {drawnPairs.length} แมตซ์</span>
                        </div>
                    )}
                    {(tournamentInfo.tournament_status === "upcoming" || (tournamentInfo.format === "endless_mode" && tournamentInfo.tournament_status === "ongoing")) && (
                        <>
                            {isJoined ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => myPlayerEntry && handleTogglePause(myPlayerEntry)}
                                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${pausedPlayerIds.has(myPlayerEntry?.id || 0) ? 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20 text-green-400' : 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20 text-yellow-400'}`}
                                    >
                                        {pausedPlayerIds.has(myPlayerEntry?.id || 0) ? "▶️ เล่นต่อ" : "⏸️ พักชั่วคราว"}
                                    </button>
                                    <button onClick={handleLeave} disabled={leaving}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-all disabled:opacity-50">
                                        {leaving ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : "🚶 "}
                                        ออกจากรายการ
                                    </button>
                                </div>
                            ) : (
                                <button onClick={handleJoin} disabled={joining}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-400 text-xs font-semibold transition-all disabled:opacity-50">
                                    {joining ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                                    เข้าร่วม
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
            {tournamentInfo.players.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                    <p className="text-3xl mb-2">🏸</p>
                    <p className="text-sm">ยังไม่มีผู้เข้าร่วม</p>
                </div>
            ) : (
                <ul className="divide-y divide-white/5">
                    {tournamentInfo.players.map((player, idx) => (
                        <li key={player.id} className="flex items-center gap-4 px-5 py-3.5">
                            <span className="w-6 text-center text-xs text-slate-600 shrink-0">{idx + 1}</span>
                            {player.picture?.url ? (
                                <div
                                    onClick={() => router.push(`/history/${player.id}`)}
                                    className="w-8 h-8 rounded-xl shrink-0 overflow-hidden border border-[#2ecc71]/40 shadow-sm shadow-green-900/20 cursor-pointer hover:scale-110 transition-transform"
                                >
                                    <img src={player.picture.url.startsWith("http") ? player.picture.url : `${STRAPI_BASE_URL}${player.picture.url}`} alt={player.username} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div
                                    onClick={() => router.push(`/history/${player.id}`)}
                                    className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm shadow-green-900/20 cursor-pointer hover:scale-110 transition-transform"
                                >
                                    {player.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div
                                onClick={() => router.push(`/history/${player.id}`)}
                                className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 cursor-pointer group/name"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-white truncate group-hover/name:text-green-400 transition-colors">{player.username}</p>
                                        {pausedPlayerIds.has(player.id) && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold flex items-center gap-1 shrink-0 animate-pulse">
                                                <span>⏸️</span> พักการเล่น
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate">{player.email}</p>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    {tournamentInfo.mode === "ranking" && (
                                        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-400 font-medium bg-black/30 px-2 py-1 rounded-lg border border-white/5 w-fit">
                                            <span className="text-yellow-500 font-bold">MMR: {player.rankings?.[0]?.mmr ?? 1500}</span>
                                            <span className="text-slate-600">|</span>
                                            <span className="text-green-400">W: {player.rankings?.[0]?.win ?? "-"}</span>
                                            <span className="text-red-400">L: {player.rankings?.[0]?.lose ?? "-"}</span>
                                            <span className="text-slate-600">|</span>
                                            <span className="text-orange-400 font-bold">🔥 {player.rankings?.[0]?.win_streak ?? "-"}</span>
                                        </div>
                                    )}
                                    {((playerMatchCounts[player.id] || 0) > 0 || (tournamentInfo.tournament_status === 'upcoming' && drawnPairs && drawnPairs.filter(dp => [dp.teamA, dp.teamB].flat().some(p => p?.id === player.id)).length > 0)) && (
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-bold whitespace-nowrap ${tournamentInfo.tournament_status === 'upcoming' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                            🏸 {tournamentInfo.tournament_status === 'upcoming' ? 'คาดการณ์' : 'เล่นแล้ว'} {playerMatchCounts[player.id] || drawnPairs?.filter(dp => [dp.teamA, dp.teamB].flat().some(p => p?.id === player.id)).length || 0} รอบ
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                {player.id === user?.id && (tournamentInfo.tournament_status === "upcoming" || (tournamentInfo.format === "endless_mode" && tournamentInfo.tournament_status === "ongoing")) && (
                                    <>
                                        <button onClick={() => handleTogglePause(player)}
                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${pausedPlayerIds.has(player.id) ? 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20 text-green-400' : 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20 text-yellow-400'}`}>
                                            {pausedPlayerIds.has(player.id) ? "เล่นต่อ" : "พัก"}
                                        </button>
                                        <button onClick={handleLeave} disabled={leaving}
                                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all disabled:opacity-50">
                                            ออก
                                        </button>
                                    </>
                                )}
                                {/* Owner can remove anyone before start, or during Endless Mode matches */}
                                {tournamentInfo.user_created?.id === user?.id && player.id !== user?.id && (tournamentInfo.tournament_status === "upcoming" || (tournamentInfo.format === "endless_mode" && tournamentInfo.tournament_status === "ongoing")) && (
                                    <>
                                        <button onClick={() => handleTogglePause(player)}
                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${pausedPlayerIds.has(player.id) ? 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20 text-green-400' : 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20 text-yellow-400'}`}>
                                            {pausedPlayerIds.has(player.id) ? "ให้เล่น" : "ให้พัก"}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const result = await Swal.fire({
                                                    title: "ยืนยันการลบผู้เล่น?",
                                                    text: `คุณแน่ใจหรือไม่ว่าต้องการลบ ${player.username} ออกจากรายการ?`,
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
                                                    } catch (e) {
                                                        showToast("ลบไม่สำเร็จ", "error");
                                                    }
                                                }
                                            }}
                                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all">
                                            ลบออก
                                        </button>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ParticipantsList;
