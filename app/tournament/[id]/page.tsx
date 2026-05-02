"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";
import Swal from "sweetalert2";
import EndlessModeManager from "./EndlessModeManager";


import {
    TournamentStatus,
    RegisteredPlayer,
    TournamentInfo,
    ApiRanking,
    ApiPlayer,
    ApiTeam,
    ApiMatchHistory,
    ApiMatch,
    MatchStatus,
    TMatch,
    GroupPlayer,
    DrawnPair,
    User
} from "../TournamentTypes";
import {
    calcStandings,
    calculateExpectedMmrChange,
    gcd,
    lcm,
    getPartnerRepeats
} from "../TournamentUtils";
import ScoreModal from "./ScoreModal";
import MatchRow from "./MatchRow";
import BracketView from "./BracketView";
import TournamentHeader from "./TournamentHeader";
import FullScoreEditorModal from "./FullScoreEditorModal";
import ParticipantsList from "./ParticipantsList";
import DrawSection from "./DrawSection";
import MatchSchedule from "./MatchSchedule";
import QRInviteModal from "./QRInviteModal";
import KnockoutManager from "./KnockoutManager";


const STRAPI_BASE_URL =
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

const GRADIENT_ANIMATION_STYLE = `
  @keyframes gradient-x {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  .animate-gradient-x {
    background-size: 200% auto;
    animation: gradient-x 3s linear infinite;
  }
  @keyframes bounce-subtle {
    0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
    50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
  }
  .animate-bounce-subtle {
    animation: bounce-subtle 2s infinite;
  }
`;

const groupDefs = [
    { id: "group-A", label: "สาย A", players: ["โอม", "ณัฐ", "กร", "บาส"], dot: "bg-blue-400" },
    { id: "group-B", label: "สาย B", players: ["ต้น", "พลอย", "ใหม่", "ฝน"], dot: "bg-green-400" },
];

/* ─── Main Page ─── */
type Tab = "groups" | "bracket";

export default function TournamentDetailPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const { user, jwt } = useAuth();
    const [apiMatches, setApiMatches] = useState<ApiMatch[]>([]);
    const [scoreEditing, setScoreEditing] = useState<ApiMatch | null>(null);
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [savingScore, setSavingScore] = useState(false);
    const [showScoreEdit, setShowScoreEdit] = useState(false);
    const [courtInput, setCourtInput] = useState("");
    const [timeInput, setTimeInput] = useState("");
    const [pausedPlayerIds, setPausedPlayerIds] = useState<Set<number>>(new Set());
    
    const [showQR, setShowQR] = useState(false);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const shareUrl = `${appUrl}/tournament/${id}`;

    const fetchMatches = (token = jwt, formatArg?: string) => {
        if (!token || !id) return Promise.resolve();
        const fmt = formatArg || tournamentInfo?.format;
        const sortOrder = fmt === "endless_mode" ? "desc" : "asc";
        return fetch(
            `${STRAPI_BASE_URL}/api/matches?filters[tournament_id][documentId][$eq]=${id}&populate[team_a_id][populate][team_players][populate][user_id][populate][rankings][filters][season][is_active][$eq]=true&populate[team_a_id][populate][team_players][populate][user_id][populate][picture][fields][0]=url&populate[team_b_id][populate][team_players][populate][user_id][populate][rankings][filters][season][is_active][$eq]=true&populate[team_b_id][populate][team_players][populate][user_id][populate][picture][fields][0]=url&populate[match_histories][populate][users][fields]=*&populate[team_winner][fields][0]=id&populate[team_winner][fields][1]=documentId&sort=match_no:${sortOrder}&pagination[pageSize]=100`,
            { headers: { Authorization: `Bearer ${token}` } }
        )
            .then((r) => r.json())
            .then((json) => setApiMatches(json.data ?? []))
            .catch(() => { /* silent */ });
    };

    // Delete state
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    // Tournament info from API
    const [tournamentInfo, setTournamentInfo] = useState<TournamentInfo | null>(null);

    const playerMatchCounts = useMemo(() => {
        const counts: Record<number, number> = {};

        // Add manual offsets first
        tournamentInfo?.players.forEach(p => {
             counts[p.id] = p.match_offset || 0;
        });

        // Count only matches that are completed (scored)
        apiMatches.forEach(match => {
            if (match.match_status !== "done") return;
            [match.team_a_id, match.team_b_id].forEach(team => {
                team?.team_players.forEach(tp => {
                    if (tp.user_id) {
                        counts[tp.user_id.id] = (counts[tp.user_id.id] || 0) + 1;
                    }
                });
            });
        });

        if (tournamentInfo?.format === "endless_mode") {
            const played = Object.values(counts).filter(c => c > 0).sort((a, b) => a - b);
            if (played.length > 0) {
                // Find true minimum of the main group (excluding recent joiners who drag the minimum down)
                const median = played[Math.floor(played.length / 2)];
                const mainGroup = played.filter(c => c >= median - 1);
                const trueMin = mainGroup.length > 0 ? Math.min(...mainGroup) : median;
                
                Object.keys(counts).forEach(idStr => {
                    const id = Number(idStr);
                    if ((counts[id] || 0) < trueMin) {
                        counts[id] = trueMin;
                    }
                });
            }
        }

        return counts;
    }, [apiMatches, tournamentInfo]);

    // Sync paused state from DB
    useEffect(() => {
        if (tournamentInfo?.players) {
            const paused = new Set<number>();
            tournamentInfo.players.forEach(p => {
                if (p.is_paused) paused.add(p.id);
            });
            setPausedPlayerIds(paused);
        }
    }, [tournamentInfo?.players]);

    useEffect(() => {
        if (!jwt || !id) return;
        fetch(
            `${STRAPI_BASE_URL}/api/tournaments/${id}?populate[tournament_players][populate][user][populate][picture][fields][0]=url&populate[tournament_players][populate][user][populate][rankings][filters][season][is_active][$eq]=true&populate[user_created][populate][picture][fields][0]=url&populate[user_created][populate][rankings][filters][season][is_active][$eq]=true`,
            { headers: { Authorization: `Bearer ${jwt}` } }
        )
            .then((r) => r.json())
            .then((json) => {
                const data = json.data ?? json;
                const tpArr: Array<{ documentId?: string; id?: number | string; is_paused?: boolean; user?: Omit<RegisteredPlayer, "tpDocumentId" | "is_paused"> }> = data.tournament_players ?? [];
                setTournamentInfo({
                    name: data.name ?? "",
                    tournament_status: data.tournament_status ?? "upcoming",
                    type: data.type ?? "single",
                    format: data.format ?? "round_robin",
                    startDate: data.startDate ?? "",
                    mode: data.mode ?? "ranking",
                    players: tpArr
                        .filter((tp) => !!tp.user)
                        .reduce((acc, current) => {
                            const x = acc.find(item => item.id === current.user!.id);
                            if (!x) {
                                return acc.concat([{ ...current.user!, tpDocumentId: String(current.documentId || current.id || ""), is_paused: current.is_paused || false }]);
                            } else {
                                return acc;
                            }
                        }, [] as RegisteredPlayer[]),
                    permanent_teams: data.permanent_teams || [],
                    user_created: data.user_created ? { id: data.user_created.id || data.user_created } : (data.user_id ? { id: data.user_id } : null),
                });
            })
            .catch(() => { /* silent */ });
    }, [jwt, id]);

    // Auto-fetch matches when tournament is ongoing/completed
    useEffect(() => {
        if (tournamentInfo?.tournament_status === 'ongoing' || tournamentInfo?.tournament_status === 'completed') {
            fetchMatches();
        }
    }, [tournamentInfo?.tournament_status]);

    const refreshInfo = () => {
        if (!jwt || !id) return Promise.resolve();
        return fetch(
            `${STRAPI_BASE_URL}/api/tournaments/${id}?populate[tournament_players][populate][user][populate][picture][fields][0]=url&populate[tournament_players][populate][user][populate][rankings][filters][season][is_active][$eq]=true&populate[user_created][populate][picture][fields][0]=url&populate[user_created][populate][rankings][filters][season][is_active][$eq]=true`,
            { headers: { Authorization: `Bearer ${jwt}` } }
        )
            .then((r) => r.json())
            .then((json) => {
                const data = json.data ?? json;
                const tpArr: Array<{ documentId?: string; id?: number | string; is_paused?: boolean; match_offset?: number; user?: Omit<RegisteredPlayer, "tpDocumentId" | "is_paused" | "match_offset"> }> = data.tournament_players ?? [];
                setTournamentInfo((prev) => prev ? {
                    ...prev,
                    startDate: data.startDate ?? prev.startDate,
                    mode: data.mode ?? prev.mode,
                    players: tpArr
                        .filter((tp) => !!tp.user)
                        .map((tp) => ({ ...tp.user!, tpDocumentId: String(tp.documentId || tp.id || ""), is_paused: tp.is_paused || false, match_offset: tp.match_offset || 0 })),
                    permanent_teams: data.permanent_teams || [],
                    user_created: data.user_created ? { id: data.user_created.id || data.user_created } : (data.user_id ? { id: data.user_id } : null),
                } : null);
                // Also refresh matches correctly
                return fetchMatches(jwt, data.format);
            })
            .catch(() => { /* silent */ });
    };

    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);

    const isJoined = tournamentInfo?.players.some((p) => p.id === user?.id) ?? false;
    const myEntry = tournamentInfo?.players.find((p) => p.id === user?.id);

    const handleJoin = async () => {
        const isEndless = tournamentInfo?.format === "endless_mode";
        const canJoin = tournamentInfo?.tournament_status === "upcoming" || (isEndless && tournamentInfo?.tournament_status === "ongoing");
        if (!jwt || !user || joining || !canJoin) return;
        // Final guard: check if already joined to prevent duplicates
        if (tournamentInfo.players.some(p => p.id === user.id)) {
            showToast("คุณเข้าร่วมการแข่งขันนี้แล้ว", "error");
            return;
        }

        setJoining(true);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournament-players`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ data: { tournament_id: id, user: user.id, seed: null } }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }
            showToast("เข้าร่วมสำเร็จ! 🏈", "success");
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

    // ── Draw Pairs ──
    const [drawnPairs, setDrawnPairs] = useState<DrawnPair[] | null>(null);

    const totalRepeatsCount = useMemo(() => {
        if (!drawnPairs) return 0;
        return drawnPairs.reduce((acc, p, idx) => {
            const ra = getPartnerRepeats(p.teamA.map(x => x.id), idx, apiMatches, drawnPairs);
            const rb = p.teamB ? getPartnerRepeats(p.teamB.map(x => x.id), idx, apiMatches, drawnPairs) : 0;
            return acc + ra + rb;
        }, 0);
    }, [drawnPairs, apiMatches]);

    const [drawMode, setDrawMode] = useState<"random" | "mmr_balanced">("random");
    const [roundsPerPlayer, setRoundsPerPlayer] = useState(1);
    const [numCourts, setNumCourts] = useState(2);
    const [startStep, setStartStep] = useState<string | null>(null); // progress label
    const [starting, setStarting] = useState(false);

    const shuffle = (array: any[]) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    };

    const handleDrawFair = () => {
        if (!tournamentInfo) return;
        const isDouble = tournamentInfo.type === "double";
        const pPerMatch = isDouble ? 4 : 2;

        // Ensure unique players for draw to prevent duplicates in matches
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

        // ── partner and opponent history from previous matches ──
        const partnerHistory = new Map<number, Set<number>>();
        const opponentHistory = new Map<number, Set<number>>();

        apiMatches.forEach(m => {
            if (m.match_status === "cancelled") return;

            // Partner history
            [m.team_a_id, m.team_b_id].forEach(t => {
                if (!t) return;
                const pids = t.team_players.map(tp => tp.user_id?.id).filter((id): id is number => !!id);
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

            // Opponent history
            if (m.team_a_id && m.team_b_id) {
                const aids = m.team_a_id.team_players.map(tp => tp.user_id?.id).filter((id): id is number => !!id);
                const bids = m.team_b_id.team_players.map(tp => tp.user_id?.id).filter((id): id is number => !!id);
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

        // Try several times and pick best
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
                // Clear slot usage after every numCourts matches
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

                // Prioritize players who rested in previous slot
                available.sort((a, b) => {
                    const restedA = playerUsedInPreviousSlot.has(a.id) ? 1 : 0;
                    const restedB = playerUsedInPreviousSlot.has(b.id) ? 1 : 0;
                    if (restedA !== restedB) return restedA - restedB;

                    if (drawMode === "mmr_balanced") {
                        const jitterA = Math.random() * 2 - 1;
                        const jitterB = Math.random() * 2 - 1;
                        return ((b.rankings?.[0]?.mmr ?? 1500) + jitterB) - ((a.rankings?.[0]?.mmr ?? 1500) + jitterA);
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

                    // Check partner repeats
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

                    // Check opponent repeats
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
                    // Opponent repeats for singles
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

            // Calculate rest conflict score (back-to-back across slots)
            let restConflictScore = 0;
            for (let i = numCourts; i < currentPairs.length; i++) {
                // Players in slot S
                const currIds = [
                    ...currentPairs[i].teamA.map(p => p.id),
                    ...(currentPairs[i].teamB?.map(p => p.id) || [])
                ];
                // Check against previous slot (S-1)
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
                if (totalScore === 0) break; // Perfect score
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

        // For endless mode, we draw the first match if it doesn't exist
        let matchesToCreate: DrawnPair[] = drawnPairs || [];
        if (isEndless && matchesToCreate.length === 0) {
            const pPerMatch = tournamentInfo?.type === "double" ? 4 : 2;
            if (tournamentInfo!.players.length < pPerMatch) {
                showToast("จำนวนผู้เล่นไม่เพียงพอ", "error");
                return;
            }
            // Simple fair draw for first match
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
            // ── Step 1: Create Teams with Batching ───────────────────
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

            // ── Step 2 & 3: Create Team Players and Matches with Batching ──
            setStartStep("บันทึกข้อมูลการแข่งขัน...");
            for (let i = 0; i < matchesToCreate.length; i += batchSize) {
                const batchPairs = matchesToCreate.slice(i, i + batchSize);
                const batchPromises = batchPairs.map(async (pair, batchIdx) => {
                    const globalIdx = i + batchIdx;
                    const { teamA: teamAId, teamB: teamBId } = teamIds[globalIdx];
                    const isBye = !teamBId;

                    // Create players for team A
                    const playerAPromises = pair.teamA.map(player =>
                        postJSON("/api/team-players", { data: { team_id: teamAId, user_id: player.id } })
                    );

                    // Create players for team B
                    const playerBPromises = (pair.teamB && teamBId) ? pair.teamB.map(player =>
                        postJSON("/api/team-players", { data: { team_id: teamBId, user_id: player.id } })
                    ) : [];

                    // Create Match
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

            // ── Step 4: Update Tournament Status ─────────────────────
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


    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
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

    if (!user) return null;

    /* Advance bracket when groups are done */
    function advanceBracket(updated: TMatch[]): TMatch[] {
        const next = [...updated];

        // For each group compute top2 and fill SF slots
        groupDefs.forEach((g, gi) => {
            const standings = calcStandings(g.players, next, g.id);
            const groupMatches = next.filter((m) => m.round === g.id);
            const allDone = groupMatches.every((m) => m.status === "done");
            if (allDone && standings.length >= 2) {
                // SF1 gets A1 as p1, SF2 gets A2 as p2 (inverted bracket)
                const sf1i = next.findIndex((m) => m.id === "SF1");
                const sf2i = next.findIndex((m) => m.id === "SF2");
                if (gi === 0) {
                    if (sf1i !== -1) next[sf1i] = { ...next[sf1i], player1: standings[0].name };
                    if (sf2i !== -1) next[sf2i] = { ...next[sf2i], player2: standings[1].name };
                } else {
                    if (sf1i !== -1) next[sf1i] = { ...next[sf1i], player2: standings[1].name };
                    if (sf2i !== -1) next[sf2i] = { ...next[sf2i], player1: standings[0].name };
                }
            }
        });

        // Advance SF winners to Final and losers to 3rd
        const sf1 = next.find((m) => m.id === "SF1");
        const sf2 = next.find((m) => m.id === "SF2");
        const fi = next.findIndex((m) => m.id === "F1");
        const ti = next.findIndex((m) => m.id === "3RD");

        if (sf1?.status === "done" && sf1.score1 !== null && sf1.score2 !== null) {
            const w = sf1.score1 > sf1.score2 ? sf1.player1 : sf1.player2;
            const l = sf1.score1 > sf1.score2 ? sf1.player2 : sf1.player1;
            if (fi !== -1 && next[fi].player1 === "TBD") next[fi] = { ...next[fi], player1: w };
            if (ti !== -1 && next[ti].player1 === "TBD") next[ti] = { ...next[ti], player1: l };
        }
        if (sf2?.status === "done" && sf2.score1 !== null && sf2.score2 !== null) {
            const w = sf2.score1 > sf2.score2 ? sf2.player1 : sf2.player2;
            const l = sf2.score1 > sf2.score2 ? sf2.player2 : sf2.player1;
            if (fi !== -1 && next[fi].player2 === "TBD") next[fi] = { ...next[fi], player2: w };
            if (ti !== -1 && next[ti].player2 === "TBD") next[ti] = { ...next[ti], player2: l };
        }

        return next;
    }

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
            fetchMatches();
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
            fetchMatches();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ", "error");
        } finally {
            setSavingScore(false);
        }
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
            // 1. Cancel unfinished matches
            for (const match of unfinishedMatches) {
                await fetch(`${STRAPI_BASE_URL}/api/matches/${match.documentId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                    body: JSON.stringify({ data: { match_status: "cancelled" } }),
                });
            }

            // 2. Update tournament status
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

    const totalEffectiveMatches = apiMatches.filter(m => m.match_status !== "cancelled").length;
    const pct = totalEffectiveMatches > 0
        ? Math.round((apiMatches.filter(m => m.match_status === "done").length / totalEffectiveMatches) * 100)
        : 0;
    const done = apiMatches.filter(m => m.match_status === "done").length;
    const total = totalEffectiveMatches;
    const cancelled = apiMatches.filter(m => m.match_status === "cancelled").length;

    return (
        <div className="min-h-screen bg-[#0f1923] text-slate-100 font-sans selection:bg-[#2ecc71]/30">
            <style dangerouslySetInnerHTML={{ __html: GRADIENT_ANIMATION_STYLE }} />
            <Navbar />
            {/* Score Editor Modal */}
            {scoreEditing && (
                <FullScoreEditorModal
                    match={scoreEditing}
                    onClose={() => setScoreEditing(null)}
                    onSave={handleSaveScore}
                    onCancelMatch={handleCancelMatch}
                    scoreA={scoreA}
                    setScoreA={setScoreA}
                    scoreB={scoreB}
                    setScoreB={setScoreB}
                    savingScore={savingScore}
                    tournamentInfo={tournamentInfo}
                    STRAPI_BASE_URL={STRAPI_BASE_URL}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-50 flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border text-sm font-medium ${toast.type === "success"
                    ? "bg-[#0f2a1a] border-green-500/30 text-green-300"
                    : "bg-[#2a0f0f] border-red-500/30 text-red-300"
                    }`}>
                    <span>{toast.type === "success" ? "✅" : "⚠️"}</span> {toast.msg}
                </div>
            )}

            {/* Confirm Delete Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
                    <div className="relative z-10 w-full max-w-sm bg-[#141f2e] border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-xl shrink-0">🗑️</div>
                            <div>
                                <p className="text-white font-semibold">ยืนยันการลบ</p>
                                <p className="text-slate-400 text-xs mt-0.5">ไม่สามารถกู้คืนได้</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-300">คุณแน่ใจหรือไม่ว่าต้องการลบทัวร์นาเมนต์นี้? ข้อมูลทั้งหมดจะถูกลบอย่างถาวร</p>
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-sm font-semibold transition-all disabled:opacity-50"
                            >
                                {deleting ? "กำลังลบ..." : "🗑️ ลบทัวร์นาเมนต์"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-5xl mx-auto px-3 sm:px-4 pt-4 sm:pt-8 pb-8 space-y-4 sm:space-y-6">
                {/* Header */}
                <TournamentHeader
                    id={id as string}
                    tournamentInfo={tournamentInfo}
                    user={user}
                    setShowQR={setShowQR}
                    setConfirmDelete={setConfirmDelete}
                    pct={pct}
                    done={done}
                    total={total}
                    cancelled={cancelled}
                />

                {/* ── UPCOMING: Players list + Draw Pairs ── */}
                {/* Players & Draw Sections */}
                {tournamentInfo && (
                    <>
                        <ParticipantsList
                            tournamentInfo={tournamentInfo}
                            user={user}
                            jwt={jwt}
                            isJoined={isJoined}
                            joining={joining}
                            leaving={leaving}
                            handleJoin={handleJoin}
                            handleLeave={handleLeave}
                            drawnPairs={drawnPairs}
                            playerMatchCounts={playerMatchCounts}
                            STRAPI_BASE_URL={STRAPI_BASE_URL}
                            refreshInfo={refreshInfo}
                            showToast={showToast}
                            router={router}
                            pausedPlayerIds={pausedPlayerIds}
                            setPausedPlayerIds={setPausedPlayerIds}
                        />

                        {tournamentInfo.format !== "knockout" && (
                            <DrawSection
                                tournamentInfo={tournamentInfo}
                                user={user}
                                drawnPairs={drawnPairs}
                                drawMode={drawMode}
                                setDrawMode={setDrawMode}
                                setDrawnPairs={setDrawnPairs}
                                roundsPerPlayer={roundsPerPlayer}
                                setRoundsPerPlayer={setRoundsPerPlayer}
                                numCourts={numCourts}
                                setNumCourts={setNumCourts}
                                handleDrawFair={handleDrawFair}
                                totalRepeatsCount={totalRepeatsCount}
                                apiMatches={apiMatches}
                                STRAPI_BASE_URL={STRAPI_BASE_URL}
                                starting={starting}
                                startStep={startStep || ""}
                                handleStartTournament={handleStartTournament}
                            />
                        )}
                    </>
                )}


                {/* Endless Mode Manager (Public View / Logged-in Sync) */}
                {tournamentInfo?.tournament_status === "ongoing" &&
                    tournamentInfo?.format === "endless_mode" && (
                        <EndlessModeManager
                            tournamentId={id as string}
                            tournamentType={tournamentInfo.type as "single" | "double"}
                            players={tournamentInfo.players}
                            permanentTeamsData={tournamentInfo.permanent_teams || []}
                            apiMatches={apiMatches}
                            jwt={jwt!}
                            STRAPI_BASE_URL={STRAPI_BASE_URL}
                            refreshInfo={refreshInfo}
                            showToast={showToast}
                            pausedPlayerIds={pausedPlayerIds}
                            setPausedPlayerIds={setPausedPlayerIds}
                            tournamentStatus={tournamentInfo.tournament_status}
                            userId={user?.id}
                            ownerId={tournamentInfo.user_created?.id}
                        />
                    )}

                {/* Knockout Manager (Bracket View) */}
                {tournamentInfo?.format === "knockout" && (
                        <KnockoutManager
                            tournamentId={id as string}
                            tournamentInfo={tournamentInfo}
                            apiMatches={apiMatches}
                            jwt={jwt!}
                            STRAPI_BASE_URL={STRAPI_BASE_URL}
                            refreshInfo={refreshInfo}
                            showToast={showToast}
                            userId={user?.id}
                            setScoreEditing={setScoreEditing}
                            setScoreA={setScoreA}
                            setScoreB={setScoreB}
                        />
                    )}


                {/* ── MATCH SCHEDULE (ongoing/completed) ── */}
                {tournamentInfo && tournamentInfo.format !== "knockout" && (
                    <MatchSchedule
                        tournamentInfo={tournamentInfo}
                        user={user}
                        apiMatches={apiMatches}
                        fetchMatches={fetchMatches}
                        handleFinishTournament={handleFinishTournament}
                        starting={starting}
                        setScoreEditing={setScoreEditing}
                        setScoreA={setScoreA}
                        setScoreB={setScoreB}
                        STRAPI_BASE_URL={STRAPI_BASE_URL}
                    />
                )}

                <div className="text-center text-xs text-slate-600 pb-4">
                    🏸 Badminton Club Management System · {new Date().getFullYear()}
                </div>
            </main >

            {/* QR Invite Modal */}
            <QRInviteModal
                showQR={showQR}
                setShowQR={setShowQR}
                shareUrl={shareUrl}
            />
        </div>
    );
}

