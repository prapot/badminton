"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { RegisteredPlayer, BlockedPartnerData } from "../types";

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

export const BlockedPartnerModal: React.FC<BlockedPartnerModalProps> = ({
    isOpen,
    onClose,
    players,
    currentUserId,
    blockedPartner,
    onSave,
    onRemove,
    saving,
}) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState<number | "">("");

    useEffect(() => {
        if (blockedPartner?.blockedId) {
            setSelectedPlayerId(blockedPartner.blockedId);
        } else {
            setSelectedPlayerId("");
        }
    }, [blockedPartner, isOpen]);

    if (!isOpen) return null;

    // Filter players excluding current user
    const eligiblePlayers = players.filter((p) => p.id !== currentUserId);

    const currentBlockedPlayer = blockedPartner?.blockedPlayer ||
        players.find((p) => p.id === blockedPartner?.blockedId);

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg">
                            ⚔️
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-white">โหมดท้าดวล</h3>
                            <p className="text-xs text-slate-400">ระบบจะจัดให้คุณและคู่แข่งอยู่คนละทีมเสมอ</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Privacy Badge */}
                <div className="mx-6 mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start space-x-2.5">
                    <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div className="text-xs text-blue-200/90 leading-relaxed">
                        <span className="font-semibold text-blue-300">เป็นความลับเฉพาะคุณ:</span> ข้อมูลนี้มีเพียงคุณเท่านั้นที่เห็น เพื่อนคู่กรณีจะไม่ทราบ โดยระบบจะจัดให้คุณและผู้เล่นท่านนี้อยู่ <span className="text-amber-300 font-semibold">"คนละทีมเสมอ"</span> เพื่อให้ได้ดวลฝีมือกันข้ามเน็ต!
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Current Block Status if exists */}
                    {blockedPartner ? (
                        <div className="p-4 bg-slate-800/80 border border-indigo-500/30 rounded-xl space-y-3">
                            <div className="text-xs font-medium text-indigo-300 flex items-center space-x-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                                <span>🎯 เป้าหมายท้าดวลของคุณ:</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-700 border border-slate-600 flex items-center justify-center text-sm font-semibold text-slate-300">
                                        {(() => {
                                            const pic = currentBlockedPlayer?.picture;
                                            const url = typeof pic === "string" ? pic : pic?.url;
                                            if (url) {
                                                return (
                                                    <Image
                                                        src={url}
                                                        alt="avatar"
                                                        fill
                                                        className="object-cover"
                                                    />
                                                );
                                            }
                                            return <span>{(currentBlockedPlayer?.nickname || currentBlockedPlayer?.username || "?")[0]?.toUpperCase()}</span>;
                                        })()}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">
                                            {currentBlockedPlayer?.nickname || currentBlockedPlayer?.username || "ผู้เล่นในทัวร์"}
                                        </div>
                                        {currentBlockedPlayer?.nickname && currentBlockedPlayer?.username && (
                                            <div className="text-xs text-slate-400">@{currentBlockedPlayer.username}</div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleRemove}
                                    disabled={saving}
                                    className="px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {saving ? "กำลังยกเลิก..." : "ยกเลิกการท้าดวล"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-slate-300">
                                เลือกเพื่อนที่อยากดวลฝีมือด้วย (สูงสุด 1 คน)
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedPlayerId}
                                    onChange={(e) => setSelectedPlayerId(e.target.value ? Number(e.target.value) : "")}
                                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 appearance-none transition-colors"
                                >
                                    <option value="">-- เลือกเพื่อนร่วมก๊วนที่อยากดวลด้วย --</option>
                                    {eligiblePlayers.map((p) => {
                                        const displayName = p.nickname ? `${p.nickname} (@${p.username})` : p.username;
                                        return (
                                            <option key={p.id} value={p.id}>
                                                {displayName} {p.is_guest ? "(Guest)" : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="text-[11px] text-slate-500 leading-relaxed space-y-1">
                        <div>• เลือกได้ 1 คนเท่านั้น (ระบบจะจัดให้คุณและเพื่อนท่านนี้อยู่คนละทีมเสมอ)</div>
                        <div>• ระบบมีเพดานจำกัด เพื่อรักษาความสมดุลในการจัดคู่ลงสนามของก๊วน</div>
                        <div>• มีผลเฉพาะแมตช์ประเภทคู่ในทัวร์นาเมนต์นี้เท่านั้น</div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-2.5 px-6 py-4 border-t border-slate-800 bg-slate-900/50">
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
                            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center space-x-1.5"
                        >
                            {saving ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>กำลังบันทึก...</span>
                                </>
                            ) : (
                                <span>บันทึกเป้าหมายดวล</span>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
