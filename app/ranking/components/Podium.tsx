import React from 'react';
import { useRouter } from "next/navigation";
import Image from "next/image";
import RankBadge from "../../tournament/RankBadge";
import { PlayerRow } from "@/app/ranking/types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

const podiumColors = [
    { bg: "from-yellow-500/30 to-yellow-600/10", border: "border-yellow-500/40", ring: "ring-yellow-400/50", text: "text-yellow-300", icon: "🥇", glow: "shadow-yellow-500/20" },
    { bg: "from-slate-400/20 to-slate-500/10", border: "border-slate-400/30", ring: "ring-slate-300/40", text: "text-slate-300", icon: "🥈", glow: "shadow-slate-500/20" },
    { bg: "from-orange-600/20 to-orange-700/10", border: "border-orange-500/30", ring: "ring-orange-400/40", text: "text-orange-400", icon: "🥉", glow: "shadow-orange-500/20" },
];

interface Props {
    top3: PlayerRow[];
    user: any;
}

export function Podium({ top3, user }: Props) {
    const router = useRouter();

    if (top3.length < 1) return null;

    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-6 mt-4">
            {[top3[1], top3[0], top3[2]].map((p, idx) => {
                if (!p) return <div key={idx} />;
                const podiumIdx = idx === 0 ? 1 : idx === 1 ? 0 : 2;
                const c = podiumColors[podiumIdx];
                const pUrl = p.picture?.url ? (p.picture.url.startsWith("http") ? p.picture.url : `${STRAPI_BASE_URL}${p.picture.url}`) : null;
                const heights = ["h-24 sm:h-32", "h-36 sm:h-48", "h-16 sm:h-24"];

                return (
                    <div key={p.userId} className="flex flex-col items-center gap-2 sm:gap-4">
                        {/* Card */}
                        <div
                            onClick={() => router.push(`/history/${p.userId}`)}
                            className={`w-full bg-gradient-to-b ${c.bg} border ${p.userId === user?.id ? "border-green-500/60" : c.border} rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 shadow-2xl ${p.userId === user?.id ? "shadow-green-500/30" : c.glow} transition-all hover:-translate-y-2 cursor-pointer duration-300 relative overflow-hidden group`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className={`w-12 h-12 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-slate-800 ring-2 sm:ring-4 ${c.ring} flex items-center justify-center text-xl sm:text-3xl font-bold overflow-hidden shrink-0 shadow-inner relative z-10`}>
                                {pUrl ? <Image src={pUrl} alt={p.username} width={96} height={96} className="w-full h-full object-cover" /> : <span className={c.text}>{p.username.charAt(0).toUpperCase()}</span>}
                            </div>

                            <div className="text-center relative z-10 min-w-0 w-full">
                                <p className="font-black text-white text-xs sm:text-base leading-tight truncate px-1">{p.username}</p>
                            </div>

                            <div className="text-xl sm:text-3xl relative z-10 filter drop-shadow-md">{c.icon}</div>
                            <div className="flex flex-col items-center gap-1.5 relative z-10">
                                <RankBadge rank={p.rankings?.[0]?.rank} stars={p.rankings?.[0]?.stars} size="sm" />
                                <div className="flex gap-2 sm:gap-4 text-[9px] sm:text-xs text-slate-400 font-bold">
                                    <span className="text-green-400">{p.win}W</span>
                                    <span className="text-red-400">{p.lose}L</span>
                                </div>
                            </div>
                        </div>

                        {/* Podium stand */}
                        <div className={`w-full ${heights[idx]} rounded-b-2xl sm:rounded-b-3xl rounded-t-lg ${podiumIdx === 0 ? "bg-gradient-to-b from-yellow-500/30 to-yellow-600/5 border border-yellow-500/20" :
                            podiumIdx === 1 ? "bg-gradient-to-b from-slate-400/20 to-slate-500/5 border border-slate-400/15" :
                                "bg-gradient-to-b from-orange-600/20 to-orange-700/5 border border-orange-500/15"
                            } flex items-center justify-center shadow-lg`}>
                            <span className="text-xl sm:text-4xl font-black text-white/10 italic">#{podiumIdx + 1}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
