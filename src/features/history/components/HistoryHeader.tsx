import React, { useState } from "react";
import Image from "next/image";
import { TargetUser, RankingStats } from "../types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface Props {
    targetUser: TargetUser | null;
    lifetimeStats?: RankingStats | null;
}

// Falls back to the initial when the picture fails to load (instead of a huge alt text)
function ProfileAvatar({ user }: { user: TargetUser | null }) {
    const [failed, setFailed] = useState(false);
    const url = user?.picture?.url;
    if (!url || failed) return <>{user?.username?.charAt(0).toUpperCase() || "?"}</>;
    return (
        <Image
            src={url.startsWith("http") ? url : `${STRAPI_BASE_URL}${url}`}
            alt=""
            width={80}
            height={80}
            className="w-full h-full object-cover"
            onError={() => setFailed(true)}
        />
    );
}

function LifetimeTile({ label, value, valueClass = "text-white" }: { label: string; value: React.ReactNode; valueClass?: string }) {
    return (
        <div className="rounded-xl bg-black/20 border border-white/5 px-2 py-2 sm:px-4 sm:py-2.5 text-center">
            <p className={`text-lg sm:text-xl font-black tabular-nums leading-tight ${valueClass}`}>{value}</p>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">{label}</p>
        </div>
    );
}

export function HistoryHeader({ targetUser, lifetimeStats }: Props) {
    const played = lifetimeStats?.match_played || 0;
    const winRate = played ? Math.round(((lifetimeStats?.win || 0) / played) * 100) : 0;

    return (
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center gap-5 bg-white/5 p-4 sm:p-6 rounded-3xl border border-white/10 backdrop-blur-md shadow-xl">
            {/* Who */}
            <div className="flex items-center gap-4 min-w-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-3xl font-bold shadow-lg shadow-green-900/40 overflow-hidden border border-white/20">
                    <ProfileAvatar user={targetUser} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400 mb-0.5">ประวัติการแข่งขัน</p>
                    <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug break-words">{targetUser?.username}</h1>
                    {targetUser?.nickname && <p className="text-sm text-slate-500 font-medium">{targetUser.nickname}</p>}
                </div>
            </div>

            {/* Lifetime — same tile language as the season cards, clearly labelled */}
            {lifetimeStats && (
                <div className="md:ml-auto">
                    <p className="text-xs font-semibold text-slate-400 mb-1.5 md:text-right">สถิติตลอดกาล</p>
                    <div className="grid grid-cols-4 gap-2">
                        <LifetimeTile label="แข่ง" value={played} />
                        <LifetimeTile label="ชนะ" value={lifetimeStats.win || 0} valueClass="text-green-400" />
                        <LifetimeTile label="แพ้" value={lifetimeStats.lose || 0} valueClass="text-red-400" />
                        <LifetimeTile label="อัตราชนะ" value={`${winRate}%`} valueClass="text-blue-400" />
                    </div>
                </div>
            )}
        </div>
    );
}
