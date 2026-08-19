import { useState, useEffect } from "react";
import useSWR from "swr";
import { useAuth } from "@/features/auth/useAuth";
import { MatchHistory, PaginationMeta, TargetUser, ApiSeason, RankingStats, AnalyticsData } from "../types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

const fetcher = async ([url, token]: [string, string]) => {
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
};

export function useHistoryData(userId: string) {
    const { user, jwt } = useAuth();
    const [page, setPage] = useState(1);
    const [selectedSeason, setSelectedSeason] = useState<string>("all");

    // 1. Fetch Seasons
    const { data: seasonsJson, isLoading: seasonsLoading } = useSWR(
        jwt ? [`${STRAPI_BASE_URL}/api/seasons?sort=createdAt:desc`, jwt] : null,
        fetcher,
        { revalidateOnFocus: false }
    );
    const seasons: ApiSeason[] = seasonsJson?.data ?? [];

    // Default season
    useEffect(() => {
        if (seasons.length > 0 && selectedSeason === "all") {
            const activeSeason = seasons.find((s) => s.is_active);
            if (activeSeason) {
                // Keep "all" or set it to active season depending on logic
                // But in original code, it sets it to activeSeason initially:
                setSelectedSeason(activeSeason.documentId);
            }
        }
    }, [seasons, selectedSeason]);

    // 2. Fetch Target User
    const { data: targetUser, isLoading: userLoading } = useSWR<TargetUser>(
        jwt ? [`${STRAPI_BASE_URL}/api/users/${userId}?populate=picture`, jwt] : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    // 3. Fetch Match Histories (No season filter)
    const historiesUrl = `${STRAPI_BASE_URL}/api/match-histories?filters[users][id]=${userId}&populate[matches][populate][team_a_id][populate][team_players][populate]=user_id&populate[matches][populate][team_b_id][populate][team_players][populate]=user_id&populate[matches][populate]=tournament_id&populate[ranking][populate]=season&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=10`;
    const { data: historiesJson, isLoading: historiesLoading, error: historiesError } = useSWR(
        jwt ? [historiesUrl, jwt] : null,
        fetcher
    );
    const histories: MatchHistory[] = historiesJson?.data ?? [];
    const meta: PaginationMeta | null = historiesJson?.meta?.pagination ?? null;

    // 4. Fetch Ranking Stats
    const rankingUrl = selectedSeason !== "all"
        ? `${STRAPI_BASE_URL}/api/rankings?filters[user_id][id]=${userId}&filters[season][documentId][$eq]=${selectedSeason}`
        : `${STRAPI_BASE_URL}/api/rankings?filters[user_id][id]=${userId}&sort=createdAt:desc&pagination[pageSize]=1`;
        
    const { data: rankingJson, isLoading: rankingLoading } = useSWR(
        jwt ? [rankingUrl, jwt] : null,
        fetcher
    );
    const rankingStats: RankingStats | null = rankingJson?.data?.[0] ?? null;

    // 5. Fetch Analytics Data
    const analyticsUrl = selectedSeason !== "all"
        ? `${STRAPI_BASE_URL}/api/match-histories/analytics?userId=${userId}&seasonId=${selectedSeason}`
        : `${STRAPI_BASE_URL}/api/match-histories/analytics?userId=${userId}`;

    const { data: analyticsJson, isLoading: analyticsLoading } = useSWR(
        jwt ? [analyticsUrl, jwt] : null,
        fetcher
    );
    const analyticsData: AnalyticsData | null = analyticsJson?.data ?? null;

    const loading = seasonsLoading || userLoading || historiesLoading || rankingLoading || analyticsLoading;
    const error = historiesError ? historiesError.message : null;

    return {
        user,
        jwt,
        targetUser: targetUser || null,
        histories,
        loading,
        error,
        page,
        setPage,
        meta,
        seasons,
        selectedSeason,
        setSelectedSeason,
        rankingStats,
        analyticsData
    };
}
