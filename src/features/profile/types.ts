export interface ProfileFormState {
    documentId: string;
    picture: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface UserRankingStats {
    rank: string;
    stars: number;
    ranking_points: number;
    win: number;
    lose: number;
}
