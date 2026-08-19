import { PlayerType, TournamentFormat, TournamentMode } from "./types";

export interface FormData {
    name: string;
    type: PlayerType;
    format: TournamentFormat;
    startDate: string;
    mode: TournamentMode;
}

export const typeOptions: { value: PlayerType; label: string; desc: string; icon: string }[] = [
    { value: "single", label: "เดี่ยว (Single)", desc: "ผู้เล่น 1 คน ต่อ 1 ทีม", icon: "🏸" },
    { value: "double", label: "คู่ (Double)", desc: "ผู้เล่น 2 คน ต่อ 1 ทีม", icon: "👥" },
];

export const formatOptions: { value: TournamentFormat; label: string; desc: string; icon: string; disabled?: boolean }[] = [
    { value: "endless_mode", label: "โหมดไร้สิ้นสุด (Endless Mode)", desc: "สุ่มจบคู่แข่งทีละคู่ไปเรื่อยๆ โดยเฉลี่ยการเล่นให้เท่ากัน", icon: "♾️" },
    { value: "round_robin", label: "พบกันหมด (Round Robin)", desc: "ทุกคนแข่งกับทุกคน คิดคะแนนรวม", icon: "🔄", disabled: true },
    { value: "knockout", label: "แพ้คัดออก (Knockout)", desc: "แพ้ปุ๊บตกรอบทันที", icon: "⚡", disabled: true },
    { value: "americano", label: "อเมริกาโน (Americano)", desc: "สลับคู่แข่งทุกเซต คิดคะแนนสะสมส่วนตัว", icon: "🌀", disabled: true },
];

export const modeOptions: { value: TournamentMode; label: string; desc: string; icon: string; color: string }[] = [
    { value: "ranking", label: "Ranking", desc: "บันทึก RP และสถิติผู้เล่น ใช้คัดอันดับ", icon: "🏆", color: "from-yellow-500/10 to-amber-500/10 border-yellow-500/30 ring-yellow-500/20 text-yellow-300" },
    { value: "casual", label: "Casual", desc: "ไม่บันทึกสถิติ เล่นสนุกๆ ไม่กระทบ RP", icon: "🎮", color: "from-blue-500/10 to-cyan-500/10 border-blue-500/30 ring-blue-500/20 text-blue-300" },
    { value: "party", label: "Party", desc: "โหมดปาร์ตี้ พิมพ์ชื่อผู้เล่นเอง ไม่บันทึกสถิติข้ามงาน", icon: "🎉", color: "from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/30 ring-fuchsia-500/20 text-fuchsia-300" },
];
