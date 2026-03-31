import { TMatch } from "../TournamentTypes";

interface MatchRowProps {
    match: TMatch;
    onClick: () => void;
}

export default function MatchRow({ match, onClick }: MatchRowProps) {
    const done = match.status === "done";
    const p1w = done && (match.score1 ?? 0) > (match.score2 ?? 0);
    const p2w = done && (match.score2 ?? 0) > (match.score1 ?? 0);
    const isTBD = match.player1 === "TBD";

    return (
        <div
            onClick={!isTBD ? onClick : undefined}
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3.5 transition-colors group ${isTBD ? "opacity-40 cursor-default" : "hover:bg-white/5 cursor-pointer active:bg-white/8"}`}
        >
            {/* Time/court — hidden on xs, visible sm+ */}
            <div className="hidden sm:block w-16 shrink-0 text-center">
                <p className="text-[11px] font-bold text-slate-300">{match.time}</p>
                <p className="text-[10px] text-slate-500">{match.court}</p>
            </div>
            {/* Players + score */}
            <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <span className={`text-sm font-semibold flex-1 text-right truncate ${p1w ? "text-white" : "text-slate-400"}`}>{match.player1}</span>
                <div className="flex items-center gap-1 shrink-0 w-[4.5rem] justify-center">
                    {done ? (
                        <>
                            <span className={`w-7 text-center text-sm font-bold ${p1w ? "text-green-300" : "text-slate-500"}`}>{match.score1}</span>
                            <span className="text-slate-600 text-[10px]">─</span>
                            <span className={`w-7 text-center text-sm font-bold ${p2w ? "text-green-300" : "text-slate-500"}`}>{match.score2}</span>
                        </>
                    ) : match.status === "live" ? (
                        <span className="text-[10px] font-bold text-yellow-300 animate-pulse">● LIVE</span>
                    ) : (
                        <span className="text-xs text-slate-600">vs</span>
                    )}
                </div>
                <span className={`text-sm font-semibold flex-1 truncate ${p2w ? "text-white" : "text-slate-400"}`}>{match.player2}</span>
            </div>
            {/* Action badge — always visible on mobile, hover-reveal on desktop */}
            {!isTBD && (
                <div className={`shrink-0 ${done ? "" : "sm:opacity-0 sm:group-hover:opacity-100"} transition-opacity`}>
                    {done ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">✓</span>
                    ) : (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/8 text-slate-300 border border-white/10">✏️</span>
                    )}
                </div>
            )}
        </div>
    );
}
