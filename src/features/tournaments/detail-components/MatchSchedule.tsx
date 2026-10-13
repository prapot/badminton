import React, { useState } from 'react';
import Image from 'next/image';
import { TournamentInfo, User, ApiMatch } from '../types';
import { getRankInfoFromPoints } from '../utils/TournamentUtils';
import RankBadge from '../components/RankBadge';
import SkillBadge from '../components/SkillBadge';
import { cn } from '@/shared/utils/utils';
import { ClipboardList, RefreshCw, XCircle, CheckCircle, Activity, Trophy, Play, MoreHorizontal, PenLine } from 'lucide-react';

interface MatchScheduleProps {
    tournamentInfo: TournamentInfo;
    user: User | null;
    apiMatches: ApiMatch[];
    fetchMatches: () => void;
    handleFinishTournament: () => void;
    starting: boolean;
    setScoreEditing: (match: ApiMatch) => void;
    setScoreA: (score: number) => void;
    setScoreB: (score: number) => void;
    STRAPI_BASE_URL: string;
    isOwner?: boolean;
}

// ── helpers ──────────────────────────────────────────────────────────
function PlayerRow({
    tp,
    tournamentInfo,
    STRAPI_BASE_URL,
    match,
    isWinner,
    isCompleted,
    firstServeKey,
    firstServeIdx,
    currentUserId,
}: {
    tp: any;
    tournamentInfo: TournamentInfo;
    STRAPI_BASE_URL: string;
    match: ApiMatch;
    isWinner: boolean;
    isCompleted: boolean;
    firstServeKey: 'A' | 'B';
    firstServeIdx: number;
    currentUserId?: number;
}) {
    const uFromTp = tp.user_id || (tp.guest_name ? { id: 0, username: tp.guest_name, picture: null, rankings: [] } : null);
    const u = uFromTp
        ? (tournamentInfo.players?.find(
              p => (tp.user_id && p.id === tp.user_id.id) || (tp.guest_name && p.is_guest && p.guest_name === tp.guest_name)
          ) || uFromTp)
        : null;
    if (!u) return null;

    const pUrl = u.picture?.url
        ? u.picture.url.startsWith('http') ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`
        : null;

    const rp_change = match.match_histories?.find(mh => mh.users?.some(us => us.id === u.id))?.rp_change;
    const isFirstServe = match.first_serve === firstServeKey && firstServeIdx === 0;

    // Rank-up warning (for upcoming matches)
    const showRankUpWarning = (() => {
        if (match.match_status !== 'done' && match.match_status !== 'cancelled') {
            const currentRp = u.rankings?.[0]?.ranking_points || 0;
            const currentRank = getRankInfoFromPoints(currentRp);
            const potentialRank = getRankInfoFromPoints(currentRp + 100);
            return potentialRank.rankStr !== currentRank.rankStr && potentialRank.weight > currentRank.weight;
        }
        return false;
    })();

    const isMe = !!currentUserId && tp.user_id?.id === currentUserId;
    const nameColor = isMe
        ? 'text-amber-300'
        : isWinner
        ? 'text-emerald-400'
        : isCompleted
        ? 'text-slate-500'
        : 'text-white';

    return (
        <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar */}
            <div className="relative shrink-0">
                <div className={cn(
                    'w-9 h-9 rounded-full bg-slate-800 overflow-hidden border-2 flex items-center justify-center shadow-inner',
                    isFirstServe ? 'border-emerald-500/80 shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'border-slate-700/50'
                )}>
                    {pUrl
                        ? <Image src={pUrl} alt={u.username} width={36} height={36} className="w-full h-full object-cover" />
                        : <span className="text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>
                    }
                </div>
                {isFirstServe && (
                    <div className="absolute -top-1 -right-1 z-30 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0d1117] flex items-center justify-center" title="เสิร์ฟก่อน">
                        <span className="text-[8px]">🏸</span>
                    </div>
                )}
            </div>

            {/* Name (full width), then rank / RP on the same line when it fits */}
            <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn('font-bold text-sm leading-tight truncate', nameColor)}>
                        {u.username}
                    </span>
                    {isMe && (
                        <span className="shrink-0 text-[11px] font-black px-1.5 py-px rounded-md bg-amber-400 text-slate-900">คุณ</span>
                    )}
                    {(u as any).skill_level && (
                        <div className="shrink-0"><SkillBadge skillLevel={(u as any).skill_level} showLabel={false} /></div>
                    )}
                </div>

                {tournamentInfo.mode === 'ranking' && (
                    <div className="flex items-center gap-1.5 -mt-0.5 flex-wrap">
                        <div className="scale-[0.8] origin-left -my-0.5">
                            <RankBadge rank={u.rankings?.[0]?.rank} stars={u.rankings?.[0]?.stars} size="sm" showName={true} />
                        </div>
                        {showRankUpWarning && (
                            <span className="text-[10px] font-black px-1.5 py-px rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white whitespace-nowrap">
                                RANK UP
                            </span>
                        )}
                        {rp_change !== undefined && (
                            <span className={cn(
                                'text-[11px] font-bold px-1.5 py-px rounded-full border shrink-0',
                                rp_change > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : rp_change < 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                    : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                            )}>
                                {rp_change > 0 ? '+' : rp_change < 0 ? '-' : '+'}{Math.abs(Math.floor(rp_change / 100))} ⭐
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────
const MatchSchedule: React.FC<MatchScheduleProps> = ({
    tournamentInfo,
    user,
    apiMatches,
    fetchMatches,
    handleFinishTournament,
    starting,
    setScoreEditing,
    setScoreA,
    setScoreB,
    STRAPI_BASE_URL,
    isOwner,
}) => {
    const isOwnerOrAdmin = isOwner !== undefined
        ? isOwner
        : (!!user?.id && Number(tournamentInfo.user_created?.id) === Number(user?.id));

    const [menuOpen, setMenuOpen] = useState(false);

    if (tournamentInfo.tournament_status !== 'ongoing' && tournamentInfo.tournament_status !== 'completed') return null;

    const rounds = Array.from(new Set(apiMatches.map(m => m.round)));
    const isMine = (m: ApiMatch) => !!user?.id && [m.team_a_id, m.team_b_id].some(t => t?.team_players.some(tp => tp.user_id?.id === user.id));
    const isLiveMatch = (m: ApiMatch) => tournamentInfo.tournament_status === 'ongoing' && m.match_status !== 'done' && m.match_status !== 'cancelled';
    // Anchor for the "ถึงคิวคุณ" tab badge
    const myLiveMatchId = apiMatches.find(m => isMine(m) && isLiveMatch(m))?.id;

    return (
        <div id="match-schedule" className="bg-gradient-to-br from-brand-dark to-brand-darker border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

            {/* ── Header ── */}
            <div className="px-4 py-3 sm:px-6 border-b border-white/10 flex items-center justify-between gap-3 relative z-30 bg-white/5 backdrop-blur-md">
                <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 flex items-center gap-2.5 text-base sm:text-lg">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg text-white shrink-0">
                        <ClipboardList size={18} strokeWidth={2.5} />
                    </div>
                    ตารางแมตช์
                </h2>

                {/* Rarely-used / destructive actions live in a menu so they can't be hit by accident */}
                <div className="relative shrink-0">
                    <button
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label="ตัวเลือกเพิ่มเติม"
                        aria-expanded={menuOpen}
                        className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-slate-300 transition-all"
                    >
                        <MoreHorizontal size={20} />
                    </button>
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-12 z-30 w-56 rounded-2xl border border-white/10 bg-[#141f2e] shadow-2xl p-1.5">
                                <button
                                    onClick={() => { setMenuOpen(false); fetchMatches(); }}
                                    className="w-full flex items-center gap-2.5 px-3 min-h-11 rounded-xl text-sm text-slate-200 hover:bg-white/5"
                                >
                                    <RefreshCw size={16} /> รีเฟรชข้อมูล
                                </button>
                                {tournamentInfo.tournament_status === 'ongoing' && isOwner && (
                                    <>
                                        <div className="h-px bg-white/10 my-1" />
                                        <button
                                            onClick={() => { setMenuOpen(false); handleFinishTournament(); }}
                                            disabled={starting}
                                            className="w-full flex items-center gap-2.5 px-3 min-h-11 rounded-xl text-sm font-bold text-orange-400 hover:bg-orange-500/10 disabled:opacity-50"
                                        >
                                            <Trophy size={16} /> จบการแข่งขัน
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Body ── */}
            {apiMatches.length === 0 ? (
                <div className="py-20 text-center text-slate-500 relative z-10 flex flex-col items-center gap-4">
                    <div className="p-4 bg-white/5 rounded-full">
                        <ClipboardList size={40} className="opacity-40" />
                    </div>
                    <p className="text-sm font-medium">ยังไม่มีข้อมูลแมตช์การแข่งขัน</p>
                </div>
            ) : (
                <div className="p-3 sm:p-5 space-y-8 relative z-10">
                    {rounds.map(round => {
                        const roundMatches = apiMatches
                            .filter(m => m.round === round)
                            .sort((a, b) => {
                                // My upcoming/live match first, then upcoming, done, cancelled
                                const order = (m: ApiMatch) => (isMine(m) && isLiveMatch(m) ? -1 : 0) +
                                    (m.match_status === 'upcoming' ? 0 : m.match_status === 'done' ? 1 : m.match_status === 'cancelled' ? 2 : 3);
                                const diff = order(a) - order(b);
                                return diff !== 0 ? diff : (b.match_no ?? 0) - (a.match_no ?? 0);
                            });

                        return (
                            <div key={round} className="space-y-3">
                                {/* Round header */}
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                                        แมตช์ #{round}
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                </div>

                                {/* Match cards */}
                                <div className="grid gap-3">
                                    {roundMatches.map((match, idx) => {
                                        const isCompleted = match.match_status === 'done';
                                        const isCancelled = match.match_status === 'cancelled';
                                        const winnerA = isCompleted && (match.score_a ?? 0) > (match.score_b ?? 0);
                                        const winnerB = isCompleted && (match.score_b ?? 0) > (match.score_a ?? 0);

                                        const isUserInMatch = isMine(match);
                                        // Full gold treatment only while it's actually your turn; finished ones just keep a small tag
                                        const isMyTurn = isUserInMatch && isLiveMatch(match);

                                        const handleClick = () => {
                                            if (tournamentInfo.tournament_status === 'completed') return;
                                            if ((isCancelled || isCompleted) && !isOwnerOrAdmin) return;
                                            setScoreEditing(match);
                                            setScoreA(match.score_a ?? 0);
                                            setScoreB(match.score_b ?? 0);
                                        };

                                        return (
                                            <div
                                                key={match.id}
                                                id={match.id === myLiveMatchId ? 'my-live-match' : undefined}
                                                onClick={handleClick}
                                                className={cn(
                                                    'group relative overflow-hidden rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both',
                                                    isCancelled
                                                        ? 'bg-black/20 border-white/5 opacity-60 grayscale cursor-not-allowed'
                                                        : isMyTurn
                                                        ? 'scroll-mt-36 bg-amber-500/[0.08] border-amber-400/60 ring-2 ring-amber-400/30 cursor-pointer hover:-translate-y-0.5 active:scale-[0.99]'
                                                        : 'bg-black/20 border-white/5 cursor-pointer hover:bg-black/40 hover:-translate-y-0.5 hover:shadow-xl hover:border-white/10 active:scale-[0.99]'
                                                )}
                                                style={{
                                                    animationDelay: `${idx * 80}ms`,
                                                    ...(isMyTurn ? {
                                                        boxShadow: '0 0 0 1px rgba(251,191,36,0.15), 0 0 20px rgba(251,191,36,0.12), 0 4px 24px rgba(0,0,0,0.4)'
                                                    } : {})
                                                }}
                                            >
                                                {/* Top accent strip */}
                                                <div className={cn(
                                                    'h-0.5 w-full',
                                                    isCancelled ? 'bg-slate-700/50'
                                                        : isCompleted ? 'bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500'
                                                        : isMyTurn ? 'h-1 bg-gradient-to-r from-amber-400 to-orange-500'
                                                        : 'bg-gradient-to-r from-blue-500/50 via-violet-500/30 to-transparent'
                                                )} />

                                                {/* ── Card content ── */}
                                                <div className="px-3 py-2.5 sm:px-4 sm:py-3">
                                                    {/* Top row: match no + status */}
                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-xs font-black text-slate-400 tabular-nums">
                                                                #{match.match_no}
                                                            </span>
                                                            {isMyTurn ? (
                                                                <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 whitespace-nowrap animate-pulse">
                                                                    🏸 ถึงคิวคุณ!
                                                                </span>
                                                            ) : isUserInMatch && !isCancelled ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-300/80 border-amber-400/20 whitespace-nowrap">
                                                                    แมตช์ของคุณ
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        {isCancelled ? (
                                                            <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold border bg-rose-500/10 text-rose-400 border-rose-500/20 whitespace-nowrap">
                                                                <XCircle size={12} strokeWidth={2.5} /> ยกเลิกแล้ว
                                                            </div>
                                                        ) : isCompleted ? (
                                                            <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold border bg-emerald-500/15 text-emerald-400 border-emerald-500/25 whitespace-nowrap">
                                                                <CheckCircle size={12} strokeWidth={2.5} /> จบแล้ว
                                                            </div>
                                                        ) : tournamentInfo.tournament_status === 'ongoing' ? (
                                                            <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold border bg-blue-500/10 text-blue-400 border-blue-500/20 whitespace-nowrap">
                                                                <Activity size={12} /> กำลังแข่ง
                                                            </div>
                                                        ) : (
                                                            <div className="text-[11px] px-2 py-0.5 rounded-full font-bold border bg-white/5 text-slate-400 border-white/10">
                                                                รอแข่ง
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* ── Team A / VS / Team B (stacked so full names + avatars fit) ── */}
                                                    {(() => {
                                                        const teamRow = (
                                                            team: typeof match.team_a_id,
                                                            key: 'A' | 'B',
                                                            isWinner: boolean,
                                                            score: number | null | undefined,
                                                        ) => (
                                                            <div className={cn('flex items-center gap-2 rounded-xl px-1.5 py-0.5', isWinner && 'bg-emerald-500/10')}>
                                                                <div className="flex-1 min-w-0 space-y-1">
                                                                    {team?.team_players.length ? (
                                                                        team.team_players.map((tp, i) => (
                                                                            <PlayerRow
                                                                                key={i}
                                                                                tp={tp}
                                                                                tournamentInfo={tournamentInfo}
                                                                                STRAPI_BASE_URL={STRAPI_BASE_URL}
                                                                                match={match}
                                                                                isWinner={isWinner}
                                                                                currentUserId={user?.id}
                                                                                isCompleted={isCompleted}
                                                                                firstServeKey={key}
                                                                                firstServeIdx={i}
                                                                            />
                                                                        ))
                                                                    ) : key === 'B' && !team ? (
                                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                                            <Play className="shrink-0" size={12} /> รอบบาย / พัก
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-sm font-bold text-slate-500">ทีม {team?.team_no ?? '?'}</div>
                                                                    )}
                                                                </div>
                                                                {isCompleted && (
                                                                    <span className={cn(
                                                                        'shrink-0 w-10 text-right text-3xl font-black tabular-nums leading-none',
                                                                        isWinner ? 'text-emerald-400' : 'text-slate-500'
                                                                    )}>
                                                                        {score}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                        return (
                                                            <div className="space-y-0.5">
                                                                {teamRow(match.team_a_id, 'A', winnerA, match.score_a)}
                                                                <div className="flex items-center gap-2 px-1">
                                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-white/5" />
                                                                    <Image
                                                                        src="/vs.png"
                                                                        alt="VS"
                                                                        width={32}
                                                                        height={20}
                                                                        className={cn('object-contain w-7', isCompleted || isCancelled ? 'opacity-30 grayscale' : 'opacity-90')}
                                                                    />
                                                                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/10 to-white/5" />
                                                                </div>
                                                                {teamRow(match.team_b_id, 'B', winnerB, match.score_b)}
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Explicit action instead of an invisible "tap the card" */}
                                                    {tournamentInfo.tournament_status === 'ongoing' && !isCancelled && !isCompleted && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleClick(); }}
                                                            className="mt-2.5 w-full min-h-11 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition-transform"
                                                        >
                                                            <PenLine size={16} /> บันทึกผล
                                                        </button>
                                                    )}
                                                    {tournamentInfo.tournament_status === 'ongoing' && (isCompleted || isCancelled) && isOwnerOrAdmin && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleClick(); }}
                                                            className="mt-2 w-full min-h-11 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5"
                                                        >
                                                            <PenLine size={14} /> แก้ไขผล
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MatchSchedule;
