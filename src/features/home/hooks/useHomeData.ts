import { useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/features/auth/useAuth";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

export const getTHDateStr = (date: Date) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Fetch error");
  return res.json();
};

export function useHomeData() {
  const { user, jwt } = useAuth();
  
  const { todayDateStr, tomorrowDateStr, in5DaysStr } = useMemo(() => {
    const now = new Date();
    const todayDateStr = getTHDateStr(now);
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = getTHDateStr(tomorrow);
    
    const in5Days = new Date(now);
    in5Days.setDate(in5Days.getDate() + 6);
    const in5DaysStr = getTHDateStr(in5Days);
    
    return { todayDateStr, tomorrowDateStr, in5DaysStr };
  }, []);

  const urlUsersCount = `${STRAPI_BASE_URL}/api/users/count`;
  const urlToday = `${STRAPI_BASE_URL}/api/tournaments?filters[$or][0][startDate]=${todayDateStr}&filters[$or][1][tournament_status]=ongoing&populate[matches][populate][team_a_id][populate][team_players][populate]=user_id&populate[matches][populate][team_b_id][populate][team_players][populate]=user_id&populate[tournament_players][count]=true&populate[user_created][populate]=picture`;
  const urlUpcoming = `${STRAPI_BASE_URL}/api/tournaments?filters[startDate][$gte]=${tomorrowDateStr}&filters[startDate][$lt]=${in5DaysStr}&sort[0]=startDate:asc&populate[tournament_players][count]=true&populate[user_created][populate]=picture`;

  const { data: usersCountData, isLoading: loadingUsers } = useSWR(jwt ? [urlUsersCount, jwt] : null, fetcher);
  const { data: todayTourneysData, isLoading: loadingToday } = useSWR(jwt ? [urlToday, jwt] : null, fetcher);
  const { data: upcomingTourneysData, isLoading: loadingUpcoming } = useSWR(jwt ? [urlUpcoming, jwt] : null, fetcher);

  const membersCount = typeof usersCountData === "number" ? usersCountData : 0;
  
  const todayTournaments = useMemo(() => {
    return (todayTourneysData?.data || []).map((t: any) => ({
      ...t,
      tournament_players_count: t.tournament_players?.count || 0
    }));
  }, [todayTourneysData]);

  const upcomingDays = useMemo(() => {
    const upcomingItems = (upcomingTourneysData?.data || []).map((t: any) => ({
      ...t,
      tournament_players_count: t.tournament_players?.count || 0
    }));

    const now = new Date();
    const days = [];
    for (let i = 1; i < 6; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dStr = getTHDateStr(d);

      const dayTourneys = upcomingItems.filter((t: any) => t.startDate === dStr);
      if (dayTourneys.length > 0) {
        days.push({
          date: dStr,
          label: i === 1 ? "พรุ่งนี้" : d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' }),
          items: dayTourneys.map((t: any) => ({ ...t, kind: 'tournament' }))
        });
      }
    }
    return days;
  }, [upcomingTourneysData]);

  const loading = loadingUsers || loadingToday || loadingUpcoming;

  return {
    user,
    membersCount,
    todayTournaments,
    upcomingDays,
    loading,
    STRAPI_BASE_URL
  };
}
