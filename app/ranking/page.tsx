"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/useAuth";
import RankBadge from "../tournament/RankBadge";

interface User {
    id: number;
    username: string;
    email: string;
}

type Category = "overall" | "singles" | "doubles";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface ApiPicture {
    url: string;
}

interface ApiUser {
    id: number;
    documentId: string;
    username: string;
    email: string;
    picture?: ApiPicture | null;
}

interface TRanking {
    id: number;
    documentId: string;
    ranking_points: number;
    win: number;
    lose: number;
    win_streak: number;
    match_played: number;
    rank?: string;
    stars?: number;
    brave_points?: number;
    user_id: ApiUser | null;
}

interface ApiSeason {
    id: number;
    documentId: string;
    name: string;
    is_active: boolean;
}

interface PaginationMeta {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
}

// Merged: user + ranking (ranking may be null for new users)
interface PlayerRow {
    userId: number;
    username: string;
    email: string;
    picture?: ApiPicture | null;
    ranking_points: number;
    win: number;
    lose: number;
    win_streak: number;
    match_played: number;
    hasRanking: boolean;
    rankingId?: number;
    rankings?: any[]; // For RankBadge consistency
}


const podiumColors = [
    { bg: "from-yellow-500/30 to-yellow-600/10", border: "border-yellow-500/40", ring: "ring-yellow-400/50", text: "text-yellow-300", icon: "🥇", glow: "shadow-yellow-500/20" },
    { bg: "from-slate-400/20 to-slate-500/10", border: "border-slate-400/30", ring: "ring-slate-300/40", text: "text-slate-300", icon: "🥈", glow: "shadow-slate-500/20" },
    { bg: "from-orange-600/20 to-orange-700/10", border: "border-orange-500/30", ring: "ring-orange-400/40", text: "text-orange-400", icon: "🥉", glow: "shadow-orange-500/20" },
];

export default function RankingPage() {
    const router = useRouter();
    const { jwt, user } = useAuth();
    const [search, setSearch] = useState("");
    const [allPlayers, setAllPlayers] = useState<PlayerRow[]>([]);
    const [seasons, setSeasons] = useState<ApiSeason[]>([]);
    const [selectedSeason, setSelectedSeason] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (jwt) {
            fetchSeasons();
        }
    }, [jwt]);

    useEffect(() => {
        if (jwt) fetchAllData();
    }, [jwt, selectedSeason]);

    const fetchSeasons = async () => {
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/seasons?sort=createdAt:desc`, {
                headers: { Authorization: `Bearer ${jwt}` },
                cache: 'no-store'
            });
            if (res.ok) {
                const json = await res.json();
                const data: ApiSeason[] = json.data ?? [];
                setSeasons(data);

                // Default: prefer active season that matches current month (YYYY-MM)
                // e.g. "Season 2026-06" matches when currentMonthKey = "2026-06"
                const now = new Date();
                const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                const activeSeasons = data.filter(s => s.is_active);

                // 1. Active season whose name contains the current YYYY-MM
                const currentMonthSeason = activeSeasons.find(s => s.name.includes(currentMonthKey));
                // 2. Any active season (sorted desc by createdAt → newest first)
                const newestActive = activeSeasons[0];
                // 3. Fallback: first season in list
                const fallback = data[0];

                const defaultSeason = currentMonthSeason ?? newestActive ?? fallback;
                if (defaultSeason) {
                    setSelectedSeason(defaultSeason.documentId);
                }
            }
        } catch (err) {
            console.error("Fetch seasons error:", err);
        }
    }

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // 1. Fetch rankings for selected season
            if (!selectedSeason && seasons.length > 0) return; // Wait for season selection if seasons exist

            let url = `${STRAPI_BASE_URL}/api/rankings?populate[user_id][populate][0]=picture&sort[0]=ranking_points:desc&pagination[pageSize]=1000`;

            // If no season is selected but we are on initial load, we might want to skip until fetchSeasons sets it
            // OR if we want to show current active season specifically
            if (selectedSeason) {
                url += `&filters[season][documentId][$eq]=${selectedSeason}`;
            } else {
                // If really no season selected (initial), default to active=true in API
                url += `&filters[season][is_active][$eq]=true`;
            }

            const rankingsRes = await fetch(url, {
                headers: { Authorization: `Bearer ${jwt}` },
                cache: 'no-store' // Disable caching to always get fresh data
            });

            if (!rankingsRes.ok) throw new Error("ไม่สามารถโหลดอันดับได้");
            const rankingsJson = await rankingsRes.json();
            const rankingsData: TRanking[] = rankingsJson.data ?? [];

            // 2. Fetch all users
            const usersRes = await fetch(
                `${STRAPI_BASE_URL}/api/users?populate=picture`,
                { headers: { Authorization: `Bearer ${jwt}` } }
            );
            if (!usersRes.ok) throw new Error("ไม่สามารถโหลดผู้ใช้ได้");
            const usersData: ApiUser[] = await usersRes.json();

            // 3. Merge
            const rankedUserIds = new Set<number>();
            const merged: PlayerRow[] = [];

            rankingsData.forEach((r) => {
                const u = r.user_id;
                if (!u || !u.id) return;

                // Only take the first one found (which is highest MMR due to API sort)
                if (rankedUserIds.has(u.id)) return;

                rankedUserIds.add(u.id);
                merged.push({
                    userId: u.id,
                    username: u.username || "Unknown",
                    email: u.email || "",
                    picture: u.picture,
                    ranking_points: r.ranking_points,
                    win: r.win,
                    lose: r.lose,
                    win_streak: r.win_streak,
                    match_played: r.match_played,
                    hasRanking: true,
                    rankingId: r.id,
                    rankings: [{ rank: r.rank, stars: r.stars, ranking_points: r.ranking_points }]
                });
            });

            // 4. Append unranked users
            usersData.forEach(u => {
                if (!rankedUserIds.has(u.id)) {
                    merged.push({
                        userId: u.id,
                        username: u.username,
                        email: u.email,
                        picture: u.picture,
                        ranking_points: 0,
                        win: 0,
                        lose: 0,
                        win_streak: 0,
                        match_played: 0,
                        hasRanking: false,
                    });
                }
            });

            // 5. Sort: ranked players first (by tier → division → stars → ranking_points), then unranked alphabetically
            /**
             * getRankScore: returns a numeric score for comparison.
             * Tier base values (per 1000):  bronze=1, silver=2, gold=3, platinum=4, diamond=5, master=6
             * Division offset (_v=0, _iv=1, _iii=2, _ii=3, _i=4) → adds 0–4
             * So master_i > master_v > diamond_i > diamond_v > ... > bronze_v
             */
            const getRankScore = (rankStr?: string): number => {
                if (!rankStr) return 0;
                const r = rankStr.toLowerCase();

                const tierBase: Record<string, number> = {
                    bronze: 1000,
                    silver: 2000,
                    gold: 3000,
                    platinum: 4000,
                    diamond: 5000,
                    master: 6000,
                };
                const divOffset: Record<string, number> = {
                    _v: 0,
                    _iv: 1,
                    _iii: 2,
                    _ii: 3,
                    _i: 4,
                };

                let base = 0;
                for (const [tier, val] of Object.entries(tierBase)) {
                    if (r.includes(tier)) { base = val; break; }
                }
                if (base === 0) return 0;

                // Master has no division cap — treat as highest division
                if (base === 6000) return 6000 + 4;

                let offset = 0;
                for (const [div, val] of Object.entries(divOffset)) {
                    if (r.endsWith(div)) { offset = val; break; }
                }
                return base + offset;
            };

            merged.sort((a, b) => {
                // Ranked players always before unranked
                if (a.hasRanking && !b.hasRanking) return -1;
                if (!a.hasRanking && b.hasRanking) return 1;

                if (a.hasRanking && b.hasRanking) {
                    // 1. Rank tier + division (higher = better)
                    const scoreA = getRankScore(a.rankings?.[0]?.rank);
                    const scoreB = getRankScore(b.rankings?.[0]?.rank);
                    if (scoreA !== scoreB) return scoreB - scoreA;

                    // 2. Stars within same division (more stars = closer to promotion)
                    const starsA = a.rankings?.[0]?.stars ?? 0;
                    const starsB = b.rankings?.[0]?.stars ?? 0;
                    if (starsA !== starsB) return starsB - starsA;

                    // 3. Ranking points as tiebreaker
                    if (a.ranking_points !== b.ranking_points) return b.ranking_points - a.ranking_points;

                    // 4. Win rate as final tiebreaker
                    const wrA = a.match_played > 0 ? a.win / a.match_played : 0;
                    const wrB = b.match_played > 0 ? b.win / b.match_played : 0;
                    return wrB - wrA;
                }

                // Both unranked: alphabetical
                return a.username.localeCompare(b.username);
            });

            setAllPlayers(merged);
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const searchLower = search.toLowerCase();
    const filteredPlayers = allPlayers.filter(p => p.username.toLowerCase().includes(searchLower) || (p.email && p.email.toLowerCase().includes(searchLower)));
    const pageCount = Math.max(1, Math.ceil(filteredPlayers.length / 10));
    const currentPagePlayers = filteredPlayers.slice((page - 1) * 10, page * 10);

    const top3 = page === 1 && !searchLower ? allPlayers.filter(p => p.hasRanking).slice(0, 3) : [];

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                {/* Header */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a2236] to-[#0f1923] border border-white/10 p-8 sm:p-10">
                    <div className="absolute inset-0 pointer-events-none opacity-5">
                        <svg className="w-full h-full" viewBox="0 0 900 200" preserveAspectRatio="xMidYMid slice">
                            <rect x="50" y="20" width="800" height="160" fill="none" stroke="#2ecc71" strokeWidth="2" />
                            <line x1="450" y1="20" x2="450" y2="180" stroke="#2ecc71" strokeWidth="3" />
                        </svg>
                    </div>
                    <div className="absolute -top-4 -right-4 sm:top-4 sm:right-8 text-7xl sm:text-9xl opacity-10 select-none animate-pulse">🏆</div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20 mb-3 uppercase tracking-widest">
                            <span>🏅</span> ตารางอันดับผู้เล่น
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 tracking-tight">Leaderboard</h1>
                        <p className="text-slate-400 text-sm sm:text-base">อัปเดตล่าสุด: {new Date().toLocaleDateString("th-TH")} · {allPlayers.length} ผู้เล่นทั้งหมด</p>
                    </div>
                </div>

                {/* Season Winners / Hall of Fame Section (Only if past season is selected) */}
                {selectedSeason !== "all" && seasons.length > 0 && !seasons.find(s => s.documentId === selectedSeason)?.is_active && allPlayers.filter(p => p.hasRanking).length > 0 && (
                    <div className="bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden group mb-8">
                        <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl grayscale group-hover:grayscale-0 transition-all duration-700">🏆</div>
                        <div className="relative z-10">
                            <h2 className="text-xl sm:text-2xl font-black text-yellow-500 mb-4 flex items-center gap-3">
                                <span>🏛️</span> HALL OF FAME: {seasons.find(s => s.documentId === selectedSeason)?.name}
                            </h2>
                            <div className="flex flex-wrap gap-6 items-center">
                                {allPlayers.filter(p => p.hasRanking).slice(0, 3).map((p, i) => (
                                    <div key={p.userId} className="flex items-center gap-4 bg-black/40 px-5 py-3 rounded-2xl border border-white/5 shadow-xl transition-transform hover:scale-105">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg ${i === 0 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 ring-2 ring-yellow-400/50" :
                                            i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500" :
                                                "bg-gradient-to-br from-orange-400 to-orange-600"
                                            }`}>
                                            {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                                        </div>
                                        <div>
                                            <p className="font-black text-white text-base leading-none mb-1">{p.username}</p>
                                            <p className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest">{p.ranking_points} RP</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Search & Season Selector */}
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative w-full md:w-80">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อผู้เล่น..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="w-full h-11 sm:h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition-all shadow-inner"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Season:</div>
                        <select
                            value={selectedSeason}
                            onChange={(e) => setSelectedSeason(e.target.value)}
                            className="flex-1 md:w-48 h-11 sm:h-12 px-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-[#0f1923]">ทั้งหมด (Legacy)</option>
                            {seasons.map((s) => (
                                <option key={s.documentId} value={s.documentId} className="bg-[#0f1923]">
                                    {s.name} {s.is_active ? "(Active)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {loading && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse ml-auto">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            กำลังโหลดข้อมูล...
                        </div>
                    )}
                </div>

                {/* Podium — only show when no search and loading complete */}
                {!search && !loading && top3.length >= 1 && (
                    <div className="grid grid-cols-3 gap-2 sm:gap-6 mt-4">
                        {[top3[1], top3[0], top3[2]].map((p, idx) => {
                            if (!p) return <div key={idx} />;
                            const podiumIdx = idx === 0 ? 1 : idx === 1 ? 0 : 2;
                            const c = podiumColors[podiumIdx];
                            const pUrl = p.picture?.url ? (p.picture.url.startsWith("http") ? p.picture.url : `${STRAPI_BASE_URL}${p.picture.url}`) : null;
                            const heights = ["h-24 sm:h-32", "h-36 sm:h-48", "h-16 sm:h-24"];

                            return (
                                <div key={p.userId} className="flex flex-col items-center gap-2 sm:gap-4">
                                    {/* Card */}
                                    <div
                                        onClick={() => router.push(`/history/${p.userId}`)}
                                        className={`w-full bg-gradient-to-b ${c.bg} border ${p.userId === user?.id ? "border-green-500/60" : c.border} rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 shadow-2xl ${p.userId === user?.id ? "shadow-green-500/30" : c.glow} transition-all hover:-translate-y-2 cursor-pointer duration-300 relative overflow-hidden group`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className={`w-12 h-12 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-slate-800 ring-2 sm:ring-4 ${c.ring} flex items-center justify-center text-xl sm:text-3xl font-bold overflow-hidden shrink-0 shadow-inner relative z-10`}>
                                            {pUrl ? <img src={pUrl} alt={p.username} className="w-full h-full object-cover" /> : <span className={c.text}>{p.username.charAt(0).toUpperCase()}</span>}
                                        </div>

                                        <div className="text-center relative z-10 min-w-0 w-full">
                                            <p className="font-black text-white text-xs sm:text-base leading-tight truncate px-1">{p.username}</p>
                                        </div>

                                        <div className="text-xl sm:text-3xl relative z-10 filter drop-shadow-md">{c.icon}</div>
                                        <div className="flex flex-col items-center gap-1.5 relative z-10">
                                            <RankBadge rank={p.rankings?.[0]?.rank} stars={p.rankings?.[0]?.stars} size="sm" />
                                            <div className="flex gap-2 sm:gap-4 text-[9px] sm:text-xs text-slate-400 font-bold">
                                                <span className="text-green-400">{p.win}W</span>
                                                <span className="text-red-400">{p.lose}L</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Podium stand */}
                                    <div className={`w-full ${heights[idx]} rounded-b-2xl sm:rounded-b-3xl rounded-t-lg ${podiumIdx === 0 ? "bg-gradient-to-b from-yellow-500/30 to-yellow-600/5 border border-yellow-500/20" :
                                        podiumIdx === 1 ? "bg-gradient-to-b from-slate-400/20 to-slate-500/5 border border-slate-400/15" :
                                            "bg-gradient-to-b from-orange-600/20 to-orange-700/5 border border-orange-500/15"
                                        } flex items-center justify-center shadow-lg`}>
                                        <span className="text-xl sm:text-4xl font-black text-white/10 italic">#{podiumIdx + 1}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Full Ranking Table */}
                <div className="bg-gradient-to-br from-[#1a2236] to-[#0f1923] border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <h3 className="font-black text-white flex items-center gap-2.5 sm:gap-3 sm:text-lg">
                            <span className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-900/20">📊</span>
                            ตารางอันดับสะสม
                        </h3>
                        <div className="flex items-center gap-4">
                            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                                Season: {seasons.find(s => s.documentId === selectedSeason)?.name || "Current"}
                            </span>
                            <span className="text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                {allPlayers.length} ผู้เล่นทั้งหมด
                            </span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 bg-black/20">
                                    <th className="px-6 py-4 text-left w-16">Rank</th>
                                    <th className="px-6 py-4 text-left">Player</th>
                                    <th className="px-6 py-4 text-center">Tier</th>
                                    <th className="px-6 py-4 text-center">Played</th>
                                    <th className="px-6 py-4 text-center">W / L</th>
                                    <th className="px-6 py-4 text-center sm:table-cell">Streak</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {currentPagePlayers.map((p, idx) => {
                                    const pUrl = p.picture?.url ? (p.picture.url.startsWith("http") ? p.picture.url : `${STRAPI_BASE_URL}${p.picture.url}`) : null;
                                    const rank = (page - 1) * 10 + idx + 1;

                                    return (
                                        <tr
                                            key={p.userId}
                                            onClick={() => router.push(`/history/${p.userId}`)}
                                            className={`group hover:bg-white/[0.04] transition-all cursor-pointer ${rank <= 3 && p.hasRanking ? "bg-white/[0.02]" : ""} ${p.userId === user?.id ? "bg-green-500/5 border-l-4 border-l-green-500/50" : ""}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm sm:text-base font-black ${rank === 1 && p.hasRanking ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" :
                                                        rank === 2 && p.hasRanking ? "text-slate-300" :
                                                            rank === 3 && p.hasRanking ? "text-orange-400" :
                                                                "text-slate-500"
                                                        }`}>
                                                        {rank <= 3 && p.hasRanking ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg overflow-hidden shrink-0 ${rank === 1 && p.hasRanking ? "bg-gradient-to-br from-yellow-400 to-yellow-600 ring-2 ring-yellow-400/50" :
                                                        rank === 2 && p.hasRanking ? "bg-gradient-to-br from-slate-300 to-slate-500 ring-2 ring-slate-400/50" :
                                                            rank === 3 && p.hasRanking ? "bg-gradient-to-br from-orange-400 to-orange-600 ring-2 ring-orange-500/50" :
                                                                "bg-slate-800 border border-white/10"
                                                        }`}>
                                                        {pUrl ? <img src={pUrl} alt={p.username} className="w-full h-full object-cover" /> : <span className="text-white">{p.username?.charAt(0).toUpperCase()}</span>}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm sm:text-base font-bold text-white group-hover:text-green-400 transition-colors truncate">
                                                            {p.username || "Unknown"}
                                                            {p.userId === user?.id && (
                                                                <span className="ml-2 text-[8px] px-1.5 py-0.5 rounded-md bg-green-500/20 text-green-400 border border-green-500/30 uppercase tracking-tighter">
                                                                    ฉัน
                                                                </span>
                                                            )}
                                                            {!p.hasRanking && (
                                                                <span className="ml-2 text-[8px] px-1.5 py-0.5 rounded-md bg-slate-500/20 text-slate-400 border border-slate-500/30 uppercase tracking-tighter">
                                                                    ยังไม่มีคะแนน
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 truncate">{p.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {p.hasRanking ? (
                                                    <RankBadge rank={p.rankings?.[0]?.rank} stars={p.rankings?.[0]?.stars} size="sm" />
                                                ) : (
                                                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs sm:text-sm font-bold text-slate-300">{p.match_played}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-green-400 font-black text-xs sm:text-sm">{p.win}</span>
                                                    <span className="text-slate-600 text-[10px]">/</span>
                                                    <span className="text-red-400 font-black text-xs sm:text-sm">{p.lose}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center sm:table-cell">
                                                {p.win_streak > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-xs font-black gap-1 border border-orange-500/20 animate-pulse">
                                                        🔥{p.win_streak}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-700 font-bold">─</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {currentPagePlayers.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={7} className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-40">
                                                <span className="text-6xl">🔍</span>
                                                <div>
                                                    <p className="text-lg font-black text-white">ไม่พบข้อมูลรายชื่อ</p>
                                                    <p className="text-sm text-slate-500">ลองค้นหาด้วยชื่ออื่นดูครับ</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination Controls */}
                {!loading && pageCount > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2 sm:gap-4 pb-12">
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
                            <span className="text-sm font-black text-slate-400">{pageCount}</span>
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                            disabled={page === pageCount}
                            className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            ถัดไป <span>›</span>
                        </button>
                    </div>
                )}

                {/* Refined Rank Guide Section */}
                <div className="mt-16 mb-20">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter mb-3">
                            Rank <span className="text-green-500">Progression</span> Guide
                        </h2>
                        <div className="w-20 h-1 bg-green-500 mx-auto rounded-full mb-4" />
                        <p className="text-slate-500 text-xs sm:text-sm font-bold uppercase tracking-[0.3em]">เส้นทางแห่งเกียรติยศและชัยชนะ</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { name: 'Bronze', divs: 'V, IV, III, II, I', stars: 3, color: 'from-[#cd7f32] to-[#8b4513]', icon: '🥉', desc: 'ระดับเริ่มต้นเพื่อฝึกฝนทักษะ' },
                            { name: 'Silver', divs: 'V, IV, III, II, I', stars: 3, color: 'from-slate-300 to-slate-500', icon: '🥈', desc: 'พิสูจน์ฝีมือก้าวสู่ระดับกลาง' },
                            { name: 'Gold', divs: 'V, IV, III, II, I', stars: 4, color: 'from-yellow-400 to-amber-600', icon: '🥇', desc: 'แมตช์ที่เข้มข้นขึ้นและความท้าทายใหม่' },
                            { name: 'Platinum', divs: 'V, IV, III, II, I', stars: 5, color: 'from-cyan-400 to-blue-600', icon: '💎', desc: 'ก้าวเข้าสู่ทำเนียบยอดฝีมือ' },
                            { name: 'Diamond', divs: 'V, IV, III, II, I', stars: 5, color: 'from-blue-600 to-indigo-800', icon: '💠', desc: 'ระดับสูงสุดก่อนเข้าสู่ทำเนียบแชมป์' },
                            { name: 'Master', divs: 'Accumulate Stars', stars: '∞', color: 'from-red-500 to-purple-700', icon: '🏆', desc: 'ทำเนียบแชมป์เปี้ยนผู้ไร้ขีดจำกัด', isMaster: true },
                        ].map((r) => (
                            <div key={r.name} className="relative group">
                                <div className={`absolute -inset-0.5 bg-gradient-to-r ${r.color} rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500`}></div>
                                <div className="relative bg-[#1a2236] border border-white/5 rounded-3xl p-6 sm:p-8 h-full flex flex-col">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center text-3xl shadow-lg`}>
                                            {r.icon}
                                        </div>
                                        <div className="text-right">
                                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">{r.name}</h3>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{r.desc}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Divisions</span>
                                                <span className="text-xs font-bold text-white">{r.divs}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                {!r.isMaster ? (
                                                    ['V', 'IV', 'III', 'II', 'I'].map((d) => (
                                                        <div key={d} className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                                                            <div className={`h-full w-full bg-gradient-to-r ${r.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-purple-500 to-red-500 rounded-full animate-pulse" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Requirement</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-lg font-black text-white">{r.stars === '∞' ? 'Unlimited' : `${r.stars}`}</span>
                                                    <span className="text-yellow-500">⭐</span>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1"></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Rules Note */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                        <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 group">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-orange-500/5 via-red-500/5 to-transparent pointer-events-none" />
                            <div className="relative flex flex-col sm:flex-row gap-6 items-center">
                                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-3xl shadow-lg shadow-orange-600/20 animate-pulse">
                                    🔥
                                </div>
                                <div className="text-center sm:text-left">
                                    <h3 className="text-white font-black text-lg sm:text-xl uppercase tracking-tighter mb-1">
                                        Win Streak <span className="text-orange-500">Bonus</span>
                                    </h3>
                                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                                        ชนะติดต่อกันครบ <span className="text-white font-bold">3 แมตช์</span> รับแต้มกล้าหาญเพิ่มขึ้น! ช่วยให้คุณข้ามดิวิชั่นได้ไวขึ้น
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 group">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-transparent pointer-events-none" />
                            <div className="relative flex flex-col sm:flex-row gap-6 items-center">
                                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-indigo-600/20">
                                    🛡️
                                </div>
                                <div className="text-center sm:text-left">
                                    <h3 className="text-white font-black text-lg sm:text-xl uppercase tracking-tighter mb-1">
                                        Brave Points & <span className="text-blue-400">Protection</span>
                                    </h3>
                                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                                        สะสมแต้มกล้าหาญครบ 100 แต้ม เพื่อรับ <span className="text-yellow-400 font-bold">ดาวโบนัส +1</span> หรือใช้ป้องกัน <span className="text-red-400 font-bold">ดาวลดเมื่อแพ้</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <Footer />
            </main>
        </div>
    );
}
