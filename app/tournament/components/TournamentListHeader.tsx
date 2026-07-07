import React from "react";
import Link from "next/link";
import { PaginationMeta } from "@/app/tournament/TournamentTypes";

interface Props {
    meta: PaginationMeta | null;
}

export function TournamentListHeader({ meta }: Props) {
    return (
        <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
                <h1 className="text-2xl font-bold text-white">ตารางการแข่งขัน</h1>
                <p className="text-slate-400 text-sm mt-1">{meta?.total ?? 0} ทัวร์นาเมนต์ทั้งหมด</p>
            </div>
            <Link
                href="/tournament/create"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] hover:from-[#3de382] hover:to-[#2ecc71] text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-green-900/30"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                สร้างทัวร์นาเมนต์ใหม่
            </Link>
        </div>
    );
}
