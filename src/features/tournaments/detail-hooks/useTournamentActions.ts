import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { TournamentInfo, ApiMatch, User } from "@/features/tournaments/types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface ActionsProps {
    id: string;
    jwt: string | null;
    user: User | null;
    tournamentInfo: TournamentInfo | null;
    setTournamentInfo: React.Dispatch<React.SetStateAction<TournamentInfo | null>>;
    apiMatches: ApiMatch[];
    pausedPlayerIds: Set<number>;
    playerMatchCounts: Record<number, number>;
    refreshInfo: () => Promise<any>;
    fetchMatches: () => Promise<any>;
    showToast: (msg: string, type?: "success" | "error") => void;
}

export function useTournamentActions({
    id, jwt, user, tournamentInfo, setTournamentInfo, apiMatches, 
    pausedPlayerIds, playerMatchCounts, refreshInfo, fetchMatches, showToast
}: ActionsProps) {
    const router = useRouter();
    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [starting, setStarting] = useState(false);
    const [startStep, setStartStep] = useState<string | null>(null);

    const isJoined = tournamentInfo?.players.some((p) => p.id === user?.id) ?? false;
    const myEntry = tournamentInfo?.players.find((p) => p.id === user?.id);

    const handleJoin = async () => {
        const isEndless = tournamentInfo?.format === "endless_mode";
        const isOngoing = tournamentInfo?.tournament_status === "ongoing";
        const canJoin = tournamentInfo?.tournament_status === "upcoming" || (isEndless && isOngoing);
        
        if (!jwt || !user || joining || !canJoin) return;
        
        if (tournamentInfo.players.some(p => p.id === user.id)) {
            showToast("คุณเข้าร่วมการแข่งขันนี้แล้ว", "error");
            return;
        }

        let matchOffset = 0;
        if (isEndless && isOngoing) {
            const activeCounts = (tournamentInfo?.players ?? [])
                .filter(p => !pausedPlayerIds.has(p.id))
                .map(p => playerMatchCounts[p.id] ?? 0);
            if (activeCounts.length > 0) {
                matchOffset = Math.max(...activeCounts);
            }
        }

        setJoining(true);
        try {
            const body: Record<string, unknown> = { tournament_id: id, user: user.id, seed: null };
            if (matchOffset > 0) body.match_offset = matchOffset;

            const res = await fetch(`${STRAPI_BASE_URL}/api/tournament-players`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ data: body }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }
            showToast(matchOffset > 0 ? `เข้าร่วมสำเร็จ! เริ่มที่ ${matchOffset} แมตซ์ 🏸` : "เข้าร่วมสำเร็จ! 🏈", "success");
            refreshInfo();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "เข้าร่วมไม่สำเร็จ", "error");
        } finally {
            setJoining(false);
        }
    };

    const handleLeave = async () => {
        const isEndless = tournamentInfo?.format === "endless_mode";
        const canLeave = tournamentInfo?.tournament_status === "upcoming" || (isEndless && tournamentInfo?.tournament_status === "ongoing");
        if (!jwt || !myEntry || leaving || !canLeave) return;
        
        setLeaving(true);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournament-players/${myEntry.tpDocumentId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${jwt}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }
            showToast("ออกจากรายการแล้ว", "success");
            refreshInfo();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "ออกไม่สำเร็จ", "error");
        } finally {
            setLeaving(false);
        }
    };

    const handleDelete = async () => {
        if (!jwt) return;
        setDeleting(true);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournaments/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${jwt}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }
            showToast("ลบทัวร์นาเมนต์สำเร็จ", "success");
            setTimeout(() => router.push("/tournament"), 1500);
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "ลบไม่สำเร็จ", "error");
            setDeleting(false);
        }
        setConfirmDelete(false);
    };

    const handleFinishTournament = async () => {
        if (!jwt || !tournamentInfo || !user?.id || Number(tournamentInfo.user_created?.id) !== Number(user?.id)) return;

        const unfinishedMatches = apiMatches.filter(m => m.match_status !== 'done' && m.match_status !== 'cancelled');

        const result = await Swal.fire({
            title: "ยืนยันจบการแข่งขัน?",
            html: `สถานะทัวร์นาเมนต์จะเปลี่ยนเป็น <b>จบการแข่งขัน</b>${unfinishedMatches.length > 0 ? `<br/><span style="color:#ef4444;font-size:12px">ตรวจพบ ${unfinishedMatches.length} แมตซ์ที่ยังไม่เสร็จ ซึ่งจะถูกยกเลิกทั้งหมด</span>` : ""}`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "🏁 จบการแข่งขัน",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#3498db",
            cancelButtonColor: "#64748b",
            background: "#1a2535",
            color: "#f1f5f9",
        });

        if (!result.isConfirmed) return;

        setStarting(true);
        setStartStep("กำลังจบการแข่งขัน...");

        try {
            for (const match of unfinishedMatches) {
                await fetch(`${STRAPI_BASE_URL}/api/matches/${match.documentId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                    body: JSON.stringify({ data: { match_status: "cancelled" } }),
                });
            }

            const res = await fetch(`${STRAPI_BASE_URL}/api/tournaments/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ data: { tournament_status: "completed" } }),
            });

            if (!res.ok) throw new Error("ไม่สามารถเปลี่ยนสถานะทัวร์นาเมนต์ได้");

            showToast("จบการแข่งขันเรียบร้อยแล้ว! 🎉", "success");
            setTournamentInfo(prev => prev ? { ...prev, tournament_status: "completed" } : null);
            fetchMatches();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ", "error");
        } finally {
            setStarting(false);
            setStartStep(null);
        }
    };

    return {
        joining, leaving, isJoined,
        confirmDelete, setConfirmDelete, deleting,
        starting, setStarting, startStep, setStartStep,
        handleJoin, handleLeave, handleDelete, handleFinishTournament
    };
}
