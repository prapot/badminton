import React from "react";
import Link from "next/link";

export function ProfileHeader() {
    return (
        <div className="flex items-center gap-3">
            <Link
                href="/"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </Link>
            <div>
                <h1 className="text-xl font-bold text-white">แก้ไขโปรไฟล์</h1>
                <p className="text-slate-400 text-xs mt-0.5">อัปเดตข้อมูลส่วนตัวของคุณ</p>
            </div>
        </div>
    );
}
