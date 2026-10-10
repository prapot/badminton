import React from "react";
import { RegisteredPlayer } from "../../types";
import { PlayerAvatar } from "./PlayerAvatar";
import SkillBadge from "../SkillBadge";
import RankBadge from "../RankBadge";

interface PlayerSelectCardProps {
    player: RegisteredPlayer;
    isSelected: boolean;
    onSelect: () => void;
}

export const PlayerSelectCard: React.FC<PlayerSelectCardProps> = ({
    player,
    isSelected,
    onSelect,
}) => {
    const displayName = player.nickname || player.username;
    const subName = player.nickname ? `@${player.username}` : null;

    return (
        <div
            onClick={onSelect}
            className={`group relative flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] ${
                isSelected
                    ? "bg-gradient-to-r from-rose-950/50 via-slate-800 to-indigo-950/40 border-rose-500 shadow-md shadow-rose-950/40 ring-1 ring-rose-500/50"
                    : "bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 hover:border-slate-600"
            }`}
        >
            <div className="flex items-center space-x-3 min-w-0 mr-2">
                <div className="relative">
                    <PlayerAvatar player={player} size="w-10 h-10" />
                    {isSelected && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] text-white shadow">
                            🎯
                        </div>
                    )}
                </div>

                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm font-semibold truncate ${isSelected ? "text-white" : "text-slate-200 group-hover:text-white"}`}>
                            {displayName}
                        </span>
                        {player.is_guest && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                Guest
                            </span>
                        )}
                        {player.skill_level && (
                            <SkillBadge skillLevel={player.skill_level} className="text-[9px] py-0 px-1.5" />
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                        {subName && (
                            <span className="text-[11px] text-slate-400 truncate">
                                {subName}
                            </span>
                        )}
                        {player.rankings?.[0]?.rank && (
                            <RankBadge
                                rank={player.rankings[0].rank}
                                stars={player.rankings[0].stars}
                                size="sm"
                                showName={false}
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="shrink-0 pl-2">
                {isSelected ? (
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                        <span>⚔️</span>
                        <span>เป้าหมาย</span>
                    </div>
                ) : (
                    <div className="w-6 h-6 rounded-full border border-slate-600 group-hover:border-slate-500 flex items-center justify-center text-transparent group-hover:text-slate-500 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-slate-600/40 group-hover:bg-slate-500" />
                    </div>
                )}
            </div>
        </div>
    );
};
