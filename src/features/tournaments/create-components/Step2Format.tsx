import React from "react";
import { FormData, formatOptions } from "../constants";

interface Props {
    form: FormData;
    setForm: React.Dispatch<React.SetStateAction<FormData>>;
    onPrev: () => void;
    onNext: () => void;
}

export function Step2Format({ form, setForm, onPrev, onNext }: Props) {
    return (
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
                <button onClick={onPrev} className="px-5 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-sm rounded-xl hover:bg-white/10 transition-all">
                    ← ย้อนกลับ
                </button>
                <button onClick={onNext} className="px-6 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold rounded-xl hover:from-[#3de382] hover:to-[#2ecc71] transition-all">
                    ถัดไป →
                </button>
            </div>
        </div>
    );
}
