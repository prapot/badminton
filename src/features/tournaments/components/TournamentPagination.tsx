import React from "react";
import { PaginationMeta } from "@/features/tournaments/types";

interface Props {
    page: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    meta: PaginationMeta | null;
    loading: boolean;
}

export function TournamentPagination({ page, setPage, meta, loading }: Props) {
    if (loading || !meta || meta.pageCount <= 1) return null;

    return (
        <div className="mt-8 flex items-center justify-center gap-2 sm:gap-4 pb-12">
            <button
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
                <span>‹</span> หน้าก่อนหน้า
            </button>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 h-10 rounded-xl backdrop-blur-md">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Page</span>
                <span className="text-sm font-black text-[#2ecc71]">{page}</span>
                <span className="text-xs font-bold text-slate-600">/</span>
                <span className="text-sm font-black text-slate-400">{meta.pageCount}</span>
            </div>

            <button
                onClick={() => setPage((p: number) => Math.min(meta.pageCount, p + 1))}
                disabled={page === meta.pageCount}
                className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
                หน้าถัดไป <span>›</span>
            </button>
        </div>
    );
}
