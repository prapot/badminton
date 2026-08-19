"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface User {
    id: number;
    username: string;
    email: string;
    picture?: { url: string } | null;
}



export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const navLinks = [
        { href: "/", label: "หน้าหลัก", icon: "🏠" },
        { href: "/ranking", label: "อันดับ", icon: "🏆" },
        { href: "/tournament", label: "ตารางแข่ง", icon: "🎯" },
        { href: "/profile", label: "โปรไฟล์", icon: "👤" },
        ...(user ? [{ href: `/history/${user.id}`, label: "ประวัติการแข่งขัน", icon: "📜" }] : []),
    ];

    const updateUserData = () => {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
    };

    useEffect(() => {
        updateUserData();
        window.addEventListener("storage", updateUserData);
        return () => window.removeEventListener("storage", updateUserData);
    }, []);

    // Close drawer on route change
    useEffect(() => {
        setDrawerOpen(false);
    }, [pathname]);

    // Lock body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = drawerOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [drawerOpen]);

    // Close on Escape key
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");
        router.push("/login");
    };

    return (
        <>
            {/* ─── Top Navbar ─── */}
            <nav className="border-b border-white/10 bg-[#0f1923]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    {/* Left: Hamburger (mobile) + Logo */}
                    <div className="flex items-center gap-3">
                        {/* Hamburger — visible on mobile only */}
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="sm:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-white/10 transition-colors gap-[5px]"
                            aria-label="เปิดเมนู"
                        >
                            <span className="block w-5 h-0.5 bg-slate-300 rounded-full" />
                            <span className="block w-5 h-0.5 bg-slate-300 rounded-full" />
                            <span className="block w-5 h-0.5 bg-slate-300 rounded-full" />
                        </button>

                        <Link href="/" className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-lg">
                                🏸
                            </div>
                            <span className="font-bold text-white text-lg tracking-tight">Badminton Club</span>
                        </Link>

                        {/* Desktop nav links */}
                        <div className="hidden sm:flex items-center gap-1 text-sm ml-3">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`px-3 py-1.5 rounded-lg transition-colors ${pathname === link.href
                                        ? "text-white bg-white/10 font-medium"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2">
                        {user && (
                            <span className="text-sm text-slate-400 hidden sm:block mr-2">
                                สวัสดี, <span className="text-white font-medium">{user.username}</span>
                            </span>
                        )}
                        {/* Profile button */}
                        <Link
                            href="/profile"
                            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#2ecc71] to-[#27ae60] text-white font-bold text-sm hover:from-[#3de382] hover:to-[#2ecc71] transition-all shadow-md shadow-green-900/20 overflow-hidden border border-white/10"
                            title="แก้ไขโปรไฟล์"
                        >
                            {user?.picture?.url ? (
                                <Image src={user.picture.url.startsWith("http") ? user.picture.url : `${process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337"}${user.picture.url}`} alt={user.username} width={32} height={32} className="w-full h-full object-cover" />
                            ) : (
                                user ? user.username.charAt(0).toUpperCase() : "?"
                            )}
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="hidden sm:flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            </nav>

            {/* ─── Mobile Sidebar ─── */}

            {/* Backdrop */}
            <div
                onClick={() => setDrawerOpen(false)}
                className={`sm:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
            />

            {/* Drawer panel */}
            <aside
                className={`sm:hidden fixed top-0 left-0 h-full w-72 z-[70] bg-[#131e2b] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-lg">
                            🏸
                        </div>
                        <span className="font-bold text-white tracking-tight">Badminton Club</span>
                    </div>
                    <button
                        onClick={() => setDrawerOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="ปิดเมนู"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* User info card */}
                {user && (
                    <div className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/15 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden border border-white/20">
                                {user.picture?.url ? (
                                    <Image src={user.picture.url.startsWith("http") ? user.picture.url : `${process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337"}${user.picture.url}`} alt={user.username} width={40} height={40} className="w-full h-full object-cover" />
                                ) : (
                                    user.username.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Nav links */}
                <nav className="flex-1 px-4 mt-5 space-y-1">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-2">
                        เมนูหลัก
                    </p>
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${pathname === link.href
                                ? "bg-gradient-to-r from-green-500/20 to-emerald-500/10 text-white border border-green-500/20"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                } truncate shadow-sm`}
                        >
                            <span className="text-base shrink-0">{link.icon}</span>
                            <span className="truncate">{link.label}</span>
                            {pathname === link.href && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Logout at bottom */}
                <div className="px-4 pb-6 shrink-0">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:text-white hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-150"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        ออกจากระบบ
                    </button>
                </div>
            </aside>
        </>
    );
}
