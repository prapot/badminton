import React from "react";
import { useRouter } from "next/navigation";
import RankBadge from "../../tournament/RankBadge";
import { PlayerRow, ApiSeason } from "@/app/ranking/types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface Props {
    currentPagePlayers: PlayerRow[];
    loading: boolean;
    page: number;
    pageCount: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    seasons: ApiSeason[];
    selectedSeason: string;
    totalPlayers: number;
    user: any;
}

export function RankingTable({
    currentPagePlayers,
    loading,
    page,
    pageCount,
    setPage,
    seasons,
    selectedSeason,
    totalPlayers,
    user
}: Props) {
    const router = useRouter();

    return (
        <>
            <div className="bg-gradient-to-br from-[#1a2236] to-[#0f1923] border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <h3 className="font-black text-white flex items-center gap-2.5 sm:gap-3 sm:text-lg">
                        <span className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-900/20">📊</span>
                        ตารางอันดับสะสม
                    </h3>
                    <div className="flex items-center gap-4">
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                            Season: {seasons.find(s => s.documentId === selectedSeason)?.name || "Current"}
                        </span>
                        <span className="text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                            {totalPlayers} ผู้เล่นทั้งหมด
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 bg-black/20">
                                <th className="px-6 py-4 text-left w-16">Rank</th>
                                <th className="px-6 py-4 text-left">Player</th>
                                <th className="px-6 py-4 text-center">Tier</th>
                                <th className="px-6 py-4 text-center">Played</th>
                                <th className="px-6 py-4 text-center">W / L</th>
                                <th className="px-6 py-4 text-center sm:table-cell">Streak</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {currentPagePlayers.map((p, idx) => {
                                const pUrl = p.picture?.url ? (p.picture.url.startsWith("http") ? p.picture.url : `${STRAPI_BASE_URL}${p.picture.url}`) : null;
                                const rank = (page - 1) * 10 + idx + 1;

                                return (
                                    <tr
                                        key={p.userId}
                                        onClick={() => router.push(`/history/${p.userId}`)}
                                        className={`group hover:bg-white/[0.04] transition-all cursor-pointer ${rank <= 3 && p.hasRanking ? "bg-white/[0.02]" : ""} ${p.userId === user?.id ? "bg-green-500/5 border-l-4 border-l-green-500/50" : ""}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm sm:text-base font-black ${rank === 1 && p.hasRanking ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" :
                                                    rank === 2 && p.hasRanking ? "text-slate-300" :
                                                        rank === 3 && p.hasRanking ? "text-orange-400" :
                                                            "text-slate-500"
                                                    }`}>
                                                    {rank <= 3 && p.hasRanking ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg overflow-hidden shrink-0 ${rank === 1 && p.hasRanking ? "bg-gradient-to-br from-yellow-400 to-yellow-600 ring-2 ring-yellow-400/50" :
                                                    rank === 2 && p.hasRanking ? "bg-gradient-to-br from-slate-300 to-slate-500 ring-2 ring-slate-400/50" :
                                                        rank === 3 && p.hasRanking ? "bg-gradient-to-br from-orange-400 to-orange-600 ring-2 ring-orange-500/50" :
                                                            "bg-slate-800 border border-white/10"
                                                    }`}>
                                                    {pUrl ? <img src={pUrl} alt={p.username} className="w-full h-full object-cover" /> : <span className="text-white">{p.username?.charAt(0).toUpperCase()}</span>}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm sm:text-base font-bold text-white group-hover:text-green-400 transition-colors truncate">
                                                        {p.username || "Unknown"}
                                                        {p.userId === user?.id && (
                                                            <span className="ml-2 text-[8px] px-1.5 py-0.5 rounded-md bg-green-500/20 text-green-400 border border-green-500/30 uppercase tracking-tighter">
                                                                ฉัน
                                                            </span>
                                                        )}
                                                        {!p.hasRanking && (
                                                            <span className="ml-2 text-[8px] px-1.5 py-0.5 rounded-md bg-slate-500/20 text-slate-400 border border-slate-500/30 uppercase tracking-tighter">
                                                                ยังไม่มีคะแนน
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 truncate">{p.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {p.hasRanking ? (
                                                <RankBadge rank={p.rankings?.[0]?.rank} stars={p.rankings?.[0]?.stars} size="sm" />
                                            ) : (
                                                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs sm:text-sm font-bold text-slate-300">{p.match_played}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-green-400 font-black text-xs sm:text-sm">{p.win}</span>
                                                <span className="text-slate-600 text-[10px]">/</span>
                                                <span className="text-red-400 font-black text-xs sm:text-sm">{p.lose}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center sm:table-cell">
                                            {p.win_streak > 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-xs font-black gap-1 border border-orange-500/20 animate-pulse">
                                                    🔥{p.win_streak}
                                                </span>
                                            ) : (
                                                <span className="text-slate-700 font-bold">─</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {currentPagePlayers.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-40">
                                            <span className="text-6xl">🔍</span>
                                            <div>
                                                <p className="text-lg font-black text-white">ไม่พบข้อมูลรายชื่อ</p>
                                                <p className="text-sm text-slate-500">ลองค้นหาด้วยชื่ออื่นดูครับ</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {!loading && pageCount > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2 sm:gap-4 pb-12">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        <span>‹</span> ย้อนกลับ
                    </button>

                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 h-10 rounded-xl backdrop-blur-md">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Page</span>
                        <span className="text-sm font-black text-[#2ecc71]">{page}</span>
                        <span className="text-xs font-bold text-slate-600">/</span>
                        <span className="text-sm font-black text-slate-400">{pageCount}</span>
                    </div>

                    <button
                        onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                        disabled={page === pageCount}
                        className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        ถัดไป <span>›</span>
                    </button>
                </div>
            )}
        </>
    );
}
