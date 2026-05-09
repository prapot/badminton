"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";
import RankBadge from "@/app/tournament/RankBadge";
import { getRankInfoFromPoints } from "@/app/tournament/TournamentUtils";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface MatchHistory {
    id: number;
    documentId: string;
    old_rp: number;
    new_rp: number;
    rp_change: number;
    is_win: boolean;
    rank_before?: string;
    rank_after?: string;
    createdAt: string;
    matches: Array<{
        round: any;
        id: number;
        documentId: string;
        score_a: number;
        score_b: number;
        match_status: string;
        tournament_id?: {
            name: string;
            mode: string;
            documentId: string;
        } | null;
        team_a_id?: {
            name: string;
            team_players: Array<{ user_id?: { id: number; username: string } }>;
        } | null;
        team_b_id?: {
            name: string;
            team_players: Array<{ user_id?: { id: number; username: string } }>;
        } | null;
    }>;
    ranking?: {
        season?: {
            name: string;
            documentId: string;
        }
    } | null;
}

interface PaginationMeta {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
}

interface TargetUser {
    id: number;
    username: string;
    picture?: { url: string } | null;
}

export default function HistoryPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const router = useRouter();
    const { user, jwt } = useAuth();

    const [targetUser, setTargetUser] = useState<TargetUser | null>(null);
    const [histories, setHistories] = useState<MatchHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [seasons, setSeasons] = useState<any[]>([]);
    const [selectedSeason, setSelectedSeason] = useState<string>("all");
    const [rankingStats, setRankingStats] = useState<any>(null);



    const fetchData = useCallback(async (pageNum: number = 1) => {
        if (!jwt) return;
        setLoading(true);
        try {
            // 1. Fetch target user info (only once)
            if (!targetUser) {
                const userRes = await fetch(`${STRAPI_BASE_URL}/api/users/${userId}?populate=picture`, {
                    headers: { Authorization: `Bearer ${jwt}` }
                });
                if (!userRes.ok) throw new Error("ไม่พบข้อมูลผู้ใช้");
                const userData = await userRes.json();
                setTargetUser(userData);
            }

            // 2. Fetch match histories with pagination and seasonal filter
            let url = `${STRAPI_BASE_URL}/api/match-histories?filters[users][id]=${userId}&populate[matches][populate][team_a_id][populate][team_players][populate]=user_id&populate[matches][populate][team_b_id][populate][team_players][populate]=user_id&populate[matches][populate]=tournament_id&populate[ranking][populate]=season&sort=createdAt:desc&pagination[page]=${pageNum}&pagination[pageSize]=10`;

            if (selectedSeason !== "all") {
                url += `&filters[ranking][season][documentId][$eq]=${selectedSeason}`;
            }

            const historyRes = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
            if (!historyRes.ok) throw new Error("ไม่สามารถโหลดประวัติได้");
            const historyData = await historyRes.json();
            setHistories(historyData.data || []);
            setMeta(historyData.meta.pagination);

            // 3. Fetch ranking stats for summary
            let rankingUrl = `${STRAPI_BASE_URL}/api/rankings?filters[user_id][id]=${userId}`;
            if (selectedSeason !== "all") {
                rankingUrl += `&filters[season][documentId]=${selectedSeason}`;
            } else {
                rankingUrl += `&sort=createdAt:desc&pagination[pageSize]=1`;
            }

            const rankingRes = await fetch(rankingUrl, { headers: { Authorization: `Bearer ${jwt}` } });
            if (rankingRes.ok) {
                const rData = await rankingRes.json();
                setRankingStats(rData.data?.[0] || null);
            }

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [userId, jwt, targetUser, selectedSeason]);

    useEffect(() => {
        if (!jwt) return;
        fetch(`${STRAPI_BASE_URL}/api/seasons?sort=createdAt:desc`, {
            headers: { Authorization: `Bearer ${jwt}` }
        })
            .then(r => r.json())
            .then(json => setSeasons(json.data || []));
    }, [jwt]);

    useEffect(() => {
        fetchData(page);
    }, [page, jwt, userId, selectedSeason]); // Fetch when page or season changes

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="mb-8 flex items-center gap-6 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md shadow-xl">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-3xl font-bold shadow-lg shadow-green-900/40 overflow-hidden border border-white/20">
                        {targetUser?.picture?.url ? (
                            <img
                                src={targetUser.picture.url.startsWith("http") ? targetUser.picture.url : `${STRAPI_BASE_URL}${targetUser.picture.url}`}
                                alt={targetUser.username}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            targetUser?.username?.charAt(0).toUpperCase() || "?"
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">ประวัติการแข่งขัน</h1>
                        <p className="text-slate-400 font-medium">{targetUser?.username}</p>
                    </div>

                    <div className="ml-auto">
                        <select
                            value={selectedSeason}
                            onChange={(e) => {
                                setSelectedSeason(e.target.value);
                                setPage(1);
                            }}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all cursor-pointer hover:bg-black/60"
                        >
                            <option value="all">ทุกฤดูกาล (All Seasons)</option>
                            {seasons.map((s) => (
                                <option key={s.documentId} value={s.documentId}>
                                    {s.name} {s.is_active ? "(Current)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Stats Summary Card */}
                {!loading && rankingStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md flex flex-col items-center justify-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-widest text-center">Current Rank</p>
                            <RankBadge
                                rank={rankingStats.rank}
                                stars={rankingStats.stars}
                                size="sm"
                                showName={true}
                            />
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest text-center">Matches</p>
                            <p className="text-lg font-black text-white text-center">{rankingStats.match_played || 0}</p>
                            <p className="text-[10px] text-slate-400 font-bold text-center">Total Games</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest text-center">Win / Loss</p>
                            <p className="text-lg font-black text-center">
                                <span className="text-green-400">{rankingStats.win || 0}</span>
                                <span className="text-slate-600 mx-2">/</span>
                                <span className="text-red-400">{rankingStats.lose || 0}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold text-center">Winrate {Math.round(((rankingStats.win || 0) / (rankingStats.match_played || 1)) * 100)}%</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest text-center">Brave Points</p>
                            <p className="text-lg font-black text-purple-400 text-center">{rankingStats.brave_points || 0}</p>
                            <div className="w-full bg-white/5 h-1 rounded-full mt-1 overflow-hidden">
                                <div
                                    className="bg-purple-500 h-full transition-all"
                                    style={{ width: `${Math.min(100, rankingStats.brave_points || 0)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-28 bg-white/5 animate-pulse rounded-2xl border border-white/10" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-20 bg-red-500/10 rounded-3xl border border-red-500/20">
                        <p className="text-red-400">{error}</p>
                    </div>
                ) : histories.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                        <span className="text-4xl block mb-4 opacity-50">📜</span>
                        <p className="text-slate-400">ยังไม่มีประวัติการแข่งขันในระบบ</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {histories.map((h) => {
                            const match = h.matches?.[0];
                            if (!match) return null;

                            const isTeamA = match.team_a_id?.team_players?.some(tp => tp.user_id?.id === Number(userId));
                            const userTeam = isTeamA ? match.team_a_id : match.team_b_id;
                            const oppTeam = isTeamA ? match.team_b_id : match.team_a_id;
                            const userScore = isTeamA ? match.score_a : match.score_b;
                            const oppScore = isTeamA ? match.score_b : match.score_a;
                            const isCancelled = match.match_status === "cancelled";
                            const isWin = !isCancelled && h.is_win;
                            const isLoss = !isCancelled && !h.is_win;

                            const tournament = match.tournament_id;
                            const isRanking = tournament?.mode === "ranking";

                            const teamANames = match.team_a_id?.team_players?.map(p => p.user_id?.username).join(" / ") || "รอยืนยัน";
                            const teamBNames = match.team_b_id?.team_players?.map(p => p.user_id?.username).join(" / ") || "รอยืนยัน";

                            return (
                                <div
                                    key={h.id}
                                    className={`relative overflow-hidden p-5 rounded-2xl border transition-all duration-200 hover:scale-[1.01] ${isCancelled ? 'bg-slate-500/5 border-slate-500/20 grayscale opacity-80' :
                                        isWin ? 'bg-green-500/5 border-green-500/20 shadow-green-900/10 shadow-lg' : 'bg-red-500/5 border-red-500/20'
                                        }`}
                                >
                                    <div className={`absolute top-0 right-0 px-4 py-8 pointer-events-none opacity-[0.03] text-6xl font-black italic`}>
                                        {isCancelled ? 'CANCEL' : isWin ? 'WIN' : 'LOSS'}
                                    </div>

                                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                {isCancelled ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-500/10 text-slate-400 border-slate-500/20">
                                                        CANCELLED
                                                    </span>
                                                ) : (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isWin ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                        {isWin ? 'WIN' : 'LOSS'}
                                                    </span>
                                                )}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isRanking ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    }`}>
                                                    {isRanking ? '🏆 RANKING' : '🎮 CASUAL'}
                                                </span>
                                                {match.round && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-white/10 text-white border-white/20">
                                                        ROUND {match.round}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                    {new Date(h.createdAt).toLocaleDateString('th-TH', {
                                                        day: 'numeric', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                                {h.ranking?.season?.name && (
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20">
                                                        📅 {h.ranking.season.name}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm font-bold text-white mb-1 truncate">
                                                {tournament?.name || "รายการแข่งขันถ้วยรางวัล"}
                                            </p>

                                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                                <span className={`font-semibold ${isTeamA ? 'text-green-300' : ''}`}>{teamANames}</span>
                                                <span className="text-[9px] text-slate-600 italic">vs</span>
                                                <span className={`font-semibold ${!isTeamA ? 'text-green-300' : ''}`}>{teamBNames}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8 shrink-0">
                                            <div className="text-center">
                                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1 tracking-widest">Score</p>
                                                <div className="flex items-center gap-2 px-3 py-1 bg-black/30 rounded-xl border border-white/5">
                                                    <span className={`text-lg font-black ${isWin ? 'text-green-400' : 'text-slate-400'}`}>{userScore}</span>
                                                    <span className="text-slate-600">:</span>
                                                    <span className={`text-lg font-black ${!isWin ? 'text-red-400' : 'text-slate-400'}`}>{oppScore}</span>
                                                </div>
                                            </div>

                                            {isRanking && (
                                                <div className="text-center min-w-[140px]">
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-2 tracking-widest">Rank Progression</p>
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <RankBadge
                                                                    rank={getRankInfoFromPoints(h.old_rp).rankStr}
                                                                    stars={getRankInfoFromPoints(h.old_rp).stars}
                                                                    size="sm"
                                                                    showName={true}
                                                                />
                                                                <span className="text-slate-600 font-bold">➜</span>
                                                                <RankBadge
                                                                    rank={getRankInfoFromPoints(h.new_rp).rankStr}
                                                                    stars={getRankInfoFromPoints(h.new_rp).stars}
                                                                    size="sm"
                                                                    showName={true}
                                                                />
                                                            </div>
                                                        </div>
                                                        <span className={`text-[10px] font-black flex items-center gap-1 px-3 py-0.5 rounded-full bg-black/40 border border-white/5 ${h.rp_change > 0 ? 'text-green-400' : h.rp_change < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                            {h.rp_change > 0 ? `+${Math.abs(Math.floor(h.rp_change / 100))} ⭐` : h.rp_change < 0 ? `-${Math.abs(Math.floor(h.rp_change / 100))} ⭐` : 'PROTECTED 🛡️'}
                                                            {h.rp_change > 0 && <span className="animate-bounce">↑</span>}
                                                            {h.rp_change < 0 && <span className="animate-bounce">↓</span>}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            <Link
                                                href={`/tournament/${tournament?.documentId}`}
                                                className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all font-bold text-lg"
                                                title="ดูทัวร์นาเมนต์นี้"
                                            >
                                                ➜
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && meta && meta.pageCount > 1 && (
                    <div className="mt-10 flex items-center justify-center gap-2 sm:gap-4 pb-12">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            <span>‹</span> ย้อนกลับ
                        </button>

                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 h-10 rounded-xl backdrop-blur-md">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Page</span>
                            <span className="text-sm font-black text-[#2ecc71]">{page}</span>
                            <span className="text-xs font-bold text-slate-600">/</span>
                            <span className="text-sm font-black text-slate-400">{meta.pageCount}</span>
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(meta.pageCount, p + 1))}
                            disabled={page === meta.pageCount}
                            className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            ถัดไป <span>›</span>
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
