import React from "react";
import Image from "next/image";
import { TargetUser, ApiSeason } from "../types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface Props {
    targetUser: TargetUser | null;
    seasons: ApiSeason[];
    selectedSeason: string;
    setSelectedSeason: (season: string) => void;
    setPage: (page: number) => void;
}

export function HistoryHeader({ targetUser, seasons, selectedSeason, setSelectedSeason, setPage }: Props) {
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
                    <p className="text-slate-400 font-medium text-sm sm:text-base">{targetUser?.username}</p>
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
