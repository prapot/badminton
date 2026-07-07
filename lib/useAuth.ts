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

// ฟังก์ชันถอดรหัส JWT และตรวจสอบเวลาหมดอายุ
function isTokenExpired(token: string): boolean {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return true;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const { exp } = JSON.parse(jsonPayload);
        const now = Date.now() / 1000;
        return exp < now;
    } catch (error) {
        return true; // ถ้าแกะไม่ได้ ถือว่าเสีย/หมดอายุ
    }
}

/**
 * useAuth — ดึง user + jwt จาก localStorage
 * ตรวจสอบด้วยว่า JWT หมดอายุหรือยัง ถ้าหมดอายุให้ redirect ไป /login
 */
export function useAuth() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [jwt, setJwt] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = () => {
            const storedJwt = localStorage.getItem("jwt");
            const storedUser = localStorage.getItem("user");
            
            const currentPath = window.location.pathname + window.location.search;
            const isAuthPage = currentPath.startsWith("/login") || currentPath.startsWith("/register");
            
            // 1. ไม่มี Token หรือ 2. Token หมดอายุ
            if (!storedJwt || isTokenExpired(storedJwt)) {
                // เคลียร์ของเก่าทิ้งถ้ามี
                if (storedJwt) {
                    localStorage.removeItem("jwt");
                    localStorage.removeItem("user");
                }
                
                if (!isAuthPage) {
                    const redirectParam = `?redirect=${encodeURIComponent(currentPath)}`;
                    router.push(`/login${redirectParam}`);
                }
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

        // ตรวจสอบทันทีตอนโหลด
        checkAuth();

        // ตรวจสอบเมื่อมีการอัปเดต Storage จากแท็บอื่น
        window.addEventListener("storage", checkAuth);
        
        // ตั้งเวลาตรวจสอบทุกๆ 1 นาที (เผื่อเปิดแท็บทิ้งไว้จนหมดอายุ)
        const intervalId = setInterval(checkAuth, 60 * 1000);

        return () => {
            window.removeEventListener("storage", checkAuth);
            clearInterval(intervalId);
        };
    }, [router]);

    return { user, jwt };
}
