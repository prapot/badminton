import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/useAuth";
import { MatchHistory, PaginationMeta, TargetUser, ApiSeason, RankingStats, AnalyticsData } from "../types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

export function useHistoryData(userId: string) {
    const { user, jwt } = useAuth();

    const [targetUser, setTargetUser] = useState<TargetUser | null>(null);
    const [histories, setHistories] = useState<MatchHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [seasons, setSeasons] = useState<ApiSeason[]>([]);
    const [selectedSeason, setSelectedSeason] = useState<string>("all");
    const [rankingStats, setRankingStats] = useState<RankingStats | null>(null);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

    const fetchData = useCallback(async (pageNum: number = 1) => {
        if (!jwt) return;
        setLoading(true);
        try {
            // 1. Fetch target user info (only once)
            if (!targetUser) {
                const userRes = await fetch(`${STRAPI_BASE_URL}/api/users/${userId}?populate=picture`, {
                    headers: { Authorization: `Bearer ${jwt}` }
                });
                if (!userRes.ok) throw new Error("ไม่พบข้อมูลผู้ใช้");
                const userData = await userRes.json();
                setTargetUser(userData);
            }

            // 2. Fetch match histories (No season filter)
            let url = `${STRAPI_BASE_URL}/api/match-histories?filters[users][id]=${userId}&populate[matches][populate][team_a_id][populate][team_players][populate]=user_id&populate[matches][populate][team_b_id][populate][team_players][populate]=user_id&populate[matches][populate]=tournament_id&populate[ranking][populate]=season&sort=createdAt:desc&pagination[page]=${pageNum}&pagination[pageSize]=10`;

            // 3. Fetch ranking stats for summary
            let rankingUrl = `${STRAPI_BASE_URL}/api/rankings?filters[user_id][id]=${userId}`;
            if (selectedSeason !== "all") {
                rankingUrl += `&filters[season][documentId][$eq]=${selectedSeason}`;
            } else {
                rankingUrl += `&sort=createdAt:desc&pagination[pageSize]=1`;
            }

            // 4. Fetch Analytics Data
            let analyticsUrl = `${STRAPI_BASE_URL}/api/match-histories/analytics?userId=${userId}`;
            if (selectedSeason !== "all") {
                analyticsUrl += `&seasonId=${selectedSeason}`;
            }

            // Execute all fetches in parallel
            const [historyRes, rankingRes, analyticsRes] = await Promise.all([
                fetch(url, { headers: { Authorization: `Bearer ${jwt}` } }),
                fetch(rankingUrl, { headers: { Authorization: `Bearer ${jwt}` } }),
                fetch(analyticsUrl, { headers: { Authorization: `Bearer ${jwt}` } })
            ]);

            if (!historyRes.ok) throw new Error("ไม่สามารถโหลดประวัติได้");
            const historyData = await historyRes.json();
            setHistories(historyData.data || []);
            setMeta(historyData.meta.pagination);

            if (rankingRes.ok) {
                const rData = await rankingRes.json();
                setRankingStats(rData.data?.[0] || null);
            }

            if (analyticsRes.ok) {
                const aData = await analyticsRes.json();
                setAnalyticsData(aData.data || null);
            }

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [userId, jwt, targetUser, selectedSeason]);

    useEffect(() => {
        if (!jwt) return;
        fetch(`${STRAPI_BASE_URL}/api/seasons?sort=createdAt:desc`, {
            headers: { Authorization: `Bearer ${jwt}` }
        })
            .then(r => r.json())
            .then(json => {
                const data = json.data || [];
                setSeasons(data);

                // Default to the active season
                const activeSeason = data.find((s: ApiSeason) => s.is_active);
                if (activeSeason) {
                    setSelectedSeason(activeSeason.documentId);
                }
            });
    }, [jwt]);

    useEffect(() => {
        fetchData(page);
    }, [page, jwt, userId, selectedSeason, fetchData]);

    return {
        user,
        jwt,
        targetUser,
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
