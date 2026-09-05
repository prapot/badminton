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
            "flex items-center gap-1.5 text-[10px] pr-2 pl-1 py-0.5 rounded-full font-extrabold whitespace-nowrap shadow-sm border border-black/5",
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
