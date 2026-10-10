import React from "react";
import { RegisteredPlayer, BlockedPartnerPlayer } from "../../types";
import { PlayerAvatar } from "./PlayerAvatar";
import SkillBadge from "../SkillBadge";
import RankBadge from "../RankBadge";

type DisplayPlayer = RegisteredPlayer | BlockedPartnerPlayer;

interface ActiveRivalryViewProps {
    currentBlockedPlayer?: DisplayPlayer;
    blockedSkillLevel?: string;
    blockedRankings?: any[] | null;
    onRemove: () => void;
    saving: boolean;
}

export const ActiveRivalryView: React.FC<ActiveRivalryViewProps> = ({
    currentBlockedPlayer,
    blockedSkillLevel,
    blockedRankings,
    onRemove,
    saving,
}) => (
    <div className="space-y-4">
        <div className="p-4 bg-gradient-to-br from-slate-800/90 to-slate-850 border border-rose-500/40 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-rose-300 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
                    <span>🎯 เป้าหมายท้าดวลปัจจุบัน</span>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-full border border-slate-700">
                    ล็อคอยู่คนละทีม
                </span>
            </div>

            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className="relative">
                        <PlayerAvatar player={currentBlockedPlayer} size="w-12 h-12" />
                        <span className="absolute -bottom-1 -right-1 text-xs">⚔️</span>
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-white truncate">
                                {currentBlockedPlayer?.nickname || currentBlockedPlayer?.username || "ผู้เล่นในทัวร์"}
                            </span>
                            {blockedSkillLevel && (
                                <SkillBadge skillLevel={blockedSkillLevel} className="text-[9px] py-0 px-1.5" />
                            )}
                        </div>
                        {currentBlockedPlayer?.nickname && currentBlockedPlayer?.username && (
                            <div className="text-xs text-slate-400 truncate">@{currentBlockedPlayer.username}</div>
                        )}
                        {blockedRankings?.[0]?.rank && (
                            <div className="mt-1">
                                <RankBadge
                                    rank={blockedRankings[0].rank}
                                    stars={blockedRankings[0].stars}
                                    size="sm"
                                    showName={true}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={onRemove}
                    disabled={saving}
                    className="shrink-0 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:text-rose-100 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl transition-all disabled:opacity-50 active:scale-95 flex items-center space-x-1"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>{saving ? "กำลังยกเลิก..." : "ยกเลิกท้าดวล"}</span>
                </button>
            </div>
        </div>
    </div>
);
