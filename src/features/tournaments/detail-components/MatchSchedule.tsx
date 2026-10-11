import React from 'react';
import Image from 'next/image';
import { TournamentInfo, User, ApiMatch } from '../types';
import { getRankInfoFromPoints } from '../utils/TournamentUtils';
import RankBadge from '../components/RankBadge';
import SkillBadge from '../components/SkillBadge';
import { cn } from '@/shared/utils/utils';
import { ClipboardList, RefreshCw, XCircle, CheckCircle, Activity, Trophy, Play } from 'lucide-react';

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
}: {
    tp: any;
    tournamentInfo: TournamentInfo;
    STRAPI_BASE_URL: string;
    match: ApiMatch;
    isWinner: boolean;
    isCompleted: boolean;
    firstServeKey: 'A' | 'B';
    firstServeIdx: number;
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

    const nameColor = isWinner
        ? 'text-emerald-400'
        : isCompleted
        ? 'text-slate-500'
        : 'text-white';

    return (
        <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="relative shrink-0">
                <div className={cn(
                    'w-9 h-9 rounded-full bg-slate-800 overflow-hidden border-2 flex items-center justify-center shadow-inner transition-all',
                    isFirstServe ? 'border-emerald-500/80 scale-105 shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'border-slate-700/50'
                )}>
                    {pUrl
                        ? <Image src={pUrl} alt={u.username} width={36} height={36} className="w-full h-full object-cover" />
                        : <span className="text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>
                    }
                </div>
                {isFirstServe && (
                    <div className="absolute -top-1 -right-1 z-30 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0d1117] shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse flex items-center justify-center" title="First Serve">
                        <span className="text-[8px]">🏸</span>
                    </div>
                )}
                {showRankUpWarning && (
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-xl whitespace-nowrap">
                        RANK UP
                    </div>
                )}
            </div>

            {/* Name + badges */}
            <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className={cn('font-bold text-sm leading-tight truncate', nameColor)}>
                        {u.username}
                    </span>
                    {(u as any).skill_level && (
                        <div className="shrink-0"><SkillBadge skillLevel={(u as any).skill_level} showLabel={false} /></div>
                    )}
                    {isWinner && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md shrink-0 border border-emerald-500/20">
                            WIN
                        </span>
                    )}
                </div>

                {/* Nickname */}
                {(u as any).nickname && (
                    <span className="text-[10px] text-slate-500 font-medium truncate leading-tight">{(u as any).nickname}</span>
                )}

                {/* Rank badge + RP change (ranking mode) */}
                {tournamentInfo.mode === 'ranking' && (
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <div className="scale-90 origin-left">
                            <RankBadge rank={u.rankings?.[0]?.rank} stars={u.rankings?.[0]?.stars} size="sm" showName={true} />
                        </div>
                        {rp_change !== undefined && (
                            <span className={cn(
                                'text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0',
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

    if (tournamentInfo.tournament_status !== 'ongoing' && tournamentInfo.tournament_status !== 'completed') return null;

    const rounds = Array.from(new Set(apiMatches.map(m => m.round)));

    return (
        <div id="match-schedule" className="bg-gradient-to-br from-brand-dark to-brand-darker border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

            {/* ── Header ── */}
            <div className="px-4 py-4 sm:px-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 bg-white/5 backdrop-blur-md">
                <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 flex items-center gap-2.5 text-base sm:text-lg">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg text-white shrink-0">
                        <ClipboardList size={18} strokeWidth={2.5} />
                    </div>
                    ตารางแมตซ์
                </h2>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        onClick={() => fetchMatches()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-slate-300 text-xs font-semibold transition-all"
                    >
                        <RefreshCw size={13} />
                        <span>รีเฟรช</span>
                    </button>
                    {tournamentInfo.tournament_status === 'ongoing' && isOwner && (
                        <button
                            onClick={handleFinishTournament}
                            disabled={starting}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 active:scale-95 border border-orange-500/30 text-orange-400 text-xs font-bold transition-all disabled:opacity-50"
                        >
                            <Trophy size={13} />
                            <span>จบการแข่งขัน</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Body ── */}
            {apiMatches.length === 0 ? (
                <div className="py-20 text-center text-slate-500 relative z-10 flex flex-col items-center gap-4">
                    <div className="p-4 bg-white/5 rounded-full">
                        <ClipboardList size={40} className="opacity-40" />
                    </div>
                    <p className="text-sm font-medium">ยังไม่มีข้อมูลแมตซ์การแข่งขัน</p>
                </div>
            ) : (
                <div className="p-3 sm:p-5 space-y-8 relative z-10">
                    {rounds.map(round => {
                        const roundMatches = apiMatches
                            .filter(m => m.round === round)
                            .sort((a, b) => {
                                const order = (s: string) => s === 'upcoming' ? 0 : s === 'done' ? 1 : s === 'cancelled' ? 2 : 3;
                                const diff = order(a.match_status) - order(b.match_status);
                                return diff !== 0 ? diff : (b.match_no ?? 0) - (a.match_no ?? 0);
                            });

                        return (
                            <div key={round} className="space-y-3">
                                {/* Round header */}
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                                        แมตซ์ #{round}
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

                                        const isUserInMatch = user?.id && (
                                            match.team_a_id?.team_players.some(tp => tp.user_id?.id === user.id) ||
                                            match.team_b_id?.team_players.some(tp => tp.user_id?.id === user.id)
                                        );

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
                                                onClick={handleClick}
                                                className={cn(
                                                    'group relative overflow-hidden rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both',
                                                    isCancelled
                                                        ? 'bg-black/20 border-white/5 opacity-60 grayscale cursor-not-allowed'
                                                        : isUserInMatch
                                                        ? 'bg-amber-500/[0.07] border-amber-400/50 ring-2 ring-amber-400/25 cursor-pointer hover:-translate-y-0.5 active:scale-[0.99]'
                                                        : 'bg-black/20 border-white/5 cursor-pointer hover:bg-black/40 hover:-translate-y-0.5 hover:shadow-xl hover:border-white/10 active:scale-[0.99]'
                                                )}
                                                style={{
                                                    animationDelay: `${idx * 80}ms`,
                                                    ...(isUserInMatch && !isCancelled ? {
                                                        boxShadow: '0 0 0 1px rgba(251,191,36,0.15), 0 0 20px rgba(251,191,36,0.12), 0 4px 24px rgba(0,0,0,0.4)'
                                                    } : {})
                                                }}
                                            >
                                                {/* Top accent strip */}
                                                <div className={cn(
                                                    'h-0.5 w-full',
                                                    isCancelled ? 'bg-slate-700/50'
                                                        : isCompleted ? 'bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500'
                                                        : isUserInMatch ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                                                        : 'bg-gradient-to-r from-blue-500/50 via-violet-500/30 to-transparent'
                                                )} />

                                                {/* ── Card content ── */}
                                                <div className="px-3 py-3 sm:px-4 sm:py-3.5">
                                                    {/* Top row: match no + status */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                                # {match.match_no}
                                                            </span>
                                                            {isUserInMatch && !isCancelled && (
                                                                <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-400/40 uppercase tracking-wide animate-pulse">
                                                                    🏸 แมตซ์ของคุณ
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Status badge */}
                                                        {isCancelled ? (
                                                            <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border bg-rose-500/10 text-rose-400 border-rose-500/20">
                                                                <XCircle size={11} strokeWidth={2.5} />
                                                                ยกเลิกแล้ว
                                                            </div>
                                                        ) : isCompleted ? (
                                                            <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
                                                                <CheckCircle size={11} strokeWidth={2.5} />
                                                                จบแล้ว
                                                            </div>
                                                        ) : tournamentInfo.tournament_status === 'ongoing' ? (
                                                            <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse">
                                                                <Activity size={11} />
                                                                กำลังแข่ง
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border bg-white/5 text-slate-400 border-white/10">
                                                                รอแข่ง
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* ── Teams + Score ── */}
                                                    <div className="flex items-center gap-2">
                                                        {/* Teams column */}
                                                        <div className="flex-1 min-w-0 space-y-2.5">
                                                            {/* Team A players */}
                                                            <div className="space-y-2">
                                                                {match.team_a_id?.team_players.length ? (
                                                                    match.team_a_id.team_players.map((tp, i) => (
                                                                        <PlayerRow
                                                                            key={i}
                                                                            tp={tp}
                                                                            tournamentInfo={tournamentInfo}
                                                                            STRAPI_BASE_URL={STRAPI_BASE_URL}
                                                                            match={match}
                                                                            isWinner={winnerA}
                                                                            isCompleted={isCompleted}
                                                                            firstServeKey="A"
                                                                            firstServeIdx={i}
                                                                        />
                                                                    ))
                                                                ) : (
                                                                    <div className="text-sm font-bold text-slate-600">ทีม {match.team_a_id?.team_no ?? '?'}</div>
                                                                )}
                                                            </div>

                                                            {/* VS divider — image */}
                                                            <div className="flex items-center gap-2 py-1">
                                                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-white/5" />
                                                                <div className={cn(
                                                                    'shrink-0 transition-all duration-300',
                                                                    isCompleted || isCancelled ? 'opacity-20 grayscale' : 'opacity-90 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                                                                )}>
                                                                    <Image
                                                                        src="/vs.png"
                                                                        alt="VS"
                                                                        width={40}
                                                                        height={24}
                                                                        className="object-contain"
                                                                    />
                                                                </div>
                                                                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/10 to-white/5" />
                                                            </div>


                                                            {/* Team B players */}
                                                            <div className="space-y-2">
                                                                {match.team_b_id ? (
                                                                    match.team_b_id.team_players.length ? (
                                                                        match.team_b_id.team_players.map((tp, i) => (
                                                                            <PlayerRow
                                                                                key={i}
                                                                                tp={tp}
                                                                                tournamentInfo={tournamentInfo}
                                                                                STRAPI_BASE_URL={STRAPI_BASE_URL}
                                                                                match={match}
                                                                                isWinner={winnerB}
                                                                                isCompleted={isCompleted}
                                                                                firstServeKey="B"
                                                                                firstServeIdx={i}
                                                                            />
                                                                        ))
                                                                    ) : null
                                                                ) : (
                                                                    <div className="flex items-center gap-2 py-1.5 px-3 bg-white/5 rounded-xl border border-dashed border-white/5 w-fit">
                                                                        <Play className="text-slate-600 shrink-0" size={12} />
                                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">รอบบาย / พัก</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Score column */}
                                                        <div className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-2 sm:px-4">
                                                            {isCompleted ? (
                                                                <>
                                                                    <span className={cn(
                                                                        'text-3xl sm:text-4xl font-black tabular-nums leading-none',
                                                                        winnerA ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'text-slate-500'
                                                                    )}>
                                                                        {match.score_a}
                                                                    </span>
                                                                    <span className="text-[10px] font-black text-slate-700">:</span>
                                                                    <span className={cn(
                                                                        'text-3xl sm:text-4xl font-black tabular-nums leading-none',
                                                                        winnerB ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'text-slate-500'
                                                                    )}>
                                                                        {match.score_b}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className="text-2xl sm:text-3xl font-black tabular-nums text-slate-700/40 leading-none">-</span>
                                                                    <span className="text-[10px] font-black text-slate-800">:</span>
                                                                    <span className="text-2xl sm:text-3xl font-black tabular-nums text-slate-700/40 leading-none">-</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
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
