"use client";

import { useMemo } from "react";
import { ApiMatch, RegisteredPlayer } from "../types";
import SkillBadge from "../components/SkillBadge";
import RankBadge from "../components/RankBadge";

interface EndlessStatsBoardProps {
    players: RegisteredPlayer[];
    apiMatches: ApiMatch[];
    tournamentMode: string;
}

export default function EndlessStatsBoard({
    players,
    apiMatches,
    tournamentMode
}: EndlessStatsBoardProps) {

    const stats = useMemo(() => {
        const playerStats = new Map<number, {
            id: number;
            username: string;
            nickname?: string;
            skill_level?: string;
            rank?: string;
            stars?: number;
            played: number;
            wins: number;
            losses: number;
            pointsFor: number;
            pointsAgainst: number;
        }>();

        players.forEach(p => {
            playerStats.set(p.id, {
                id: p.id,
                username: p.username || p.guest_name || "Unknown",
                nickname: p.nickname,
                skill_level: p.skill_level,
                rank: p.rankings?.[0]?.rank,
                stars: p.rankings?.[0]?.stars,
                played: 0,
                wins: 0,
                losses: 0,
                pointsFor: 0,
                pointsAgainst: 0
            });
        });

        apiMatches.forEach(m => {
            if (m.match_status !== "done") return;
            
            const scoreA = m.score_a || 0;
            const scoreB = m.score_b || 0;
            
            const teamAIds = m.team_a_id?.team_players.map(tp => tp.user_id?.id).filter(Boolean) || [];
            const teamBIds = m.team_b_id?.team_players.map(tp => tp.user_id?.id).filter(Boolean) || [];

            // A win if scoreA > scoreB
            const aWon = scoreA > scoreB;
            const bWon = scoreB > scoreA;

            teamAIds.forEach(id => {
                if (id && playerStats.has(id)) {
                    const s = playerStats.get(id)!;
                    s.played += 1;
                    if (aWon) s.wins += 1;
                    else if (bWon) s.losses += 1;
                    s.pointsFor += scoreA;
                    s.pointsAgainst += scoreB;
                }
            });

            teamBIds.forEach(id => {
                if (id && playerStats.has(id)) {
                    const s = playerStats.get(id)!;
                    s.played += 1;
                    if (bWon) s.wins += 1;
                    else if (aWon) s.losses += 1;
                    s.pointsFor += scoreB;
                    s.pointsAgainst += scoreA;
                }
            });
        });

        const sortedStats = Array.from(playerStats.values())
            .filter(s => s.played > 0)
            .sort((a, b) => {
                // Sort by Wins desc
                if (b.wins !== a.wins) return b.wins - a.wins;
                // Then Win Rate desc
                const wrA = a.played > 0 ? a.wins / a.played : 0;
                const wrB = b.played > 0 ? b.wins / b.played : 0;
                if (wrB !== wrA) return wrB - wrA;
                // Then PD desc
                const pdA = a.pointsFor - a.pointsAgainst;
                const pdB = b.pointsFor - b.pointsAgainst;
                return pdB - pdA;
            });

        return sortedStats;
    }, [players, apiMatches]);

    if (stats.length === 0) {
        return null; // Don't show if no matches are done yet
    }

    return (
        <div id="endless-stats" className="bg-gradient-to-br from-indigo-950/70 to-slate-900/90 border border-indigo-500/20 rounded-2xl overflow-hidden shadow-xl relative">
            <div className="pointer-events-none absolute top-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl -ml-24 -mt-24" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center shrink-0">
                            <span className="text-lg">🏆</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white leading-tight">สถิติประจำวัน</h2>
                            <p className="text-[10px] text-slate-500 leading-tight">จัดอันดับตามจำนวนชนะและเปอร์เซ็นต์ชนะ</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-[10px] text-slate-400 uppercase tracking-wider">
                                <th className="px-4 py-2 font-black">อันดับ</th>
                                <th className="px-4 py-2 font-black">ผู้เล่น</th>
                                <th className="px-4 py-2 text-center font-black">แข่ง</th>
                                <th className="px-4 py-2 text-center font-black">ชนะ</th>
                                <th className="px-4 py-2 text-center font-black">แพ้</th>
                                <th className="px-4 py-2 text-center font-black">Win%</th>
                                <th className="px-4 py-2 text-center font-black">PD</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {stats.map((s, idx) => {
                                const winRate = s.played > 0 ? ((s.wins / s.played) * 100).toFixed(0) : "0";
                                const pd = s.pointsFor - s.pointsAgainst;
                                const isTop3 = idx < 3;

                                return (
                                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                                idx === 0 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                                                idx === 1 ? "bg-slate-300/20 text-slate-300 border border-slate-300/30" :
                                                idx === 2 ? "bg-amber-600/20 text-amber-500 border border-amber-600/30" :
                                                "text-slate-500 font-medium"
                                            }`}>
                                                {idx + 1}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className={`font-bold ${isTop3 ? 'text-white' : 'text-slate-300'}`}>{s.username}</span>
                                                    {s.skill_level && <SkillBadge skillLevel={s.skill_level} showLabel={false} />}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {s.nickname && <span className="text-[10px] text-slate-500">{s.nickname}</span>}
                                                    {tournamentMode === 'ranking' && s.rank && <RankBadge rank={s.rank} stars={s.stars} showName={true} size="sm" />}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-400 font-medium">{s.played}</td>
                                        <td className="px-4 py-3 text-center text-green-400 font-bold">{s.wins}</td>
                                        <td className="px-4 py-3 text-center text-red-400 font-medium">{s.losses}</td>
                                        <td className="px-4 py-3 text-center font-bold text-indigo-300">{winRate}%</td>
                                        <td className="px-4 py-3 text-center text-xs font-medium">
                                            <span className={pd > 0 ? "text-green-400" : pd < 0 ? "text-red-400" : "text-slate-500"}>
                                                {pd > 0 ? `+${pd}` : pd}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
