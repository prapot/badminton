"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";

const STRAPI_BASE_URL =
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

type PlayerType = "single" | "double";
type Format = "round_robin" | "knockout" | "americano";
type Status = "upcoming" | "ongoing" | "completed";
type Mode = "ranking" | "casual";

interface Tournament {
    id: number;
    documentId: string;
    name: string;
    type: PlayerType;
    format: Format;
    tournament_status: Status;
    startDate: string;
    createdAt: string;
    playerCount: number;
    isJoined: boolean;
    mode: Mode;
    user_created?: {
        id: number;
        username: string;
        picture?: { url: string } | null;
    } | null;
}

const statusConfig: Record<Status, { label: string; cls: string }> = {
    ongoing: { label: "● กำลังแข่ง", cls: "bg-green-500/10 text-green-400 border-green-500/20 animate-pulse" },
    upcoming: { label: "รอเริ่ม", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    completed: { label: "จบแล้ว", cls: "bg-white/5 text-slate-400 border-white/10" },
};

const formatLabel: Record<Format, string> = {
    round_robin: "🔄 พบกันหมด",
    knockout: "⚡ แพ้คัดออก",
    americano: "🌀 อเมริกาโน",
};

const typeLabel: Record<PlayerType, string> = {
    single: "🏸 เดี่ยว",
    double: "👥 คู่",
};

export default function TournamentListPage() {
    const router = useRouter();
    const { user, jwt } = useAuth();

    const [filter, setFilter] = useState<"all" | Status>("all");
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joiningId, setJoiningId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchTournaments = useCallback(async () => {
        if (!jwt || !user) return;
        try {
            const res = await fetch(
                `${STRAPI_BASE_URL}/api/tournaments?populate[tournament_players][populate]=user&populate[user_created][populate]=picture&sort=createdAt:desc`,
                { headers: { Authorization: `Bearer ${jwt}` } }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();

            const items: Tournament[] = (json.data ?? []).map((item: {
                id: number;
                documentId: string;
                name?: string;
                type?: PlayerType;
                format?: Format;
                tournament_status?: Status;
                startDate?: string;
                createdAt?: string;
                tournament_players?: Array<{ user?: { id?: number } }> | null;
                user_created?: { id: number; username: string; picture?: { url: string } | null } | null;
                mode?: Mode;
            }) => {
                const players = item.tournament_players ?? [];
                return {
                    id: item.id,
                    documentId: item.documentId,
                    name: item.name ?? "",
                    type: item.type ?? "single",
                    format: item.format ?? "round_robin",
                    tournament_status: item.tournament_status ?? "upcoming",
                    startDate: item.startDate ?? "",
                    createdAt: item.createdAt ?? "",
                    playerCount: players.length,
                    isJoined: players.some((p) => p.user?.id === user.id),
                    mode: item.mode ?? "ranking",
                    user_created: item.user_created,
                };
            });
            setTournaments(items);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, [jwt, user]);

    useEffect(() => {
        fetchTournaments();
    }, [fetchTournaments]);

    if (!user) return null;

    const handleJoin = async (tournamentId: string, isJoined: boolean) => {
        if (!jwt) return;

        // Guard: already joined
        if (isJoined) {
            showToast("คุณเข้าร่วมรายการนี้แล้ว", "error");
            return;
        }
        setJoiningId(tournamentId);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournament-players`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                    data: {
                        tournament_id: tournamentId,
                        user: user.id,
                        seed: null,
                    },
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const msg = err?.error?.message || `HTTP ${res.status}`;
                // Handle duplicate from API side too
                if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
                    showToast("คุณเข้าร่วมรายการนี้แล้ว", "error");
                } else {
                    showToast(msg, "error");
                }
                return;
            }
            await fetchTournaments();
            showToast("เข้าร่วมรายการสำเร็จแล้ว! 🏈", "success");
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "เข้าร่วมไม่สำเร็จ", "error");
        } finally {
            setJoiningId(null);
        }
    };

    const filtered = filter === "all"
        ? tournaments
        : tournaments.filter((t) => t.tournament_status === filter);

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />

            {/* Toast notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-medium transition-all animate-in slide-in-from-bottom-4 ${toast.type === "success"
                    ? "bg-[#0f2a1a] border-green-500/30 text-green-300"
                    : "bg-[#2a0f0f] border-red-500/30 text-red-300"
                    }`}>
                    <span className="text-base">{toast.type === "success" ? "✅" : "⚠️"}</span>
                    {toast.msg}
                </div>
            )}
            <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-white">ตารางการแข่งขัน</h1>
                        <p className="text-slate-400 text-sm mt-1">{tournaments.length} ทัวร์นาเมนต์ทั้งหมด</p>
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
                                    ? tournaments.length
                                    : tournaments.filter((t) => t.tournament_status === val).length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="py-20 text-center text-slate-500">
                        <p className="text-4xl mb-3 animate-pulse">🏸</p>
                        <p className="text-sm">กำลังโหลด...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="py-10 text-center text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl">
                        <p className="text-sm">⚠️ โหลดข้อมูลไม่สำเร็จ: {error}</p>
                    </div>
                )}

                {/* Tournament cards */}
                {!loading && !error && (
                    <div className="grid gap-4">
                        {filtered.map((t) => {
                            const sc = statusConfig[t.tournament_status];
                            const isJoining = joiningId === t.documentId;
                            return (
                                <div
                                    key={t.id}
                                    className="group bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all duration-200 hover:bg-white/[0.07] cursor-pointer"
                                    onClick={() => router.push(`/tournament/${t.documentId}`)}
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
                                                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.mode === "ranking" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                                                    {t.mode === "ranking" ? "🏆 Ranking" : "🎮 Casual"}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 items-center">
                                                <span className="flex items-center gap-1.5 text-[#2ecc71] font-bold">
                                                    📅 {t.startDate ? new Date(t.startDate).toLocaleDateString("th-TH", { day: 'numeric', month: 'long', year: 'numeric' }) : "ไม่ระบุวันที่"}
                                                </span>
                                                <span className="w-px h-3 bg-white/10 hidden sm:block" />
                                                <span>{typeLabel[t.type]}</span>
                                                <span>{formatLabel[t.format]}</span>
                                                <span>👥 {t.playerCount} ผู้เล่น</span>
                                                <span className="w-px h-3 bg-white/10 hidden sm:block" />
                                                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                                    {t.user_created?.picture?.url ? (
                                                        <img
                                                            src={t.user_created.picture.url.startsWith("http") ? t.user_created.picture.url : `${STRAPI_BASE_URL}${t.user_created.picture.url}`}
                                                            alt={t.user_created.username}
                                                            className="w-4 h-4 rounded-full object-cover border border-white/20"
                                                        />
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-300">
                                                            {t.user_created?.username?.charAt(0).toUpperCase() || "?"}
                                                        </div>
                                                    )}
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">BY: {t.user_created?.username || "ADMIN"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Join / Arrow */}
                                        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            {t.tournament_status === "upcoming" && (
                                                t.isJoined ? (
                                                    <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold">
                                                        ✓ เข้าร่วมแล้ว
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleJoin(t.documentId, t.isJoined)}
                                                        disabled={isJoining}
                                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-400 text-xs font-semibold transition-all disabled:opacity-50"
                                                    >
                                                        {isJoining ? (
                                                            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                        )}
                                                        เข้าร่วม
                                                    </button>
                                                )
                                            )}

                                            <div onClick={() => router.push(`/tournament/${t.id}`)}>
                                                <svg className="w-5 h-5 text-slate-600 group-hover:text-green-400 transition-colors cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
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
                )}

                {/* Footer */}
                <div className="text-center text-xs text-slate-600 pb-4">
                    🏸 Badminton Club Management System · {new Date().getFullYear()}
                </div>
            </main>
        </div>
    );
}
