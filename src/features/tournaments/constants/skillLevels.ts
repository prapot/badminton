export interface SkillLevelConfig {
    id: string;
    label: string;
    shortLabel: string;
    description: string;
    icon: string; // Emoji or SVG string
    bgClass: string;
    textClass: string;
    dotClass: string;
    borderClass: string;
}

export const SKILL_LEVELS: SkillLevelConfig[] = [
    {
        id: 'หน้าบ้าน',
        label: 'มือหน้าบ้าน',
        shortLabel: 'หน้าบ้าน',
        description: 'ผู้เล่นทั่วไป / เล่นเพื่อสุขภาพ',
        icon: '🏸',
        bgClass: 'bg-slate-700',
        textClass: 'text-white',
        dotClass: 'bg-slate-400',
        borderClass: 'border-slate-600',
    },
    {
        id: 'BG',
        label: 'Beginner (BG)',
        shortLabel: 'BG',
        description: 'ระดับเริ่มต้น มีพื้นฐานเล็กน้อย',
        icon: 'BG',
        bgClass: 'bg-[#DCFCE7]',
        textClass: 'text-[#166534]',
        dotClass: 'bg-[#22C55E]',
        borderClass: 'border-[#22C55E]/30',
    },
    {
        id: 'N',
        label: 'Novice (N)',
        shortLabel: 'N',
        description: 'พอตีโต้ได้ มีความรู้เบื้องต้น',
        icon: 'N',
        bgClass: 'bg-[#DBEAFE]',
        textClass: 'text-[#1E40AF]',
        dotClass: 'bg-[#3B82F6]',
        borderClass: 'border-[#3B82F6]/30',
    },
    {
        id: 'S',
        label: 'Standard (S)',
        shortLabel: 'S',
        description: 'ฝีมือปานกลาง ตีเกมได้ดี',
        icon: 'S',
        bgClass: 'bg-[#FEF3C7]',
        textClass: 'text-[#92400E]',
        dotClass: 'bg-[#F59E0B]',
        borderClass: 'border-[#F59E0B]/30',
    },
    {
        id: 'P',
        label: 'Pro (P)',
        shortLabel: 'P',
        description: 'ระดับโปร / แข่งขันระดับสูง',
        icon: 'P',
        bgClass: 'bg-[#FFEDD5]',
        textClass: 'text-[#9A3412]',
        dotClass: 'bg-[#F97316]',
        borderClass: 'border-[#F97316]/30',
    }
];

export const getSkillConfig = (skillId: string): SkillLevelConfig => {
    return SKILL_LEVELS.find(s => s.id === skillId) || {
        id: skillId,
        label: `มือ ${skillId}`,
        shortLabel: skillId,
        description: '',
        icon: '🏸',
        bgClass: 'bg-slate-700',
        textClass: 'text-white',
        dotClass: 'bg-slate-400',
        borderClass: 'border-slate-600',
    };
};
