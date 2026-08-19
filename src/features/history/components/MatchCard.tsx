import React from "react";
import Link from "next/link";
import RankBadge from "@/features/tournaments/components/RankBadge";
import { getRankInfoFromPoints } from "@/features/tournaments/utils/TournamentUtils";
import { MatchHistory } from "../types";

interface Props {
    history: MatchHistory;
    userId: string;
}

export function MatchCard({ history: h, userId }: Props) {
    const match = h.matches?.[0];
    if (!match) return null;

    const isTeamA = match.team_a_id?.team_players?.some(tp => tp.user_id?.id === Number(userId));
    const userTeam = isTeamA ? match.team_a_id : match.team_b_id;
    const oppTeam = isTeamA ? match.team_b_id : match.team_a_id;
    const userScore = isTeamA ? match.score_a : match.score_b;
    const oppScore = isTeamA ? match.score_b : match.score_a;
    const isCancelled = match.match_status === "cancelled";
    const isWin = !isCancelled && h.is_win;

    const tournament = match.tournament_id;
    const isRanking = tournament?.mode === "ranking";

    const userTeamNames = userTeam?.team_players?.map(p => p.user_id?.username).join(" / ") || "รอยืนยัน";
    const oppTeamNames = oppTeam?.team_players?.map(p => p.user_id?.username).join(" / ") || "รอยืนยัน";

    return (
        <div
            className={`relative overflow-hidden p-5 rounded-2xl border transition-all duration-200 hover:scale-[1.01] ${isCancelled ? 'bg-slate-500/5 border-slate-500/20 grayscale opacity-80' :
                isWin ? 'bg-green-500/5 border-green-500/20 shadow-green-900/10 shadow-lg' : 'bg-red-500/5 border-red-500/20'
                }`}
        >
            <div className={`absolute top-0 right-0 px-4 py-8 pointer-events-none opacity-[0.03] text-6xl font-black italic`}>
                {isCancelled ? 'CANCEL' : isWin ? 'WIN' : 'LOSS'}
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        {isCancelled ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-500/10 text-slate-400 border-slate-500/20">
                                CANCELLED
                            </span>
                        ) : (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isWin ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                {isWin ? 'WIN' : 'LOSS'}
                            </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isRanking ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                            {isRanking ? '🏆 RANKING' : '🎮 CASUAL'}
                        </span>
                        {match.round && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-white/10 text-white border-white/20">
                                ROUND {match.round}
                            </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {new Date(h.createdAt).toLocaleDateString('th-TH', {
                                day: 'numeric', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                        {h.ranking?.season?.name && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20">
                                📅 {h.ranking.season.name}
                            </span>
                        )}
                    </div>

                    <p className="text-sm font-bold text-white mb-1 truncate">
                        {tournament?.name || "รายการแข่งขันถ้วยรางวัล"}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="font-semibold text-green-300">{userTeamNames}</span>
                        <span className="text-[9px] text-slate-600 italic">vs</span>
                        <span className="font-semibold">{oppTeamNames}</span>
                    </div>
                </div>

                <div className="flex items-center gap-8 shrink-0">
                    <div className="text-center">
                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-1 tracking-widest">Score</p>
                        <div className="flex items-center gap-2 px-3 py-1 bg-black/30 rounded-xl border border-white/5">
                            <span className={`text-lg font-black ${isWin ? 'text-green-400' : 'text-slate-400'}`}>{userScore}</span>
                            <span className="text-slate-600">:</span>
                            <span className={`text-lg font-black ${!isWin ? 'text-red-400' : 'text-slate-400'}`}>{oppScore}</span>
                        </div>
                    </div>

                    {isRanking && (
                        <div className="text-center min-w-[140px]">
                            <p className="text-[9px] text-slate-500 font-bold uppercase mb-2 tracking-widest">Rank Progression</p>
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <RankBadge
                                            rank={getRankInfoFromPoints(h.old_rp).rankStr}
                                            stars={getRankInfoFromPoints(h.old_rp).stars}
                                            size="sm"
                                            showName={true}
                                        />
                                        <span className="text-slate-600 font-bold">➜</span>
                                        <RankBadge
                                            rank={getRankInfoFromPoints(h.new_rp).rankStr}
                                            stars={getRankInfoFromPoints(h.new_rp).stars}
                                            size="sm"
                                            showName={true}
                                        />
                                    </div>
                                </div>
                                <span className={`text-[10px] font-black flex items-center gap-1 px-3 py-0.5 rounded-full bg-black/40 border border-white/5 ${h.rp_change > 0 ? 'text-green-400' : h.rp_change < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                    {h.rp_change > 0 ? `+${Math.abs(Math.floor(h.rp_change / 100))} ⭐` : h.rp_change < 0 ? `-${Math.abs(Math.floor(h.rp_change / 100))} ⭐` : 'PROTECTED 🛡️'}
                                    {h.rp_change > 0 && <span className="animate-bounce">↑</span>}
                                    {h.rp_change < 0 && <span className="animate-bounce">↓</span>}
                                </span>
                            </div>
                        </div>
                    )}

                    <Link
                        href={`/tournament/${tournament?.documentId}`}
                        className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all font-bold text-lg"
                        title="ดูทัวร์นาเมนต์นี้"
                    >
                        ➜
                    </Link>
                </div>
            </div>
        </div>
    );
}
