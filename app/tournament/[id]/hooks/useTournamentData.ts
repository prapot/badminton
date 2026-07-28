import { useState, useEffect, useMemo } from "react";
import { TournamentInfo, ApiMatch, RegisteredPlayer } from "@/app/tournament/TournamentTypes";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

export function useTournamentData(id: string, jwt: string | null) {
    const [tournamentInfo, setTournamentInfo] = useState<TournamentInfo | null>(null);
    const [apiMatches, setApiMatches] = useState<ApiMatch[]>([]);
    const [pausedPlayerIds, setPausedPlayerIds] = useState<Set<number>>(new Set());

    const fetchMatches = (token = jwt, formatArg?: string) => {
        if (!token || !id) return Promise.resolve();
        const fmt = formatArg || tournamentInfo?.format;
        const sortOrder = fmt === "endless_mode" ? "desc" : "asc";
        return fetch(
            `${STRAPI_BASE_URL}/api/matches?filters[tournament_id][documentId][$eq]=${id}&populate[team_a_id][populate][team_players][populate][user_id][populate][rankings][filters][season][is_active][$eq]=true&populate[team_a_id][populate][team_players][populate][user_id][populate][picture][fields][0]=url&populate[team_b_id][populate][team_players][populate][user_id][populate][rankings][filters][season][is_active][$eq]=true&populate[team_b_id][populate][team_players][populate][user_id][populate][picture][fields][0]=url&populate[match_histories][populate][users][fields]=*&populate[team_winner][fields][0]=id&populate[team_winner][fields][1]=documentId&sort=match_no:${sortOrder}&pagination[pageSize]=100`,
            { headers: { Authorization: `Bearer ${token}` } }
        )
            .then((r) => r.json())
            .then((json) => setApiMatches(json.data ?? []))
            .catch(() => { /* silent */ });
    };

    useEffect(() => {
        if (!jwt || !id) return;
        fetch(
            `${STRAPI_BASE_URL}/api/tournaments/${id}?populate[tournament_players][populate][user][populate][picture][fields][0]=url&populate[tournament_players][populate][user][populate][rankings][filters][season][is_active][$eq]=true&populate[user_created][populate][picture][fields][0]=url&populate[user_created][populate][rankings][filters][season][is_active][$eq]=true`,
            { headers: { Authorization: `Bearer ${jwt}` } }
        )
            .then((r) => r.json())
            .then((json) => {
                const data = json.data ?? json;
                const tpArr: Array<{ documentId?: string; id?: number | string; is_paused?: boolean; match_offset?: number; guest_name?: string; user?: Omit<RegisteredPlayer, "tpDocumentId" | "is_paused" | "match_offset"> }> = data.tournament_players ?? [];
                setTournamentInfo({
                    name: data.name ?? "",
                    tournament_status: data.tournament_status ?? "upcoming",
                    type: data.type ?? "single",
                    format: data.format ?? "endless_mode",
                    startDate: data.startDate ?? "",
                    mode: data.mode ?? "ranking",
                    players: tpArr
                        .filter((tp) => !!tp.user || !!tp.guest_name)
                        .reduce((acc, current) => {
                            if (current.user) {
                                const x = acc.find(item => item.id === current.user!.id);
                                if (!x) {
                                    return acc.concat([{ ...current.user!, tpDocumentId: String(current.documentId || current.id || ""), is_paused: current.is_paused || false, match_offset: current.match_offset || 0 }]);
                                }
                            } else if (current.guest_name) {
                                const fauxId = -(Number(current.id) || Math.floor(Math.random() * 10000));
                                return acc.concat([{ id: fauxId, username: current.guest_name, email: "", tpDocumentId: String(current.documentId || current.id || ""), is_paused: current.is_paused || false, match_offset: current.match_offset || 0, is_guest: true, guest_name: current.guest_name }]);
                            }
                            return acc;
                        }, [] as RegisteredPlayer[]),
                    permanent_teams: data.permanent_teams || [],
                    user_created: data.user_created ? { id: data.user_created.id || data.user_created } : (data.user_id ? { id: data.user_id } : null),
                });
            })
            .catch(() => { /* silent */ });
    }, [jwt, id]);

    // Auto-fetch matches when tournament is ongoing/completed
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (tournamentInfo?.tournament_status === 'ongoing' || tournamentInfo?.tournament_status === 'completed') {
            fetchMatches();
            interval = setInterval(() => {
                fetchMatches();
            }, 7000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tournamentInfo?.tournament_status]);

    const refreshInfo = () => {
        if (!jwt || !id) return Promise.resolve();
        return fetch(
            `${STRAPI_BASE_URL}/api/tournaments/${id}?populate[tournament_players][populate][user][populate][picture][fields][0]=url&populate[tournament_players][populate][user][populate][rankings][filters][season][is_active][$eq]=true&populate[user_created][populate][picture][fields][0]=url&populate[user_created][populate][rankings][filters][season][is_active][$eq]=true`,
            { headers: { Authorization: `Bearer ${jwt}` } }
        )
            .then((r) => r.json())
            .then((json) => {
                const data = json.data ?? json;
                const tpArr: Array<{ documentId?: string; id?: number | string; is_paused?: boolean; match_offset?: number; guest_name?: string; user?: Omit<RegisteredPlayer, "tpDocumentId" | "is_paused" | "match_offset"> }> = data.tournament_players ?? [];
                setTournamentInfo((prev) => prev ? {
                    ...prev,
                    startDate: data.startDate ?? prev.startDate,
                    mode: data.mode ?? prev.mode,
                    players: tpArr
                        .filter((tp) => !!tp.user || !!tp.guest_name)
                        .reduce((acc, current) => {
                            if (current.user) {
                                const x = acc.find(item => item.id === current.user!.id);
                                if (!x) {
                                    return acc.concat([{ ...current.user!, tpDocumentId: String(current.documentId || current.id || ""), is_paused: current.is_paused || false, match_offset: current.match_offset || 0 }]);
                                }
                            } else if (current.guest_name) {
                                const fauxId = -(Number(current.id) || Math.floor(Math.random() * 10000));
                                return acc.concat([{ id: fauxId, username: current.guest_name, email: "", tpDocumentId: String(current.documentId || current.id || ""), is_paused: current.is_paused || false, match_offset: current.match_offset || 0, is_guest: true, guest_name: current.guest_name }]);
                            }
                            return acc;
                        }, [] as RegisteredPlayer[]),
                    permanent_teams: data.permanent_teams || [],
                    user_created: data.user_created ? { id: data.user_created.id || data.user_created } : (data.user_id ? { id: data.user_id } : null),
                } : null);
                // Also refresh matches correctly
                return fetchMatches(jwt, data.format);
            })
            .catch(() => { /* silent */ });
    };

    // Sync paused state from DB
    useEffect(() => {
        if (tournamentInfo?.players) {
            const paused = new Set<number>();
            tournamentInfo.players.forEach(p => {
                if (p.is_paused) paused.add(p.id);
            });
            setPausedPlayerIds(paused);
        }
    }, [tournamentInfo?.players]);

    const playerMatchCounts = useMemo(() => {
        const counts: Record<number, number> = {};

        // Add manual offsets first
        tournamentInfo?.players.forEach(p => {
            counts[p.id] = p.match_offset || 0;
        });

        // Count only matches that are completed (scored)
        apiMatches.forEach(match => {
            if (match.match_status !== "done") return;
            [match.team_a_id, match.team_b_id].forEach(team => {
                team?.team_players.forEach((tp: any) => {
                    if (tp.user_id) {
                        counts[tp.user_id.id] = (counts[tp.user_id.id] || 0) + 1;
                    } else if (tp.guest_name) {
                        const fauxUser = tournamentInfo?.players.find(p => p.guest_name === tp.guest_name && p.is_guest);
                        if (fauxUser) {
                            counts[fauxUser.id] = (counts[fauxUser.id] || 0) + 1;
                        }
                    }
                });
            });
        });

        if (tournamentInfo?.format === "endless_mode") {
            const played = Object.values(counts).filter(c => c > 0).sort((a, b) => a - b);
            if (played.length > 0) {
                // Find true minimum of the main group
                const median = played[Math.floor(played.length / 2)];
                const mainGroup = played.filter(c => c >= median - 1);
                const trueMin = mainGroup.length > 0 ? Math.min(...mainGroup) : median;

                Object.keys(counts).forEach(idStr => {
                    const pid = Number(idStr);
                    if ((counts[pid] || 0) < trueMin) {
                        counts[pid] = trueMin;
                    }
                });
            }
        }

        return counts;
    }, [apiMatches, tournamentInfo]);

    return {
        tournamentInfo, setTournamentInfo,
        apiMatches,
        playerMatchCounts,
        pausedPlayerIds, setPausedPlayerIds,
        fetchMatches, refreshInfo
    };
}
