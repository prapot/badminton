"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface User {
    id: number;
    username: string;
    email: string;
}

type Status = "ongoing" | "upcoming" | "completed";

interface Tournament {
    id: number;
    name: string;
    date: string;
    status: Status;
    players: number;
    groups: number;
    format: string;
    venue: string;
    matches: number;
    matchesDone: number;
}

const mockTournaments: Tournament[] = [
    {
        id: 1,
        name: "Badminton Club Open 2026",
        date: "25 ก.พ. 2569",
        status: "ongoing",
        players: 16,
        groups: 4,
        format: "แบ่งสาย + แพ้คัดออก",
        venue: "สนาม A–D",
        matches: 24,
        matchesDone: 18,
    },
    {
        id: 2,
        name: "ทัวร์นาเมนต์ประจำเดือน มีนาคม 2026",
        date: "15 มี.ค. 2569",
        status: "upcoming",
        players: 8,
        groups: 2,
        format: "แบ่งสาย + แพ้คัดออก",
        venue: "สนาม A–B",
        matches: 12,
        matchesDone: 0,
    },
    {
        id: 3,
        name: "สมาชิกใหม่ คัพ 2025",
        date: "10 ม.ค. 2568",
        status: "completed",
        players: 12,
        groups: 3,
        format: "แบ่งสาย + แพ้คัดออก",
        venue: "สนาม A–C",
        matches: 18,
        matchesDone: 18,
    },
    {
        id: 4,
        name: "ซิงเกิ้ล ชาเลนจ์ ธันวาคม 2025",
        date: "20 ธ.ค. 2568",
        status: "completed",
        players: 16,
        groups: 4,
        format: "แพ้คัดออกทันที",
        venue: "สนาม A–D",
        matches: 15,
        matchesDone: 15,
    },
];

const statusConfig: Record<Status, { label: string; cls: string; dot: string }> = {
    ongoing: { label: "● กำลังแข่ง", cls: "bg-green-500/20 text-green-400 border-green-500/25", dot: "bg-green-400 animate-pulse" },
    upcoming: { label: "รอเริ่ม", cls: "bg-blue-500/20 text-blue-400 border-blue-500/25", dot: "bg-blue-400" },
    completed: { label: "จบแล้ว", cls: "bg-white/8 text-slate-400 border-white/10", dot: "bg-slate-500" },
};

export default function TournamentListPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [filter, setFilter] = useState<"all" | Status>("all");

    useEffect(() => {
        const stored = localStorage.getItem("user");
        const jwt = localStorage.getItem("jwt");
        if (!jwt) { router.push("/login"); return; }
        if (stored) setUser(JSON.parse(stored));
    }, [router]);

    if (!user) return null;

    const filtered = filter === "all"
        ? mockTournaments
        : mockTournaments.filter((t) => t.status === filter);

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-white">ตารางการแข่งขัน</h1>
                        <p className="text-slate-400 text-sm mt-1">{mockTournaments.length} ทัวร์นาเมนต์ทั้งหมด</p>
                    </div>
                    <Link
                        href="/tournament/create"
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] hover:from-[#3de382] hover:to-[#2ecc71] text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-green-900/30"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        สร้างทัวร์นาเมนต์ใหม่
                    </Link>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 flex-wrap">
                    {([
                        ["all", "ทั้งหมด"],
                        ["ongoing", "กำลังแข่ง"],
                        ["upcoming", "รอเริ่ม"],
                        ["completed", "จบแล้ว"],
                    ] as ["all" | Status, string][]).map(([val, label]) => (
                        <button
                            key={val}
                            onClick={() => setFilter(val)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${filter === val
                                    ? "bg-white/15 text-white border border-white/20"
                                    : "bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:bg-white/10"
                                }`}
                        >
                            {label}
                            <span className="ml-2 text-xs opacity-60">
                                {val === "all"
                                    ? mockTournaments.length
                                    : mockTournaments.filter((t) => t.status === val).length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Tournament cards */}
                <div className="grid gap-4">
                    {filtered.map((t) => {
                        const sc = statusConfig[t.status];
                        const progress = Math.round((t.matchesDone / t.matches) * 100);
                        return (
                            <div
                                key={t.id}
                                className="group bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all duration-200 hover:bg-white/[0.07] cursor-pointer"
                                onClick={() => router.push(`/tournament/${t.id}`)}
                            >
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    {/* Left info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <h2 className="text-base font-semibold text-white group-hover:text-green-300 transition-colors truncate">
                                                {t.name}
                                            </h2>
                                            <span className={`shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sc.cls}`}>
                                                {sc.label}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                                            <span>📅 {t.date}</span>
                                            <span>🏟️ {t.venue}</span>
                                            <span>👥 {t.players} ผู้เล่น</span>
                                            <span>🎯 {t.groups} สาย</span>
                                            <span>⚡ {t.format}</span>
                                        </div>
                                    </div>

                                    {/* Right stats */}
                                    <div className="flex items-center gap-6 shrink-0">
                                        {/* Progress */}
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 mb-1">
                                                แมตซ์ {t.matchesDone}/{t.matches}
                                            </p>
                                            <div className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${progress}%`,
                                                        background:
                                                            t.status === "completed"
                                                                ? "linear-gradient(90deg,#64748b,#475569)"
                                                                : "linear-gradient(90deg,#2ecc71,#27ae60)",
                                                    }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1 text-right">{progress}%</p>
                                        </div>

                                        {/* Arrow */}
                                        <svg
                                            className="w-5 h-5 text-slate-600 group-hover:text-green-400 transition-colors"
                                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Bottom action bar — show only for ongoing/upcoming */}
                                {t.status !== "completed" && (
                                    <div className="mt-4 pt-4 border-t border-white/8 flex items-center gap-3">
                                        <Link
                                            href={`/tournament/${t.id}/match/create`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 text-xs font-semibold transition-all"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            เพิ่มแมตซ์
                                        </Link>
                                        <Link
                                            href={`/tournament/${t.id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium transition-all"
                                        >
                                            ดูตาราง
                                        </Link>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div className="py-20 text-center text-slate-500">
                            <p className="text-5xl mb-3">🏸</p>
                            <p className="text-sm">ไม่พบทัวร์นาเมนต์ในหมวดนี้</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-slate-600 pb-4">
                    🏸 Badminton Club Management System · {new Date().getFullYear()}
                </div>
            </main>
        </div>
    );
}
