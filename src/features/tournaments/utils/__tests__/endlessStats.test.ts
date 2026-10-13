import { describe, it, expect } from "vitest";
import { computeEndlessStats } from "../endlessStats";
import { ApiMatch, ApiTeam, RegisteredPlayer } from "../../types";

const user = (id: number, extra: Partial<RegisteredPlayer> = {}): RegisteredPlayer => ({
    id, username: `user${id}`, email: "", tpDocumentId: `tp${id}`, ...extra,
});
const guest = (fauxId: number, name: string): RegisteredPlayer => ({
    id: fauxId, username: name, email: "", tpDocumentId: `tpg${fauxId}`, is_guest: true, guest_name: name,
});

type Member = number | { guest: string };
const team = (members: Member[]): ApiTeam => ({
    id: 0, documentId: "", team_no: "",
    team_players: members.map((m, i) => typeof m === "number"
        ? { id: i, user_id: { id: m, username: `user${m}`, skill_level: null, rankings: [{ id: 1, win: 0, lose: 0, win_streak: 0, ranking_points: 0, rank: "Gold I" }] } }
        : { id: i, user_id: null, guest_name: m.guest }),
});
let matchNo = 0;
const match = (a: Member[], b: Member[], scoreA: number, scoreB: number, status: ApiMatch["match_status"] = "done"): ApiMatch => ({
    id: ++matchNo, documentId: `m${matchNo}`, match_no: matchNo, round: 1, match_status: status,
    score_a: scoreA, score_b: scoreB, team_winner: null, team_a_id: team(a), team_b_id: team(b),
});

describe("computeEndlessStats", () => {
    it("keeps the results of a player who left the tournament", () => {
        const players = [user(1), user(2), user(3)]; // user 4 has left
        const stats = computeEndlessStats(players, [match([1, 4], [2, 3], 21, 15)]);

        const left = stats.find((s) => s.key === "u:4")!;
        expect(left).toMatchObject({ username: "user4", hasLeft: true, played: 1, wins: 1, losses: 0, pointsFor: 21, pointsAgainst: 15, rank: "Gold I" });
        expect(stats.filter((s) => s.hasLeft)).toHaveLength(1);
    });

    it("counts guests, including a guest who left", () => {
        const players = [user(1), user(2), guest(-10, "Bob")]; // guest "Ann" has left
        const stats = computeEndlessStats(players, [match([1, { guest: "Bob" }], [2, { guest: "Ann" }], 21, 19)]);

        expect(stats.find((s) => s.key === "g:Bob")).toMatchObject({ hasLeft: false, wins: 1, played: 1 });
        expect(stats.find((s) => s.key === "g:Ann")).toMatchObject({ username: "Ann", hasLeft: true, losses: 1, played: 1 });
    });

    it("uses the current registration for tournament details", () => {
        const players = [user(1, { skill_level: "A", nickname: "Ace", rankings: [{ id: 2, win: 0, lose: 0, win_streak: 0, ranking_points: 0, rank: "Platinum I", stars: 2 }] }), user(2)];
        const [first] = computeEndlessStats(players, [match([1], [2], 21, 10)]);

        expect(first).toMatchObject({ key: "u:1", skill_level: "A", nickname: "Ace", rank: "Platinum I", stars: 2, hasLeft: false });
    });

    it("ignores unfinished matches and lists only players who played", () => {
        const players = [user(1), user(2), user(3)];
        const stats = computeEndlessStats(players, [
            match([1], [2], 21, 10),
            match([3], [4], 0, 0, "live"),
            match([3], [4], 0, 0, "cancelled"),
        ]);
        expect(stats.map((s) => s.key)).toEqual(["u:1", "u:2"]);
    });

    it("sorts by wins, then win rate, then point difference", () => {
        const players = [1, 2, 3, 4].map((id) => user(id));
        const stats = computeEndlessStats(players, [
            match([1], [2], 21, 19),
            match([3], [4], 21, 5),
            match([1], [4], 21, 10),
            match([3], [2], 15, 21),
        ]);
        // 1: 2W 0L · 3: 1W 1L (+10) · 2: 1W 1L (+4) · 4: 0W 2L
        expect(stats.map((s) => s.key)).toEqual(["u:1", "u:3", "u:2", "u:4"]);
    });
});
