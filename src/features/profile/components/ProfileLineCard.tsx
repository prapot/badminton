import Swal from "sweetalert2";
import { useLineLink } from "../hooks/useLineLink";
import { LineIcon } from "@/features/auth/line-components/LineIcon";

interface Props {
    jwt: string | null;
}

export function ProfileLineCard({ jwt }: Props) {
    const { status, busy, error, link, unlink } = useLineLink(jwt);

    const confirmUnlink = async () => {
        const result = await Swal.fire({
            icon: "warning",
            title: "ยกเลิกการเชื่อมต่อ LINE?",
            text: "หลังยกเลิกจะเข้าสู่ระบบด้วย LINE ไม่ได้ จนกว่าจะเชื่อมต่อใหม่",
            showCancelButton: true,
            confirmButtonText: "ยกเลิกการเชื่อมต่อ",
            cancelButtonText: "ไม่ใช่ตอนนี้",
            confirmButtonColor: "#ef4444",
            background: "#1e293b",
            color: "#fff",
        });
        if (result.isConfirmed) unlink();
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
                <span>💬</span> เชื่อมต่อ LINE
            </h2>

            {!status ? (
                <p className="text-sm text-slate-500">{error ?? "กำลังโหลด..."}</p>
            ) : status.linked ? (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-slate-300">
                        ✅ เชื่อมต่อแล้ว{status.displayName && <> กับ <span className="text-white font-medium">{status.displayName}</span></>}
                    </p>
                    <button
                        type="button"
                        onClick={confirmUnlink}
                        disabled={busy}
                        className="px-4 py-2 text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-40"
                    >
                        ยกเลิกการเชื่อมต่อ
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-slate-400">เชื่อมต่อแล้วเข้าสู่ระบบด้วย LINE ได้ ไม่ต้องจำรหัสผ่าน</p>
                    <button
                        type="button"
                        onClick={link}
                        className="flex items-center gap-2 px-4 py-2 bg-[#06C755] hover:bg-[#05b34c] text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                        <LineIcon className="w-4 h-4" />
                        เชื่อมต่อ LINE
                    </button>
                </div>
            )}

            {status && error && <p className="text-xs text-red-400">⚠️ {error}</p>}
        </div>
    );
}
