"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
    id: number;
    username: string;
    email: string;
    picture?: {
        id: number;
        url: string;
    } | null;
}

/**
 * useAuth — ดึง user + jwt จาก localStorage
 * redirect ไป /login ถ้าไม่มี jwt
 *
 * Usage:
 *   const { user, jwt } = useAuth();
 *   if (!user) return null;  // กำลัง redirect หรือ load
 */
export function useAuth() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [jwt, setJwt] = useState<string | null>(null);

    useEffect(() => {
        const updateData = () => {
            const storedJwt = localStorage.getItem("jwt");
            const storedUser = localStorage.getItem("user");

            if (!storedJwt) {
                router.push("/login");
                return;
            }

            setJwt(storedJwt);
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch {
                    localStorage.removeItem("user");
                    localStorage.removeItem("jwt");
                    router.push("/login");
                }
            }
        };

        updateData();
        window.addEventListener("storage", updateData);
        return () => window.removeEventListener("storage", updateData);
    }, [router]);

    return { user, jwt };
}
