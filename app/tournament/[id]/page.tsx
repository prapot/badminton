"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";
import Swal from "sweetalert2";
import { QRCodeCanvas } from "qrcode.react";


const STRAPI_BASE_URL =
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

const GRADIENT_ANIMATION_STYLE = `
  @keyframes gradient-x {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  .animate-gradient-x {
    background-size: 200% auto;
    animation: gradient-x 3s linear infinite;
  }
`;


type TournamentStatus = "upcoming" | "ongoing" | "completed";

interface RegisteredPlayer {
    id: number;
    username: string;
    email: string;
    tpDocumentId: string;   // documentId ของ tournament_player row (ใช้ DELETE)
    picture?: { url: string } | null;
    ranking?: ApiRanking | null;
}

interface TournamentInfo {
    name: string;
    tournament_status: TournamentStatus;
    type: string;
    format: string;
    startDate: string;
    mode: "ranking" | "casual";
    players: RegisteredPlayer[];
    user_created?: { id: number; username?: string } | null;
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
interface ApiMatchHistory {
    id: number;
    mmr_change: number;
    users: ApiPlayer[];
}
interface ApiMatch {
    id: number;
    documentId: string;
    match_no: number;
    round: string | number;
    match_status: "upcoming" | "live" | "done" | "cancelled";
    score_a: number;
    score_b: number;
    team_winner: string | null;
    team_a_id: ApiTeam | null;
    team_b_id: ApiTeam | null;
    match_histories?: ApiMatchHistory[];
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

function calculateExpectedMmrChange(teamAMmr: number | null, teamBMmr: number | null): { aWins: number, aLoses: number, bWins: number, bLoses: number } {
    const defaultMmr = 1500;
    const aMmr = teamAMmr ?? defaultMmr;
    const bMmr = teamBMmr ?? defaultMmr;
    const K = 32;

    // Expected probabilities
    const expectedAWins = 1 / (1 + Math.pow(10, (bMmr - aMmr) / 400));
    const expectedBWins = 1 / (1 + Math.pow(10, (aMmr - bMmr) / 400));

    // MoV multiplier for a hypothetical 21-20 score (diff of 1)
    const movMultiplier = Math.log(2);

    const aWinChange = Math.round(K * movMultiplier * (1 - expectedAWins));
    const aLoseChange = Math.round(K * movMultiplier * (1 - expectedBWins)); // If A loses, it means B wins, so the change is based on B's expected win probability

    const bWinChange = Math.round(K * movMultiplier * (1 - expectedBWins));
    const bLoseChange = Math.round(K * movMultiplier * (1 - expectedAWins));

    return { aWins: aWinChange, aLoses: aLoseChange, bWins: bWinChange, bLoses: bLoseChange };
}

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

function lcm(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / gcd(a, b);
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
    const [showScoreEdit, setShowScoreEdit] = useState(false);
    const [courtInput, setCourtInput] = useState("");
    const [timeInput, setTimeInput] = useState("");

    const [showQR, setShowQR] = useState(false);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const shareUrl = `${appUrl}/tournament/${id}`;

    const fetchMatches = (token = jwt) => {
        if (!token || !id) return;
        fetch(
            `${STRAPI_BASE_URL}/api/matches?filters[tournament_id][documentId][$eq]=${id}&populate[team_a_id][populate][team_players][populate][user_id][populate][0]=ranking&populate[team_a_id][populate][team_players][populate][user_id][populate][1]=picture&populate[team_b_id][populate][team_players][populate][user_id][populate][0]=ranking&populate[team_b_id][populate][team_players][populate][user_id][populate][1]=picture&populate[match_histories][populate][users][fields]=*&sort=match_no:asc`,
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
            `${STRAPI_BASE_URL}/api/tournaments/${id}?populate[tournament_players][populate][user][populate][0]=picture&populate[tournament_players][populate][user][populate][1]=ranking&populate[user_created][populate][0]=picture&populate[user_created][populate][1]=ranking`,
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
                    startDate: data.startDate ?? "",
                    mode: data.mode ?? "ranking",
                    players: tpArr
                        .filter((tp) => !!tp.user)
                        .map((tp) => ({ ...tp.user!, tpDocumentId: tp.documentId ?? "" })),
                    user_created: data.user_created || data.user_id,
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
            `${STRAPI_BASE_URL}/api/tournaments/${id}?populate[tournament_players][populate][user][populate][0]=picture&populate[tournament_players][populate][user][populate][1]=ranking&populate[user_created][populate][0]=picture&populate[user_created][populate][1]=ranking`,
            { headers: { Authorization: `Bearer ${jwt}` } }
        )
            .then((r) => r.json())
            .then((json) => {
                const data = json.data ?? json;
                const tpArr: Array<{ documentId?: string; user?: Omit<RegisteredPlayer, "tpDocumentId"> }> = data.tournament_players ?? [];
                setTournamentInfo((prev) => prev ? {
                    ...prev,
                    startDate: data.startDate ?? prev.startDate,
                    mode: data.mode ?? prev.mode,
                    players: tpArr
                        .filter((tp) => !!tp.user)
                        .map((tp) => ({ ...tp.user!, tpDocumentId: tp.documentId ?? "" })),
                    user_created: data.user_created || data.user_id,
                } : null);
            })
            .catch(() => { /* silent */ });
    };

    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);

    const isJoined = tournamentInfo?.players.some((p) => p.id === user?.id) ?? false;
    const myEntry = tournamentInfo?.players.find((p) => p.id === user?.id);

    const handleJoin = async () => {
        if (!jwt || !user || joining || tournamentInfo?.tournament_status !== "upcoming") return;
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
        if (!jwt || !myEntry || leaving || tournamentInfo?.tournament_status !== "upcoming") return;
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
    const [drawMode, setDrawMode] = useState<"random" | "mmr_balanced">("random");
    const [roundsPerPlayer, setRoundsPerPlayer] = useState(1);
    const [starting, setStarting] = useState(false);

    const handleDraw = () => {
        handleDrawFair();
    };

    const handleDrawFair = () => {
        const players = [...(tournamentInfo?.players ?? [])];
        const isDouble = tournamentInfo?.type === "double";
        const playersPerMatch = isDouble ? 4 : 2;

        if (players.length < playersPerMatch) {
            setDrawnPairs([]);
            return;
        }

        const totalSlotsNeeded = lcm(players.length, playersPerMatch);
        const minRounds = totalSlotsNeeded / players.length;
        const actualRounds = minRounds * (roundsPerPlayer || 1);

        let attempts = 0;
        while (attempts < 100) {
            attempts++;
            let pool: RegisteredPlayer[] = [];
            for (let r = 0; r < actualRounds; r++) {
                pool = [...pool, ...players];
            }

            // Shuffle or sort pool based on mode
            if (drawMode === "mmr_balanced") {
                // Sort by MMR desc with small jitter to prevent deadlocks and vary matches
                pool.sort((a, b) => {
                    const jitterA = Math.random() * 2 - 1;
                    const jitterB = Math.random() * 2 - 1;
                    return ((b.ranking?.mmr ?? 1500) + jitterB) - ((a.ranking?.mmr ?? 1500) + jitterA);
                });
            } else {
                // Shuffle pool randomly
                for (let i = pool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pool[i], pool[j]] = [pool[j], pool[i]];
                }
            }

            const pairs: DrawnPair[] = [];
            let possible = true;

            // Generate matches
            if (drawMode === "mmr_balanced") {
                const used = new Set<number>();
                for (let i = 0; i < pool.length; i++) {
                    if (used.has(i)) continue;

                    let chunk: RegisteredPlayer[] = [pool[i]];
                    used.add(i);

                    const slotsNeeded = playersPerMatch - 1;
                    for (let s = 0; s < slotsNeeded; s++) {
                        let found = false;
                        // For doubles balance (Top1, Top2, Low1, Low2)
                        // Slot 0 (player 2) should be another Top player for snake draft
                        const lookFromTop = isDouble && s === 0;

                        const start = lookFromTop ? 0 : pool.length - 1;
                        const end = lookFromTop ? pool.length - 1 : 0;
                        const step = lookFromTop ? 1 : -1;

                        for (let k = start; lookFromTop ? k <= end : k >= end; k += step) {
                            if (!used.has(k) && !chunk.some(p => p.id === pool[k].id)) {
                                chunk.push(pool[k]);
                                used.add(k);
                                found = true;
                                break;
                            }
                        }
                        if (!found) { possible = false; break; }
                    }
                    if (!possible) break;

                    if (isDouble) {
                        // Team A: Top 1 + Low 2 | Team B: Top 2 + Low 1
                        pairs.push({ teamA: [chunk[0], chunk[3]].filter(Boolean), teamB: [chunk[1], chunk[2]].filter(Boolean) });
                    } else {
                        // Top 1 vs Low 1
                        pairs.push({ teamA: [chunk[0]].filter(Boolean), teamB: [chunk[1]].filter(Boolean) });
                    }
                }
            } else {
                // Random grouping
                for (let i = 0; i < pool.length; i += playersPerMatch) {
                    const chunk = pool.slice(i, i + playersPerMatch);
                    const seen = new Set<number>();
                    let matchConflict = false;

                    for (let j = 0; j < chunk.length; j++) {
                        if (seen.has(chunk[j].id)) {
                            let swapped = false;
                            for (let k = i + j + 1; k < pool.length; k++) {
                                if (!seen.has(pool[k].id)) {
                                    [pool[i + j], pool[k]] = [pool[k], pool[i + j]];
                                    chunk[j] = pool[i + j];
                                    seen.add(chunk[j].id);
                                    swapped = true;
                                    break;
                                }
                            }
                            if (!swapped) { matchConflict = true; break; }
                        } else {
                            seen.add(chunk[j].id);
                        }
                    }
                    if (matchConflict) { possible = false; break; }

                    if (isDouble) {
                        pairs.push({ teamA: [chunk[0], chunk[1]].filter(Boolean), teamB: chunk.length > 2 ? [chunk[2], chunk[3]].filter(Boolean) : null });
                    } else {
                        pairs.push({ teamA: [chunk[0]].filter(Boolean), teamB: chunk.length > 1 ? [chunk[1]].filter(Boolean) : null });
                    }
                }
            }

            if (possible) {
                setDrawnPairs(pairs);
                return;
            }
        }

        showToast("ไม่สามารถจัดตารางที่สมบูรณ์ได้ (ลองกดอีกครั้ง)", "error");
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
                const isBye = !teamBId;
                await postJSON("/api/matches", {
                    data: {
                        tournament_id: id,
                        round: i + 1,
                        match_no: i + 1,
                        team_a_id: teamAId,
                        team_b_id: teamBId,
                        score_a: isBye ? 1 : 0,
                        score_b: 0,
                        team_winner: isBye ? teamAId : null,
                        match_status: isBye ? "done" : "upcoming",
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

    const handleCancelMatch = async () => {
        if (!jwt || !scoreEditing || savingScore) return;

        const result = await Swal.fire({
            title: "ยืนยันการยกเลิกแมตซ์?",
            text: "หากยกเลิกแล้ว แมตซ์นี้จะไม่ถูกนำมาคำนวณคะแนนและไม่สามารถกู้คืนได้ (ต้องสุ่มใหม่)",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "🚫 ยืนยันยกเลิก",
            cancelButtonText: "ย้อนกลับ",
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#64748b",
            background: "#1a2535",
            color: "#f1f5f9",
        });

        if (!result.isConfirmed) return;

        setSavingScore(true);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/matches/${scoreEditing.documentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({
                    data: {
                        match_status: "cancelled",
                    }
                }),
            });
            if (!res.ok) throw new Error("ยกเลิกแมตซ์ไม่สำเร็จ");

            showToast("ยกเลิกแมตซ์เรียบร้อย 🚫", "success");
            setScoreEditing(null);
            fetchMatches();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : "ยกเลิกไม่สำเร็จ", "error");
        } finally {
            setSavingScore(false);
        }
    };

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

            // Record match for ranking update (ranking mode only)
            if (tournamentInfo?.mode === "ranking") {
                const wasAlreadyDone = scoreEditing.match_status === "done";

                try {
                    // 1. If it was already done, revert the previous stats first
                    if (wasAlreadyDone) {
                        await fetch(`${STRAPI_BASE_URL}/api/rankings/revert-match`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                            body: JSON.stringify({
                                data: {
                                    match_id: scoreEditing.documentId,
                                }
                            }),
                        });
                    }

                    // 2. Record the NEW stats (regardless of whether it was new or edited)
                    const isTeamAWinner = scoreA > scoreB;
                    const isTeamBWinner = scoreB > scoreA;

                    let winners: number[] = [];
                    let losers: number[] = [];

                    if (isTeamAWinner) {
                        winners = scoreEditing.team_a_id?.team_players.map(tp => tp.user_id?.id).filter((id): id is number => id !== undefined) || [];
                        losers = scoreEditing.team_b_id?.team_players.map(tp => tp.user_id?.id).filter((id): id is number => id !== undefined) || [];
                    } else if (isTeamBWinner) {
                        winners = scoreEditing.team_b_id?.team_players.map(tp => tp.user_id?.id).filter((id): id is number => id !== undefined) || [];
                        losers = scoreEditing.team_a_id?.team_players.map(tp => tp.user_id?.id).filter((id): id is number => id !== undefined) || [];
                    }

                    if (winners.length > 0 && losers.length > 0) {
                        await fetch(`${STRAPI_BASE_URL}/api/rankings/record-match`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
                            body: JSON.stringify({
                                data: {
                                    winners,
                                    losers,
                                    winner_score: isTeamAWinner ? scoreA : scoreB,
                                    loser_score: isTeamAWinner ? scoreB : scoreA,
                                    match_id: scoreEditing.documentId,
                                }
                            }),
                        });
                    }

                    showToast(wasAlreadyDone ? "แก้ไขและอัปเดตอันดับเรียบร้อย ✨" : "บันทึกผลการแข่งเรียบร้อย ✅", "success");
                } catch (err) {
                    console.error("Failed to sync ranking", err);
                    showToast("บันทึกสำเร็จแต่การอัปเดตอันดับขัดข้อง", "error");
                }
            } else {
                showToast("บันทึกผลการแข่งเรียบร้อย ✅", "success");
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

    const totalEffectiveMatches = apiMatches.filter(m => m.match_status !== "cancelled").length;
    const pct = totalEffectiveMatches > 0
        ? Math.round((apiMatches.filter(m => m.match_status === "done").length / totalEffectiveMatches) * 100)
        : 0;
    const done = apiMatches.filter(m => m.match_status === "done").length;
    const total = totalEffectiveMatches;
    const cancelled = apiMatches.filter(m => m.match_status === "cancelled").length;

    return (
        <div className="min-h-screen bg-[#0f1923] text-slate-100 font-sans selection:bg-[#2ecc71]/30">
            <style dangerouslySetInnerHTML={{ __html: GRADIENT_ANIMATION_STYLE }} />
            <Navbar />
            {/* Score Editor Modal */}
            {scoreEditing && (
                <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-md">
                    <div className="absolute inset-0" onClick={() => setScoreEditing(null)} />
                    <div className="relative z-10 w-full max-w-2xl bg-gradient-to-b from-[#1a2535] to-[#0f1923] border border-white/10 rounded-[2.5rem] p-6 sm:p-10 my-auto shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col gap-8" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="text-center space-y-3">
                            <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2ecc71] via-[#3498db] to-[#2ecc71] animate-gradient-x p-1">
                                {scoreEditing.match_status === "done" ? "แก้ไขผลการแข่งขัน" : "บันทึกผลการแข่งขัน"}
                            </h3>
                            <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
                                <span className="text-xs font-black tracking-widest text-[#3498db]">แมตซ์ #{scoreEditing.match_no}</span>
                                {/* <span className="text-slate-700">•</span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{scoreEditing.round}</span> */}
                            </div>
                        </div>

                        {/* Score Inputs Area */}
                        <div className="flex flex-col sm:grid sm:grid-cols-[1fr,auto,1fr] items-stretch sm:items-center gap-6 sm:gap-10 bg-black/40 p-6 sm:p-10 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            {/* Team A */}
                            <div className="flex-1 flex flex-col gap-6 items-center">
                                <div className="flex flex-col gap-3 w-full">
                                    {(scoreEditing.team_a_id?.team_players || []).map((tp, idx) => {
                                        const u = tp.user_id;
                                        if (!u) return null;
                                        const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                        return (
                                            <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                                <div className="w-12 h-12 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 border-[#2ecc71]/30 flex items-center justify-center shadow-lg">
                                                    {pUrl ? <img src={pUrl} alt={u.username} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm text-white truncate">{u.username}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">TEAM {scoreEditing.team_a_id?.team_no}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!scoreEditing.team_a_id || scoreEditing.team_a_id.team_players.length === 0) && (
                                        <div className="h-14 flex items-center justify-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                                            <p className="text-xs font-bold text-slate-500 italic">ทีม {scoreEditing.team_a_id?.team_no ?? "?"}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full space-y-4">
                                    <div className="relative group/input flex items-center">
                                        <button
                                            onClick={() => setScoreA(prev => Math.max(0, prev - 1))}
                                            className="absolute left-2 w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 hover:text-red-400 border border-white/10 flex items-center justify-center text-2xl font-black transition-all active:scale-90"
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            className="w-full text-center text-6xl font-black bg-[#0f1923] border-4 border-white/10 rounded-3xl py-6 text-white focus:outline-none focus:border-[#2ecc71] focus:ring-4 focus:ring-[#2ecc71]/10 transition-all font-mono shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={scoreA}
                                            onChange={e => setScoreA(Math.max(0, +e.target.value))}
                                            onFocus={e => e.target.select()}
                                            inputMode="numeric"
                                        />
                                        <button
                                            onClick={() => setScoreA(prev => prev + 1)}
                                            className="absolute right-2 w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 hover:text-[#2ecc71] border border-white/10 flex items-center justify-center text-2xl font-black transition-all active:scale-90"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setScoreA(15)} className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-slate-400 hover:text-[#2ecc71] transition-all">SCORE 15</button>
                                        <button onClick={() => setScoreA(21)} className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-slate-400 hover:text-[#2ecc71] transition-all">SCORE 21</button>
                                    </div>
                                </div>
                            </div>

                            {/* <div className="flex flex-col items-center justify-center shrink-0 w-8 sm:w-auto h-px sm:h-auto bg-white/10 sm:bg-transparent">
                                <span className="hidden sm:block text-slate-700 font-black text-4xl mb-24 opacity-50">:</span>
                            </div> */}
                            <hr></hr>

                            {/* Team B */}
                            <div className="flex-1 flex flex-col gap-6 items-center">
                                <div className="flex flex-col gap-3 w-full">
                                    {(scoreEditing.team_b_id?.team_players || []).map((tp, idx) => {
                                        const u = tp.user_id;
                                        if (!u) return null;
                                        const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                        return (
                                            <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                                <div className="w-12 h-12 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 border-[#3498db]/30 flex items-center justify-center shadow-lg">
                                                    {pUrl ? <img src={pUrl} alt={u.username} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm text-white truncate">{u.username}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">TEAM {scoreEditing.team_b_id?.team_no}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!scoreEditing.team_b_id) && (
                                        <div className="h-14 flex items-center justify-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                                            <p className="text-xs font-bold text-slate-500 italic">พักรอบ</p>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full space-y-4">
                                    <div className="relative group/input flex items-center">
                                        <button
                                            onClick={() => setScoreB(prev => Math.max(0, prev - 1))}
                                            className="absolute left-2 w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 hover:text-red-400 border border-white/10 flex items-center justify-center text-2xl font-black transition-all active:scale-90"
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            className="w-full text-center text-6xl font-black bg-[#0f1923] border-4 border-white/10 rounded-3xl py-6 text-white focus:outline-none focus:border-[#3498db] focus:ring-4 focus:ring-[#3498db]/10 transition-all font-mono shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={scoreB}
                                            onChange={e => setScoreB(Math.max(0, +e.target.value))}
                                            onFocus={e => e.target.select()}
                                            inputMode="numeric"
                                        />
                                        <button
                                            onClick={() => setScoreB(prev => prev + 1)}
                                            className="absolute right-2 w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 hover:text-[#3498db] border border-white/10 flex items-center justify-center text-2xl font-black transition-all active:scale-90"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setScoreB(15)} className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-slate-400 hover:text-[#3498db] transition-all">SCORE 15</button>
                                        <button onClick={() => setScoreB(21)} className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-slate-400 hover:text-[#3498db] transition-all">SCORE 21</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 pt-2">
                            {scoreEditing.match_status === "done" && tournamentInfo?.mode === "ranking" && (
                                <p className="text-[10px] text-orange-400/70 text-center font-medium italic mb-1">
                                    ⚠️ การแก้ไขผลคะแนนที่จบไปแล้วในโหมด Ranking อาจทำให้สถิติ MMR ไม่ตรงตามความเป็นจริง
                                </p>
                            )}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button onClick={() => setScoreEditing(null)}
                                    className="flex-1 py-4 sm:py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 font-bold transition-all text-sm uppercase tracking-widest order-2 sm:order-1">
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={() => {
                                        if (scoreA < 15 && scoreB < 15) {
                                            Swal.fire({
                                                title: 'คะแนนไม่ถูกต้อง',
                                                text: 'คะแนนผู้ชนะต้องถึง 15 แต้มเป็นอย่างน้อย ตามกติกา!',
                                                icon: 'warning',
                                                confirmButtonColor: '#2ecc71',
                                                background: '#1a2535',
                                                color: '#fff'
                                            });
                                            return;
                                        }
                                        if (scoreA === scoreB) {
                                            Swal.fire({
                                                title: 'คะแนนไม่ถูกต้อง',
                                                text: 'ผลการแข่งขันห้ามเสมอ! ต้องมีผู้ชนะเพียงฝั่งเดียว',
                                                icon: 'warning',
                                                confirmButtonColor: '#2ecc71',
                                                background: '#1a2535',
                                                color: '#fff'
                                            });
                                            return;
                                        }
                                        handleSaveScore();
                                    }}
                                    disabled={savingScore}
                                    className="flex-[2] py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-[#2ecc71] to-[#27ae60] hover:scale-[1.02] active:scale-95 shadow-[0_10px_30px_rgba(46,204,113,0.3)] text-white font-black transition-all disabled:opacity-50 text-base uppercase tracking-widest flex items-center justify-center gap-3 order-1 sm:order-2">
                                    {savingScore ? (
                                        <><svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg><span>กำลังบันทึก...</span></>
                                    ) : <><span>บันทึกผลการแข่ง</span><span className="text-xl">✅</span></>}
                                </button>
                            </div>

                            {/* Cancel Match Option */}
                            <button
                                onClick={handleCancelMatch}
                                disabled={savingScore}
                                className="w-full py-3 rounded-xl text-red-400/50 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                ยกเลิกแมตซ์การแข่งขันนี้ (Cancel Match)
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
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h1 className="text-lg sm:text-xl font-black text-white leading-tight">
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
                            {tournamentInfo?.user_created?.username && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-400">
                                    👤 โดย: {tournamentInfo.user_created.username}
                                </span>
                            )}
                        </div>

                        {/* Detail chips */}
                        {tournamentInfo && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[#2ecc71] font-bold">
                                    📅 {tournamentInfo.startDate ? new Date(tournamentInfo.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : "ไม่ระบุวันที่"}
                                </span>
                                <span className={`text-xs px-2.5 py-1 rounded-lg border font-bold ${tournamentInfo.mode === "ranking" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
                                    {tournamentInfo.mode === "ranking" ? "🏆 Ranking" : "🎮 Casual"}
                                </span>
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
                                {tournamentInfo.user_created?.username && (
                                    <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400">
                                        👤 ผู้สร้าง: {tournamentInfo.user_created.username}
                                    </span>
                                )}
                                <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400">
                                    🆔 {id}
                                </span>
                                <button
                                    onClick={() => setShowQR(true)}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-bold transition-all flex items-center gap-1.5"
                                >
                                    <span>🔗</span> เชิญเพื่อน
                                </button>
                            </div>
                        )}

                        {/* Overall progress (show for ongoing only) */}
                        {tournamentInfo?.tournament_status === "ongoing" && (
                            <div className="mt-3 flex items-center gap-3">
                                <div className="flex-1 max-w-xs h-1.5 rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-[#2ecc71] to-[#27ae60] transition-all duration-500" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-slate-400">
                                    {done}/{total} แมตซ์ ({pct}%)
                                    {cancelled > 0 && <span className="ml-2 text-red-500/60">คัดออก {cancelled}</span>}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Delete button (Owner only, only before start) */}
                    {tournamentInfo?.user_created?.id === user?.id && tournamentInfo?.tournament_status === "upcoming" && (
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
                    )}
                </div>

                {/* ── UPCOMING: Players list + Draw Pairs ── */}
                {/* Players & Draw Sections */}
                {tournamentInfo && (
                    <>
                        {/* Players list */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-3">
                                <h2 className="font-semibold text-white flex items-center gap-2">
                                    <span>👥</span> ผู้เข้าร่วม
                                    <span className="text-xs text-slate-400 font-normal">{tournamentInfo.players.length} คน</span>
                                </h2>
                                {tournamentInfo.tournament_status === "upcoming" && (
                                    <>
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
                                    </>
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
                                                <div
                                                    onClick={() => router.push(`/history/${player.id}`)}
                                                    className="w-8 h-8 rounded-xl shrink-0 overflow-hidden border border-[#2ecc71]/40 shadow-sm shadow-green-900/20 cursor-pointer hover:scale-110 transition-transform"
                                                >
                                                    <img src={player.picture.url.startsWith("http") ? player.picture.url : `${STRAPI_BASE_URL}${player.picture.url}`} alt={player.username} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => router.push(`/history/${player.id}`)}
                                                    className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm shadow-green-900/20 cursor-pointer hover:scale-110 transition-transform"
                                                >
                                                    {player.username.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div
                                                onClick={() => router.push(`/history/${player.id}`)}
                                                className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 cursor-pointer group/name"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-white truncate group-hover/name:text-green-400 transition-colors">{player.username}</p>
                                                    <p className="text-[10px] text-slate-500 truncate">{player.email}</p>
                                                </div>
                                                {tournamentInfo.mode === "ranking" && (
                                                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-400 font-medium bg-black/30 px-2 py-1 rounded-lg border border-white/5 w-fit">
                                                        <span className="text-yellow-500 font-bold">MMR: {player.ranking?.mmr ?? 1500}</span>
                                                        <span className="text-slate-600">|</span>
                                                        <span className="text-green-400">W: {player.ranking?.win ?? "-"}</span>
                                                        <span className="text-red-400">L: {player.ranking?.lose ?? "-"}</span>
                                                        <span className="text-slate-600">|</span>
                                                        <span className="text-orange-400 font-bold">🔥 {player.ranking?.win_streak ?? "-"}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {player.id === user?.id && tournamentInfo.tournament_status === "upcoming" && (
                                                <button onClick={handleLeave} disabled={leaving}
                                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 shrink-0 transition-all disabled:opacity-50">
                                                    ออก
                                                </button>
                                            )}
                                            {/* Owner can remove anyone, but only before tournament starts */}
                                            {tournamentInfo.user_created?.id === user?.id && player.id !== user?.id && tournamentInfo.tournament_status === "upcoming" && (
                                                <button
                                                    onClick={async () => {
                                                        const result = await Swal.fire({
                                                            title: "ยืนยันการลบผู้เล่น?",
                                                            text: `คุณแน่ใจหรือไม่ว่าต้องการลบ ${player.username} ออกจากรายการ?`,
                                                            icon: "warning",
                                                            showCancelButton: true,
                                                            confirmButtonText: "ลบออก",
                                                            cancelButtonText: "ยกเลิก",
                                                            confirmButtonColor: "#ef4444",
                                                            background: "#1a2535",
                                                            color: "#f1f5f9",
                                                        });
                                                        if (result.isConfirmed) {
                                                            try {
                                                                const res = await fetch(`${STRAPI_BASE_URL}/api/tournament-players/${player.tpDocumentId}`, {
                                                                    method: "DELETE",
                                                                    headers: { Authorization: `Bearer ${jwt}` },
                                                                });
                                                                if (!res.ok) throw new Error("ลบไม่สำเร็จ");
                                                                showToast("ลบผู้เล่นออกแล้ว", "success");
                                                                refreshInfo();
                                                            } catch (e) {
                                                                showToast("ลบไม่สำเร็จ", "error");
                                                            }
                                                        }
                                                    }}
                                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 shrink-0 transition-all">
                                                    ลบออก
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Draw Pairs Card (Owner only - Upcoming only) */}
                        {tournamentInfo?.tournament_status === "upcoming" && tournamentInfo?.user_created?.id === user?.id && tournamentInfo?.players && tournamentInfo.players.length >= (tournamentInfo.type === "double" ? 4 : 2) && (
                            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mt-6">
                                <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-3">
                                    <h2 className="font-semibold text-white flex items-center gap-2">
                                        <span>🎲</span> สุ่มคู่แข่งขัน
                                    </h2>
                                    <button onClick={handleDrawFair}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/20 text-purple-300 text-xs font-semibold transition-all">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        {drawnPairs ? "สุ่มใหม่" : "สุ่มคู่"}
                                    </button>
                                </div>

                                {/* Mode selector */}
                                <div className="px-5 py-3 bg-black/20 border-b border-white/5 flex gap-2">
                                    <button
                                        onClick={() => { setDrawMode("random"); setDrawnPairs(null); }}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${drawMode === "random" ? "bg-purple-500/20 border-purple-500/30 text-purple-300" : "bg-white/3 border-white/8 text-slate-400 hover:bg-white/8"}`}
                                    >
                                        🎲 สุ่มทั่วไป
                                    </button>
                                    <button
                                        onClick={() => { setDrawMode("mmr_balanced"); setDrawnPairs(null); }}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${drawMode === "mmr_balanced" ? "bg-yellow-500/20 border-yellow-500/30 text-yellow-300" : "bg-white/3 border-white/8 text-slate-400 hover:bg-white/8"}`}
                                    >
                                        ⚖️ สมดุล MMR
                                    </button>
                                </div>

                                <div className="px-5 py-3 bg-green-500/5 border-b border-green-500/10 space-y-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-green-400">⚖️ ทุกคนเล่นเท่ากัน (Fair Play)</p>
                                            <p className="text-[10px] text-green-400/60 mt-0.5">
                                                {drawMode === "mmr_balanced"
                                                    ? "คำนวณรอบน้อยที่สุดเพื่อให้ทุกคนเล่นเท่ากัน และจัดคู่ตามฝีมือ (MMR)"
                                                    : "คำนวณรอบน้อยที่สุดเพื่อให้ทุกคนเล่นเท่ากัน โดยการสุ่มคู่"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl">
                                            {[1, 2, 3, 4, 5].map((m) => (
                                                <button
                                                    key={m}
                                                    onClick={() => { setRoundsPerPlayer(m); setDrawnPairs(null); }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${roundsPerPlayer === m ? "bg-green-500 text-white shadow-lg shadow-green-900/40" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                                                >
                                                    {m} รอบ
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {!drawnPairs ? (
                                    <div className="py-10 text-center text-slate-500">
                                        <p className="text-3xl mb-2">{drawMode === "mmr_balanced" ? "⚖️" : "🎲"}</p>
                                        <p className="text-sm">กดปุ่ม &quot;สุ่มคู่&quot; เพื่อจับคู่ผู้เล่น</p>
                                        <p className="text-xs mt-1 text-slate-600">
                                            {(() => {
                                                const pCount = tournamentInfo.players.length;
                                                const isDouble = tournamentInfo.type === "double";
                                                const pPerMatch = isDouble ? 4 : 2;
                                                const minRounds = lcm(pCount, pPerMatch) / pCount;
                                                const totalRounds = minRounds * roundsPerPlayer;
                                                const totalMatches = (pCount * totalRounds) / pPerMatch;
                                                return `ผู้เล่น ${pCount} คน x คนละ ${totalRounds} รอบ → รวม ${totalMatches} แมตซ์`;
                                            })()}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {drawnPairs.map((pair, idx) => (
                                            <div key={idx} className="flex items-center px-4 sm:px-5 py-3 sm:py-4 gap-2 sm:gap-4">
                                                <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] sm:text-xs font-bold text-slate-400 shrink-0">{idx + 1}</span>

                                                {/* Team A */}
                                                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                    {pair.teamA.map((p, pIdx) => {
                                                        const pUrl = p.picture?.url ? (p.picture.url.startsWith("http") ? p.picture.url : `${STRAPI_BASE_URL}${p.picture.url}`) : null;
                                                        return (
                                                            <div key={`${p.id}-${pIdx}`} className="flex items-center gap-2 min-w-0">
                                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-[9px] sm:text-[10px] shrink-0 overflow-hidden border border-[#2ecc71]/40">
                                                                    {pUrl ? <img src={pUrl} alt={p.username} className="w-full h-full object-cover" /> : p.username.charAt(0).toUpperCase()}
                                                                </div>
                                                                <p className="text-xs sm:text-sm font-semibold text-white truncate">{p.username}</p>
                                                                {p.id === user?.id && <span className="text-[9px] sm:text-[10px] text-green-400 shrink-0">คุณ</span>}
                                                            </div>
                                                        );
                                                    })}
                                                    {drawMode === "mmr_balanced" && (
                                                        <span className="text-[9px] text-yellow-400/60 font-bold">
                                                            MMR รวม: {pair.teamA.reduce((s, p) => s + (p.ranking?.mmr ?? 1500), 0).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>

                                                <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[9px] sm:text-[11px] font-bold text-slate-500 shrink-0 uppercase tracking-tighter sm:tracking-normal">VS</span>

                                                {/* Team B */}
                                                {pair.teamB ? (
                                                    <div className="flex flex-col gap-1 sm:gap-1.5 flex-1 min-w-0 items-end">
                                                        {pair.teamB.map((p, pIdx) => {
                                                            const pUrl = p.picture?.url ? (p.picture.url.startsWith("http") ? p.picture.url : `${STRAPI_BASE_URL}${p.picture.url}`) : null;
                                                            return (
                                                                <div key={`${p.id}-${pIdx}`} className="flex items-center gap-2 min-w-0 text-right">
                                                                    {p.id === user?.id && <span className="text-[9px] sm:text-[10px] text-green-400 shrink-0">คุณ</span>}
                                                                    <p className="text-xs sm:text-sm font-semibold text-white truncate text-right">{p.username}</p>
                                                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-[9px] sm:text-[10px] shrink-0 overflow-hidden border border-[#3498db]/40">
                                                                        {pUrl ? <img src={pUrl} alt={p.username} className="w-full h-full object-cover" /> : p.username.charAt(0).toUpperCase()}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {drawMode === "mmr_balanced" && (
                                                            <span className="text-[9px] text-yellow-400/60 font-bold">
                                                                MMR รวม: {pair.teamB.reduce((s, p) => s + (p.ranking?.mmr ?? 1500), 0).toLocaleString()}
                                                            </span>
                                                        )}
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
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
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
                                                แมตซ์ #{round}
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

                                                let predictedAChange = 0;
                                                let predictedALose = 0;
                                                let predictedBChange = 0;
                                                let predictedBLose = 0;
                                                if (!isCompleted && match.team_a_id && match.team_b_id) {
                                                    const aMmrs = match.team_a_id.team_players.map(tp => tp.user_id?.ranking?.mmr ?? 1500);
                                                    const bMmrs = match.team_b_id.team_players.map(tp => tp.user_id?.ranking?.mmr ?? 1500);
                                                    const avgA = aMmrs.length ? aMmrs.reduce((a, b) => a + b, 0) / aMmrs.length : null;
                                                    const avgB = bMmrs.length ? bMmrs.reduce((a, b) => a + b, 0) / bMmrs.length : null;
                                                    if (avgA !== null && avgB !== null) {
                                                        const predictions = calculateExpectedMmrChange(avgA, avgB);
                                                        predictedAChange = predictions.aWins;
                                                        predictedALose = predictions.aLoses;
                                                        predictedBChange = predictions.bWins;
                                                        predictedBLose = predictions.bLoses;
                                                    }
                                                }

                                                return (
                                                    <div key={match.id}
                                                        className={`group relative overflow-hidden bg-black/20 border border-white/5 rounded-2xl p-4 transition-all duration-300 ${tournamentInfo.user_created?.id === user?.id && match.match_status !== "cancelled" ? "hover:bg-black/40 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer" : ""} ${match.match_status === "cancelled" ? "opacity-60 grayscale" : ""}`}
                                                        onClick={() => {
                                                            if (match.match_status === "cancelled") return;
                                                            if (tournamentInfo.user_created?.id !== user?.id) return; // Only owner can edit scores
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
                                                            {match.match_status === "cancelled" ? (
                                                                <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold flex items-center gap-1">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                                    ยกเลิกแล้ว
                                                                </span>
                                                            ) : isCompleted ? (
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

                                                        <div className="mt-8 sm:mt-6 flex items-center justify-between gap-4">
                                                            {/* Team A */}
                                                            <div className={`flex-1 min-w-0 transition-colors ${winnerA ? "text-green-400" : isCompleted && !winnerA ? "text-slate-500" : "text-white"}`}>
                                                                <div className="flex flex-col gap-3 justify-center h-full">
                                                                    {match.team_a_id?.team_players.map((tp, idx) => {
                                                                        const u = tp.user_id;
                                                                        if (!u) return null;
                                                                        const rank = u.ranking;
                                                                        const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                                                        const mmr_change = match.match_histories?.find(mh => mh.users?.some(us => us.id === u.id))?.mmr_change;
                                                                        return (
                                                                            <div key={idx} className="flex items-center justify-end gap-2 sm:gap-3 relative">
                                                                                <div className="flex flex-col items-end min-w-0">
                                                                                    <div className="flex items-center gap-1 sm:gap-1.5">
                                                                                        {winnerA && idx === 0 && <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-green-500 bg-green-500/10 px-1 sm:px-1.5 py-0.5 rounded-md">Winner</span>}
                                                                                        <p className="font-bold text-xs sm:text-base truncate">{u.username}</p>
                                                                                    </div>
                                                                                    {/* Stats - ranking mode only */}
                                                                                    {tournamentInfo.mode === "ranking" && (
                                                                                        <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[10px] text-slate-400 mt-0.5 sm:mt-1 font-medium bg-black/20 px-1.5 sm:px-2 py-0.5 rounded border border-white/5">
                                                                                            <span className="text-yellow-500 font-bold">MMR: {rank ? rank.mmr : 1500}</span>
                                                                                            <span className="text-slate-600">|</span>
                                                                                            <span className="text-green-400">W: {rank ? rank.win : "-"}</span>
                                                                                            <span className="text-red-400">L: {rank ? rank.lose : "-"}</span>
                                                                                            <span className="text-slate-600">|</span>
                                                                                            <span className="text-orange-400 font-bold">🔥 {rank ? rank.win_streak : "-"}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="relative">
                                                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 border-slate-700/50 flex items-center justify-center shadow-inner">
                                                                                        {pUrl ? <img src={pUrl} alt={u.username} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                                                                    </div>
                                                                                    {mmr_change !== undefined ? (
                                                                                        <div className={`absolute -bottom-2 sm:-bottom-2.5 left-1/2 -translate-x-1/2 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border shadow-lg ${mmr_change > 0 ? "bg-[#0f2a1a] border-green-500 text-green-400 shadow-green-900/40" : "bg-[#2a0f0f] border-red-500 text-red-400 shadow-red-900/40"}`}>
                                                                                            {mmr_change > 0 ? "+" : ""}{mmr_change}
                                                                                        </div>
                                                                                    ) : (!isCompleted && predictedAChange > 0) ? (
                                                                                        <div title="คะแนน MMR คาดการณ์หากชนะ/แพ้ 21-20" className="absolute -bottom-2 sm:-bottom-2.5 left-1/2 -translate-x-1/2 px-1.5 sm:px-2 py-[2px] sm:py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold border shadow-lg backdrop-blur-md bg-slate-800/90 border-slate-600/50 shadow-black/50 whitespace-nowrap flex items-center gap-[2px] sm:gap-1 z-10">
                                                                                            <span className="text-green-400 drop-shadow-[0_0_2px_rgba(74,222,128,0.3)]">+{predictedAChange}</span>
                                                                                            <span className="text-slate-500 leading-none text-[7px] sm:text-[8px]">/</span>
                                                                                            <span className="text-red-400 drop-shadow-[0_0_2px_rgba(248,113,113,0.3)]">-{predictedALose}</span>
                                                                                        </div>
                                                                                    ) : null}
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
                                                                    <div className="flex items-center gap-2 sm:gap-3 bg-[#0f1923] px-3 sm:px-4 py-2 sm:py-3 rounded-2xl border border-white/10 shadow-inner">
                                                                        <span className={`text-xl sm:text-3xl font-black ${winnerA ? "text-green-400" : "text-white"}`}>{match.score_a}</span>
                                                                        <span className="text-slate-600 font-bold text-lg sm:text-xl">:</span>
                                                                        <span className={`text-xl sm:text-3xl font-black ${winnerB ? "text-green-400" : "text-white"}`}>{match.score_b}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/30 border-4 border-[#1a2535]">
                                                                        <span className="text-white text-xs sm:text-base font-black italic">VS</span>
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
                                                                        const mmr_change = match.match_histories?.find(mh => mh.users?.some(us => us.id === u.id))?.mmr_change;
                                                                        return (
                                                                            <div key={idx} className="flex items-center justify-start gap-3 relative">
                                                                                <div className="relative">
                                                                                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 border-slate-700/50 flex items-center justify-center shadow-inner">
                                                                                        {pUrl ? <img src={pUrl} alt={u.username} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                                                                    </div>
                                                                                    {mmr_change !== undefined ? (
                                                                                        <div className={`absolute -bottom-2 sm:-bottom-2.5 left-1/2 -translate-x-1/2 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border shadow-lg ${mmr_change > 0 ? "bg-[#0f2a1a] border-green-500 text-green-400 shadow-green-900/40" : "bg-[#2a0f0f] border-red-500 text-red-400 shadow-red-900/40"}`}>
                                                                                            {mmr_change > 0 ? "+" : ""}{mmr_change}
                                                                                        </div>
                                                                                    ) : (!isCompleted && predictedBChange > 0) ? (
                                                                                        <div title="คะแนน MMR คาดการณ์หากชนะ/แพ้ 21-20" className="absolute -bottom-2 sm:-bottom-2.5 left-1/2 -translate-x-1/2 px-1.5 sm:px-2 py-[2px] sm:py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold border shadow-lg backdrop-blur-md bg-slate-800/90 border-slate-600/50 shadow-black/50 whitespace-nowrap flex items-center gap-[2px] sm:gap-1 z-10">
                                                                                            <span className="text-green-400 drop-shadow-[0_0_2px_rgba(74,222,128,0.3)]">+{predictedBChange}</span>
                                                                                            <span className="text-slate-500 leading-none text-[7px] sm:text-[8px]">/</span>
                                                                                            <span className="text-red-400 drop-shadow-[0_0_2px_rgba(248,113,113,0.3)]">-{predictedBLose}</span>
                                                                                        </div>
                                                                                    ) : null}
                                                                                </div>
                                                                                <div className="flex flex-col items-start min-w-0">
                                                                                    <div className="flex items-center gap-1 sm:gap-1.5">
                                                                                        <p className="font-bold text-xs sm:text-base truncate">{u.username}</p>
                                                                                        {winnerB && idx === 0 && <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-green-500 bg-green-500/10 px-1 sm:px-1.5 py-0.5 rounded-md">Winner</span>}
                                                                                    </div>
                                                                                    {/* Stats - ranking mode only */}
                                                                                    {tournamentInfo.mode === "ranking" && (
                                                                                        <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[10px] text-slate-400 mt-0.5 sm:mt-1 font-medium bg-black/20 px-1.5 sm:px-2 py-0.5 rounded border border-white/5">
                                                                                            <span className="text-yellow-500 font-bold">MMR: {rank ? rank.mmr : "-"}</span>
                                                                                            <span className="text-slate-600">|</span>
                                                                                            <span className="text-green-400">W: {rank ? rank.win : "-"}</span>
                                                                                            <span className="text-red-400">L: {rank ? rank.lose : "-"}</span>
                                                                                            <span className="text-slate-600">|</span>
                                                                                            <span className="text-orange-400 font-bold">🔥 {rank ? rank.win_streak : "-"}</span>
                                                                                        </div>
                                                                                    )}
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

                                                        {tournamentInfo.tournament_status === "ongoing" && !isCompleted && tournamentInfo.user_created?.id === user?.id && (
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

            {/* QR Invite Modal */}
            {showQR && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowQR(false)} />
                    <div className="relative w-full max-w-sm bg-[#1a2535] border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-8 animate-in animate-out fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl mb-4">🔗</div>
                            <h3 className="text-xl font-bold text-white mb-2">เชิญเพื่อนเข้าแข่งขัน</h3>
                            <p className="text-sm text-slate-400 mb-6">แสกน QR Code ด้านล่างเพื่อเข้าร่วมรายการนี้</p>

                            <div className="p-4 bg-white rounded-2xl shadow-inner mb-6">
                                <QRCodeCanvas
                                    value={shareUrl}
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>

                            <div className="w-full space-y-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(shareUrl);
                                        Swal.fire({
                                            title: "คัดลอกลิงก์แล้ว!",
                                            text: "คุณสามารถส่งลิงก์ให้เพื่อนได้ทันที",
                                            icon: "success",
                                            timer: 1500,
                                            showConfirmButton: false,
                                            background: "#1a2535",
                                            color: "#fff"
                                        });
                                    }}
                                    className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all"
                                >
                                    คัดลอกลิงก์
                                </button>
                                <button
                                    onClick={() => setShowQR(false)}
                                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold transition-all"
                                >
                                    ปิด
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

