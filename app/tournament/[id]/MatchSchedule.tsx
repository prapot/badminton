import React from 'react';
import { TournamentInfo, User, ApiMatch } from '../TournamentTypes';
import { getRankInfoFromPoints } from '../TournamentUtils';
import RankBadge from '../RankBadge';

interface MatchScheduleProps {
    tournamentInfo: TournamentInfo;
    user: User | null;
    apiMatches: ApiMatch[];
    fetchMatches: () => void;
    handleFinishTournament: () => void;
    starting: boolean;
    setScoreEditing: (match: ApiMatch) => void;
    setScoreA: (score: number) => void;
    setScoreB: (score: number) => void;
    STRAPI_BASE_URL: string;
}

const MatchSchedule: React.FC<MatchScheduleProps> = ({
    tournamentInfo,
    user,
    apiMatches,
    fetchMatches,
    handleFinishTournament,
    starting,
    setScoreEditing,
    setScoreA,
    setScoreB,
    STRAPI_BASE_URL,
}) => {
    const isOwner = !!user?.id && Number(tournamentInfo.user_created?.id) === Number(user?.id);

    if (tournamentInfo.tournament_status !== "ongoing" && tournamentInfo.tournament_status !== "completed") return null;

    return (
        <div id="match-schedule" className="bg-gradient-to-br from-[#1a2535] to-[#0f1923] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between gap-2 relative z-10 bg-white/5 flex-wrap">
                <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 flex items-center gap-2 text-base cursor-default">
                    <span className="p-1.5 bg-gradient-to-br from-[#3498db] to-[#2980b9] rounded-xl shadow-lg shadow-blue-900/20 text-white shrink-0">📋</span>
                    ตารางแมตซ์
                </h2>
                <div className="flex items-center gap-2 ml-auto">
                    <button onClick={() => fetchMatches()}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-slate-300 text-xs font-semibold transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="hidden sm:inline">รีเฟรช</span>
                    </button>
                    {tournamentInfo.tournament_status === "ongoing" && isOwner && (
                        <button
                            onClick={handleFinishTournament}
                            disabled={starting}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 active:scale-95 border border-orange-500/30 text-orange-400 text-xs font-bold transition-all disabled:opacity-50"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>จบการแข่งขัน</span>
                        </button>
                    )}
                </div>
            </div>

            {apiMatches.length === 0 ? (
                <div className="py-16 text-center text-slate-500 relative z-10">
                    <p className="text-5xl mb-3 opacity-50">🏟️</p>
                    <p className="text-sm font-medium">ยังไม่มีข้อมูลแมตซ์การแข่งขัน</p>
                </div>
            ) : (
                <div className="p-4 sm:p-6 space-y-6 relative z-10">
                    {/* Group by round */}
                    {Array.from(new Set(apiMatches.map(m => m.round))).map(round => (
                        <div key={round} className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent flex-1" />
                                <span className="px-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                                    แมตซ์ #{round}
                                </span>
                                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent flex-1" />
                            </div>

                            <div className="grid gap-3">
                                {apiMatches
                                    .filter(m => m.round === round)
                                    .sort((a, b) => {
                                        const getStatusScore = (s: string) => {
                                            if (s === "upcoming") return 1;
                                            if (s === "done") return 2;
                                            if (s === "cancelled") return 3;
                                            return 4;
                                        };
                                        const scoreA = getStatusScore(a.match_status);
                                        const scoreB = getStatusScore(b.match_status);
                                        if (scoreA !== scoreB) return scoreA - scoreB;
                                        return (b.match_no ?? 0) - (a.match_no ?? 0);
                                    })
                                    .map(match => {
                                        const isCompleted = match.match_status === "done";
                                        const winnerA = isCompleted && match.score_a > match.score_b;
                                        const winnerB = isCompleted && match.score_b > match.score_a;

                                        const isUserInMatch = user?.id && (
                                            match.team_a_id?.team_players.some(tp => tp.user_id?.id === user.id) ||
                                            match.team_b_id?.team_players.some(tp => tp.user_id?.id === user.id)
                                        );

                                        return (
                                            <div key={match.id}
                                                className={`group relative overflow-hidden ${isUserInMatch ? 'bg-yellow-500/5 border-yellow-400 ring-1 ring-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.15)]' : 'bg-black/20 border-white/5'} border rounded-2xl transition-all duration-300 ${match.match_status !== "cancelled" ? `hover:bg-black/40 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer active:scale-[0.99] ${!isUserInMatch ? 'hover:border-white/10' : ''}` : ""} ${match.match_status === "cancelled" ? "opacity-60 grayscale" : ""}`}
                                                onClick={() => {
                                                    if (match.match_status === "cancelled") return;
                                                    setScoreEditing(match);
                                                    setScoreA(match.score_a ?? 0);
                                                    setScoreB(match.score_b ?? 0);
                                                }}>

                                                {/* Top info row: match no + status badge */}
                                                <div className="flex items-center justify-between px-4 pt-3 pb-0">
                                                    <span className="text-[10px] font-bold text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                                                        แมตซ์ #{match.match_no}
                                                    </span>
                                                    <div>
                                                        {match.match_status === "cancelled" ? (
                                                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                                ยกเลิกแล้ว
                                                            </span>
                                                        ) : isCompleted ? (
                                                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-bold shadow-[0_0_10px_rgba(46,204,113,0.15)] flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                จบแล้ว
                                                            </span>
                                                        ) : tournamentInfo.tournament_status === "ongoing" ? (
                                                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#3498db]/20 text-[#3498db] border border-[#3498db]/30 font-bold animate-pulse flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#3498db]" />
                                                                อยู่ระหว่าง
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="mt-2 flex items-center justify-between gap-1.5 sm:gap-4 px-3 sm:px-4 pb-3 sm:pb-4">
                                                    {/* Team A */}
                                                    <div className={`flex-1 min-w-0 transition-colors ${winnerA ? "text-green-400" : isCompleted && !winnerA ? "text-slate-500" : "text-white"}`}>
                                                        <div className="flex flex-col gap-2 sm:gap-3 justify-center h-full">
                                                            {match.team_a_id?.team_players.map((tp, idx) => {
                                                                const u = tp.user_id || (tp.guest_name ? { id: 0, username: tp.guest_name, picture: null, rankings: [] } : null);
                                                                if (!u) return null;
                                                                const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                                                const rp_change = match.match_histories?.find(mh => mh.users?.some(us => us.id === u.id))?.rp_change;
                                                                return (
                                                                    <div key={idx} className="flex items-center justify-end gap-2 sm:gap-3 relative">
                                                                        <div className="flex flex-col items-end min-w-0 flex-1">
                                                                            <div className="flex items-center justify-end gap-1.5 mb-1">
                                                                                {winnerA && idx === 0 && <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-md">Winner</span>}
                                                                                <p className="font-bold text-xs sm:text-sm truncate text-white">{u.username}</p>
                                                                            </div>
                                                                            {/* Stats - ranking mode only */}
                                                                            {tournamentInfo.mode === "ranking" && (
                                                                                <div className="flex items-center gap-2 bg-black/30 px-2 py-1 rounded-lg border border-white/5">
                                                                                    <RankBadge
                                                                                        rank={u.rankings?.[0]?.rank}
                                                                                        stars={u.rankings?.[0]?.stars}
                                                                                        size="sm"
                                                                                        showName={true}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="relative flex items-center shrink-0">
                                                                            <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 transition-all duration-500 flex items-center justify-center shadow-inner ${match.first_serve === "A" && idx === 0 ? "border-[#2ecc71] shadow-[0_0_20px_rgba(46,204,113,0.5)] scale-105" : "border-slate-700/50"}`}>
                                                                                {pUrl ? <img src={pUrl} alt={u.username} className="w-full h-full object-cover" /> : <span className="text-[10px] sm:text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                                                            </div>
                                                                            {match.first_serve === "A" && idx === 0 && (
                                                                                <div className="absolute -right-6 z-30 w-7 h-7 bg-[#2ecc71] rounded-full border-2 border-[#1a2535] flex items-center justify-center shadow-[0_0_15px_rgba(46,204,113,0.8)] animate-bounce-subtle">
                                                                                    <span className="text-[14px] filter drop-shadow-md">🏸</span>
                                                                                </div>
                                                                            )}
                                                                            {rp_change !== undefined && (
                                                                                <div className={`absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 z-20 px-2 sm:px-3 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black border shadow-lg whitespace-nowrap ${rp_change > 0 ? "bg-[#0f2a1a] border-green-500 text-green-400 shadow-green-900/40" : rp_change < 0 ? "bg-[#2a0f0f] border-red-500 text-red-400 shadow-red-900/40" : "bg-slate-800 border-slate-500 text-slate-300 shadow-black/40"}`}>
                                                                                    {rp_change > 0 ? "+" : rp_change < 0 ? "-" : "+"}{Math.abs(Math.floor(rp_change / 100))} ⭐
                                                                                </div>
                                                                            )}
                                                                            {(() => {
                                                                                if (match.match_status !== 'done' && match.match_status !== 'cancelled') {
                                                                                    const currentRp = u.rankings?.[0]?.ranking_points || 0;
                                                                                    const currentRank = getRankInfoFromPoints(currentRp);
                                                                                    const potentialRank = getRankInfoFromPoints(currentRp + 100);
                                                                                    if (potentialRank.weight > currentRank.weight) {
                                                                                        return (
                                                                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-yellow-400 to-amber-600 text-white text-[7px] sm:text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-xl border border-white/20 animate-pulse whitespace-nowrap">
                                                                                                RANK UP!
                                                                                                <div className="absolute -inset-1 bg-yellow-400/20 blur-md rounded-full -z-10 animate-pulse" />
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                            {(!match.team_a_id || match.team_a_id.team_players.length === 0) && (
                                                                <div className="text-right"><p className="font-bold text-sm text-slate-500">ทีม {match.team_a_id?.team_no ?? "?"}</p></div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Score / VS */}
                                                    <div className="shrink-0 flex flex-col items-center justify-center self-stretch">
                                                        {isCompleted ? (
                                                            <div className="flex items-center gap-1.5 sm:gap-3 bg-[#0f1923] px-2.5 sm:px-4 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/10 shadow-inner">
                                                                <span className={`text-lg sm:text-3xl font-black ${winnerA ? "text-green-400" : "text-white"}`}>{match.score_a}</span>
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <div className="w-px h-1.5 sm:h-2 bg-white/10" />
                                                                    <span className="text-[8px] sm:text-[10px] font-bold text-slate-600">VS</span>
                                                                    <div className="w-px h-1.5 sm:h-2 bg-white/10" />
                                                                </div>
                                                                <span className={`text-lg sm:text-3xl font-black ${winnerB ? "text-green-400" : "text-white"}`}>{match.score_b}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative">
                                                                    <span className="text-[8px] sm:text-xs font-black text-slate-500">VS</span>
                                                                    <div className="absolute inset-0 rounded-full border border-[#3498db]/30 animate-ping opacity-20" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Team B */}
                                                    <div className={`flex-1 min-w-0 transition-colors ${winnerB ? "text-green-400" : isCompleted && !winnerB ? "text-slate-500" : "text-white"}`}>
                                                        <div className="flex flex-col gap-3 justify-center h-full">
                                                            {match.team_b_id ? (
                                                                <>
                                                                    {match.team_b_id.team_players.map((tp, idx) => {
                                                                        const u = tp.user_id || (tp.guest_name ? { id: 0, username: tp.guest_name, picture: null, rankings: [] } : null);
                                                                        if (!u) return null;
                                                                        const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                                                        const rp_change = match.match_histories?.find(mh => mh.users?.some(us => us.id === u.id))?.rp_change;
                                                                        return (
                                                                            <div key={idx} className="flex items-center justify-start gap-2 sm:gap-3 relative">
                                                                                <div className="relative flex items-center shrink-0">
                                                                                    <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 transition-all duration-500 flex items-center justify-center shadow-inner ${match.first_serve === "B" && idx === 0 ? "border-[#2ecc71] shadow-[0_0_20px_rgba(46,204,113,0.5)] scale-105" : "border-slate-700/50"}`}>
                                                                                        {pUrl ? <img src={pUrl} alt={u.username} className="w-full h-full object-cover" /> : <span className="text-[10px] sm:text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                                                                    </div>
                                                                                    {match.first_serve === "B" && idx === 0 && (
                                                                                        <div className="absolute -left-6 z-30 w-7 h-7 bg-[#2ecc71] rounded-full border-2 border-[#1a2535] flex items-center justify-center shadow-[0_0_15px_rgba(46,204,113,0.8)] animate-bounce-subtle">
                                                                                            <span className="text-[14px] filter drop-shadow-md">🏸</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {rp_change !== undefined && (
                                                                                        <div className={`absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 z-20 px-2 sm:px-3 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black border shadow-lg whitespace-nowrap ${rp_change > 0 ? "bg-[#0f2a1a] border-green-500 text-green-400 shadow-green-900/40" : rp_change < 0 ? "bg-[#2a0f0f] border-red-500 text-red-400 shadow-red-900/40" : "bg-slate-800 border-slate-500 text-slate-300 shadow-black/40"}`}>
                                                                                            {rp_change > 0 ? "+" : rp_change < 0 ? "-" : "+"}{Math.abs(Math.floor(rp_change / 100))} ⭐
                                                                                        </div>
                                                                                    )}
                                                                                    {(() => {
                                                                                        if (match.match_status !== 'done' && match.match_status !== 'cancelled') {
                                                                                            const currentRp = u.rankings?.[0]?.ranking_points || 0;
                                                                                            const currentRank = getRankInfoFromPoints(currentRp);
                                                                                            const potentialRank = getRankInfoFromPoints(currentRp + 100);
                                                                                            if (potentialRank.weight > currentRank.weight) {
                                                                                                return (
                                                                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-yellow-400 to-amber-600 text-white text-[7px] sm:text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-xl border border-white/20 animate-pulse whitespace-nowrap">
                                                                                                        RANK UP!
                                                                                                        <div className="absolute -inset-1 bg-yellow-400/20 blur-md rounded-full -z-10 animate-pulse" />
                                                                                                    </div>
                                                                                                );
                                                                                            }
                                                                                        }
                                                                                        return null;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex flex-col items-start min-w-0 flex-1">
                                                                                    <div className="flex items-center justify-start gap-1.5 mb-1">
                                                                                        <p className="font-bold text-xs sm:text-sm truncate text-white">{u.username}</p>
                                                                                        {winnerB && idx === 0 && <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-md">Winner</span>}
                                                                                    </div>
                                                                                    {/* Stats - ranking mode only */}
                                                                                    {tournamentInfo.mode === "ranking" && (
                                                                                        <div className="flex items-center gap-2 bg-black/30 px-2 py-1 rounded-lg border border-white/5">
                                                                                            <RankBadge
                                                                                                rank={u.rankings?.[0]?.rank}
                                                                                                stars={u.rankings?.[0]?.stars}
                                                                                                size="sm"
                                                                                                showName={true}
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col items-start gap-1">
                                                                    <span className="text-xl sm:text-2xl">💤</span>
                                                                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">พักรอบพักผ่อน</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MatchSchedule;
