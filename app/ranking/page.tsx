"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface User {
    id: number;
    username: string;
    email: string;
}

type Category = "overall" | "singles" | "doubles";

interface Player {
    rank: number;
    name: string;
    level: string;
    wins: number;
    losses: number;
    points: number;
    winRate: number;
    streak: number;
    avatar: string;
    trend: "up" | "down" | "same";
    trendValue: number;
}

const rankingData: Record<Category, Player[]> = {
    overall: [
        { rank: 1, name: "โอม สุรชัย", level: "A+", wins: 42, losses: 4, points: 2840, winRate: 91, streak: 8, avatar: "โ", trend: "same", trendValue: 0 },
        { rank: 2, name: "ณัฐ พงษ์วิชัย", level: "A+", wins: 38, losses: 7, points: 2610, winRate: 84, streak: 3, avatar: "ณ", trend: "up", trendValue: 1 },
        { rank: 3, name: "กร วิทยา", level: "A", wins: 35, losses: 9, points: 2430, winRate: 80, streak: 5, avatar: "ก", trend: "up", trendValue: 2 },
        { rank: 4, name: "ต้น ธีรภัทร", level: "A", wins: 30, losses: 12, points: 2180, winRate: 71, streak: 0, avatar: "ต", trend: "down", trendValue: 1 },
        { rank: 5, name: "พลอย นภัทร", level: "B+", wins: 27, losses: 11, points: 1960, winRate: 71, streak: 2, avatar: "พ", trend: "up", trendValue: 1 },
        { rank: 6, name: "ใหม่ ศิริพร", level: "B+", wins: 24, losses: 13, points: 1820, winRate: 65, streak: 1, avatar: "ใ", trend: "down", trendValue: 2 },
        { rank: 7, name: "บาส สิทธิชัย", level: "B", wins: 20, losses: 15, points: 1640, winRate: 57, streak: 0, avatar: "บ", trend: "same", trendValue: 0 },
        { rank: 8, name: "ฝน กัลยา", level: "B", wins: 18, losses: 17, points: 1520, winRate: 51, streak: 3, avatar: "ฝ", trend: "up", trendValue: 3 },
        { rank: 9, name: "เต้ พีรศักดิ์", level: "B", wins: 15, losses: 18, points: 1380, winRate: 45, streak: 0, avatar: "เ", trend: "down", trendValue: 1 },
        { rank: 10, name: "นัท ณัฐวุฒิ", level: "C+", wins: 12, losses: 20, points: 1200, winRate: 37, streak: 1, avatar: "น", trend: "up", trendValue: 2 },
    ],
    singles: [
        { rank: 1, name: "โอม สุรชัย", level: "A+", wins: 28, losses: 2, points: 1920, winRate: 93, streak: 10, avatar: "โ", trend: "same", trendValue: 0 },
        { rank: 2, name: "ต้น ธีรภัทร", level: "A", wins: 24, losses: 6, points: 1650, winRate: 80, streak: 4, avatar: "ต", trend: "up", trendValue: 2 },
        { rank: 3, name: "ณัฐ พงษ์วิชัย", level: "A+", wins: 22, losses: 8, points: 1540, winRate: 73, streak: 1, avatar: "ณ", trend: "down", trendValue: 1 },
        { rank: 4, name: "กร วิทยา", level: "A", wins: 20, losses: 7, points: 1420, winRate: 74, streak: 3, avatar: "ก", trend: "up", trendValue: 1 },
        { rank: 5, name: "บาส สิทธิชัย", level: "B", wins: 18, losses: 9, points: 1280, winRate: 67, streak: 2, avatar: "บ", trend: "same", trendValue: 0 },
        { rank: 6, name: "พลอย นภัทร", level: "B+", wins: 15, losses: 10, points: 1100, winRate: 60, streak: 0, avatar: "พ", trend: "down", trendValue: 1 },
        { rank: 7, name: "ฝน กัลยา", level: "B", wins: 12, losses: 12, points: 960, winRate: 50, streak: 1, avatar: "ฝ", trend: "up", trendValue: 1 },
        { rank: 8, name: "ใหม่ ศิริพร", level: "B+", wins: 10, losses: 11, points: 860, winRate: 48, streak: 0, avatar: "ใ", trend: "down", trendValue: 2 },
        { rank: 9, name: "เต้ พีรศักดิ์", level: "B", wins: 8, losses: 13, points: 720, winRate: 38, streak: 0, avatar: "เ", trend: "same", trendValue: 0 },
        { rank: 10, name: "นัท ณัฐวุฒิ", level: "C+", wins: 6, losses: 14, points: 580, winRate: 30, streak: 0, avatar: "น", trend: "up", trendValue: 1 },
    ],
    doubles: [
        { rank: 1, name: "ณัฐ & กร", level: "A+", wins: 16, losses: 2, points: 1120, winRate: 89, streak: 6, avatar: "N", trend: "up", trendValue: 1 },
        { rank: 2, name: "โอม & ใหม่", level: "A+", wins: 14, losses: 3, points: 980, winRate: 82, streak: 4, avatar: "O", trend: "same", trendValue: 0 },
        { rank: 3, name: "พลอย & ฝน", level: "A", wins: 12, losses: 4, points: 860, winRate: 75, streak: 2, avatar: "P", trend: "up", trendValue: 2 },
        { rank: 4, name: "ต้น & บาส", level: "A", wins: 10, losses: 6, points: 740, winRate: 63, streak: 0, avatar: "T", trend: "down", trendValue: 1 },
        { rank: 5, name: "ฝน & นัท", level: "B+", wins: 9, losses: 7, points: 660, winRate: 56, streak: 1, avatar: "F", trend: "up", trendValue: 1 },
    ],
};

const levelColors: Record<string, string> = {
    "A+": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    "A": "bg-orange-500/20 text-orange-300 border-orange-500/30",
    "B+": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "B": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    "C+": "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const podiumColors = [
    { bg: "from-yellow-500/30 to-yellow-600/10", border: "border-yellow-500/40", ring: "ring-yellow-400/50", text: "text-yellow-300", icon: "🥇", glow: "shadow-yellow-500/20" },
    { bg: "from-slate-400/20 to-slate-500/10", border: "border-slate-400/30", ring: "ring-slate-300/40", text: "text-slate-300", icon: "🥈", glow: "shadow-slate-500/20" },
    { bg: "from-orange-600/20 to-orange-700/10", border: "border-orange-500/30", ring: "ring-orange-400/40", text: "text-orange-400", icon: "🥉", glow: "shadow-orange-500/20" },
];

export default function RankingPage() {
    const router = useRouter();
    const [category, setCategory] = useState<Category>("overall");
    const [search, setSearch] = useState("");

    const players = rankingData[category].filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const top3 = rankingData[category].slice(0, 3);

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                {/* Header */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a2236] to-[#0f1923] border border-white/10 p-8">
                    <div className="absolute inset-0 pointer-events-none opacity-5">
                        <svg className="w-full h-full" viewBox="0 0 900 200" preserveAspectRatio="xMidYMid slice">
                            <rect x="50" y="20" width="800" height="160" fill="none" stroke="#2ecc71" strokeWidth="2" />
                            <line x1="450" y1="20" x2="450" y2="180" stroke="#2ecc71" strokeWidth="3" />
                            <line x1="50" y1="80" x2="450" y2="80" stroke="#2ecc71" strokeWidth="1.5" />
                            <line x1="450" y1="120" x2="850" y2="120" stroke="#2ecc71" strokeWidth="1.5" />
                        </svg>
                    </div>
                    <div className="absolute top-4 right-8 text-8xl opacity-10 select-none">🏆</div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20 mb-3">
                            <span>🏅</span> ตารางอันดับผู้เล่น
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
                        <p className="text-slate-400">อัปเดตล่าสุด: 25 กุมภาพันธ์ 2569 · ฤดูกาล 2026</p>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-3 flex-wrap">
                    {(["overall", "singles", "doubles"] as Category[]).map((cat) => {
                        const labels: Record<Category, string> = { overall: "🏆 ภาพรวม", singles: "👤 ซิงเกิ้ล", doubles: "👥 ดับเบิ้ล" };
                        return (
                            <button
                                key={cat}
                                onClick={() => { setCategory(cat); setSearch(""); }}
                                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${category === cat
                                    ? "bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white shadow-lg shadow-green-900/30"
                                    : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                                    }`}
                            >
                                {labels[cat]}
                            </button>
                        );
                    })}

                    {/* Search */}
                    <div className="ml-auto relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="ค้นหาผู้เล่น..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all w-52"
                        />
                    </div>
                </div>

                {/* Podium — only show when no search */}
                {!search && (
                    <div className="grid grid-cols-3 gap-4">
                        {[top3[1], top3[0], top3[2]].map((p, idx) => {
                            const podiumIdx = idx === 0 ? 1 : idx === 1 ? 0 : 2;
                            const c = podiumColors[podiumIdx];
                            const heights = ["h-28", "h-40", "h-20"];
                            return (
                                <div key={p.rank} className="flex flex-col items-center gap-3">
                                    {/* Card */}
                                    <div className={`w-full bg-gradient-to-b ${c.bg} border ${c.border} rounded-2xl p-4 flex flex-col items-center gap-2 shadow-xl ${c.glow} shadow-lg transition-transform hover:-translate-y-1 duration-200`}>
                                        <div className={`w-14 h-14 rounded-2xl bg-white/10 ring-2 ${c.ring} flex items-center justify-center text-2xl font-bold ${c.text}`}>
                                            {p.avatar}
                                        </div>
                                        <div className="text-center">
                                            <p className="font-semibold text-white text-sm leading-tight">{p.name}</p>
                                            <p className={`text-xs mt-0.5 font-bold ${c.text}`}>{p.points.toLocaleString()} pts</p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${levelColors[p.level] ?? ""}`}>
                                            {p.level}
                                        </span>
                                        <span className="text-lg">{c.icon}</span>
                                        <div className="flex gap-3 text-[11px] text-slate-400">
                                            <span className="text-green-400 font-medium">{p.wins}W</span>
                                            <span>·</span>
                                            <span className="text-red-400 font-medium">{p.losses}L</span>
                                        </div>
                                    </div>
                                    {/* Podium stand */}
                                    <div className={`w-full ${heights[idx]} rounded-b-xl rounded-t-md ${podiumIdx === 0 ? "bg-gradient-to-b from-yellow-500/30 to-yellow-600/5 border border-yellow-500/20" :
                                        podiumIdx === 1 ? "bg-gradient-to-b from-slate-400/20 to-slate-500/5 border border-slate-400/15" :
                                            "bg-gradient-to-b from-orange-600/20 to-orange-700/5 border border-orange-500/15"
                                        } flex items-center justify-center`}>
                                        <span className="text-2xl font-black text-white/20">#{p.rank}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Full Ranking Table */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-white/8 flex items-center justify-between">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <span>📊</span> ตารางอันดับทั้งหมด
                        </h3>
                        <span className="text-xs text-slate-500">{players.length} ผู้เล่น</span>
                    </div>

                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-white/5">
                        <div className="col-span-1">#</div>
                        <div className="col-span-4">ผู้เล่น</div>
                        <div className="col-span-1 text-center">ระดับ</div>
                        <div className="col-span-2 text-center">W / L</div>
                        <div className="col-span-2 text-center">Win%</div>
                        <div className="col-span-1 text-center">สาย</div>
                        <div className="col-span-1 text-right">คะแนน</div>
                    </div>

                    {/* Table rows */}
                    <div className="divide-y divide-white/5">
                        {players.map((p) => (
                            <div
                                key={p.rank}
                                className={`grid grid-cols-12 gap-2 px-5 py-3.5 items-center transition-colors hover:bg-white/5 cursor-pointer group ${p.rank <= 3 ? "bg-white/[0.02]" : ""
                                    }`}
                            >
                                {/* Rank */}
                                <div className="col-span-1 flex items-center gap-1.5">
                                    <span className={`font-bold text-sm ${p.rank === 1 ? "text-yellow-400" : p.rank === 2 ? "text-slate-300" : p.rank === 3 ? "text-orange-400" : "text-slate-500"}`}>
                                        {p.rank <= 3 ? ["🥇", "🥈", "🥉"][p.rank - 1] : p.rank}
                                    </span>
                                    {!search && (
                                        <span className={`text-[9px] font-bold ${p.trend === "up" ? "text-green-400" : p.trend === "down" ? "text-red-400" : "text-slate-600"}`}>
                                            {p.trend === "up" ? `▲${p.trendValue}` : p.trend === "down" ? `▼${p.trendValue}` : "─"}
                                        </span>
                                    )}
                                </div>

                                {/* Player */}
                                <div className="col-span-4 flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold bg-gradient-to-br ${p.rank === 1 ? "from-yellow-500/40 to-yellow-600/20 text-yellow-300" :
                                        p.rank === 2 ? "from-slate-400/30 to-slate-500/15 text-slate-300" :
                                            p.rank === 3 ? "from-orange-500/30 to-orange-600/15 text-orange-400" :
                                                "from-white/10 to-white/5 text-slate-300"
                                        }`}>
                                        {p.avatar}
                                    </div>
                                    <span className="text-sm font-medium text-white group-hover:text-green-300 transition-colors">{p.name}</span>
                                </div>

                                {/* Level */}
                                <div className="col-span-1 flex justify-center">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${levelColors[p.level] ?? ""}`}>
                                        {p.level}
                                    </span>
                                </div>

                                {/* W/L */}
                                <div className="col-span-2 text-center text-sm">
                                    <span className="text-green-400 font-semibold">{p.wins}</span>
                                    <span className="text-slate-600 mx-1">/</span>
                                    <span className="text-red-400 font-semibold">{p.losses}</span>
                                </div>

                                {/* Win Rate */}
                                <div className="col-span-2 flex flex-col items-center gap-1">
                                    <span className="text-xs font-semibold text-white">{p.winRate}%</span>
                                    <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${p.winRate}%`,
                                                background: p.winRate >= 80 ? "linear-gradient(90deg,#2ecc71,#27ae60)" :
                                                    p.winRate >= 60 ? "linear-gradient(90deg,#3498db,#2980b9)" :
                                                        "linear-gradient(90deg,#e74c3c,#c0392b)"
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Streak */}
                                <div className="col-span-1 text-center">
                                    {p.streak > 0 ? (
                                        <span className="text-xs font-bold text-orange-400 flex items-center justify-center gap-0.5">
                                            🔥{p.streak}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-600">─</span>
                                    )}
                                </div>

                                {/* Points */}
                                <div className="col-span-1 text-right">
                                    <span className="text-sm font-bold text-white">{p.points.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}

                        {players.length === 0 && (
                            <div className="py-16 text-center text-slate-500">
                                <p className="text-4xl mb-3">🔍</p>
                                <p className="text-sm">ไม่พบผู้เล่น "{search}"</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Legend */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">คำอธิบายระดับ</h4>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(levelColors).map(([level, cls]) => (
                            <div key={level} className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cls}`}>{level}</span>
                                <span className="text-xs text-slate-500">
                                    {level === "A+" ? "โปร" : level === "A" ? "เก่งมาก" : level === "B+" ? "ดี" : level === "B" ? "ปานกลาง" : "มือใหม่"}
                                </span>
                            </div>
                        ))}
                        <div className="flex items-center gap-2 ml-4">
                            <span className="text-xs text-orange-400 font-bold">🔥 N</span>
                            <span className="text-xs text-slate-500">= ชนะติดต่อกัน N ครั้ง</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-slate-600 pb-4">
                    🏸 Badminton Club Management System · {new Date().getFullYear()}
                </div>
            </main>
        </div>
    );
}
