"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginWithStrapi } from "@/lib/auth";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            const data = await loginWithStrapi(email, password);
            // Store JWT in localStorage
            localStorage.setItem("jwt", data.jwt);
            localStorage.setItem("user", JSON.stringify(data.user));
            router.push("/");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f1923]">
            {/* Background: court lines */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Gradient sky */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f1923] via-[#1a2d20] to-[#0f1923]" />
                {/* Court glow */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#2ecc71]/5 rounded-full blur-3xl" />
                {/* Court lines SVG */}
                <svg
                    className="absolute inset-0 w-full h-full opacity-10"
                    viewBox="0 0 800 600"
                    preserveAspectRatio="xMidYMid slice"
                >
                    {/* Outer boundary */}
                    <rect x="100" y="100" width="600" height="400" fill="none" stroke="#2ecc71" strokeWidth="2" />
                    {/* Net line (center) */}
                    <line x1="400" y1="100" x2="400" y2="500" stroke="#2ecc71" strokeWidth="2.5" />
                    {/* Short service lines */}
                    <line x1="100" y1="232" x2="400" y2="232" stroke="#2ecc71" strokeWidth="1.5" />
                    <line x1="400" y1="368" x2="700" y2="368" stroke="#2ecc71" strokeWidth="1.5" />
                    {/* Long service lines (doubles) */}
                    <line x1="130" y1="100" x2="130" y2="500" stroke="#2ecc71" strokeWidth="1" />
                    <line x1="670" y1="100" x2="670" y2="500" stroke="#2ecc71" strokeWidth="1" />
                    {/* Center line */}
                    <line x1="250" y1="232" x2="250" y2="368" stroke="#2ecc71" strokeWidth="1" />
                    <line x1="550" y1="232" x2="550" y2="368" stroke="#2ecc71" strokeWidth="1" />
                </svg>
                {/* Shuttlecock decoration */}
                <div className="absolute top-10 right-16 text-6xl opacity-10 rotate-12 select-none">🏸</div>
                <div className="absolute bottom-16 left-10 text-4xl opacity-10 -rotate-12 select-none">🏸</div>
            </div>

            {/* Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Header */}
                <div className="text-center mb-7">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2ecc71] to-[#27ae60] shadow-lg shadow-green-900/40 mb-4">
                        <span className="text-3xl">🏸</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        Badminton Club hello
                    </h1>
                    <p className="text-green-400/70 text-sm mt-1">
                        เข้าสู่ระบบเพื่อจัดการสนามและการแข่งขัน
                    </p>
                </div>

                {/* Glass card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">
                    {/* Error */}
                    {error && (
                        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                                Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition-all duration-200"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                                    Password
                                </label>
                                <a href="#" className="text-xs text-green-400 hover:text-green-300 transition-colors">
                                    ลืมรหัสผ่าน?
                                </a>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-11 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition-all duration-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 px-4 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] hover:from-[#3de382] hover:to-[#2ecc71] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-lg shadow-green-900/30 transition-all duration-200 flex items-center justify-center gap-2 mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 14.627 0 12 0c-4.418 0-8 3.582-8 8h4z" />
                                    </svg>
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : (
                                "เข้าสู่ระบบ"
                            )}
                        </button>
                    </form>
                </div>

                {/* Register link */}
                <p className="text-center text-sm text-slate-500 mt-5">
                    ยังไม่มีบัญชี?{" "}
                    <Link
                        href="/register"
                        className="text-green-400 hover:text-green-300 font-medium transition-colors"
                    >
                        สมัครสมาชิก
                    </Link>
                </p>
            </div>
        </div>
    );
}
