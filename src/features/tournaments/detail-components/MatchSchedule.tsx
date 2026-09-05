import React from 'react';
import Image from 'next/image';
import { TournamentInfo, User, ApiMatch } from '../types';
import { getRankInfoFromPoints } from '../utils/TournamentUtils';
import RankBadge from '../components/RankBadge';
import SkillBadge from '../components/SkillBadge';
import { cn } from '@/shared/utils/utils';
import { cva } from 'class-variance-authority';
import { ClipboardList, RefreshCw, XCircle, CheckCircle, Activity, Trophy, Play } from 'lucide-react';

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
    isOwner?: boolean;
}

const matchCardVariants = cva(
    "group relative overflow-hidden border rounded-2xl transition-all duration-300",
    {
        variants: {
            state: {
                default: "bg-black/20 border-white/5 hover:bg-black/40 hover:-translate-y-0.5 hover:shadow-xl hover:border-white/10 cursor-pointer active:scale-[0.99]",
                userInMatch: "bg-accent-yellow/5 border-accent-yellow ring-1 ring-accent-yellow/50 shadow-match-active hover:-translate-y-0.5 cursor-pointer active:scale-[0.99]",
                cancelled: "bg-black/20 border-white/5 opacity-60 grayscale cursor-not-allowed",
            }
        },
        defaultVariants: {
            state: "default",
        }
    }
);

const statusBadgeVariants = cva(
    "text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border",
    {
        variants: {
            status: {
                cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
                done: "bg-accent-green/20 text-accent-green border-accent-green/30 shadow-badge-green",
                ongoing: "bg-accent-blue/20 text-accent-blue border-accent-blue/30 animate-pulse",
                upcoming: "bg-white/5 text-slate-400 border-white/10"
            }
        }
    }
);

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
    isOwner,
}) => {
    const isOwnerOrAdmin = isOwner !== undefined ? isOwner : (!!user?.id && Number(tournamentInfo.user_created?.id) === Number(user?.id));

    if (tournamentInfo.tournament_status !== "ongoing" && tournamentInfo.tournament_status !== "completed") return null;

    return (
        <div id="match-schedule" className="bg-gradient-to-br from-brand-dark to-brand-darker border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Header: Glassmorphism */}
            <div className="px-4 py-4 sm:px-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 bg-white/5 backdrop-blur-md">
                <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 flex items-center gap-2.5 text-base sm:text-lg cursor-default">
                    <div className="p-2 bg-gradient-to-br from-accent-blue to-accent-blue-dark rounded-xl shadow-lg shadow-blue-900/20 text-white shrink-0">
                        <ClipboardList size={18} strokeWidth={2.5} />
                    </div>
                    ตารางแมตซ์
                </h2>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button onClick={() => fetchMatches()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-slate-300 text-xs font-semibold transition-all">
                        <RefreshCw size={14} />
                        <span>รีเฟรช</span>
                    </button>
                    {tournamentInfo.tournament_status === "ongoing" && isOwner && (
                        <button
                            onClick={handleFinishTournament}
                            disabled={starting}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 active:scale-95 border border-orange-500/30 text-orange-400 text-xs font-bold transition-all disabled:opacity-50"
                        >
                            <Trophy size={14} />
                            <span>จบการแข่งขัน</span>
                        </button>
                    )}
                </div>
            </div>

            {apiMatches.length === 0 ? (
                <div className="py-20 text-center text-slate-500 relative z-10 flex flex-col items-center gap-4">
                    <div className="p-4 bg-white/5 rounded-full">
                        <ClipboardList size={48} className="opacity-50" />
                    </div>
                    <p className="text-sm font-medium">ยังไม่มีข้อมูลแมตซ์การแข่งขัน</p>
                </div>
            ) : (
                <div className="p-3 sm:p-6 space-y-8 relative z-10">
                    {/* Group by round */}
                    {Array.from(new Set(apiMatches.map(m => m.round))).map(round => (
                        <div key={round} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent flex-1" />
                                <span className="px-4 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-400 uppercase tracking-widest text-center shadow-inner">
                                    แมตซ์ #{round}
                                </span>
                                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent flex-1" />
                            </div>

                            <div className="grid gap-4">
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
                                    .map((match, idx) => {
                                        const isCompleted = match.match_status === "done";
                                        const winnerA = isCompleted && match.score_a > match.score_b;
                                        const winnerB = isCompleted && match.score_b > match.score_a;

                                        const isUserInMatch = user?.id && (
                                            match.team_a_id?.team_players.some(tp => tp.user_id?.id === user.id) ||
                                            match.team_b_id?.team_players.some(tp => tp.user_id?.id === user.id)
                                        );

                                        const matchState = match.match_status === "cancelled" ? "cancelled" : (isUserInMatch ? "userInMatch" : "default");

                                        return (
                                            <div key={match.id}
                                                className={cn(matchCardVariants({ state: matchState }), "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both")}
                                                style={{ animationDelay: `${idx * 100}ms` }}
                                                onClick={() => {
                                                    if (tournamentInfo.tournament_status === "completed") return;
                                                    if ((match.match_status === "cancelled" || match.match_status === "done") && !isOwnerOrAdmin) return;
                                                    setScoreEditing(match);
                                                    setScoreA(match.score_a ?? 0);
                                                    setScoreB(match.score_b ?? 0);
                                                }}>

                                                {/* Top info row: match no + status badge */}
                                                <div className="flex items-center justify-between px-3 pt-3 pb-2 sm:px-5 sm:pt-4 border-b border-white/5 bg-black/10">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                        MATCH #{match.match_no}
                                                    </span>
                                                    <div>
                                                        {match.match_status === "cancelled" ? (
                                                            <div className={statusBadgeVariants({ status: "cancelled" })}>
                                                                <XCircle size={12} strokeWidth={2.5} />
                                                                ยกเลิกแล้ว
                                                            </div>
                                                        ) : isCompleted ? (
                                                            <div className={statusBadgeVariants({ status: "done" })}>
                                                                <CheckCircle size={12} strokeWidth={3} />
                                                                จบแล้ว
                                                            </div>
                                                        ) : tournamentInfo.tournament_status === "ongoing" ? (
                                                            <div className={statusBadgeVariants({ status: "ongoing" })}>
                                                                <Activity size={12} />
                                                                กำลังแข่ง
                                                            </div>
                                                        ) : (
                                                            <div className={statusBadgeVariants({ status: "upcoming" })}>
                                                                รอแข่ง
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-row items-center justify-between gap-16 sm:gap-4 px-2 py-3 sm:px-5 sm:py-5 relative">
                                                    {/* Team A */}
                                                    <div className={cn("flex-1 min-w-0 transition-colors", winnerA ? "text-accent-green" : (isCompleted && !winnerA ? "text-slate-500" : "text-white"))}>
                                                        <div className="flex flex-col gap-3 justify-center h-full">
                                                            {match.team_a_id?.team_players.map((tp, idx) => {
                                                                const uFromTp = tp.user_id || (tp.guest_name ? { id: 0, username: tp.guest_name, picture: null, rankings: [] } : null);
                                                                const u = uFromTp ? (tournamentInfo.players?.find(p => (tp.user_id && p.id === tp.user_id.id) || (tp.guest_name && p.is_guest && p.guest_name === tp.guest_name)) || uFromTp) : null;
                                                                if (!u) return null;
                                                                const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                                                const rp_change = match.match_histories?.find(mh => mh.users?.some(us => us.id === u.id))?.rp_change;
                                                                return (
                                                                    <div key={idx} className="flex items-center justify-end gap-2 sm:gap-3 relative">
                                                                        <div className="flex flex-col items-end justify-center min-w-0 shrink">
                                                                            <div className="flex items-center justify-end gap-1.5 sm:gap-2 mb-1">
                                                                                {winnerA && idx === 0 && <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider text-accent-green bg-accent-green/10 px-1 py-0.5 rounded-md">Win</span>}
                                                                                <div className="flex flex-col items-end">
                                                                                    <div className="flex items-center justify-end gap-1.5 flex-wrap flex-row-reverse">
                                                                                        <p className="font-bold text-xs sm:text-sm truncate text-white text-right">{u.username}</p>
                                                                                        {(u as any).skill_level && <SkillBadge skillLevel={(u as any).skill_level} showLabel={false} />}
                                                                                    </div>
                                                                                    {(u as any).nickname && <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{(u as any).nickname}</span>}
                                                                                </div>
                                                                            </div>
                                                                            {/* Stats - ranking mode only */}
                                                                            {tournamentInfo.mode === "ranking" && (
                                                                                <div className="flex flex-wrap items-center justify-end gap-1.5 mt-0.5">
                                                                                    <RankBadge rank={u.rankings?.[0]?.rank} stars={u.rankings?.[0]?.stars} size="sm" showName={true} />
                                                                                    {rp_change !== undefined && (
                                                                                        <span className={cn(
                                                                                            "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                                                                            rp_change > 0 ? "bg-accent-green/10 border-accent-green/30 text-accent-green" 
                                                                                            : rp_change < 0 ? "bg-red-500/10 border-red-500/30 text-red-400" 
                                                                                            : "bg-slate-500/10 border-slate-500/30 text-slate-400"
                                                                                        )}>
                                                                                            {rp_change > 0 ? "+" : rp_change < 0 ? "-" : "+"}{Math.abs(Math.floor(rp_change / 100))}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="relative flex items-center shrink-0">
                                                                            <div className={cn(
                                                                                "w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 transition-all duration-500 flex items-center justify-center shadow-inner",
                                                                                match.first_serve === "A" && idx === 0 ? "border-accent-green shadow-bounce-green scale-105" : "border-slate-700/50"
                                                                            )}>
                                                                                {pUrl ? <Image src={pUrl} alt={u.username} width={48} height={48} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                                                            </div>
                                                                            {match.first_serve === "A" && idx === 0 && (
                                                                                <div className="absolute -top-1.5 -right-1.5 z-30 w-5 h-5 bg-accent-green rounded-full border-2 border-brand-dark shadow-[0_0_8px_rgba(46,204,113,0.8)] animate-pulse flex items-center justify-center" title="First Serve">
                                                                                    <span className="text-[10px]">🏸</span>
                                                                                </div>
                                                                            )}
                                                                            {(() => {
                                                                                if (match.match_status !== 'done' && match.match_status !== 'cancelled') {
                                                                                    const currentRp = u.rankings?.[0]?.ranking_points || 0;
                                                                                    const currentRank = getRankInfoFromPoints(currentRp);
                                                                                    const potentialRank = getRankInfoFromPoints(currentRp + 100);
                                                                                    if (potentialRank.weight > currentRank.weight) {
                                                                                        return (
                                                                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-accent-yellow to-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-xl border border-white/20 whitespace-nowrap">
                                                                                                RANK UP
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
                                                    <div className="absolute sm:relative left-1/2 sm:left-auto top-1/2 sm:top-auto -translate-x-1/2 sm:translate-x-0 -translate-y-1/2 sm:translate-y-0 z-10 shrink-0 flex flex-col items-center justify-center">
                                                        {isCompleted ? (
                                                            <div className="flex items-center gap-1.5 sm:gap-4 bg-black/40 px-2 py-1 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-2xl border border-white/5 shadow-inner">
                                                                <span className={cn("text-base sm:text-3xl font-black tabular-nums", winnerA ? "text-accent-green" : "text-white")}>{match.score_a}</span>
                                                                <div className="flex flex-col items-center gap-0.5 sm:gap-1 opacity-50">
                                                                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white/40" />
                                                                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white/40" />
                                                                </div>
                                                                <span className={cn("text-base sm:text-3xl font-black tabular-nums", winnerB ? "text-accent-green" : "text-white")}>{match.score_b}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative backdrop-blur-md">
                                                                    <span className="text-[10px] font-black text-slate-400">VS</span>
                                                                    {tournamentInfo.tournament_status === "ongoing" && (
                                                                        <div className="absolute inset-0 rounded-full border border-accent-blue/30 animate-ping opacity-30" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Team B */}
                                                    <div className={cn("flex-1 min-w-0 transition-colors", winnerB ? "text-accent-green" : (isCompleted && !winnerB ? "text-slate-500" : "text-white"))}>
                                                        <div className="flex flex-col gap-3 justify-center h-full">
                                                            {match.team_b_id ? (
                                                                <>
                                                                    {match.team_b_id.team_players.map((tp, idx) => {
                                                                        const uFromTp = tp.user_id || (tp.guest_name ? { id: 0, username: tp.guest_name, picture: null, rankings: [] } : null);
                                                                        const u = uFromTp ? (tournamentInfo.players?.find(p => (tp.user_id && p.id === tp.user_id.id) || (tp.guest_name && p.is_guest && p.guest_name === tp.guest_name)) || uFromTp) : null;
                                                                        if (!u) return null;
                                                                        const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                                                        const rp_change = match.match_histories?.find(mh => mh.users?.some(us => us.id === u.id))?.rp_change;
                                                                        return (
                                                                            <div key={idx} className="flex items-center justify-start gap-2 sm:gap-3 relative">
                                                                                <div className="relative flex items-center shrink-0">
                                                                                    <div className={cn(
                                                                                        "w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 transition-all duration-500 flex items-center justify-center shadow-inner",
                                                                                        match.first_serve === "B" && idx === 0 ? "border-accent-green shadow-bounce-green scale-105" : "border-slate-700/50"
                                                                                    )}>
                                                                                        {pUrl ? <Image src={pUrl} alt={u.username} width={48} height={48} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                                                                    </div>
                                                                                    {match.first_serve === "B" && idx === 0 && (
                                                                                        <div className="absolute -top-1.5 -right-1.5 z-30 w-5 h-5 bg-accent-green rounded-full border-2 border-brand-dark shadow-[0_0_8px_rgba(46,204,113,0.8)] animate-pulse flex items-center justify-center" title="First Serve">
                                                                                            <span className="text-[10px]">🏸</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {(() => {
                                                                                        if (match.match_status !== 'done' && match.match_status !== 'cancelled') {
                                                                                            const currentRp = u.rankings?.[0]?.ranking_points || 0;
                                                                                            const currentRank = getRankInfoFromPoints(currentRp);
                                                                                            const potentialRank = getRankInfoFromPoints(currentRp + 100);
                                                                                            if (potentialRank.weight > currentRank.weight) {
                                                                                                return (
                                                                                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-accent-yellow to-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-xl border border-white/20 whitespace-nowrap">
                                                                                                        RANK UP
                                                                                                    </div>
                                                                                                );
                                                                                            }
                                                                                        }
                                                                                        return null;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex flex-col items-start justify-center min-w-0 shrink">
                                                                                    <div className="flex items-center justify-start gap-1.5 sm:gap-2 mb-1">
                                                                                        <div className="flex flex-col items-start">
                                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                                <p className="font-bold text-xs sm:text-sm truncate text-white text-left">{u.username}</p>
                                                                                                {(u as any).skill_level && <SkillBadge skillLevel={(u as any).skill_level} showLabel={false} />}
                                                                                            </div>
                                                                                            {(u as any).nickname && <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{(u as any).nickname}</span>}
                                                                                        </div>
                                                                                        {winnerB && idx === 0 && <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider text-accent-green bg-accent-green/10 px-1 py-0.5 rounded-md">Win</span>}
                                                                                    </div>
                                                                                    {/* Stats - ranking mode only */}
                                                                                    {tournamentInfo.mode === "ranking" && (
                                                                                        <div className="flex flex-wrap items-center justify-start gap-1.5 mt-0.5">
                                                                                            <RankBadge rank={u.rankings?.[0]?.rank} stars={u.rankings?.[0]?.stars} size="sm" showName={true} />
                                                                                            {rp_change !== undefined && (
                                                                                                <span className={cn(
                                                                                                    "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                                                                                    rp_change > 0 ? "bg-accent-green/10 border-accent-green/30 text-accent-green" 
                                                                                                    : rp_change < 0 ? "bg-red-500/10 border-red-500/30 text-red-400" 
                                                                                                    : "bg-slate-500/10 border-slate-500/30 text-slate-400"
                                                                                                )}>
                                                                                                    {rp_change > 0 ? "+" : rp_change < 0 ? "-" : "+"}{Math.abs(Math.floor(rp_change / 100))}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col items-start gap-1 p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5 border-dashed">
                                                                    <Play className="text-slate-500" size={14} />
                                                                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">รอบบาย / พัก</p>
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
