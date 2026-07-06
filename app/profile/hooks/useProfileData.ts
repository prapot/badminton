import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { UserRankingStats } from "../types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

export function useProfileData() {
    const { user, jwt } = useAuth();
    
    const [userRanking, setUserRanking] = useState<UserRankingStats | null>(null);
    const [loadingRank, setLoadingRank] = useState(true);
    const [initialPictureUrl, setInitialPictureUrl] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            if (user.picture?.url) {
                setInitialPictureUrl(user.picture.url.startsWith("http") ? user.picture.url : `${STRAPI_BASE_URL}${user.picture.url}`);
            }

            // Fetch ranking data for CURRENT ACTIVE SEASON
            const fetchRanking = async () => {
                try {
                    const res = await fetch(`${STRAPI_BASE_URL}/api/rankings?filters[user_id]=${user.id}&filters[season][is_active]=true&populate=*`, {
                        headers: { Authorization: `Bearer ${jwt}` }
                    });
                    const data = await res.json();
                    if (data.data && data.data.length > 0) {
                        setUserRanking(data.data[0]);
                    } else {
                        // Fallback if no active season ranking exists yet
                        setUserRanking({ rank: "Bronze V", stars: 0, ranking_points: 0, win: 0, lose: 0 });
                    }
                } catch (err) {
                    console.error("Failed to fetch ranking", err);
                } finally {
                    setLoadingRank(false);
                }
            };
            fetchRanking();
        }
    }, [user, jwt]);

    return {
        user,
        jwt,
        userRanking,
        loadingRank,
        initialPictureUrl
    };
}
