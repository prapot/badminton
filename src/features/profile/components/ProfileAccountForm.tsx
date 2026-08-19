import React from "react";
import { ProfileFormState } from "../types";

interface Props {
    form: ProfileFormState;
    setForm: React.Dispatch<React.SetStateAction<ProfileFormState>>;
}

export function ProfileAccountForm({ form, setForm }: Props) {
    return (
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
    );
}
