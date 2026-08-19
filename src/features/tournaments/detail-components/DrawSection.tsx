import React from 'react';
import Image from 'next/image';
import { TournamentInfo, User, DrawnPair } from '../types';
import { lcm, getPartnerRepeats } from '../utils/TournamentUtils';

interface DrawSectionProps {
    tournamentInfo: TournamentInfo;
    user: User | null;
    drawnPairs: DrawnPair[] | null;
    drawMode: "random" | "rp_balanced";
    setDrawMode: (mode: "random" | "rp_balanced") => void;
    setDrawnPairs: (pairs: DrawnPair[] | null) => void;
    roundsPerPlayer: number;
    setRoundsPerPlayer: (n: number) => void;
    numCourts: number;
    setNumCourts: (n: number) => void;
    handleDrawFair: () => void;
    totalRepeatsCount: number;
    apiMatches: any[];
    STRAPI_BASE_URL: string;
    starting: boolean;
    startStep: string;
    handleStartTournament: () => void;
}

const DrawSection: React.FC<DrawSectionProps> = ({
    tournamentInfo,
    user,
    drawnPairs,
    drawMode,
    setDrawMode,
    setDrawnPairs,
    roundsPerPlayer,
    setRoundsPerPlayer,
    numCourts,
    setNumCourts,
    handleDrawFair,
    totalRepeatsCount,
    apiMatches,
    STRAPI_BASE_URL,
    starting,
    startStep,
    handleStartTournament,
}) => {
    const isOwner = tournamentInfo.user_created?.id === user?.id;

    if (tournamentInfo.tournament_status !== "upcoming") return null;

    return (
        <>
            {/* Draw Pairs Card (Owner only - Upcoming only - NOT for Endless Mode) */}
            {isOwner && tournamentInfo.format !== "endless_mode" && tournamentInfo.players.length >= (tournamentInfo.type === "double" ? 4 : 2) && (
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mt-6">
                    <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-3">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <span>🎲</span> สุ่มคู่แข่งขัน
                        </h2>
                        <button onClick={handleDrawFair}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/20 text-purple-300 text-xs font-semibold transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {drawnPairs ? "สุ่มใหม่" : "สุ่มคู่"}
                        </button>
                    </div>

                    {/* Mode selector */}
                    <div className="px-5 py-3 bg-black/20 border-b border-white/5 flex gap-2">
                        <button
                            onClick={() => { setDrawMode("random"); setDrawnPairs(null); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${drawMode === "random" ? "bg-purple-500/20 border-purple-500/30 text-purple-300" : "bg-white/3 border-white/8 text-slate-400 hover:bg-white/8"}`}
                        >
                            🎲 สุ่มทั่วไป
                        </button>
                        <button
                            onClick={() => { setDrawMode("rp_balanced"); setDrawnPairs(null); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${drawMode === "rp_balanced" ? "bg-yellow-500/20 border-yellow-500/30 text-yellow-300" : "bg-white/3 border-white/8 text-slate-400 hover:bg-white/8"}`}
                        >
                            ⚖️ สมดุล RP
                        </button>
                    </div>

                    <div className="px-5 py-3 bg-green-500/5 border-b border-green-500/10 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-green-400">⚖️ ทุกคนเล่นเท่ากัน (Fair Play)</p>
                                <p className="text-[10px] text-green-400/60 mt-0.5">
                                    {drawMode === "rp_balanced"
                                        ? "คำนวณรอบน้อยที่สุดเพื่อให้ทุกคนเล่นเท่ากัน และจัดคู่ตามฝีมือ (RP)"
                                        : "คำนวณรอบน้อยที่สุดเพื่อให้ทุกคนเล่นเท่ากัน โดยการสุ่มคู่"}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl w-fit">
                                {[1, 2, 3, 4, 5].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => { setRoundsPerPlayer(m); setDrawnPairs(null); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${roundsPerPlayer === m ? "bg-green-500 text-white shadow-lg shadow-green-900/40" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                                    >
                                        {m} รอบ
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/5">
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-indigo-400">🏟️ จำนวนคอร์ดที่ใช้งาน</p>
                                <p className="text-[10px] text-indigo-400/60 mt-0.5">ระบุเพื่อจัดตารางแข่งพร้อมกันและคำนวณการพักเบรก</p>
                            </div>
                            <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl w-fit">
                                {[1, 2, 3, 4].map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => { setNumCourts(c); setDrawnPairs(null); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${numCourts === c ? "bg-indigo-500 text-white shadow-lg shadow-indigo-900/40" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                                    >
                                        {c} คอร์ด
                                    </button>
                                ))}
                            </div>
                        </div>

                        {drawnPairs && (
                            <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                                        <span className="text-[10px]">🔄</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-yellow-500">ผลลัพธ์คู่เดิม (Repeats)</p>
                                        <p className="text-[9px] text-yellow-500/60">จำนวนคู่ที่เคยคู่กันมาก่อนในการสุ่มรอบนี้</p>
                                    </div>
                                </div>
                                <div className="px-3 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded-lg shadow-[0_0_10px_rgba(234,179,8,0.05)]">
                                    <span className="text-xs font-black text-yellow-400">
                                        คู่เดิม {totalRepeatsCount} ครั้ง
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {!drawnPairs ? (
                        <div className="py-10 text-center text-slate-500">
                            <p className="text-3xl mb-2">{drawMode === "rp_balanced" ? "⚖️" : "🎲"}</p>
                            <p className="text-sm">กดปุ่ม &quot;สุ่มคู่&quot; เพื่อจับคู่ผู้เล่น</p>
                            <p className="text-xs mt-1 text-slate-600">
                                {(() => {
                                    const pCount = tournamentInfo.players.length;
                                    const isDouble = tournamentInfo.type === "double";
                                    const pPerMatch = isDouble ? 4 : 2;
                                    const minRounds = lcm(pCount, pPerMatch) / pCount;
                                    const totalRounds = minRounds * roundsPerPlayer;
                                    const totalMatches = (pCount * totalRounds) / pPerMatch;
                                    return `ผู้เล่น ${pCount} คน x คนละ ${totalRounds} รอบ → รวม ${totalMatches} แมตซ์`;
                                })()}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {drawnPairs.map((pair, idx) => {
                                const teamARepeats = getPartnerRepeats(pair.teamA.map(p => p.id), idx, apiMatches, drawnPairs);
                                const teamBRepeats = pair.teamB ? getPartnerRepeats(pair.teamB.map(p => p.id), idx, apiMatches, drawnPairs) : 0;

                                return (
                                    <div key={idx} className="bg-slate-900/40 rounded-xl p-3 sm:p-4 border border-slate-800/50 hover:border-slate-700/50 transition-all group overflow-hidden relative">
                                        {/* Match Number Bubble */}
                                        <div className="absolute left-0 top-0 w-8 h-8 flex items-center justify-center bg-slate-800/50 rounded-br-lg text-[10px] font-bold text-slate-500">
                                            {idx + 1}
                                        </div>

                                        <div className="flex flex-row items-center justify-between gap-2 sm:gap-6 mt-2">
                                            {/* Team A */}
                                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                                                <div className="flex flex-col gap-1.5">
                                                    {pair.teamA.map((p, pIdx) => {
                                                        const pUrl = p.picture?.url ? (p.picture.url.startsWith("http") ? p.picture.url : `${STRAPI_BASE_URL}${p.picture.url}`) : null;
                                                        return (
                                                            <div key={`${p.id}-${pIdx}`} className="flex items-center gap-2 min-w-0">
                                                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-[10px] sm:text-xs shrink-0 overflow-hidden border border-green-500/20 shadow-sm relative">
                                                                    {pUrl ? <Image src={pUrl} alt={p.username} width={24} height={24} className="w-full h-full object-cover" /> : p.username.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs sm:text-sm font-semibold text-white truncate">{p.username}</p>
                                                                    {p.id === user?.id && <span className="text-[9px] text-green-400 font-bold">คุณ</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {teamARepeats > 0 && (
                                                    <span className="text-[9px] sm:text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 w-fit">
                                                        คู่เดิม {teamARepeats} ครั้ง
                                                    </span>
                                                )}
                                                {drawMode === "rp_balanced" && (
                                                    <div className="mt-1 flex items-center gap-1.5">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Avg RP:</span>
                                                        <span className="text-[10px] font-black text-indigo-400">
                                                            {Math.round(pair.teamA.reduce((sum, p) => sum + (p.rankings?.[0]?.ranking_points ?? 0), 0) / pair.teamA.length)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* VS Section */}
                                            <div className="flex flex-col items-center gap-1 shrink-0 relative px-2">
                                                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-[10px] sm:text-xs font-black text-slate-500 z-10">VS</div>
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-full bg-gradient-to-b from-transparent via-slate-700/50 to-transparent" />
                                            </div>

                                            {/* Team B */}
                                            <div className="flex flex-col gap-2 flex-1 min-w-0 items-end">
                                                {pair.teamB ? (
                                                    <>
                                                        <div className="flex flex-col gap-1.5 items-end w-full">
                                                            {pair.teamB.map((p, pIdx) => {
                                                                const pUrl = p.picture?.url ? (p.picture.url.startsWith("http") ? p.picture.url : `${STRAPI_BASE_URL}${p.picture.url}`) : null;
                                                                return (
                                                                    <div key={`${p.id}-${pIdx}`} className="flex items-center justify-end gap-2 min-w-0 w-full">
                                                                        <div className="min-w-0 text-right">
                                                                            <p className="text-xs sm:text-sm font-semibold text-white truncate">{p.username}</p>
                                                                            {p.id === user?.id && <span className="text-[9px] text-green-400 font-bold">คุณ</span>}
                                                                        </div>
                                                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-[10px] sm:text-xs shrink-0 overflow-hidden border border-purple-500/20 shadow-sm">
                                                                            {pUrl ? <Image src={pUrl} alt={p.username} width={24} height={24} className="w-full h-full object-cover" /> : p.username.charAt(0).toUpperCase()}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {teamBRepeats > 0 && (
                                                            <span className="text-[9px] sm:text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 w-fit">
                                                                คู่เดิม {teamBRepeats} ครั้ง
                                                            </span>
                                                        )}
                                                        {drawMode === "rp_balanced" && (
                                                            <div className="mt-1 flex items-center gap-1.5">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Avg RP:</span>
                                                                <span className="text-[10px] font-black text-indigo-400">
                                                                    {Math.round(pair.teamB.reduce((sum, p) => sum + (p.rankings?.[0]?.ranking_points ?? 0), 0) / pair.teamB.length)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xl sm:text-2xl">💤</span>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">พักรอบพักผ่อน</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Start Button Area for Endless Mode */}
            {isOwner && tournamentInfo.format === "endless_mode" && (
                <div className="mt-8 flex flex-col items-center gap-4">
                    <div className="w-full bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 text-center">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">♾️</div>
                        <h3 className="text-white font-bold mb-1">ยินดีต้อนรับสู่โหมดไร้สิ้นสุด</h3>
                        <p className="text-xs text-slate-400 mb-6">โหมดนี้จะเริ่มการแข่งโดยไม่ต้องสุ่มคู่ล่วงหน้าทั้งรายการ<br />ระบบจะสุ่มแมตซ์แรกให้ และคุณสามารถจัดคู่ถัดไปได้เรื่อยๆ</p>
                        <button
                            onClick={handleStartTournament}
                            disabled={starting}
                            className="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black rounded-xl transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {starting ? "กำลังเตรียมการ..." : "🚀 เริ่มโหมดไร้สิ้นสุด"}
                        </button>
                    </div>
                </div>
            )}

            {/* Start Button Area for Regular Modes */}
            {isOwner && tournamentInfo.format !== "endless_mode" && drawnPairs && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleStartTournament}
                        disabled={starting}
                        className="w-full sm:w-auto px-12 py-4 bg-gradient-to-br from-[#2ecc71] to-[#27ae60] hover:from-[#3de382] hover:to-[#2ecc71] text-white font-black rounded-2xl transition-all shadow-xl shadow-green-900/40 border border-green-400/20 active:scale-95 flex items-center justify-center gap-3 group"
                    >
                        {starting ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                <span>{startStep || "กำลังสร้าง..."}</span>
                            </>
                        ) : (
                            <>
                                <span className="text-xl group-hover:scale-125 transition-transform">🏆</span>
                                <span>เริ่มการแข่งขัน</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </>
    );
};

export default DrawSection;
