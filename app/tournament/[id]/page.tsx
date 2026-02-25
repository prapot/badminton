"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";
import Swal from "sweetalert2";


const STRAPI_BASE_URL =
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

type TournamentStatus = "upcoming" | "ongoing" | "completed";

interface RegisteredPlayer {
    id: number;
    username: string;
    email: string;
    tpDocumentId: string;   // documentId ของ tournament_player row (ใช้ DELETE)
    picture?: { url: string } | null;
}

interface TournamentInfo {
    name: string;
    tournament_status: TournamentStatus;
    type: string;
    format: string;
    players: RegisteredPlayer[];
}

// ── API Match types ──
interface ApiRanking {
    id: number;
    win: number;
    lose: number;
    win_streak: number;
    mmr: number;
}
interface ApiPlayer {
    id: number;
    username: string;
    picture?: { url: string } | null;
    ranking?: ApiRanking | null;
}
interface ApiTeam {
    id: number;
    documentId: string;
    team_no: string;
    team_players: Array<{ id: number; user_id: ApiPlayer | null }>;
}
interface ApiMatch {
    id: number;
    documentId: string;
    match_no: number;
    round: string | number;
    match_status: "upcoming" | "live" | "done";
    score_a: number;
    score_b: number;
    team_winner: string | null;
    team_a_id: ApiTeam | null;
    team_b_id: ApiTeam | null;
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
    const { user, jwt } = useAuth();
    const [apiMatches, setApiMatches] = useState<ApiMatch[]>([]);
    const [scoreEditing, setScoreEditing] = useState<ApiMatch | null>(null);
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [savingScore, setSavingScore] = useState(false);

    const fetchMatches = (token = jwt) => {
        if (!token || !id) return;
        fetch(
            `${STRAPI_BASE_URL}/api/matches?filters[tournament_id][documentId][$eq]=${id}&populate[team_a_id][populate][team_players][populate][user_id][populate][0]=ranking&populate[team_a_id][populate][team_players][populate][user_id][populate][1]=picture&populate[team_b_id][populate][team_players][populate][user_id][populate][0]=ranking&populate[team_b_id][populate][team_players][populate][user_id][populate][1]=picture&sort=match_no:asc`,
            { headers: { Authorization: `Bearer ${token}` } }
        )
            .then((r) => r.json())
            .then((json) => setApiMatches(json.data ?? []))
            .catch(() => { /* silent */ });
    };

    // Delete state
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    // Tournament info from API
    const [tournamentInfo, setTournamentInfo] = useState<TournamentInfo | null>(null);

    useEffect(() => {
        if (!jwt || !id) return;
        fetch(
            `${STRAPI_BASE_URL}/api/tournaments/${id}?populate[tournament_players][populate][user][populate][0]=picture`,
            { headers: { Authorization: `Bearer ${jwt}` } }
        )
            .then((r) => r.json())
            .then((json) => {
                const data = json.data ?? json;
                const tpArr: Array<{ documentId?: string; user?: Omit<RegisteredPlayer, "tpDocumentId"> }> = data.tournament_players ?? [];
                setTournamentInfo({
                    name: data.name ?? "",
                    tournament_status: data.tournament_status ?? "upcoming",
                    type: data.type ?? "single",
                    format: data.format ?? "round_robin",
                    players: tpArr
                        .filter((tp) => !!tp.user)
                        .map((tp) => ({ ...tp.user!, tpDocumentId: tp.documentId ?? "" })),
                });
            })
            .catch(() => { /* silent */ });
    }, [jwt, id]);

    // Auto-fetch matches when tournament is ongoing/completed
    useEffect(() => {
        if (tournamentInfo?.tournament_status === 'ongoing' || tournamentInfo?.tournament_status === 'completed') {
            fetchMatches();
        }
    }, [tournamentInfo?.tournament_status]);

    const refreshInfo = () => {
        if (!jwt || !id) return;
        fetch(
            `${STRAPI_BASE_URL}/api/tournaments/${id}?populate[tournament_players][populate][user][populate][0]=picture`,
            { headers: { Authorization: `Bearer ${jwt}` } }
        )
            .then((r) => r.json())
            .then((json) => {
                const data = json.data ?? json;
                const tpArr: Array<{ documentId?: string; user?: Omit<RegisteredPlayer, "tpDocumentId"> }> = data.tournament_players ?? [];
                setTournamentInfo((prev) => prev ? {
                    ...prev,
                    players: tpArr
                        .filter((tp) => !!tp.user)
                        .map((tp) => ({ ...tp.user!, tpDocumentId: tp.documentId ?? "" })),
                } : null);
            })
            .catch(() => { /* silent */ });
    };

    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);

    const isJoined = tournamentInfo?.players.some((p) => p.id === user?.id) ?? false;
    const myEntry = tournamentInfo?.players.find((p) => p.id === user?.id);

    const handleJoin = async () => {
        if (!jwt || !user || joining) return;
        setJoining(true);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournament-players`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ data: { tournament_id: id, user: user.id, seed: null } }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }
            showToast("เข้าร่วมสำเร็จ! 🏈", "success");
            refreshInfo();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "เข้าร่วมไม่สำเร็จ", "error");
        } finally {
            setJoining(false);
        }
    };

    const handleLeave = async () => {
        if (!jwt || !myEntry || leaving) return;
        setLeaving(true);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournament-players/${myEntry.tpDocumentId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${jwt}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }
            showToast("ออกจากรายการแล้ว", "success");
            refreshInfo();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "ออกไม่สำเร็จ", "error");
        } finally {
            setLeaving(false);
        }
    };

    // ── Draw Pairs ──
    // teamA/teamB = 1 player (singles) or 2 players (doubles)
    interface DrawnPair { teamA: RegisteredPlayer[]; teamB: RegisteredPlayer[] | null }
    const [drawnPairs, setDrawnPairs] = useState<DrawnPair[] | null>(null);
    const [starting, setStarting] = useState(false);

    const handleDraw = () => {
        const originalPlayers = [...(tournamentInfo?.players ?? [])];
        const isDouble = tournamentInfo?.type === "double";
        const matchSize = isDouble ? 4 : 2;

        if (originalPlayers.length === 0) {
            setDrawnPairs([]);
            return;
        }

        // Fisher–Yates shuffle original array
        const players = [...originalPlayers];
        for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }

        const pairs: DrawnPair[] = [];

        for (let i = 0; i < players.length; i += matchSize) {
            const matchPlayers = players.slice(i, i + matchSize);

            // If this is the last chunk and it's incomplete
            if (matchPlayers.length < matchSize) {
                const missingCount = matchSize - matchPlayers.length;
                // Candidates to fill are those NOT currently in matchPlayers
                const currentIds = new Set(matchPlayers.map(p => p.id));
                const candidates = originalPlayers.filter(p => !currentIds.has(p.id));

                // Shuffle candidates
                for (let c = candidates.length - 1; c > 0; c--) {
                    const j = Math.floor(Math.random() * (c + 1));
                    [candidates[c], candidates[j]] = [candidates[j], candidates[c]];
                }

                // Fill the missing slots from candidates
                for (let m = 0; m < missingCount; m++) {
                    if (candidates[m]) {
                        matchPlayers.push(candidates[m]);
                    }
                }
            }

            // Now matchPlayers has up to matchSize players
            if (isDouble) {
                pairs.push({
                    teamA: [matchPlayers[0], matchPlayers[1]].filter(Boolean),
                    teamB: matchPlayers.length > 2 ? [matchPlayers[2], matchPlayers[3]].filter(Boolean) : null
                });
            } else {
                pairs.push({
                    teamA: [matchPlayers[0]].filter(Boolean),
                    teamB: matchPlayers.length > 1 ? [matchPlayers[1]].filter(Boolean) : null
                });
            }
        }
        setDrawnPairs(pairs);
    };


    const [startStep, setStartStep] = useState<string | null>(null); // progress label

    const postJSON = async (url: string, body: unknown) => {
        const res = await fetch(`${STRAPI_BASE_URL}${url}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message || `HTTP ${res.status} on ${url}`);
        }
        return res.json();
    };

    const handleStartTournament = async () => {
        if (!jwt || !drawnPairs || starting) return;
        const result = await Swal.fire({
            title: "ยืนยันเริ่มการแข่งขัน?",
            html: `จะสร้าง <b>${drawnPairs.length} แมตซ์</b> และเปลี่ยนสถานะเป็น <b>กำลังแข่ง</b><br/><span style="color:#ef4444;font-size:12px">ไม่สามารถย้อนกลับได้</span>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "🏆 เริ่มเลย!",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#2ecc71",
            cancelButtonColor: "#64748b",
            background: "#1a2535",
            color: "#f1f5f9",
        });
        if (!result.isConfirmed) return;
        setStarting(true);

        const randTeamNo = () => Math.random().toString(36).substring(2, 10).toUpperCase();

        try {
            // ── Step 1: Create Teams ──────────────────────────────────
            setStartStep("สร้างทีม...");
            const teamIds: { teamA: string; teamB: string | null }[] = [];

            for (const pair of drawnPairs) {
                // Create teamA
                const resA = await postJSON("/api/teams", {
                    data: { tournament_id: id, team_no: randTeamNo() },
                });
                const teamAId: string = resA.data?.documentId ?? resA.data?.id;

                // Create teamB if exists
                let teamBId: string | null = null;
                if (pair.teamB) {
                    const resB = await postJSON("/api/teams", {
                        data: { tournament_id: id, team_no: randTeamNo() },
                    });
                    teamBId = resB.data?.documentId ?? resB.data?.id;
                }

                teamIds.push({ teamA: teamAId, teamB: teamBId });
            }

            // ── Step 2: Create Team Players ───────────────────────────
            setStartStep("บันทึกผู้เล่นในทีม...");
            for (let pairIdx = 0; pairIdx < drawnPairs.length; pairIdx++) {
                const pair = drawnPairs[pairIdx];
                const { teamA: teamAId, teamB: teamBId } = teamIds[pairIdx];

                for (const player of pair.teamA) {
                    await postJSON("/api/team-players", {
                        data: { team_id: teamAId, user_id: player.id },
                    });
                }
                if (pair.teamB && teamBId) {
                    for (const player of pair.teamB) {
                        await postJSON("/api/team-players", {
                            data: { team_id: teamBId, user_id: player.id },
                        });
                    }
                }
            }

            // ── Step 3: Create Matches ────────────────────────────────
            setStartStep("สร้างตารางแข่งขัน...");
            for (let i = 0; i < teamIds.length; i++) {
                const { teamA: teamAId, teamB: teamBId } = teamIds[i];
                await postJSON("/api/matches", {
                    data: {
                        tournament_id: id,
                        round: i + 1,
                        match_no: i + 1,
                        team_a_id: teamAId,
                        team_b_id: teamBId,
                        score_a: 0,
                        score_b: 0,
                        team_winner: null,
                        match_status: "upcoming",
                    },
                });
            }

            // ── Step 4: Update Tournament Status ─────────────────────
            setStartStep("เปิดการแข่งขัน...");
            const resTournament = await fetch(`${STRAPI_BASE_URL}/api/tournaments/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ data: { tournament_status: "ongoing" } }),
            });
            if (!resTournament.ok) {
                const err = await resTournament.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${resTournament.status}`);
            }

            showToast("เริ่มการแข่งขันแล้ว! 🏆", "success");
            setTournamentInfo((prev) => prev ? { ...prev, tournament_status: "ongoing" } : null);
            setDrawnPairs(null);
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "เริ่มไม่สำเร็จ", "error");
        } finally {
            setStarting(false);
            setStartStep(null);
        }
    };


    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleDelete = async () => {
        if (!jwt) return;
        setDeleting(true);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournaments/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${jwt}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }
            showToast("ลบทัวร์นาเมนต์สำเร็จ", "success");
            setTimeout(() => router.push("/tournament"), 1500);
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "ลบไม่สำเร็จ", "error");
            setDeleting(false);
        }
        setConfirmDelete(false);
    };

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

    const handleSaveScore = async () => {
        if (!jwt || !scoreEditing || savingScore) return;
        setSavingScore(true);
        try {
            const winnerTeamId = scoreA > scoreB
                ? scoreEditing.team_a_id?.documentId ?? null
                : scoreA < scoreB
                    ? scoreEditing.team_b_id?.documentId ?? null
                    : null;
            const res = await fetch(`${STRAPI_BASE_URL}/api/matches/${scoreEditing.documentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({
                    data: {
                        score_a: scoreA,
                        score_b: scoreB,
                        match_status: "done",
                        team_winner: winnerTeamId,
                    }
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }

            // Check if all matches (including this one just updated) are done
            const isLastMatch = apiMatches.filter(m => m.match_status !== "done" && m.id !== scoreEditing.id).length === 0;

            if (isLastMatch && tournamentInfo?.tournament_status !== "completed") {
                await fetch(`${STRAPI_BASE_URL}/api/tournaments/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                    body: JSON.stringify({ data: { tournament_status: "completed" } }),
                });
                setTournamentInfo(prev => prev ? { ...prev, tournament_status: "completed" } : null);
                showToast("บันทึกสำเร็จ และจบการแข่งขันทั้งหมดแล้ว! 🎉", "success");
            } else {
                showToast("บันทึกคะแนนสำเร็จ ✅", "success");
            }

            setScoreEditing(null);
            fetchMatches();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ", "error");
        } finally {
            setSavingScore(false);
        }
    };

    const pct = apiMatches.length > 0
        ? Math.round((apiMatches.filter(m => m.match_status === "done").length / apiMatches.length) * 100)
        : 0;
    const done = apiMatches.filter(m => m.match_status === "done").length;
    const total = apiMatches.length;

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />
            {/* Score Editor Modal */}
            {scoreEditing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setScoreEditing(null)} />
                    <div className="relative z-10 w-full max-w-md bg-gradient-to-b from-[#1a2535] to-[#0f1923] border border-white/10 rounded-3xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col gap-6" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="text-center space-y-1.5">
                            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2ecc71] to-[#3498db]">
                                บันทึกคะแนน
                            </h3>
                            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                                <span className="text-xs font-bold text-[#3498db]">แมตซ์ #{scoreEditing.match_no}</span>
                                <span className="text-[10px] text-slate-500">•</span>
                                <span className="text-xs font-semibold text-slate-300">{scoreEditing.round}</span>
                            </div>
                        </div>

                        {/* Score Inputs */}
                        <div className="flex items-center justify-between gap-4 bg-black/30 p-5 rounded-2xl border border-white/5">
                            {/* Team A */}
                            <div className="flex-1 flex flex-col gap-4 min-w-0 items-center justify-start">
                                <div className="flex flex-col gap-3 w-full">
                                    {scoreEditing.team_a_id?.team_players.map((tp, idx) => {
                                        const u = tp.user_id;
                                        if (!u) return null;
                                        const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                        return (
                                            <div key={idx} className="flex flex-col items-center gap-1.5 bg-black/20 p-2 rounded-xl border border-white/5">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 border-slate-700/50 flex items-center justify-center shadow-inner">
                                                    {pUrl ? <img src={pUrl} alt={u.username} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                                </div>
                                                <p className="font-bold text-xs sm:text-sm text-slate-200 truncate w-full text-center">{u.username}</p>
                                            </div>
                                        );
                                    })}
                                    {(!scoreEditing.team_a_id || scoreEditing.team_a_id.team_players.length === 0) && (
                                        <p className="text-xs font-bold text-slate-500 text-center">ทีม {scoreEditing.team_a_id?.team_no ?? "?"}</p>
                                    )}
                                </div>
                                <input type="number" min={0} value={scoreA} onChange={e => setScoreA(Math.max(0, +e.target.value))}
                                    className="w-full text-center text-5xl font-black bg-[#141f2e] border-2 border-white/10 rounded-2xl py-4 text-white focus:outline-none focus:border-[#2ecc71] focus:shadow-[0_0_20px_rgba(46,204,113,0.2)] transition-all font-mono" />
                                <div className="flex gap-2 justify-center w-full">
                                    <button onClick={() => setScoreA(15)} className="flex-1 py-1.5 bg-white/5 hover:bg-white/15 border border-white/5 rounded-lg text-xs font-bold text-slate-300 transition-colors">15</button>
                                    <button onClick={() => setScoreA(21)} className="flex-1 py-1.5 bg-white/5 hover:bg-white/15 border border-white/5 rounded-lg text-xs font-bold text-slate-300 transition-colors">21</button>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center shrink-0 w-6">
                                <span className="text-slate-600 font-black text-3xl mb-8">:</span>
                            </div>

                            {/* Team B */}
                            <div className="flex-1 flex flex-col gap-4 min-w-0 items-center justify-start">
                                <div className="flex flex-col gap-3 w-full">
                                    {scoreEditing.team_b_id?.team_players.map((tp, idx) => {
                                        const u = tp.user_id;
                                        if (!u) return null;
                                        const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                        return (
                                            <div key={idx} className="flex flex-col items-center gap-1.5 bg-black/20 p-2 rounded-xl border border-white/5">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 border-slate-700/50 flex items-center justify-center shadow-inner">
                                                    {pUrl ? <img src={pUrl} alt={u.username} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                                </div>
                                                <p className="font-bold text-xs sm:text-sm text-slate-200 truncate w-full text-center">{u.username}</p>
                                            </div>
                                        );
                                    })}
                                    {(!scoreEditing.team_b_id) && (
                                        <p className="text-xs font-bold text-slate-500 text-center">พักรอบ</p>
                                    )}
                                </div>
                                <input type="number" min={0} value={scoreB} onChange={e => setScoreB(Math.max(0, +e.target.value))}
                                    className="w-full text-center text-5xl font-black bg-[#141f2e] border-2 border-white/10 rounded-2xl py-4 text-white focus:outline-none focus:border-[#2ecc71] focus:shadow-[0_0_20px_rgba(46,204,113,0.2)] transition-all font-mono" />
                                <div className="flex gap-2 justify-center w-full">
                                    <button onClick={() => setScoreB(15)} className="flex-1 py-1.5 bg-white/5 hover:bg-white/15 border border-white/5 rounded-lg text-xs font-bold text-slate-300 transition-colors">15</button>
                                    <button onClick={() => setScoreB(21)} className="flex-1 py-1.5 bg-white/5 hover:bg-white/15 border border-white/5 rounded-lg text-xs font-bold text-slate-300 transition-colors">21</button>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setScoreEditing(null)}
                                className="flex-1 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-white font-bold transition-all text-sm">
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => {
                                    if (scoreA < 15 && scoreB < 15) {
                                        alert("คะแนนผู้ชนะต้องถึง 15 แต้มเป็นอย่างน้อย ตามกติกา!");
                                        return;
                                    }
                                    handleSaveScore();
                                }}
                                disabled={savingScore}
                                className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-[#2ecc71] to-[#27ae60] hover:from-[#3de382] hover:to-[#2ecc71] shadow-[0_4px_20px_rgba(46,204,113,0.3)] text-white font-bold transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                                {savingScore ? (
                                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>บันทึก...</>
                                ) : "✅ ยืนยันคะแนน"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-medium ${toast.type === "success"
                    ? "bg-[#0f2a1a] border-green-500/30 text-green-300"
                    : "bg-[#2a0f0f] border-red-500/30 text-red-300"
                    }`}>
                    <span>{toast.type === "success" ? "✅" : "⚠️"}</span> {toast.msg}
                </div>
            )}

            {/* Confirm Delete Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
                    <div className="relative z-10 w-full max-w-sm bg-[#141f2e] border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-xl shrink-0">🗑️</div>
                            <div>
                                <p className="text-white font-semibold">ยืนยันการลบ</p>
                                <p className="text-slate-400 text-xs mt-0.5">ไม่สามารถกู้คืนได้</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-300">คุณแน่ใจหรือไม่ว่าต้องการลบทัวร์นาเมนต์นี้? ข้อมูลทั้งหมดจะถูกลบอย่างถาวร</p>
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-sm font-semibold transition-all disabled:opacity-50"
                            >
                                {deleting ? "กำลังลบ..." : "🗑️ ลบทัวร์นาเมนต์"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <button onClick={() => router.push("/tournament")} className="mt-1 w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl font-bold text-white">
                                {tournamentInfo?.name || "โหลด..."}
                            </h1>
                            {tournamentInfo && (() => {
                                const cfg: Record<string, { label: string; cls: string }> = {
                                    ongoing: { label: "● กำลังแข่ง", cls: "bg-green-500/20 text-green-400 border-green-500/25 animate-pulse" },
                                    upcoming: { label: "รอเริ่ม", cls: "bg-blue-500/20 text-blue-400 border-blue-500/25" },
                                    completed: { label: "จบแล้ว", cls: "bg-white/8 text-slate-400 border-white/10" },
                                };
                                const s = cfg[tournamentInfo.tournament_status] ?? cfg.upcoming;
                                return (
                                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${s.cls}`}>
                                        {s.label}
                                    </span>
                                );
                            })()}
                        </div>

                        {/* Detail chips */}
                        {tournamentInfo && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                                    {tournamentInfo.type === "single" ? "🏸 เดี่ยว" : "👥 คู่"}
                                </span>
                                <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                                    {tournamentInfo.format === "round_robin" ? "🔄 พบกันหมด"
                                        : tournamentInfo.format === "knockout" ? "⚡ แพ้คัดออก"
                                            : "🌀 อเมริกาโน"}
                                </span>
                                <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                                    👥 {tournamentInfo.players.length} ผู้เล่น
                                </span>
                                <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400">
                                    🆔 {id}
                                </span>
                            </div>
                        )}

                        {/* Overall progress (show for ongoing only) */}
                        {tournamentInfo?.tournament_status === "ongoing" && (
                            <div className="mt-3 flex items-center gap-3">
                                <div className="flex-1 max-w-xs h-1.5 rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-[#2ecc71] to-[#27ae60] transition-all duration-500" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-slate-400">{done}/{total} แมตซ์ ({pct}%)</span>
                            </div>
                        )}
                    </div>

                    {/* Delete button */}
                    <button
                        onClick={() => setConfirmDelete(true)}
                        className="mt-1 shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-all"
                        title="ลบทัวร์นาเมนต์"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        ลบ
                    </button>
                </div>

                {/* ── UPCOMING: Players list + Draw Pairs ── */}
                {tournamentInfo?.tournament_status === "upcoming" && (
                    <>
                        {/* Players list */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-3">
                                <h2 className="font-semibold text-white flex items-center gap-2">
                                    <span>👥</span> ผู้เข้าร่วม
                                    <span className="text-xs text-slate-400 font-normal">{tournamentInfo.players.length} คน</span>
                                </h2>
                                {isJoined ? (
                                    <button onClick={handleLeave} disabled={leaving}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-all disabled:opacity-50">
                                        {leaving ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : "🚶 "}
                                        ออกจากรายการ
                                    </button>
                                ) : (
                                    <button onClick={handleJoin} disabled={joining}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-400 text-xs font-semibold transition-all disabled:opacity-50">
                                        {joining ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                                        เข้าร่วม
                                    </button>
                                )}
                            </div>
                            {tournamentInfo.players.length === 0 ? (
                                <div className="py-12 text-center text-slate-500">
                                    <p className="text-3xl mb-2">🏸</p>
                                    <p className="text-sm">ยังไม่มีผู้เข้าร่วม</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-white/5">
                                    {tournamentInfo.players.map((player, idx) => (
                                        <li key={player.id} className="flex items-center gap-4 px-5 py-3.5">
                                            <span className="w-6 text-center text-xs text-slate-600 shrink-0">{idx + 1}</span>
                                            {player.picture?.url ? (
                                                <div className="w-8 h-8 rounded-xl shrink-0 overflow-hidden border border-[#2ecc71]/40 shadow-sm shadow-green-900/20">
                                                    <img src={player.picture.url.startsWith("http") ? player.picture.url : `${STRAPI_BASE_URL}${player.picture.url}`} alt={player.username} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm shadow-green-900/20">
                                                    {player.username.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{player.username}</p>
                                                <p className="text-xs text-slate-500 truncate">{player.email}</p>
                                            </div>
                                            {player.id === user?.id && (
                                                <button onClick={handleLeave} disabled={leaving}
                                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 shrink-0 transition-all disabled:opacity-50">
                                                    ออก
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Draw Pairs Card */}
                        {tournamentInfo.players.length >= (tournamentInfo.type === "double" ? 4 : 2) && (
                            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-3">
                                    <h2 className="font-semibold text-white flex items-center gap-2">
                                        <span>🎲</span> สุ่มคู่แข่งขัน
                                    </h2>
                                    <button onClick={handleDraw}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/20 text-purple-300 text-xs font-semibold transition-all">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        {drawnPairs ? "สุ่มใหม่" : "สุ่มคู่"}
                                    </button>
                                </div>

                                {!drawnPairs ? (
                                    <div className="py-10 text-center text-slate-500">
                                        <p className="text-3xl mb-2">🎲</p>
                                        <p className="text-sm">กดปุ่ม &quot;สุ่มคู่&quot; เพื่อจับคู่ผู้เล่น</p>
                                        <p className="text-xs mt-1 text-slate-600">
                                            ผู้เล่น {tournamentInfo.players.length} คน → {Math.floor(tournamentInfo.players.length / 2)} คู่
                                            {tournamentInfo.players.length % 2 !== 0 ? " + 1 คนที่พักรอ" : ""}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {drawnPairs.map((pair, idx) => (
                                            <div key={idx} className="flex items-center px-5 py-4 gap-4">
                                                <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">{idx + 1}</span>

                                                {/* Team A */}
                                                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                    {pair.teamA.map((p) => {
                                                        const pUrl = p.picture?.url ? (p.picture.url.startsWith("http") ? p.picture.url : `${STRAPI_BASE_URL}${p.picture.url}`) : null;
                                                        return (
                                                            <div key={p.id} className="flex items-center gap-2 min-w-0">
                                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-[10px] shrink-0 overflow-hidden border border-[#2ecc71]/40">
                                                                    {pUrl ? <img src={pUrl} alt={p.username} className="w-full h-full object-cover" /> : p.username.charAt(0).toUpperCase()}
                                                                </div>
                                                                <p className="text-sm font-semibold text-white truncate">{p.username}</p>
                                                                {p.id === user?.id && <span className="text-[10px] text-green-400 shrink-0">คุณ</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <span className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] font-bold text-slate-500 shrink-0">VS</span>

                                                {/* Team B */}
                                                {pair.teamB ? (
                                                    <div className="flex flex-col gap-1.5 flex-1 min-w-0 items-end">
                                                        {pair.teamB.map((p) => {
                                                            const pUrl = p.picture?.url ? (p.picture.url.startsWith("http") ? p.picture.url : `${STRAPI_BASE_URL}${p.picture.url}`) : null;
                                                            return (
                                                                <div key={p.id} className="flex items-center gap-2 min-w-0">
                                                                    {p.id === user?.id && <span className="text-[10px] text-green-400 shrink-0">คุณ</span>}
                                                                    <p className="text-sm font-semibold text-white truncate text-right">{p.username}</p>
                                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-[10px] shrink-0 overflow-hidden border border-[#3498db]/40">
                                                                        {pUrl ? <img src={pUrl} alt={p.username} className="w-full h-full object-cover" /> : p.username.charAt(0).toUpperCase()}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex items-center justify-end">
                                                        <span className="text-xs text-slate-600 italic">พักรอบ</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {/* Start tournament */}
                                        <div className="px-5 py-4 bg-white/3 space-y-2">
                                            {/* Step progress */}
                                            {starting && startStep && (
                                                <div className="flex items-center gap-2 text-xs text-slate-400 justify-center">
                                                    <svg className="animate-spin w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    <span>⏳ {startStep}</span>
                                                </div>
                                            )}
                                            <button onClick={handleStartTournament} disabled={starting}
                                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#2ecc71] to-[#27ae60] hover:from-[#3de382] hover:to-[#2ecc71] text-white font-semibold text-sm transition-all shadow-lg shadow-green-900/30 disabled:opacity-60">
                                                {starting
                                                    ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>กำลังดำเนินการ...</>
                                                    : "🏆 เริ่มการแข่งขัน"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}


                {/* ── MATCH SCHEDULE (ongoing/completed) ── */}
                {(tournamentInfo?.tournament_status === "ongoing" || tournamentInfo?.tournament_status === "completed") && (
                    <div className="bg-gradient-to-br from-[#1a2535] to-[#0f1923] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

                        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between gap-3 relative z-10 bg-white/5">
                            <h2 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 flex items-center gap-2.5 text-lg cursor-default">
                                <span className="p-2 bg-gradient-to-br from-[#3498db] to-[#2980b9] rounded-xl shadow-lg shadow-blue-900/20 text-white shrink-0">📋</span>
                                ตารางการแข่งขัน
                            </h2>
                            <button onClick={() => fetchMatches()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="hidden sm:inline">รีเฟรช</span>
                            </button>
                        </div>

                        {apiMatches.length === 0 ? (
                            <div className="py-16 text-center text-slate-500 relative z-10">
                                <p className="text-5xl mb-3 opacity-50">🏟️</p>
                                <p className="text-sm font-medium">ยังไม่มีข้อมูลแมตซ์การแข่งขัน</p>
                            </div>
                        ) : (
                            <div className="p-4 sm:p-6 space-y-6 relative z-10">
                                {/* Group by round */}
                                {Array.from(new Set(apiMatches.map(m => m.round))).map(round => (
                                    <div key={round} className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent flex-1" />
                                            <span className="px-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                                                {round}
                                            </span>
                                            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent flex-1" />
                                        </div>

                                        <div className="grid gap-3">
                                            {apiMatches.filter(m => m.round === round).map(match => {
                                                const teamAName = match.team_a_id?.team_players.map(tp => tp.user_id?.username).filter(Boolean).join(" / ") || `ทีม ${match.team_a_id?.team_no ?? "?"}`;
                                                const teamBName = match.team_b_id
                                                    ? match.team_b_id.team_players.map(tp => tp.user_id?.username).filter(Boolean).join(" / ") || `ทีม ${match.team_b_id.team_no}`
                                                    : "พักรอบ";
                                                const isCompleted = match.match_status === "done";
                                                const winnerA = isCompleted && match.score_a > match.score_b;
                                                const winnerB = isCompleted && match.score_b > match.score_a;

                                                return (
                                                    <div key={match.id}
                                                        className={`group relative overflow-hidden bg-black/20 border border-white/5 rounded-2xl p-4 transition-all duration-300 ${tournamentInfo.tournament_status === "ongoing" && !isCompleted ? "hover:bg-black/40 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer" : ""}`}
                                                        onClick={() => {
                                                            if (tournamentInfo.tournament_status !== "ongoing" || isCompleted) return;
                                                            setScoreEditing(match);
                                                            setScoreA(match.score_a ?? 0);
                                                            setScoreB(match.score_b ?? 0);
                                                        }}>

                                                        {/* Status Badge */}
                                                        <div className="absolute top-3 left-4">
                                                            <span className="text-[10px] font-bold text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                                                                แมตซ์ #{match.match_no}
                                                            </span>
                                                        </div>
                                                        <div className="absolute top-3 right-4">
                                                            {isCompleted ? (
                                                                <span className="text-[10px] px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-bold shadow-[0_0_10px_rgba(46,204,113,0.15)] flex items-center gap-1">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                    จบเต็มเวลา
                                                                </span>
                                                            ) : tournamentInfo.tournament_status === "ongoing" ? (
                                                                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#3498db]/20 text-[#3498db] border border-[#3498db]/30 font-bold animate-pulse flex items-center gap-1">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#3498db]" />
                                                                    กำลังแข่ง
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        <div className="mt-6 flex items-center justify-between gap-4">
                                                            {/* Team A */}
                                                            <div className={`flex-1 min-w-0 transition-colors ${winnerA ? "text-green-400" : isCompleted && !winnerA ? "text-slate-500" : "text-white"}`}>
                                                                <div className="flex flex-col gap-3 justify-center h-full">
                                                                    {match.team_a_id?.team_players.map((tp, idx) => {
                                                                        const u = tp.user_id;
                                                                        if (!u) return null;
                                                                        const rank = u.ranking;
                                                                        const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                                                        return (
                                                                            <div key={idx} className="flex items-center justify-end gap-3">
                                                                                <div className="flex flex-col items-end min-w-0">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        {winnerA && idx === 0 && <span className="text-[9px] font-black uppercase tracking-wider text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-md">Winner</span>}
                                                                                        <p className="font-bold text-sm sm:text-base truncate">{u.username}</p>
                                                                                    </div>
                                                                                    {/* Stats */}
                                                                                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-400 mt-1 font-medium bg-black/20 px-2 py-0.5 rounded border border-white/5">
                                                                                        <span className="text-yellow-500 font-bold">MMR: {rank ? rank.mmr : "-"}</span>
                                                                                        <span className="text-slate-600">|</span>
                                                                                        <span className="text-green-400">W: {rank ? rank.win : "-"}</span>
                                                                                        <span className="text-red-400">L: {rank ? rank.lose : "-"}</span>
                                                                                        <span className="text-slate-600">|</span>
                                                                                        <span className="text-orange-400 font-bold">🔥 {rank ? rank.win_streak : "-"}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 border-slate-700/50 flex items-center justify-center shadow-inner">
                                                                                    {pUrl ? <img src={pUrl} alt={u.username} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {(!match.team_a_id || match.team_a_id.team_players.length === 0) && (
                                                                        <div className="text-right"><p className="font-bold text-sm text-slate-500">ทีม {match.team_a_id?.team_no ?? "?"}</p></div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Score / VS */}
                                                            <div className="shrink-0 group-hover:scale-105 transition-transform flex flex-col items-center justify-center self-stretch">
                                                                {isCompleted ? (
                                                                    <div className="flex items-center gap-3 bg-[#0f1923] px-4 py-3 rounded-2xl border border-white/10 shadow-inner">
                                                                        <span className={`text-2xl sm:text-3xl font-black ${winnerA ? "text-green-400" : "text-white"}`}>{match.score_a}</span>
                                                                        <span className="text-slate-600 font-bold text-xl">:</span>
                                                                        <span className={`text-2xl sm:text-3xl font-black ${winnerB ? "text-green-400" : "text-white"}`}>{match.score_b}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/30 border-4 border-[#1a2535]">
                                                                        <span className="text-white text-sm sm:text-base font-black italic">VS</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Team B */}
                                                            <div className={`flex-1 min-w-0 transition-colors ${winnerB ? "text-green-400" : isCompleted && !winnerB ? "text-slate-500" : "text-white"}`}>
                                                                <div className="flex flex-col gap-3 justify-center h-full">
                                                                    {match.team_b_id?.team_players.map((tp, idx) => {
                                                                        const u = tp.user_id;
                                                                        if (!u) return null;
                                                                        const rank = u.ranking;
                                                                        const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                                                        return (
                                                                            <div key={idx} className="flex items-center justify-start gap-3">
                                                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 border-slate-700/50 flex items-center justify-center shadow-inner">
                                                                                    {pUrl ? <img src={pUrl} alt={u.username} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                                                                </div>
                                                                                <div className="flex flex-col items-start min-w-0">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <p className="font-bold text-sm sm:text-base truncate">{u.username}</p>
                                                                                        {winnerB && idx === 0 && <span className="text-[9px] font-black uppercase tracking-wider text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-md">Winner</span>}
                                                                                    </div>
                                                                                    {/* Stats */}
                                                                                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-400 mt-1 font-medium bg-black/20 px-2 py-0.5 rounded border border-white/5">
                                                                                        <span className="text-yellow-500 font-bold">MMR: {rank ? rank.mmr : "-"}</span>
                                                                                        <span className="text-slate-600">|</span>
                                                                                        <span className="text-green-400">W: {rank ? rank.win : "-"}</span>
                                                                                        <span className="text-red-400">L: {rank ? rank.lose : "-"}</span>
                                                                                        <span className="text-slate-600">|</span>
                                                                                        <span className="text-orange-400 font-bold">🔥 {rank ? rank.win_streak : "-"}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {(!match.team_b_id) && (
                                                                        <div className="text-left"><p className="font-bold text-sm text-slate-500">พักรอบ</p></div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {tournamentInfo.tournament_status === "ongoing" && !isCompleted && (
                                                            <div className="mt-4 text-center">
                                                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 group-hover:text-[#3498db] transition-colors border border-transparent group-hover:border-[#3498db]/20 bg-transparent group-hover:bg-[#3498db]/10 px-2 py-0.5 rounded-full">
                                                                    ✍️ คลิกเพื่อบันทึกคะแนน
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="text-center text-xs text-slate-600 pb-4">
                    🏸 Badminton Club Management System · {new Date().getFullYear()}
                </div>
            </main>
        </div>
    );
}

