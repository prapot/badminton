
import React, { useState, useMemo } from 'react';
import { TournamentInfo, User, ApiMatch, ApiTeam } from '../types';
import Swal from 'sweetalert2';
import { generateFullKnockoutBracket, KnockoutMatch } from '../utils/KnockoutUtils';

interface KnockoutManagerProps {
    tournamentId: string;
    tournamentInfo: TournamentInfo;
    apiMatches: ApiMatch[];
    jwt: string;
    STRAPI_BASE_URL: string;
    refreshInfo: () => void;
    showToast: (msg: string, type: "success" | "error") => void;
    userId?: number;
    setScoreEditing: (match: ApiMatch) => void;
    setScoreA: (score: number) => void;
    setScoreB: (score: number) => void;
}

const KnockoutManager: React.FC<KnockoutManagerProps> = ({
    tournamentId,
    tournamentInfo,
    apiMatches,
    jwt,
    STRAPI_BASE_URL,
    refreshInfo,
    showToast,
    userId,
    setScoreEditing,
    setScoreA,
    setScoreB
}) => {
    const [creating, setCreating] = useState(false);
    const isOwner = !!userId && Number(tournamentInfo.user_created?.id) === Number(userId);

    // Group matches by round and sort them for horizontal layout
    const sortedRounds = useMemo(() => {
        const rounds: Record<string, ApiMatch[]> = {};
        apiMatches.forEach(m => {
            const r = String(m.round || "1");
            if (!rounds[r]) rounds[r] = [];
            rounds[r].push(m);
        });

        // Sort matches in each round by match_no
        Object.keys(rounds).forEach(r => {
            rounds[r].sort((a, b) => (a.match_no || 0) - (b.match_no || 0));
        });

        return Object.entries(rounds).sort(([a], [b]) => parseInt(a) - parseInt(b));
    }, [apiMatches]);

    const handleCreateBracket = async () => {
        if (!isOwner || creating) return;

        const { isConfirmed } = await Swal.fire({
            title: 'สร้างสายการแข่งขัน?',
            text: `ต้องการเริ่มจัดสายแข่งสำหรับผู้เล่น ${tournamentInfo.players.length} คน ใช่หรือไม่? (ระบบจะสร้างทุกรอบจนถึงรอบชิง)`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ใช่, เริ่มเลย!',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#2ecc71',
            background: '#0f172a',
            color: '#f1f5f9',
        });

        if (!isConfirmed) return;

        setCreating(true);
        try {
            const allBracketMatches = generateFullKnockoutBracket(tournamentInfo.players, tournamentInfo.type as 'single' | 'double');

            for (const km of allBracketMatches) {
                let teamAId = null;
                let teamBId = null;

                if (km.team_a && km.team_a.length > 0) {
                    const teamARes = await fetch(`${STRAPI_BASE_URL}/api/teams`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                        body: JSON.stringify({ data: { tournament_id: tournamentId, team_no: `R${km.round}-M${km.match_no}-A` } })
                    });
                    const teamA = await teamARes.json();
                    teamAId = teamA.data.id;
                    for (const p of km.team_a) {
                        await fetch(`${STRAPI_BASE_URL}/api/team-players`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                            body: JSON.stringify({ data: { team_id: teamAId, ...(p.is_guest ? { guest_name: p.guest_name } : { user_id: p.id }) } })
                        });
                    }
                }

                if (km.team_b && km.team_b.length > 0) {
                    const teamBRes = await fetch(`${STRAPI_BASE_URL}/api/teams`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                        body: JSON.stringify({ data: { tournament_id: tournamentId, team_no: `R${km.round}-M${km.match_no}-B` } })
                    });
                    const teamB = await teamBRes.json();
                    teamBId = teamB.data.id;
                    for (const p of km.team_b) {
                        await fetch(`${STRAPI_BASE_URL}/api/team-players`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                            body: JSON.stringify({ data: { team_id: teamBId, ...(p.is_guest ? { guest_name: p.guest_name } : { user_id: p.id }) } })
                        });
                    }
                }

                const isBye = km.is_bye;
                await fetch(`${STRAPI_BASE_URL}/api/matches`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                    body: JSON.stringify({
                        data: {
                            tournament_id: tournamentId,
                            round: km.round,
                            match_no: km.match_no,
                            team_a_id: teamAId,
                            team_b_id: teamBId,
                            match_status: isBye ? 'done' : 'upcoming',
                            score_a: isBye ? 21 : 0,
                            score_b: 0,
                            team_winner: isBye ? teamAId : null
                        }
                    })
                });
            }

            await fetch(`${STRAPI_BASE_URL}/api/tournaments/${tournamentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ data: { tournament_status: 'ongoing' } })
            });

            showToast("สร้างสายการแข่งขันครบทุกรอบแล้ว! 🏆", "success");
            refreshInfo();
        } catch (err) {
            console.error(err);
            showToast("เกิดข้อผิดพลาดในการสร้างสายแข่ง", "error");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1e293b]/50 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-2xl shadow-inner">🏆</div>
                    <div>
                        <h2 className="text-xl font-bold text-white">สายการแข่งขัน (Knockout)</h2>
                        <p className="text-slate-400 text-xs mt-1">คลิกแมตช์เพื่อกรอกผล หรือดูความคืบหน้า</p>
                    </div>
                </div>
                {isOwner && apiMatches.length === 0 && (
                    <button
                        onClick={handleCreateBracket}
                        disabled={creating}
                        className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2"
                    >
                        {creating ? "กำลังสร้าง..." : "⚡ เริ่มจัดสายแข่งทันที"}
                    </button>
                )}
            </div>

            {/* Bracket Horizontal View */}
            <div className="relative overflow-x-auto pb-10 pt-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {apiMatches.length === 0 ? (
                    <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-3xl bg-slate-900/20">
                        <div className="text-7xl mb-4 opacity-10">🏸</div>
                        <p className="text-slate-500 font-bold text-lg">ยังไม่มีการจัดสายการแข่งขัน</p>
                        {isOwner && <p className="text-slate-600 text-sm mt-2 italic">กดปุ่มสีม่วงด้านบน เพื่อสุ่มสายการแข่งขันอัตโนมัติ</p>}
                    </div>
                ) : (
                    <div className="inline-flex gap-0 min-w-full px-6">
                        {sortedRounds.map(([roundNum, matches], rIdx) => (
                            <div key={roundNum} className="flex-shrink-0 w-72 flex flex-col items-center">
                                {/* Round Header */}
                                <div className="mb-12 sticky left-0 z-20">
                                    <span className="px-5 py-2 bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-[0.25em] rounded-full border border-white/10 shadow-xl">
                                        {parseInt(roundNum) === sortedRounds.length ? 'Final รอบชิงชนะเลิศ' : `Round ${roundNum}`}
                                    </span>
                                </div>

                                {/* Matches Container */}
                                <div className="flex-1 flex flex-col justify-around gap-12 w-full relative">
                                    {matches.map((m) => {
                                        const winnerId = m.team_winner && typeof m.team_winner === 'object' ? (m.team_winner as any).documentId || (m.team_winner as any).id : m.team_winner;
                                        const isWinnerA = m.match_status === 'done' && winnerId && m.team_a_id && (winnerId === m.team_a_id.documentId || winnerId === m.team_a_id.id);
                                        const isWinnerB = m.match_status === 'done' && winnerId && m.team_b_id && (winnerId === m.team_b_id.documentId || winnerId === m.team_b_id.id);
                                        const isUserInMatch = !!userId && (
                                            m.team_a_id?.team_players?.some(tp => tp.user_id?.id === userId) ||
                                            m.team_b_id?.team_players?.some(tp => tp.user_id?.id === userId)
                                        );

                                        return (
                                            <div key={m.id} className="relative z-10 px-4 group">
                                                {/* Left Connector */}
                                                {rIdx > 0 && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-slate-700 -translate-x-full"></div>
                                                )}
                                                {/* Right Connector */}
                                                {rIdx < sortedRounds.length - 1 && (
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-slate-700 translate-x-full"></div>
                                                )}

                                                <div
                                                    onClick={() => {
                                                        if (tournamentInfo.tournament_status === "completed") return;
                                                        if (isOwner) {
                                                            setScoreEditing(m);
                                                            setScoreA(m.score_a || 0);
                                                            setScoreB(m.score_b || 0);
                                                        }
                                                    }}
                                                    className={`w-full ${isUserInMatch ? 'bg-yellow-500/5 border-yellow-400 ring-1 ring-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.15)]' : 'bg-[#0f172a] border-white/5'} border rounded-2xl overflow-hidden shadow-2xl transition-all ${isOwner ? `hover:scale-[1.03] cursor-pointer ${!isUserInMatch ? 'hover:border-indigo-500/50' : ''}` : 'cursor-default'}`}
                                                >
                                                    {/* Match Meta */}
                                                    <div className="bg-white/5 px-4 py-2 flex justify-between items-center border-b border-white/5">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Match #{m.match_no}</span>
                                                        {m.match_status === 'done' && (
                                                            <span className="text-[9px] font-black text-green-400 bg-green-400/10 px-2 py-0.5 rounded-md">COMPLETED</span>
                                                        )}
                                                    </div>

                                                    {/* Player A */}
                                                    <div className={`p-4 flex items-center justify-between border-b border-white/5 transition-colors ${isWinnerA ? 'bg-green-500/10' : ''}`}>
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className={`w-2 h-2 rounded-full ${isWinnerA ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-700'}`}></div>
                                                            <div className="flex flex-col min-w-0">
                                                                {m.team_a_id?.team_players?.map((tp, idx) => (
                                                                    <span key={idx} className={`text-xs font-bold truncate ${isWinnerA ? 'text-green-300' : m.team_a_id ? 'text-slate-200' : 'text-slate-600 italic'}`}>
                                                                        {tp.user_id?.username || tp.guest_name || "Guest"}
                                                                    </span>
                                                                )) || <span className="text-xs font-bold text-slate-600 italic">{m.round === "1" ? "Bye" : "TBD"}</span>}
                                                            </div>
                                                        </div>
                                                        <span className={`text-sm font-black ${isWinnerA ? 'text-green-400' : 'text-slate-500'}`}>{m.score_a || 0}</span>
                                                    </div>

                                                    {/* Player B */}
                                                    <div className={`p-4 flex items-center justify-between transition-colors ${isWinnerB ? 'bg-green-500/10' : ''}`}>
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className={`w-2 h-2 rounded-full ${isWinnerB ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-700'}`}></div>
                                                            <div className="flex flex-col min-w-0">
                                                                {m.team_b_id?.team_players?.map((tp, idx) => (
                                                                    <span key={idx} className={`text-xs font-bold truncate ${isWinnerB ? 'text-green-300' : m.team_b_id ? 'text-slate-200' : 'text-slate-600 italic'}`}>
                                                                        {tp.user_id?.username || tp.guest_name || "Guest"}
                                                                    </span>
                                                                )) || <span className="text-xs font-bold text-slate-600 italic">{m.round === "1" ? "Bye" : "TBD"}</span>}
                                                            </div>
                                                        </div>
                                                        <span className={`text-sm font-black ${isWinnerB ? 'text-green-400' : 'text-slate-500'}`}>{m.score_b || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Round Connectors Logic (Visual lines) */}
                                    {rIdx < sortedRounds.length - 1 && (
                                        <div className="absolute top-0 bottom-0 -right-4 w-8 pointer-events-none">
                                            {/* We can use CSS borders or SVG here, using a simpler CSS border approach for now */}
                                            <div className="h-full flex flex-col justify-around">
                                                {Array(matches.length / 2).fill(0).map((_, i) => (
                                                    <div key={i} className="flex-1 border-r border-slate-700 h-full my-[25%] rounded-r-lg"></div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KnockoutManager;
