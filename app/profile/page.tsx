"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";
import Swal from "sweetalert2";

const STRAPI_BASE_URL =
    process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface ProfileForm {
    documentId: string;
    picture: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export default function ProfilePage() {
    const { user, jwt } = useAuth();

    const [form, setForm] = useState<ProfileForm>({
        documentId: "",
        picture: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewObjUrl, setPreviewObjUrl] = useState<string | null>(null);

    // Populate form when user loads
    useEffect(() => {
        if (user) {
            setForm((f) => ({
                ...f,
                username: user.username,
                email: user.email
            }));
            if (user.picture?.url) {
                setPreviewObjUrl(user.picture.url.startsWith("http") ? user.picture.url : `${STRAPI_BASE_URL}${user.picture.url}`);
            }
        }
    }, [user]);

    if (!user) return null;

    const handleSave = async () => {
        if (!jwt) return;

        if (form.password && form.password !== form.confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน");
            return;
        }
        if (form.password && form.password.length < 6) {
            setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            // Upload picture if a new file is selected
            if (file) {
                const formData = new FormData();
                formData.append("files", file);
                const uploadRes = await fetch(`${STRAPI_BASE_URL}/api/profile/upload-picture`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${jwt}` },
                    body: formData,
                });
                if (!uploadRes.ok) throw new Error("อัปโหลดรูปภาพไม่สำเร็จ");
            }

            const payload: Record<string, any> = {
                username: form.username.trim(),
                email: form.email.trim(),
            };
            if (form.password) payload.password = form.password;

            const res = await fetch(`${STRAPI_BASE_URL}/api/profile/update`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ data: payload }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${res.status}`);
            }

            // Fetch populated user to get the new picture url
            const pRes = await fetch(`${STRAPI_BASE_URL}/api/users/me?populate=picture`, {
                headers: { Authorization: `Bearer ${jwt}` }
            });
            const updated = await pRes.json();

            // Update localStorage so Navbar reflects new info
            const stored = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem("user", JSON.stringify({
                ...stored,
                username: updated.username ?? form.username,
                email: updated.email ?? form.email,
                picture: updated.picture ?? stored.picture,
            }));

            Swal.fire({
                title: "สำเร็จ!",
                text: "บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว",
                icon: "success",
                confirmButtonColor: "#2ecc71",
                background: "#1a2535",
                color: "#fff"
            });
            setFile(null);
            setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
            window.dispatchEvent(new Event("storage"));

        } catch (e: unknown) {
            Swal.fire({
                title: "เกิดข้อผิดพลาด",
                text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ",
                icon: "error",
                confirmButtonColor: "#e74c3c",
                background: "#1a2535",
                color: "#fff"
            });
        } finally {
            setSaving(false);
        }
    };

    const initial = user.username.charAt(0).toUpperCase();

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />

            <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white">แก้ไขโปรไฟล์</h1>
                        <p className="text-slate-400 text-xs mt-0.5">อัปเดตข้อมูลส่วนตัวของคุณ</p>
                    </div>
                </div>

                {/* Avatar card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    <div className="relative group h-24 w-24 shrink-0">
                        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#2ecc71] to-[#27ae60] flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-green-900/40 overflow-hidden border-4 border-white/10 relative">
                            {previewObjUrl ? (
                                <img src={previewObjUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                initial
                            )}
                        </div>
                        <label className="absolute -bottom-1 -right-1 w-10 h-10 bg-[#3498db] hover:bg-[#2980b9] text-white flex items-center justify-center rounded-2xl cursor-pointer shadow-xl border-4 border-[#0f1923] transition-all hover:scale-110 active:scale-95 group-hover:animate-bounce">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                    setFile(f);
                                    setPreviewObjUrl(URL.createObjectURL(f));
                                }
                            }} />
                        </label>
                    </div>
                    <div className="text-center sm:text-left mt-2 sm:mt-0">
                        <p className="text-white font-semibold text-lg">{user.username}</p>
                        <p className="text-slate-400 text-sm">{user.email}</p>
                        <p className="text-slate-600 text-xs mt-0.5">ID: {user.id}</p>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                    <h2 className="font-semibold text-white flex items-center gap-2">
                        <span>👤</span> ข้อมูลบัญชี
                    </h2>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            ชื่อผู้ใช้ <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            อีเมล <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                        />
                    </div>
                </div>

                {/* Change password */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                    <h2 className="font-semibold text-white flex items-center gap-2">
                        <span>🔒</span> เปลี่ยนรหัสผ่าน
                        <span className="text-xs text-slate-500 font-normal">(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</span>
                    </h2>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            รหัสผ่านใหม่
                        </label>
                        <input
                            type="password"
                            placeholder="อย่างน้อย 6 ตัวอักษร"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            ยืนยันรหัสผ่านใหม่
                        </label>
                        <input
                            type="password"
                            placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                            value={form.confirmPassword}
                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-slate-500 text-sm focus:outline-none focus:bg-white/8 transition-all ${form.confirmPassword && form.password !== form.confirmPassword
                                ? "border-red-500/50 focus:border-red-500/70"
                                : "border-white/10 focus:border-green-500/50"
                                }`}
                        />
                        {form.confirmPassword && form.password !== form.confirmPassword && (
                            <p className="text-xs text-red-400 mt-1.5">รหัสผ่านไม่ตรงกัน</p>
                        )}
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        ⚠️ {error}
                    </div>
                )}
                {success && (
                    <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                        ✅ บันทึกข้อมูลสำเร็จ
                    </div>
                )}

                {/* Save button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving || !form.username.trim() || !form.email.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] hover:from-[#3de382] hover:to-[#2ecc71] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-900/30"
                    >
                        {saving ? (
                            <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                กำลังบันทึก...
                            </>
                        ) : "💾 บันทึกการเปลี่ยนแปลง"}
                    </button>
                </div>
            </main>
        </div>
    );
}
