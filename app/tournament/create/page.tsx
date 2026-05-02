"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";

const STRAPI_BASE_URL =
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

type PlayerType = "single" | "double";
type Format = "round_robin" | "endless_mode" | "knockout" | "americano";
type Mode = "ranking" | "casual";

interface FormData {
    name: string;
    type: PlayerType;
    format: Format;
    startDate: string;
    mode: Mode;
}

const typeOptions: { value: PlayerType; label: string; desc: string; icon: string }[] = [
    { value: "single", label: "เดี่ยว (Single)", desc: "ผู้เล่น 1 คน ต่อ 1 ทีม", icon: "🏸" },
    { value: "double", label: "คู่ (Double)", desc: "ผู้เล่น 2 คน ต่อ 1 ทีม", icon: "👥" },
];

const formatOptions: { value: Format; label: string; desc: string; icon: string; disabled?: boolean }[] = [
    { value: "round_robin", label: "พบกันหมด (Round Robin)", desc: "ทุกคนแข่งกับทุกคน คิดคะแนนรวม", icon: "🔄" },
    { value: "endless_mode", label: "โหมดไร้สิ้นสุด (Endless Mode)", desc: "สุ่มจบคู่แข่งทีละคู่ไปเรื่อยๆ โดยเฉลี่ยการเล่นให้เท่ากัน", icon: "♾️" },
    // { value: "knockout", label: "แพ้คัดออก (Knockout)", desc: "แพ้ปุ๊บตกรอบทันที\", icon: "⚡" },
    { value: "americano", label: "อเมริกาโน (Americano)", desc: "สลับคู่แข่งทุกเซต คิดคะแนนสะสมส่วนตัว", icon: "🌀", disabled: true },
];

const modeOptions: { value: Mode; label: string; desc: string; icon: string; color: string }[] = [
    { value: "ranking", label: "Ranking", desc: "บันทึก MMR และสถิติผู้เล่น ใช้คัดอันดับ", icon: "🏆", color: "from-yellow-500/10 to-amber-500/10 border-yellow-500/30 ring-yellow-500/20 text-yellow-300" },
    { value: "casual", label: "Casual", desc: "ไม่บันทึกสถิติ เล่นสนุกๆ ไม่กระทบ MMR", icon: "🎮", color: "from-blue-500/10 to-cyan-500/10 border-blue-500/30 ring-blue-500/20 text-blue-300" },
];

export default function CreateTournamentPage() {
    const router = useRouter();
    const { user, jwt } = useAuth();

    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<FormData>({
        name: "",
        type: "single",
        format: "round_robin",
        startDate: new Date().toISOString().split('T')[0],
        mode: "ranking",
    });

    if (!user) return null;

    const canNext1 = form.name.trim().length > 0;

    const handleSubmit = async () => {
        if (!jwt) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`${STRAPI_BASE_URL}/api/tournaments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                    data: {
                        name: form.name.trim(),
                        type: form.type,
                        format: form.format,
                        startDate: form.startDate,
                        mode: form.mode,
                        tournament_status: "upcoming",
                        user_created: user.id,
                    },
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }

            const json = await res.json();
            const newId = json?.data?.documentId;
            router.push(newId ? `/tournament/${newId}` : "/tournament");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "สร้างไม่สำเร็จ");
            setSubmitting(false);
        }
    };

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
                        <p className="text-slate-400 text-xs mt-0.5">กรอกชื่อและเลือกรูปแบบการแข่งขัน</p>
                    </div>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-0">
                    {[1, 2, 3, 4].map((s, i) => (
                        <div key={s} className="flex items-center flex-1 last:flex-none">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${step > s ? "bg-green-500 text-white" :
                                step === s ? "bg-gradient-to-br from-[#2ecc71] to-[#27ae60] text-white ring-4 ring-green-500/20" :
                                    "bg-white/8 text-slate-500 border border-white/10"
                                }`}>
                                {step > s ? "✓" : s}
                            </div>
                            {i < 3 && (
                                <div className={`flex-1 h-0.5 mx-2 rounded ${step > s ? "bg-green-500" : "bg-white/10"}`} />
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 -mt-2 px-1">
                    <span className={step >= 1 ? "text-green-400" : ""}>ชื่อรายการ</span>
                    <span className={step >= 2 ? "text-green-400" : ""}>รูปแบบ</span>
                    <span className={step >= 3 ? "text-green-400" : ""}>โหมด</span>
                    <span className={step >= 4 ? "text-green-400" : ""}>ยืนยัน</span>
                </div>

                {/* ── Step 1: Name + Type ── */}
                {step === 1 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <span>📋</span> ชื่อรายการแข่งขัน
                        </h2>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                ชื่อทัวร์นาเมนต์ <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="เช่น Badminton Club Open 2026"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                วันที่เริ่มการแข่งขัน <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all [color-scheme:dark]"
                            />
                        </div>

                        {/* Type selector */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">
                                ประเภท
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {typeOptions.map((t) => (
                                    <button
                                        key={t.value}
                                        onClick={() => setForm({ ...form, type: t.value })}
                                        className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border text-left transition-all ${form.type === t.value
                                            ? "bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20"
                                            : "bg-white/3 border-white/8 hover:bg-white/8"
                                            }`}
                                    >
                                        <span className="text-2xl">{t.icon}</span>
                                        <p className={`text-sm font-semibold ${form.type === t.value ? "text-green-300" : "text-white"}`}>
                                            {t.label}
                                        </p>
                                        <p className="text-xs text-slate-400">{t.desc}</p>
                                        {form.type === t.value && (
                                            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-1">
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
                            <h2 className="font-semibold text-white flex items-center gap-2">
                                <span>⚡</span> รูปแบบการแข่งขัน
                            </h2>

                            <div className="space-y-3">
                                {formatOptions.map((f) => (
                                    <button
                                        key={f.value}
                                        onClick={() => setForm({ ...form, format: f.value })}
                                        className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${f.disabled
                                            ? "bg-white/2 border-white/5 opacity-40 cursor-not-allowed"
                                            : form.format === f.value
                                                ? "bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20"
                                                : "bg-white/3 border-white/8 hover:bg-white/8"
                                            }`}
                                        disabled={f.disabled}
                                    >
                                        <span className="text-2xl shrink-0">{f.icon}</span>
                                        <div className="flex-1">
                                            <p className={`text-sm font-semibold ${form.format === f.value ? "text-green-300" : "text-white"} flex items-center gap-2`}>
                                                {f.label}
                                                {f.disabled && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/20">
                                                        เร็วๆ นี้
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                                        </div>
                                        {form.format === f.value && !f.disabled && (
                                            <span className="shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

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

                {/* ── Step 3: Mode ── */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                            <h2 className="font-semibold text-white flex items-center gap-2">
                                <span>🎯</span> โหมดการแข่งขัน
                            </h2>
                            <p className="text-xs text-slate-400">เลือกว่าทัวร์นาเมนต์นี้จะส่งผลต่อ MMR และสถิติผู้เล่นหรือไม่</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {modeOptions.map((m) => (
                                    <button
                                        key={m.value}
                                        onClick={() => setForm({ ...form, mode: m.value })}
                                        className={`relative flex flex-col items-start gap-2 p-5 rounded-2xl border text-left transition-all ${form.mode === m.value
                                            ? `bg-gradient-to-br ${m.color} ring-1`
                                            : "bg-white/3 border-white/8 hover:bg-white/8"
                                            }`}
                                    >
                                        <span className="text-3xl">{m.icon}</span>
                                        <p className={`text-base font-black ${form.mode === m.value ? m.color.split(" ").find(c => c.startsWith("text-")) : "text-white"}`}>
                                            {m.label}
                                        </p>
                                        <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
                                        {form.mode === m.value && (
                                            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button onClick={() => setStep(2)} className="px-5 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-sm rounded-xl hover:bg-white/10 transition-all">
                                ← ย้อนกลับ
                            </button>
                            <button onClick={() => setStep(4)} className="px-6 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold rounded-xl hover:from-[#3de382] hover:to-[#2ecc71] transition-all">
                                ถัดไป →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 4: Confirm ── */}
                {step === 4 && (
                    <div className="space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
                                <span>✅</span> ยืนยันข้อมูล
                            </h2>

                            <div className="space-y-0">
                                {[
                                    { label: "ชื่อทัวร์นาเมนต์", value: form.name },
                                    { label: "วันที่แข่งขัน", value: new Date(form.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) },
                                    { label: "ประเภท", value: typeOptions.find((t) => t.value === form.type)?.label ?? "-" },
                                    { label: "รูปแบบ", value: formatOptions.find((f) => f.value === form.format)?.label ?? "-" },
                                    { label: "โหมด", value: modeOptions.find((m) => m.value === form.mode)?.label ?? "-" },
                                    { label: "สถานะเริ่มต้น", value: "รอเริ่ม (upcoming)" },
                                ].map((row) => (
                                    <div key={row.label} className="flex items-start justify-between gap-4 py-3 border-b border-white/5 last:border-0">
                                        <span className="text-slate-400 text-sm shrink-0">{row.label}</span>
                                        <span className="text-white text-sm font-medium text-right">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="flex justify-between">
                            <button onClick={() => setStep(3)} className="px-5 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-sm rounded-xl hover:bg-white/10 transition-all">
                                ← ย้อนกลับ
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold rounded-xl hover:from-[#3de382] hover:to-[#2ecc71] transition-all disabled:opacity-60 shadow-lg shadow-green-900/30"
                            >
                                {submitting ? (
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
