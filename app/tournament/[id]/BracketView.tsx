import { TMatch } from "../TournamentTypes";

interface BracketViewProps {
    matches: TMatch[];
}

export default function BracketView({ matches }: BracketViewProps) {
    const sf1 = matches.find((m) => m.id === "SF1");
    const sf2 = matches.find((m) => m.id === "SF2");
    const fin = matches.find((m) => m.id === "F1");
    const trd = matches.find((m) => m.id === "3RD");

    if (!sf1 || !sf2 || !fin || !trd) return null;

    const MiniCard = ({ m }: { m: TMatch }) => {
        const done = m.status === "done";
        const p1w = done && (m.score1 ?? 0) > (m.score2 ?? 0);
        const p2w = done && (m.score2 ?? 0) > (m.score1 ?? 0);
        return (
            <div className="w-52 rounded-xl border border-white/12 overflow-hidden bg-[#0f1923]">
                <div className={`flex items-center justify-between px-4 py-2.5 border-b border-white/8 ${p1w ? "bg-green-500/10" : ""}`}>
                    <span className={`text-sm font-medium truncate ${m.player1 === "TBD" ? "text-slate-600 italic" : p1w ? "text-white font-semibold" : "text-slate-300"}`}>{m.player1}</span>
                    {done && <span className={`text-sm font-bold ml-2 shrink-0 ${p1w ? "text-green-400" : "text-slate-500"}`}>{m.score1}</span>}
                </div>
                <div className={`flex items-center justify-between px-4 py-2.5 ${p2w ? "bg-green-500/10" : ""}`}>
                    <span className={`text-sm font-medium truncate ${m.player2 === "TBD" ? "text-slate-600 italic" : p2w ? "text-white font-semibold" : "text-slate-300"}`}>{m.player2}</span>
                    {done && <span className={`text-sm font-bold ml-2 shrink-0 ${p2w ? "text-green-400" : "text-slate-500"}`}>{m.score2}</span>}
                </div>
                {m.status === "live" && <div className="py-1 text-center text-[10px] font-bold text-yellow-300 bg-yellow-500/10 animate-pulse">● กำลังแข่ง</div>}
                {m.status === "upcoming" && m.player1 !== "TBD" && <div className="py-1 text-center text-[10px] text-slate-600 bg-white/3">{m.time} · {m.court}</div>}
            </div>
        );
    };

    const Connector = () => <div className="w-8 border-t border-white/15 self-center" />;

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex items-center gap-0 min-w-max">
                {/* SF column */}
                <div className="flex flex-col gap-12">
                    <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">รอบรองชนะเลิศ</p>
                        <MiniCard m={sf1} />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 invisible">x</p>
                        <MiniCard m={sf2} />
                    </div>
                </div>
                {/* Connectors */}
                <div className="flex flex-col gap-12">
                    <Connector /><Connector />
                </div>
                {/* Final column */}
                <div className="flex flex-col gap-4 self-center">
                    <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">รอบชิงชนะเลิศ</p>
                        <MiniCard m={fin} />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <span className="text-lg">🏆</span>
                        <span className="text-xs text-yellow-300 font-semibold">แชมป์</span>
                    </div>
                </div>
            </div>
            {/* 3rd place */}
            <div className="mt-6 pt-5 border-t border-white/8">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">ชิงอันดับ 3</p>
                <MiniCard m={trd} />
            </div>
        </div>
    );
}
