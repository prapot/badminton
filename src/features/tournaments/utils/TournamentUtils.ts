import { TMatch, GroupPlayer } from "../types";

export function calcStandings(players: string[], matches: TMatch[], round: string): GroupPlayer[] {
    const map: Record<string, GroupPlayer> = {};
    players.forEach((p) => { map[p] = { name: p, won: 0, lost: 0, pts: 0, sumFor: 0, sumAgainst: 0 }; });
    matches.filter((m) => m.round === round && m.status === "done" && m.score1 !== null && m.score2 !== null).forEach((m) => {
        const s1 = m.score1!, s2 = m.score2!;
        if (s1 > s2) { map[m.player1].won++; map[m.player1].pts += 3; map[m.player2].lost++; }
        else { map[m.player2].won++; map[m.player2].pts += 3; map[m.player1].lost++; }
        map[m.player1].sumFor += s1; map[m.player1].sumAgainst += s2;
        map[m.player2].sumFor += s2; map[m.player2].sumAgainst += s1;
    });
    return Object.values(map).sort((a, b) => b.pts - a.pts || (b.sumFor - b.sumAgainst) - (a.sumFor - a.sumAgainst));
}

export function calculateExpectedRpChange(teamARp: number | null, teamBRp: number | null): { aWins: number, aLoses: number, bWins: number, bLoses: number } {
    const defaultRp = 0;
    const aRp = teamARp ?? defaultRp;
    const bRp = teamBRp ?? defaultRp;
    const K = 32;

    const expectedAWins = 1 / (1 + Math.pow(10, (bRp - aRp) / 400));
    const expectedBWins = 1 / (1 + Math.pow(10, (aRp - bRp) / 400));

    const movMultiplier = Math.log(2);

    const aWinChange = Math.round(K * movMultiplier * (1 - expectedAWins));
    const aLoseChange = Math.round(K * movMultiplier * (1 - expectedBWins));

    const bWinChange = Math.round(K * movMultiplier * (1 - expectedBWins));
    const bLoseChange = Math.round(K * movMultiplier * (1 - expectedAWins));

    return { aWins: aWinChange, aLoses: aLoseChange, bWins: bWinChange, bLoses: bLoseChange };
}

export function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

export function lcm(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / gcd(a, b);
}
export function getPartnerRepeats(playerIds: number[], currentPairIdx: number, matches: any[], drawnPairs: any[]): number {
    let count = 0;
    // Check in past matches (API)
    matches.filter(m => m.match_status !== 'cancelled').forEach(m => {
        const teamAIds = m.team_a_id?.team_players.map((tp: any) => tp.user_id?.id).filter(Boolean) || [];
        const teamBIds = m.team_b_id?.team_players.map((tp: any) => tp.user_id?.id).filter(Boolean) || [];
        if (playerIds.every(id => teamAIds.includes(id)) && playerIds.length === teamAIds.length) count++;
        if (playerIds.every(id => teamBIds.includes(id)) && playerIds.length === teamBIds.length) count++;
    });
    // Check in previously drawn pairs in this session
    drawnPairs.slice(0, currentPairIdx).forEach(dp => {
        const teamAIds = dp.teamA.map((p: any) => p.id);
        const teamBIds = dp.teamB?.map((p: any) => p.id) || [];
        if (playerIds.every(id => teamAIds.includes(id)) && playerIds.length === teamAIds.length) count++;
        if (playerIds.every(id => teamBIds.includes(id)) && playerIds.length === teamBIds.length) count++;
    });
    return count;
}
export function getRankInfoFromPoints(points: number) {
    const TIERS = [
        { name: 'Bronze', divisions: 3, starsPerDiv: 3 },
        { name: 'Silver', divisions: 3, starsPerDiv: 3 },
        { name: 'Gold', divisions: 3, starsPerDiv: 3 },
        { name: 'Platinum', divisions: 3, starsPerDiv: 3 },
        { name: 'Diamond', divisions: 3, starsPerDiv: 3 },
        { name: 'Master', divisions: 1, starsPerDiv: 99999 }
    ];
    const DIVS = ['V', 'IV', 'III', 'II', 'I'];
    let p = points;
    for (const t of TIERS) {
        const tierMax = t.divisions * t.starsPerDiv * 100;
        if (p < tierMax || t.name === 'Master') {
            if (t.name === 'Master') {
                const s = Math.floor(p / 100);
                return { tier: 'Master', rankStr: 'Master', weight: 6000 + (s * 10) };
            }
            const divIdx = Math.floor(p / (t.starsPerDiv * 100));
            const divRp = p % (t.starsPerDiv * 100);
            const stars = Math.floor(divRp / 100);
            const activeDivs = DIVS.slice(5 - t.divisions);
            const divisionStr = activeDivs[divIdx];
            return {
                tier: t.name,
                division: divisionStr,
                rankStr: `${t.name} ${divisionStr}`,
                stars: stars,
                weight: 1000 + (TIERS.indexOf(t) * 1000) + (divIdx * 200) + (stars * 50)
            };
        }
        p -= tierMax;
    }
    return { tier: 'Bronze', rankStr: 'Bronze III', weight: 1000 };
}

