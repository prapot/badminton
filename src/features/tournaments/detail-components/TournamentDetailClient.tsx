"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/shared/components/Navbar";
import { useAuth } from "@/features/auth/useAuth";

import { useTournamentToast } from "../detail-hooks/useTournamentToast";
import { useTournamentData } from "../detail-hooks/useTournamentData";
import { useTournamentActions } from "../detail-hooks/useTournamentActions";
import { useTournamentDraw } from "../detail-hooks/useTournamentDraw";
import { useTournamentScoring } from "../detail-hooks/useTournamentScoring";
import { useMatchNotification } from "../detail-hooks/useMatchNotification";

import FullScoreEditorModal from "./FullScoreEditorModal";
import TournamentHeader from "./TournamentHeader";
import ParticipantsList from "./ParticipantsList";
import DrawSection from "./DrawSection";
import MatchSchedule from "./MatchSchedule";
import QRInviteModal from "./QRInviteModal";
import KnockoutManager from "./KnockoutManager";
import EndlessModeManager from "./EndlessModeManager";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

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

export function TournamentDetailClient({ id }: { id: string }) {
    const router = useRouter();
    const { user, jwt } = useAuth();
    const [showQR, setShowQR] = useState(false);

    // --- Hooks ---
    const { toast, showToast } = useTournamentToast();

    const {
        tournamentInfo, setTournamentInfo,
        apiMatches,
        playerMatchCounts,
        pausedPlayerIds, setPausedPlayerIds,
        fetchMatches, refreshInfo
    } = useTournamentData(id, jwt);

    // Watch for new matches for the user to alert them
    useMatchNotification(apiMatches, user);

    const {
        joining, leaving, isJoined,
        confirmDelete, setConfirmDelete, deleting,
        starting, setStarting, startStep, setStartStep,
        handleJoin, handleLeave, handleDelete, handleFinishTournament
    } = useTournamentActions({
        id, jwt, user, tournamentInfo, setTournamentInfo, apiMatches,
        pausedPlayerIds, playerMatchCounts, refreshInfo, fetchMatches, showToast
    });

    const {
        drawnPairs, setDrawnPairs,
        drawMode, setDrawMode,
        roundsPerPlayer, setRoundsPerPlayer,
        numCourts, setNumCourts,
        totalRepeatsCount,
        handleDrawFair, handleStartTournament
    } = useTournamentDraw({
        id, jwt, tournamentInfo, setTournamentInfo, apiMatches,
        pausedPlayerIds, showToast, starting, setStarting, setStartStep
    });

    const {
        scoreEditing, setScoreEditing,
        scoreA, setScoreA,
        scoreB, setScoreB,
        savingScore,
        handleCancelMatch, handleSaveScore
    } = useTournamentScoring({
        id, jwt, tournamentInfo, setTournamentInfo, apiMatches, refreshInfo, showToast
    });

    if (!user) return null;

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
                <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-50 flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border text-sm font-medium animate-in slide-in-from-bottom-8 fade-in duration-300 zoom-in-95 ${toast.type === "success"
                    ? "bg-accent-green/10 border-accent-green/30 text-accent-green shadow-[0_4px_30px_rgba(46,204,113,0.15)]"
                    : "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_4px_30px_rgba(239,68,68,0.15)]"
                    }`}>
                    <span className="text-base">{toast.type === "success" ? "✨" : "⚠️"}</span> 
                    <span>{toast.msg}</span>
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
                {!tournamentInfo ? (
                    <div className="space-y-6 animate-pulse">
                        <div className="flex gap-4 items-start">
                            <div className="w-9 h-9 rounded-xl bg-white/5 shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div className="h-6 bg-white/10 rounded w-1/3" />
                                <div className="flex gap-2">
                                    <div className="h-5 bg-white/5 rounded w-20" />
                                    <div className="h-5 bg-white/5 rounded w-16" />
                                    <div className="h-5 bg-white/5 rounded w-24" />
                                </div>
                            </div>
                        </div>
                        <div className="h-40 bg-white/5 rounded-2xl border border-white/5" />
                        <div className="grid gap-4">
                            <div className="h-28 bg-white/5 rounded-2xl border border-white/5" />
                            <div className="h-28 bg-white/5 rounded-2xl border border-white/5" />
                            <div className="h-28 bg-white/5 rounded-2xl border border-white/5" />
                        </div>
                    </div>
                ) : (
                    <>
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

                {tournamentInfo && (
                    <>
                        <ParticipantsList
                            tournamentId={id as string}
                            tournamentInfo={tournamentInfo}
                            user={user}
                            jwt={jwt!}
                            isJoined={isJoined}
                            joining={joining}
                            leaving={leaving}
                            handleJoin={handleJoin}
                            handleLeave={handleLeave}
                            drawnPairs={drawnPairs}
                            playerMatchCounts={playerMatchCounts}
                            apiMatches={apiMatches}
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
                            tournamentMode={tournamentInfo.mode}
                        />
                    )}

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
                    </>
                )}
            </main>

            <QRInviteModal
                showQR={showQR}
                setShowQR={setShowQR}
                shareUrl={`${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/tournament/${id}`}
            />
        </div>
    );
}
