import React from "react";
import Image from "next/image";
import { TargetUser, ApiSeason, RankingStats } from "../types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface Props {
    targetUser: TargetUser | null;
    seasons: ApiSeason[];
    selectedSeason: string;
    setSelectedSeason: (season: string) => void;
    setPage: (page: number) => void;
    lifetimeStats?: RankingStats | null;
}

export function HistoryHeader({ targetUser, seasons, selectedSeason, setSelectedSeason, setPage, lifetimeStats }: Props) {
    return (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-6 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md shadow-xl">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-3xl font-bold shadow-lg shadow-green-900/40 overflow-hidden border border-white/20">
                    {targetUser?.picture?.url ? (
                        <Image
                            src={targetUser.picture.url.startsWith("http") ? targetUser.picture.url : `${STRAPI_BASE_URL}${targetUser.picture.url}`}
                            alt={targetUser.username || "User"}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        targetUser?.username?.charAt(0).toUpperCase() || "?"
                    )}
                </div>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">ประวัติการแข่งขัน</h1>
                    <p className="text-slate-400 font-medium text-sm sm:text-base mb-2">{targetUser?.username}</p>
                    
                    {/* Lifetime Stats */}
                    {lifetimeStats && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-bold text-slate-300">
                            <div className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                                <span className="text-slate-500 uppercase">Matches</span>
                                <span className="text-white">{lifetimeStats.match_played || 0}</span>
                            </div>
                            <div className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                                <span className="text-slate-500 uppercase">Win</span>
                                <span className="text-green-400">{lifetimeStats.win || 0}</span>
                            </div>
                            <div className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                                <span className="text-slate-500 uppercase">Loss</span>
                                <span className="text-red-400">{lifetimeStats.lose || 0}</span>
                            </div>
                            <div className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                                <span className="text-slate-500 uppercase">Win Rate</span>
                                <span className="text-blue-400">
                                    {lifetimeStats.match_played ? Math.round(((lifetimeStats.win || 0) / lifetimeStats.match_played) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="sm:ml-auto w-full sm:w-auto mt-4 sm:mt-0">
                <select
                    value={selectedSeason}
                    onChange={(e) => {
                        setSelectedSeason(e.target.value);
                        setPage(1);
                    }}
                    className="w-full sm:w-auto bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all cursor-pointer hover:bg-black/60"
                >
                    <option value="all">ทุกฤดูกาล (All Seasons)</option>
                    {seasons.map((s) => (
                        <option key={s.documentId} value={s.documentId}>
                            {s.name} {s.is_active ? "(Current)" : ""}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
