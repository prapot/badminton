"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { RegisteredPlayer, BlockedPartnerData, BlockedPartnerPlayer } from "../types";
import SkillBadge from "./SkillBadge";
import RankBadge from "./RankBadge";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

type DisplayPlayer = RegisteredPlayer | BlockedPartnerPlayer;

interface BlockedPartnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    players: RegisteredPlayer[];
    currentUserId?: number;
    blockedPartner: BlockedPartnerData | null;
    onSave: (targetPlayerId: number) => Promise<boolean>;
    onRemove: () => Promise<boolean>;
    saving: boolean;
}

const BlockedPartnerModalContent: React.FC<BlockedPartnerModalProps> = ({
    onClose,
    players,
    currentUserId,
    blockedPartner,
    onSave,
    onRemove,
    saving,
}) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState<number | "">(() => blockedPartner?.blockedId ?? "");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Filter players excluding current user
    const eligiblePlayers = useMemo(() => {
        return players.filter((p) => p.id !== currentUserId);
    }, [players, currentUserId]);

    // Search filter
    const filteredPlayers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return eligiblePlayers;
        return eligiblePlayers.filter((p) => {
            const username = (p.username || "").toLowerCase();
            const nickname = (p.nickname || "").toLowerCase();
            const guestName = (p.guest_name || "").toLowerCase();
            return username.includes(query) || nickname.includes(query) || guestName.includes(query);
        });
    }, [eligiblePlayers, searchQuery]);

    const blockedInPlayers = players.find((p) => p.id === blockedPartner?.blockedId);
    const currentBlockedPlayer: DisplayPlayer | undefined = blockedInPlayers || blockedPartner?.blockedPlayer || undefined;
    const blockedSkillLevel = blockedInPlayers?.skill_level;
    const blockedRankings = blockedInPlayers?.rankings;

    const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

    const handleSave = async () => {
        if (!selectedPlayerId || typeof selectedPlayerId !== "number") return;
        const success = await onSave(selectedPlayerId);
        if (success) {
            onClose();
        }
    };

    const handleRemove = async () => {
        const success = await onRemove();
        if (success) {
            setSelectedPlayerId("");
            onClose();
        }
    };

    const getAvatarUrl = (picture?: { url: string } | string | null) => {
        if (!picture) return null;
        const url = typeof picture === "string" ? picture : picture.url;
        if (!url) return null;
        return url.startsWith("http") ? url : `${STRAPI_BASE_URL}${url}`;
    };

    const renderAvatar = (player?: DisplayPlayer, size = "w-10 h-10") => {
        const url = getAvatarUrl(player?.picture);
        const guestName = "guest_name" in (player || {}) ? (player as RegisteredPlayer).guest_name : undefined;
        const initial = (player?.nickname || player?.username || guestName || "?")[0]?.toUpperCase();

        if (url) {
            return (
                <div className={`relative ${size} rounded-full overflow-hidden shrink-0 border border-slate-600/80 bg-slate-800 shadow-sm`}>
                    <Image
                        src={url}
                        alt={player?.username || "avatar"}
                        fill
                        className="object-cover"
                    />
                </div>
            );
        }

        return (
            <div className={`relative ${size} rounded-full shrink-0 flex items-center justify-center font-bold text-xs text-white bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 border border-white/20 shadow-inner`}>
                {initial}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-lg bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all text-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-indigo-500/20 border border-rose-500/30 flex items-center justify-center text-xl shadow-inner">
                            ⚔️
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-white tracking-wide">โหมดท้าดวล</h3>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                                    Rivalry
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">จัดให้คุณและคู่แข่งอยู่คนละทีมเสมอ</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Privacy Badge */}
                <div className="px-5 pt-3 pb-1 shrink-0">
                    <div className="p-2.5 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl flex items-start space-x-2.5">
                        <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <div className="text-[11px] text-blue-200/90 leading-relaxed">
                            <span className="font-semibold text-blue-300">เป็นความลับเฉพาะคุณ:</span> ข้อมูลนี้มีเพียงคุณเท่านั้นที่เห็น เพื่อนคู่กรณีจะไม่ทราบ โดยระบบจะจัดให้คุณและผู้เล่นท่านนี้อยู่ <span className="text-amber-300 font-bold">&ldquo;คนละทีมเสมอ&rdquo;</span> ทุกแมตช์
                        </div>
                    </div>
                </div>

                {/* Body (Scrollable) */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                    {/* Mode 1: Already has a duel target */}
                    {blockedPartner ? (
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
                                            {renderAvatar(currentBlockedPlayer, "w-12 h-12")}
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
                                        onClick={handleRemove}
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
                    ) : (
                        /* Mode 2: Select a player to duel */
                        <div className="space-y-3">
                            {/* Search bar & count */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                                        <span>เลือกเพื่อนที่อยากดวลฝีมือด้วย</span>
                                        <span className="text-[11px] text-slate-400 font-normal">(สูงสุด 1 คน)</span>
                                    </label>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        {filteredPlayers.length} / {eligiblePlayers.length} คน
                                    </span>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="ค้นหาชื่อผู้เล่น หรือชื่อเล่น..."
                                        className="w-full pl-9 pr-9 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/50 transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery("")}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Player Cards List */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {filteredPlayers.length === 0 ? (
                                    <div className="text-center py-8 px-4 bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
                                        <div className="text-2xl mb-1.5">🔍</div>
                                        <p className="text-xs text-slate-300 font-medium">ไม่พบเพื่อนร่วมก๊วนที่ตรงกับคำค้นหา</p>
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery("")}
                                                className="mt-2 text-xs text-rose-400 hover:underline"
                                            >
                                                ล้างคำค้นหา
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    filteredPlayers.map((player) => {
                                        const isSelected = selectedPlayerId === player.id;
                                        const displayName = player.nickname || player.username;
                                        const subName = player.nickname ? `@${player.username}` : null;

                                        return (
                                            <div
                                                key={player.id}
                                                onClick={() => setSelectedPlayerId(isSelected ? "" : player.id)}
                                                className={`group relative flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] ${
                                                    isSelected
                                                        ? "bg-gradient-to-r from-rose-950/50 via-slate-800 to-indigo-950/40 border-rose-500 shadow-md shadow-rose-950/40 ring-1 ring-rose-500/50"
                                                        : "bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 hover:border-slate-600"
                                                }`}
                                            >
                                                {/* Left: Avatar + Names */}
                                                <div className="flex items-center space-x-3 min-w-0 mr-2">
                                                    <div className="relative">
                                                        {renderAvatar(player, "w-10 h-10")}
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

                                                {/* Right: Selection Radio / Indicator */}
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
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Rules note */}
                    <div className="text-[11px] text-slate-400/90 leading-relaxed space-y-1 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-start gap-1.5">
                            <span className="text-rose-400 font-bold">•</span>
                            <span>เลือกได้ 1 คนเท่านั้น (ระบบจะจัดให้คุณและเพื่อนท่านนี้อยู่คนละทีมเสมอ)</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <span className="text-indigo-400 font-bold">•</span>
                            <span>ระบบมีเพดานจำกัด เพื่อรักษาความสมดุลในการจัดคู่ลงสนามของก๊วน</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>มีผลเฉพาะแมตช์ประเภทคู่ในทัวร์นาเมนต์นี้เท่านั้น</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 shrink-0">
                    <div>
                        {!blockedPartner && selectedPlayer && (
                            <div className="text-xs flex items-center gap-1.5 text-slate-300">
                                <span>เป้าหมาย:</span>
                                <span className="font-bold text-rose-300 truncate max-w-[140px] sm:max-w-[200px]">
                                    {selectedPlayer.nickname || selectedPlayer.username}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            ปิด
                        </button>
                        {!blockedPartner && (
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!selectedPlayerId || saving}
                                className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-lg shadow-rose-950/40 transition-all flex items-center space-x-1.5"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>กำลังบันทึก...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>⚔️</span>
                                        <span>ยืนยันการท้าดวล</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const BlockedPartnerModal: React.FC<BlockedPartnerModalProps> = (props) => {
    if (!props.isOpen) return null;
    return <BlockedPartnerModalContent key={props.blockedPartner?.blockedId ?? "open"} {...props} />;
};
