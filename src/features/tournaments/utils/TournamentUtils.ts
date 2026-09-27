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
export const RANK_TIERS = [
    { name: 'Bronze', divisions: 3, starsPerDiv: 3 },
    { name: 'Silver', divisions: 3, starsPerDiv: 3 },
    { name: 'Gold', divisions: 3, starsPerDiv: 3 },
    { name: 'Platinum', divisions: 3, starsPerDiv: 3 },
    { name: 'Diamond', divisions: 3, starsPerDiv: 3 },
    { name: 'Master', divisions: 1, starsPerDiv: 99999 }
];

export function getMaxStarsForRank(rankName?: string): number {
    if (!rankName) return 3;
    const lower = rankName.toLowerCase();
    const tier = RANK_TIERS.find(t => lower.includes(t.name.toLowerCase()));
    if (!tier || tier.name === 'Master') return 0;
    return 3;
}

export function getRankInfoFromPoints(points: number, options?: { isLoss?: boolean }) {
    const isLoss = options?.isLoss === true;
    const DIVS = ['V', 'IV', 'III', 'II', 'I'];
    let p = Math.max(0, points);

    // Each non-Master division corresponds to 300 points (3 stars)
    const pointsPerDiv = 300;
    const standardTiers = RANK_TIERS.filter(t => t.name !== 'Master');
    const totalDivisions = standardTiers.reduce((acc, t) => acc + t.divisions, 0); // 15
    const masterThreshold = totalDivisions * pointsPerDiv; // 4500

    if (p >= masterThreshold) {
        const masterPoints = p - masterThreshold;
        const stars = Math.floor(masterPoints / 100);
        return {
            tier: 'Master',
            division: '',
            divisionNum: 1,
            rankStr: 'Master',
            stars: stars,
            weight: 6000 + (stars * 10)
        };
    }

    let divIdx = Math.floor(p / pointsPerDiv);
    let rem = p % pointsPerDiv;
    let stars = Math.floor(rem / 100);

    // Division boundary handling (e.g. 300, 600, 900 RP):
    // - On normal/win/rank-up: represents full 3 stars of the previous division
    // - On loss (or at 0 stars of current division): represents 0 stars of the current division
    if (rem === 0 && divIdx > 0) {
        if (!isLoss) {
            divIdx = divIdx - 1;
            stars = 3;
        } else {
            stars = 0;
        }
    }

    let runningDivs = 0;
    for (let i = 0; i < standardTiers.length; i++) {
        const t = standardTiers[i];
        if (divIdx < runningDivs + t.divisions) {
            const localDivIdx = divIdx - runningDivs;
            const activeDivs = DIVS.slice(5 - t.divisions);
            const divisionStr = activeDivs[localDivIdx];
            return {
                tier: t.name,
                division: divisionStr,
                divisionNum: t.divisions - localDivIdx,
                rankStr: `${t.name} ${divisionStr}`,
                stars: stars,
                weight: 1000 + (i * 1000) + (localDivIdx * 250) + (stars * 50)
            };
        }
        runningDivs += t.divisions;
    }

    return { tier: 'Bronze', division: 'III', divisionNum: 3, rankStr: 'Bronze III', stars: 0, weight: 1000 };
}

