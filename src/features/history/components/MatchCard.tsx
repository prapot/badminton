import React from "react";
import Link from "next/link";
import RankBadge from "@/features/tournaments/components/RankBadge";
import SkillBadge from "@/features/tournaments/components/SkillBadge";
import { getRankInfoFromPoints } from "@/features/tournaments/utils/TournamentUtils";
import { MatchHistory } from "../types";

interface Props {
    history: MatchHistory;
    userId: string;
    isLast?: boolean;
    /** Season is already chosen at the top of the page — only repeat it per card when viewing all seasons */
    showSeason?: boolean;
}

export function MatchCard({ history: h, userId, isLast = false, showSeason = false }: Props) {
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
    const isRanking =
        tournament?.mode === "ranking" ||
        Boolean(h.ranking) ||
        (h.old_rp !== undefined && h.new_rp !== undefined && h.rp_change !== undefined);

    // Render players in a compact inline row: "PlayerA / PlayerB"
    const renderTeamInline = (team: any, isUserTeam: boolean) => {
        if (!team?.team_players || team.team_players.length === 0) {
            return <span className="italic text-slate-600 text-xs">รอยืนยัน</span>;
        }

        return (
            <div className="flex flex-col gap-0.5">
                {team.team_players.map((p: any, idx: number) => {
                    let skillLevel = p.skill_level;
                    if (!skillLevel && p.user_id?.id && tournament?.tournament_players) {
                        const tp = tournament.tournament_players.find(
                            (t: any) => t.user?.id === p.user_id.id
                        );
                        if (tp?.skill_level) skillLevel = tp.skill_level;
                    }

                    const isMe = p.user_id?.id === Number(userId);

                    return (
                        <div key={idx} className="flex items-center gap-1.5 min-w-0">
                            <span
                                className={`text-sm font-bold leading-tight truncate ${
                                    isMe ? "text-amber-300" : isUserTeam ? "text-slate-200" : "text-slate-400"
                                }`}
                            >
                                {p.user_id?.username || p.guest_name || "ไม่ทราบชื่อ"}
                            </span>
                            {isMe && (
                                <span className="shrink-0 text-[11px] font-black px-1.5 py-px rounded-md bg-amber-400 text-slate-900">คุณ</span>
                            )}
                            {skillLevel && <SkillBadge skillLevel={skillLevel} showLabel={false} />}
                        </div>
                    );
                })}
            </div>
        );
    };

    // Ranking RP block
    const renderRpBlock = () => {
        if (!isRanking) return null;
        const isLoss = h.rp_change < 0;
        const oldRank = getRankInfoFromPoints(h.old_rp, { isLoss });
        const newRank = getRankInfoFromPoints(h.new_rp, { isLoss });
        const isRankUp =
            (newRank.weight || 0) > (oldRank.weight || 0) && oldRank.rankStr !== newRank.rankStr;
        const isDemoted =
            (newRank.weight || 0) < (oldRank.weight || 0) && oldRank.rankStr !== newRank.rankStr;
        const isBraveBonus = h.rp_change >= 200;

        return (
            <div className="flex items-center gap-2 flex-wrap">
                {/* Rank progression */}
                <div className="flex items-center gap-1.5">
                    <RankBadge rank={oldRank.rankStr} stars={oldRank.stars} size="sm" showName={true} />
                    <span
                        className={`text-[11px] font-black ${
                            isRankUp ? "text-amber-400" : isDemoted ? "text-rose-400" : "text-slate-600"
                        }`}
                    >
                        →
                    </span>
                    <RankBadge rank={newRank.rankStr} stars={newRank.stars} size="sm" showName={true} />
                </div>

                {/* RP change */}
                <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${
                        h.rp_change > 0
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : h.rp_change < 0
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : "bg-slate-500/15 text-slate-400 border-slate-500/20"
                    }`}
                >
                    {h.rp_change > 0
                        ? `+${Math.abs(Math.floor(h.rp_change / 100))} ⭐`
                        : h.rp_change < 0
                        ? `-${Math.abs(Math.floor(h.rp_change / 100))} ⭐`
                        : "🛡️ ดาวไม่ลด"}
                </span>

                {/* Special badges */}
                {isRankUp && (
                    <span className="text-[11px] font-black text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                        🏆 RANK UP!
                    </span>
                )}
                {isDemoted && (
                    <span className="text-[11px] font-black text-rose-300 bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 rounded-full">
                        ⚠️ ตกชั้น
                    </span>
                )}
                {isBraveBonus && (
                    <span className="text-[11px] font-bold text-violet-300 bg-violet-500/20 border border-violet-500/30 px-1.5 py-0.5 rounded-full">
                        🔥 โบนัสกล้าหาญ +1⭐
                    </span>
                )}
            </div>
        );
    };

    const accentGradient = isCancelled
        ? "from-slate-600/60 to-slate-700/60"
        : isWin
        ? "from-emerald-500 via-green-400 to-teal-500"
        : "from-rose-500 via-red-400 to-pink-500";

    const cardBorder = isCancelled
        ? "border-slate-500/25"
        : isWin
        ? "border-emerald-500/25"
        : "border-rose-500/25";

    const cardBg = isCancelled
        ? "bg-slate-500/5"
        : isWin
        ? "bg-emerald-500/5"
        : "bg-rose-500/5";

    const dotColor = isCancelled
        ? "bg-slate-500 ring-slate-600/50"
        : isWin
        ? "bg-emerald-400 ring-emerald-500/30"
        : "bg-rose-400 ring-rose-500/30";

    return (
        <div className="relative flex items-stretch gap-0">
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center mr-3 shrink-0 pt-4">
                <div
                    className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-transparent shrink-0 ${dotColor}`}
                />
                {!isLast && (
                    <div className="w-px flex-1 bg-gradient-to-b from-white/10 to-transparent mt-1.5 min-h-[20px]" />
                )}
            </div>

            {/* Card */}
            <div
                className={`flex-1 mb-3 rounded-2xl border ${cardBorder} ${cardBg} backdrop-blur-sm overflow-hidden transition-all duration-300 hover:brightness-110 group`}
            >
                {/* Top accent strip */}
                <div className={`h-0.5 w-full bg-gradient-to-r ${accentGradient}`} />

                <div className="p-3 sm:p-4 space-y-3">
                    {/* ── Row 1: result + time (labels that are the same on every card are dropped) ── */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                            className={`text-base font-black ${
                                isCancelled ? "text-slate-400" : isWin ? "text-emerald-400" : "text-rose-400"
                            }`}
                        >
                            {isCancelled ? "ยกเลิก" : isWin ? "ชนะ" : "แพ้"}
                        </span>
                        {!isRanking && (
                            <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border bg-sky-500/10 text-sky-400 border-sky-500/20">
                                🎮 ไม่นับแรงค์
                            </span>
                        )}
                        {match.round != null && match.round > 1 && (
                            <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border bg-white/5 text-slate-400 border-white/10">
                                รอบ {match.round}
                            </span>
                        )}
                        {showSeason && h.ranking?.season?.name && (
                            <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border bg-violet-500/10 text-violet-400 border-violet-500/20">
                                {h.ranking.season.name}
                            </span>
                        )}
                        <span className="ml-auto text-xs text-slate-500 font-medium tabular-nums shrink-0">
                            {new Date(h.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    </div>

                    {/* ── Row 2: Players + Score ── */}
                    <div className="flex items-center gap-2">
                        {/* Teams block — takes remaining space */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                            {/* User team */}
                            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                <span className="shrink-0 w-1 h-1 rounded-full bg-emerald-400/60" />
                                <div className="min-w-0 overflow-hidden">{renderTeamInline(userTeam, true)}</div>
                            </div>

                            {/* VS separator */}
                            <div className="flex items-center gap-2 pl-2.5">
                                <div className="h-px w-4 bg-white/10" />
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                    vs
                                </span>
                            </div>

                            {/* Opp team */}
                            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                <span className="shrink-0 w-1 h-1 rounded-full bg-rose-400/40" />
                                <div className="min-w-0 overflow-hidden">{renderTeamInline(oppTeam, false)}</div>
                            </div>
                        </div>

                        {/* Score — fixed width, compact */}
                        <div className="shrink-0 flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-1 px-3 py-2 bg-black/40 rounded-xl border border-white/5" aria-label={`คะแนนเรา ${userScore ?? "-"} ต่อ ${oppScore ?? "-"}`}>
                                <span
                                    className={`text-xl font-black tabular-nums leading-none ${
                                        isCancelled ? "text-slate-500" : isWin ? "text-emerald-400" : "text-rose-400"
                                    }`}
                                >
                                    {userScore ?? "-"}
                                </span>
                                <span className="text-slate-700 font-black text-sm">:</span>
                                <span
                                    className="text-xl font-black tabular-nums leading-none text-slate-500"
                                >
                                    {oppScore ?? "-"}
                                </span>
                            </div>
                        </div>

                        {/* Link — only on sm+ (on phones the group header links to the tournament) */}
                        {tournament?.documentId && (
                            <Link
                                href={`/tournament/${tournament.documentId}`}
                                className="hidden sm:flex shrink-0 items-center justify-center w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-600 hover:text-white hover:bg-white/10 transition-all text-xs group-hover:border-white/20"
                                title="ดูทัวร์นาเมนต์"
                            >
                                →
                            </Link>
                        )}
                    </div>

                    {/* ── Row 3: RP Progression (only for ranking) ── */}
                    {isRanking && (
                        <div className="pt-1 border-t border-white/5">
                            {renderRpBlock()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
