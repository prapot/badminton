"use client";
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockedPartnerModal = void 0;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var image_1 = __importDefault(require("next/image"));
var SkillBadge_1 = __importDefault(require("./SkillBadge"));
var RankBadge_1 = __importDefault(require("./RankBadge"));
var STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";
var BlockedPartnerModal = function (_a) {
    var _b, _c;
    var isOpen = _a.isOpen, onClose = _a.onClose, players = _a.players, currentUserId = _a.currentUserId, blockedPartner = _a.blockedPartner, onSave = _a.onSave, onRemove = _a.onRemove, saving = _a.saving;
    var _d = (0, react_1.useState)(""), selectedPlayerId = _d[0], setSelectedPlayerId = _d[1];
    var _e = (0, react_1.useState)(""), searchQuery = _e[0], setSearchQuery = _e[1];
    (0, react_1.useEffect)(function () {
        if (blockedPartner === null || blockedPartner === void 0 ? void 0 : blockedPartner.blockedId) {
            setSelectedPlayerId(blockedPartner.blockedId);
        }
        else {
            setSelectedPlayerId("");
        }
        if (isOpen) {
            setSearchQuery("");
        }
    }, [blockedPartner, isOpen]);
    // Filter players excluding current user
    var eligiblePlayers = (0, react_1.useMemo)(function () {
        return players.filter(function (p) { return p.id !== currentUserId; });
    }, [players, currentUserId]);
    // Search filter
    var filteredPlayers = (0, react_1.useMemo)(function () {
        var query = searchQuery.trim().toLowerCase();
        if (!query)
            return eligiblePlayers;
        return eligiblePlayers.filter(function (p) {
            var username = (p.username || "").toLowerCase();
            var nickname = (p.nickname || "").toLowerCase();
            var guestName = (p.guest_name || "").toLowerCase();
            return username.includes(query) || nickname.includes(query) || guestName.includes(query);
        });
    }, [eligiblePlayers, searchQuery]);
    var currentBlockedPlayer = (blockedPartner === null || blockedPartner === void 0 ? void 0 : blockedPartner.blockedPlayer) ||
        players.find(function (p) { return p.id === (blockedPartner === null || blockedPartner === void 0 ? void 0 : blockedPartner.blockedId); });
    var selectedPlayer = players.find(function (p) { return p.id === selectedPlayerId; });
    if (!isOpen)
        return null;
    var handleSave = function () { return __awaiter(void 0, void 0, void 0, function () {
        var success;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!selectedPlayerId || typeof selectedPlayerId !== "number")
                        return [2 /*return*/];
                    return [4 /*yield*/, onSave(selectedPlayerId)];
                case 1:
                    success = _a.sent();
                    if (success) {
                        onClose();
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    var handleRemove = function () { return __awaiter(void 0, void 0, void 0, function () {
        var success;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, onRemove()];
                case 1:
                    success = _a.sent();
                    if (success) {
                        setSelectedPlayerId("");
                        onClose();
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    var getAvatarUrl = function (picture) {
        if (!picture)
            return null;
        var url = typeof picture === "string" ? picture : picture.url;
        if (!url)
            return null;
        return url.startsWith("http") ? url : "".concat(STRAPI_BASE_URL).concat(url);
    };
    var renderAvatar = function (player, size) {
        var _a;
        if (size === void 0) { size = "w-10 h-10"; }
        var url = getAvatarUrl(player === null || player === void 0 ? void 0 : player.picture);
        var initial = (_a = ((player === null || player === void 0 ? void 0 : player.nickname) || (player === null || player === void 0 ? void 0 : player.username) || (player === null || player === void 0 ? void 0 : player.guest_name) || "?")[0]) === null || _a === void 0 ? void 0 : _a.toUpperCase();
        if (url) {
            return ((0, jsx_runtime_1.jsx)("div", { className: "relative ".concat(size, " rounded-full overflow-hidden shrink-0 border border-slate-600/80 bg-slate-800 shadow-sm"), children: (0, jsx_runtime_1.jsx)(image_1.default, { src: url, alt: (player === null || player === void 0 ? void 0 : player.username) || "avatar", fill: true, className: "object-cover" }) }));
        }
        return ((0, jsx_runtime_1.jsx)("div", { className: "relative ".concat(size, " rounded-full shrink-0 flex items-center justify-center font-bold text-xs text-white bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 border border-white/20 shadow-inner"), children: initial }));
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative w-full max-w-lg bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all text-slate-100", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80 shrink-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-indigo-500/20 border border-rose-500/30 flex items-center justify-center text-xl shadow-inner", children: "\u2694\uFE0F" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-base font-bold text-white tracking-wide", children: "\u0E42\u0E2B\u0E21\u0E14\u0E17\u0E49\u0E32\u0E14\u0E27\u0E25" }), (0, jsx_runtime_1.jsx)("span", { className: "px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider", children: "Rivalry" })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-400 mt-0.5", children: "\u0E08\u0E31\u0E14\u0E43\u0E2B\u0E49\u0E04\u0E38\u0E13\u0E41\u0E25\u0E30\u0E04\u0E39\u0E48\u0E41\u0E02\u0E48\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E04\u0E19\u0E25\u0E30\u0E17\u0E35\u0E21\u0E40\u0E2A\u0E21\u0E2D" })] })] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors", "aria-label": "Close", children: (0, jsx_runtime_1.jsx)("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "px-5 pt-3 pb-1 shrink-0", children: (0, jsx_runtime_1.jsxs)("div", { className: "p-2.5 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl flex items-start space-x-2.5", children: [(0, jsx_runtime_1.jsx)("svg", { className: "w-4 h-4 text-blue-400 mt-0.5 shrink-0", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[11px] text-blue-200/90 leading-relaxed", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-blue-300", children: "\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E27\u0E32\u0E21\u0E25\u0E31\u0E1A\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E04\u0E38\u0E13:" }), " \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E19\u0E35\u0E49\u0E21\u0E35\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E04\u0E38\u0E13\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E47\u0E19 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E19\u0E04\u0E39\u0E48\u0E01\u0E23\u0E13\u0E35\u0E08\u0E30\u0E44\u0E21\u0E48\u0E17\u0E23\u0E32\u0E1A \u0E42\u0E14\u0E22\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E08\u0E31\u0E14\u0E43\u0E2B\u0E49\u0E04\u0E38\u0E13\u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E40\u0E25\u0E48\u0E19\u0E17\u0E48\u0E32\u0E19\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E39\u0E48 ", (0, jsx_runtime_1.jsx)("span", { className: "text-amber-300 font-bold", children: "\"\u0E04\u0E19\u0E25\u0E30\u0E17\u0E35\u0E21\u0E40\u0E2A\u0E21\u0E2D\"" }), " \u0E17\u0E38\u0E01\u0E41\u0E21\u0E15\u0E0A\u0E4C"] })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "p-5 overflow-y-auto space-y-4 flex-1", children: [blockedPartner ? ((0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-gradient-to-br from-slate-800/90 to-slate-850 border border-rose-500/40 rounded-2xl shadow-lg relative overflow-hidden", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-xs font-semibold text-rose-300 flex items-center space-x-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-2 h-2 rounded-full bg-rose-400 animate-ping" }), (0, jsx_runtime_1.jsx)("span", { children: "\uD83C\uDFAF \u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22\u0E17\u0E49\u0E32\u0E14\u0E27\u0E25\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19" })] }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-full border border-slate-700", children: "\u0E25\u0E47\u0E2D\u0E04\u0E2D\u0E22\u0E39\u0E48\u0E04\u0E19\u0E25\u0E30\u0E17\u0E35\u0E21" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3 min-w-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [renderAvatar(currentBlockedPlayer, "w-12 h-12"), (0, jsx_runtime_1.jsx)("span", { className: "absolute -bottom-1 -right-1 text-xs", children: "\u2694\uFE0F" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5 flex-wrap", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm font-bold text-white truncate", children: (currentBlockedPlayer === null || currentBlockedPlayer === void 0 ? void 0 : currentBlockedPlayer.nickname) || (currentBlockedPlayer === null || currentBlockedPlayer === void 0 ? void 0 : currentBlockedPlayer.username) || "ผู้เล่นในทัวร์" }), (currentBlockedPlayer === null || currentBlockedPlayer === void 0 ? void 0 : currentBlockedPlayer.skill_level) && ((0, jsx_runtime_1.jsx)(SkillBadge_1.default, { skillLevel: currentBlockedPlayer.skill_level, className: "text-[9px] py-0 px-1.5" }))] }), (currentBlockedPlayer === null || currentBlockedPlayer === void 0 ? void 0 : currentBlockedPlayer.nickname) && (currentBlockedPlayer === null || currentBlockedPlayer === void 0 ? void 0 : currentBlockedPlayer.username) && ((0, jsx_runtime_1.jsxs)("div", { className: "text-xs text-slate-400 truncate", children: ["@", currentBlockedPlayer.username] })), ((_c = (_b = currentBlockedPlayer === null || currentBlockedPlayer === void 0 ? void 0 : currentBlockedPlayer.rankings) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.rank) && ((0, jsx_runtime_1.jsx)("div", { className: "mt-1", children: (0, jsx_runtime_1.jsx)(RankBadge_1.default, { rank: currentBlockedPlayer.rankings[0].rank, stars: currentBlockedPlayer.rankings[0].stars, size: "sm", showName: true }) }))] })] }), (0, jsx_runtime_1.jsxs)("button", { onClick: handleRemove, disabled: saving, className: "shrink-0 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:text-rose-100 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl transition-all disabled:opacity-50 active:scale-95 flex items-center space-x-1", children: [(0, jsx_runtime_1.jsx)("svg", { className: "w-3.5 h-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) }), (0, jsx_runtime_1.jsx)("span", { children: saving ? "กำลังยกเลิก..." : "ยกเลิกท้าดวล" })] })] })] }) })) : (
                        /* Mode 2: Select a player to duel */
                        (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-1.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between text-xs", children: [(0, jsx_runtime_1.jsxs)("label", { className: "font-semibold text-slate-300 flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E19\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E32\u0E01\u0E14\u0E27\u0E25\u0E1D\u0E35\u0E21\u0E37\u0E2D\u0E14\u0E49\u0E27\u0E22" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-slate-400 font-normal", children: "(\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 1 \u0E04\u0E19)" })] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[11px] text-slate-400 font-medium", children: [filteredPlayers.length, " / ", eligiblePlayers.length, " \u0E04\u0E19"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400", children: (0, jsx_runtime_1.jsx)("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) }) }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: searchQuery, onChange: function (e) { return setSearchQuery(e.target.value); }, placeholder: "\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E40\u0E25\u0E48\u0E19 \u0E2B\u0E23\u0E37\u0E2D\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E25\u0E48\u0E19...", className: "w-full pl-9 pr-9 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/50 transition-all" }), searchQuery && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: function () { return setSearchQuery(""); }, className: "absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white", children: (0, jsx_runtime_1.jsx)("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) }))] })] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-2 max-h-[300px] overflow-y-auto pr-1", children: filteredPlayers.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "text-center py-8 px-4 bg-slate-800/40 rounded-xl border border-dashed border-slate-700", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-2xl mb-1.5", children: "\uD83D\uDD0D" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-slate-300 font-medium", children: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E19\u0E23\u0E48\u0E27\u0E21\u0E01\u0E4A\u0E27\u0E19\u0E17\u0E35\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E04\u0E33\u0E04\u0E49\u0E19\u0E2B\u0E32" }), searchQuery && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: function () { return setSearchQuery(""); }, className: "mt-2 text-xs text-rose-400 hover:underline", children: "\u0E25\u0E49\u0E32\u0E07\u0E04\u0E33\u0E04\u0E49\u0E19\u0E2B\u0E32" }))] })) : (filteredPlayers.map(function (player) {
                                        var _a, _b;
                                        var isSelected = selectedPlayerId === player.id;
                                        var displayName = player.nickname || player.username;
                                        var subName = player.nickname ? "@".concat(player.username) : null;
                                        return ((0, jsx_runtime_1.jsxs)("div", { onClick: function () { return setSelectedPlayerId(isSelected ? "" : player.id); }, className: "group relative flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] ".concat(isSelected
                                                ? "bg-gradient-to-r from-rose-950/50 via-slate-800 to-indigo-950/40 border-rose-500 shadow-md shadow-rose-950/40 ring-1 ring-rose-500/50"
                                                : "bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 hover:border-slate-600"), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3 min-w-0 mr-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [renderAvatar(player, "w-10 h-10"), isSelected && ((0, jsx_runtime_1.jsx)("div", { className: "absolute -bottom-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] text-white shadow", children: "\uD83C\uDFAF" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5 flex-wrap", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm font-semibold truncate ".concat(isSelected ? "text-white" : "text-slate-200 group-hover:text-white"), children: displayName }), player.is_guest && ((0, jsx_runtime_1.jsx)("span", { className: "text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20", children: "Guest" })), player.skill_level && ((0, jsx_runtime_1.jsx)(SkillBadge_1.default, { skillLevel: player.skill_level, className: "text-[9px] py-0 px-1.5" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mt-0.5", children: [subName && ((0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-slate-400 truncate", children: subName })), ((_b = (_a = player.rankings) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.rank) && ((0, jsx_runtime_1.jsx)(RankBadge_1.default, { rank: player.rankings[0].rank, stars: player.rankings[0].stars, size: "sm", showName: false }))] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "shrink-0 pl-2", children: isSelected ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2694\uFE0F" }), (0, jsx_runtime_1.jsx)("span", { children: "\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22" })] })) : ((0, jsx_runtime_1.jsx)("div", { className: "w-6 h-6 rounded-full border border-slate-600 group-hover:border-slate-500 flex items-center justify-center text-transparent group-hover:text-slate-500 transition-colors", children: (0, jsx_runtime_1.jsx)("div", { className: "w-2 h-2 rounded-full bg-slate-600/40 group-hover:bg-slate-500" }) })) })] }, player.id));
                                    })) })] })), (0, jsx_runtime_1.jsxs)("div", { className: "text-[11px] text-slate-400/90 leading-relaxed space-y-1 bg-slate-800/40 p-3 rounded-xl border border-slate-800", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-rose-400 font-bold", children: "\u2022" }), (0, jsx_runtime_1.jsx)("span", { children: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E14\u0E49 1 \u0E04\u0E19\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19 (\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E08\u0E31\u0E14\u0E43\u0E2B\u0E49\u0E04\u0E38\u0E13\u0E41\u0E25\u0E30\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E19\u0E17\u0E48\u0E32\u0E19\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E04\u0E19\u0E25\u0E30\u0E17\u0E35\u0E21\u0E40\u0E2A\u0E21\u0E2D)" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-indigo-400 font-bold", children: "\u2022" }), (0, jsx_runtime_1.jsx)("span", { children: "\u0E23\u0E30\u0E1A\u0E1A\u0E21\u0E35\u0E40\u0E1E\u0E14\u0E32\u0E19\u0E08\u0E33\u0E01\u0E31\u0E14 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E23\u0E31\u0E01\u0E29\u0E32\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E21\u0E14\u0E38\u0E25\u0E43\u0E19\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E04\u0E39\u0E48\u0E25\u0E07\u0E2A\u0E19\u0E32\u0E21\u0E02\u0E2D\u0E07\u0E01\u0E4A\u0E27\u0E19" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-amber-400 font-bold", children: "\u2022" }), (0, jsx_runtime_1.jsx)("span", { children: "\u0E21\u0E35\u0E1C\u0E25\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E41\u0E21\u0E15\u0E0A\u0E4C\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E04\u0E39\u0E48\u0E43\u0E19\u0E17\u0E31\u0E27\u0E23\u0E4C\u0E19\u0E32\u0E40\u0E21\u0E19\u0E15\u0E4C\u0E19\u0E35\u0E49\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 shrink-0", children: [(0, jsx_runtime_1.jsx)("div", { children: !blockedPartner && selectedPlayer && ((0, jsx_runtime_1.jsxs)("div", { className: "text-xs flex items-center gap-1.5 text-slate-300", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22:" }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-rose-300 truncate max-w-[140px] sm:max-w-[200px]", children: selectedPlayer.nickname || selectedPlayer.username })] })) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors", children: "\u0E1B\u0E34\u0E14" }), !blockedPartner && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleSave, disabled: !selectedPlayerId || saving, className: "px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-lg shadow-rose-950/40 transition-all flex items-center space-x-1.5", children: saving ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" }), (0, jsx_runtime_1.jsx)("span", { children: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01..." })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2694\uFE0F" }), (0, jsx_runtime_1.jsx)("span", { children: "\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E01\u0E32\u0E23\u0E17\u0E49\u0E32\u0E14\u0E27\u0E25" })] })) }))] })] })] }) }));
};
exports.BlockedPartnerModal = BlockedPartnerModal;
