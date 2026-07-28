import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { ListTournament, TournamentStatus, PaginationMeta } from "@/app/tournament/TournamentTypes";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

export function useTournamentList() {
    const { user, jwt } = useAuth();

    const [filter, setFilter] = useState<"all" | TournamentStatus>("all");
    const [tournaments, setTournaments] = useState<ListTournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joiningId, setJoiningId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [search, setSearch] = useState("");

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchTournaments = async (pageNum: number = 1, currentFilter: string = filter) => {
        if (!jwt || !user) return;
        setLoading(true);
        try {
            const filterQuery = currentFilter !== "all" ? `&filters[tournament_status][$eq]=${currentFilter}` : "";
            const searchQuery = search ? `&filters[name][$containsi]=${search}` : "";
            const res = await fetch(
                `${STRAPI_BASE_URL}/api/tournaments?populate[tournament_players][populate]=user&populate[user_created][populate]=picture&sort=createdAt:desc&pagination[page]=${pageNum}&pagination[pageSize]=10&pagination[withCount]=true${filterQuery}${searchQuery}`,
                { headers: { Authorization: `Bearer ${jwt}` } }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setMeta(json.meta.pagination);

            const items: ListTournament[] = (json.data ?? []).map((item: any) => {
                const players = item.tournament_players ?? [];
                return {
                    id: item.id,
                    documentId: item.documentId,
                    name: item.name ?? "",
                    type: item.type ?? "single",
                    format: item.format ?? "endless_mode",
                    tournament_status: item.tournament_status ?? "upcoming",
                    startDate: item.startDate ?? "",
                    createdAt: item.createdAt ?? "",
                    playerCount: players.length,
                    isJoined: players.some((p: any) => p.user?.id === user.id),
                    mode: item.mode ?? "ranking",
                    user_created: item.user_created,
                };
            });
            setTournaments(items);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTournaments(page, filter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jwt, page, filter]);

    const handleJoin = async (tournamentId: string, isJoined: boolean) => {
        if (!jwt || !user) return;

        // Guard: already joined
        if (isJoined) {
            showToast("คุณเข้าร่วมรายการนี้แล้ว", "error");
            return;
        }
        setJoiningId(tournamentId);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournament-players`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                    data: {
                        tournament_id: tournamentId,
                        user: user.id,
                        seed: null,
                    },
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const msg = err?.error?.message || `HTTP ${res.status}`;
                if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
                    showToast("คุณเข้าร่วมรายการนี้แล้ว", "error");
                } else {
                    showToast(msg, "error");
                }
                return;
            }
            await fetchTournaments(page, filter);
            showToast("เข้าร่วมรายการสำเร็จแล้ว! 🏈", "success");
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "เข้าร่วมไม่สำเร็จ", "error");
        } finally {
            setJoiningId(null);
        }
    };

    return {
        user,
        filter,
        setFilter,
        tournaments,
        loading,
        error,
        joiningId,
        toast,
        page,
        setPage,
        meta,
        search,
        setSearch,
        fetchTournaments,
        handleJoin
    };
}
