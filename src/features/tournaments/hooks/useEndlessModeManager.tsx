import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";

import { RegisteredPlayer, ApiMatch } from "../types";

export type PairingMode = "auto" | "manual";

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

    // ── Rank-based skill score (used for team balancing) ──────────────────
    // Converts rank+stars into a linear numeric score:
    // Bronze(0-3) → Silver(4-7) → Gold(8-12) → Platinum(13-18) → Diamond(19-24) → Master(25+)
    const getSkillScore = (p: RegisteredPlayer): number => {
        const skill = p.skill_level || '';
        switch (skill) {
            case 'หน้าบ้าน': return 1;
            case 'BG': return 2;
            case 'N': return 3;
            case 'S': return 4;
            case 'P': return 5;
            default: return 1; // Default to lowest if not specified
        }
    };

    // ── FRONTEND MATCHMAKING (Maximum Fairness Engine) ──────────────────────
    const calculateNextMatch = () => {
        const requiredCount = tournamentType === "double" ? 4 : 2;
        if (availablePlayers.length < requiredCount) {
            showToast(`ผู้เล่นไม่พอ (ต้องการ ${requiredCount} คน)`, "error");
            return;
        }

        // 1. Build available entities (Fixed Pairs and Solos)
        type Entity = { type: "team" | "solo", players: RegisteredPlayer[], matchCount: number };
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

        // 3. EXHAUSTIVE COMBINATIONS: Evaluate possible matchups across candidate entity sets
        // Sort candidate sets by fairness (min maxCount, then min sumCount)
        const sortedCandidateSets = [...validSets].sort((a, b) => {
            if (a.maxCount !== b.maxCount) return a.maxCount - b.maxCount;
            return a.sumCount - b.sumCount;
        });

        type MatchupCandidate = { teamA: RegisteredPlayer[], teamB: RegisteredPlayer[], penaltyScore: number, isBlocked: boolean };
        const evaluatedMatchups: MatchupCandidate[] = [];

        // Evaluate top candidates (up to 20 sets) to guarantee diverse unblocked pairings
        const candidateSetsToEvaluate = sortedCandidateSets.slice(0, Math.min(20, sortedCandidateSets.length));

        candidateSetsToEvaluate.forEach(candidate => {
            const teams = candidate.entities.filter(e => e.type === "team").map(e => e.players);
            const solos = candidate.entities.filter(e => e.type === "solo").map(e => e.players[0]);

            const pairings: Array<{ teamA: RegisteredPlayer[], teamB: RegisteredPlayer[] }> = [];

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

                // Candidate fairness weight: prioritize players with fewer matches
                penaltyScore += candidate.maxCount * 2_000_000 + candidate.sumCount * 200_000;

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

                let isBlocked = false;
                if (tournamentType === "double") {
                    // Blocked Partner check (Anti-Teammate constraint)
                    const isBlockedA = isBlockedTeammates(teamA[0].id, teamA[1].id);
                    const isBlockedB = isBlockedTeammates(teamB[0].id, teamB[1].id);
                    isBlocked = isBlockedA || isBlockedB;
                    if (isBlocked) {
                        penaltyScore += 100_000_000_000;
                    }

                    // Partner Rotation (× 100,000) - Strongly avoid same partners
                    const isFixedA = permanentTeams.some(t => t.players.some(p => p.id === teamA[0].id) && t.players.some(p => p.id === teamA[1].id));
                    const isFixedB = permanentTeams.some(t => t.players.some(p => p.id === teamB[0].id) && t.players.some(p => p.id === teamB[1].id));

                    const partnerHistA = isFixedA ? 0 : getPartnerHistory(teamA[0].id, teamA[1].id);
                    const partnerHistB = isFixedB ? 0 : getPartnerHistory(teamB[0].id, teamB[1].id);
                    penaltyScore += (partnerHistA + partnerHistB) * 100000;

                    // Team Matchup Rotation (× 20,000) - Avoid same 2v2 exactly
                    const teamMatchupCount = getFaceoffCount(teamA.map(p => p.id), teamB.map(p => p.id));
                    penaltyScore += teamMatchupCount * 20000;

                    // Opponent Rotation (× 10,000) - Avoid playing against the same person
                    const individualOpponentCount = getIndividualOpponentHistory(teamA.map(p => p.id), teamB.map(p => p.id));
                    penaltyScore += individualOpponentCount * 10000;

                    // Skill Balance (× 500,000) - Most important: must be perfectly balanced
                    const avgSkillA = teamA.reduce((s, p) => s + getSkillScore(p), 0) / teamA.length;
                    const avgSkillB = teamB.reduce((s, p) => s + getSkillScore(p), 0) / teamB.length;
                    const skillDiff = Math.abs(avgSkillA - avgSkillB);
                    penaltyScore += skillDiff * 500000;
                } else {
                    // Single match (1v1)
                    const opponentCount = getFaceoffCount([teamA[0].id], [teamB[0].id]);
                    penaltyScore += opponentCount * 20000;
                    
                    const skillDiff = Math.abs(getSkillScore(teamA[0]) - getSkillScore(teamB[0]));
                    penaltyScore += skillDiff * 500000;
                }

                evaluatedMatchups.push({ teamA, teamB, penaltyScore, isBlocked });
            });
        });

        if (evaluatedMatchups.length === 0) {
            showToast("ไม่สามารถสร้างชุดการจับคู่ได้ (รูปแบบทีมหรือผู้เล่นไม่รองรับ)", "error");
            return;
        }

        // 4. HARD FILTER: Discard any pairing with blocked teammates whenever unblocked pairings exist
        const unblocked = tournamentType === "double"
            ? evaluatedMatchups.filter(m => !m.isBlocked)
            : evaluatedMatchups;

        const candidatePool = unblocked.length > 0 ? unblocked : evaluatedMatchups;

        // 5. TIE BREAKING: Select from combinations with lowest Penalty Score (use random ONLY for tied fairest combinations)
        const minPenalty = Math.min(...candidatePool.map(m => m.penaltyScore));
        const bestCandidates = candidatePool.filter(m => Math.abs(m.penaltyScore - minPenalty) < 1e-4);
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
