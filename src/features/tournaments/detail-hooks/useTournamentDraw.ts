import { useState, useMemo } from "react";
import Swal from "sweetalert2";
import { TournamentInfo, ApiMatch, DrawnPair } from "@/features/tournaments/types";
import { lcm, getPartnerRepeats } from "@/features/tournaments/utils/TournamentUtils";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface DrawProps {
    id: string;
    jwt: string | null;
    tournamentInfo: TournamentInfo | null;
    setTournamentInfo: React.Dispatch<React.SetStateAction<TournamentInfo | null>>;
    apiMatches: ApiMatch[];
    pausedPlayerIds: Set<number>;
    showToast: (msg: string, type?: "success" | "error") => void;
    setStarting: React.Dispatch<React.SetStateAction<boolean>>;
    setStartStep: React.Dispatch<React.SetStateAction<string | null>>;
    starting: boolean;
}

export function useTournamentDraw({
    id, jwt, tournamentInfo, setTournamentInfo, apiMatches, pausedPlayerIds, showToast, setStarting, setStartStep, starting
}: DrawProps) {
    const [drawnPairs, setDrawnPairs] = useState<DrawnPair[] | null>(null);
    const [drawMode, setDrawMode] = useState<"random" | "rp_balanced">("random");
    const [roundsPerPlayer, setRoundsPerPlayer] = useState(1);
    const [numCourts, setNumCourts] = useState(2);

    const totalRepeatsCount = useMemo(() => {
        if (!drawnPairs) return 0;
        return drawnPairs.reduce((acc, p, idx) => {
            const ra = getPartnerRepeats(p.teamA.map(x => x.id), idx, apiMatches, drawnPairs);
            const rb = p.teamB ? getPartnerRepeats(p.teamB.map(x => x.id), idx, apiMatches, drawnPairs) : 0;
            return acc + ra + rb;
        }, 0);
    }, [drawnPairs, apiMatches]);

    const handleDrawFair = () => {
        if (!tournamentInfo) return;
        const isDouble = tournamentInfo.type === "double";
        const pPerMatch = isDouble ? 4 : 2;

        const uniquePlayers = Array.from(new Map(tournamentInfo.players.map(p => [p.id, p])).values());
        const playersForDraw = uniquePlayers.filter(p => !pausedPlayerIds.has(p.id));
        const pCount = playersForDraw.length;

        if (pCount < pPerMatch) {
            setDrawnPairs([]);
            return;
        }

        const minRoundsNeeded = lcm(pCount, pPerMatch) / pCount;
        const totalRounds = minRoundsNeeded * (roundsPerPlayer || 1);
        const totalMatches = (pCount * totalRounds) / pPerMatch;

        const partnerHistory = new Map<number, Set<number>>();
        const opponentHistory = new Map<number, Set<number>>();

        apiMatches.forEach(m => {
            if (m.match_status === "cancelled") return;

            [m.team_a_id, m.team_b_id].forEach(t => {
                if (!t) return;
                const pids = t.team_players.map(tp => tp.user_id?.id || (tp.guest_name ? tournamentInfo.players.find(p => p.guest_name === tp.guest_name)?.id : null)).filter((pid): pid is number => !!pid);
                if (pids.length > 1) {
                    for (let i = 0; i < pids.length; i++) {
                        for (let j = i + 1; j < pids.length; j++) {
                            if (!partnerHistory.has(pids[i])) partnerHistory.set(pids[i], new Set());
                            if (!partnerHistory.has(pids[j])) partnerHistory.set(pids[j], new Set());
                            partnerHistory.get(pids[i])!.add(pids[j]);
                            partnerHistory.get(pids[j])!.add(pids[i]);
                        }
                    }
                }
            });

            if (m.team_a_id && m.team_b_id) {
                const aids = m.team_a_id.team_players.map(tp => tp.user_id?.id || (tp.guest_name ? tournamentInfo.players.find(p => p.guest_name === tp.guest_name)?.id : null)).filter((pid): pid is number => !!pid);
                const bids = m.team_b_id.team_players.map(tp => tp.user_id?.id || (tp.guest_name ? tournamentInfo.players.find(p => p.guest_name === tp.guest_name)?.id : null)).filter((pid): pid is number => !!pid);
                aids.forEach(aid => {
                    bids.forEach(bid => {
                        if (!opponentHistory.has(aid)) opponentHistory.set(aid, new Set());
                        if (!opponentHistory.has(bid)) opponentHistory.set(bid, new Set());
                        opponentHistory.get(aid)!.add(bid);
                        opponentHistory.get(bid)!.add(aid);
                    });
                });
            }
        });

        let bestPairs: DrawnPair[] | null = null;
        let minScore = Infinity;

        for (let attempt = 0; attempt < 1000; attempt++) {
            const currentPairs: DrawnPair[] = [];
            const playerMatchCounts = new Map<number, number>();
            playersForDraw.forEach(p => playerMatchCounts.set(p.id, 0));

            const playerUsedInThisSlot = new Set<number>();
            const playerUsedInPreviousSlot = new Set<number>();
            let possible = true;
            let partnerRepeats = 0;
            let opponentRepeats = 0;
            const internalPartners = new Map<number, Set<number>>();
            const internalOpponents = new Map<number, Set<number>>();

            for (let m = 0; m < totalMatches; m++) {
                if (m % numCourts === 0) {
                    playerUsedInPreviousSlot.clear();
                    playerUsedInThisSlot.forEach(id => playerUsedInPreviousSlot.add(id));
                    playerUsedInThisSlot.clear();
                }

                const available = playersForDraw.filter(p =>
                    (playerMatchCounts.get(p.id) || 0) < totalRounds &&
                    !playerUsedInThisSlot.has(p.id)
                );

                if (available.length < pPerMatch) {
                    possible = false;
                    break;
                }

                available.sort((a, b) => {
                    const restedA = playerUsedInPreviousSlot.has(a.id) ? 1 : 0;
                    const restedB = playerUsedInPreviousSlot.has(b.id) ? 1 : 0;
                    if (restedA !== restedB) return restedA - restedB;

                    if (drawMode === "rp_balanced") {
                        const jitterA = Math.random() * 2 - 1;
                        const jitterB = Math.random() * 2 - 1;
                        return ((b.rankings?.[0]?.ranking_points ?? 0) + jitterB) - ((a.rankings?.[0]?.ranking_points ?? 0) + jitterA);
                    } else {
                        return Math.random() - 0.5;
                    }
                });

                const chunk = available.slice(0, pPerMatch);

                chunk.forEach(p => {
                    playerMatchCounts.set(p.id, (playerMatchCounts.get(p.id) || 0) + 1);
                    playerUsedInThisSlot.add(p.id);
                });

                let pair: DrawnPair;
                if (isDouble) {
                    pair = {
                        teamA: [chunk[0], chunk[3]].filter(Boolean),
                        teamB: [chunk[1], chunk[2]].filter(Boolean),
                        servingSide: Math.random() > 0.5 ? "A" : "B"
                    };

                    [pair.teamA, pair.teamB].forEach(team => {
                        if (team && team.length > 1) {
                            const p1 = team[0].id;
                            const p2 = team[1].id;
                            if (partnerHistory.get(p1)?.has(p2)) partnerRepeats++;
                            if (internalPartners.get(p1)?.has(p2)) partnerRepeats += 2;
                            if (!internalPartners.has(p1)) internalPartners.set(p1, new Set());
                            if (!internalPartners.has(p2)) internalPartners.set(p2, new Set());
                            internalPartners.get(p1)!.add(p2);
                            internalPartners.get(p2)!.add(p1);
                        }
                    });

                    pair.teamA.forEach(ta => {
                        pair.teamB?.forEach(tb => {
                            if (opponentHistory.get(ta.id)?.has(tb.id)) opponentRepeats++;
                            if (internalOpponents.get(ta.id)?.has(tb.id)) opponentRepeats += 2;
                            if (!internalOpponents.has(ta.id)) internalOpponents.set(ta.id, new Set());
                            if (!internalOpponents.has(tb.id)) internalOpponents.set(tb.id, new Set());
                            internalOpponents.get(ta.id)!.add(tb.id);
                            internalOpponents.get(tb.id)!.add(ta.id);
                        });
                    });
                } else {
                    pair = {
                        teamA: [chunk[0]].filter(Boolean),
                        teamB: [chunk[1]].filter(Boolean),
                        servingSide: Math.random() > 0.5 ? "A" : "B"
                    };
                    const ta = pair.teamA[0];
                    const tb = pair.teamB![0];
                    if (opponentHistory.get(ta.id)?.has(tb.id)) opponentRepeats++;
                    if (internalOpponents.get(ta.id)?.has(tb.id)) opponentRepeats += 2;
                    if (!internalOpponents.has(ta.id)) internalOpponents.set(ta.id, new Set());
                    if (!internalOpponents.has(tb.id)) internalOpponents.set(tb.id, new Set());
                    internalOpponents.get(ta.id)!.add(tb.id);
                    internalOpponents.get(tb.id)!.add(ta.id);
                }
                currentPairs.push(pair);
            }

            if (!possible) continue;

            let restConflictScore = 0;
            for (let i = numCourts; i < currentPairs.length; i++) {
                const currIds = [
                    ...currentPairs[i].teamA.map(p => p.id),
                    ...(currentPairs[i].teamB?.map(p => p.id) || [])
                ];
                for (let j = i - numCourts; j < i; j++) {
                    if (j < 0) continue;
                    const prevIds = new Set([
                        ...currentPairs[j].teamA.map(p => p.id),
                        ...(currentPairs[j].teamB?.map(p => p.id) || [])
                    ]);
                    currIds.forEach(pid => { if (prevIds.has(pid)) restConflictScore++; });
                }
            }

            const totalScore = (restConflictScore * 1000) + (partnerRepeats * 50) + (opponentRepeats * 50);

            if (totalScore < minScore) {
                minScore = totalScore;
                bestPairs = currentPairs;
                if (totalScore === 0) break;
            }
        }

        if (bestPairs) {
            setDrawnPairs(bestPairs);
            showToast(`จับคู่เรียบร้อย 🎲`, "success");
        } else {
            showToast("ไม่สามารถจัดคู่ที่สมบูรณ์ได้ตามเงื่อนไข กรุณาลองใหม่", "error");
        }
    };

    const postJSON = async (url: string, body: unknown) => {
        const res = await fetch(`${STRAPI_BASE_URL}${url}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message || `HTTP ${res.status} on ${url}`);
        }
        return res.json();
    };

    const handleStartTournament = async () => {
        if (!jwt || starting) return;
        const isEndless = tournamentInfo?.format === "endless_mode";
        if (!isEndless && !drawnPairs) return;

        let matchesToCreate: DrawnPair[] = drawnPairs || [];
        if (isEndless && matchesToCreate.length === 0) {
            const pPerMatch = tournamentInfo?.type === "double" ? 4 : 2;
            if (tournamentInfo!.players.length < pPerMatch) {
                showToast("จำนวนผู้เล่นไม่เพียงพอ", "error");
                return;
            }
            const activePlayers = tournamentInfo!.players.filter(p => !pausedPlayerIds.has(p.id));
            const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
            const teamA = tournamentInfo?.type === "double" ? [shuffled[0], shuffled[3]] : [shuffled[0]];
            const teamB = tournamentInfo?.type === "double" ? [shuffled[1], shuffled[2]] : [shuffled[1]];
            matchesToCreate = [{
                teamA,
                teamB,
                servingSide: Math.random() > 0.5 ? "A" : "B"
            }];
        }

        const result = await Swal.fire({
            title: isEndless ? "เริ่มโหมดไร้สิ้นสุด?" : "ยืนยันเริ่มการแข่งขัน?",
            html: isEndless
                ? `จะเริ่มรายการและสร้าง <b>แมตซ์แรก</b> ให้ทันที<br/><span style="color:#6366f1;font-size:12px">คุณสามารถจัดคู่ถัดไปได้ตลอดเวลา</span>`
                : `จะสร้าง <b>${matchesToCreate.length} แมตซ์</b> และเปลี่ยนสถานะเป็น <b>กำลังแข่ง</b><br/><span style="color:#ef4444;font-size:12px">ไม่สามารถย้อนกลับได้</span>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "🏆 เริ่มเลย!",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#2ecc71",
            cancelButtonColor: "#64748b",
            background: "#1a2535",
            color: "#f1f5f9",
        });
        if (!result.isConfirmed) return;
        setStarting(true);

        const randTeamNo = () => Math.random().toString(36).substring(2, 10).toUpperCase();

        try {
            setStartStep("เตรียมทีมและแมตซ์...");
            const teamIds: { teamA: string; teamB: string | null }[] = [];
            const batchSize = 10;

            for (let i = 0; i < matchesToCreate.length; i += batchSize) {
                const batch = matchesToCreate.slice(i, i + batchSize);
                const batchPromises = batch.map(async (pair) => {
                    const resA = await postJSON("/api/teams", {
                        data: { tournament_id: id, team_no: randTeamNo() },
                    });
                    const teamAId: string = resA.data?.documentId ?? resA.data?.id;

                    let teamBId: string | null = null;
                    if (pair.teamB) {
                        const resB = await postJSON("/api/teams", {
                            data: { tournament_id: id, team_no: randTeamNo() },
                        });
                        teamBId = resB.data?.documentId ?? resB.data?.id;
                    }
                    return { teamA: teamAId, teamB: teamBId };
                });
                const batchResults = await Promise.all(batchPromises);
                teamIds.push(...batchResults);
            }

            setStartStep("บันทึกข้อมูลการแข่งขัน...");
            for (let i = 0; i < matchesToCreate.length; i += batchSize) {
                const batchPairs = matchesToCreate.slice(i, i + batchSize);
                const batchPromises = batchPairs.map(async (pair, batchIdx) => {
                    const globalIdx = i + batchIdx;
                    const { teamA: teamAId, teamB: teamBId } = teamIds[globalIdx];
                    const isBye = !teamBId;

                    const playerAPromises = pair.teamA.map(player =>
                        postJSON("/api/team-players", { data: { team_id: teamAId, ...(player.is_guest ? { guest_name: player.guest_name } : { user_id: player.id }) } })
                    );

                    const playerBPromises = (pair.teamB && teamBId) ? pair.teamB.map(player =>
                        postJSON("/api/team-players", { data: { team_id: teamBId, ...(player.is_guest ? { guest_name: player.guest_name } : { user_id: player.id }) } })
                    ) : [];

                    const matchPromise = postJSON("/api/matches", {
                        data: {
                            tournament_id: id,
                            round: globalIdx + 1,
                            match_no: globalIdx + 1,
                            team_a_id: teamAId,
                            team_b_id: teamBId,
                            score_a: isBye ? 1 : 0,
                            score_b: 0,
                            team_winner: isBye ? teamAId : null,
                            match_status: isBye ? "done" : "upcoming",
                            first_serve: pair.servingSide,
                        },
                    });

                    return Promise.all([...playerAPromises, ...playerBPromises, matchPromise]);
                });
                await Promise.all(batchPromises);
            }

            setStartStep("เปิดการแข่งขัน...");
            const resTournament = await fetch(`${STRAPI_BASE_URL}/api/tournaments/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ data: { tournament_status: "ongoing" } }),
            });
            if (!resTournament.ok) {
                const err = await resTournament.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${resTournament.status}`);
            }

            showToast("เริ่มการแข่งขันแล้ว! 🏆", "success");
            setTournamentInfo((prev) => prev ? { ...prev, tournament_status: "ongoing" } : null);
            setDrawnPairs(null);
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "เริ่มไม่สำเร็จ", "error");
        } finally {
            setStarting(false);
            setStartStep(null);
        }
    };

    return {
        drawnPairs, setDrawnPairs,
        drawMode, setDrawMode,
        roundsPerPlayer, setRoundsPerPlayer,
        numCourts, setNumCourts,
        totalRepeatsCount,
        handleDrawFair, handleStartTournament
    };
}
