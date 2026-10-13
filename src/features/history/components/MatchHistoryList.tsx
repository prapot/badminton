import React, { useMemo } from "react";
import Link from "next/link";
import { MatchHistory, PaginationMeta } from "../types";
import { MatchCard } from "./MatchCard";

interface Props {
    histories: MatchHistory[];
    loading: boolean;
    error: string | null;
    userId: string;
    page: number;
    setPage: (page: number) => void;
    meta: PaginationMeta | null;
    filterDate: string;
    setFilterDate: (date: string) => void;
    showSeason?: boolean;
}

interface TournamentGroup {
    tournamentId: string | null;
    tournamentName: string;
    tournamentDocumentId: string | null;
    isRanking: boolean;
    date: string; // For grouping header
    matches: MatchHistory[];
}

function groupHistoriesByTournamentAndDate(histories: MatchHistory[]): TournamentGroup[] {
    const groups: TournamentGroup[] = [];
    const seen = new Map<string, TournamentGroup>();

    for (const h of histories) {
        const match = h.matches?.[0];
        const tournamentId = match?.tournament_id?.documentId ?? null;
        const tournamentName = match?.tournament_id?.name ?? "แมตช์ทั่วไป";
        const isRanking = match?.tournament_id?.mode === "ranking" || Boolean(h.ranking);

        // Group by date + tournament (so same tournament on different days = separate groups)
        const dateStr = new Date(h.createdAt).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        const groupKey = `${dateStr}__${tournamentId ?? "no-tournament"}`;

        if (!seen.has(groupKey)) {
            const group: TournamentGroup = {
                tournamentId,
                tournamentName,
                tournamentDocumentId: tournamentId,
                isRanking,
                date: dateStr,
                matches: [],
            };
            seen.set(groupKey, group);
            groups.push(group);
        }

        seen.get(groupKey)!.matches.push(h);
    }

    return groups;
}

export function MatchHistoryList({
    histories,
    loading,
    error,
    userId,
    page,
    setPage,
    meta,
    filterDate,
    setFilterDate,
    showSeason = false,
}: Props) {
    const groups = useMemo(() => groupHistoriesByTournamentAndDate(histories), [histories]);

    return (
        <>
            {/* Header row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-xl">📅</span> ประวัติแมตช์
                    {meta?.total != null && (
                        <span className="text-sm font-normal text-slate-500">({meta.total} แมตช์)</span>
                    )}
                </h3>

                {/* Date filter */}
                <div className="w-full sm:w-auto flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 backdrop-blur-md">
                    <label htmlFor="history-date" className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        วันที่:
                    </label>
                    <input
                        id="history-date"
                        type="date"
                        value={filterDate}
                        onChange={(e) => {
                            setFilterDate(e.target.value);
                            setPage(1);
                        }}
                        className="bg-transparent text-sm font-medium text-white outline-none cursor-pointer focus:ring-0 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                    {filterDate && (
                        <button
                            onClick={() => { setFilterDate(""); setPage(1); }}
                            aria-label="ล้างตัวกรองวันที่"
                            className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-6">
                    {[1, 2].map(i => (
                        <div key={i} className="space-y-3">
                            <div className="h-6 w-48 bg-white/5 animate-pulse rounded-lg" />
                            {[1, 2].map(j => (
                                <div key={j} className="flex items-stretch gap-4">
                                    <div className="flex flex-col items-center pt-4">
                                        <div className="w-2.5 h-2.5 rounded-full bg-white/10 animate-pulse" />
                                        <div className="w-px flex-1 bg-white/5 mt-1.5 min-h-[60px]" />
                                    </div>
                                    <div className="flex-1 h-24 bg-white/5 animate-pulse rounded-2xl border border-white/10" />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-20 bg-red-500/10 rounded-3xl border border-red-500/20">
                    <span className="text-3xl block mb-3">⚠️</span>
                    <p className="text-red-400 font-medium">{error}</p>
                </div>
            ) : histories.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                    <span className="text-4xl block mb-4 opacity-40">📜</span>
                    <p className="text-slate-400 font-medium">ยังไม่มีประวัติการแข่งขันในระบบ</p>
                    <p className="text-slate-600 text-sm mt-1">ลองเปลี่ยน filter หรือเลือกฤดูกาลอื่น</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {groups.map((group, gIdx) => (
                        <div key={gIdx} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Group header: date + day result, tournament name is the link */}
                            {(() => {
                                const wins = group.matches.filter(h => h.matches?.[0]?.match_status !== "cancelled" && h.is_win).length;
                                const losses = group.matches.filter(h => h.matches?.[0]?.match_status !== "cancelled" && !h.is_win).length;
                                const chipClass = `inline-flex items-center gap-1 min-h-9 max-w-full text-xs font-black px-3 rounded-xl border truncate ${group.isRanking ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`;
                                return (
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
                                        <span className="text-sm font-black text-slate-300">{group.date}</span>
                                        <span className="text-xs font-bold text-slate-400">
                                            <span className="text-emerald-400">ชนะ {wins}</span> · <span className="text-rose-400">แพ้ {losses}</span>
                                        </span>
                                        <div className="h-px flex-1 min-w-4 bg-gradient-to-r from-white/10 to-transparent" />
                                        {group.tournamentDocumentId ? (
                                            <Link href={`/tournament/${group.tournamentDocumentId}`} className={`${chipClass} hover:brightness-125`}>
                                                {group.isRanking ? '🏆' : '🎮'} <span className="truncate">{group.tournamentName}</span> <span aria-hidden>›</span>
                                            </Link>
                                        ) : (
                                            <span className={chipClass}>{group.isRanking ? '🏆' : '🎮'} {group.tournamentName}</span>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Match cards in this group (timeline) */}
                            <div className="pl-1">
                                {group.matches.map((h, mIdx) => (
                                    <MatchCard
                                        key={h.id}
                                        history={h}
                                        userId={userId}
                                        isLast={mIdx === group.matches.length - 1}
                                        showSeason={showSeason}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!loading && meta && meta.pageCount > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2 sm:gap-3 pb-12">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="h-11 px-4 sm:px-5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                    >
                        ‹ ย้อนกลับ
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                        {Array.from({ length: meta.pageCount }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === meta.pageCount || Math.abs(p - page) <= 1)
                            .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                                if (idx > 0 && (arr[idx - 1] as number) !== p - 1) acc.push("...");
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, idx) =>
                                p === "..." ? (
                                    <span key={`dot-${idx}`} className="w-8 text-center text-slate-600 text-sm">…</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p as number)}
                                        className={`w-11 h-11 rounded-xl text-sm font-black transition-all border ${page === p
                                            ? 'bg-[#2ecc71]/20 text-[#2ecc71] border-[#2ecc71]/30 shadow-[0_0_12px_rgba(46,204,113,0.2)]'
                                            : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                    </div>

                    <button
                        onClick={() => setPage(Math.min(meta.pageCount, page + 1))}
                        disabled={page === meta.pageCount}
                        className="h-11 px-4 sm:px-5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                    >
                        ถัดไป ›
                    </button>
                </div>
            )}
        </>
    );
}
