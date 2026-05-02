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
    mmr: number;
    win: number;
    lose: number;
    win_streak: number;
    match_played: number;
    rank?: string;
    stars?: number;
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
    mmr: number;
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

                // Default to active season
                const active = data.find(s => s.is_active);
                if (active) {
                    setSelectedSeason(active.documentId);
                } else if (data.length > 0) {
                    setSelectedSeason(data[0].documentId);
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

            let url = `${STRAPI_BASE_URL}/api/rankings?populate[user_id][populate][0]=picture&sort[0]=mmr:desc&pagination[pageSize]=1000`;
            
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
                    mmr: r.mmr,
                    win: r.win,
                    lose: r.lose,
                    win_streak: r.win_streak,
                    match_played: r.match_played,
                    hasRanking: true,
                    rankingId: r.id,
                    rankings: [{ rank: r.rank, stars: r.stars, mmr: r.mmr }]
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
                        mmr: 0,
                        win: 0,
                        lose: 0,
                        win_streak: 0,
                        match_played: 0,
                        hasRanking: false,
                    });
                }
            });

            // 5. Sort unranked users alphabetically
            merged.sort((a, b) => {
                if (a.hasRanking && !b.hasRanking) return -1;
                if (!a.hasRanking && b.hasRanking) return 1;
                if (a.hasRanking && b.hasRanking) return b.mmr - a.mmr;
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
                                            <p className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest">{p.mmr} MMR</p>
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
                <div className="mt-8 mb-12">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-[0.2em] mb-2 drop-shadow-lg">
                            Rank Progression Guide
                        </h2>
                        <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">เส้นทางการไต่เต้าสู่ความเป็นหนึ่ง</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[
                            { name: 'Bronze', stars: 3, color: 'from-[#cd7f32]/20 to-orange-950/40', border: 'border-orange-500/20', icon: '🥉', textColor: 'text-orange-200' },
                            { name: 'Silver', stars: 3, color: 'from-slate-400/20 to-slate-800/40', border: 'border-slate-400/20', icon: '🥈', textColor: 'text-slate-200' },
                            { name: 'Gold', stars: 4, color: 'from-yellow-500/20 to-yellow-900/40', border: 'border-yellow-500/20', icon: '🥇', textColor: 'text-yellow-100' },
                            { name: 'Platinum', stars: 5, color: 'from-cyan-400/20 to-cyan-900/40', border: 'border-cyan-400/20', icon: '💎', textColor: 'text-cyan-100' },
                            { name: 'Diamond', stars: 5, color: 'from-blue-500/20 to-blue-900/40', border: 'border-blue-500/20', icon: '💠', textColor: 'text-blue-100' },
                            { name: 'Master', stars: '∞', color: 'from-red-500/20 to-red-950/40', border: 'border-red-500/20', icon: '🏆', textColor: 'text-red-100' },
                        ].map((r) => (
                            <div key={r.name} className={`group relative bg-gradient-to-br ${r.color} backdrop-blur-md border ${r.border} rounded-[2rem] p-6 flex flex-col items-center text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-${r.name.toLowerCase()}-500/20 overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="text-4xl mb-4 transform transition-transform duration-500 group-hover:scale-125 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                    {r.icon}
                                </div>
                                <p className={`font-black ${r.textColor} text-base uppercase mb-1 tracking-tighter`}>{r.name}</p>
                                <div className="h-px w-8 bg-white/10 mb-2" />
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100 transition-opacity">
                                    {r.stars === '∞' ? 'Infinite' : `${r.stars} Stars`}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Rules Note */}
                    <div className="mt-10 relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 group">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none" />
                        <div className="relative flex flex-col sm:flex-row gap-6 items-center">
                            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-3xl shadow-lg shadow-orange-600/20 animate-pulse">
                                🔥
                            </div>
                            <div className="text-center sm:text-left">
                                <h3 className="text-white font-black text-lg sm:text-xl uppercase tracking-tighter mb-1">
                                    Win Streak <span className="text-orange-500">Bonus</span>
                                </h3>
                                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-xl">
                                    ทะยานสู่อันดับสูงสุดให้ไวขึ้น! เมื่อชนะติดต่อกันครบ <span className="text-white font-bold underline decoration-orange-500 underline-offset-4">3 แมตซ์</span> 
                                    รับดาวโบนัสเพิ่มทันที <span className="text-yellow-400 font-bold">+1 ดวง</span> 
                                    <span className="block mt-1 text-[10px] opacity-50 uppercase tracking-widest">(Available for Bronze to Platinum only)</span>
                                </p>
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
