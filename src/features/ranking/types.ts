export interface ApiPicture {
    url: string;
}

export interface ApiUser {
    id: number;
    documentId: string;
    username: string;
    nickname?: string;
    email: string;
    picture?: ApiPicture | null;
}

export interface TRanking {
    id: number;
    documentId: string;
    ranking_points: number;
    win: number;
    lose: number;
    win_streak: number;
    match_played: number;
    rank?: string;
    stars?: number;
    brave_points?: number;
    user_id: ApiUser | null;
}

export interface ApiSeason {
    id: number;
    documentId: string;
    name: string;
    is_active: boolean;
}

export interface PlayerRow {
    userId: number;
    username: string;
    nickname?: string;
    email: string;
    picture?: ApiPicture | null;
    ranking_points: number;
    win: number;
    lose: number;
    win_streak: number;
    match_played: number;
    hasRanking: boolean;
    rankingId?: number;
    rankings?: any[];
}
