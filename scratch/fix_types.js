const fs = require('fs');

const localTypes = `
export interface ApiPlayer {
    id: number;
    username: string;
    picture?: { url: string } | null;
    rankings?: Array<{ ranking_points: number; rank?: string; stars?: number }> | null;
    tpDocumentId?: string;
    match_offset?: number;
    is_guest?: boolean | null;
    guest_name?: string | null;
    skill_level?: string;
    nickname?: string;
}

export interface ApiMatch {
    match_no: number;
    match_status: "upcoming" | "live" | "done" | "cancelled";
    team_a_id: { team_players: Array<{ user_id: { id: number } | null }> } | null;
    team_b_id: { team_players: Array<{ user_id: { id: number } | null }> } | null;
}

export type PairingMode = "auto" | "manual";

export interface PermanentTeam {
    id: string;
    label: string;
    players: ApiPlayer[];
}
`;

// Fix useEndlessModeManager.tsx
let hookCode = fs.readFileSync('src/features/tournaments/hooks/useEndlessModeManager.tsx', 'utf8');
hookCode = hookCode.replace('import { ApiPlayer, ApiMatch, PermanentTeam, PairingMode } from "../types";', localTypes);
fs.writeFileSync('src/features/tournaments/hooks/useEndlessModeManager.tsx', hookCode);

// Fix EndlessModeManager.tsx
let compCode = fs.readFileSync('src/features/tournaments/detail-components/EndlessModeManager.tsx', 'utf8');
compCode = compCode.replace('import { ApiPlayer, ApiMatch, PermanentTeam, PairingMode } from "../types";', localTypes);
fs.writeFileSync('src/features/tournaments/detail-components/EndlessModeManager.tsx', compCode);
console.log("Fixed types!");
