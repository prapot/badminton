import { useState } from "react";
import Swal from "sweetalert2";
import { TournamentInfo, ApiMatch } from "@/features/tournaments/types";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface ScoringProps {
    id: string;
    jwt: string | null;
    tournamentInfo: TournamentInfo | null;
    setTournamentInfo: React.Dispatch<React.SetStateAction<TournamentInfo | null>>;
    apiMatches: ApiMatch[];
    refreshInfo: () => Promise<any>;
    showToast: (msg: string, type?: "success" | "error") => void;
}

export function useTournamentScoring({
    id, jwt, tournamentInfo, setTournamentInfo, apiMatches, refreshInfo, showToast
}: ScoringProps) {
    const [scoreEditing, setScoreEditing] = useState<ApiMatch | null>(null);
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [savingScore, setSavingScore] = useState(false);

    const handleCancelMatch = async () => {
        if (!jwt || !scoreEditing || savingScore) return;

        const result = await Swal.fire({
            title: "ยืนยันการยกเลิกแมตซ์?",
            text: "หากยกเลิกแล้ว แมตซ์นี้จะไม่ถูกนำมาคำนวณคะแนนและไม่สามารถกู้คืนได้ (ต้องสุ่มใหม่)",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "🚫 ยืนยันยกเลิก",
            cancelButtonText: "ย้อนกลับ",
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#64748b",
            background: "#1a2535",
            color: "#f1f5f9",
        });

        if (!result.isConfirmed) return;

        setSavingScore(true);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/matches/${scoreEditing.documentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({
                    data: {
                        match_status: "cancelled",
                    }
                }),
            });
            if (!res.ok) throw new Error("ยกเลิกแมตซ์ไม่สำเร็จ");

            showToast("ยกเลิกแมตซ์เรียบร้อย 🚫", "success");
            setScoreEditing(null);
            refreshInfo();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "ยกเลิกไม่สำเร็จ", "error");
        } finally {
            setSavingScore(false);
        }
    };

    const handleSaveScore = async () => {
        if (!jwt || !scoreEditing || savingScore) return;
        setSavingScore(true);
        try {
            const winnerTeamId = scoreA > scoreB
                ? scoreEditing.team_a_id?.documentId ?? null
                : scoreA < scoreB
                    ? scoreEditing.team_b_id?.documentId ?? null
                    : null;
            const res = await fetch(`${STRAPI_BASE_URL}/api/matches/${scoreEditing.documentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({
                    data: {
                        score_a: scoreA,
                        score_b: scoreB,
                        match_status: "done",
                        team_winner: winnerTeamId,
                    }
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }

            // Check if all matches (including this one just updated) are done
            const isLastMatch = apiMatches.filter(m => m.match_status !== "done" && m.id !== scoreEditing.id).length === 0;

            if (isLastMatch && tournamentInfo?.tournament_status !== "completed" && tournamentInfo?.format !== "endless_mode") {
                await fetch(`${STRAPI_BASE_URL}/api/tournaments/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                    body: JSON.stringify({ data: { tournament_status: "completed" } }),
                });
                setTournamentInfo(prev => prev ? { ...prev, tournament_status: "completed" } : null);
                showToast("บันทึกสำเร็จ และจบการแข่งขันทั้งหมดแล้ว! 🎉", "success");
            } else {
                showToast("บันทึกคะแนนสำเร็จเรียบร้อย ✅", "success");
            }

            setScoreEditing(null);
            refreshInfo();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ", "error");
        } finally {
            setSavingScore(false);
        }
    };

    return {
        scoreEditing, setScoreEditing,
        scoreA, setScoreA,
        scoreB, setScoreB,
        savingScore,
        handleCancelMatch, handleSaveScore
    };
}
