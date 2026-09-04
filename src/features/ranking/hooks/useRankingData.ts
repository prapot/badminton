import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/features/auth/useAuth";
import { ApiSeason, TRanking, ApiUser, PlayerRow } from "@/features/ranking/types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

const fetcher = async ([url, token]: [string, string]) => {
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
};

export function useRankingData() {
    const { jwt, user } = useAuth();
    const [selectedSeason, setSelectedSeason] = useState<string>("");

    const { data: seasonsJson, isLoading: seasonsLoading } = useSWR(
        jwt ? [`${STRAPI_BASE_URL}/api/seasons?sort=createdAt:desc`, jwt] : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const seasons: ApiSeason[] = seasonsJson?.data ?? [];

    useEffect(() => {
        if (seasons.length > 0 && !selectedSeason) {
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const activeSeasons = seasons.filter(s => s.is_active);

            const currentMonthSeason = activeSeasons.find(s => s.name.includes(currentMonthKey));
            const newestActive = activeSeasons[0];
            const fallback = seasons[0];

            const defaultSeason = currentMonthSeason ?? newestActive ?? fallback;
            if (defaultSeason) {
                setSelectedSeason(defaultSeason.documentId);
            }
        }
    }, [seasons, selectedSeason]);

    const rankingUrl = selectedSeason
        ? `${STRAPI_BASE_URL}/api/rankings?populate[user_id][populate][0]=picture&sort[0]=ranking_points:desc&pagination[pageSize]=1000&filters[season][documentId][$eq]=${selectedSeason}`
        : null;

    const { data: rankingsJson, isLoading: rankingsLoading } = useSWR(
        jwt && rankingUrl ? [rankingUrl, jwt] : null,
        fetcher
    );

    const { data: usersData, isLoading: usersLoading } = useSWR(
        jwt ? [`${STRAPI_BASE_URL}/api/users?populate=picture`, jwt] : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const allPlayers = useMemo(() => {
        if (!rankingsJson || !usersData) return [];

        const rankingsData: TRanking[] = rankingsJson.data ?? [];
        const users: ApiUser[] = usersData;
        const rankedUserIds = new Set<number>();
        const merged: PlayerRow[] = [];

        rankingsData.forEach((r) => {
            const u = r.user_id;
            if (!u || !u.id) return;
            if (rankedUserIds.has(u.id)) return;

            rankedUserIds.add(u.id);
            merged.push({
                userId: u.id,
                username: u.username || "Unknown",
                nickname: u.nickname,
                email: u.email || "",
                picture: u.picture,
                ranking_points: r.ranking_points,
                win: r.win,
                lose: r.lose,
                win_streak: r.win_streak,
                match_played: r.match_played,
                hasRanking: true,
                rankingId: r.id,
                rankings: [{ rank: r.rank, stars: r.stars, ranking_points: r.ranking_points }]
            });
        });

        users.forEach(u => {
            if (!rankedUserIds.has(u.id)) {
                merged.push({
                    userId: u.id,
                    username: u.username,
                    nickname: u.nickname,
                    email: u.email,
                    picture: u.picture,
                    ranking_points: 0,
                    win: 0,
                    lose: 0,
                    win_streak: 0,
                    match_played: 0,
                    hasRanking: false,
                });
            }
        });

        merged.sort((a, b) => {
            if (a.hasRanking && !b.hasRanking) return -1;
            if (!a.hasRanking && b.hasRanking) return 1;

            if (a.hasRanking && b.hasRanking) {
                if (a.ranking_points !== b.ranking_points) return b.ranking_points - a.ranking_points;
                if (a.win !== b.win) return b.win - a.win;
                const wrA = a.match_played > 0 ? a.win / a.match_played : 0;
                const wrB = b.match_played > 0 ? b.win / b.match_played : 0;
                if (wrA !== wrB) return wrB - wrA;
                if (a.win_streak !== b.win_streak) return b.win_streak - a.win_streak;
                if (a.match_played !== b.match_played) return a.match_played - b.match_played;
            }
            return a.username.localeCompare(b.username);
        });

        return merged;
    }, [rankingsJson, usersData]);

    const loading = seasonsLoading || rankingsLoading || usersLoading || (!selectedSeason && seasons.length > 0);

    return {
        user,
        loading,
        seasons,
        selectedSeason,
        setSelectedSeason,
        allPlayers
    };
}
