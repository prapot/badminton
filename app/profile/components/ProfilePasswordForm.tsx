import React from "react";
import { ProfileFormState } from "../types";

interface Props {
    form: ProfileFormState;
    setForm: React.Dispatch<React.SetStateAction<ProfileFormState>>;
}

export function ProfilePasswordForm({ form, setForm }: Props) {
    return (
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
    );
}
