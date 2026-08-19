import React from "react";
import { FormData, typeOptions } from "../constants";

interface Props {
    form: FormData;
    setForm: React.Dispatch<React.SetStateAction<FormData>>;
    canNext: boolean;
    onNext: () => void;
}

export function Step1Name({ form, setForm, canNext, onNext }: Props) {
    return (
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
                    onClick={onNext}
                    disabled={!canNext}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:from-[#3de382] hover:to-[#2ecc71]"
                >
                    ถัดไป →
                </button>
            </div>
        </div>
    );
}
