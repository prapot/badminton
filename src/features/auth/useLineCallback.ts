"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { linkLine, loginWithLine, LineNotLinkedError, takePendingLineAuth } from "@/features/auth/line";

export interface PendingLineLink {
    linkTicket: string;
    displayName: string;
    redirect: string;
}

export interface LineCallbackState {
    error: string | null;
    backHref: string;
    /** LINE ยังไม่ผูกกับบัญชีไหน → ให้ login/สมัครด้วยอีเมลแล้วผูก */
    pendingLink: PendingLineLink | null;
}

/** จัดการตอน LINE redirect กลับมาพร้อม code: login หรือเชื่อมบัญชี แล้วพากลับหน้าเดิม */
export function useLineCallback(): LineCallbackState {
    const router = useRouter();
    const searchParams = useSearchParams();
    const handled = useRef(false);
    const [state, setState] = useState<LineCallbackState>({ error: null, backHref: "/login", pendingLink: null });

    useEffect(() => {
        // code ใช้แลกได้ครั้งเดียว — กัน StrictMode เรียก effect ซ้ำ
        if (handled.current) return;
        handled.current = true;

        const run = async () => {
            let backHref = "/login";
            let redirect = "/";
            try {
                const pending = takePendingLineAuth(searchParams.get("state"));
                backHref = pending.mode === "link" ? pending.redirect : "/login";
                redirect = pending.redirect;

                if (searchParams.get("error")) {
                    throw new Error("ยกเลิกการเข้าสู่ระบบด้วย LINE");
                }
                const code = searchParams.get("code");
                if (!code) throw new Error("ไม่ได้รับข้อมูลจาก LINE");

                if (pending.mode === "link") {
                    const jwt = localStorage.getItem("jwt");
                    if (!jwt) throw new Error("กรุณาเข้าสู่ระบบก่อนเชื่อมต่อ LINE");
                    await linkLine(code, pending.nonce, jwt);
                } else {
                    const data = await loginWithLine(code, pending.nonce);
                    localStorage.setItem("jwt", data.jwt);
                    localStorage.setItem("user", JSON.stringify(data.user));
                }
                router.replace(pending.redirect);
            } catch (err: unknown) {
                if (err instanceof LineNotLinkedError) {
                    setState({
                        error: null,
                        backHref,
                        pendingLink: { linkTicket: err.linkTicket, displayName: err.displayName, redirect },
                    });
                    return;
                }
                setState({
                    error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
                    backHref,
                    pendingLink: null,
                });
            }
        };
        run();
    }, [router, searchParams]);

    return state;
}
