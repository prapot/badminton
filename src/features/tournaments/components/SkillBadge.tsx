import React from 'react';
import { getSkillConfig } from '../constants/skillLevels';
import { cn } from '@/shared/utils/utils';

interface SkillBadgeProps {
    skillLevel?: string;
    showLabel?: boolean;
    className?: string;
}

export default function SkillBadge({ skillLevel, showLabel = true, className }: SkillBadgeProps) {
    if (!skillLevel) return null;

    const config = getSkillConfig(skillLevel);

    return (
        <span className={cn(
            "flex items-center text-[10px] rounded-full font-extrabold whitespace-nowrap shadow-sm border border-black/5 justify-center",
            showLabel ? "gap-1.5 pr-2 pl-1 py-0.5" : "p-0.5 aspect-square",
            config.bgClass,
            config.textClass,
            className
        )}>
            <span className={cn(
                "w-4 h-4 rounded-full text-white flex items-center justify-center shadow-sm text-[8px] leading-none tracking-tighter",
                config.dotClass
            )}>
                {config.icon}
            </span>
            {showLabel && (
                <span>
                    {config.shortLabel === 'หน้าบ้าน' ? config.label : `มือ ${config.shortLabel}`}
                </span>
            )}
        </span>
    );
}
