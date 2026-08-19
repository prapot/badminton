import { useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/features/auth/useAuth";
import { ListTournament, TournamentStatus, PaginationMeta } from "@/features/tournaments/types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

const fetcher = async ([url, token]: [string, string]) => {
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
};

export function useTournamentList() {
    const { user, jwt } = useAuth();

    const [filter, setFilter] = useState<"all" | TournamentStatus>("all");
    const [joiningId, setJoiningId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const filterQuery = filter !== "all" ? `&filters[tournament_status][$eq]=${filter}` : "";
    const searchQuery = search ? `&filters[name][$containsi]=${search}` : "";
    const url = `${STRAPI_BASE_URL}/api/tournaments?populate[tournament_players][populate]=user&populate[user_created][populate]=picture&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=10&pagination[withCount]=true${filterQuery}${searchQuery}`;

    const { data, error, mutate, isLoading, isValidating } = useSWR(
        (jwt && user) ? [url, jwt] : null,
        fetcher,
        {
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        }
    );

    const meta: PaginationMeta | null = data?.meta?.pagination ?? null;

    const tournaments: ListTournament[] = (data?.data ?? []).map((item: any) => {
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
            isJoined: players.some((p: any) => p.user?.id === user?.id),
            mode: item.mode ?? "ranking",
            user_created: item.user_created,
        };
    });

    const loading = isLoading || (!data && !error && !!jwt);

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
            await mutate(); // Re-fetch SWR data
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
        error: error ? error.message : null,
        joiningId,
        toast,
        page,
        setPage,
        meta,
        search,
        setSearch,
        fetchTournaments: mutate,
        handleJoin
    };
}
