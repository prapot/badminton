import { useState } from "react";
import { ApiSeason, PlayerRow } from "@/app/ranking/types";
import { HallOfFame } from "./HallOfFame";
import { Podium } from "./Podium";
import { RankingTable } from "./RankingTable";

interface Props {
    allPlayers: PlayerRow[];
    seasons: ApiSeason[];
    selectedSeason: string;
    setSelectedSeason: (val: string) => void;
    loading: boolean;
    user: any;
}

export function LeaderboardView({
    allPlayers,
    seasons,
    selectedSeason,
    setSelectedSeason,
    loading,
    user
}: Props) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const searchLower = search.toLowerCase();
    const filteredPlayers = allPlayers.filter(p => p.username.toLowerCase().includes(searchLower) || (p.email && p.email.toLowerCase().includes(searchLower)));
    const pageCount = Math.max(1, Math.ceil(filteredPlayers.length / 10));
    const currentPagePlayers = filteredPlayers.slice((page - 1) * 10, page * 10);

    const top3 = page === 1 && !searchLower ? allPlayers.filter(p => p.hasRanking).slice(0, 3) : [];

    return (
        <>
            <HallOfFame seasons={seasons} selectedSeason={selectedSeason} allPlayers={allPlayers} />

            {/* Search & Season Selector */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:w-80">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อผู้เล่น..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full h-11 sm:h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition-all shadow-inner"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Season:</div>
                    <select
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        className="flex-1 md:w-48 h-11 sm:h-12 px-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all appearance-none cursor-pointer"
                    >
                        <option value="" className="bg-[#0f1923]">ทั้งหมด (Legacy)</option>
                        {seasons.map((s) => (
                            <option key={s.documentId} value={s.documentId} className="bg-[#0f1923]">
                                {s.name} {s.is_active ? "(Active)" : ""}
                            </option>
                        ))}
                    </select>
                </div>

                {loading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse ml-auto">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        กำลังโหลดข้อมูล...
                    </div>
                )}
            </div>

            {/* Podium — only show when no search and loading complete */}
            {!search && !loading && top3.length >= 1 && (
                <Podium top3={top3} user={user} />
            )}

            <RankingTable
                currentPagePlayers={currentPagePlayers}
                loading={loading}
                page={page}
                pageCount={pageCount}
                setPage={setPage}
                seasons={seasons}
                selectedSeason={selectedSeason}
                totalPlayers={allPlayers.length}
                user={user}
            />
        </>
    );
}
