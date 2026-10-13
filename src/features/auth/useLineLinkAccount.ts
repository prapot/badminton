"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { LoginResponse, loginWithStrapi } from "@/features/auth/auth";
import { linkLineWithTicket, registerWithLine } from "@/features/auth/line";
import { PendingLineLink } from "@/features/auth/useLineCallback";

/** หลัง login ด้วย LINE ที่ยังไม่ผูก: เข้าบัญชีเดิมแล้วผูก LINE ด้วย linkTicket หรือสมัครใหม่จาก LINE */
export function useLineLinkAccount({ linkTicket, redirect }: PendingLineLink) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loginAndLink = async (identifier: string, password: string) => {
        setSubmitting(true);
        setError(null);
        let data: LoginResponse;
        try {
            data = await loginWithStrapi(identifier, password);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
            setSubmitting(false);
            return;
        }

        // login สำเร็จแล้ว — เก็บ session ไว้ก่อน ถึงผูก LINE ไม่สำเร็จก็ยังเข้าใช้งานได้
        localStorage.setItem("jwt", data.jwt);
        localStorage.setItem("user", JSON.stringify(data.user));
        try {
            await linkLineWithTicket(linkTicket, data.jwt);
        } catch (err: unknown) {
            await Swal.fire({
                icon: "warning",
                title: "เข้าสู่ระบบแล้ว แต่เชื่อมต่อ LINE ไม่สำเร็จ",
                text: `${err instanceof Error ? err.message : "เกิดข้อผิดพลาด"} — เชื่อมต่อใหม่ได้ที่หน้าโปรไฟล์`,
                confirmButtonColor: "#2ecc71",
                background: "#1e293b",
                color: "#fff",
                confirmButtonText: "ตกลง",
            });
        }
        router.replace(redirect);
    };

    // บัญชีใหม่ผูก LINE ตั้งแต่สร้าง ไม่มีขั้นผูกแยก
    const register = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const data = await registerWithLine(linkTicket);
            localStorage.setItem("jwt", data.jwt);
            localStorage.setItem("user", JSON.stringify(data.user));
            router.replace(redirect);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
            setSubmitting(false);
        }
    };

    return { submitting, error, setError, loginAndLink, register };
}
