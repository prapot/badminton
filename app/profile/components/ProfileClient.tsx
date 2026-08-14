"use client";

import Navbar from "@/components/Navbar";
import { useProfileData } from "../hooks/useProfileData";
import { useProfileForm } from "../hooks/useProfileForm";

import { ProfileHeader } from "./ProfileHeader";
import { ProfileAvatarCard } from "./ProfileAvatarCard";
import { ProfileAccountForm } from "./ProfileAccountForm";
import { ProfilePasswordForm } from "./ProfilePasswordForm";

export function ProfileClient() {
    const { user, jwt, userRanking, initialPictureUrl } = useProfileData();
    const { 
        form, 
        setForm, 
        saving, 
        success, 
        error, 
        previewObjUrl, 
        handleFileChange, 
        handleSave 
    } = useProfileForm(user, jwt, initialPictureUrl);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />

            <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                <ProfileHeader />

                <ProfileAvatarCard 
                    user={user}
                    userRanking={userRanking}
                    previewObjUrl={previewObjUrl}
                    onFileChange={handleFileChange}
                />

                <ProfileAccountForm form={form} setForm={setForm} />

                <ProfilePasswordForm form={form} setForm={setForm} />

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
