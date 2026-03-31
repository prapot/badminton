"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";
import Footer from "@/components/Footer";
import { ListTournament, TournamentStatus, PlayerType, TournamentFormat, TournamentMode } from "./TournamentTypes";
import TournamentCard from "./TournamentCard";

const STRAPI_BASE_URL =
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface PaginationMeta {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
}

export default function TournamentListPage() {
    const router = useRouter();
    const { user, jwt } = useAuth();

    const [filter, setFilter] = useState<"all" | TournamentStatus>("all");
    const [tournaments, setTournaments] = useState<ListTournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joiningId, setJoiningId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [search, setSearch] = useState("");

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchTournaments = async (pageNum: number = 1, currentFilter: string = filter) => {
        if (!jwt || !user) return;
        setLoading(true);
        try {
            const filterQuery = currentFilter !== "all" ? `&filters[tournament_status][$eq]=${currentFilter}` : "";
            const searchQuery = search ? `&filters[name][$containsi]=${search}` : "";
            const res = await fetch(
                `${STRAPI_BASE_URL}/api/tournaments?populate[tournament_players][populate]=user&populate[user_created][populate]=picture&sort=createdAt:desc&pagination[page]=${pageNum}&pagination[pageSize]=10&pagination[withCount]=true${filterQuery}${searchQuery}`,
                { headers: { Authorization: `Bearer ${jwt}` } }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setMeta(json.meta.pagination);

            const items: ListTournament[] = (json.data ?? []).map((item: {
                id: number;
                documentId: string;
                name?: string;
                type?: PlayerType;
                format?: TournamentFormat;
                tournament_status?: TournamentStatus;
                startDate?: string;
                createdAt?: string;
                tournament_players?: Array<{ user?: { id?: number } }> | null;
                user_created?: { id: number; username: string; picture?: { url: string } | null } | null;
                mode?: TournamentMode;
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
    };

    useEffect(() => {
        fetchTournaments(page, filter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jwt, page, filter]);

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
                        <p className="text-slate-400 text-sm mt-1">{meta?.total ?? 0} ทัวร์นาเมนต์ทั้งหมด</p>
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

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-3">
                    <div className="relative w-full sm:w-80">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อรายการแข่งขัน..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    setPage(1);
                                    fetchTournaments(1);
                                }
                            }}
                            className="w-full h-11 sm:h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition-all shadow-inner"
                        />
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                        {([
                            ["all", "ทั้งหมด"],
                            ["ongoing", "กำลังแข่ง"],
                            ["upcoming", "รอเริ่ม"],
                            ["completed", "จบแล้ว"],
                        ] as ["all" | TournamentStatus, string][]).map(([val, label]) => (
                            <button
                                key={val}
                                onClick={() => {
                                    setFilter(val);
                                    setPage(1);
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-150 shrink-0 ${filter === val
                                    ? "bg-white/15 text-white border border-white/20"
                                    : "bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:bg-white/10"
                                    }`}
                            >
                                {label}
                                {filter === val && meta && (
                                    <span className="ml-2 text-xs opacity-60">
                                        {meta.total}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
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
                        {filtered.map((t) => (
                            <TournamentCard
                                key={t.id}
                                tournament={t}
                                joiningId={joiningId}
                                handleJoin={handleJoin}
                                STRAPI_BASE_URL={STRAPI_BASE_URL}
                            />
                        ))}

                        {tournaments.length === 0 && (
                            <div className="py-20 text-center text-slate-500">
                                <p className="text-5xl mb-3">🏸</p>
                                <p className="text-sm">ไม่พบทัวร์นาเมนต์ในหมวดนี้</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && meta && meta.pageCount > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2 sm:gap-4 pb-12">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            <span>‹</span> หน้าก่อนหน้า
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
                            หน้าถัดไป <span>›</span>
                        </button>
                    </div>
                )}

                <Footer></Footer>
            </main>
        </div>
    );
}
