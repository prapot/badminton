"use client";

import { useState } from "react";
import { cn } from "@/shared/utils/utils";
import { PendingLineLink } from "@/features/auth/useLineCallback";
import { useLineLinkAccount } from "@/features/auth/useLineLinkAccount";
import { LineIcon } from "./LineIcon";

type Tab = "register" | "login";

const inputClass =
    "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition-all";

export function LineLinkAccountForm({ pendingLink }: { pendingLink: PendingLineLink }) {
    const { submitting, error, setError, loginAndLink, register } = useLineLinkAccount(pendingLink);
    const [tab, setTab] = useState<Tab>("register");
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        loginAndLink(identifier, password);
    };

    const switchTab = (next: Tab) => {
        setTab(next);
        setError(null);
    };

    return (
        <div className="w-full max-w-md mx-4 bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#06C755] text-white mb-1">
                    <LineIcon className="w-7 h-7" />
                </div>
                <h1 className="text-white font-semibold">
                    สวัสดี{pendingLink.displayName && <> {pendingLink.displayName}</>} 👋
                </h1>
                <p className="text-slate-400 text-sm">LINE นี้ยังไม่ได้ใช้กับบัญชีไหน</p>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-xl">
                {([["register", "ผู้เล่นใหม่"], ["login", "มีบัญชีอยู่แล้ว"]] as const).map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => switchTab(value)}
                        className={cn(
                            "py-2 text-sm rounded-lg transition-colors",
                            tab === value ? "bg-[#2ecc71] text-white font-semibold" : "text-slate-400 hover:text-white"
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {tab === "register" ? (
                <div className="space-y-3">
                    <p className="text-slate-400 text-sm">
                        สร้างบัญชีใหม่ชื่อ <span className="text-white font-medium">{pendingLink.displayName || "จาก LINE"}</span>{" "}
                        แล้วเข้าสู่ระบบด้วย LINE ได้เลย ไม่ต้องตั้งรหัสผ่าน (ตั้งรหัสผ่าน/อีเมลทีหลังได้ที่หน้าโปรไฟล์)
                    </p>
                    <button
                        type="button"
                        onClick={register}
                        disabled={submitting}
                        className="w-full py-2.5 px-4 bg-white hover:bg-slate-200 disabled:opacity-50 text-[#0f1923] text-sm font-semibold rounded-xl transition-colors"
                    >
                        {submitting ? "กำลังสร้างบัญชี..." : "สร้างบัญชีด้วย LINE"}
                    </button>
                </div>
            ) : (
                <form onSubmit={handleLogin} className="space-y-3">
                    <p className="text-slate-400 text-sm">เข้าสู่ระบบบัญชีเดิมครั้งเดียว ครั้งต่อไปกด LINE ได้เลย</p>
                    <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        placeholder="Username หรือ Email"
                        autoComplete="username"
                        className={inputClass}
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="รหัสผ่าน"
                        autoComplete="current-password"
                        className={inputClass}
                    />
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 px-4 bg-white hover:bg-slate-200 disabled:opacity-50 text-[#0f1923] text-sm font-semibold rounded-xl transition-colors"
                    >
                        {submitting ? "กำลังดำเนินการ..." : "เข้าสู่ระบบและเชื่อมต่อ LINE"}
                    </button>
                </form>
            )}
        </div>
    );
}
