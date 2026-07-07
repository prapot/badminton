import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { ApiSeason, TRanking, ApiUser, PlayerRow } from "@/app/ranking/types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

export function useRankingData() {
    const { jwt, user } = useAuth();
    const [allPlayers, setAllPlayers] = useState<PlayerRow[]>([]);
    const [seasons, setSeasons] = useState<ApiSeason[]>([]);
    const [selectedSeason, setSelectedSeason] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (jwt) {
            fetchSeasons();
        }
    }, [jwt]);

    useEffect(() => {
        if (jwt) fetchAllData();
    }, [jwt, selectedSeason]);

    const fetchSeasons = async () => {
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/seasons?sort=createdAt:desc`, {
                headers: { Authorization: `Bearer ${jwt}` },
                cache: 'no-store'
            });
            if (res.ok) {
                const json = await res.json();
                const data: ApiSeason[] = json.data ?? [];
                setSeasons(data);

                const now = new Date();
                const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const activeSeasons = data.filter(s => s.is_active);

                const currentMonthSeason = activeSeasons.find(s => s.name.includes(currentMonthKey));
                const newestActive = activeSeasons[0];
                const fallback = data[0];

                const defaultSeason = currentMonthSeason ?? newestActive ?? fallback;
                if (defaultSeason) {
                    setSelectedSeason(defaultSeason.documentId);
                }
            }
        } catch (err) {
            console.error("Fetch seasons error:", err);
        }
    }

    const fetchAllData = async () => {
        setLoading(true);
        try {
            if (!selectedSeason && seasons.length > 0) return;

            let url = `${STRAPI_BASE_URL}/api/rankings?populate[user_id][populate][0]=picture&sort[0]=ranking_points:desc&pagination[pageSize]=1000`;

            if (selectedSeason) {
                url += `&filters[season][documentId][$eq]=${selectedSeason}`;
            } else {
                url += `&filters[season][is_active][$eq]=true`;
            }

            const rankingsRes = await fetch(url, {
                headers: { Authorization: `Bearer ${jwt}` },
                cache: 'no-store'
            });

            if (!rankingsRes.ok) throw new Error("ไม่สามารถโหลดอันดับได้");
            const rankingsJson = await rankingsRes.json();
            const rankingsData: TRanking[] = rankingsJson.data ?? [];

            const usersRes = await fetch(
                `${STRAPI_BASE_URL}/api/users?populate=picture`,
                { headers: { Authorization: `Bearer ${jwt}` } }
            );
            if (!usersRes.ok) throw new Error("ไม่สามารถโหลดผู้ใช้ได้");
            const usersData: ApiUser[] = await usersRes.json();

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

            usersData.forEach(u => {
                if (!rankedUserIds.has(u.id)) {
                    merged.push({
                        userId: u.id,
                        username: u.username,
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
                    // 1. คะแนนเป็นหลัก (Ranking Points)
                    if (a.ranking_points !== b.ranking_points) return b.ranking_points - a.ranking_points;

                    // 2. จำนวนครั้งที่ชนะ (Total Wins)
                    if (a.win !== b.win) return b.win - a.win;

                    // 3. อัตราการชนะ (Win Rate)
                    const wrA = a.match_played > 0 ? a.win / a.match_played : 0;
                    const wrB = b.match_played > 0 ? b.win / b.match_played : 0;
                    if (wrA !== wrB) return wrB - wrA;

                    // 4. ชนะต่อเนื่อง (Win Streak)
                    if (a.win_streak !== b.win_streak) return b.win_streak - a.win_streak;
                    
                    // 5. จำนวนแมตช์ที่เล่น (Match Played) - ใครเล่นน้อยกว่า ถือว่าประสิทธิภาพดีกว่า
                    if (a.match_played !== b.match_played) return a.match_played - b.match_played;
                }

                return a.username.localeCompare(b.username);
            });

            setAllPlayers(merged);
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    return {
        user,
        loading,
        seasons,
        selectedSeason,
        setSelectedSeason,
        allPlayers
    };
}
