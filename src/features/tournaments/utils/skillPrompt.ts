import Swal from 'sweetalert2';
import { SKILL_LEVELS } from '../constants/skillLevels';

export const promptSkillLevel = async (): Promise<string | null> => {
    // Generate HTML from constants
    const skillOptionsHtml = SKILL_LEVELS.map(skill => `
    <label class="relative cursor-pointer group w-full">
        <input type="radio" name="skillLevel" value="${skill.id}" class="peer sr-only">
        <div class="p-3 sm:p-4 rounded-xl border-2 ${skill.promptClasses ? skill.promptClasses.bg + ' ' + skill.promptClasses.border + ' ' + skill.promptClasses.wrapper : 'border-white/10 bg-white/5 peer-checked:bg-white/10 peer-checked:border-white peer-checked:[&_.check-dot]:border-white peer-checked:[&_.check-dot]:bg-white'} peer-checked:[&_.check-svg]:block hover:border-opacity-50 transition-all flex items-center gap-3 sm:gap-4">
            
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full ${skill.bgClass.includes('slate') ? 'bg-slate-700' : skill.bgClass} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform shrink-0">
                <span class="${skill.textClass} font-bold text-lg sm:text-xl">${skill.icon}</span>
            </div>
            
            <div class="flex flex-col flex-1 min-w-0">
                <span class="${skill.promptClasses ? skill.promptClasses.text : 'text-white'} font-bold text-sm sm:text-base truncate">${skill.label}</span>
                <span class="text-slate-400 sm:${skill.promptClasses ? skill.promptClasses.text : 'text-white'} sm:opacity-60 text-[10px] sm:text-xs truncate mt-0.5">${skill.description}</span>
            </div>
            
            <div class="check-dot w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 ${skill.promptClasses ? skill.promptClasses.dot : 'border-white/30'} flex items-center justify-center shrink-0 transition-colors">
                <svg class="check-svg w-3 h-3 sm:w-3.5 sm:h-3.5 ${skill.promptClasses ? skill.promptClasses.check : 'text-slate-800'} hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
            </div>
            
        </div>
    </label>
    `).join('');

    const htmlStr = `
<div class="flex flex-col gap-2.5 sm:gap-3 mt-2 text-left px-1 max-h-[60vh] overflow-y-auto overflow-x-hidden pb-4">
    ${skillOptionsHtml}
</div>
`;

    const { value: skillLevel } = await Swal.fire({
        title: "เลือกระดับมือของคุณ",
        html: htmlStr,
        showCancelButton: true,
        confirmButtonText: "เข้าร่วม",
        cancelButtonText: "ยกเลิก",
        background: "#1a2535",
        color: "#f1f5f9",
        customClass: {
            popup: 'rounded-2xl border border-white/10 shadow-2xl overflow-hidden !w-[95%] sm:!w-[90%] sm:!max-w-[420px] mx-auto',
            title: 'text-lg sm:text-xl font-bold pt-4 pb-2 px-2',
            htmlContainer: '!m-0',
            confirmButton: '!bg-[#3B82F6] !text-white !rounded-xl !px-5 sm:!px-6 !py-2 sm:!py-2.5 !text-sm sm:!text-base !font-bold hover:!bg-[#2563EB] transition-colors',
            cancelButton: '!bg-slate-700 !text-slate-300 !rounded-xl !px-5 sm:!px-6 !py-2 sm:!py-2.5 !text-sm sm:!text-base !font-bold hover:!bg-slate-600 transition-colors',
            actions: 'pb-4 px-2'
        },
        preConfirm: () => {
            const selected = document.querySelector('input[name="skillLevel"]:checked') as HTMLInputElement;
            if (!selected) {
                Swal.showValidationMessage("กรุณาเลือกระดับมือของคุณ!");
                return false;
            }
            return selected.value;
        }
    });

    return skillLevel || null;
};
