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
    promptClasses?: {
        bg: string;
        border: string;
        dot: string;
        text: string;
        check: string;
        wrapper: string;
    };
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
        promptClasses: {
            bg: 'bg-slate-800/50 peer-checked:bg-slate-700/80',
            border: 'border-slate-700 peer-checked:border-slate-400',
            dot: 'border-slate-600',
            text: 'text-white',
            check: 'text-slate-800',
            wrapper: 'peer-checked:[&_.check-dot]:border-white peer-checked:[&_.check-dot]:bg-white'
        }
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
        promptClasses: {
            bg: 'bg-[#DCFCE7]/5 peer-checked:bg-[#DCFCE7]/10',
            border: 'border-[#22C55E]/30 peer-checked:border-[#22C55E]',
            dot: 'border-[#22C55E]/30',
            text: 'text-[#22C55E]',
            check: 'text-white',
            wrapper: 'peer-checked:[&_.check-dot]:border-[#22C55E] peer-checked:[&_.check-dot]:bg-[#22C55E]'
        }
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
        promptClasses: {
            bg: 'bg-[#DBEAFE]/5 peer-checked:bg-[#DBEAFE]/10',
            border: 'border-[#3B82F6]/30 peer-checked:border-[#3B82F6]',
            dot: 'border-[#3B82F6]/30',
            text: 'text-[#3B82F6]',
            check: 'text-white',
            wrapper: 'peer-checked:[&_.check-dot]:border-[#3B82F6] peer-checked:[&_.check-dot]:bg-[#3B82F6]'
        }
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
        promptClasses: {
            bg: 'bg-[#FEF3C7]/5 peer-checked:bg-[#FEF3C7]/10',
            border: 'border-[#F59E0B]/30 peer-checked:border-[#F59E0B]',
            dot: 'border-[#F59E0B]/30',
            text: 'text-[#F59E0B]',
            check: 'text-white',
            wrapper: 'peer-checked:[&_.check-dot]:border-[#F59E0B] peer-checked:[&_.check-dot]:bg-[#F59E0B]'
        }
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
        promptClasses: {
            bg: 'bg-[#FFEDD5]/5 peer-checked:bg-[#FFEDD5]/10',
            border: 'border-[#F97316]/30 peer-checked:border-[#F97316]',
            dot: 'border-[#F97316]/30',
            text: 'text-[#F97316]',
            check: 'text-white',
            wrapper: 'peer-checked:[&_.check-dot]:border-[#F97316] peer-checked:[&_.check-dot]:bg-[#F97316]'
        }
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
