import { RegisteredPlayer } from "../types";

/**
 * Endless-mode matchmaking.
 *
 * Priorities (house rules):
 *  0. Hard: busy/paused players are excluded upstream; permanent teams play together;
 *     blocked partners are never teammates if any other option exists.
 *  1. Play-count tier: only the group of players with the fewest games is eligible
 *     (nobody sits out while others play more).
 *  2. Within that tier, balance two equal goals:
 *       - meet new people (avoid repeat partners, repeat opponents, repeat 2v2s)
 *       - close games: split the chosen players into the most even teams. Skill only
 *         compares splits of the same group, so a lone strong player is never held back
 *         to the end of every round just for being hard to balance.
 *         "Hard to balance" groups — ones with a permanent team (only one possible split) or a
 *         player whose level is 2+ away from the session's median (e.g. the lone P among
 *         หน้าบ้าน/BG/N) — are compared against the best group available for that same
 *         team/player, and get to play early in their round while the right partners and
 *         opponents are still free.
 *  3. Tie-breakers: fewer total games; nobody plays twice in a row while enough others wait.
 */

export type Entity = { type: "team" | "solo"; players: RegisteredPlayer[]; matchCount: number };
export type Pairing = { teamA: RegisteredPlayer[]; teamB: RegisteredPlayer[] };

/** History of previous (non-cancelled) matches, as id lists per side */
export type PastMatch = { teamA: number[]; teamB: number[]; matchNo: number };

export interface MatchHistory {
    partner: Map<string, number>;
    opponent: Map<string, number>;
    faceoff: Map<string, number>;
    lastPlayed: Map<number, number>;
    maxMatchNo: number;
}

const pairKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
const sideKey = (ids: number[]) => [...ids].sort((a, b) => a - b).join(",");
const faceoffKey = (a: number[], b: number[]) => [sideKey(a), sideKey(b)].sort().join("|");
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) || 0) + 1);

export function buildHistory(matches: PastMatch[]): MatchHistory {
    const partner = new Map<string, number>();
    const opponent = new Map<string, number>();
    const faceoff = new Map<string, number>();
    const lastPlayed = new Map<number, number>();
    let maxMatchNo = 0;

    for (const m of matches) {
        maxMatchNo = Math.max(maxMatchNo, m.matchNo);
        for (const side of [m.teamA, m.teamB]) {
            for (let i = 0; i < side.length; i++) {
                lastPlayed.set(side[i], Math.max(lastPlayed.get(side[i]) ?? -1, m.matchNo));
                for (let j = i + 1; j < side.length; j++) bump(partner, pairKey(side[i], side[j]));
            }
        }
        for (const a of m.teamA) for (const b of m.teamB) bump(opponent, pairKey(a, b));
        if (m.teamA.length && m.teamB.length) bump(faceoff, faceoffKey(m.teamA, m.teamB));
    }
    return { partner, opponent, faceoff, lastPlayed, maxMatchNo };
}

/** Skill levels used for balancing; players without one count as the middle level (N) */
export function skillScore(p: RegisteredPlayer): number {
    switch (p.skill_level) {
        case "หน้าบ้าน": return 1;
        case "BG": return 2;
        case "N": return 3;
        case "S": return 4;
        case "P": return 5;
        default: return 3;
    }
}

export const WEIGHTS = {
    tier: 1_000_000_000, // per game of the most-played player in the group (hard tier)
    blocked: 1_000_000_000_000,
    partnerRepeat: 1_000, // × (times already partnered)², so repeats escalate
    faceoffRepeat: 1_500, // exact same 2v2 again
    opponentRepeat: 300, // per previous meeting of each cross pair
    skillDiff: 1_500, // per level of avg-skill gap beyond the best split this group allows
    totalGames: 200, // per game across the 4 players (mild: prefer the least-played within the tier)
    // Played in the last match / the one before. With plenty of people waiting (≥ 3 groups available)
    // nobody plays twice in a row; with few (e.g. 8 players on 1 court) a back-to-back is allowed,
    // otherwise the same two quartets would alternate all night and never mix.
    justPlayed: [1_500, 300, 0],
    justPlayedFewWaiting: [300, 100, 0],
    hardToBalanceFirst: 2_000, // bonus: permanent teams / outlier players play early in their round
    outlierLevels: 2, // a solo this many levels from the median is "hard to balance"
};

const MAX_POOL = 24;
const MAX_SETS = 12_000; // C(24,4) = 10,626 — the whole pool is searched, no bias toward early entries

/** Fisher–Yates with an injectable RNG (tests pass a seeded one) */
function shuffle<T>(arr: T[], rng: () => number): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export interface PickInput {
    type: "single" | "double";
    entities: Entity[];
    history: MatchHistory;
    /** effective game count per player (late joiners already lifted to the main group) */
    gamesOf: (playerId: number) => number;
    isBlockedPair: (a: number, b: number) => boolean;
    rng?: () => number;
}

export type PickResult = (Pairing & { penalty: number; isBlocked: boolean }) | { error: "not-enough-players" | "no-valid-group" };

const avgSkill = (t: RegisteredPlayer[]) => t.reduce((s, x) => s + skillScore(x), 0) / t.length;
const skillGap = (p: Pairing) => Math.abs(avgSkill(p.teamA) - avgSkill(p.teamB));

export function scorePairing(
    p: Pairing,
    input: PickInput,
    groupMaxGames: number,
    groupTotalGames: number,
    fixedTeam: (ids: number[]) => boolean,
    bestGapInGroup: number,
    justPlayed: readonly number[] = WEIGHTS.justPlayed,
) {
    const { history } = input;
    const ids = (t: RegisteredPlayer[]) => t.map(x => x.id);
    let penalty = groupMaxGames * WEIGHTS.tier + groupTotalGames * WEIGHTS.totalGames;
    let isBlocked = false;

    for (const team of [p.teamA, p.teamB]) {
        if (team.length === 2) {
            if (input.isBlockedPair(team[0].id, team[1].id)) isBlocked = true;
            // Permanent teams are chosen on purpose — don't punish them for playing together
            if (!fixedTeam(ids(team))) {
                const n = history.partner.get(pairKey(team[0].id, team[1].id)) || 0;
                penalty += n * n * WEIGHTS.partnerRepeat;
            }
        }
    }
    if (isBlocked) penalty += WEIGHTS.blocked;

    for (const a of p.teamA) for (const b of p.teamB) {
        penalty += (history.opponent.get(pairKey(a.id, b.id)) || 0) * WEIGHTS.opponentRepeat;
    }
    penalty += (history.faceoff.get(faceoffKey(ids(p.teamA), ids(p.teamB))) || 0) * WEIGHTS.faceoffRepeat;

    penalty += (skillGap(p) - bestGapInGroup) * WEIGHTS.skillDiff;

    for (const x of [...p.teamA, ...p.teamB]) {
        const last = history.lastPlayed.get(x.id);
        if (last === undefined || last < 0) continue;
        const ago = history.maxMatchNo - last;
        if (ago >= 0 && ago < justPlayed.length) penalty += justPlayed[ago];
    }
    return { penalty, isBlocked };
}

export function pickNextMatch(input: PickInput): PickResult {
    const rng = input.rng ?? Math.random;
    const required = input.type === "double" ? 4 : 2;
    const total = input.entities.reduce((s, e) => s + e.players.length, 0);
    if (total < required) return { error: "not-enough-players" };

    // Least-played first; shuffle before the (stable) sort so equal counts are in random order
    const sorted = shuffle(input.entities, rng).sort((a, b) => a.matchCount - b.matchCount);
    const pool = sorted.slice(0, MAX_POOL);

    // Enumerate groups of entities adding up to exactly `required` players
    type Group = { entities: Entity[]; maxGames: number; totalGames: number };
    const groups: Group[] = [];
    const pick: Entity[] = [];
    const walk = (start: number, count: number) => {
        if (groups.length >= MAX_SETS) return;
        if (count === required) {
            const players = pick.flatMap(e => e.players);
            const games = players.map(p => input.gamesOf(p.id));
            groups.push({ entities: [...pick], maxGames: Math.max(...games), totalGames: games.reduce((s, g) => s + g, 0) });
            return;
        }
        for (let i = start; i < pool.length; i++) {
            if (count + pool[i].players.length > required) continue;
            pick.push(pool[i]);
            walk(i + 1, count + pool[i].players.length);
            pick.pop();
        }
    };
    walk(0, 0);
    if (groups.length === 0) return { error: "no-valid-group" };

    // Only the lowest play-count tier is eligible
    const tier = Math.min(...groups.map(g => g.maxGames));
    const eligible = groups.filter(g => g.maxGames === tier);

    const fixedTeamKeys = new Set(input.entities.filter(e => e.type === "team").map(e => sideKey(e.players.map(p => p.id))));
    const fixedTeam = (ids: number[]) => fixedTeamKeys.has(sideKey(ids));

    const buildPairings = (g: Group): Pairing[] => {
        const teams = g.entities.filter(e => e.type === "team").map(e => e.players);
        const solos = g.entities.filter(e => e.type === "solo").map(e => e.players[0]);
        const pairings: Pairing[] = [];
        if (input.type === "double") {
            if (teams.length === 2) pairings.push({ teamA: teams[0], teamB: teams[1] });
            else if (teams.length === 1 && solos.length === 2) pairings.push({ teamA: teams[0], teamB: solos });
            else if (solos.length === 4) {
                const [a, b, c, d] = solos;
                pairings.push({ teamA: [a, b], teamB: [c, d] }, { teamA: [a, c], teamB: [b, d] }, { teamA: [a, d], teamB: [b, c] });
            }
        } else if (solos.length === 2) {
            pairings.push({ teamA: [solos[0]], teamB: [solos[1]] });
        }
        return pairings;
    };

    // Groups with the same permanent team(s) are compared with each other (pick the closest opponents);
    // solo-only groups are compared within themselves (pick the closest split)
    const levels = input.entities.flatMap(e => e.players.map(skillScore)).sort((a, b) => a - b);
    const median = levels[Math.floor(levels.length / 2)];
    const isOutlier = (p: RegisteredPlayer) => Math.abs(skillScore(p) - median) >= WEIGHTS.outlierLevels;
    const teamSignature = (g: Group) => [
        ...g.entities.filter(e => e.type === "team").map(e => sideKey(e.players.map(p => p.id))),
        ...g.entities.filter(e => e.type === "solo" && isOutlier(e.players[0])).map(e => `o${e.players[0].id}`),
    ].sort().join("|");
    const groupPairings = eligible.map(g => ({ g, pairings: buildPairings(g), sig: teamSignature(g) }));
    const bestGapBySignature = new Map<string, number>();
    for (const { pairings, sig } of groupPairings) {
        if (!sig || pairings.length === 0) continue;
        const gap = Math.min(...pairings.map(skillGap));
        bestGapBySignature.set(sig, Math.min(bestGapBySignature.get(sig) ?? Infinity, gap));
    }

    const justPlayed = total >= required * 3 ? WEIGHTS.justPlayed : WEIGHTS.justPlayedFewWaiting;
    const scored: Array<Pairing & { penalty: number; isBlocked: boolean }> = [];
    for (const { g, pairings, sig } of groupPairings) {
        if (pairings.length === 0) continue;
        const bestGap = sig ? bestGapBySignature.get(sig)! : Math.min(...pairings.map(skillGap));
        const teamBonus = sig ? WEIGHTS.hardToBalanceFirst : 0;
        for (const p of pairings) {
            const sc = scorePairing(p, input, g.maxGames, g.totalGames, fixedTeam, bestGap, justPlayed);
            scored.push({ ...p, penalty: sc.penalty - teamBonus, isBlocked: sc.isBlocked });
        }
    }
    if (scored.length === 0) return { error: "no-valid-group" };

    // Blocked teammates only if literally nothing else is possible
    const unblocked = scored.filter(s => !s.isBlocked);
    const candidates = unblocked.length ? unblocked : scored;
    const best = Math.min(...candidates.map(s => s.penalty));
    const ties = candidates.filter(s => s.penalty - best < 1e-6);
    return ties[Math.floor(rng() * ties.length)];
}
