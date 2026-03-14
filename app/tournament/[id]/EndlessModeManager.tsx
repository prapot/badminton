"use client";

import { useState } from "react";
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

interface EndlessModeManagerProps {
    tournamentId: string;
    tournamentType: "single" | "double";
    players: Array<{ id: number; username: string; picture?: { url: string } | null; rankings?: any }>;
    apiMatches: ApiMatch[];
    jwt: string;
    STRAPI_BASE_URL: string;
    refreshInfo: () => void;
    showToast: (msg: string, type?: "success" | "error") => void;
}

export default function EndlessModeManager({
    tournamentId,
    tournamentType,
    players,
    apiMatches,
    jwt,
    STRAPI_BASE_URL,
    refreshInfo,
    showToast
}: EndlessModeManagerProps) {
    const [drawing, setDrawing] = useState(false);

    const handleDrawNext = async () => {
        if (players.length < (tournamentType === "double" ? 4 : 2)) {
            showToast("จำนวนผู้เล่นไม่เพียงพอ", "error");
            return;
        }

        setDrawing(true);
        try {
            // 1. Calculate matches played for each player AND identify busy players
            const playerCounts = new Map<number, number>();
            const busyPlayerIds = new Set<number>();
            players.forEach(p => playerCounts.set(p.id, 0));

            apiMatches.forEach(m => {
                if (m.match_status === "cancelled") return;

                const pids = [
                    ...(m.team_a_id?.team_players.map(tp => tp.user_id?.id) || []),
                    ...(m.team_b_id?.team_players.map(tp => tp.user_id?.id) || [])
                ].filter(Boolean) as number[];

                // Add to total match counts (for fairness)
                pids.forEach(id => {
                    if (playerCounts.has(id)) {
                        playerCounts.set(id, playerCounts.get(id)! + 1);
                    }
                });

                // If match is active (live or upcoming), players are busy
                if (m.match_status === "live" || m.match_status === "upcoming") {
                    pids.forEach(id => busyPlayerIds.add(id));
                }
            });

            // 2. Filter available players and sort by matches played
            const availablePlayers = players.filter(p => !busyPlayerIds.has(p.id));

            if (availablePlayers.length < (tournamentType === "double" ? 4 : 2)) {
                showToast("ผู้เล่นที่ว่างอยู่มีไม่เพียงพอสำหรับการจัดคู่ถัดไป", "error");
                setDrawing(false);
                return;
            }

            const sortedPlayers = [...availablePlayers].sort((a, b) => {
                const countA = playerCounts.get(a.id) || 0;
                const countB = playerCounts.get(b.id) || 0;
                if (countA !== countB) return countA - countB;
                return Math.random() - 0.5; // Randomize if equal
            });

            const pPerMatch = tournamentType === "double" ? 4 : 2;
            const pool = sortedPlayers.slice(0, pPerMatch);

            // 3. Smart Mix: For doubles, try to find the best way to split these 4 players
            let selectedTeamA: any[] = [];
            let selectedTeamB: any[] = [];

            if (tournamentType === "double" && pool.length === 4) {
                // Partner history helper
                const getHistory = (p1Id: number, p2Id: number) => {
                    let count = 0;
                    apiMatches.forEach(m => {
                        if (m.match_status === "cancelled") return;
                        [m.team_a_id, m.team_b_id].forEach(t => {
                            if (!t) return;
                            const ids = t.team_players.map(tp => tp.user_id?.id).filter(Boolean);
                            if (ids.length === 2 && ids.includes(p1Id) && ids.includes(p2Id)) {
                                count++;
                            }
                        });
                    });
                    return count;
                };

                // 3 possible ways to split 4 players [0,1,2,3] into two teams:
                // Option 1: (0,1) vs (2,3)
                // Option 2: (0,2) vs (1,3)
                // Option 3: (0,3) vs (1,2)
                const options = [
                    { a: [pool[0], pool[1]], b: [pool[2], pool[3]], score: getHistory(pool[0].id, pool[1].id) + getHistory(pool[2].id, pool[3].id) },
                    { a: [pool[0], pool[2]], b: [pool[1], pool[3]], score: getHistory(pool[0].id, pool[2].id) + getHistory(pool[1].id, pool[3].id) },
                    { a: [pool[0], pool[3]], b: [pool[1], pool[2]], score: getHistory(pool[0].id, pool[3].id) + getHistory(pool[1].id, pool[2].id) },
                ];

                // Sort by least repeat history
                options.sort((o1, o2) => o1.score - o2.score);
                selectedTeamA = options[0].a;
                selectedTeamB = options[0].b;
            } else {
                selectedTeamA = [pool[0]];
                selectedTeamB = pool.length > 1 ? [pool[1]] : [];
            }

            const result = await Swal.fire({
                title: "สุ่มคู่ถัดไป",
                html: `
                    <div class="space-y-4 text-left">
                        <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <p class="text-xs text-blue-400 font-bold mb-2">TEAM A</p>
                            <p class="text-white font-bold">${selectedTeamA.map(p => p.username).join(" / ")}</p>
                        </div>
                        <div class="flex justify-center text-xl font-black text-slate-500">VS</div>
                        <div class="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <p class="text-xs text-green-400 font-bold mb-2">TEAM B</p>
                            <p class="text-white font-bold">${selectedTeamB.length > 0 ? selectedTeamB.map(p => p.username).join(" / ") : "รอนักกีฬา"}</p>
                        </div>
                    </div>
                `,
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "สร้างแมตซ์เลย!",
                cancelButtonText: "สุ่มใหม่",
                confirmButtonColor: "#2ecc71",
                background: "#1a2535",
                color: "#fff"
            });

            if (!result.isConfirmed) {
                setDrawing(false);
                return;
            }

            // 4. Create teams and match
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

            // Create Team A
            const resA = await postJSON("/api/teams", { data: { tournament_id: tournamentId, team_no: randNo() } });
            const teamAId = resA.data.documentId || resA.data.id;
            await Promise.all(selectedTeamA.map(p => postJSON("/api/team-players", { data: { team_id: teamAId, user_id: p.id } })));

            // Create Team B
            const resB = await postJSON("/api/teams", { data: { tournament_id: tournamentId, team_no: randNo() } });
            const teamBId = resB.data.documentId || resB.data.id;
            await Promise.all(selectedTeamB.map(p => postJSON("/api/team-players", { data: { team_id: teamBId, user_id: p.id } })));

            // Create Match
            const matchNo = apiMatches.length + 1;
            await postJSON("/api/matches", {
                data: {
                    tournament_id: tournamentId,
                    round: 1, // Endless mode uses flat rounds or match_no
                    match_no: matchNo,
                    team_a_id: teamAId,
                    team_b_id: teamBId,
                    match_status: "upcoming",
                    first_serve: Math.random() > 0.5 ? "A" : "B"
                }
            });

            showToast("สร้างแมตซ์เรียบร้อย!", "success");
            refreshInfo();
        } catch (e) {
            console.error(e);
            showToast("เกิดข้อผิดพลาด", "error");
        } finally {
            setDrawing(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/60 border border-indigo-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            <span className="text-2xl">♾️</span> โหมดไร้สิ้นสุด
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">สุ่มจัดคู่ถัดไปโดยเน้นคนเล่นน้อยที่สุดให้ได้ลงสนาม</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">สถานะผู้เล่นปัจจุบัน</h3>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                                {players.map(p => {
                                    const count = apiMatches.filter(m =>
                                        m.match_status !== 'cancelled' &&
                                        ([m.team_a_id, m.team_b_id].some(t => t?.team_players.some(tp => tp.user_id?.id === p.id)))
                                    ).length;
                                    return (
                                        <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                                            <span className="text-slate-300 truncate mr-2">{p.username}</span>
                                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold shrink-0">{count} แมตซ์</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-center items-center p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
                            <span className="text-3xl animate-pulse">🏸</span>
                        </div>
                        <p className="text-sm text-center text-slate-300 mb-6">ระบบจะคำนวณผู้เล่นที่เหมาะสมที่สุด<br />สำหรับแมตซ์ถัดไปโดยอัตโนมัติ</p>

                        <button
                            onClick={handleDrawNext}
                            disabled={drawing}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 group"
                        >
                            {drawing ? (
                                <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> กำลังสุ่ม...</>
                            ) : (
                                <>
                                    <span>🎲 สุ่มแมตซ์ถัดไป</span>
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
