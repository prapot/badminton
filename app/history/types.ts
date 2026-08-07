export interface MatchHistory {
    id: number;
    documentId: string;
    old_rp: number;
    new_rp: number;
    rp_change: number;
    is_win: boolean;
    rank_before?: string;
    rank_after?: string;
    createdAt: string;
    matches: Array<{
        round: any;
        id: number;
        documentId: string;
        score_a: number;
        score_b: number;
        match_status: string;
        tournament_id?: {
            name: string;
            mode: string;
            documentId: string;
        } | null;
        team_a_id?: {
            name: string;
            team_players: Array<{ user_id?: { id: number; username: string } }>;
        } | null;
        team_b_id?: {
            name: string;
            team_players: Array<{ user_id?: { id: number; username: string } }>;
        } | null;
    }>;
    ranking?: {
        season?: {
            name: string;
            documentId: string;
        }
    } | null;
}

export interface PaginationMeta {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
}

export interface TargetUser {
    id: number;
    username: string;
    picture?: { url: string } | null;
}

export interface ApiSeason {
    id: number;
    documentId: string;
    name: string;
    is_active: boolean;
}

export interface RankingStats {
    rank?: string;
    stars?: number;
    match_played?: number;
    win?: number;
    lose?: number;
    brave_points?: number;
}

export interface AnalyticsSummary {
    date: string;
    fullDate: string;
    rp: number;
    matchCount: number;
}

export interface AnalyticsDetails {
    id: number;
    documentId: string;
    rp: number;
    time: string;
    is_win: boolean;
    rp_change: number;
    fullDate: string;
}

export interface AnalyticsData {
    summary: AnalyticsSummary[];
    details: Record<string, AnalyticsDetails[]>;
}
