"use client";

import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import RankBadge from "../components/RankBadge";

interface ApiPlayer {
    id: number;
    username: string;
    picture?: { url: string } | null;
    rankings?: Array<{ ranking_points: number; rank?: string; stars?: number }> | null;
    tpDocumentId?: string;
    match_offset?: number;
    is_guest?: boolean | null;
    guest_name?: string | null;
}

interface ApiMatch {
    match_no: number;
    match_status: "upcoming" | "live" | "done" | "cancelled";
    team_a_id: { team_players: Array<{ user_id: { id: number } | null }> } | null;
    team_b_id: { team_players: Array<{ user_id: { id: number } | null }> } | null;
}

type PairingMode = "auto" | "manual";

interface PermanentTeam {
    id: string; // local uuid for UI keying
    label: string; // "ทีม 1", "ทีม 2", ...
    players: ApiPlayer[];
}

interface EndlessModeManagerProps {
    tournamentId: string;
    tournamentType: "single" | "double";
    players: ApiPlayer[];
    permanentTeamsData?: any[];
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
    permanentTeamsData,
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
}: EndlessModeManagerProps) {
    const [drawing, setDrawing] = useState(false);
    const [pairingMode, setPairingMode] = useState<PairingMode>("auto");
    const [manualTeamA, setManualTeamA] = useState<ApiPlayer[]>([]);
    const [manualTeamB, setManualTeamB] = useState<ApiPlayer[]>([]);
    const [activeManualTeam, setActiveManualTeam] = useState<"A" | "B">("A");
    const [previewMatch, setPreviewMatch] = useState<{ teamA: ApiPlayer[], teamB: ApiPlayer[] } | null>(null);
    const [selectedSwapPlayer, setSelectedSwapPlayer] = useState<number | null>(null);
    const [showPlayerList, setShowPlayerList] = useState(false);

    // ── Permanent teams (persist across draws) ───────────────────────────
    const [permanentTeams, setPermanentTeams] = useState<PermanentTeam[]>(permanentTeamsData || []);

    useEffect(() => {
        if (permanentTeamsData) {
            setPermanentTeams(permanentTeamsData);
        }
    }, [permanentTeamsData]);

    const [selectedForNew, setSelectedForNew] = useState<ApiPlayer[]>([]);
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
        () => players.filter(p => !busyPlayerIds.has(p.id) && !pausedPlayerIds.has(p.id)),
        [players, busyPlayerIds, pausedPlayerIds]
    );

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

    const getFaceoffCount = (pids1: number[], pids2: number[]) => {
        const key1 = [...pids1].sort((a, b) => a - b).join(",");
        const key2 = [...pids2].sort((a, b) => a - b).join(",");

        let count = 0;
        apiMatches.forEach(m => {
            if (m.match_status === "cancelled") return;
            const mA = m.team_a_id?.team_players.map(getUnifiedPlayerId).filter(Boolean).sort((a, b) => a! - b!).join(",");
            const mB = m.team_b_id?.team_players.map(getUnifiedPlayerId).filter(Boolean).sort((a, b) => a! - b!).join(",");
            if ((mA === key1 && mB === key2) || (mA === key2 && mB === key1)) count++;
        });
        return count;
    };

    const getPartnerHistory = (p1Id: number, p2Id: number) => {
        let count = 0;
        apiMatches.forEach(m => {
            if (m.match_status === "cancelled") return;
            [m.team_a_id, m.team_b_id].forEach(t => {
                if (!t) return;
                const ids = t.team_players.map(getUnifiedPlayerId).filter(Boolean);
                if (ids.length === 2 && ids.includes(p1Id) && ids.includes(p2Id)) count++;
            });
        });
        return count;
    };

    const getIndividualOpponentHistory = (pidsA: number[], pidsB: number[]) => {
        let count = 0;
        apiMatches.forEach(m => {
            if (m.match_status === "cancelled") return;
            const aids = m.team_a_id?.team_players.map(getUnifiedPlayerId).filter(Boolean) as number[] || [];
            const bids = m.team_b_id?.team_players.map(getUnifiedPlayerId).filter(Boolean) as number[] || [];

            pidsA.forEach(pA => {
                pidsB.forEach(pB => {
                    if ((aids.includes(pA) && bids.includes(pB)) || (aids.includes(pB) && bids.includes(pA))) {
                        count++;
                    }
                });
            });
        });
        return count;
    };

    const handleTogglePause = async (player: ApiPlayer) => {
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
    const toggleSelectPlayer = (player: ApiPlayer) => {
        setSelectedForNew(prev => {
            const exists = prev.some(p => p.id === player.id);
            if (exists) return prev.filter(p => p.id !== player.id);
            if (prev.length >= playersPerTeam) return prev;
            return [...prev, player];
        });
    };

    const saveTeamsToDB = async (teams: PermanentTeam[]) => {
        try {
            await fetch(`${STRAPI_BASE_URL}/api/tournaments/${tournamentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ data: { permanent_teams: teams } })
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

    // ── Rank-based skill score (used for team balancing) ──────────────────
    // Converts rank+stars into a linear numeric score:
    // Bronze(0-3) → Silver(4-7) → Gold(8-12) → Platinum(13-18) → Diamond(19-24) → Master(25+)
    const getSkillScore = (p: ApiPlayer): number => {
        const r = p.rankings?.[0];
        if (!r?.rank) return 1000;

        const tierWeights: Record<string, number> = {
            bronze: 1000, silver: 2000, gold: 3000, platinum: 4000, diamond: 5000, master: 6000
        };
        const divisions: Record<string, number> = { 'V': 0, 'IV': 1, 'III': 2, 'II': 3, 'I': 4 };

        const rankParts = r.rank.split(' ');
        const tier = rankParts[0].toLowerCase();
        const div = rankParts[1] || '';
        const stars = r.stars || 0;

        if (tier === 'master') return 6000 + (stars * 10);

        const base = tierWeights[tier] || 1000;
        const divBonus = (divisions[div] || 0) * 200;
        const starBonus = stars * 50;

        return base + divBonus + starBonus;
    };

    // ── FRONTEND MATCHMAKING (Maximum Fairness Engine) ──────────────────────
    const calculateNextMatch = () => {
        const requiredCount = tournamentType === "double" ? 4 : 2;
        if (availablePlayers.length < requiredCount) {
            showToast(`ผู้เล่นไม่พอ (ต้องการ ${requiredCount} คน)`, "error");
            return;
        }

        // 1. Build available entities (Fixed Pairs and Solos)
        type Entity = { type: "team" | "solo", players: ApiPlayer[], matchCount: number };
        const availableEntities: Entity[] = [];
        const usedInTeam = new Set<number>();

        if (tournamentType === "double") {
            permanentTeams.forEach(team => {
                const isAvailable = team.players.every(p => !busyPlayerIds.has(p.id) && !pausedPlayerIds.has(p.id));
                if (isAvailable && team.players.length === 2) {
                    const maxCount = Math.max(...team.players.map(p => effectivePlayerCounts.get(p.id) || 0));
                    availableEntities.push({ type: "team", players: team.players, matchCount: maxCount });
                    team.players.forEach(p => usedInTeam.add(p.id));
                }
            });
        }

        availablePlayers.forEach(p => {
            if (tournamentType === "double" && assignedPlayerIds.has(p.id) && !usedInTeam.has(p.id)) {
                return; 
            }
            if (!usedInTeam.has(p.id)) {
                availableEntities.push({ type: "solo", players: [p], matchCount: effectivePlayerCounts.get(p.id) || 0 });
            }
        });

        const eligiblePlayersCount = availableEntities.reduce((sum, e) => sum + e.players.length, 0);
        if (eligiblePlayersCount < requiredCount) {
            showToast(`ผู้เล่นที่พร้อมจับคู่ไม่พอ (คู่หูบางคนอาจกำลังแข่งหรือพักอยู่)`, "error");
            return;
        }

        // 2. HARD CONSTRAINTS: Find candidate sets of entities that sum exactly to requiredCount
        // Shuffle first to ensure fairness among players with the same matchCount (since JS sort is stable)
        const shuffledEntities = [...availableEntities].sort(() => Math.random() - 0.5);
        // Sort entities by effective matchCount ascending to prioritize players with fewest games
        const sortedEntities = shuffledEntities.sort((a, b) => a.matchCount - b.matchCount);
        // Take a sufficient slice of lowest-count entities (up to 16) to guarantee fast exhaustive search
        const pool = sortedEntities.slice(0, Math.min(16, sortedEntities.length));

        type CandidateSet = { entities: Entity[], maxCount: number, sumCount: number };
        const validSets: CandidateSet[] = [];

        // Recursive helper to generate entity subsets summing to requiredCount players
        const findSubsets = (startIdx: number, current: Entity[], currentPlayers: number) => {
            if (currentPlayers === requiredCount) {
                const allPlayers = current.flatMap(e => e.players);
                const maxCount = Math.max(...allPlayers.map(p => effectivePlayerCounts.get(p.id) || 0));
                const sumCount = allPlayers.reduce((sum, p) => sum + (effectivePlayerCounts.get(p.id) || 0), 0);
                validSets.push({ entities: [...current], maxCount, sumCount });
                return;
            }
            if (currentPlayers > requiredCount) return;

            for (let i = startIdx; i < pool.length; i++) {
                if (currentPlayers + pool[i].players.length <= requiredCount) {
                    current.push(pool[i]);
                    findSubsets(i + 1, current, currentPlayers + pool[i].players.length);
                    current.pop();
                }
            }
        };

        findSubsets(0, [], 0);

        if (validSets.length === 0) {
            showToast("ไม่สามารถจับคู่ได้ (จำนวนคนและรูปแบบทีมถาวรไม่ลงตัว)", "error");
            return;
        }

        // Hard Constraint Filter: Only keep sets with minimum maxCount and minimum sumCount (players who played least)
        const minMaxCount = Math.min(...validSets.map(s => s.maxCount));
        const setsWithMinMax = validSets.filter(s => s.maxCount === minMaxCount);
        const minSumCount = Math.min(...setsWithMinMax.map(s => s.sumCount));
        const hardConstraintQualifiedSets = setsWithMinMax.filter(s => s.sumCount === minSumCount);

        // 3. EXHAUSTIVE COMBINATIONS: Generate all possible matchups from qualified sets and evaluate Weighted Penalty Score
        type MatchupCandidate = { teamA: ApiPlayer[], teamB: ApiPlayer[], penaltyScore: number };
        const evaluatedMatchups: MatchupCandidate[] = [];

        hardConstraintQualifiedSets.forEach(candidate => {
            const teams = candidate.entities.filter(e => e.type === "team").map(e => e.players);
            const solos = candidate.entities.filter(e => e.type === "solo").map(e => e.players[0]);

            const pairings: Array<{ teamA: ApiPlayer[], teamB: ApiPlayer[] }> = [];

            if (tournamentType === "double") {
                if (teams.length === 2) {
                    // 2 Fixed Teams -> only 1 valid pairing
                    pairings.push({ teamA: teams[0], teamB: teams[1] });
                } else if (teams.length === 1 && solos.length === 2) {
                    // 1 Fixed Team + 2 Solos -> Fixed team vs 2 Solos paired together
                    pairings.push({ teamA: teams[0], teamB: [solos[0], solos[1]] });
                } else if (solos.length === 4) {
                    // 4 Solos -> exactly 3 possible Team A vs Team B splits
                    pairings.push({ teamA: [solos[0], solos[1]], teamB: [solos[2], solos[3]] });
                    pairings.push({ teamA: [solos[0], solos[2]], teamB: [solos[1], solos[3]] });
                    pairings.push({ teamA: [solos[0], solos[3]], teamB: [solos[1], solos[2]] });
                }
            } else {
                // Singles (1v1) -> only 1 valid pairing
                if (solos.length === 2) {
                    pairings.push({ teamA: [solos[0]], teamB: [solos[1]] });
                }
            }

            // Calculate Weighted Penalty Score for each generated pairing
            pairings.forEach(({ teamA, teamB }) => {
                let penaltyScore = 0;

                // Add a penalty for players who played recently to prevent back-to-back games
                const maxMatchNo = Math.max(...apiMatches.map(m => m.match_no), 0);
                let recentPlayPenalty = 0;
                [...teamA, ...teamB].forEach(p => {
                    const last = lastMatchPlayed.get(p.id) || -1;
                    if (last > 0 && maxMatchNo > 0) {
                        // If they played very recently, penalty is high
                        const matchesAgo = maxMatchNo - last;
                        if (matchesAgo === 0) recentPlayPenalty += 5000; // Just finished the LAST match
                        else if (matchesAgo === 1) recentPlayPenalty += 2000;
                        else if (matchesAgo === 2) recentPlayPenalty += 500;
                    }
                });
                penaltyScore += recentPlayPenalty;

                if (tournamentType === "double") {
                    // Partner Rotation (× 10,000)
                    const isFixedA = permanentTeams.some(t => t.players.some(p => p.id === teamA[0].id) && t.players.some(p => p.id === teamA[1].id));
                    const isFixedB = permanentTeams.some(t => t.players.some(p => p.id === teamB[0].id) && t.players.some(p => p.id === teamB[1].id));

                    const partnerHistA = isFixedA ? 0 : getPartnerHistory(teamA[0].id, teamA[1].id);
                    const partnerHistB = isFixedB ? 0 : getPartnerHistory(teamB[0].id, teamB[1].id);
                    penaltyScore += (partnerHistA + partnerHistB) * 10000;

                    // Team Matchup Rotation (× 1,000)

                    const teamMatchupCount = getFaceoffCount(teamA.map(p => p.id), teamB.map(p => p.id));
                    penaltyScore += teamMatchupCount * 1000;

                    // Opponent Rotation (× 100)
                    const individualOpponentCount = getIndividualOpponentHistory(teamA.map(p => p.id), teamB.map(p => p.id));
                    penaltyScore += individualOpponentCount * 100;

                    // Skill Balance (× 50)
                    const avgSkillA = teamA.reduce((s, p) => s + getSkillScore(p), 0) / teamA.length;
                    const avgSkillB = teamB.reduce((s, p) => s + getSkillScore(p), 0) / teamB.length;
                    const skillDiff = Math.abs(avgSkillA - avgSkillB);
                    penaltyScore += skillDiff * 50;
                } else {
                    // Single match (1v1)
                    const opponentCount = getFaceoffCount([teamA[0].id], [teamB[0].id]);
                    penaltyScore += opponentCount * 1000;
                    
                    const skillDiff = Math.abs(getSkillScore(teamA[0]) - getSkillScore(teamB[0]));
                    penaltyScore += skillDiff * 50;
                }

                evaluatedMatchups.push({ teamA, teamB, penaltyScore });
            });
        });

        if (evaluatedMatchups.length === 0) {
            showToast("ไม่สามารถสร้างชุดการจับคู่ได้ (รูปแบบทีมหรือผู้เล่นไม่รองรับ)", "error");
            return;
        }

        // 4. TIE BREAKING: Select from combinations with lowest Penalty Score (use random ONLY for tied fairest combinations)
        const minPenalty = Math.min(...evaluatedMatchups.map(m => m.penaltyScore));
        const bestCandidates = evaluatedMatchups.filter(m => Math.abs(m.penaltyScore - minPenalty) < 1e-4);
        const bestPairing = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];

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

            // Trigger Pusher notification
            try {
                await fetch('/api/pusher/trigger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        playerIds: [...previewMatch.teamA.map(p => p.id), ...previewMatch.teamB.map(p => p.id)],
                        matchData: {
                            matchId: json.data?.id || json.id || 0,
                            teamA: previewMatch.teamA.map(p => ({ id: p.id, name: p.username || p.guest_name })),
                            teamB: previewMatch.teamB.map(p => ({ id: p.id, name: p.username || p.guest_name }))
                        }
                    })
                });
            } catch (pusherErr) {
                console.error("Failed to trigger pusher:", pusherErr);
            }

            showToast("สร้างแมตซ์เรียบร้อยแล้ว", "success");
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

            try {
                await fetch('/api/pusher/trigger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        playerIds: [...manualTeamA.map(p => p.id), ...manualTeamB.map(p => p.id)],
                        matchData: {
                            matchId: json.data?.id || json.id || 0,
                            teamA: manualTeamA.map(p => ({ id: p.id, name: p.username || p.guest_name })),
                            teamB: manualTeamB.map(p => ({ id: p.id, name: p.username || p.guest_name }))
                        }
                    })
                });
            } catch (pusherErr) {
                console.error("Failed to trigger pusher:", pusherErr);
            }

            showToast("สร้างแมตซ์เรียบร้อยแล้ว", "success");
            setManualTeamA([]);
            setManualTeamB([]);
            await refreshInfo();
            setTimeout(() => {
                document.getElementById("match-schedule")?.scrollIntoView({ behavior: "smooth" });
            }, 300);
        } catch (e: any) {
            await Swal.fire({
                title: "ไม่สามารถสร้างแมตซ์ได้",
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

    const handleEditOffset = async (player: ApiPlayer, currentCount: number) => {
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
    return (
        <div id="endless-manager" className="bg-gradient-to-br from-indigo-950/70 to-slate-900/90 border border-indigo-500/20 rounded-2xl overflow-hidden shadow-xl relative">
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

                {/* ══════════════════ MATCHMAKER ══════════════════ */}
                <div className="px-4 pb-4 pt-4 space-y-2">
                        {/* Tab Switcher */}
                        <div className="flex bg-white/5 rounded-xl p-1 mb-3">
                            <button
                                onClick={() => setPairingMode('auto')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${pairingMode === 'auto' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                🎲 สุ่มอัตโนมัติ
                            </button>
                            <button
                                onClick={() => { setPairingMode('manual'); setPreviewMatch(null); }}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${pairingMode === 'manual' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                ✍️ จัดคู่เอง
                            </button>
                        </div>

                        {/* Preview Match Card */}
                        {pairingMode === 'auto' && previewMatch && (
                            <div className="mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/10">
                                    <div className="px-4 py-2.5 bg-indigo-500/20 border-b border-indigo-500/20 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">🏸 คู่แข่งขันถัดไป <span className="text-[9px] font-normal text-indigo-400 ml-2">(แตะ 2 ครั้งเพื่อสลับตัว)</span></span>
                                        <button onClick={() => { setPreviewMatch(null); setSelectedSwapPlayer(null); }} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90">✕</button>
                                    </div>
                                    <div className="p-3 space-y-3">
                                        {/* Team A */}
                                        <div>
                                            <div className="text-[9px] text-indigo-400 uppercase font-black mb-2 tracking-[0.2em] px-1">ทีม A</div>
                                            <div className="space-y-2">
                                                {previewMatch.teamA.map(p => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => {
                                                            if (selectedSwapPlayer === p.id) {
                                                                setSelectedSwapPlayer(null);
                                                            } else if (selectedSwapPlayer && previewMatch.teamB.some(b => b.id === selectedSwapPlayer)) {
                                                                const newTeamA = [...previewMatch.teamA];
                                                                const newTeamB = [...previewMatch.teamB];
                                                                const indexA = newTeamA.findIndex(a => a.id === p.id);
                                                                const indexB = newTeamB.findIndex(b => b.id === selectedSwapPlayer);
                                                                const temp = newTeamA[indexA];
                                                                newTeamA[indexA] = newTeamB[indexB];
                                                                newTeamB[indexB] = temp;
                                                                setPreviewMatch({ ...previewMatch, teamA: newTeamA, teamB: newTeamB });
                                                                setSelectedSwapPlayer(null);
                                                            } else {
                                                                setSelectedSwapPlayer(p.id);
                                                            }
                                                        }}
                                                        className={`flex items-center gap-3 py-2.5 px-4 rounded-2xl border shadow-inner cursor-pointer transition-all active:scale-[0.98] ${selectedSwapPlayer === p.id
                                                                ? "bg-yellow-500/20 border-yellow-400 ring-2 ring-yellow-400/50 shadow-yellow-500/20"
                                                                : "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]"
                                                            }`}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-sm font-bold text-white truncate">{p.username}</span>
                                                                <span className="text-[10px] text-slate-500 font-bold shrink-0">{actualPlayerCounts.get(p.id) || 0} แมตซ์</span>
                                                            </div>
                                                            <div className="mt-1 flex items-center gap-2">
                                                                {tournamentMode === 'ranking' && <RankBadge rank={p.rankings?.[0]?.rank} stars={p.rankings?.[0]?.stars} showName={true} size="sm" />}
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 text-slate-500 opacity-50 text-xs">↕️</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* VS Divider */}
                                        <div className="py-2 flex items-center gap-3">
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[11px] font-black text-white shadow-xl shadow-indigo-500/20 rotate-45">
                                                <span className="-rotate-45">VS</span>
                                            </div>
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                                        </div>

                                        {/* Team B */}
                                        <div>
                                            <div className="text-[9px] text-indigo-400 uppercase font-black mb-2 tracking-[0.2em] px-1">ทีม B</div>
                                            <div className="space-y-2">
                                                {previewMatch.teamB.map(p => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => {
                                                            if (selectedSwapPlayer === p.id) {
                                                                setSelectedSwapPlayer(null);
                                                            } else if (selectedSwapPlayer && previewMatch.teamA.some(a => a.id === selectedSwapPlayer)) {
                                                                const newTeamA = [...previewMatch.teamA];
                                                                const newTeamB = [...previewMatch.teamB];
                                                                const indexB = newTeamB.findIndex(b => b.id === p.id);
                                                                const indexA = newTeamA.findIndex(a => a.id === selectedSwapPlayer);
                                                                const temp = newTeamB[indexB];
                                                                newTeamB[indexB] = newTeamA[indexA];
                                                                newTeamA[indexA] = temp;
                                                                setPreviewMatch({ ...previewMatch, teamA: newTeamA, teamB: newTeamB });
                                                                setSelectedSwapPlayer(null);
                                                            } else {
                                                                setSelectedSwapPlayer(p.id);
                                                            }
                                                        }}
                                                        className={`flex items-center gap-3 py-2.5 px-4 rounded-2xl border shadow-inner cursor-pointer transition-all active:scale-[0.98] ${selectedSwapPlayer === p.id
                                                                ? "bg-yellow-500/20 border-yellow-400 ring-2 ring-yellow-400/50 shadow-yellow-500/20"
                                                                : "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]"
                                                            }`}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-sm font-bold text-white truncate">{p.username}</span>
                                                                <span className="text-[10px] text-slate-500 font-bold shrink-0">{actualPlayerCounts.get(p.id) || 0} แมตซ์</span>
                                                            </div>
                                                            <div className="mt-1 flex items-center gap-2">
                                                                {tournamentMode === 'ranking' && <RankBadge rank={p.rankings?.[0]?.rank} stars={p.rankings?.[0]?.stars} showName={true} size="sm" />}
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 text-slate-500 opacity-50 text-xs">↕️</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={handleConfirmMatch}
                                                disabled={drawing}
                                                className="flex-1 min-h-[44px] rounded-xl bg-green-500 hover:bg-green-400 active:scale-[0.97] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                                            >
                                                {drawing ? spinnerSvg : "✅ ตกลงและเริ่มแข่ง"}
                                            </button>
                                            <button
                                                onClick={() => { calculateNextMatch(); setSelectedSwapPlayer(null); }}
                                                className="min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all text-lg"
                                                title="สุ่มใหม่"
                                            >
                                                🔄
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Compact player status bar — toggleable */}
                        {jwt && (
                            <div>
                                <button
                                    onClick={() => setShowPlayerList(!showPlayerList)}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-slate-400 hover:text-slate-200 transition-all active:scale-[0.98]"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="text-[10px]">👥</span>
                                        <span className="font-medium">ผู้เล่น {availablePlayers.length}/{players.length} ว่าง</span>
                                        {pausedPlayerIds.size > 0 && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 font-bold">{pausedPlayerIds.size} พัก</span>
                                        )}
                                    </span>
                                    <span className={`transition-transform duration-200 ${showPlayerList ? "rotate-180" : ""}`}>▾</span>
                                </button>

                                {showPlayerList && (
                                    <div className="mt-2 space-y-1 max-h-52 overflow-y-auto">
                                        {[...players]
                                            .sort((a, b) => {
                                                if (busyPlayerIds.has(a.id) && !busyPlayerIds.has(b.id)) return 1;
                                                if (!busyPlayerIds.has(a.id) && busyPlayerIds.has(b.id)) return -1;
                                                if (pausedPlayerIds.has(a.id) && !pausedPlayerIds.has(b.id)) return 1;
                                                if (!pausedPlayerIds.has(a.id) && pausedPlayerIds.has(b.id)) return -1;
                                                return (actualPlayerCounts.get(a.id) || 0) - (actualPlayerCounts.get(b.id) || 0);
                                            })
                                            .map(p => {
                                                const isBusy = busyPlayerIds.has(p.id);
                                                const isPaused = pausedPlayerIds.has(p.id);
                                                return (
                                                    <div key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isBusy ? "bg-orange-500/5 border-orange-500/15 opacity-60"
                                                            : isPaused ? "bg-yellow-500/5 border-yellow-500/15 opacity-70"
                                                                : "bg-white/[0.03] border-white/[0.05]"
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isBusy ? "bg-orange-400 animate-pulse" : isPaused ? "bg-yellow-500" : "bg-green-400"
                                                            }`} />
                                                        <span className={`flex-1 text-xs font-medium truncate ${isBusy || isPaused ? "text-slate-500" : "text-slate-200"
                                                            }`}>
                                                            {p.username}
                                                        </span>
                                                        {tournamentMode === 'ranking' && <RankBadge rank={p.rankings?.[0]?.rank} stars={p.rankings?.[0]?.stars} size="sm" showName={false} />}
                                                        {isBusy && <span className="text-[9px] text-orange-400 font-bold shrink-0">แข่งอยู่</span>}
                                                        {isPaused && !isBusy && <span className="text-[9px] text-yellow-500 font-bold shrink-0">พัก</span>}
                                                        <span className="text-[10px] text-slate-600 shrink-0">{actualPlayerCounts.get(p.id) || 0}แมตซ์</span>
                                                        {!isBusy && (
                                                            <button
                                                                onClick={() => handleTogglePause(p as ApiPlayer)}
                                                                className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-90 ${isPaused
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
                                )}
                            </div>
                        )}

                        {/* Draw button */}
                        {pairingMode === 'auto' && !previewMatch && (
                            <button
                                onClick={calculateNextMatch}
                                disabled={drawing || !jwt || availablePlayers.length < (tournamentType === "double" ? 4 : 2)}
                                className="w-full min-h-[52px] mt-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 active:scale-[0.98] text-white font-black text-sm transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {drawing ? <>{spinnerSvg}<span>กำลังสุ่ม...</span></>
                                    : !jwt ? <span>🔒 เข้าสู่ระบบเพื่อสุ่ม</span>
                                        : availablePlayers.length < (tournamentType === "double" ? 4 : 2) ? <span>⏳ รอผู้เล่นว่าง...</span>
                                            : <><span>🎲 สุ่มแมตซ์ถัดไป</span></>}
                            </button>
                        )}

                        {/* Manual Pairing UI */}
                        {pairingMode === 'manual' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                {/* Team Slots */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setActiveManualTeam("A")}
                                        className={`flex-1 p-3 rounded-2xl border transition-all text-left ${activeManualTeam === "A" ? "bg-indigo-500/20 border-indigo-400 ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-500/20" : "bg-white/[0.03] border-white/10 hover:bg-white/[0.08]"}`}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">ทีม A</span>
                                            <span className="text-[10px] text-slate-400">{manualTeamA.length}/{playersPerTeam}</span>
                                        </div>
                                        <div className="space-y-1">
                                            {manualTeamA.length === 0 ? <div className="text-xs text-slate-500 italic py-1">เลือกผู้เล่น...</div> : null}
                                            {manualTeamA.map(p => (
                                                <div key={p.id} className="flex justify-between items-center bg-black/20 rounded-lg px-2 py-1.5" onClick={(e) => { e.stopPropagation(); setManualTeamA(manualTeamA.filter(x => x.id !== p.id)); }}>
                                                    <span className="text-xs font-bold text-white truncate">{p.username}</span>
                                                    <span className="text-slate-400 text-xs">✕</span>
                                                </div>
                                            ))}
                                        </div>
                                    </button>
                                    
                                    <button
                                        onClick={() => setActiveManualTeam("B")}
                                        className={`flex-1 p-3 rounded-2xl border transition-all text-left ${activeManualTeam === "B" ? "bg-rose-500/20 border-rose-400 ring-2 ring-rose-400/50 shadow-lg shadow-rose-500/20" : "bg-white/[0.03] border-white/10 hover:bg-white/[0.08]"}`}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">ทีม B</span>
                                            <span className="text-[10px] text-slate-400">{manualTeamB.length}/{playersPerTeam}</span>
                                        </div>
                                        <div className="space-y-1">
                                            {manualTeamB.length === 0 ? <div className="text-xs text-slate-500 italic py-1">เลือกผู้เล่น...</div> : null}
                                            {manualTeamB.map(p => (
                                                <div key={p.id} className="flex justify-between items-center bg-black/20 rounded-lg px-2 py-1.5" onClick={(e) => { e.stopPropagation(); setManualTeamB(manualTeamB.filter(x => x.id !== p.id)); }}>
                                                    <span className="text-xs font-bold text-white truncate">{p.username}</span>
                                                    <span className="text-slate-400 text-xs">✕</span>
                                                </div>
                                            ))}
                                        </div>
                                    </button>
                                </div>

                                {/* Confirm Button */}
                                {manualTeamA.length === playersPerTeam && manualTeamB.length === playersPerTeam && (
                                    <button
                                        onClick={handleConfirmManualMatch}
                                        disabled={drawing}
                                        className="w-full min-h-[48px] rounded-xl bg-green-500 hover:bg-green-400 active:scale-[0.97] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                                    >
                                        {drawing ? spinnerSvg : "✅ ยืนยันสร้างแมตซ์"}
                                    </button>
                                )}

                                {/* Available Players List for Manual Mode */}
                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                                    <div className="text-[10px] text-slate-400 mb-2">เลือกผู้เล่นเข้า {activeManualTeam === "A" ? "ทีม A" : "ทีม B"} ({availablePlayers.length} ว่าง)</div>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {[...availablePlayers]
                                            .sort((a, b) => (actualPlayerCounts.get(a.id) || 0) - (actualPlayerCounts.get(b.id) || 0))
                                            .map(p => {
                                                const isInTeamA = manualTeamA.some(x => x.id === p.id);
                                                const isInTeamB = manualTeamB.some(x => x.id === p.id);
                                                const isSelected = isInTeamA || isInTeamB;
                                                const teamIsFull = (activeManualTeam === "A" ? manualTeamA.length : manualTeamB.length) >= playersPerTeam;
                                                
                                                return (
                                                    <button
                                                        key={p.id}
                                                        disabled={isSelected || teamIsFull}
                                                        onClick={() => {
                                                            if (activeManualTeam === "A") setManualTeamA([...manualTeamA, p]);
                                                            else setManualTeamB([...manualTeamB, p]);
                                                        }}
                                                        className={`w-full flex justify-between items-center p-2 rounded-xl border text-left transition-all ${isSelected ? "opacity-30 bg-black/10 border-transparent" : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08] active:scale-[0.98]"}`}
                                                    >
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-200">{p.username}</div>
                                                            <div className="text-[9px] text-slate-500 mt-0.5">{actualPlayerCounts.get(p.id) || 0} แมตซ์</div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {tournamentMode === 'ranking' && <RankBadge rank={p.rankings?.[0]?.rank} stars={p.rankings?.[0]?.stars} size="sm" showName={false} />}
                                                            {isSelected && <span className="text-[9px] font-bold text-slate-500 bg-white/10 px-1.5 py-0.5 rounded">{isInTeamA ? "A" : "B"}</span>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        {availablePlayers.length === 0 && <div className="text-xs text-center text-slate-500 py-4">ไม่มีผู้เล่นว่าง</div>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                {/* ══════════════════ FIXED PAIRS ══════════════════ */}
                <div className="pb-4">
                    {/* ── Existing permanent teams ── */}
                        {permanentTeams.length > 0 && (
                            <div className="px-4 pt-2 pb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ทีมถาวร</span>
                                    <span className="text-[10px] text-slate-600">{permanentTeams.length} ทีม</span>
                                </div>
                                <div className="space-y-1.5">
                                    {[...permanentTeams]
                                        .sort((a, b) => (a.players.some(p => busyPlayerIds.has(p.id)) ? 1 : 0) - (b.players.some(p => busyPlayerIds.has(p.id)) ? 1 : 0))
                                        .map((team, idx) => {
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
                                                        <div className="mt-2 space-y-1.5">
                                                            {team.players.map(p => (
                                                                <div key={p.id} className="flex items-center gap-2">
                                                                    {tournamentMode === 'ranking' && <RankBadge rank={p.rankings?.[0]?.rank} stars={p.rankings?.[0]?.stars} size="sm" showName={true} />}
                                                                    <span className="text-[11px] font-bold text-white truncate">{p.username}</span>
                                                                </div>
                                                            ))}
                                                        </div>
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
                                    const canManage = !!userId; // any logged-in user can pause/resume
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

                                            <span
                                                onClick={(e) => { e.stopPropagation(); canManage && handleEditOffset(p as ApiPlayer, actualPlayerCounts.get(p.id) || 0); }}
                                                role="button"
                                                className={`text-[10px] shrink-0 cursor-pointer ${canManage ? "text-indigo-400 hover:text-indigo-300 underline underline-offset-2" : "text-slate-600"}`}
                                                title={canManage ? "ปรับจำนวนแมตช์" : undefined}
                                            >
                                                {actualPlayerCounts.get(p.id) || 0}แมตซ์ {canManage && "✏️"}
                                            </span>
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
                    </div>

            </div>
        </div>
    );
}
