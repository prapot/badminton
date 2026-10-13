import { ApiMatch, ApiTeam, RegisteredPlayer } from "../types";

export interface EndlessPlayerStats {
    key: string;
    username: string;
    nickname?: string;
    skill_level?: string;
    rank?: string;
    stars?: number;
    /** No longer in the tournament (left), but played matches that still count */
    hasLeft: boolean;
    played: number;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
}

type TeamPlayer = ApiTeam["team_players"][number];

// Users by id, guests by name (guests have no user id, and their faux id is gone once they leave)
const userKey = (id: number) => `u:${id}`;
const guestKey = (name: string) => `g:${name}`;
const teamPlayerKey = (tp: TeamPlayer) =>
    tp.user_id?.id ? userKey(tp.user_id.id) : tp.guest_name ? guestKey(tp.guest_name) : null;
const playerKey = (p: RegisteredPlayer) => (p.is_guest && p.guest_name ? guestKey(p.guest_name) : userKey(p.id));

/**
 * Per-player stats from the finished matches. Rows come from the matches themselves, so players
 * who left the tournament keep their results; current registrations only add tournament details
 * (skill level, latest rank).
 */
export function computeEndlessStats(players: RegisteredPlayer[], apiMatches: ApiMatch[]): EndlessPlayerStats[] {
    const current = new Map(players.map((p) => [playerKey(p), p]));
    const stats = new Map<string, EndlessPlayerStats>();

    const statsFor = (tp: TeamPlayer): EndlessPlayerStats | null => {
        const key = teamPlayerKey(tp);
        if (!key) return null;
        let s = stats.get(key);
        if (!s) {
            const p = current.get(key);
            const ranking = p?.rankings?.[0] ?? tp.user_id?.rankings?.[0];
            s = {
                key,
                username: p?.username || tp.user_id?.username || tp.guest_name || "Unknown",
                nickname: p?.nickname ?? tp.user_id?.nickname,
                skill_level: p?.skill_level,
                rank: ranking?.rank,
                stars: ranking?.stars,
                hasLeft: !p,
                played: 0,
                wins: 0,
                losses: 0,
                pointsFor: 0,
                pointsAgainst: 0,
            };
            stats.set(key, s);
        }
        return s;
    };

    apiMatches.forEach((m) => {
        if (m.match_status !== "done") return;
        const scoreA = m.score_a || 0;
        const scoreB = m.score_b || 0;

        const record = (team: ApiTeam | null | undefined, scored: number, conceded: number) => {
            team?.team_players.forEach((tp) => {
                const s = statsFor(tp);
                if (!s) return;
                s.played += 1;
                if (scored > conceded) s.wins += 1;
                else if (conceded > scored) s.losses += 1;
                s.pointsFor += scored;
                s.pointsAgainst += conceded;
            });
        };
        record(m.team_a_id, scoreA, scoreB);
        record(m.team_b_id, scoreB, scoreA);
    });

    return Array.from(stats.values()).sort((a, b) => {
        // Wins desc, then win rate desc, then point difference desc
        if (b.wins !== a.wins) return b.wins - a.wins;
        const wrA = a.played > 0 ? a.wins / a.played : 0;
        const wrB = b.played > 0 ? b.wins / b.played : 0;
        if (wrB !== wrA) return wrB - wrA;
        return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
    });
}
