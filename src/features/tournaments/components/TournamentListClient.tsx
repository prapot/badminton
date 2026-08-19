"use client";

import Navbar from "@/shared/components/Navbar";
import Footer from "@/shared/components/Footer";
import TournamentCard from "./TournamentCard";

import { useTournamentList } from "../hooks/useTournamentList";
import { TournamentListHeader } from "./TournamentListHeader";
import { TournamentFilters } from "./TournamentFilters";
import { TournamentPagination } from "./TournamentPagination";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

export function TournamentListClient() {
    const {
        user,
        filter,
        setFilter,
        tournaments,
        loading,
        error,
        joiningId,
        toast,
        page,
        setPage,
        meta,
        search,
        setSearch,
        fetchTournaments,
        handleJoin
    } = useTournamentList();

    if (!user) return null;

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
                
                <TournamentListHeader meta={meta} />

                <TournamentFilters 
                    search={search}
                    setSearch={setSearch}
                    filter={filter}
                    setFilter={setFilter}
                    setPage={setPage}
                    fetchTournaments={fetchTournaments}
                    meta={meta}
                />

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

                <TournamentPagination 
                    page={page}
                    setPage={setPage}
                    meta={meta}
                    loading={loading}
                />

                <Footer />
            </main>
        </div>
    );
}
