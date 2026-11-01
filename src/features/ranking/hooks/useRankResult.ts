import { useCallback, useEffect, useState } from "react";
import { acquireChannel } from "@/shared/realtime/pusherClient";
import { isRankResult, RankResult, rankResultKey } from "../rankResult";

const SEEN_LIMIT = 30;
export const RANK_RESULT_DISMISS_MS = 8000;

function seenKey(userId: number) {
    return `rank_results_seen_${userId}`;
}

function readSeen(userId: number): string[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(seenKey(userId)) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/** Mark a result as seen; returns false if it was already seen (e.g. shown in another tab or a duplicate event). */
function markSeen(userId: number, key: string): boolean {
    const seen = readSeen(userId);
    if (seen.includes(key)) return false;
    try {
        localStorage.setItem(seenKey(userId), JSON.stringify([...seen, key].slice(-SEEN_LIMIT)));
    } catch {
        // storage unavailable → still show it
    }
    return true;
}

/** Listens for `rank-result` on `user-<id>` and exposes the latest one until dismissed. */
export function useRankResult(userId: number | null | undefined) {
    const [result, setResult] = useState<RankResult | null>(null);
    const dismiss = useCallback(() => setResult(null), []);

    useEffect(() => {
        if (!userId) return;
        const sub = acquireChannel(`user-${userId}`);
        if (!sub) return;

        const onResult = (data: unknown) => {
            if (!isRankResult(data)) return;
            if (!markSeen(userId, rankResultKey(data))) return;
            setResult(data);
        };
        sub.channel.bind("rank-result", onResult);
        return () => {
            sub.channel.unbind("rank-result", onResult);
            sub.release();
        };
    }, [userId]);

    // auto-dismiss; a newer result restarts the timer
    useEffect(() => {
        if (!result) return;
        const t = setTimeout(() => setResult(null), RANK_RESULT_DISMISS_MS);
        return () => clearTimeout(t);
    }, [result]);

    return { result, dismiss };
}
