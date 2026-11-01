"use client";

import { X } from "lucide-react";
import RankBadge from "@/features/tournaments/components/RankBadge";
import { cn } from "@/shared/utils/utils";
import { useRankResult } from "../hooks/useRankResult";
import { describeRankResult, RankResultTone } from "../rankResult";

const BRAVE_POINTS_CAP = 100;

const toneClass: Record<RankResultTone, string> = {
    win: "border-green-500/40 shadow-green-500/20",
    bonus: "border-yellow-400/50 shadow-yellow-400/30",
    shield: "border-indigo-400/40 shadow-indigo-500/20",
    safe: "border-amber-600/40 shadow-amber-600/20",
    loss: "border-red-500/30 shadow-red-500/10",
};

const titleClass: Record<RankResultTone, string> = {
    win: "text-green-400",
    bonus: "text-yellow-300",
    shield: "text-indigo-300",
    safe: "text-amber-400",
    loss: "text-red-400",
};

/** Shows stars / brave points / rank change right after a ranking match (pushed by the backend). */
export default function RankResultToast({ userId }: { userId?: number | null }) {
    const { result, dismiss } = useRankResult(userId);
    if (!result) return null;

    const view = describeRankResult(result);
    const bp = result.bp;

    return (
        <div className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4 pointer-events-none">
            <div
                key={`${result.matchId}-${result.rankAfter}-${result.rpChange}`}
                role="status"
                aria-live="polite"
                className={cn(
                    "pointer-events-auto w-full max-w-sm rounded-2xl border bg-slate-900/95 backdrop-blur-md p-4 shadow-2xl animate-rank-toast-in",
                    toneClass[view.tone],
                )}
            >
                <div className="flex items-start gap-3">
                    <div className="text-3xl leading-none mt-0.5" aria-hidden>{view.emoji}</div>
                    <div className="min-w-0 flex-1">
                        <p className={cn("font-black text-base leading-snug", titleClass[view.tone])}>{view.title}</p>
                        {view.movement && (
                            <p className={cn("text-sm font-bold mt-0.5", result.movement === "up" ? "text-yellow-300" : "text-slate-400")}>
                                {view.movement}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={dismiss}
                        aria-label="ปิด"
                        className="shrink-0 -m-1 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                    <RankBadge rank={result.rankAfter} stars={result.starsAfter} size="sm" showName={true} />
                    {bp !== null && (
                        <span className="text-xs text-slate-400 tabular-nums">
                            💜 <span className="text-purple-300 font-bold">+{result.bpGain}</span> → {bp}/{BRAVE_POINTS_CAP}
                        </span>
                    )}
                </div>
                {bp !== null && (
                    <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-purple-500 transition-all" style={{ width: `${Math.min(100, bp)}%` }} />
                    </div>
                )}
            </div>
        </div>
    );
}
