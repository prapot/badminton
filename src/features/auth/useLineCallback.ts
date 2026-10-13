"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearLineHandoff, completeLineCallback, sessionFromJwt } from "@/features/auth/line";
import { safeRedirectPath } from "@/features/auth/safeRedirect";

export interface PendingLineLink {
    linkTicket: string;
    displayName: string;
    redirect: string;
    /** ส่ง session ที่ได้ในหน้านี้กลับไปให้แท็บที่เริ่ม login (กรณีหน้านี้เปิดในเบราว์เซอร์อื่น) */
    handoffId: string;
}

export interface LineCallbackState {
    error: string | null;
    /** LINE ยังไม่ผูกกับบัญชีไหน → ให้สมัครใหม่หรือ login ด้วยอีเมลแล้วผูก */
    pendingLink: PendingLineLink | null;
    /** ผูก LINE สำเร็จ แต่หน้านี้เปิดในเบราว์เซอร์ที่ไม่ได้ login (เช่นเบราว์เซอร์ในแอป LINE บน iOS) */
    linkedElsewhere: string | null;
}

/**
 * จัดการตอน LINE redirect กลับมาพร้อม code + state — ไม่พึ่ง storage ของเบราว์เซอร์
 * (state/nonce/PKCE อยู่ที่ backend) จึงใช้ได้แม้หน้านี้เปิดในเบราว์เซอร์อื่นจากที่เริ่ม
 */
export function useLineCallback(): LineCallbackState {
    const router = useRouter();
    const searchParams = useSearchParams();
    const handled = useRef(false);
    const [state, setState] = useState<LineCallbackState>({ error: null, pendingLink: null, linkedElsewhere: null });

    useEffect(() => {
        // code ใช้แลกได้ครั้งเดียว — กัน StrictMode เรียก effect ซ้ำ
        if (handled.current) return;
        handled.current = true;

        const run = async () => {
            try {
                if (searchParams.get("error")) {
                    throw new Error("ยกเลิกการเข้าสู่ระบบด้วย LINE");
                }
                const code = searchParams.get("code");
                const lineState = searchParams.get("state");
                if (!code || !lineState) throw new Error("ไม่ได้รับข้อมูลจาก LINE");

                const res = await completeLineCallback(code, lineState);
                const redirect = safeRedirectPath(res.redirect);

                if (res.result === "login") {
                    const session = await sessionFromJwt(res.jwt);
                    localStorage.setItem("jwt", session.jwt);
                    localStorage.setItem("user", JSON.stringify(session.user));
                    clearLineHandoff(); // เบราว์เซอร์เดียวกับที่เริ่ม — ไม่ต้องรับ session ซ้ำ
                    router.replace(redirect);
                } else if (res.result === "linked") {
                    if (localStorage.getItem("jwt")) {
                        router.replace(redirect);
                    } else {
                        setState({ error: null, pendingLink: null, linkedElsewhere: res.displayName });
                    }
                } else {
                    setState({
                        error: null,
                        linkedElsewhere: null,
                        pendingLink: {
                            linkTicket: res.linkTicket,
                            displayName: res.displayName,
                            redirect,
                            handoffId: res.handoffId,
                        },
                    });
                }
            } catch (err: unknown) {
                setState({
                    error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
                    pendingLink: null,
                    linkedElsewhere: null,
                });
            }
        };
        run();
    }, [router, searchParams]);

    return state;
}
