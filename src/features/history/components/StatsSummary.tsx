import React from "react";
import RankBadge from "@/features/tournaments/components/RankBadge";
import { getMaxStarsForRank } from "@/features/tournaments/utils/TournamentUtils";
import { ApiSeason, RankingStats } from "../types";

interface Props {
    loading: boolean;
    rankingStats: RankingStats | null;
    seasons: ApiSeason[];
    selectedSeason: string;
    setSelectedSeason: (season: string) => void;
    setPage: (page: number) => void;
}

const BRAVE_POINTS_CAP = 100;

/** Every card uses the same rows (label / value / caption) so they line up; `footer` hugs the bottom edge */
function StatCard({ label, children, caption, footer }: { label: string; children: React.ReactNode; caption: React.ReactNode; footer?: React.ReactNode }) {
    return (
        <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md px-4 pt-4 pb-5 flex flex-col items-center text-center">
            <p className="text-xs text-slate-400 font-bold">{label}</p>
            <div className="h-14 flex items-center justify-center">{children}</div>
            <p className="text-xs text-slate-400">{caption}</p>
            {footer && <div className="absolute inset-x-0 bottom-0">{footer}</div>}
        </div>
    );
}

export function StatsSummary({ loading, rankingStats, seasons, selectedSeason, setSelectedSeason, setPage }: Props) {
    const bravePoints = rankingStats?.brave_points || 0;
    const played = rankingStats?.match_played || 0;
    const winRate = played ? Math.round(((rankingStats?.win || 0) / played) * 100) : 0;

    return (
        <section className="mb-6 sm:mb-8">
            {/* The season picker sits next to the section it controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h2 className="text-base font-bold text-white">สถิติรายซีซัน</h2>
                <select
                    value={selectedSeason}
                    onChange={(e) => {
                        setSelectedSeason(e.target.value);
                        setPage(1);
                    }}
                    aria-label="เลือกซีซัน"
                    className="w-full sm:w-auto min-h-11 bg-black/30 border border-white/10 rounded-xl px-3 text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 cursor-pointer hover:bg-black/60"
                >
                    <option value="all">ทุกซีซัน</option>
                    {seasons.map((s) => (
                        <option key={s.documentId} value={s.documentId}>
                            {s.name} {s.is_active ? "(ปัจจุบัน)" : ""}
                        </option>
                    ))}
                </select>
            </div>

            {loading || !rankingStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {[0, 1, 2, 3].map(i => <div key={i} className="h-[122px] rounded-2xl bg-white/5 animate-pulse" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <StatCard
                        label="แรงค์"
                        caption={/master/i.test(rankingStats.rank || "")
                            ? `⭐ x${rankingStats.stars || 0}`
                            : `⭐ ${rankingStats.stars || 0} / ${getMaxStarsForRank(rankingStats.rank || "Bronze V")} ดาว`}
                    >
                        <RankBadge rank={rankingStats.rank} stars={rankingStats.stars} size="md" showName={true} showStars={false} />
                    </StatCard>

                    <StatCard label="แข่งไป" caption="แมตช์">
                        <span className="text-3xl font-black text-white tabular-nums">{played}</span>
                    </StatCard>

                    <StatCard label="ชนะ / แพ้" caption={`อัตราชนะ ${winRate}%`}>
                        <span className="text-3xl font-black tabular-nums">
                            <span className="text-green-400">{rankingStats.win || 0}</span>
                            <span className="text-slate-600 mx-1.5">/</span>
                            <span className="text-red-400">{rankingStats.lose || 0}</span>
                        </span>
                    </StatCard>

                    <StatCard
                        label="แต้มกล้าหาญ"
                        caption={bravePoints >= BRAVE_POINTS_CAP ? "พร้อมใช้โบนัสแล้ว!" : `อีก ${BRAVE_POINTS_CAP - bravePoints} แต้มได้โบนัส`}
                        footer={
                            <div className="h-1 bg-white/5">
                                <div className="bg-purple-500 h-full transition-all" style={{ width: `${Math.min(100, bravePoints)}%` }} />
                            </div>
                        }
                    >
                        <span className="text-3xl font-black text-purple-400 tabular-nums">
                            {bravePoints}<span className="text-base text-slate-500 font-bold">/{BRAVE_POINTS_CAP}</span>
                        </span>
                    </StatCard>
                </div>
            )}

            <p className="mt-2 text-xs text-slate-500">
                💜 แต้มกล้าหาญครบ 100 → ชนะได้ดาวโบนัส +1⭐ หรือแพ้แล้วไม่เสียดาว
            </p>
        </section>
    );
}
