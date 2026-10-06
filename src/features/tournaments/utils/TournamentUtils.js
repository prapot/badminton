"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANK_TIERS = void 0;
exports.calcStandings = calcStandings;
exports.calculateExpectedRpChange = calculateExpectedRpChange;
exports.gcd = gcd;
exports.lcm = lcm;
exports.getPartnerRepeats = getPartnerRepeats;
exports.getMaxStarsForRank = getMaxStarsForRank;
exports.getRankInfoFromPoints = getRankInfoFromPoints;
function calcStandings(players, matches, round) {
    var map = {};
    players.forEach(function (p) { map[p] = { name: p, won: 0, lost: 0, pts: 0, sumFor: 0, sumAgainst: 0 }; });
    matches.filter(function (m) { return m.round === round && m.status === "done" && m.score1 !== null && m.score2 !== null; }).forEach(function (m) {
        var s1 = m.score1, s2 = m.score2;
        if (s1 > s2) {
            map[m.player1].won++;
            map[m.player1].pts += 3;
            map[m.player2].lost++;
        }
        else {
            map[m.player2].won++;
            map[m.player2].pts += 3;
            map[m.player1].lost++;
        }
        map[m.player1].sumFor += s1;
        map[m.player1].sumAgainst += s2;
        map[m.player2].sumFor += s2;
        map[m.player2].sumAgainst += s1;
    });
    return Object.values(map).sort(function (a, b) { return b.pts - a.pts || (b.sumFor - b.sumAgainst) - (a.sumFor - a.sumAgainst); });
}
function calculateExpectedRpChange(teamARp, teamBRp) {
    var defaultRp = 0;
    var aRp = teamARp !== null && teamARp !== void 0 ? teamARp : defaultRp;
    var bRp = teamBRp !== null && teamBRp !== void 0 ? teamBRp : defaultRp;
    var K = 32;
    var expectedAWins = 1 / (1 + Math.pow(10, (bRp - aRp) / 400));
    var expectedBWins = 1 / (1 + Math.pow(10, (aRp - bRp) / 400));
    var movMultiplier = Math.log(2);
    var aWinChange = Math.round(K * movMultiplier * (1 - expectedAWins));
    var aLoseChange = Math.round(K * movMultiplier * (1 - expectedBWins));
    var bWinChange = Math.round(K * movMultiplier * (1 - expectedBWins));
    var bLoseChange = Math.round(K * movMultiplier * (1 - expectedAWins));
    return { aWins: aWinChange, aLoses: aLoseChange, bWins: bWinChange, bLoses: bLoseChange };
}
function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}
function lcm(a, b) {
    if (a === 0 || b === 0)
        return 0;
    return Math.abs(a * b) / gcd(a, b);
}
function getPartnerRepeats(playerIds, currentPairIdx, matches, drawnPairs) {
    var count = 0;
    // Check in past matches (API)
    matches.filter(function (m) { return m.match_status !== 'cancelled'; }).forEach(function (m) {
        var _a, _b;
        var teamAIds = ((_a = m.team_a_id) === null || _a === void 0 ? void 0 : _a.team_players.map(function (tp) { var _a; return (_a = tp.user_id) === null || _a === void 0 ? void 0 : _a.id; }).filter(Boolean)) || [];
        var teamBIds = ((_b = m.team_b_id) === null || _b === void 0 ? void 0 : _b.team_players.map(function (tp) { var _a; return (_a = tp.user_id) === null || _a === void 0 ? void 0 : _a.id; }).filter(Boolean)) || [];
        if (playerIds.every(function (id) { return teamAIds.includes(id); }) && playerIds.length === teamAIds.length)
            count++;
        if (playerIds.every(function (id) { return teamBIds.includes(id); }) && playerIds.length === teamBIds.length)
            count++;
    });
    // Check in previously drawn pairs in this session
    drawnPairs.slice(0, currentPairIdx).forEach(function (dp) {
        var _a;
        var teamAIds = dp.teamA.map(function (p) { return p.id; });
        var teamBIds = ((_a = dp.teamB) === null || _a === void 0 ? void 0 : _a.map(function (p) { return p.id; })) || [];
        if (playerIds.every(function (id) { return teamAIds.includes(id); }) && playerIds.length === teamAIds.length)
            count++;
        if (playerIds.every(function (id) { return teamBIds.includes(id); }) && playerIds.length === teamBIds.length)
            count++;
    });
    return count;
}
exports.RANK_TIERS = [
    { name: 'Bronze', divisions: 3, starsPerDiv: 3 },
    { name: 'Silver', divisions: 3, starsPerDiv: 3 },
    { name: 'Gold', divisions: 3, starsPerDiv: 3 },
    { name: 'Platinum', divisions: 3, starsPerDiv: 3 },
    { name: 'Diamond', divisions: 3, starsPerDiv: 3 },
    { name: 'Master', divisions: 1, starsPerDiv: 99999 }
];
function getMaxStarsForRank(rankName) {
    if (!rankName)
        return 3;
    var lower = rankName.toLowerCase();
    var tier = exports.RANK_TIERS.find(function (t) { return lower.includes(t.name.toLowerCase()); });
    if (!tier || tier.name === 'Master')
        return 0;
    return 3;
}
function getRankInfoFromPoints(points, options) {
    var isLoss = (options === null || options === void 0 ? void 0 : options.isLoss) === true;
    var DIVS = ['V', 'IV', 'III', 'II', 'I'];
    var p = Math.max(0, points);
    // Each non-Master division corresponds to 300 points (3 stars)
    var pointsPerDiv = 300;
    var standardTiers = exports.RANK_TIERS.filter(function (t) { return t.name !== 'Master'; });
    var totalDivisions = standardTiers.reduce(function (acc, t) { return acc + t.divisions; }, 0); // 15
    var masterThreshold = totalDivisions * pointsPerDiv; // 4500
    if (p >= masterThreshold) {
        var masterPoints = p - masterThreshold;
        var stars_1 = Math.floor(masterPoints / 100);
        return {
            tier: 'Master',
            division: '',
            divisionNum: 1,
            rankStr: 'Master',
            stars: stars_1,
            weight: 6000 + (stars_1 * 10)
        };
    }
    var divIdx = Math.floor(p / pointsPerDiv);
    var rem = p % pointsPerDiv;
    var stars = Math.floor(rem / 100);
    // Division boundary handling (e.g. 300, 600, 900 RP):
    // - On normal/win/rank-up: represents full 3 stars of the previous division
    // - On loss (or at 0 stars of current division): represents 0 stars of the current division
    if (rem === 0 && divIdx > 0) {
        if (!isLoss) {
            divIdx = divIdx - 1;
            stars = 3;
        }
        else {
            stars = 0;
        }
    }
    var runningDivs = 0;
    for (var i = 0; i < standardTiers.length; i++) {
        var t = standardTiers[i];
        if (divIdx < runningDivs + t.divisions) {
            var localDivIdx = divIdx - runningDivs;
            var activeDivs = DIVS.slice(5 - t.divisions);
            var divisionStr = activeDivs[localDivIdx];
            return {
                tier: t.name,
                division: divisionStr,
                divisionNum: t.divisions - localDivIdx,
                rankStr: "".concat(t.name, " ").concat(divisionStr),
                stars: stars,
                weight: 1000 + (i * 1000) + (localDivIdx * 250) + (stars * 50)
            };
        }
        runningDivs += t.divisions;
    }
    return { tier: 'Bronze', division: 'III', divisionNum: 3, rankStr: 'Bronze III', stars: 0, weight: 1000 };
}
