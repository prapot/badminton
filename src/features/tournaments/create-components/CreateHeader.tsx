import React from "react";
import Link from "next/link";

interface Props {
    step: number;
}

export function CreateHeader({ step }: Props) {
    return (
        <>
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
        </>
    );
}
