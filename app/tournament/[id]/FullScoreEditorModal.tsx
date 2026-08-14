import { ApiMatch, TournamentInfo } from "../TournamentTypes";
import Swal from "sweetalert2";
import Image from 'next/image';

interface FullScoreEditorModalProps {
    match: ApiMatch;
    onClose: () => void;
    onSave: () => void;
    onCancelMatch: () => void;
    scoreA: number;
    setScoreA: (val: number) => void;
    scoreB: number;
    setScoreB: (val: number) => void;
    savingScore: boolean;
    tournamentInfo: TournamentInfo | null;
    STRAPI_BASE_URL: string;
}

export default function FullScoreEditorModal({
    match,
    onClose,
    onSave,
    onCancelMatch,
    scoreA,
    setScoreA,
    scoreB,
    setScoreB,
    savingScore,
    tournamentInfo,
    STRAPI_BASE_URL
}: FullScoreEditorModalProps) {
    const isCompleted = match.match_status === "done";


    const handleConfirmSave = () => {
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
        onSave();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-md">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl bg-gradient-to-b from-[#1a2535] to-[#0f1923] border border-white/10 rounded-[2.5rem] p-6 sm:p-10 my-auto shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col gap-8" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="text-center space-y-3">
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2ecc71] via-[#3498db] to-[#2ecc71] animate-gradient-x p-1">
                        {isCompleted ? "แก้ไขผลการแข่งขัน" : "บันทึกผลการแข่งขัน"}
                    </h3>
                    <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
                        <span className="text-xs font-black tracking-widest text-[#3498db]">แมตซ์ #{match.match_no}</span>
                    </div>
                </div>

                {/* Score Inputs Area */}
                <div className="flex flex-col sm:grid sm:grid-cols-[1fr,auto,1fr] items-stretch sm:items-center gap-6 sm:gap-10 bg-black/40 p-6 sm:p-10 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Team A */}
                    <div className="flex-1 flex flex-col gap-6 items-center">
                        <div className="flex flex-col gap-3 w-full">
                            {(match.team_a_id?.team_players || []).map((tp, idx) => {
                                const u = tp.user_id || (tp.guest_name ? { id: 0, username: tp.guest_name, picture: null, rankings: [] } : null);
                                if (!u) return null;
                                const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                return (
                                    <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                        <div className="w-12 h-12 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 border-[#2ecc71]/30 flex items-center justify-center shadow-lg">
                                            {pUrl ? <Image src={pUrl} alt={u.username} width={32} height={32} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-white truncate">{u.username}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">TEAM {match.team_a_id?.team_no}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="w-full space-y-4">
                            <div className="relative group/input flex items-center">
                                <button
                                    onClick={() => setScoreA(Math.max(0, scoreA - 1))}
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
                                    onClick={() => setScoreA(scoreA + 1)}
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

                    <div className="flex flex-col items-center justify-center shrink-0">
                        <span className="text-slate-700 font-black text-4xl opacity-50">VS</span>
                    </div>

                    {/* Team B */}
                    <div className="flex-1 flex flex-col gap-6 items-center">
                        <div className="flex flex-col gap-3 w-full">
                            {(match.team_b_id?.team_players || []).map((tp, idx) => {
                                const u = tp.user_id || (tp.guest_name ? { id: 0, username: tp.guest_name, picture: null, rankings: [] } : null);
                                if (!u) return null;
                                const pUrl = u.picture?.url ? (u.picture.url.startsWith("http") ? u.picture.url : `${STRAPI_BASE_URL}${u.picture.url}`) : null;
                                return (
                                    <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                        <div className="w-12 h-12 rounded-full bg-slate-800 shrink-0 overflow-hidden border-2 border-[#3498db]/30 flex items-center justify-center shadow-lg">
                                            {pUrl ? <Image src={pUrl} alt={u.username} width={32} height={32} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-slate-400">{u.username.charAt(0).toUpperCase()}</span>}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-white truncate">{u.username}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">TEAM {match.team_b_id?.team_no}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {!match.team_b_id && (
                                <div className="h-14 flex items-center justify-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                                    <p className="text-xs font-bold text-slate-500 italic">พักรอบ</p>
                                </div>
                            )}
                        </div>

                        <div className="w-full space-y-4">
                            <div className="relative group/input flex items-center">
                                <button
                                    onClick={() => setScoreB(Math.max(0, scoreB - 1))}
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
                                    onClick={() => setScoreB(scoreB + 1)}
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
                    {isCompleted && tournamentInfo?.mode === "ranking" && (
                        <p className="text-[10px] text-orange-400/70 text-center font-medium italic mb-1">
                            ⚠️ การแก้ไขผลคะแนนที่จบไปแล้วในโหมด Ranking อาจทำให้สถิติ RP ไม่ตรงตามความเป็นจริง
                        </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={onClose}
                            className="flex-1 py-4 sm:py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 font-bold transition-all text-sm uppercase tracking-widest order-2 sm:order-1">
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleConfirmSave}
                            disabled={savingScore}
                            className="flex-[2] py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-[#2ecc71] to-[#27ae60] hover:scale-[1.02] active:scale-95 shadow-[0_10px_30px_rgba(46,204,113,0.3)] text-white font-black transition-all disabled:opacity-50 text-base uppercase tracking-widest flex items-center justify-center gap-3 order-1 sm:order-2">
                            {savingScore ? (
                                <><svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg><span>กำลังบันทึก...</span></>
                            ) : <><span>บันทึกผลการแข่ง</span><span className="text-xl">✅</span></>}
                        </button>
                    </div>

                    {/* Cancel Match Option */}
                    <button
                        onClick={onCancelMatch}
                        disabled={savingScore}
                        className="w-full py-3 rounded-xl text-red-400/50 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        ยกเลิกแมตซ์การแข่งขันนี้ (Cancel Match)
                    </button>
                </div>
            </div>
        </div>
    );
}
