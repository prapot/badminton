import React from "react";
import { FormData, typeOptions, formatOptions, modeOptions } from "../constants";

interface Props {
    form: FormData;
    onPrev: () => void;
    onSubmit: () => void;
    submitting: boolean;
    error: string | null;
}

export function Step4Confirm({ form, onPrev, onSubmit, submitting, error }: Props) {
    return (
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
                <button onClick={onPrev} className="px-5 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-sm rounded-xl hover:bg-white/10 transition-all">
                    ← ย้อนกลับ
                </button>
                <button
                    onClick={onSubmit}
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
    );
}
