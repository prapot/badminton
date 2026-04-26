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

    // localStorage key helper
    const storageKey = `permanentTeams_${tournamentId}`;

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
            // Update only this team in cache
            const updated = permanentTeams.map(t =>
                t.id === editingTeamId ? { ...t, players: selectedForNew } : t
            );
            setPermanentTeams(updated);
            localStorage.setItem(storageKey, JSON.stringify(updated));
            setEditingTeamId(null);
        } else {
            // Create new team — append to cache
            const idx = permanentTeams.length;
            const newTeam: PermanentTeam = {
                id: Math.random().toString(36).slice(2),
                label: `ทีม ${idx + 1}`,
                players: selectedForNew,
            };
            const updated = [...permanentTeams, newTeam];
            setPermanentTeams(updated);
            localStorage.setItem(storageKey, JSON.stringify(updated));
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
        const filtered = permanentTeams
            .filter(t => t.id !== id)
            .map((t, i) => ({ ...t, label: `ทีม ${i + 1}` }));
        setPermanentTeams(filtered);
        // Update cache: save remaining teams (clear if none left)
        if (filtered.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(filtered));
        } else {
            localStorage.removeItem(storageKey);
        }
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
            const avgCount = t.players.reduce((sum, p) => sum + (effectivePlayerCounts.get(p.id) || 0), 0) / t.players.length;
            possibleSides.push({ players: t.players, label: t.label, matchCount: avgCount });
        });

        // Form sides from individuals — try many random permutations, pick the one with fewest partner repeats
        const sortedIndivs = [...availIndividuals].sort(
            (a, b) => (effectivePlayerCounts.get(a.id) || 0) - (effectivePlayerCounts.get(b.id) || 0)
        );

        if (pPerTeam === 2 && sortedIndivs.length >= 4) {
            // Try up to 200 random groupings of all available individuals, pick best
            const shuffle = (arr: ApiPlayer[]) => {
                const a = [...arr];
                for (let i = a.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [a[i], a[j]] = [a[j], a[i]];
                }
                return a;
            };

            let bestSides: Array<{ players: ApiPlayer[]; label: string; matchCount: number }> = [];
            let bestScore = Infinity;

            for (let attempt = 0; attempt < 200; attempt++) {
                const shuffled = attempt === 0 ? sortedIndivs : shuffle(sortedIndivs);
                const candidateSides: typeof bestSides = [];
                let score = 0;
                let i = 0;
                while (i + 4 <= shuffled.length) {
                    const [tA, tB] = pickBestDouble(shuffled.slice(i, i + 4));
                    const avgA = tA.reduce((s, p) => s + (effectivePlayerCounts.get(p.id) || 0), 0) / tA.length;
                    const avgB = tB.reduce((s, p) => s + (effectivePlayerCounts.get(p.id) || 0), 0) / tB.length;
                    candidateSides.push({ players: tA, label: tA.map(p => p.username).join(" / "), matchCount: avgA });
                    candidateSides.push({ players: tB, label: tB.map(p => p.username).join(" / "), matchCount: avgB });
                    score += getPartnerHistory(tA[0].id, tA[1].id) + getPartnerHistory(tB[0].id, tB[1].id);
                    i += 4;
                }
                // Handle leftover pair
                if (shuffled.length - i === 2) {
                    const slice = shuffled.slice(i, i + 2);
                    const avg = slice.reduce((s, p) => s + (effectivePlayerCounts.get(p.id) || 0), 0) / slice.length;
                    candidateSides.push({ players: slice, label: slice.map(p => p.username).join(" / "), matchCount: avg });
                    score += getPartnerHistory(slice[0].id, slice[1].id);
                }
                if (score < bestScore) {
                    bestScore = score;
                    bestSides = candidateSides;
                    if (score === 0) break; // Perfect — no repeats
                }
            }
            bestSides.forEach(s => possibleSides.push(s));

        } else if (pPerTeam === 2 && sortedIndivs.length === 2) {
            // Only 2 individuals — must use them
            const avg = sortedIndivs.reduce((s, p) => s + (effectivePlayerCounts.get(p.id) || 0), 0) / sortedIndivs.length;
            possibleSides.push({ players: sortedIndivs, label: sortedIndivs.map(p => p.username).join(" / "), matchCount: avg });

        } else {
            // Single mode: pick in match-count order
            let i = 0;
            while (i + pPerTeam <= sortedIndivs.length) {
                const slice = sortedIndivs.slice(i, i + pPerTeam);
                const avg = slice.reduce((s, p) => s + (effectivePlayerCounts.get(p.id) || 0), 0) / slice.length;
                possibleSides.push({ players: slice, label: slice[0].username, matchCount: avg });
                i += pPerTeam;
            }
        }

        if (possibleSides.length < 2) {
            showToast("ทรัพยากรไม่เพียงพอสำหรับจัดแมตซ์ (ต้องการทีมหรือกลุ่มผู้เล่นอิสระอย่างน้อย 2 ฝั่ง)", "error");
            return;
        }

        // 5. Pick the best matchup — lowest matchCount plays first
        possibleSides.sort((a, b) => a.matchCount - b.matchCount);
        const sideA = possibleSides[0];
        const otherSides = possibleSides.slice(1);

        // Score opponents: penalise faceoff repeats + partner repeats within each side
        const partnerPenalty = (side: typeof sideA) =>
            pPerTeam === 2 && side.players.length === 2
                ? getPartnerHistory(side.players[0].id, side.players[1].id) * 80
                : 0;

        const scoredOpponents = otherSides.map(sideB => {
            const faceoffs = getFaceoffCount(sideA.players.map(p => p.id), sideB.players.map(p => p.id));
            const score = faceoffs * 100 + partnerPenalty(sideB) + sideB.matchCount + Math.random();
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
        // Only use permanent teams — ignore all individual players
        const freePlayerIds = new Set(
            players
                .filter(p => !busyPlayerIds.has(p.id) && !pausedPlayerIds.has(p.id))
                .map(p => p.id)
        );

        // Teams where every player is free (not busy / not paused)
        const availTeams = permanentTeams.filter(t =>
            t.players.every(p => freePlayerIds.has(p.id))
        );

        if (availTeams.length < 2) {
            showToast("ต้องการทีมถาวรที่พร้อมเล่นอย่างน้อย 2 ทีม", "error");
            return;
        }

        // Score each team: lower match load = plays first
        const teamMatchLoad = (team: typeof permanentTeams[0]) =>
            team.players.reduce((sum, p) => sum + (effectivePlayerCounts.get(p.id) || 0), 0) / team.players.length;

        const sorted = [...availTeams].sort((a, b) => teamMatchLoad(a) - teamMatchLoad(b));

        // Pick most-rested team as sideA
        const sideA = sorted[0];
        const rest = sorted.slice(1);

        // Score opponents: penalise faceoff repeats heavily, then match load
        const scored = rest.map(sideB => {
            const faceoffs = getFaceoffCount(sideA.players.map(p => p.id), sideB.players.map(p => p.id));
            const score = faceoffs * 100 + teamMatchLoad(sideB) + Math.random();
            return { sideB, score };
        });
        scored.sort((a, b) => a.score - b.score);
        const sideB = scored[0].sideB;

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

    const availableCount = availablePlayers.length;
    const totalCount = players.length;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="bg-gradient-to-br from-indigo-950/70 to-slate-900/90 border border-indigo-500/20 rounded-2xl overflow-hidden shadow-xl relative">
            {/* Decorative glow */}
            <div className="pointer-events-none absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -mr-24 -mt-24" />

            <div className="relative z-10">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                            <span className="text-lg">♾️</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white leading-tight">โหมดไร้สิ้นสุด</h2>
                            <p className="text-[10px] text-slate-500 leading-tight">เน้นคนเล่นน้อยได้ลงก่อน</p>
                        </div>
                    </div>
                    {/* Available count pill */}
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-600 uppercase tracking-widest">พร้อมเล่น</span>
                        <span className="text-base font-black leading-tight">
                            <span className={availableCount === 0 ? "text-red-400" : "text-green-400"}>{availableCount}</span>
                            <span className="text-slate-600 text-xs font-normal">/{totalCount}</span>
                        </span>
                    </div>
                </div>

                {/* ── Mode Toggle ── */}
                <div className="px-4 pt-3 pb-2">
                    <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                        <button
                            onClick={() => setPairingMode("auto")}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${pairingMode === "auto"
                                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                                : "text-slate-500 hover:text-slate-300"}`}
                        >
                            🎲 อัตโนมัติ
                        </button>
                        <button
                            onClick={() => setPairingMode("locked")}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${pairingMode === "locked"
                                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                                : "text-slate-500 hover:text-slate-300"}`}
                        >
                            🔒 ล็อคทีม
                            {permanentTeams.length > 0 && (
                                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black ${pairingMode === "locked" ? "bg-white/25 text-white" : "bg-amber-500/20 text-amber-400"}`}>
                                    {permanentTeams.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* ══════════════════ AUTO MODE ══════════════════ */}
                {pairingMode === "auto" && (
                    <div className="px-4 pb-4 pt-1 space-y-2">
                        {/* Player roster */}
                        <div className="space-y-1">
                            {players.map(p => {
                                const count = actualPlayerCounts.get(p.id) || 0;
                                const isBusy = busyPlayerIds.has(p.id);
                                const isPaused = pausedPlayerIds.has(p.id);
                                const isAvailable = !isBusy && !isPaused;
                                const canManage = userId === p.id || userId === ownerId;

                                return (
                                    <div
                                        key={p.id}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${isAvailable
                                            ? "bg-white/[0.04] border-white/[0.07]"
                                            : "bg-black/20 border-white/[0.04] opacity-60"
                                        }`}
                                    >
                                        {/* Status dot */}
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${isBusy
                                            ? "bg-orange-400 animate-pulse"
                                            : isPaused
                                                ? "bg-yellow-500"
                                                : "bg-green-400"
                                        }`} />

                                        {/* Name */}
                                        <span className={`flex-1 text-xs font-medium truncate ${isAvailable ? "text-slate-200" : "text-slate-500"}`}>
                                            {p.username}
                                        </span>

                                        {/* Status label (right of name) */}
                                        {isBusy && <span className="text-[9px] text-orange-400 font-bold shrink-0">แข่งอยู่</span>}
                                        {isPaused && !isBusy && <span className="text-[9px] text-yellow-500 font-bold shrink-0">พัก</span>}

                                        {/* Match count */}
                                        <span className="text-[10px] text-slate-600 shrink-0 min-w-[28px] text-right">{count}แมตซ์</span>

                                        {/* Pause toggle — always visible for owner/self */}
                                        {canManage && !isBusy && (
                                            <button
                                                onClick={() => handleTogglePause(p as ApiPlayer)}
                                                className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center text-base transition-all active:scale-90 ${isPaused
                                                    ? "bg-green-500/15 border-green-500/30 text-green-400"
                                                    : "bg-white/5 border-white/10 text-slate-600 hover:text-yellow-400 hover:border-yellow-500/30"
                                                }`}
                                                title={isPaused ? "ให้กลับมาเล่น" : "ให้พักก่อน"}
                                            >
                                                {isPaused ? "▶" : "⏸"}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Draw button */}
                        <button
                            onClick={handleDrawNext}
                            disabled={drawing || !jwt}
                            className="w-full min-h-[52px] mt-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 active:scale-[0.98] text-white font-black text-sm transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {drawing ? <>{spinnerSvg}<span>กำลังสุ่ม...</span></>
                                : !jwt ? <span>🔒 เข้าสู่ระบบเพื่อสุ่ม</span>
                                    : <><span>🎲 สุ่มแมตซ์ถัดไป</span></>}
                        </button>
                    </div>
                )}

                {/* ══════════════════ LOCKED MODE ══════════════════ */}
                {pairingMode === "locked" && (
                    <div>
                        {/* ── Existing permanent teams ── */}
                        {permanentTeams.length > 0 && (
                            <div className="px-4 pt-2 pb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ทีมถาวร</span>
                                    <span className="text-[10px] text-slate-600">{permanentTeams.length} ทีม</span>
                                </div>
                                <div className="space-y-1.5">
                                    {permanentTeams.map((team, idx) => {
                                        const color = TEAM_COLORS[idx % TEAM_COLORS.length];
                                        const isBusy = team.players.some(p => busyPlayerIds.has(p.id));
                                        const matchCount = teamMatchCounts.get(team.id) || 0;
                                        const isEditing = editingTeamId === team.id;

                                        return (
                                            <div
                                                key={team.id}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${isEditing
                                                    ? "bg-amber-500/10 border-amber-500/30"
                                                    : `${color.bg} ${color.border}`}`}
                                            >
                                                {/* Color dot */}
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${isEditing ? "bg-amber-400" : color.text.replace("text-", "bg-")}`} />

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className={`text-[10px] font-bold ${isEditing ? "text-amber-400" : color.text}`}>
                                                            {team.label}
                                                        </span>
                                                        {isBusy && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-bold">แข่งอยู่</span>
                                                        )}
                                                        {isEditing && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold">กำลังแก้ไข</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-bold text-white truncate leading-snug">
                                                        {team.players.map(p => p.username).join(" / ")}
                                                    </p>
                                                </div>

                                                <span className="text-[10px] text-slate-600 shrink-0">{matchCount}แมตซ์</span>

                                                <div className="flex gap-0.5 shrink-0">
                                                    <button
                                                        onClick={() => isEditing ? cancelEdit() : startEditTeam(team)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 active:scale-90 transition-all"
                                                    >
                                                        {isEditing ? "✕" : "✏️"}
                                                    </button>
                                                    <button
                                                        onClick={() => removeTeam(team.id)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="mx-4 border-t border-white/5" />

                        {/* ── Add / Edit team section ── */}
                        <div className="px-4 pt-3 pb-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {editingTeamId
                                        ? `แก้ไข ${permanentTeams.find(t => t.id === editingTeamId)?.label ?? ""}`
                                        : `เพิ่มทีม ${permanentTeams.length + 1}`}
                                </span>
                                <span className={`text-[10px] font-bold tabular-nums ${selectedForNew.length === playersPerTeam ? "text-amber-400" : "text-slate-600"}`}>
                                    {selectedForNew.length}/{playersPerTeam} คน
                                </span>
                            </div>

                            {/* Selection preview chip */}
                            {selectedForNew.length > 0 && (
                                <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
                                    <span className="text-[10px] text-amber-400 font-bold shrink-0">เลือก:</span>
                                    <span className="text-xs font-bold text-amber-200 flex-1 truncate">
                                        {selectedForNew.map(p => p.username).join(" + ")}
                                    </span>
                                    <button onClick={() => setSelectedForNew([])} className="text-slate-500 hover:text-red-400 text-sm transition-all shrink-0 active:scale-90">✕</button>
                                </div>
                            )}

                            {/* Player picker */}
                            <div className="max-h-44 overflow-y-auto space-y-1 mb-3 -mx-1 px-1">
                                {players.length === 0 && (
                                    <p className="text-xs text-slate-600 text-center py-6">ไม่มีผู้เล่น</p>
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
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs transition-all active:scale-[0.98] ${isSelected
                                                ? "bg-amber-500/15 border-amber-500/35 text-amber-100"
                                                : isAssigned
                                                    ? "bg-black/10 border-white/5 text-slate-700 cursor-not-allowed"
                                                    : disabled
                                                        ? "bg-white/[0.02] border-white/5 text-slate-700 cursor-not-allowed"
                                                        : "bg-white/[0.04] border-white/[0.07] text-slate-300 active:bg-white/10"
                                            }`}
                                        >
                                            {/* Checkbox circle */}
                                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected
                                                ? "border-amber-400 bg-amber-400"
                                                : isAssigned
                                                    ? "border-slate-700 bg-slate-800"
                                                    : "border-slate-600"
                                            }`}>
                                                {isSelected && <span className="text-[9px] text-black font-black leading-none">✓</span>}
                                                {isAssigned && <span className="text-[8px] text-slate-500 leading-none">🔒</span>}
                                            </span>

                                            <span className="flex-1 font-medium text-left truncate">
                                                {p.username}
                                                {isBusy && <span className="ml-1.5 text-[9px] text-orange-400 font-bold">แข่งอยู่</span>}
                                            </span>

                                            <span className="text-[10px] text-slate-600 shrink-0">{actualPlayerCounts.get(p.id) || 0}แมตซ์</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Save / Cancel */}
                            <div className="flex gap-2">
                                <button
                                    onClick={addOrUpdateTeam}
                                    disabled={selectedForNew.length !== playersPerTeam}
                                    className="flex-1 min-h-[48px] rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed border border-amber-500/30 text-amber-300 font-bold text-xs transition-all"
                                >
                                    {editingTeamId ? "💾 บันทึกการแก้ไข" : "🔒 บันทึกทีมนี้"}
                                </button>
                                {(selectedForNew.length > 0 || editingTeamId) && (
                                    <button
                                        onClick={cancelEdit}
                                        className="w-12 min-h-[48px] rounded-xl border border-white/8 text-slate-500 hover:text-red-400 hover:border-red-500/20 active:scale-95 transition-all flex items-center justify-center shrink-0"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Draw + Faceoff (shown when ≥2 teams) ── */}
                        {permanentTeams.length >= 2 && (
                            <>
                                <div className="mx-4 border-t border-white/5" />
                                <div className="px-4 pt-3 pb-4 space-y-3">
                                    <button
                                        onClick={handleLockedDraw}
                                        disabled={drawing || !jwt}
                                        className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] text-white font-black text-sm transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {drawing ? <>{spinnerSvg}<span>กำลังสุ่ม...</span></>
                                            : <><span>🎲 สุ่มคู่จากทีมถาวร</span></>}
                                    </button>

                                    {/* Faceoff history — wrap chips */}
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">ประวัติการเจอกัน</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {permanentTeams.flatMap((tA, i) =>
                                                permanentTeams.slice(i + 1).map(tB => {
                                                    const count = getFaceoffCount(tA.players.map(p => p.id), tB.players.map(p => p.id));
                                                    return (
                                                        <div
                                                            key={`${tA.id}-${tB.id}`}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8 text-[10px]"
                                                        >
                                                            <span className="text-slate-400">{tA.label} vs {tB.label}</span>
                                                            <span className={`font-black ${count === 0 ? "text-green-400" : count <= 2 ? "text-amber-400" : "text-red-400"}`}>
                                                                {count}×
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
