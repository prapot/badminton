import React from "react";
import RankBadge from "@/features/tournaments/components/RankBadge";
import { RankingStats } from "../types";

interface Props {
    loading: boolean;
    rankingStats: RankingStats | null;
}

export function StatsSummary({ loading, rankingStats }: Props) {
    if (loading || !rankingStats) return null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md flex flex-col items-center justify-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-widest text-center">Current Rank</p>
                <RankBadge
                    rank={rankingStats.rank}
                    stars={rankingStats.stars}
                    size="sm"
                    showName={true}
                />
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest text-center">Matches</p>
                <p className="text-lg font-black text-white text-center">{rankingStats.match_played || 0}</p>
                <p className="text-[10px] text-slate-400 font-bold text-center">Total Games</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest text-center">Win / Loss</p>
                <p className="text-lg font-black text-center">
                    <span className="text-green-400">{rankingStats.win || 0}</span>
                    <span className="text-slate-600 mx-2">/</span>
                    <span className="text-red-400">{rankingStats.lose || 0}</span>
                </p>
                <p className="text-[10px] text-slate-400 font-bold text-center">
                    Winrate {rankingStats.match_played ? Math.round(((rankingStats.win || 0) / rankingStats.match_played) * 100) : 0}%
                </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest text-center">Brave Points</p>
                <p className="text-lg font-black text-purple-400 text-center">{rankingStats.brave_points || 0}</p>
                <div className="w-full bg-white/5 h-1 rounded-full mt-1 overflow-hidden">
                    <div
                        className="bg-purple-500 h-full transition-all"
                        style={{ width: `${Math.min(100, rankingStats.brave_points || 0)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
