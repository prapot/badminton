const fs = require('fs');

const file = fs.readFileSync('src/features/tournaments/detail-components/EndlessModeManager.tsx', 'utf8');

// Find the start of the component body
const compStartMatch = file.match(/export default function EndlessModeManager\([^)]+\) \{/);
if (!compStartMatch) throw new Error("Component start not found");
const compStart = compStartMatch.index;

// Find the start of the return statement
const returnMatch = file.match(/(\n\s*return \(\s*<div id="endless-manager")/);
if (!returnMatch) throw new Error("Return statement not found");
const returnStart = returnMatch.index;

// Extract the hook logic
let hookLogic = file.substring(compStart + compStartMatch[0].length, returnStart);

// Now we generate useEndlessModeManager.ts
let hookFile = `import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import { ApiPlayer, ApiMatch, PermanentTeam, PairingMode } from "../types"; // We will create this

export interface UseEndlessModeManagerProps {
    tournamentId: string;
    tournamentType: "single" | "double";
    players: ApiPlayer[];
    permanentTeamsData?: any[];
    blockedPartnersData?: Array<{ blockerId: number; blockedId: number }>;
    apiMatches: ApiMatch[];
    jwt: string;
    STRAPI_BASE_URL: string;
    refreshInfo: () => any;
    showToast: (msg: string, type?: "success" | "error") => void;
    pausedPlayerIds: Set<number>;
    setPausedPlayerIds: React.Dispatch<React.SetStateAction<Set<number>>>;
    tournamentStatus: string;
    userId?: number;
    ownerId?: number;
    tournamentMode: string;
}

export function useEndlessModeManager({
    tournamentId,
    tournamentType,
    players,
    permanentTeamsData,
    blockedPartnersData,
    apiMatches,
    jwt,
    STRAPI_BASE_URL,
    refreshInfo,
    showToast,
    pausedPlayerIds,
    setPausedPlayerIds,
    tournamentStatus,
    userId,
    ownerId,
    tournamentMode
}: UseEndlessModeManagerProps) {
${hookLogic}

    return {
        drawing, setDrawing,
        pairingMode, setPairingMode,
        manualTeamA, setManualTeamA,
        manualTeamB, setManualTeamB,
        activeManualTeam, setActiveManualTeam,
        previewMatch, setPreviewMatch,
        selectedSwapPlayer, setSelectedSwapPlayer,
        showPlayerList, setShowPlayerList,
        permanentTeams, setPermanentTeams,
        selectedForNew, setSelectedForNew,
        editingTeamId, setEditingTeamId,
        playersPerTeam,
        busyPlayerIds, actualPlayerCounts, effectivePlayerCounts, lastMatchPlayed,
        availablePlayers, assignedPlayerIds, teamMatchCounts,
        handleTogglePause,
        toggleSelectPlayer,
        saveTeamsToDB,
        addOrUpdateTeam,
        startEditTeam,
        cancelEdit,
        removeTeam,
        getSkillScore,
        calculateNextMatch,
        handleConfirmMatch,
        handleConfirmManualMatch,
        spinnerSvg,
        availableCount,
        totalCount,
        handleEditOffset
    };
}
`;

fs.writeFileSync('src/features/tournaments/hooks/useEndlessModeManager.ts', hookFile);
console.log("Extracted hook!");
