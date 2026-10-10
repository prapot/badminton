const fs = require('fs');

const file = fs.readFileSync('src/features/tournaments/detail-components/EndlessModeManager.tsx', 'utf8');

const compStartMatch = file.match(/export default function EndlessModeManager\([^)]+\) \{/);
const returnMatch = file.match(/(\n\s*return \(\s*<div id="endless-manager")/);

let imports = file.substring(0, compStartMatch.index);
// Remove duplicate imports, add types
imports = imports.replace(/interface ApiPlayer[\s\S]*interface PermanentTeam \{[\s\S]*?\}/, 'import { ApiPlayer, ApiMatch, PermanentTeam, PairingMode } from "../types";\nimport { useEndlessModeManager, UseEndlessModeManagerProps } from "../hooks/useEndlessModeManager";');

let newCompStart = `export default function EndlessModeManager(props: UseEndlessModeManagerProps) {
    const {
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
    } = useEndlessModeManager(props);
`;

let returnJSX = file.substring(returnMatch.index);

fs.writeFileSync('src/features/tournaments/detail-components/EndlessModeManager.tsx', imports + newCompStart + returnJSX);
console.log("Replaced EndlessModeManager!");
