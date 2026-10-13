"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useLineCallback } from "@/features/auth/useLineCallback";
import { LineLinkAccountForm } from "./LineLinkAccountForm";

function LineCallback() {
    const { error, backHref, pendingLink } = useLineCallback();

    if (pendingLink) {
        return <LineLinkAccountForm pendingLink={pendingLink} />;
    }

    if (!error) {
        return (
            <div className="text-center space-y-3">
                <div className="text-green-500 animate-pulse text-4xl">🏸</div>
                <p className="text-slate-400 text-sm">กำลังยืนยันตัวตนกับ LINE...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-4 bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-5">
            <div className="text-4xl">⚠️</div>
            <p className="text-white text-sm leading-relaxed">{error}</p>
            <Link
                href={backHref}
                className="inline-block w-full py-2.5 px-4 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold rounded-xl"
            >
                กลับ
            </Link>
        </div>
    );
}

export function LineCallbackClient() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f1923]">
            <Suspense fallback={<div className="text-green-500 animate-pulse text-4xl">🏸</div>}>
                <LineCallback />
            </Suspense>
        </div>
    );
}
