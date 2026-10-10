import { useState, useMemo } from "react";
import { RegisteredPlayer, BlockedPartnerData, BlockedPartnerPlayer } from "../types";

type DisplayPlayer = RegisteredPlayer | BlockedPartnerPlayer;

export const useBlockedPartnerModal = (
    players: RegisteredPlayer[],
    currentUserId?: number,
    blockedPartner?: BlockedPartnerData | null
) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState<number | "">(() => blockedPartner?.blockedId ?? "");
    const [searchQuery, setSearchQuery] = useState<string>("");

    const eligiblePlayers = useMemo(() => {
        return players.filter((p) => p.id !== currentUserId);
    }, [players, currentUserId]);

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

    return {
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
    };
};
