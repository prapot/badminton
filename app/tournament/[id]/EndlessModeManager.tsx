"use client";

import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";

interface ApiPlayer {
    id: number;
    username: string;
    picture?: { url: string } | null;
    rankings?: Array<{ mmr: number }> | null;
}

interface ApiMatch {
    match_status: "upcoming" | "live" | "done" | "cancelled";
    team_a_id: { team_players: Array<{ user_id: { id: number } | null }> } | null;
    team_b_id: { team_players: Array<{ user_id: { id: number } | null }> } | null;
}

type PairingMode = "auto" | "locked";

interface PermanentTeam {
    id: string; // local uuid for UI keying
    label: string; // "ทีม 1", "ทีม 2", ...
    players: ApiPlayer[];
}

interface EndlessModeManagerProps {
    tournamentId: string;
    tournamentType: "single" | "double";
    players: Array<{ id: number; username: string; picture?: { url: string } | null; rankings?: any }>;
    apiMatches: ApiMatch[];
    jwt: string;
    STRAPI_BASE_URL: string;
    refreshInfo: () => void;
    showToast: (msg: string, type?: "success" | "error") => void;
    pausedPlayerIds: Set<number>;
    setPausedPlayerIds: React.Dispatch<React.SetStateAction<Set<number>>>;
    tournamentStatus: string;
    userId?: number;
    ownerId?: number;
}

const TEAM_COLORS = [
    { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
    { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400" },
    { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400" },
    { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400" },
    { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
    { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400" },
    { bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-400" },
    { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-400" },
];

export default function EndlessModeManager({
    tournamentId,
    tournamentType,
    players,
    apiMatches,
    jwt,
    STRAPI_BASE_URL,
    refreshInfo,
    showToast,
    pausedPlayerIds,
    setPausedPlayerIds,
    tournamentStatus,
    userId,
    ownerId
}: EndlessModeManagerProps) {
    const [drawing, setDrawing] = useState(false);
    const [pairingMode, setPairingMode] = useState<PairingMode>("auto");

    // ── Permanent teams (persist across draws) ───────────────────────────
    const [permanentTeams, setPermanentTeams] = useState<PermanentTeam[]>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(`permanentTeams_${tournamentId}`);
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    return [];
                }
            }
        }
        return [];
    });

    // Save teams whenever they change
    useEffect(() => {
        localStorage.setItem(`permanentTeams_${tournamentId}`, JSON.stringify(permanentTeams));
    }, [permanentTeams, tournamentId]);

    const [selectedForNew, setSelectedForNew] = useState<ApiPlayer[]>([]);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null); // team being edited

    const playersPerTeam = tournamentType === "double" ? 2 : 1;

    // Clear cache if tournament is completed
    useEffect(() => {
        if (tournamentStatus === "completed") {
            localStorage.removeItem(`permanentTeams_${tournamentId}`);
            // Note: we don't clear the state immediately to allow viewing, 
            // but next refresh will be empty.
        }
    }, [tournamentStatus, tournamentId]);

    // ── Compute busy & match counts ───────────────────────────────────────
    const { busyPlayerIds, actualPlayerCounts, effectivePlayerCounts } = useMemo(() => {
        const actualCounts = new Map<number, number>();
        const busy = new Set<number>();
        players.forEach(p => actualCounts.set(p.id, 0));

        apiMatches.forEach(m => {
            if (m.match_status === "cancelled") return;
            const pids = [
                ...(m.team_a_id?.team_players.map(tp => tp.user_id?.id) || []),
                ...(m.team_b_id?.team_players.map(tp => tp.user_id?.id) || [])
            ].filter(Boolean) as number[];

            pids.forEach(id => {
                if (actualCounts.has(id)) actualCounts.set(id, actualCounts.get(id)! + 1);
            });

            if (m.match_status === "live" || m.match_status === "upcoming") {
                pids.forEach(id => busy.add(id));
            }
        });

        // Apply Catch-up Offset (แต้มบุญ): 
        // New players start with the minimum match count of established players.
        const effectiveCounts = new Map(actualCounts);
        const playedCounts = Array.from(actualCounts.values()).filter(c => c > 0);
        if (playedCounts.length > 0) {
            const minPlayed = Math.min(...playedCounts);
            players.forEach(p => {
                if (actualCounts.get(p.id) === 0) {
                    effectiveCounts.set(p.id, minPlayed);
                }
            });
        }

        return { busyPlayerIds: busy, actualPlayerCounts: actualCounts, effectivePlayerCounts: effectiveCounts };
    }, [players, apiMatches]);

    const availablePlayers = useMemo(
        () => players.filter(p => !busyPlayerIds.has(p.id) && !pausedPlayerIds.has(p.id)),
        [players, busyPlayerIds, pausedPlayerIds]
    );

    // Players already assigned to a permanent team
    const assignedPlayerIds = useMemo(
        () => {
            const editingTeam = editingTeamId ? permanentTeams.find(t => t.id === editingTeamId) : null;
            // When editing, exclude own members so they can be re-selected
            const base = permanentTeams
                .filter(t => t.id !== editingTeamId)
                .flatMap(t => t.players.map(p => p.id));
            return new Set(base);
        },
        [permanentTeams, editingTeamId]
    );

    // Team match counts (how many times this exact team composition has played)
    const teamMatchCounts = useMemo(() => {
        const counts = new Map<string, number>();
        permanentTeams.forEach(team => {
            const key = team.players.map(p => p.id).sort().join(",");
            let c = 0;
            apiMatches.forEach(m => {
                if (m.match_status === "cancelled") return;
                [m.team_a_id, m.team_b_id].forEach(t => {
                    if (!t) return;
                    const ids = t.team_players.map(tp => tp.user_id?.id).filter(Boolean).sort().join(",");
                    if (ids === key) c++;
                });
            });
            // Also apply effective logic to teams? 
            // For now, teams use the average effective counts of their players.
            counts.set(team.id, c);
        });
        return counts;
    }, [permanentTeams, apiMatches]);

    // How many times each pair of permanent teams has faced each other
    const teamFaceoffCounts = useMemo(() => {
        const counts = new Map<string, number>();
        permanentTeams.forEach(tA => {
            permanentTeams.forEach(tB => {
                if (tA.id >= tB.id) return;
                const idsA = tA.players.map(p => p.id).sort().join(",");
                const idsB = tB.players.map(p => p.id).sort().join(",");
                let c = 0;
                apiMatches.forEach(m => {
                    if (m.match_status === "cancelled") return;
                    const mA = m.team_a_id?.team_players.map(tp => tp.user_id?.id).filter(Boolean).sort().join(",");
                    const mB = m.team_b_id?.team_players.map(tp => tp.user_id?.id).filter(Boolean).sort().join(",");
                    if ((mA === idsA && mB === idsB) || (mA === idsB && mB === idsA)) c++;
                });
                counts.set(`${tA.id}|${tB.id}`, c);
            });
        });
        return counts;
    }, [permanentTeams, apiMatches]);

    const getFaceoffCount = (pidsA: number[], pidsB: number[]) => {
        const keyA = [...pidsA].sort((a, b) => a - b).join(",");
        const keyB = [...pidsB].sort((a, b) => a - b).join(",");
        const matchKey = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
        
        let count = 0;
        apiMatches.forEach(m => {
            if (m.match_status === "cancelled") return;
            const mA = m.team_a_id?.team_players.map(tp => tp.user_id?.id).filter(Boolean).sort((a, b) => a! - b!).join(",");
            const mB = m.team_b_id?.team_players.map(tp => tp.user_id?.id).filter(Boolean).sort((a, b) => a! - b!).join(",");
            if ((mA === keyA && mB === keyB) || (mA === keyB && mB === keyA)) count++;
        });
        return count;
    };

    const handleTogglePause = (player: ApiPlayer) => {
        const newPaused = new Set(pausedPlayerIds);
        if (newPaused.has(player.id)) {
            newPaused.delete(player.id);
            showToast(`ให้ ${player.username} กลับมาเล่นแล้ว`, "success");
        } else {
            newPaused.add(player.id);
            showToast(`ให้ ${player.username} พักการเล่น`, "success");
        }
        setPausedPlayerIds(newPaused);
    };

    // ── Team management ────────────────────────────────────────────────────
    const toggleSelectPlayer = (player: ApiPlayer) => {
        setSelectedForNew(prev => {
            const exists = prev.some(p => p.id === player.id);
            if (exists) return prev.filter(p => p.id !== player.id);
            if (prev.length >= playersPerTeam) return prev;
            return [...prev, player];
        });
    };

    const addOrUpdateTeam = () => {
        if (selectedForNew.length !== playersPerTeam) return;

        if (editingTeamId) {
            // Update existing team
            setPermanentTeams(prev =>
                prev.map(t => t.id === editingTeamId ? { ...t, players: selectedForNew } : t)
            );
            setEditingTeamId(null);
        } else {
            // Create new team
            const idx = permanentTeams.length;
            const newTeam: PermanentTeam = {
                id: Math.random().toString(36).slice(2),
                label: `ทีม ${idx + 1}`,
                players: selectedForNew,
            };
            setPermanentTeams(prev => [...prev, newTeam]);
        }
        setSelectedForNew([]);
    };

    const startEditTeam = (team: PermanentTeam) => {
        setEditingTeamId(team.id);
        setSelectedForNew([...team.players]);
    };

    const cancelEdit = () => {
        setEditingTeamId(null);
        setSelectedForNew([]);
    };

    const removeTeam = (id: string) => {
        setPermanentTeams(prev => {
            const filtered = prev.filter(t => t.id !== id);
            // Re-label teams in order
            return filtered.map((t, i) => ({ ...t, label: `ทีม ${i + 1}` }));
        });
        if (editingTeamId === id) cancelEdit();
    };

    // ── AUTO DRAW ──────────────────────────────────────────────────────────
    const getPartnerHistory = (p1Id: number, p2Id: number) => {
        let count = 0;
        apiMatches.forEach(m => {
            if (m.match_status === "cancelled") return;
            [m.team_a_id, m.team_b_id].forEach(t => {
                if (!t) return;
                const ids = t.team_players.map(tp => tp.user_id?.id).filter(Boolean);
                if (ids.length === 2 && ids.includes(p1Id) && ids.includes(p2Id)) count++;
            });
        });
        return count;
    };

    const pickBestDouble = (pool4: ApiPlayer[]): [ApiPlayer[], ApiPlayer[]] => {
        const opts = [
            { a: [pool4[0], pool4[1]], b: [pool4[2], pool4[3]], score: getPartnerHistory(pool4[0].id, pool4[1].id) + getPartnerHistory(pool4[2].id, pool4[3].id) },
            { a: [pool4[0], pool4[2]], b: [pool4[1], pool4[3]], score: getPartnerHistory(pool4[0].id, pool4[2].id) + getPartnerHistory(pool4[1].id, pool4[3].id) },
            { a: [pool4[0], pool4[3]], b: [pool4[1], pool4[2]], score: getPartnerHistory(pool4[0].id, pool4[3].id) + getPartnerHistory(pool4[1].id, pool4[2].id) },
        ];
        opts.sort((a, b) => a.score - b.score);
        return [opts[0].a, opts[0].b];
    };

    // ── HYBRID DRAW LOGIC: respects permanent teams and individuals ──────
    const performHybridDraw = async () => {
        const pPerTeam = tournamentType === "double" ? 2 : 1;

        // 1. Available players
        const freePlayers = players.filter(p => !busyPlayerIds.has(p.id) && !pausedPlayerIds.has(p.id));
        const freePlayerIds = new Set(freePlayers.map(p => p.id));

        // 2. Available permanent teams
        const availTeams = permanentTeams.filter(t => t.players.every(p => freePlayerIds.has(p.id)));
        const allTeamPlayerIds = new Set(permanentTeams.flatMap(t => t.players.map(p => p.id)));

        // 3. Available individuals (not in ANY permanent team)
        const availIndividuals = freePlayers.filter(p => !allTeamPlayerIds.has(p.id));

        // 4. Build all possible "Sides"
        const possibleSides: Array<{ players: ApiPlayer[]; label: string; matchCount: number }> = [];

        // Add all available permanent teams
        availTeams.forEach(t => {
            // Use average EFFECTIVE count for teams
            const avgCount = t.players.reduce((sum, p) => sum + (effectivePlayerCounts.get(p.id) || 0), 0) / t.players.length;
            possibleSides.push({ players: t.players, label: t.label, matchCount: avgCount });
        });

        // Form sides from individuals
        const sortedIndivs = [...availIndividuals].sort((a, b) => (effectivePlayerCounts.get(a.id) || 0) - (effectivePlayerCounts.get(b.id) || 0));
        let i = 0;
        while (i + pPerTeam <= sortedIndivs.length) {
            const slice = sortedIndivs.slice(i, i + pPerTeam);
            // Use average EFFECTIVE count for individual sides
            const avgCount = slice.reduce((sum, p) => sum + (effectivePlayerCounts.get(p.id) || 0), 0) / slice.length;
            possibleSides.push({
                players: slice,
                label: slice.length > 1 ? "กลุ่มอิสระ" : slice[0].username,
                matchCount: avgCount
            });
            i += pPerTeam;
        }

        if (possibleSides.length < 2) {
            showToast("ทรัพยากรไม่เพียงพอสำหรับจัดแมตซ์ (ต้องการทีมหรือกลุ่มผู้เล่นอิสระอย่างน้อย 2 ฝั่ง)", "error");
            return;
        }

        // 5. Pick the best matchup
        possibleSides.sort((a, b) => a.matchCount - b.matchCount);

        // Pick most rested side
        const sideA = possibleSides[0];
        const otherSides = possibleSides.slice(1);

        // Find best opponent for sideA
        const scoredOpponents = otherSides.map(sideB => {
            const faceoffs = getFaceoffCount(sideA.players.map(p => p.id), sideB.players.map(p => p.id));
            const score = faceoffs * 100 + sideB.matchCount + Math.random();
            return { sideB, score };
        });

        scoredOpponents.sort((a, b) => a.score - b.score);
        const sideB = scoredOpponents[0].sideB;

        setDrawing(true);
        try {
            await confirmAndCreateMatch(sideA.players, sideB.players, sideA.label, sideB.label);
        } catch (e) {
            console.error(e);
            showToast("เกิดข้อผิดพลาด", "error");
        } finally {
            setDrawing(false);
        }
    };

    const handleDrawNext = async () => {
        await performHybridDraw();
    };

    const handleLockedDraw = async () => {
        await performHybridDraw();
    };

    // ── Shared: confirm & create match ────────────────────────────────────
    const confirmAndCreateMatch = async (
        teamA: ApiPlayer[],
        teamB: ApiPlayer[],
        labelA = "TEAM A",
        labelB = "TEAM B",
        onConfirm?: () => void
    ) => {
        const faceCount = getFaceoffCount(teamA.map(p => p.id), teamB.map(p => p.id));

        const result = await Swal.fire({
            title: "ยืนยันการจัดคู่",
            html: `
                <div class="space-y-3 text-left">
                    <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <p class="text-xs text-blue-400 font-bold mb-1">${labelA}</p>
                        <p class="text-white font-bold">${teamA.map(p => p.username).join(" / ")}</p>
                    </div>
                    <div class="flex justify-center text-xl font-black text-slate-500">VS</div>
                    <div class="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <p class="text-xs text-green-400 font-bold mb-1">${labelB}</p>
                        <p class="text-white font-bold">${teamB.length > 0 ? teamB.map(p => p.username).join(" / ") : "รอนักกีฬา"}</p>
                    </div>
                    ${faceCount !== null ? `<p class="text-center text-xs text-slate-500 mt-1">เคยเจอกันแล้ว ${faceCount} ครั้ง</p>` : ""}
                </div>
            `,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "สร้างแมตซ์เลย!",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#2ecc71",
            background: "#1a2535",
            color: "#fff"
        });

        if (!result.isConfirmed) return;

        const postJSON = async (url: string, body: any) => {
            const res = await fetch(`${STRAPI_BASE_URL}${url}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error("API Error");
            return res.json();
        };

        const randNo = () => Math.random().toString(36).substring(2, 10).toUpperCase();

        const resA = await postJSON("/api/teams", { data: { tournament_id: tournamentId, team_no: randNo() } });
        const teamAId = resA.data.documentId || resA.data.id;
        await Promise.all(teamA.map(p => postJSON("/api/team-players", { data: { team_id: teamAId, user_id: p.id } })));

        const resB = await postJSON("/api/teams", { data: { tournament_id: tournamentId, team_no: randNo() } });
        const teamBId = resB.data.documentId || resB.data.id;
        await Promise.all(teamB.map(p => postJSON("/api/team-players", { data: { team_id: teamBId, user_id: p.id } })));

        const matchNo = apiMatches.length + 1;
        await postJSON("/api/matches", {
            data: {
                tournament_id: tournamentId,
                round: 1,
                match_no: matchNo,
                team_a_id: teamAId,
                team_b_id: teamBId,
                match_status: "upcoming",
                first_serve: Math.random() > 0.5 ? "A" : "B"
            }
        });

        showToast("สร้างแมตซ์เรียบร้อย!", "success");
        onConfirm?.();
        // Wait a bit for the toast and then reload
        setTimeout(() => {
            window.location.reload();
        }, 800);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // UI helpers
    const spinnerSvg = (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/60 border border-indigo-500/20 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />

            <div className="relative z-10">
                {/* Header */}
                <div className="mb-5">
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <span className="text-2xl">♾️</span> โหมดไร้สิ้นสุด
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">สุ่มจัดคู่ถัดไปโดยเน้นคนเล่นน้อยที่สุดให้ได้ลงสนาม</p>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-5 p-1 bg-black/30 rounded-xl border border-white/5">
                    <button
                        onClick={() => setPairingMode("auto")}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${pairingMode === "auto"
                            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                            : "text-slate-400 hover:text-white"}`}
                    >
                        🎲 สุ่มอัตโนมัติ
                    </button>
                    <button
                        onClick={() => setPairingMode("locked")}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${pairingMode === "locked"
                            ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                            : "text-slate-400 hover:text-white"}`}
                    >
                        🔒 ล็อคทีม
                    </button>
                </div>

                {/* ── AUTO MODE ── */}
                {pairingMode === "auto" && (
                    <div className="flex flex-col gap-4">
                        {/* Player status list — collapsible on mobile */}
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">สถานะผู้เล่นปัจจุบัน</h3>
                            <div className="max-h-36 sm:max-h-48 overflow-y-auto space-y-1 pr-1">
                                {players.map(p => {
                                    const count = actualPlayerCounts.get(p.id) || 0;
                                    const isBusy = busyPlayerIds.has(p.id);
                                    return (
                                        <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0 group/p">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className={`truncate ${isBusy || pausedPlayerIds.has(p.id) ? "text-slate-500" : "text-slate-300"}`}>
                                                    {isBusy && <span className="mr-1">⏳</span>}
                                                    {pausedPlayerIds.has(p.id) && <span className="mr-1">⏸️</span>}
                                                    {p.username}
                                                </span>
                                                {(userId === p.id || userId === ownerId) && (
                                                    <button 
                                                        onClick={() => handleTogglePause(p as ApiPlayer)}
                                                        className={`opacity-0 group-hover/p:opacity-100 transition-opacity text-[9px] px-1.5 py-0.5 rounded border ${pausedPlayerIds.has(p.id) ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`}
                                                    >
                                                        {pausedPlayerIds.has(p.id) ? "ให้เล่น" : "ให้พัก"}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {pausedPlayerIds.has(p.id) && (
                                                    <span className="text-[10px] text-yellow-500 font-bold">พัก</span>
                                                )}
                                                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold shrink-0">{count} แมตซ์</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-col items-center p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mb-3 border border-indigo-500/20">
                                <span className="text-3xl animate-pulse">🏸</span>
                            </div>
                            <p className="text-sm text-center text-slate-300 mb-4">ระบบจะคำนวณผู้เล่นที่เหมาะสมที่สุด<br />สำหรับแมตซ์ถัดไปโดยอัตโนมัติ</p>
                            <button
                                onClick={handleDrawNext}
                                disabled={drawing || !jwt}
                                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 group"
                            >
                                {drawing ? <>{spinnerSvg} กำลังสุ่ม...</>
                                    : !jwt ? <span>🔒 เข้าสู่ระบบเพื่อสุ่มคู่</span>
                                        : <><span>🎲 สุ่มแมตซ์ถัดไป</span><span className="group-hover:translate-x-1 transition-transform">→</span></>}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── LOCKED MODE ── */}
                {pairingMode === "locked" && (
                    <div className="space-y-4">
                        {/* Info banner */}
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-300 leading-relaxed">
                            <strong>โหมดทีมถาวร:</strong> สร้างทีมไว้ล่วงหน้า ทีมจะคงอยู่ตลอดการแข่งขัน
                            กด <strong>"สุ่มคู่"</strong> เพื่อให้ระบบเลือกคู่ที่ยังไม่เคยเจอกัน (หรือเจอน้อยที่สุด)
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {/* Add / Edit team panel — shown first on mobile */}
                            <div className="bg-black/20 rounded-xl p-4 border border-white/5 order-first">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                                    {editingTeamId
                                        ? `✏️ แก้ไข ${permanentTeams.find(t => t.id === editingTeamId)?.label}`
                                        : `➕ เพิ่มทีมใหม่ (ทีม ${permanentTeams.length + 1})`}
                                    {" "}
                                    <span className="text-indigo-400 normal-case">— เลือก {playersPerTeam} คน</span>
                                </h3>

                                <div className="max-h-44 sm:max-h-56 overflow-y-auto space-y-1.5 pr-1 mb-3">
                                    {players.length === 0 && (
                                        <p className="text-xs text-slate-600 text-center py-4">ไม่มีผู้เล่น</p>
                                    )}
                                    {players.map(p => {
                                        const isSelected = selectedForNew.some(s => s.id === p.id);
                                        const isAssigned = assignedPlayerIds.has(p.id);
                                        const isMaxed = selectedForNew.length >= playersPerTeam && !isSelected;
                                        const isBusy = busyPlayerIds.has(p.id);
                                        const disabled = isAssigned || isMaxed;

                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => !disabled && toggleSelectPlayer(p)}
                                                disabled={disabled}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 min-h-[40px] rounded-lg text-xs transition-all border active:scale-[0.98] ${isSelected
                                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
                                                    : isAssigned
                                                        ? "bg-black/10 border-white/5 text-slate-600 cursor-not-allowed"
                                                        : disabled
                                                            ? "bg-black/10 border-white/5 text-slate-600 cursor-not-allowed"
                                                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 cursor-pointer"}`}
                                            >
                                                <span className="font-medium truncate">
                                                    {isSelected ? "✓ " : isAssigned ? "🔒 " : ""}{p.username}
                                                    {isBusy && <span className="ml-1 text-orange-400">⏳</span>}
                                                </span>
                                                <span className="text-slate-500 shrink-0 ml-2">
                                                    {actualPlayerCounts.get(p.id) || 0} แมตซ์
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={addOrUpdateTeam}
                                        disabled={selectedForNew.length !== playersPerTeam}
                                        className="flex-1 min-h-[44px] py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed border border-amber-500/30 text-amber-300 font-bold text-xs transition-all truncate px-3"
                                    >
                                        {editingTeamId
                                            ? `💾 บันทึก${selectedForNew.length > 0 ? ` (${selectedForNew.map(p => p.username).join(", ")})` : ""}`
                                            : `🔒 บันทึกทีม${selectedForNew.length > 0 ? ` (${selectedForNew.map(p => p.username).join(", ")})` : ""}`}
                                    </button>
                                    {(selectedForNew.length > 0 || editingTeamId) && (
                                        <button
                                            onClick={cancelEdit}
                                            className="px-4 min-h-[44px] rounded-lg text-xs text-slate-500 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all shrink-0"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Permanent teams list */}
                            <div className="space-y-3">
                                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            ทีมถาวร ({permanentTeams.length} ทีม)
                                        </h3>
                                    </div>

                                    {permanentTeams.length === 0 ? (
                                        <p className="text-xs text-slate-600 text-center py-5">ยังไม่มีทีม · เพิ่มทีมด้านบน</p>
                                    ) : (
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                            {permanentTeams.map((team, idx) => {
                                                const color = TEAM_COLORS[idx % TEAM_COLORS.length];
                                                const isBusy = team.players.some(p => busyPlayerIds.has(p.id));
                                                const matchCount = teamMatchCounts.get(team.id) || 0;
                                                const isEditing = editingTeamId === team.id;

                                                return (
                                                    <div
                                                        key={team.id}
                                                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isEditing
                                                            ? "bg-amber-500/15 border-amber-500/40"
                                                            : `${color.bg} ${color.border}`}`}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                                <p className={`text-[10px] font-bold ${isEditing ? "text-amber-400" : color.text}`}>
                                                                    {team.label}{isEditing && " · กำลังแก้ไข"}
                                                                </p>
                                                                {isBusy && (
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold">⏳ กำลังแข่ง</span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm font-bold text-white truncate">
                                                                {team.players.map(p => p.username).join(" / ")}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">{matchCount} แมตซ์</p>
                                                        </div>
                                                        <div className="flex gap-1 ml-2 shrink-0">
                                                            <button
                                                                onClick={() => isEditing ? cancelEdit() : startEditTeam(team)}
                                                                className="p-2 rounded text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 active:scale-90 transition-all text-sm"
                                                                title="แก้ไขทีม"
                                                            >
                                                                {isEditing ? "✕" : "✏️"}
                                                            </button>
                                                            <button
                                                                onClick={() => removeTeam(team.id)}
                                                                className="p-2 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all text-sm"
                                                                title="ลบทีม"
                                                            >
                                                                🗑
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Draw matchup button */}
                                {permanentTeams.length >= 2 && (
                                    <button
                                        onClick={handleLockedDraw}
                                        disabled={drawing || !jwt}
                                        className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] text-white font-black text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {drawing ? <>{spinnerSvg} กำลังสุ่ม...</>
                                            : <><span>🎲 สุ่มคู่จากทีมถาวร</span><span>→</span></>}
                                    </button>
                                )}
                            </div>
                        </div>



                        {/* Faceoff history summary (shows when ≥2 teams) */}
                        {permanentTeams.length >= 2 && (
                            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">ประวัติการเจอกัน</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {permanentTeams.flatMap((tA, i) =>
                                        permanentTeams.slice(i + 1).map(tB => {
                                            const count = getFaceoffCount(tA.players.map(p => p.id), tB.players.map(p => p.id));
                                            return (
                                                <div key={`${tA.id}-${tB.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs">
                                                    <span className="text-slate-300 truncate">
                                                        {tA.label} vs {tB.label}
                                                    </span>
                                                    <span className={`ml-2 shrink-0 font-bold ${count === 0 ? "text-green-400" : count <= 2 ? "text-amber-400" : "text-red-400"}`}>
                                                        {count}×
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
