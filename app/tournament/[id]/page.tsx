"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";

interface User {
    id: number;
    username: string;
    email: string;
}

type MatchStatus = "done" | "live" | "upcoming";

interface TMatch {
    id: string;
    player1: string;
    player2: string;
    score1: number | null;
    score2: number | null;
    status: MatchStatus;
    court: string;
    time: string;
    round: string; // "group-A" | "group-B" | ... | "sf" | "final" | "third"
}

interface GroupPlayer {
    name: string;
    won: number;
    lost: number;
    pts: number;
    sumFor: number;
    sumAgainst: number;
}

/* ─── Initial mock state ─── */
const initMatches: TMatch[] = [
    // สาย A
    { id: "A1", round: "group-A", player1: "โอม", player2: "ณัฐ", score1: 21, score2: 15, status: "done", court: "สนาม A", time: "09:00" },
    { id: "A2", round: "group-A", player1: "กร", player2: "บาส", score1: 21, score2: 14, status: "done", court: "สนาม B", time: "09:00" },
    { id: "A3", round: "group-A", player1: "โอม", player2: "กร", score1: null, score2: null, status: "upcoming", court: "สนาม A", time: "10:30" },
    { id: "A4", round: "group-A", player1: "ณัฐ", player2: "บาส", score1: null, score2: null, status: "upcoming", court: "สนาม B", time: "10:30" },
    { id: "A5", round: "group-A", player1: "โอม", player2: "บาส", score1: null, score2: null, status: "upcoming", court: "สนาม A", time: "12:00" },
    { id: "A6", round: "group-A", player1: "ณัฐ", player2: "กร", score1: null, score2: null, status: "upcoming", court: "สนาม B", time: "12:00" },
    // สาย B
    { id: "B1", round: "group-B", player1: "ต้น", player2: "พลอย", score1: 21, score2: 16, status: "done", court: "สนาม C", time: "09:00" },
    { id: "B2", round: "group-B", player1: "ใหม่", player2: "ฝน", score1: 21, score2: 13, status: "done", court: "สนาม D", time: "09:00" },
    { id: "B3", round: "group-B", player1: "ต้น", player2: "ใหม่", score1: null, score2: null, status: "upcoming", court: "สนาม C", time: "10:30" },
    { id: "B4", round: "group-B", player1: "พลอย", player2: "ฝน", score1: null, score2: null, status: "upcoming", court: "สนาม D", time: "10:30" },
    { id: "B5", round: "group-B", player1: "ต้น", player2: "ฝน", score1: null, score2: null, status: "upcoming", court: "สนาม C", time: "12:00" },
    { id: "B6", round: "group-B", player1: "พลอย", player2: "ใหม่", score1: null, score2: null, status: "upcoming", court: "สนาม D", time: "12:00" },
    // KO rounds (TBD until groups done)
    { id: "SF1", round: "sf", player1: "TBD", player2: "TBD", score1: null, score2: null, status: "upcoming", court: "สนาม A", time: "14:00" },
    { id: "SF2", round: "sf", player1: "TBD", player2: "TBD", score1: null, score2: null, status: "upcoming", court: "สนาม B", time: "14:00" },
    { id: "3RD", round: "third", player1: "TBD", player2: "TBD", score1: null, score2: null, status: "upcoming", court: "สนาม B", time: "15:30" },
    { id: "F1", round: "final", player1: "TBD", player2: "TBD", score1: null, score2: null, status: "upcoming", court: "สนาม A", time: "16:00" },
];

const groupDefs = [
    { id: "group-A", label: "สาย A", players: ["โอม", "ณัฐ", "กร", "บาส"], dot: "bg-blue-400" },
    { id: "group-B", label: "สาย B", players: ["ต้น", "พลอย", "ใหม่", "ฝน"], dot: "bg-green-400" },
];

/* ─── Helpers ─── */
function calcStandings(players: string[], matches: TMatch[], round: string): GroupPlayer[] {
    const map: Record<string, GroupPlayer> = {};
    players.forEach((p) => { map[p] = { name: p, won: 0, lost: 0, pts: 0, sumFor: 0, sumAgainst: 0 }; });
    matches.filter((m) => m.round === round && m.status === "done" && m.score1 !== null && m.score2 !== null).forEach((m) => {
        const s1 = m.score1!, s2 = m.score2!;
        if (s1 > s2) { map[m.player1].won++; map[m.player1].pts += 3; map[m.player2].lost++; }
        else { map[m.player2].won++; map[m.player2].pts += 3; map[m.player1].lost++; }
        map[m.player1].sumFor += s1; map[m.player1].sumAgainst += s2;
        map[m.player2].sumFor += s2; map[m.player2].sumAgainst += s1;
    });
    return Object.values(map).sort((a, b) => b.pts - a.pts || (b.sumFor - b.sumAgainst) - (a.sumFor - a.sumAgainst));
}

/* ─── Score Modal ─── */
function ScoreModal({
    match,
    onClose,
    onSave,
}: {
    match: TMatch;
    onClose: () => void;
    onSave: (id: string, s1: number, s2: number) => void;
}) {
    const [s1, setS1] = useState<string>(match.score1?.toString() ?? "");
    const [s2, setS2] = useState<string>(match.score2?.toString() ?? "");
    const n1 = parseInt(s1), n2 = parseInt(s2);
    const isValid = !isNaN(n1) && !isNaN(n2) && n1 >= 0 && n2 >= 0 && n1 !== n2 && (Math.max(n1, n2) >= 21 || Math.max(n1, n2) >= 15);
    const winner = isValid ? (n1 > n2 ? match.player1 : match.player2) : null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            {/* Card */}
            <div className="relative z-10 w-full max-w-sm bg-[#141f2e] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{match.time} · {match.court}</p>
                        <p className="text-sm font-semibold text-white mt-0.5">บันทึกผลการแข่งขัน</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Score inputs */}
                <div className="px-6 py-5 space-y-4">
                    {/* Player 1 */}
                    <div className="flex items-center justify-between gap-4">
                        <span className={`text-sm font-semibold flex-1 ${isValid && n1 > n2 ? "text-green-300" : "text-white"}`}>{match.player1}</span>
                        <input
                            type="number" min={0} max={30}
                            value={s1}
                            onChange={(e) => setS1(e.target.value)}
                            placeholder="─"
                            className="w-20 text-center text-2xl font-bold bg-white/8 border border-white/15 rounded-xl py-2 text-white focus:outline-none focus:border-green-500/50 focus:bg-white/12 transition-all [appearance:textfield]"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="text-xs text-slate-600 font-semibold">VS</span>
                        <div className="flex-1 h-px bg-white/8" />
                    </div>

                    {/* Player 2 */}
                    <div className="flex items-center justify-between gap-4">
                        <span className={`text-sm font-semibold flex-1 ${isValid && n2 > n1 ? "text-green-300" : "text-white"}`}>{match.player2}</span>
                        <input
                            type="number" min={0} max={30}
                            value={s2}
                            onChange={(e) => setS2(e.target.value)}
                            placeholder="─"
                            className="w-20 text-center text-2xl font-bold bg-white/8 border border-white/15 rounded-xl py-2 text-white focus:outline-none focus:border-green-500/50 focus:bg-white/12 transition-all [appearance:textfield]"
                        />
                    </div>

                    {/* Winner preview */}
                    {winner && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                            <span className="text-green-400 text-sm">🏆</span>
                            <span className="text-green-300 text-sm font-semibold">{winner} ชนะ</span>
                        </div>
                    )}
                    {s1 !== "" && s2 !== "" && !isValid && (
                        <p className="text-xs text-red-400">คะแนนไม่ถูกต้อง (ต้องชนะ 21 หรือถึง 15 ขึ้นไป และห้ามเสมอ)</p>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 pb-5 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 transition-all">
                        ยกเลิก
                    </button>
                    <button
                        onClick={() => isValid && onSave(match.id, n1, n2)}
                        disabled={!isValid}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:from-[#3de382] hover:to-[#2ecc71] transition-all"
                    >
                        บันทึกผล
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Match Row ─── */
function MatchRow({ match, onClick }: { match: TMatch; onClick: () => void }) {
    const done = match.status === "done";
    const p1w = done && match.score1! > match.score2!;
    const p2w = done && match.score2! > match.score1!;
    const isTBD = match.player1 === "TBD";

    return (
        <div
            onClick={!isTBD ? onClick : undefined}
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3.5 transition-colors group ${isTBD ? "opacity-40 cursor-default" : "hover:bg-white/5 cursor-pointer active:bg-white/8"}`}
        >
            {/* Time/court — hidden on xs, visible sm+ */}
            <div className="hidden sm:block w-16 shrink-0 text-center">
                <p className="text-[11px] font-bold text-slate-300">{match.time}</p>
                <p className="text-[10px] text-slate-500">{match.court}</p>
            </div>
            {/* Players + score */}
            <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <span className={`text-sm font-semibold flex-1 text-right truncate ${p1w ? "text-white" : "text-slate-400"}`}>{match.player1}</span>
                <div className="flex items-center gap-1 shrink-0 w-[4.5rem] justify-center">
                    {done ? (
                        <>
                            <span className={`w-7 text-center text-sm font-bold ${p1w ? "text-green-300" : "text-slate-500"}`}>{match.score1}</span>
                            <span className="text-slate-600 text-[10px]">─</span>
                            <span className={`w-7 text-center text-sm font-bold ${p2w ? "text-green-300" : "text-slate-500"}`}>{match.score2}</span>
                        </>
                    ) : match.status === "live" ? (
                        <span className="text-[10px] font-bold text-yellow-300 animate-pulse">● LIVE</span>
                    ) : (
                        <span className="text-xs text-slate-600">vs</span>
                    )}
                </div>
                <span className={`text-sm font-semibold flex-1 truncate ${p2w ? "text-white" : "text-slate-400"}`}>{match.player2}</span>
            </div>
            {/* Action badge — always visible on mobile, hover-reveal on desktop */}
            {!isTBD && (
                <div className={`shrink-0 ${done ? "" : "sm:opacity-0 sm:group-hover:opacity-100"} transition-opacity`}>
                    {done ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">✓</span>
                    ) : (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/8 text-slate-300 border border-white/10">✏️</span>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Bracket view ─── */
function BracketView({ matches }: { matches: TMatch[] }) {
    const sf1 = matches.find((m) => m.id === "SF1")!;
    const sf2 = matches.find((m) => m.id === "SF2")!;
    const fin = matches.find((m) => m.id === "F1")!;
    const trd = matches.find((m) => m.id === "3RD")!;

    const MiniCard = ({ m }: { m: TMatch }) => {
        const done = m.status === "done";
        const p1w = done && m.score1! > m.score2!;
        const p2w = done && m.score2! > m.score1!;
        return (
            <div className="w-52 rounded-xl border border-white/12 overflow-hidden bg-[#0f1923]">
                <div className={`flex items-center justify-between px-4 py-2.5 border-b border-white/8 ${p1w ? "bg-green-500/10" : ""}`}>
                    <span className={`text-sm font-medium truncate ${m.player1 === "TBD" ? "text-slate-600 italic" : p1w ? "text-white font-semibold" : "text-slate-300"}`}>{m.player1}</span>
                    {done && <span className={`text-sm font-bold ml-2 shrink-0 ${p1w ? "text-green-400" : "text-slate-500"}`}>{m.score1}</span>}
                </div>
                <div className={`flex items-center justify-between px-4 py-2.5 ${p2w ? "bg-green-500/10" : ""}`}>
                    <span className={`text-sm font-medium truncate ${m.player2 === "TBD" ? "text-slate-600 italic" : p2w ? "text-white font-semibold" : "text-slate-300"}`}>{m.player2}</span>
                    {done && <span className={`text-sm font-bold ml-2 shrink-0 ${p2w ? "text-green-400" : "text-slate-500"}`}>{m.score2}</span>}
                </div>
                {m.status === "live" && <div className="py-1 text-center text-[10px] font-bold text-yellow-300 bg-yellow-500/10 animate-pulse">● กำลังแข่ง</div>}
                {m.status === "upcoming" && m.player1 !== "TBD" && <div className="py-1 text-center text-[10px] text-slate-600 bg-white/3">{m.time} · {m.court}</div>}
            </div>
        );
    };

    const Connector = () => <div className="w-8 border-t border-white/15 self-center" />;

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex items-center gap-0 min-w-max">
                {/* SF column */}
                <div className="flex flex-col gap-12">
                    <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">รอบรองชนะเลิศ</p>
                        <MiniCard m={sf1} />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 invisible">x</p>
                        <MiniCard m={sf2} />
                    </div>
                </div>
                {/* Connectors */}
                <div className="flex flex-col gap-12">
                    <Connector /><Connector />
                </div>
                {/* Final column */}
                <div className="flex flex-col gap-4 self-center">
                    <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">รอบชิงชนะเลิศ</p>
                        <MiniCard m={fin} />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <span className="text-lg">🏆</span>
                        <span className="text-xs text-yellow-300 font-semibold">แชมป์</span>
                    </div>
                </div>
            </div>
            {/* 3rd place */}
            <div className="mt-6 pt-5 border-t border-white/8">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">ชิงอันดับ 3</p>
                <MiniCard m={trd} />
            </div>
        </div>
    );
}

/* ─── Main Page ─── */
type Tab = "groups" | "bracket";

export default function TournamentDetailPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const [user, setUser] = useState<User | null>(null);
    const [matches, setMatches] = useState<TMatch[]>(initMatches);
    const [tab, setTab] = useState<Tab>("groups");
    const [activeGroup, setActiveGroup] = useState("group-A");
    const [editing, setEditing] = useState<TMatch | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem("user");
        const jwt = localStorage.getItem("jwt");
        if (!jwt) { router.push("/login"); return; }
        if (stored) setUser(JSON.parse(stored));
    }, [router]);

    if (!user) return null;

    /* Advance bracket when groups are done */
    function advanceBracket(updated: TMatch[]): TMatch[] {
        const next = [...updated];

        // For each group compute top2 and fill SF slots
        groupDefs.forEach((g, gi) => {
            const standings = calcStandings(g.players, next, g.id);
            const groupMatches = next.filter((m) => m.round === g.id);
            const allDone = groupMatches.every((m) => m.status === "done");
            if (allDone && standings.length >= 2) {
                // SF1 gets A1 as p1, SF2 gets A2 as p2 (inverted bracket)
                const sf1i = next.findIndex((m) => m.id === "SF1");
                const sf2i = next.findIndex((m) => m.id === "SF2");
                if (gi === 0) {
                    if (sf1i !== -1) next[sf1i] = { ...next[sf1i], player1: standings[0].name };
                    if (sf2i !== -1) next[sf2i] = { ...next[sf2i], player2: standings[1].name };
                } else {
                    if (sf1i !== -1) next[sf1i] = { ...next[sf1i], player2: standings[1].name };
                    if (sf2i !== -1) next[sf2i] = { ...next[sf2i], player1: standings[0].name };
                }
            }
        });

        // Advance SF winners to Final and losers to 3rd
        const sf1 = next.find((m) => m.id === "SF1");
        const sf2 = next.find((m) => m.id === "SF2");
        const fi = next.findIndex((m) => m.id === "F1");
        const ti = next.findIndex((m) => m.id === "3RD");

        if (sf1?.status === "done" && sf1.score1 !== null && sf1.score2 !== null) {
            const w = sf1.score1 > sf1.score2 ? sf1.player1 : sf1.player2;
            const l = sf1.score1 > sf1.score2 ? sf1.player2 : sf1.player1;
            if (fi !== -1 && next[fi].player1 === "TBD") next[fi] = { ...next[fi], player1: w };
            if (ti !== -1 && next[ti].player1 === "TBD") next[ti] = { ...next[ti], player1: l };
        }
        if (sf2?.status === "done" && sf2.score1 !== null && sf2.score2 !== null) {
            const w = sf2.score1 > sf2.score2 ? sf2.player1 : sf2.player2;
            const l = sf2.score1 > sf2.score2 ? sf2.player2 : sf2.player1;
            if (fi !== -1 && next[fi].player2 === "TBD") next[fi] = { ...next[fi], player2: w };
            if (ti !== -1 && next[ti].player2 === "TBD") next[ti] = { ...next[ti], player2: l };
        }

        return next;
    }

    const handleSave = (matchId: string, s1: number, s2: number) => {
        const updated = matches.map((m) =>
            m.id === matchId ? { ...m, score1: s1, score2: s2, status: "done" as MatchStatus } : m
        );
        setMatches(advanceBracket(updated));
        setEditing(null);
    };

    const currentGroupDef = groupDefs.find((g) => g.id === activeGroup)!;
    const standings = calcStandings(currentGroupDef.players, matches, activeGroup);
    const groupMatches = matches.filter((m) => m.round === activeGroup);
    const total = matches.length - matches.filter((m) => m.round.startsWith("group")).length + matches.filter((m) => m.round.startsWith("group")).length;
    const done = matches.filter((m) => m.status === "done").length;
    const pct = Math.round((done / total) * 100);

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />
            {editing && <ScoreModal match={editing} onClose={() => setEditing(null)} onSave={handleSave} />}

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <button onClick={() => router.push("/tournament")} className="mt-1 w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl font-bold text-white">Badminton Club Open 2026</h1>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/25 animate-pulse">● กำลังแข่ง</span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">25 ก.พ. 2569 · สนาม A–D · #{id}</p>

                        {/* Overall progress */}
                        <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 max-w-xs h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-[#2ecc71] to-[#27ae60] transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-400">{done}/{total} แมตซ์ ({pct}%)</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {([["groups", "📋 รอบแบ่งสาย"], ["bracket", "🏆 รอบแพ้คัดออก"]] as [Tab, string][]).map(([t, label]) => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${tab === t ? "bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white shadow-lg shadow-green-900/30" : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10"}`}
                        >{label}</button>
                    ))}
                </div>

                {/* ── GROUP TAB ── */}
                {tab === "groups" && (
                    <div className="space-y-5">
                        {/* Group selector */}
                        <div className="flex gap-2 flex-wrap">
                            {groupDefs.map((g) => (
                                <button key={g.id} onClick={() => setActiveGroup(g.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeGroup === g.id ? "bg-white/15 text-white border border-white/20" : "bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:bg-white/10"}`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${g.dot}`} />
                                    {g.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:items-start">
                            {/* Standings */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${currentGroupDef.dot}`} />
                                    <h3 className="font-semibold text-white text-sm">{currentGroupDef.label} — อันดับ</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs min-w-[300px]">
                                        <thead className="border-b border-white/5">
                                            <tr className="text-slate-500">
                                                <th className="text-left px-4 py-2.5">#</th>
                                                <th className="text-left px-2 py-2.5">ผู้เล่น</th>
                                                <th className="text-center px-2 py-2.5 text-green-400">W</th>
                                                <th className="text-center px-2 py-2.5 text-red-400">L</th>
                                                <th className="text-center px-2 py-2.5 text-yellow-400">+/-</th>
                                                <th className="text-center px-3 py-2.5 text-white">แต้ม</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {standings.map((p, i) => (
                                                <tr key={p.name} className={`hover:bg-white/5 transition-colors ${i < 2 ? "text-white" : "text-slate-400"}`}>
                                                    <td className="px-4 py-3">{i === 0 ? "🥇" : i === 1 ? "🥈" : <span className="text-slate-600">{i + 1}</span>}</td>
                                                    <td className="px-2 py-3 font-medium whitespace-nowrap">
                                                        {p.name}
                                                        {i < 2 && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-bold">ผ่านรอบ</span>}
                                                    </td>
                                                    <td className="px-2 py-3 text-center text-green-400 font-semibold">{p.won}</td>
                                                    <td className="px-2 py-3 text-center text-red-400 font-semibold">{p.lost}</td>
                                                    <td className={`px-2 py-3 text-center font-medium ${p.sumFor - p.sumAgainst >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                        {p.sumFor - p.sumAgainst >= 0 ? `+${p.sumFor - p.sumAgainst}` : p.sumFor - p.sumAgainst}
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-bold text-white">{p.pts}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Match list */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-2">
                                    <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${currentGroupDef.dot}`} />
                                        {currentGroupDef.label} — โปรแกรม
                                    </h3>
                                    <span className="text-[11px] text-slate-500 shrink-0">แตะเพื่อใส่คะแนน</span>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {groupMatches.map((m) => (
                                        <MatchRow key={m.id} match={m} onClick={() => setEditing(m)} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── BRACKET TAB ── */}
                {tab === "bracket" && (
                    <div className="space-y-5">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-white flex items-center gap-2"><span>🏆</span> รอบแพ้คัดออก</h3>
                                <span className="text-[11px] text-slate-500">คลิกแมตซ์ที่รอบแบ่งสายเพื่อเติมผล</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-6">อันดับ 1–2 ของแต่ละสายผ่านเข้ารอบโดยอัตโนมัติ</p>
                            <BracketView matches={matches} />
                        </div>

                        {/* KO Match list for score entry */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/8">
                                <h3 className="font-semibold text-white text-sm">โปรแกรมแมตซ์รอบแพ้คัดออก</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">คลิกแมตซ์เพื่อใส่คะแนน</p>
                            </div>
                            <div className="divide-y divide-white/5">
                                {[
                                    { label: "รอบรองชนะเลิศ", ids: ["SF1", "SF2"] },
                                    { label: "ชิงอันดับ 3", ids: ["3RD"] },
                                    { label: "รอบชิงชนะเลิศ", ids: ["F1"] },
                                ].map(({ label, ids }) => (
                                    <div key={label}>
                                        <p className="px-5 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-white/3">{label}</p>
                                        {ids.map((mid) => {
                                            const m = matches.find((x) => x.id === mid)!;
                                            return <MatchRow key={mid} match={m} onClick={() => setEditing(m)} />;
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="text-center text-xs text-slate-600 pb-4">
                    🏸 Badminton Club Management System · {new Date().getFullYear()}
                </div>
            </main>
        </div>
    );
}
