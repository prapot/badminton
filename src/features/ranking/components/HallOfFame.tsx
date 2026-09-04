import { ApiSeason, PlayerRow } from "@/features/ranking/types";

interface Props {
    seasons: ApiSeason[];
    selectedSeason: string;
    allPlayers: PlayerRow[];
}

export function HallOfFame({ seasons, selectedSeason, allPlayers }: Props) {
    if (selectedSeason === "all" || seasons.length === 0) return null;

    const season = seasons.find(s => s.documentId === selectedSeason);
    if (!season || season.is_active) return null;

    const rankedPlayers = allPlayers.filter(p => p.hasRanking);
    if (rankedPlayers.length === 0) return null;

    return (
        <div className="bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden group mb-8">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl grayscale group-hover:grayscale-0 transition-all duration-700">🏆</div>
            <div className="relative z-10">
                <h2 className="text-xl sm:text-2xl font-black text-yellow-500 mb-4 flex items-center gap-3">
                    <span>🏛️</span> HALL OF FAME: {season.name}
                </h2>
                <div className="flex flex-wrap gap-6 items-center">
                    {rankedPlayers.slice(0, 3).map((p, i) => (
                        <div key={p.userId} className="flex items-center gap-4 bg-black/40 px-5 py-3 rounded-2xl border border-white/5 shadow-xl transition-transform hover:scale-105">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg ${i === 0 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 ring-2 ring-yellow-400/50" :
                                i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500" :
                                    "bg-gradient-to-br from-orange-400 to-orange-600"
                                }`}>
                                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                            </div>
                            <div>
                                <div className="flex flex-col mb-1">
                                    <p className="font-black text-white text-base leading-none">{p.username}</p>
                                    {p.nickname && <p className="text-[10px] text-slate-400 font-medium leading-none mt-1">{p.nickname}</p>}
                                </div>
                                <p className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest">{p.ranking_points} RP</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
