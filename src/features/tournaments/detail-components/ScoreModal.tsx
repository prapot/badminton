import { useState } from "react";
import { TMatch } from "../types";

interface ScoreModalProps {
    match: TMatch;
    onClose: () => void;
    onSave: (id: string, s1: number, s2: number) => void;
}

export default function ScoreModal({
    match,
    onClose,
    onSave,
}: ScoreModalProps) {
    const [s1, setS1] = useState<string>(match.score1?.toString() ?? "");
    const [s2, setS2] = useState<string>(match.score2?.toString() ?? "");
    const n1 = parseInt(s1), n2 = parseInt(s2);
    const isValid = !isNaN(n1) && !isNaN(n2) && n1 >= 0 && n2 >= 0 && n1 !== n2 && (Math.max(n1, n2) >= 21 || Math.max(n1, n2) >= 15);
    const winner = isValid ? (n1 > n2 ? match.player1 : match.player2) : null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            {/* Card */}
            <div className="relative z-10 w-full max-w-sm bg-[#141f2e] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{match.time} · {match.court}</p>
                        <p className="text-sm font-semibold text-white mt-0.5">บันทึกผลการแข่งขัน</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Score inputs */}
                <div className="px-6 py-5 space-y-4">
                    {/* Player 1 */}
                    <div className="flex items-center justify-between gap-4">
                        <span className={`text-sm font-semibold flex-1 ${isValid && n1 > n2 ? "text-green-300" : "text-white"}`}>{match.player1}</span>
                        <input
                            type="number" min={0} max={30}
                            value={s1}
                            onChange={(e) => setS1(e.target.value)}
                            placeholder="─"
                            className="w-20 text-center text-2xl font-bold bg-white/8 border border-white/15 rounded-xl py-2 text-white focus:outline-none focus:border-green-500/50 focus:bg-white/12 transition-all [appearance:textfield]"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="text-xs text-slate-600 font-semibold">VS</span>
                        <div className="flex-1 h-px bg-white/8" />
                    </div>

                    {/* Player 2 */}
                    <div className="flex items-center justify-between gap-4">
                        <span className={`text-sm font-semibold flex-1 ${isValid && n2 > n1 ? "text-green-300" : "text-white"}`}>{match.player2}</span>
                        <input
                            type="number" min={0} max={30}
                            value={s2}
                            onChange={(e) => setS2(e.target.value)}
                            placeholder="─"
                            className="w-20 text-center text-2xl font-bold bg-white/8 border border-white/15 rounded-xl py-2 text-white focus:outline-none focus:border-green-500/50 focus:bg-white/12 transition-all [appearance:textfield]"
                        />
                    </div>

                    {/* Winner preview */}
                    {winner && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                            <span className="text-green-400 text-sm">🏆</span>
                            <span className="text-green-300 text-sm font-semibold">{winner} ชนะ</span>
                        </div>
                    )}
                    {s1 !== "" && s2 !== "" && !isValid && (
                        <p className="text-xs text-red-400">คะแนนไม่ถูกต้อง (ต้องชนะ 21 หรือถึง 15 ขึ้นไป และห้ามเสมอ)</p>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 pb-5 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 transition-all">
                        ยกเลิก
                    </button>
                    <button
                        onClick={() => isValid && onSave(match.id, n1, n2)}
                        disabled={!isValid}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:from-[#3de382] hover:to-[#2ecc71] transition-all"
                    >
                        บันทึกผล
                    </button>
                </div>
            </div>
        </div>
    );
}
