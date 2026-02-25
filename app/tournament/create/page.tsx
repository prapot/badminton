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

type Format = "group_knockout" | "knockout" | "round_robin";

interface FormData {
    name: string;
    date: string;
    venue: string;
    format: Format;
    groups: number;
    playersPerGroup: number;
    advancePerGroup: number;
    description: string;
}

const formatOptions: { value: Format; label: string; desc: string; icon: string }[] = [
    { value: "group_knockout", label: "แบ่งสาย + แพ้คัดออก", desc: "แข่งแบ่งกลุ่มก่อน แล้วค่อยเข้าสู่รอบแพ้คัดออก", icon: "🏆" },
    { value: "knockout", label: "แพ้คัดออกทันที", desc: "แพ้ปุ๊บตกรอบทันที เหมาะกับผู้เล่นน้อย", icon: "⚡" },
    { value: "round_robin", label: "พบกันหมด", desc: "ทุกคนแข่งกับทุกคน คิดคะแนนรวม", icon: "🔄" },
];

export default function CreateTournamentPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<FormData>({
        name: "",
        date: "",
        venue: "",
        format: "group_knockout",
        groups: 4,
        playersPerGroup: 4,
        advancePerGroup: 2,
        description: "",
    });

    useEffect(() => {
        const stored = localStorage.getItem("user");
        const jwt = localStorage.getItem("jwt");
        if (!jwt) { router.push("/login"); return; }
        if (stored) setUser(JSON.parse(stored));
    }, [router]);

    if (!user) return null;

    const totalPlayers = form.groups * form.playersPerGroup;
    const totalMatches =
        form.format === "group_knockout"
            ? form.groups * ((form.playersPerGroup * (form.playersPerGroup - 1)) / 2) + (form.groups * form.advancePerGroup - 1)
            : form.format === "round_robin"
                ? (totalPlayers * (totalPlayers - 1)) / 2
                : totalPlayers - 1;

    const handleSubmit = async () => {
        setLoading(true);
        // Simulate API call
        await new Promise((r) => setTimeout(r, 1200));
        setLoading(false);
        router.push("/tournament");
    };

    const canNext1 = form.name.trim() && form.date && form.venue.trim();

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />

            <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/tournament"
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white">สร้างทัวร์นาเมนต์ใหม่</h1>
                        <p className="text-slate-400 text-xs mt-0.5">กรอกข้อมูลพื้นฐานและตั้งค่ารูปแบบการแข่งขัน</p>
                    </div>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-0">
                    {[1, 2, 3].map((s, i) => (
                        <div key={s} className="flex items-center flex-1 last:flex-none">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${step > s ? "bg-green-500 text-white" :
                                    step === s ? "bg-gradient-to-br from-[#2ecc71] to-[#27ae60] text-white ring-4 ring-green-500/20" :
                                        "bg-white/8 text-slate-500 border border-white/10"
                                }`}>
                                {step > s ? "✓" : s}
                            </div>
                            {i < 2 && (
                                <div className={`flex-1 h-0.5 mx-2 rounded ${step > s ? "bg-green-500" : "bg-white/10"}`} />
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 -mt-2 px-1">
                    <span className={step >= 1 ? "text-green-400" : ""}>ข้อมูลพื้นฐาน</span>
                    <span className={step >= 2 ? "text-green-400" : ""}>รูปแบบการแข่ง</span>
                    <span className={step >= 3 ? "text-green-400" : ""}>ยืนยัน</span>
                </div>

                {/* ── Step 1: Basic Info ── */}
                {step === 1 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                        <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><span>📋</span> ข้อมูลพื้นฐาน</h2>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">ชื่อทัวร์นาเมนต์ *</label>
                            <input
                                type="text"
                                placeholder="เช่น Badminton Club Open 2026"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">วันที่แข่ง *</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">สถานที่ *</label>
                                <input
                                    type="text"
                                    placeholder="เช่น สนาม A–D"
                                    value={form.venue}
                                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">รายละเอียดเพิ่มเติม</label>
                            <textarea
                                rows={3}
                                placeholder="กรอกรายละเอียดเพิ่มเติม (ไม่บังคับ)"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all resize-none"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!canNext1}
                                className="px-6 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:from-[#3de382] hover:to-[#2ecc71]"
                            >
                                ถัดไป →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Format ── */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                            <h2 className="font-semibold text-white flex items-center gap-2"><span>⚡</span> รูปแบบการแข่งขัน</h2>

                            <div className="space-y-3">
                                {formatOptions.map((f) => (
                                    <button
                                        key={f.value}
                                        onClick={() => setForm({ ...form, format: f.value })}
                                        className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${form.format === f.value
                                                ? "bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20"
                                                : "bg-white/3 border-white/8 hover:bg-white/8"
                                            }`}
                                    >
                                        <span className="text-2xl shrink-0">{f.icon}</span>
                                        <div>
                                            <p className={`text-sm font-semibold ${form.format === f.value ? "text-green-300" : "text-white"}`}>{f.label}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                                        </div>
                                        {form.format === f.value && (
                                            <span className="ml-auto shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Group config — only if format includes groups */}
                        {(form.format === "group_knockout" || form.format === "round_robin") && (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                <h3 className="font-medium text-white text-sm flex items-center gap-2"><span>🎯</span> ตั้งค่าสาย</h3>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">จำนวนสาย</label>
                                        <select
                                            value={form.groups}
                                            onChange={(e) => setForm({ ...form, groups: +e.target.value })}
                                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500/50 [color-scheme:dark]"
                                        >
                                            {[2, 3, 4, 6, 8].map((n) => <option key={n} value={n}>{n} สาย</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">ผู้เล่น/สาย</label>
                                        <select
                                            value={form.playersPerGroup}
                                            onChange={(e) => setForm({ ...form, playersPerGroup: +e.target.value })}
                                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500/50 [color-scheme:dark]"
                                        >
                                            {[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} คน</option>)}
                                        </select>
                                    </div>
                                    {form.format === "group_knockout" && (
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5">ผ่านรอบ/สาย</label>
                                            <select
                                                value={form.advancePerGroup}
                                                onChange={(e) => setForm({ ...form, advancePerGroup: +e.target.value })}
                                                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500/50 [color-scheme:dark]"
                                            >
                                                {[1, 2].map((n) => <option key={n} value={n}>{n} คน</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Summary pill */}
                                <div className="flex flex-wrap gap-3 pt-1">
                                    {[
                                        { label: "ผู้เล่นทั้งหมด", value: `${totalPlayers} คน`, icon: "👥" },
                                        { label: "แมตซ์โดยประมาณ", value: `${totalMatches} แมตซ์`, icon: "⚡" },
                                    ].map((s) => (
                                        <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/15">
                                            <span className="text-sm">{s.icon}</span>
                                            <div>
                                                <p className="text-[10px] text-slate-500">{s.label}</p>
                                                <p className="text-xs font-bold text-green-300">{s.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <button onClick={() => setStep(1)} className="px-5 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-sm rounded-xl hover:bg-white/10 transition-all">
                                ← ย้อนกลับ
                            </button>
                            <button onClick={() => setStep(3)} className="px-6 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold rounded-xl hover:from-[#3de382] hover:to-[#2ecc71] transition-all">
                                ถัดไป →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Confirm ── */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h2 className="font-semibold text-white mb-5 flex items-center gap-2"><span>✅</span> ยืนยันข้อมูล</h2>

                            <div className="space-y-3 text-sm">
                                {[
                                    { label: "ชื่อทัวร์นาเมนต์", value: form.name },
                                    { label: "วันที่", value: form.date ? new Date(form.date).toLocaleDateString("th-TH", { dateStyle: "long" }) : "-" },
                                    { label: "สถานที่", value: form.venue },
                                    { label: "รูปแบบ", value: formatOptions.find((f) => f.value === form.format)?.label ?? "-" },
                                    ...(form.format !== "knockout"
                                        ? [
                                            { label: "จำนวนสาย", value: `${form.groups} สาย` },
                                            { label: "ผู้เล่นทั้งหมด", value: `${totalPlayers} คน` },
                                        ]
                                        : []),
                                    { label: "แมตซ์โดยประมาณ", value: `${totalMatches} แมตซ์` },
                                ].map((row) => (
                                    <div key={row.label} className="flex items-start justify-between gap-4 py-2.5 border-b border-white/5 last:border-0">
                                        <span className="text-slate-400 shrink-0">{row.label}</span>
                                        <span className="text-white font-medium text-right">{row.value}</span>
                                    </div>
                                ))}
                            </div>

                            {form.description && (
                                <div className="mt-3 pt-3 border-t border-white/8">
                                    <p className="text-xs text-slate-500 mb-1">รายละเอียด</p>
                                    <p className="text-sm text-slate-300">{form.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between">
                            <button onClick={() => setStep(2)} className="px-5 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-sm rounded-xl hover:bg-white/10 transition-all">
                                ← ย้อนกลับ
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold rounded-xl hover:from-[#3de382] hover:to-[#2ecc71] transition-all disabled:opacity-60 shadow-lg shadow-green-900/30"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        กำลังสร้าง...
                                    </>
                                ) : "🏆 สร้างทัวร์นาเมนต์"}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
