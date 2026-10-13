import { describe, it, expect } from "vitest";
import { buildHistory, pickNextMatch, skillScore, Entity, PastMatch } from "../endlessMatchmaking";
import { RegisteredPlayer } from "../../types";

const player = (id: number, skill_level?: string): RegisteredPlayer =>
    ({ id, username: `p${id}`, email: "", tpDocumentId: `tp${id}`, skill_level } as RegisteredPlayer);

/** Deterministic RNG so results are reproducible */
function seeded(seed: number) {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

/** Play `rounds` doubles matches one after another (each finishes before the next is drawn) */
function simulate(players: RegisteredPlayer[], rounds: number, seed = 1, blocked: Array<[number, number]> = []) {
    const past: PastMatch[] = [];
    const games = new Map(players.map(p => [p.id, 0]));
    const rng = seeded(seed);
    const isBlockedPair = (a: number, b: number) => blocked.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    for (let r = 1; r <= rounds; r++) {
        const entities: Entity[] = players.map(p => ({ type: "solo", players: [p], matchCount: games.get(p.id)! }));
        const res = pickNextMatch({ type: "double", entities, history: buildHistory(past), gamesOf: id => games.get(id)!, isBlockedPair, rng });
        if ("error" in res) throw new Error(res.error);
        const m = { teamA: res.teamA.map(p => p.id), teamB: res.teamB.map(p => p.id), matchNo: r };
        past.push(m);
        [...m.teamA, ...m.teamB].forEach(id => games.set(id, games.get(id)! + 1));
    }
    return { past, games };
}

describe("endless matchmaking", () => {
    it("never lets anyone get more than one game ahead", () => {
        const players = Array.from({ length: 10 }, (_, i) => player(i + 1, "BG"));
        const { games } = simulate(players, 25);
        const counts = [...games.values()];
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    });

    it("rotates partners: with 8 players nobody repeats a partner in the first 7 rounds of play each", () => {
        const players = Array.from({ length: 8 }, (_, i) => player(i + 1, "N"));
        // 14 matches = every player plays 7 games = enough for 7 different partners
        const { past } = simulate(players, 14);
        const seen = new Map<string, number>();
        for (const m of past) for (const t of [m.teamA, m.teamB]) {
            const k = [...t].sort().join("-");
            seen.set(k, (seen.get(k) || 0) + 1);
        }
        expect(Math.max(...seen.values())).toBe(1);
    });

    it("splits 4 players into the closest teams", () => {
        const p = [player(1, "P"), player(2, "หน้าบ้าน"), player(3, "S"), player(4, "BG")];
        const res = pickNextMatch({
            type: "double",
            entities: p.map(x => ({ type: "solo", players: [x], matchCount: 0 })),
            history: buildHistory([]),
            gamesOf: () => 0,
            isBlockedPair: () => false,
            rng: seeded(3),
        });
        if ("error" in res) throw new Error(res.error);
        // P(5)+หน้าบ้าน(1) vs S(4)+BG(2) is the only 3 vs 3 split
        const team = (t: RegisteredPlayer[]) => t.map(x => x.id).sort().join(",");
        expect([team(res.teamA), team(res.teamB)].sort()).toEqual(["1,2", "3,4"]);
    });

    it("never puts blocked partners together when another option exists", () => {
        const players = Array.from({ length: 6 }, (_, i) => player(i + 1, "N"));
        const { past } = simulate(players, 12, 7, [[1, 2]]);
        for (const m of past) for (const t of [m.teamA, m.teamB]) {
            expect(t.includes(1) && t.includes(2)).toBe(false);
        }
    });

    it("one strong player among beginners still plays as often as everyone and partners with different people", () => {
        const players = [player(1, "P"), ...Array.from({ length: 11 }, (_, i) => player(i + 2, "BG"))];
        const { past, games } = simulate(players, 12);
        // 12 matches × 4 = 48 slots over 12 players = exactly 4 games each
        expect(games.get(1)).toBe(4);
        const partnersOfP = past.flatMap(m => [m.teamA, m.teamB]).filter(t => t.includes(1)).map(t => t.find(id => id !== 1));
        expect(new Set(partnersOfP).size).toBe(partnersOfP.length);
    });

    it("a permanent team always plays together, as often as everyone, and gets the closest opponents available", () => {
        const players = ["P", "P", "S", "S", "S", "N", "N", "N", "N", "BG", "BG", "BG"].map((l, i) => player(i + 1, l));
        const team = [players[5], players[6]]; // N + N
        const past: PastMatch[] = [];
        const games = new Map(players.map(p => [p.id, 0]));
        const rng = seeded(11);
        for (let r = 1; r <= 30; r++) {
            const entities: Entity[] = [
                { type: "team", players: team, matchCount: Math.max(...team.map(p => games.get(p.id)!)) },
                ...players.filter(p => !team.includes(p)).map(p => ({ type: "solo" as const, players: [p], matchCount: games.get(p.id)! })),
            ];
            const res = pickNextMatch({ type: "double", entities, history: buildHistory(past), gamesOf: id => games.get(id)!, isBlockedPair: () => false, rng });
            if ("error" in res) throw new Error(res.error);
            const sides = [res.teamA.map(p => p.id), res.teamB.map(p => p.id)];
            const withTeam = sides.find(s => s.includes(6) || s.includes(7));
            if (withTeam) expect(withTeam.sort()).toEqual([6, 7]);
            sides.flat().forEach(id => games.set(id, games.get(id)! + 1));
            past.push({ teamA: sides[0], teamB: sides[1], matchNo: r });
        }
        expect(games.get(6)).toBe(10);
        expect(new Set(games.values()).size).toBe(1);
    });

    it("typical club night (1 P among หน้าบ้าน/BG/N): P plays as often as everyone and P's games stay close", () => {
        const levels = ["P", "หน้าบ้าน", "หน้าบ้าน", "หน้าบ้าน", "BG", "BG", "BG", "BG", "BG", "N", "N", "N"];
        let pGames = 0, lopsided = 0;
        for (const seed of [1, 2, 3, 4, 5]) {
            const { past, games } = simulate(levels.map((l, i) => player(i + 1, l)), 30, seed);
            expect(new Set(games.values()).size).toBe(1);
            const byId = new Map(levels.map((l, i) => [i + 1, player(i + 1, l)]));
            const avg = (ids: number[]) => ids.reduce((s, id) => s + skillScore(byId.get(id)!), 0) / ids.length;
            for (const m of past.filter(m => [...m.teamA, ...m.teamB].includes(1))) {
                pGames++;
                if (Math.abs(avg(m.teamA) - avg(m.teamB)) > 1) lopsided++;
            }
        }
        // Before the outlier handling this was ~34%
        expect(lopsided / pGames).toBeLessThan(0.2);
    });

    it("nobody plays two games in a row while others are waiting (1 court, 12 players)", () => {
        const levels = ["P", "หน้าบ้าน", "หน้าบ้าน", "หน้าบ้าน", "BG", "BG", "BG", "BG", "BG", "N", "N", "N"];
        for (const seed of [1, 2, 3]) {
            const { past } = simulate(levels.map((l, i) => player(i + 1, l)), 30, seed);
            for (let i = 1; i < past.length; i++) {
                const prev = [...past[i - 1].teamA, ...past[i - 1].teamB];
                expect([...past[i].teamA, ...past[i].teamB].some(id => prev.includes(id))).toBe(false);
            }
        }
    });
});
