"use client";

import { useState, useEffect } from "react";
import RankBadge from "../components/RankBadge";
import SkillBadge from "../components/SkillBadge";
import { RegisteredPlayer, ApiMatch } from "../types";

export type PairingMode = "auto" | "manual";

export interface PermanentTeam {
    id: string;
    label: string;
    players: RegisteredPlayer[];
}


import { useEndlessModeManager, UseEndlessModeManagerProps } from "../hooks/useEndlessModeManager";


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

export default function EndlessModeManager(props: UseEndlessModeManagerProps) {
    const {
        tournamentType, players, userId, jwt, pausedPlayerIds, tournamentMode
    } = props;

    const {
        drawing,
        pairingMode, setPairingMode,
        manualTeamA, setManualTeamA,
        manualTeamB, setManualTeamB,
        activeManualTeam, setActiveManualTeam,
        previewMatch, setPreviewMatch,
        selectedSwapPlayer, setSelectedSwapPlayer,
        showPlayerList, setShowPlayerList,
        permanentTeams,
        selectedForNew, setSelectedForNew,
        editingTeamId,
        playersPerTeam,
        busyPlayerIds, actualPlayerCounts,
        availablePlayers, assignedPlayerIds, teamMatchCounts,
        handleTogglePause,
        toggleSelectPlayer,
        addOrUpdateTeam,
        startEditTeam,
        cancelEdit,
        removeTeam,
        calculateNextMatch,
        handleConfirmMatch,
        handleConfirmManualMatch,
        spinnerSvg,
        availableCount,
        totalCount,
        handleEditOffset,
        isBlockedTeammates
    } = useEndlessModeManager(props);

    const [isTeamBuilderOpen, setIsTeamBuilderOpen] = useState(false);

    useEffect(() => {
        if (editingTeamId) {
            setIsTeamBuilderOpen(true);
        }
    }, [editingTeamId]);

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
                    <div className="flex bg-white/5 rounded-xl p-1 mb-3 gap-1">
                        <button
                            onClick={() => setPairingMode('auto')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${pairingMode === 'auto' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                        >
                            🎲 สุ่มอัตโนมัติ
                        </button>
                        <button
                            onClick={() => { setPairingMode('manual'); setPreviewMatch(null); }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${pairingMode === 'manual' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                        >
                            ✍️ จัดคู่เอง
                        </button>
                        <button
                            onClick={() => { setPairingMode('team'); setPreviewMatch(null); }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${pairingMode === 'team' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                        >
                            🛡️ ทีมถาวร
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

                                                            // Stealth Block Check: Silent prevention of swapping blocked players together
                                                            if (tournamentType === "double" && newTeamA[1] && newTeamB[1] && (
                                                                isBlockedTeammates(newTeamA[0].id, newTeamA[1].id) ||
                                                                isBlockedTeammates(newTeamB[0].id, newTeamB[1].id)
                                                            )) {
                                                                setSelectedSwapPlayer(null);
                                                                return;
                                                            }

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
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-sm font-bold text-white truncate">{p.username}</span>
                                                                {p.skill_level && <SkillBadge skillLevel={p.skill_level} showLabel={false} />}
                                                            </div>
                                                            {p.nickname && <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{p.nickname}</span>}
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

                                                            // Stealth Block Check: Silent prevention of swapping blocked players together
                                                            if (tournamentType === "double" && newTeamA[1] && newTeamB[1] && (
                                                                isBlockedTeammates(newTeamA[0].id, newTeamA[1].id) ||
                                                                isBlockedTeammates(newTeamB[0].id, newTeamB[1].id)
                                                            )) {
                                                                setSelectedSwapPlayer(null);
                                                                return;
                                                            }

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
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-sm font-bold text-white truncate">{p.username}</span>
                                                                {p.skill_level && <SkillBadge skillLevel={p.skill_level} showLabel={false} />}
                                                            </div>
                                                            {p.nickname && <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{p.nickname}</span>}
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
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1.5">
                                                                <span>{p.username}</span>
                                                                {p.skill_level && <SkillBadge skillLevel={p.skill_level} showLabel={false} />}
                                                            </div>
                                                            {p.nickname && <span className="text-[9px] text-slate-400 font-medium truncate mt-0.5 leading-tight">{p.nickname}</span>}
                                                        </div>
                                                    </span>
                                                    {tournamentMode === 'ranking' && <RankBadge rank={p.rankings?.[0]?.rank} stars={p.rankings?.[0]?.stars} size="sm" showName={false} />}
                                                    {isBusy && <span className="text-[9px] text-orange-400 font-bold shrink-0">แข่งอยู่</span>}
                                                    {isPaused && !isBusy && <span className="text-[9px] text-yellow-500 font-bold shrink-0">พัก</span>}
                                                    <span className="text-[10px] text-slate-600 shrink-0">{actualPlayerCounts.get(p.id) || 0}แมตซ์</span>
                                                    {!isBusy && (
                                                        <button
                                                            onClick={() => handleTogglePause(p as RegisteredPlayer)}
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
                            {/* VS Style Team Slots */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 relative mt-2">
                                {/* Team A */}
                                <div 
                                    onClick={() => setActiveManualTeam("A")}
                                    className={`p-3 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeManualTeam === "A" ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "bg-black/20 border-white/5 hover:border-white/10 hover:bg-white/[0.02]"}`}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${activeManualTeam === "A" ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-500"}`}>ทีม A</span>
                                        <span className={`text-[10px] font-bold ${manualTeamA.length === playersPerTeam ? "text-indigo-400" : "text-slate-500"}`}>{manualTeamA.length}/{playersPerTeam}</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {Array.from({ length: playersPerTeam }).map((_, i) => {
                                            const p = manualTeamA[i];
                                            return (
                                                <div key={i} className={`h-12 rounded-xl flex items-center justify-between px-3 border transition-all ${p ? "bg-indigo-500/20 border-indigo-500/40" : "bg-black/40 border-dashed border-white/10"}`}>
                                                    {p ? (
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="hidden sm:flex w-6 h-6 rounded-full bg-slate-800 border border-indigo-500/30 items-center justify-center shrink-0">
                                                                <span className="text-[9px] font-bold text-indigo-400">{p.username.charAt(0).toUpperCase()}</span>
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-indigo-300 text-xs sm:text-sm truncate block">{p.username}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] uppercase tracking-wider text-slate-500">เลือกคนที่ {i+1}</span>
                                                    )}
                                                    {p && <button onClick={(e) => { e.stopPropagation(); setManualTeamA(manualTeamA.filter(x => x.id !== p.id)); }} className="w-6 h-6 rounded-full hover:bg-red-500/20 text-red-400/50 hover:text-red-400 flex items-center justify-center text-xs transition-colors shrink-0">✕</button>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* VS Divider for Desktop (Hidden on mobile) */}
                                <div className="hidden sm:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 border border-white/10 items-center justify-center z-10 shadow-lg shadow-black/50">
                                    <span className="text-[9px] font-black text-slate-500 italic">VS</span>
                                </div>

                                {/* Team B */}
                                <div 
                                    onClick={() => setActiveManualTeam("B")}
                                    className={`p-3 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeManualTeam === "B" ? "bg-rose-500/10 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]" : "bg-black/20 border-white/5 hover:border-white/10 hover:bg-white/[0.02]"}`}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${activeManualTeam === "B" ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-slate-500"}`}>ทีม B</span>
                                        <span className={`text-[10px] font-bold ${manualTeamB.length === playersPerTeam ? "text-rose-400" : "text-slate-500"}`}>{manualTeamB.length}/{playersPerTeam}</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {Array.from({ length: playersPerTeam }).map((_, i) => {
                                            const p = manualTeamB[i];
                                            return (
                                                <div key={i} className={`h-12 rounded-xl flex items-center justify-between px-3 border transition-all ${p ? "bg-rose-500/20 border-rose-500/40" : "bg-black/40 border-dashed border-white/10"}`}>
                                                    {p ? (
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="hidden sm:flex w-6 h-6 rounded-full bg-slate-800 border border-rose-500/30 items-center justify-center shrink-0">
                                                                <span className="text-[9px] font-bold text-rose-400">{p.username.charAt(0).toUpperCase()}</span>
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-rose-300 text-xs sm:text-sm truncate block">{p.username}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] uppercase tracking-wider text-slate-500">เลือกคนที่ {i+1}</span>
                                                    )}
                                                    {p && <button onClick={(e) => { e.stopPropagation(); setManualTeamB(manualTeamB.filter(x => x.id !== p.id)); }} className="w-6 h-6 rounded-full hover:bg-red-500/20 text-red-400/50 hover:text-red-400 flex items-center justify-center text-xs transition-colors shrink-0">✕</button>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Confirm Button */}
                            {manualTeamA.length === playersPerTeam && manualTeamB.length === playersPerTeam && (
                                <button
                                    onClick={handleConfirmManualMatch}
                                    disabled={drawing}
                                    className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-[0.98] text-white font-black text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
                                >
                                    {drawing ? spinnerSvg : "⚔️ ตกลงและเริ่มแข่ง"}
                                </button>
                            )}

                            {/* Available Players List for Manual Mode */}
                            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 mt-2">
                                <div className="text-xs font-bold text-white mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">👥</span>
                                        <span>เลือกผู้เล่นเข้า {activeManualTeam === "A" ? <span className="text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded">ทีม A</span> : <span className="text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">ทีม B</span>}</span>
                                    </div>
                                    <span className="text-slate-500 text-[10px] font-normal px-2 py-1 bg-white/5 rounded-lg">{availablePlayers.length} ว่าง</span>
                                </div>
                                <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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
                                                    className={`w-full flex justify-between items-center p-3 rounded-xl border text-left transition-all group ${isSelected ? "opacity-40 bg-black/40 border-transparent cursor-not-allowed" : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"}`}
                                                >
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <div className="text-xs sm:text-sm font-bold text-slate-200 truncate">{p.username}</div>
                                                            {p.skill_level && <div className="shrink-0"><SkillBadge skillLevel={p.skill_level} showLabel={false} /></div>}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-1"><span className="text-[8px]">⚔️</span> {actualPlayerCounts.get(p.id) || 0}</div>
                                                            {p.nickname && <div className="text-[9px] text-slate-400 font-medium truncate">{p.nickname}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                        {tournamentMode === 'ranking' && <RankBadge rank={p.rankings?.[0]?.rank} stars={p.rankings?.[0]?.stars} size="sm" showName={false} />}
                                                        {isSelected && <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${isInTeamA ? "text-indigo-300 bg-indigo-500/20" : "text-rose-300 bg-rose-500/20"}`}>{isInTeamA ? "ทีม A" : "ทีม B"}</span>}
                                                        {!isSelected && <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-white group-hover:border-white/30 transition-colors">
                                                            <span className="text-[10px]">➕</span>
                                                        </div>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    {availablePlayers.length === 0 && <div className="col-span-full text-xs text-center text-slate-500 py-6 border border-dashed border-white/10 rounded-xl bg-white/5">ไม่มีผู้เล่นว่างในระบบ</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ══════════════════ FIXED PAIRS (TEAM BUILDER) ══════════════════ */}
                {pairingMode === 'team' && (
                    <div className="pb-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    {/* ── Existing permanent teams ── */}
                    {permanentTeams.length > 0 && (
                        <div className="px-4 pt-2 pb-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ทีมถาวร</span>
                                <span className="text-[10px] text-slate-600">{permanentTeams.length} ทีม</span>
                            </div>
                            <div className="space-y-1.5">
                                {[...permanentTeams]
                                    .sort((a, b) => (a.players.some((p: { id: number; }) => busyPlayerIds.has(p.id)) ? 1 : 0) - (b.players.some((p: { id: number; }) => busyPlayerIds.has(p.id)) ? 1 : 0))
                                    .map((team, idx) => {
                                        const color = TEAM_COLORS[idx % TEAM_COLORS.length];
                                        const isBusy = team.players.some((p: { id: number; }) => busyPlayerIds.has(p.id));
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
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[11px] font-bold text-white truncate">{p.username}</span>
                                                                    {p.skill_level && <SkillBadge skillLevel={p.skill_level} showLabel={false} />}
                                                                </div>
                                                                {p.nickname && <span className="text-[9px] text-slate-400 font-medium truncate mt-0.5">{p.nickname}</span>}
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
                    <div className="mx-4 mb-4 mt-2">
                        <button
                            onClick={() => setIsTeamBuilderOpen(!isTeamBuilderOpen)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isTeamBuilderOpen ? "bg-black/20 border-white/5 rounded-b-none border-b-transparent" : "bg-black/20 border-white/5 hover:bg-white/[0.02]"}`}
                        >
                            <h3 className="text-sm font-black text-white flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs shadow-inner shadow-amber-500/10">
                                    {editingTeamId ? "✏️" : "➕"}
                                </span>
                                {editingTeamId
                                    ? `แก้ไข ${permanentTeams.find(t => t.id === editingTeamId)?.label ?? ""}`
                                    : `บันทึกทีม ${permanentTeams.length + 1}`}
                            </h3>
                            <div className="flex items-center gap-3">
                                {isTeamBuilderOpen && (
                                    <span className={`text-xs font-black px-2 py-1 rounded-lg border ${selectedForNew.length === playersPerTeam ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "bg-white/5 text-slate-400 border-white/10"}`}>
                                        {selectedForNew.length}/{playersPerTeam}
                                    </span>
                                )}
                                <span className={`transition-transform duration-200 text-slate-400 ${isTeamBuilderOpen ? "rotate-180" : ""}`}>▾</span>
                            </div>
                        </button>

                        {isTeamBuilderOpen && (
                            <div className="p-4 sm:p-5 bg-black/20 rounded-b-2xl border border-t-0 border-white/5 animate-in fade-in slide-in-from-top-2">
                                {/* Visual Slots */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {Array.from({ length: playersPerTeam }).map((_, i) => {
                                const p = selectedForNew[i];
                                return (
                                    <div key={i} className={`h-12 sm:h-14 rounded-xl border-2 flex items-center justify-between px-3 transition-all ${
                                        p 
                                        ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
                                        : "bg-black/40 border-dashed border-white/10 text-slate-500"
                                    }`}>
                                        {p ? (
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="hidden sm:flex w-7 h-7 rounded-full bg-slate-800 border border-amber-500/30 items-center justify-center shrink-0">
                                                    <span className="text-[10px] font-bold text-amber-400">{p.username.charAt(0).toUpperCase()}</span>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-amber-300 text-xs sm:text-sm truncate block">{p.username}</span>
                                                    {p.skill_level && <span className="text-[9px] text-amber-500/80">{p.skill_level}</span>}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="hidden sm:flex w-7 h-7 rounded-full bg-white/5 border border-dashed border-white/10 items-center justify-center">
                                                    <span className="text-[10px] text-slate-600">?</span>
                                                </div>
                                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">เลือกคนที่ {i+1}</span>
                                            </div>
                                        )}
                                        {p && (
                                            <button onClick={() => toggleSelectPlayer(p)} className="w-6 h-6 rounded-full hover:bg-red-500/20 text-red-400/50 hover:text-red-400 flex items-center justify-center text-xs transition-colors shrink-0">✕</button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Player picker (Grid for Desktop, List for Mobile) */}
                        <div className="max-h-[250px] overflow-y-auto pr-1 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 gap-2 mb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {players.length === 0 && (
                                <div className="col-span-full py-8 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/5">
                                    <span className="text-2xl mb-2">👤</span>
                                    <p className="text-xs text-slate-400 font-medium">ไม่มีผู้เล่นว่างในระบบ</p>
                                </div>
                            )}
                            {players.map(p => {
                                const isSelected = selectedForNew.some(s => s.id === p.id);
                                const isAssigned = assignedPlayerIds.has(p.id);
                                const isMaxed = selectedForNew.length >= playersPerTeam && !isSelected;
                                const isBusy = busyPlayerIds.has(p.id);
                                const canManage = !!userId;
                                const disabled = isAssigned || isMaxed;

                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => !disabled && toggleSelectPlayer(p)}
                                        disabled={disabled}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all group ${isSelected
                                            ? "bg-amber-500/15 border-amber-500/35 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                                            : isAssigned
                                                ? "bg-black/40 border-white/5 opacity-50 cursor-not-allowed"
                                                : disabled
                                                    ? "bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected
                                            ? "border-amber-400 bg-amber-400"
                                            : isAssigned
                                                ? "border-slate-600 bg-slate-800"
                                                : "border-slate-500 group-hover:border-slate-400"
                                            }`}>
                                            {isSelected && <span className="text-[10px] text-black font-black leading-none">✓</span>}
                                            {isAssigned && <span className="text-[8px] text-slate-500 leading-none">🔒</span>}
                                        </div>

                                        <div className="flex-1 flex flex-col items-start min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0 w-full">
                                                <span className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>{p.username}</span>
                                                {p.skill_level && <div className="shrink-0"><SkillBadge skillLevel={p.skill_level} showLabel={false} /></div>}
                                                {isBusy && <span className="text-[8px] font-black uppercase bg-orange-500/20 text-orange-400 px-1 rounded shrink-0">แข่งอยู่</span>}
                                            </div>
                                        </div>

                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (canManage) {
                                                    handleEditOffset(p as RegisteredPlayer, actualPlayerCounts.get(p.id) || 0);
                                                }
                                            }}
                                            role="button"
                                            className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 cursor-pointer flex items-center gap-1 ${canManage ? "bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20" : "bg-white/5 text-slate-500"}`}
                                            title={canManage ? "ปรับจำนวนแมตช์" : undefined}
                                        >
                                            {actualPlayerCounts.get(p.id) || 0} ⚔️
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Save / Cancel */}
                        <div className="flex gap-3">
                            <button
                                onClick={addOrUpdateTeam}
                                disabled={selectedForNew.length !== playersPerTeam}
                                className="flex-1 min-h-[50px] rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:shadow-none shadow-[0_0_20px_rgba(245,158,11,0.3)] text-white font-black text-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                {editingTeamId ? "💾 บันทึกการแก้ไข" : "⚡ บันทึกทีมนี้"}
                            </button>
                            {(selectedForNew.length > 0 || editingTeamId) && (
                                <button
                                    onClick={cancelEdit}
                                    className="w-[50px] rounded-xl border-2 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-600 active:scale-95 transition-all flex items-center justify-center shrink-0 font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                            </div>
                        )}
                    </div>
                    </div>
                )}

            </div>
        </div>
    );
}
