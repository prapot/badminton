import { TournamentInfo } from "../TournamentTypes";
import { useRouter } from "next/navigation";

interface TournamentHeaderProps {
    id: string;
    tournamentInfo: TournamentInfo | null;
    user: { id: number } | null;
    setShowQR: (val: boolean) => void;
    setConfirmDelete: (val: boolean) => void;
    pct: number;
    done: number;
    total: number;
    cancelled: number;
}

export default function TournamentHeader({
    id,
    tournamentInfo,
    user,
    setShowQR,
    setConfirmDelete,
    pct,
    done,
    total,
    cancelled
}: TournamentHeaderProps) {
    const router = useRouter();

    if (!tournamentInfo) return null;

    const statusCfg: Record<string, { label: string; cls: string }> = {
        ongoing: { label: "● กำลังแข่ง", cls: "bg-green-500/20 text-green-400 border-green-500/25 animate-pulse" },
        upcoming: { label: "รอเริ่ม", cls: "bg-blue-500/20 text-blue-400 border-blue-500/25" },
        completed: { label: "จบแล้ว", cls: "bg-white/8 text-slate-400 border-white/10" },
    };
    const s = statusCfg[tournamentInfo.tournament_status] ?? statusCfg.upcoming;

    const isOwner = tournamentInfo.user_created?.id === user?.id;

    return (
        <div className="space-y-3">
            {/* Top row: back + title + status + delete */}
            <div className="flex items-start gap-3">
                {/* Back button */}
                <button
                    onClick={() => router.push("/tournament")}
                    className="mt-0.5 w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all shrink-0 active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {/* Title + status */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-base sm:text-xl font-black text-white leading-tight">
                            {tournamentInfo.name}
                        </h1>
                        <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>
                            {s.label}
                        </span>
                    </div>

                    {/* Detail chips — wrap on mobile */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[#2ecc71] font-bold">
                            📅 {tournamentInfo.startDate
                                ? new Date(tournamentInfo.startDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
                                : "ไม่ระบุวันที่"}
                        </span>
                        <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-lg border font-bold ${tournamentInfo.mode === "ranking"
                            ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                            : tournamentInfo.mode === "party"
                                ? "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400"
                                : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
                            {tournamentInfo.mode === "ranking" ? "🏆 Ranking" : tournamentInfo.mode === "party" ? "🎉 Party" : "🎮 Casual"}
                        </span>
                        <span className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                            {tournamentInfo.type === "single" ? "🏸 เดี่ยว" : "👥 คู่"}
                        </span>
                        <span className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                            {tournamentInfo.format === "round_robin" ? "🔄 พบกันหมด"
                                : tournamentInfo.format === "knockout" ? "⚡ แพ้คัดออก"
                                    : tournamentInfo.format === "americano" ? "🌀 อเมริกาโน" : "♾️ ไร้สิ้นสุด"}
                        </span>
                        <span className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                            👥 {tournamentInfo.players.length} คน
                        </span>
                        {tournamentInfo.user_created?.username && (
                            <span className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400">
                                👤 {tournamentInfo.user_created.username}
                            </span>
                        )}
                        {/* Invite button */}
                        <button
                            onClick={() => setShowQR(true)}
                            className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 border border-blue-500/20 text-blue-400 font-bold transition-all flex items-center gap-1"
                        >
                            🔗 เชิญเพื่อน
                        </button>
                        {/* ID — hidden on very small screens */}
                        <span className="hidden xs:inline-flex text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-600">
                            🆔 {id}
                        </span>
                    </div>

                    {/* Progress bar — ongoing only */}
                    {tournamentInfo.tournament_status === "ongoing" && (
                        <div className="mt-3 space-y-1">
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#2ecc71] to-[#27ae60] transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500">
                                    {done}/{total} แมตซ์ ({pct}%)
                                    {cancelled > 0 && <span className="ml-2 text-red-500/60">ยกเลิก {cancelled}</span>}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Delete button — icon only on mobile, text on sm+ */}
                {isOwner && tournamentInfo.tournament_status === "upcoming" && (
                    <button
                        onClick={() => setConfirmDelete(true)}
                        className="mt-0.5 shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-95 border border-red-500/20 text-red-400 text-xs font-semibold transition-all"
                        title="ลบทัวร์นาเมนต์"
                    >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden sm:inline">ลบ</span>
                    </button>
                )}
            </div>
        </div>
    );
}
