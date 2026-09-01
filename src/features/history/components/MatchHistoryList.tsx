import React from "react";
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
}

export function MatchHistoryList({ histories, loading, error, userId, page, setPage, meta, filterDate, setFilterDate }: Props) {
    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-xl">📅</span> ประวัติแมตช์ (Match History)
                </h3>
                <div className="w-full sm:w-auto flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 backdrop-blur-md">
                    <label htmlFor="history-date" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        วันที่:
                    </label>
                    <input
                        id="history-date"
                        type="date"
                        value={filterDate}
                        onChange={(e) => {
                            setFilterDate(e.target.value);
                            setPage(1); // Reset page on filter change
                        }}
                        className="bg-transparent text-sm font-medium text-white outline-none cursor-pointer focus:ring-0 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                    {filterDate && (
                        <button 
                            onClick={() => {
                                setFilterDate("");
                                setPage(1);
                            }}
                            className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-white text-[10px] transition-colors"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-28 bg-white/5 animate-pulse rounded-2xl border border-white/10" />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-20 bg-red-500/10 rounded-3xl border border-red-500/20">
                    <p className="text-red-400">{error}</p>
                </div>
            ) : histories.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                    <span className="text-4xl block mb-4 opacity-50">📜</span>
                    <p className="text-slate-400">ยังไม่มีประวัติการแข่งขันในระบบ</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {histories.map((h) => (
                        <MatchCard key={h.id} history={h} userId={userId} />
                    ))}
                </div>
            )}

            {!loading && meta && meta.pageCount > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2 sm:gap-4 pb-12">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        <span>‹</span> ย้อนกลับ
                    </button>

                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 h-10 rounded-xl backdrop-blur-md">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Page</span>
                        <span className="text-sm font-black text-[#2ecc71]">{page}</span>
                        <span className="text-xs font-bold text-slate-600">/</span>
                        <span className="text-sm font-black text-slate-400">{meta.pageCount}</span>
                    </div>

                    <button
                        onClick={() => setPage(Math.min(meta.pageCount, page + 1))}
                        disabled={page === meta.pageCount}
                        className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        ถัดไป <span>›</span>
                    </button>
                </div>
            )}
        </>
    );
}
