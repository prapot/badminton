// Payload of the `user-<id>` `rank-result` Pusher event.
// ต้องตรงกับ RankResult ใน badminton-service/src/api/ranking/utils/rankingMath.ts
export interface RankResult {
    matchId: number;
    isWin: boolean;
    rpChange: number;
    starChange: number;
    bonusStar: boolean;
    shielded: boolean;
    bronzeSafe: boolean;
    bpGain: number;
    /** null for Master (no brave points) */
    bp: number | null;
    rankBefore: string;
    rankAfter: string;
    starsAfter: number;
    movement: "up" | "down" | null;
}

export type RankResultTone = "win" | "bonus" | "shield" | "safe" | "loss";

export interface RankResultView {
    tone: RankResultTone;
    emoji: string;
    title: string;
    /** division change line, if any */
    movement: string | null;
}

export function describeRankResult(r: RankResult): RankResultView {
    const movement = r.movement === "up"
        ? `🎉 เลื่อนขั้น! ${r.rankBefore} → ${r.rankAfter}`
        : r.movement === "down"
            ? `ตกไป ${r.rankAfter}`
            : null;

    if (r.isWin) {
        return r.bonusStar
            ? { tone: "bonus", emoji: "🌟", title: `ชนะ! +${r.starChange}⭐ ดาวโบนัส!`, movement }
            : { tone: "win", emoji: "🏆", title: `ชนะ! +${r.starChange}⭐`, movement };
    }
    if (r.shielded) return { tone: "shield", emoji: "🛡️", title: "แพ้ แต่แต้มกล้าหาญกันดาวไว้!", movement };
    if (r.bronzeSafe) return { tone: "safe", emoji: "🔰", title: "แพ้ — Bronze ไม่เสียดาว", movement };
    return { tone: "loss", emoji: "💪", title: `แพ้ ${r.starChange}⭐ สู้ใหม่นะ!`, movement };
}

/** Same match re-recorded with the same outcome (e.g. an unrelated edit) → same key → not shown again */
export function rankResultKey(r: RankResult): string {
    return `${r.matchId}:${r.rpChange}:${r.rankAfter}:${r.starsAfter}:${r.bp ?? "m"}`;
}

export function isRankResult(data: unknown): data is RankResult {
    const d = data as RankResult | null;
    return !!d && typeof d.matchId === "number" && typeof d.isWin === "boolean" && typeof d.rankAfter === "string";
}
