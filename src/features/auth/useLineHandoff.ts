"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { claimLineHandoff, clearLineHandoff, hasLineHandoff } from "@/features/auth/line";

const POLL_MS = 2000;

/**
 * หน้า login: ถ้าแท็บนี้เคยกด "เข้าสู่ระบบด้วย LINE" แล้ว login ไปเสร็จในเบราว์เซอร์อื่น
 * (iOS: แอป LINE เปิด callback ในเบราว์เซอร์ของมันเอง) ให้รับ session มาเมื่อผู้ใช้กลับมาที่แท็บนี้
 * — ตอนเปิดหน้า, กดย้อนกลับ (pageshow จาก bfcache) หรือสลับกลับมาที่แท็บ แล้วถามซ้ำทุก 2 วินาทีระหว่างรอ
 */
export function useLineHandoff(redirect: string) {
    const router = useRouter();
    const [waiting, setWaiting] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let busy = false;
        let disposed = false;

        const check = async () => {
            if (busy || disposed || document.visibilityState !== "visible" || !hasLineHandoff()) return;
            if (timer.current) clearTimeout(timer.current);
            busy = true;
            try {
                const claim = await claimLineHandoff();
                if (disposed) return;
                if (!claim) {
                    setWaiting(false);
                } else if (claim.status === "pending") {
                    setWaiting(true);
                    timer.current = setTimeout(check, POLL_MS);
                } else {
                    localStorage.setItem("jwt", claim.session.jwt);
                    localStorage.setItem("user", JSON.stringify(claim.session.user));
                    setWaiting(false);
                    router.replace(redirect);
                }
            } catch {
                setWaiting(false);
            } finally {
                busy = false;
            }
        };

        // ติด listener เสมอ: กดย้อนกลับมาจากหน้า LINE ได้หน้าเดิมจาก bfcache ซึ่งไม่รัน effect ใหม่
        const onShow = () => void check();
        const initial = setTimeout(onShow, 0);
        window.addEventListener("pageshow", onShow);
        document.addEventListener("visibilitychange", onShow);
        return () => {
            disposed = true;
            clearTimeout(initial);
            if (timer.current) clearTimeout(timer.current);
            window.removeEventListener("pageshow", onShow);
            document.removeEventListener("visibilitychange", onShow);
        };
    }, [redirect, router]);

    const cancel = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        clearLineHandoff();
        setWaiting(false);
    }, []);

    return { waiting, cancel };
}
