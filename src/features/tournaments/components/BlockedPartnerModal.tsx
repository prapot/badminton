"use client";

import React from "react";
import { RegisteredPlayer, BlockedPartnerData } from "../types";
import { useBlockedPartnerModal } from "../hooks/useBlockedPartnerModal";
import { ActiveRivalryView } from "./BlockedPartner/ActiveRivalryView";
import { PlayerSelectCard } from "./BlockedPartner/PlayerSelectCard";

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
    const {
        selectedPlayerId,
        setSelectedPlayerId,
        searchQuery,
        setSearchQuery,
        eligiblePlayers,
        filteredPlayers,
        currentBlockedPlayer,
        blockedSkillLevel,
        blockedRankings,
        selectedPlayer,
    } = useBlockedPartnerModal(players, currentUserId, blockedPartner);

    const handleSave = async () => {
        if (!selectedPlayerId || typeof selectedPlayerId !== "number") return;
        const success = await onSave(selectedPlayerId);
        if (success) onClose();
    };

    const handleRemove = async () => {
        const success = await onRemove();
        if (success) {
            setSelectedPlayerId("");
            onClose();
        }
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
                    {blockedPartner ? (
                        <ActiveRivalryView 
                            currentBlockedPlayer={currentBlockedPlayer}
                            blockedSkillLevel={blockedSkillLevel}
                            blockedRankings={blockedRankings}
                            onRemove={handleRemove}
                            saving={saving}
                        />
                    ) : (
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
                                    filteredPlayers.map((player) => (
                                        <PlayerSelectCard 
                                            key={player.id}
                                            player={player}
                                            isSelected={selectedPlayerId === player.id}
                                            onSelect={() => setSelectedPlayerId(selectedPlayerId === player.id ? "" : player.id)}
                                        />
                                    ))
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
