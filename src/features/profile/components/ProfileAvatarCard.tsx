import React from "react";
import Image from "next/image";
import RankBadge from "@/features/tournaments/components/RankBadge";
import { UserRankingStats } from "../types";

interface Props {
    user: any;
    userRanking: UserRankingStats | null;
    previewObjUrl: string | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileAvatarCard({ user, userRanking, previewObjUrl, onFileChange }: Props) {
    const initial = user?.username?.charAt(0).toUpperCase() || "?";

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative group h-24 w-24 shrink-0">
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-green-900/40 overflow-hidden border-4 border-white/10 relative">
                    {previewObjUrl ? (
                        <Image src={previewObjUrl} alt="Profile" width={96} height={96} unoptimized={previewObjUrl.startsWith("blob:")} className="w-full h-full object-cover" />
                    ) : (
                        initial
                    )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-10 h-10 bg-[#3498db] hover:bg-[#2980b9] text-white flex items-center justify-center rounded-2xl cursor-pointer shadow-xl border-4 border-[#0f1923] transition-all hover:scale-110 active:scale-95 group-hover:animate-bounce">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                </label>
            </div>
            <div className="text-center sm:text-left mt-2 sm:mt-0 flex flex-col gap-2 flex-1">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                    <div className="flex flex-col">
                        <p className="text-white font-black text-2xl sm:text-3xl tracking-tight">{user.username}</p>
                        {user.nickname && <p className="text-slate-400 text-sm font-medium">{user.nickname}</p>}
                    </div>
                    <RankBadge
                        rank={userRanking?.rank || "Unranked"}
                        stars={userRanking?.stars || 0}
                        size="md"
                    />
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-lg border border-white/5">
                        <span className="text-yellow-500 font-black">RP: {userRanking?.ranking_points ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                            <span className="text-green-500">W:</span> {userRanking?.win ?? 0}
                        </span>
                        <span className="w-px h-3 bg-white/10" />
                        <span className="flex items-center gap-1">
                            <span className="text-red-500">L:</span> {userRanking?.lose ?? 0}
                        </span>
                    </div>
                </div>
                <p className="text-slate-500 text-xs mt-1">
                    <span className="opacity-50">Email:</span> {user.email} <span className="mx-2 opacity-20">|</span> <span className="opacity-50">UID:</span> {user.id}
                </p>
            </div>
        </div>
    );
}
