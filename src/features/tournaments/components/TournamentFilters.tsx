import React from "react";
import { TournamentStatus, PaginationMeta } from "@/features/tournaments/types";

interface Props {
    search: string;
    setSearch: (search: string) => void;
    filter: "all" | TournamentStatus;
    setFilter: (filter: "all" | TournamentStatus) => void;
    setPage: (page: number) => void;
    fetchTournaments: (pageNum: number) => void;
    meta: PaginationMeta | null;
}

export function TournamentFilters({ search, setSearch, filter, setFilter, setPage, fetchTournaments, meta }: Props) {
    return (
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-3">
            <div className="relative w-full sm:w-80">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="ค้นหาชื่อรายการแข่งขัน..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            setPage(1);
                            fetchTournaments(1);
                        }
                    }}
                    className="w-full h-11 sm:h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition-all shadow-inner"
                />
            </div>

            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                {([
                    ["all", "ทั้งหมด"],
                    ["ongoing", "กำลังแข่ง"],
                    ["upcoming", "รอเริ่ม"],
                    ["completed", "จบแล้ว"],
                ] as ["all" | TournamentStatus, string][]).map(([val, label]) => (
                    <button
                        key={val}
                        onClick={() => {
                            setFilter(val);
                            setPage(1);
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-150 shrink-0 ${filter === val
                            ? "bg-white/15 text-white border border-white/20"
                            : "bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:bg-white/10"
                            }`}
                    >
                        {label}
                        {filter === val && meta && (
                            <span className="ml-2 text-xs opacity-60">
                                {meta.total}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
