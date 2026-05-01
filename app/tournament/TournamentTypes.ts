export type TournamentStatus = "upcoming" | "ongoing" | "completed";
export type PlayerType = "single" | "double";
export type TournamentFormat = "round_robin" | "knockout" | "americano" | "endless_mode";
export type TournamentMode = "ranking" | "casual";

export interface ListTournament {
    id: number;
    documentId: string;
    name: string;
    type: PlayerType;
    format: TournamentFormat;
    tournament_status: TournamentStatus;
    startDate: string;
    createdAt: string;
    playerCount: number;
    isJoined: boolean;
    mode: TournamentMode;
    user_created?: {
        id: number;
        username: string;
        picture?: { url: string } | null;
    } | null;
}

export interface User {
    id: number;
    username?: string;
    email?: string;
}


export interface RegisteredPlayer {
    id: number;
    username: string;
    email: string;
    tpDocumentId: string;
    picture?: { url: string } | null;
    rankings?: ApiRanking[] | null;
    is_paused?: boolean;
}

export interface TournamentInfo {
    name: string;
    tournament_status: TournamentStatus;
    type: string;
    format: string;
    startDate: string;
    mode: "ranking" | "casual";
    players: RegisteredPlayer[];
    user_created?: { id: number; username?: string } | null;
    permanent_teams?: any[];
}

export interface ApiRanking {
    id: number;
    win: number;
    lose: number;
    win_streak: number;
    mmr: number;
    rank?: string;
    stars?: number;
}

export interface ApiPlayer {
    id: number;
    username: string;
    picture?: { url: string } | null;
    rankings?: ApiRanking[] | null;
}

export interface ApiTeam {
    id: number;
    documentId: string;
    team_no: string;
    team_players: Array<{ id: number; user_id: ApiPlayer | null }>;
}

export interface ApiMatchHistory {
    id: number;
    mmr_change: number;
    users: ApiPlayer[];
}

export interface ApiMatch {
    id: number;
    documentId: string;
    match_no: number;
    round: string | number;
    match_status: "upcoming" | "live" | "done" | "cancelled";
    score_a: number;
    score_b: number;
    team_winner: string | null;
    team_a_id: ApiTeam | null;
    team_b_id: ApiTeam | null;
    match_histories?: ApiMatchHistory[];
    first_serve?: "A" | "B";
}

export type MatchStatus = "done" | "live" | "upcoming";

export interface TMatch {
    id: string;
    player1: string;
    player2: string;
    score1: number | null;
    score2: number | null;
    status: MatchStatus;
    court: string;
    time: string;
    round: string;
}

export interface GroupPlayer {
    name: string;
    won: number;
    lost: number;
    pts: number;
    sumFor: number;
    sumAgainst: number;
}

export interface DrawnPair {
    teamA: RegisteredPlayer[];
    teamB: RegisteredPlayer[] | null;
    servingSide?: "A" | "B";
}
