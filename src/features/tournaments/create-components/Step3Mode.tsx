import React from "react";
import { FormData, modeOptions } from "../constants";

interface Props {
    form: FormData;
    setForm: React.Dispatch<React.SetStateAction<FormData>>;
    onPrev: () => void;
    onNext: () => void;
}

export function Step3Mode({ form, setForm, onPrev, onNext }: Props) {
    return (
        <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <h2 className="font-semibold text-white flex items-center gap-2">
                    <span>🎯</span> โหมดการแข่งขัน
                </h2>
                <p className="text-xs text-slate-400">เลือกว่าทัวร์นาเมนต์นี้จะส่งผลต่อ RP และสถิติผู้เล่นหรือไม่</p>

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
