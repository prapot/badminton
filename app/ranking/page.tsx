"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";

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
    user_id: ApiUser | null;
}

const levelColors: Record<string, string> = {
    "A+": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    "A": "bg-orange-500/20 text-orange-300 border-orange-500/30",
    "B+": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "B": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    "C+": "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

function getPlayerLevel(mmr: number): string {
    if (mmr >= 2200) return "A+";
    if (mmr >= 1900) return "A";
    if (mmr >= 1700) return "B+";
    if (mmr >= 1500) return "B";
    return "C+";
}

const podiumColors = [
    { bg: "from-yellow-500/30 to-yellow-600/10", border: "border-yellow-500/40", ring: "ring-yellow-400/50", text: "text-yellow-300", icon: "🥇", glow: "shadow-yellow-500/20" },
    { bg: "from-slate-400/20 to-slate-500/10", border: "border-slate-400/30", ring: "ring-slate-300/40", text: "text-slate-300", icon: "🥈", glow: "shadow-slate-500/20" },
    { bg: "from-orange-600/20 to-orange-700/10", border: "border-orange-500/30", ring: "ring-orange-400/40", text: "text-orange-400", icon: "🥉", glow: "shadow-orange-500/20" },
];

export default function RankingPage() {
    const { jwt } = useAuth();
    const [search, setSearch] = useState("");
    const [rankings, setRankings] = useState<TRanking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (jwt) {
            fetchRankings();
        }
    }, [jwt]);

    const fetchRankings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/rankings?populate=user_id.picture&sort[0]=mmr:desc`,
                { headers: { Authorization: `Bearer ${jwt}` } }
            );
            if (!res.ok) throw new Error("Failed to fetch rankings");
            const { data } = await res.json();
            setRankings(data);
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRankings = rankings.filter((r) =>
        r.user_id?.username.toLowerCase().includes(search.toLowerCase())
    );

    const top3 = rankings.slice(0, 3);

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
                        <p className="text-slate-400 text-sm sm:text-base">อัปเดตล่าสุด: {new Date().toLocaleDateString("th-TH")} · ฤดูกาลปัจจุบัน</p>
                    </div>
                </div>

                {/* Search */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-3">
                    <div className="relative w-full sm:w-80">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อผู้เล่น..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                        />
                    </div>
                    {loading && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            กำลังโหลดข้อมูล...
                        </div>
                    )}
                </div>

                {/* Podium — only show when no search and loading complete */}
                {!search && !loading && top3.length >= 1 && (
                    <div className="grid grid-cols-3 gap-2 sm:gap-6 mt-4">
                        {[top3[1], top3[0], top3[2]].map((r, idx) => {
                            if (!r) return <div key={idx} />;
                            const podiumIdx = idx === 0 ? 1 : idx === 1 ? 0 : 2;
                            const level = getPlayerLevel(r.mmr);
                            const c = podiumColors[podiumIdx];
                            const u = r.user_id;
                            const pUrl = u?.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                            const heights = ["h-24 sm:h-32", "h-36 sm:h-48", "h-16 sm:h-24"];

                            return (
                                <div key={r.id} className="flex flex-col items-center gap-2 sm:gap-4">
                                    {/* Card */}
                                    <div className={`w-full bg-gradient-to-b ${c.bg} border ${c.border} rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 shadow-2xl ${c.glow} transition-all hover:-translate-y-2 duration-300 relative overflow-hidden group`}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className={`w-12 h-12 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-slate-800 ring-2 sm:ring-4 ${c.ring} flex items-center justify-center text-xl sm:text-3xl font-bold overflow-hidden shrink-0 shadow-inner relative z-10`}>
                                            {pUrl ? <img src={pUrl} alt={u?.username} className="w-full h-full object-cover" /> : <span className={c.text}>{u?.username.charAt(0).toUpperCase()}</span>}
                                        </div>

                                        <div className="text-center relative z-10 min-w-0 w-full">
                                            <p className="font-black text-white text-xs sm:text-base leading-tight truncate px-1">{u?.username}</p>
                                            <p className={`text-[10px] sm:text-sm mt-1 sm:mt-2 font-black tracking-tighter sm:tracking-normal ${c.text}`}>{r.mmr.toLocaleString()} MMR</p>
                                        </div>

                                        <div className={`text-[8px] sm:text-[10px] font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border relative z-10 ${levelColors[level]}`}>
                                            {level}
                                        </div>

                                        <div className="text-xl sm:text-3xl relative z-10 filter drop-shadow-md">{c.icon}</div>

                                        <div className="flex gap-2 sm:gap-4 text-[9px] sm:text-xs text-slate-400 font-bold relative z-10">
                                            <span className="text-green-400">{r.win}W</span>
                                            <span className="text-red-400">{r.lose}L</span>
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
                                Seasons: 2026/01
                            </span>
                            <span className="text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                {filteredRankings.length} ผู้เล่น
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
                                    <th className="px-6 py-4 text-center hidden md:table-cell">Level</th>
                                    <th className="px-6 py-4 text-center">Played</th>
                                    <th className="px-6 py-4 text-center">W / L</th>
                                    <th className="px-6 py-4 text-center hidden sm:table-cell">Streak</th>
                                    <th className="px-6 py-4 text-right">MMR</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredRankings.map((r, idx) => {
                                    const level = getPlayerLevel(r.mmr);
                                    const u = r.user_id;
                                    const pUrl = u?.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                    const rank = idx + 1;

                                    return (
                                        <tr key={r.id} className={`group hover:bg-white/[0.04] transition-all cursor-pointer ${rank <= 3 ? "bg-white/[0.02]" : ""}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm sm:text-base font-black ${rank === 1 ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" :
                                                        rank === 2 ? "text-slate-300" :
                                                            rank === 3 ? "text-orange-400" :
                                                                "text-slate-500"
                                                        }`}>
                                                        {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg overflow-hidden shrink-0 ${rank === 1 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 ring-2 ring-yellow-400/50" :
                                                        rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-500 ring-2 ring-slate-400/50" :
                                                            rank === 3 ? "bg-gradient-to-br from-orange-400 to-orange-600 ring-2 ring-orange-500/50" :
                                                                "bg-slate-800 border border-white/10"
                                                        }`}>
                                                        {pUrl ? <img src={pUrl} alt={u?.username} className="w-full h-full object-cover" /> : <span className="text-white">{u?.username?.charAt(0).toUpperCase()}</span>}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm sm:text-base font-bold text-white group-hover:text-green-400 transition-colors truncate">
                                                            {u?.username || "Unknown"}
                                                            {r.id === 1 /* mock login identify logic if needed */ && <span className="ml-2 text-[8px] px-1.5 py-0.5 rounded-md bg-green-500/20 text-green-400 border border-green-500/30 uppercase tracking-tighter">You</span>}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 truncate">{u?.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center hidden md:table-cell">
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm ${levelColors[level]}`}>
                                                    {level}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs sm:text-sm font-bold text-slate-300">{r.match_played}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-green-400 font-black text-xs sm:text-sm">{r.win}</span>
                                                    <span className="text-slate-600 text-[10px]">/</span>
                                                    <span className="text-red-400 font-black text-xs sm:text-sm">{r.lose}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center hidden sm:table-cell">
                                                {r.win_streak > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-xs font-black gap-1 border border-orange-500/20 animate-pulse">
                                                        🔥{r.win_streak}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-700 font-bold">─</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-sm sm:text-lg font-black tracking-tight ${rank <= 3 ? "text-white" : "text-slate-200"}`}>
                                                        {r.mmr.toLocaleString()}
                                                    </span>
                                                    <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 sm:mt-0">Points</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredRankings.length === 0 && !loading && (
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

                {/* Legend */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-inner">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">ระดับผู้เล่น (Rank Tier)</h4>
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                            {Object.entries(levelColors).map(([level, cls]) => (
                                <div key={level} className="flex items-center gap-2.5">
                                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${cls}`}>{level}</span>
                                    <span className="text-[11px] text-slate-400 font-bold">
                                        {level === "A+" ? "Professional" : level === "A" ? "Advenced" : level === "B+" ? "Intermediate" : level === "B" ? "Casual" : "Newbie"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-inner flex flex-col justify-center">
                        <div className="flex items-center gap-4 mb-2">
                            <span className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xl shadow-lg shadow-orange-900/20">🔥</span>
                            <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-wider">Win Streak</h4>
                                <p className="text-[11px] text-slate-500 font-medium">คะแนนโบนัสจากการชนะติดต่อกัน</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center py-10 border-t border-white/5">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
                        🏸 Badminton Club Management System · v1.4.2
                    </p>
                </div>
            </main>
        </div>
    );
}

