
import { RegisteredPlayer } from '../TournamentTypes';

export interface KnockoutMatch {
    round: number;
    match_no: number;
    team_a: RegisteredPlayer[] | null;
    team_b: RegisteredPlayer[] | null;
    is_bye: boolean;
}

export function generateFullKnockoutBracket(players: RegisteredPlayer[], type: 'single' | 'double'): KnockoutMatch[] {
    const numPlayers = players.length;
    if (numPlayers < 2) return [];

    // 1. Prepare Units (Pre-formed teams)
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    let units: RegisteredPlayer[][] = [];
    if (type === 'double') {
        for (let i = 0; i < shuffled.length; i += 2) {
            const team = [shuffled[i]];
            if (shuffled[i + 1]) team.push(shuffled[i + 1]);
            units.push(team);
        }
    } else {
        units = shuffled.map(p => [p]);
    }

    const n = units.length;
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(n)));
    const totalRounds = Math.log2(nextPowerOfTwo);
    
    const allMatches: KnockoutMatch[] = [];

    // 2. Generate Round 1 with Byes
    const r1Slots = nextPowerOfTwo / 2;
    const fullMatchesCount = n - r1Slots;
    
    let uIdx = 0;
    const r1Results: (RegisteredPlayer[] | null)[] = []; // Winners/Advancers of R1

    for (let i = 0; i < r1Slots; i++) {
        if (i < fullMatchesCount) {
            const teamA = units[uIdx++];
            const teamB = units[uIdx++];
            allMatches.push({
                round: 1,
                match_no: i + 1,
                team_a: teamA,
                team_b: teamB,
                is_bye: false
            });
            r1Results.push(null); // Winner TBD
        } else {
            const teamA = units[uIdx++];
            allMatches.push({
                round: 1,
                match_no: i + 1,
                team_a: teamA,
                team_b: null,
                is_bye: true
            });
            r1Results.push(teamA); // Advances automatically
        }
    }

    // 3. Generate Subsequent Rounds
    let prevRoundSlots = r1Slots;
    let prevRoundResults = r1Results;

    for (let r = 2; r <= totalRounds; r++) {
        const currentRoundSlots = prevRoundSlots / 2;
        const currentRoundResults: (RegisteredPlayer[] | null)[] = [];

        for (let i = 0; i < currentRoundSlots; i++) {
            const teamA = prevRoundResults[i * 2];
            const teamB = prevRoundResults[i * 2 + 1];

            allMatches.push({
                round: r,
                match_no: i + 1,
                team_a: teamA,
                team_b: teamB,
                is_bye: false
            });
            currentRoundResults.push(null); // Winner TBD
        }
        prevRoundSlots = currentRoundSlots;
        prevRoundResults = currentRoundResults;
    }

    return allMatches;
}
