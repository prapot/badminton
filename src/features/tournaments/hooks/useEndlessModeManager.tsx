import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";

import { RegisteredPlayer, ApiMatch } from "../types";
import { buildHistory, pickNextMatch, skillScore, Entity } from "../utils/endlessMatchmaking";

export type PairingMode = "auto" | "manual" | "team";

export interface PermanentTeam {
    id: string;
    label: string;
    players: RegisteredPlayer[];
}
 // We will create this

export interface UseEndlessModeManagerProps {
    tournamentId: string;
    tournamentType: "single" | "double";
    players: RegisteredPlayer[];
    permanentTeamsData?: any[];
    blockedPartnersData?: Array<{ blockerId: number; blockedId: number }>;
    apiMatches: ApiMatch[];
    jwt: string;
    STRAPI_BASE_URL: string;
    refreshInfo: () => any;
    showToast: (msg: string, type?: "success" | "error") => void;
    pausedPlayerIds: Set<number>;
    setPausedPlayerIds: React.Dispatch<React.SetStateAction<Set<number>>>;
    tournamentStatus: string;
    userId?: number;
    ownerId?: number;
    tournamentMode: string;
}

export function useEndlessModeManager({
    tournamentId,
    tournamentType,
    players,
    permanentTeamsData,
    blockedPartnersData,
    apiMatches,
    jwt,
    STRAPI_BASE_URL,
    refreshInfo,
    showToast,
    pausedPlayerIds,
    setPausedPlayerIds,
    tournamentStatus,
    userId,
    ownerId,
    tournamentMode
}: UseEndlessModeManagerProps) {

    const [drawing, setDrawing] = useState(false);
    const [pairingMode, setPairingMode] = useState<PairingMode>("auto");
    const [manualTeamA, setManualTeamA] = useState<RegisteredPlayer[]>([]);
    const [manualTeamB, setManualTeamB] = useState<RegisteredPlayer[]>([]);
    const [activeManualTeam, setActiveManualTeam] = useState<"A" | "B">("A");
    const [previewMatch, setPreviewMatch] = useState<{ teamA: RegisteredPlayer[], teamB: RegisteredPlayer[] } | null>(null);
    const [selectedSwapPlayer, setSelectedSwapPlayer] = useState<number | null>(null);
    const [showPlayerList, setShowPlayerList] = useState(false);
    const [optimisticBusy, setOptimisticBusy] = useState<Set<number>>(new Set());

    // ── Permanent teams (persist across draws) ───────────────────────────
    const [permanentTeams, setPermanentTeams] = useState<PermanentTeam[]>(permanentTeamsData || []);

    useEffect(() => {
        if (permanentTeamsData) {
            setPermanentTeams(permanentTeamsData);
        }
    }, [permanentTeamsData]);

    const [selectedForNew, setSelectedForNew] = useState<RegisteredPlayer[]>([]);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null); // team being edited

    const playersPerTeam = tournamentType === "double" ? 2 : 1;

    // ── Compute busy & match counts ───────────────────────────────────────
    const getUnifiedPlayerId = (tp: any) => tp.user_id?.id || (tp.guest_name ? players.find(p => p.guest_name === tp.guest_name)?.id : null);

    const { busyPlayerIds, actualPlayerCounts, effectivePlayerCounts, lastMatchPlayed } = useMemo(() => {
        const actualCounts = new Map<number, number>();
        const busy = new Set<number>();
        const lastPlayed = new Map<number, number>();
        
        players.forEach(p => {
            actualCounts.set(p.id, p.match_offset || 0);
            lastPlayed.set(p.id, -1);
        });

        apiMatches.forEach(m => {
            if (m.match_status === "cancelled") return;
            const pids = [
                ...(m.team_a_id?.team_players?.map(getUnifiedPlayerId) || []),
                ...(m.team_b_id?.team_players?.map(getUnifiedPlayerId) || [])
            ].filter(Boolean) as number[];

            pids.forEach(id => {
                if (actualCounts.has(id)) actualCounts.set(id, actualCounts.get(id)! + 1);
                // Track the highest match_no they played in
                if (!lastPlayed.has(id) || (m.match_no > lastPlayed.get(id)!)) {
                    lastPlayed.set(id, m.match_no);
                }
            });

            if (m.match_status === "live" || m.match_status === "upcoming") {
                pids.forEach(id => busy.add(id));
            }
        });

        const effectiveCounts = new Map(actualCounts);
        const playedCounts = Array.from(actualCounts.values()).filter(c => c > 0).sort((a, b) => a - b);
        if (playedCounts.length > 0) {
            const median = playedCounts[Math.floor(playedCounts.length / 2)];
            const mainGroup = playedCounts.filter(c => c >= median - 1);
            const minPlayed = mainGroup.length > 0 ? Math.min(...mainGroup) : median;

            players.forEach(p => {
                const actual = actualCounts.get(p.id) || 0;
                // ให้ผู้เล่นที่ยังไม่เคยลงเล่นเลย (actual === 0) ได้รับสิทธิ์ลงสนามเป็นคิวแรกเสมอ
                if (actual > 0 && actual < minPlayed) {
                    effectiveCounts.set(p.id, minPlayed);
                }
            });
        }

        return { busyPlayerIds: busy, actualPlayerCounts: actualCounts, effectivePlayerCounts: effectiveCounts, lastMatchPlayed: lastPlayed };
    }, [players, apiMatches]);

    const availablePlayers = useMemo(
        () => players.filter(p => !busyPlayerIds.has(p.id) && !pausedPlayerIds.has(p.id) && !optimisticBusy.has(p.id)),
        [players, busyPlayerIds, pausedPlayerIds, optimisticBusy]
    );

    // Clear optimistic busy state once the backend confirms they are actually busy
    useEffect(() => {
        setOptimisticBusy(prev => {
            if (prev.size === 0) return prev;
            const newSet = new Set(prev);
            for (const id of newSet) {
                if (busyPlayerIds.has(id)) {
                    newSet.delete(id);
                }
            }
            return newSet.size === prev.size ? prev : newSet;
        });
    }, [busyPlayerIds]);

    // Players already assigned to a permanent team
    const assignedPlayerIds = useMemo(
        () => {
            const base = permanentTeams
                .filter(t => t.id !== editingTeamId)
                .flatMap(t => t.players.map(p => p.id));
            return new Set(base);
        },
        [permanentTeams, editingTeamId]
    );

    // Team match counts
    const teamMatchCounts = useMemo(() => {
        const counts = new Map<string, number>();
        permanentTeams.forEach(team => {
            const key = team.players.map(p => p.id).sort().join(",");
            let c = 0;
            apiMatches.forEach(m => {
                if (m.match_status === "cancelled") return;
                [m.team_a_id, m.team_b_id].forEach(t => {
                    if (!t) return;
                    const ids = t.team_players.map(getUnifiedPlayerId).filter(Boolean).sort().join(",");
                    if (ids === key) c++;
                });
            });
            counts.set(team.id, c);
        });
        return counts;
    }, [permanentTeams, apiMatches]);

    const blockedPairsSet = useMemo(() => {
        const set = new Set<string>();
        (blockedPartnersData || []).forEach(bp => {
            const p1 = Number(bp.blockerId);
            const p2 = Number(bp.blockedId);
            if (!isNaN(p1) && !isNaN(p2)) {
                set.add(`${Math.min(p1, p2)}:${Math.max(p1, p2)}`);
            }
        });
        return set;
    }, [blockedPartnersData]);

    const isBlockedTeammates = (p1Id: number, p2Id: number): boolean => {
        return blockedPairsSet.has(`${Math.min(p1Id, p2Id)}:${Math.max(p1Id, p2Id)}`);
    };

    // Invalidate stale previewMatch if it contains blocked teammates
    useEffect(() => {
        if (previewMatch && tournamentType === "double") {
            const isBlockedA = isBlockedTeammates(previewMatch.teamA[0]?.id, previewMatch.teamA[1]?.id);
            const isBlockedB = isBlockedTeammates(previewMatch.teamB[0]?.id, previewMatch.teamB[1]?.id);
            if (isBlockedA || isBlockedB) {
                setPreviewMatch(null);
            }
        }
    }, [blockedPairsSet, previewMatch, tournamentType]);


    const handleTogglePause = async (player: RegisteredPlayer) => {
        if (!player.tpDocumentId) {
            showToast("ไม่สามารถพักผู้เล่นได้: ไม่พบรหัส Tournament Player", "error");
            return;
        }
        const newPaused = new Set(pausedPlayerIds);
        const isNowPaused = !newPaused.has(player.id);

        if (isNowPaused) {
            newPaused.add(player.id);
            showToast(`ให้ ${player.username} พักการเล่น`, "success");
        } else {
            newPaused.delete(player.id);
            showToast(`ให้ ${player.username} กลับมาเล่นแล้ว`, "success");
        }
        setPausedPlayerIds(newPaused);

        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournament-players/${player.tpDocumentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ data: { is_paused: isNowPaused } })
            });
            if (!res.ok) throw new Error("Failed to update status");
            refreshInfo();
        } catch (e: any) {
            showToast(`อัปเดตสถานะไม่สำเร็จ: ${e.message}`, "error");
            const reverted = new Set(pausedPlayerIds);
            setPausedPlayerIds(reverted);
        }
    };

    // ── Team management ────────────────────────────────────────────────────
    const toggleSelectPlayer = (player: RegisteredPlayer) => {
        setSelectedForNew(prev => {
            const exists = prev.some(p => p.id === player.id);
            if (exists) return prev.filter(p => p.id !== player.id);
            if (prev.length >= playersPerTeam) return prev;
            return [...prev, player];
        });
    };

    const saveTeamsToDB = async (teams: PermanentTeam[]) => {
        try {
            const cleanTeams = teams.map(t => ({
                ...t,
                players: t.players.map(p => ({
                    id: p.id,
                    username: p.username,
                    nickname: p.nickname,
                    skill_level: p.skill_level
                }))
            }));
            await fetch(`${STRAPI_BASE_URL}/api/tournaments/${tournamentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ 
                    data: { 
                        permanent_teams: cleanTeams,
                        mode: tournamentMode || "ranking",
                        tournament_players: players.map(p => p.tpDocumentId).filter(Boolean)
                    } 
                })
            });
            refreshInfo();
        } catch (e) {
            showToast("บันทึกทีมไม่สำเร็จ", "error");
        }
    };

    const addOrUpdateTeam = async () => {
        if (selectedForNew.length !== playersPerTeam) return;

        let updated: PermanentTeam[];
        if (editingTeamId) {
            updated = permanentTeams.map(t =>
                t.id === editingTeamId ? { ...t, players: selectedForNew } : t
            );
            setEditingTeamId(null);
        } else {
            const idx = permanentTeams.length;
            const newTeam: PermanentTeam = {
                id: Math.random().toString(36).slice(2),
                label: `ทีม ${idx + 1}`,
                players: selectedForNew,
            };
            updated = [...permanentTeams, newTeam];
        }
        setPermanentTeams(updated);
        setSelectedForNew([]);
        await saveTeamsToDB(updated);
    };

    const startEditTeam = (team: PermanentTeam) => {
        setEditingTeamId(team.id);
        setSelectedForNew([...team.players]);
    };

    const cancelEdit = () => {
        setEditingTeamId(null);
        setSelectedForNew([]);
    };

    const removeTeam = async (id: string) => {
        const filtered = permanentTeams
            .filter(t => t.id !== id)
            .map((t, i) => ({ ...t, label: `ทีม ${i + 1}` }));
        setPermanentTeams(filtered);
        if (editingTeamId === id) cancelEdit();
        await saveTeamsToDB(filtered);
    };

    const getSkillScore = skillScore;

    // ── FRONTEND MATCHMAKING (Maximum Fairness Engine) ──────────────────────
    const calculateNextMatch = () => {
        const requiredCount = tournamentType === "double" ? 4 : 2;
        if (availablePlayers.length < requiredCount) {
            showToast(`ผู้เล่นไม่พอ (ต้องการ ${requiredCount} คน)`, "error");
            return;
        }

        // 1. Build available entities (fixed pairs and solos)
        const availableEntities: Entity[] = [];
        const usedInTeam = new Set<number>();

        if (tournamentType === "double") {
            permanentTeams.forEach(team => {
                // optimisticBusy too: a team that was just sent to court must not be drawn again before the refresh
                const isAvailable = team.players.every(p => !busyPlayerIds.has(p.id) && !pausedPlayerIds.has(p.id) && !optimisticBusy.has(p.id));
                if (isAvailable && team.players.length === 2) {
                    const maxCount = Math.max(...team.players.map(p => effectivePlayerCounts.get(p.id) || 0));
                    availableEntities.push({ type: "team", players: team.players, matchCount: maxCount });
                    team.players.forEach(p => usedInTeam.add(p.id));
                }
            });
        }

        availablePlayers.forEach(p => {
            if (tournamentType === "double" && assignedPlayerIds.has(p.id) && !usedInTeam.has(p.id)) return;
            if (!usedInTeam.has(p.id)) {
                availableEntities.push({ type: "solo", players: [p], matchCount: effectivePlayerCounts.get(p.id) || 0 });
            }
        });

        // 2. Pick: lowest play-count tier, then "meet new people" + "close game" (see endlessMatchmaking.ts)
        const history = buildHistory(
            apiMatches
                .filter(m => m.match_status !== "cancelled")
                .map(m => ({
                    teamA: (m.team_a_id?.team_players.map(getUnifiedPlayerId).filter(Boolean) || []) as number[],
                    teamB: (m.team_b_id?.team_players.map(getUnifiedPlayerId).filter(Boolean) || []) as number[],
                    matchNo: m.match_no,
                }))
        );
        const result = pickNextMatch({
            type: tournamentType,
            entities: availableEntities,
            history,
            gamesOf: id => effectivePlayerCounts.get(id) || 0,
            isBlockedPair: isBlockedTeammates,
        });

        if ("error" in result) {
            showToast(
                result.error === "not-enough-players"
                    ? "ผู้เล่นที่พร้อมจับคู่ไม่พอ (คู่หูบางคนอาจกำลังแข่งหรือพักอยู่)"
                    : "ไม่สามารถจับคู่ได้ (จำนวนคนและรูปแบบทีมถาวรไม่ลงตัว)",
                "error"
            );
            return;
        }
        const bestPairing = result;

        setPreviewMatch({ teamA: bestPairing.teamA, teamB: bestPairing.teamB });
        setTimeout(() => {
            document.getElementById("endless-manager")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
    };

    const handleConfirmMatch = async () => {
        if (!previewMatch) return;
        setDrawing(true);
        try {
            // Create teams and match manually
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournaments/${tournamentId}/create-endless-match`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({
                    data: {
                        playerIdsA: previewMatch.teamA.map(p => p.id),
                        playerIdsB: previewMatch.teamB.map(p => p.id)
                    }
                })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error?.message || "Error creating match");

            // Optimistically mark players as busy to prevent duplicate draws
            setOptimisticBusy(prev => {
                const newSet = new Set(prev);
                previewMatch.teamA.forEach(p => newSet.add(p.id));
                previewMatch.teamB.forEach(p => newSet.add(p.id));
                return newSet;
            });

            showToast("สร้างแมตช์เรียบร้อยแล้ว", "success");
            setPreviewMatch(null);
            await refreshInfo();
            setTimeout(() => {
                document.getElementById("match-schedule")?.scrollIntoView({ behavior: "smooth" });
            }, 300);
        } catch (e: any) {
            await Swal.fire({
                title: "ไม่สามารถสุ่มคู่ได้",
                text: e.message || "เกิดข้อผิดพลาด",
                icon: "warning",
                confirmButtonColor: "#6366f1"
            });
            setPreviewMatch(null);
            refreshInfo();
        } finally {
            setDrawing(false);
        }
    };

    const handleConfirmManualMatch = async () => {
        if (manualTeamA.length !== playersPerTeam || manualTeamB.length !== playersPerTeam) return;
        setDrawing(true);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournaments/${tournamentId}/create-endless-match`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({
                    data: {
                        playerIdsA: manualTeamA.map(p => p.id),
                        playerIdsB: manualTeamB.map(p => p.id)
                    }
                })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error?.message || "Error creating match");

            // Optimistically mark players as busy
            setOptimisticBusy(prev => {
                const newSet = new Set(prev);
                manualTeamA.forEach(p => newSet.add(p.id));
                manualTeamB.forEach(p => newSet.add(p.id));
                return newSet;
            });

            showToast("สร้างแมตช์เรียบร้อยแล้ว", "success");
            setManualTeamA([]);
            setManualTeamB([]);
            await refreshInfo();
            setTimeout(() => {
                document.getElementById("match-schedule")?.scrollIntoView({ behavior: "smooth" });
            }, 300);
        } catch (e: any) {
            await Swal.fire({
                title: "ไม่สามารถสร้างแมตช์ได้",
                text: e.message || "เกิดข้อผิดพลาด",
                icon: "warning",
                confirmButtonColor: "#6366f1"
            });
            refreshInfo();
        } finally {
            setDrawing(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // UI helpers
    const spinnerSvg = (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );

    const availableCount = availablePlayers.length;
    const totalCount = players.length;

    const handleEditOffset = async (player: RegisteredPlayer, currentCount: number) => {
        if (!jwt || !player.tpDocumentId) return;

        const { value } = await Swal.fire({
            title: `ปรับรอบการเล่นของ ${player.username}`,
            input: 'number',
            inputLabel: 'จำนวนแมตช์ที่ต้องการให้เป็น',
            inputValue: currentCount,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#6366f1'
        });

        if (value !== undefined && value !== "") {
            const newTotal = parseInt(value, 10);
            if (isNaN(newTotal)) return;

            const currentOffset = player.match_offset || 0;
            const baseMatches = currentCount - currentOffset;
            const newOffset = newTotal - baseMatches;

            try {
                const res = await fetch(`${STRAPI_BASE_URL}/api/tournament-players/${player.tpDocumentId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                    body: JSON.stringify({ data: { match_offset: newOffset } })
                });
                if (!res.ok) throw new Error("Failed to update offset");
                showToast("อัปเดตจำนวนแมตช์แล้ว", "success");
                refreshInfo();
            } catch (e: any) {
                showToast(`อัปเดตไม่สำเร็จ: ${e.message}`, "error");
            }
        }
    };

    // ─────────────────────────────────────────────────────────────────────────

    return {
        drawing, setDrawing,
        pairingMode, setPairingMode,
        manualTeamA, setManualTeamA,
        manualTeamB, setManualTeamB,
        activeManualTeam, setActiveManualTeam,
        previewMatch, setPreviewMatch,
        selectedSwapPlayer, setSelectedSwapPlayer,
        showPlayerList, setShowPlayerList,
        permanentTeams, setPermanentTeams,
        selectedForNew, setSelectedForNew,
        editingTeamId, setEditingTeamId,
        playersPerTeam,
        busyPlayerIds, actualPlayerCounts, effectivePlayerCounts, lastMatchPlayed,
        availablePlayers, assignedPlayerIds, teamMatchCounts,
        handleTogglePause,
        toggleSelectPlayer,
        saveTeamsToDB,
        addOrUpdateTeam,
        startEditTeam,
        cancelEdit,
        removeTeam,
        getSkillScore,
        calculateNextMatch,
        handleConfirmMatch,
        handleConfirmManualMatch,
        spinnerSvg,
        availableCount,
        totalCount,
        handleEditOffset,
        isBlockedTeammates
    };
}
