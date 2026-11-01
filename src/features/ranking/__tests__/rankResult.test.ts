import { describe, it, expect } from "vitest";
import { describeRankResult, isRankResult, RankResult, rankResultKey } from "../rankResult";

const base: RankResult = {
    matchId: 1, isWin: true, rpChange: 100, starChange: 1, bonusStar: false, shielded: false, bronzeSafe: false,
    bpGain: 30, bp: 30, rankBefore: "Bronze II", rankAfter: "Bronze II", starsAfter: 2, movement: null,
};

describe("describeRankResult", () => {
    it("win", () => {
        expect(describeRankResult(base)).toEqual({ tone: "win", emoji: "🏆", title: "ชนะ! +1⭐", movement: null });
    });

    it("bonus star with promotion", () => {
        const v = describeRankResult({ ...base, starChange: 2, bonusStar: true, rankBefore: "Bronze I", rankAfter: "Silver III", movement: "up" });
        expect(v.tone).toBe("bonus");
        expect(v.title).toBe("ชนะ! +2⭐ ดาวโบนัส!");
        expect(v.movement).toBe("🎉 เลื่อนขั้น! Bronze I → Silver III");
    });

    it("shielded / bronze-safe / plain loss with demotion", () => {
        expect(describeRankResult({ ...base, isWin: false, rpChange: 0, starChange: 0, shielded: true }).tone).toBe("shield");
        expect(describeRankResult({ ...base, isWin: false, rpChange: 0, starChange: 0, bronzeSafe: true }).tone).toBe("safe");
        const loss = describeRankResult({ ...base, isWin: false, rpChange: -100, starChange: -1, rankAfter: "Bronze I", movement: "down" });
        expect(loss).toMatchObject({ tone: "loss", title: "แพ้ -1⭐ สู้ใหม่นะ!", movement: "ตกไป Bronze I" });
    });
});

describe("rankResultKey / isRankResult", () => {
    it("same outcome → same key, different outcome → different key", () => {
        expect(rankResultKey(base)).toBe(rankResultKey({ ...base }));
        expect(rankResultKey(base)).not.toBe(rankResultKey({ ...base, isWin: false, rpChange: 0, bp: 45 }));
    });

    it("validates the payload shape", () => {
        expect(isRankResult(base)).toBe(true);
        expect(isRankResult({ matchId: "1" })).toBe(false);
        expect(isRankResult(null)).toBe(false);
    });
});
