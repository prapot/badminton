"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var TournamentUtils_1 = require("../utils/TournamentUtils");
var RankBadge = function (_a) {
    var initialRank = _a.rank, _b = _a.stars, stars = _b === void 0 ? 0 : _b, _c = _a.showName, showName = _c === void 0 ? true : _c, _d = _a.size, size = _d === void 0 ? 'md' : _d;
    var rank = initialRank || "Bronze V";
    // Normalize rank string (e.g., Bronze 5 -> Bronze V)
    if (rank) {
        rank = rank.replace(/\s5$/, ' V')
            .replace(/\s4$/, ' IV')
            .replace(/\s3$/, ' III')
            .replace(/\s2$/, ' II')
            .replace(/\s1$/, ' I');
    }
    var getRankDetails = function (rankName) {
        var name = rankName.split(' ')[0].toLowerCase();
        if (name.includes('bronze'))
            return {
                color: 'from-[#cc6e3c] via-[#b87333] to-[#8b4513]',
                icon: '🥉',
                textColor: 'text-orange-100',
                glow: 'shadow-orange-900/40',
                border: 'border-orange-400/30'
            };
        if (name.includes('silver'))
            return {
                color: 'from-[#bdc3c7] via-[#95a5a6] to-[#7f8c8d]',
                icon: '🥈',
                textColor: 'text-slate-100',
                glow: 'shadow-slate-500/30',
                border: 'border-slate-300/30'
            };
        if (name.includes('gold'))
            return {
                color: 'from-[#f1c40f] via-[#f39c12] to-[#d35400]',
                icon: '🥇',
                textColor: 'text-yellow-50 text-shadow-sm',
                glow: 'shadow-yellow-500/40',
                border: 'border-yellow-300/40'
            };
        if (name.includes('platinum'))
            return {
                color: 'from-[#3498db] via-[#2980b9] to-[#1a5276]',
                icon: '💎',
                textColor: 'text-blue-50',
                glow: 'shadow-blue-500/50',
                border: 'border-blue-300/40'
            };
        if (name.includes('diamond'))
            return {
                color: 'from-[#9b59b6] via-[#8e44ad] to-[#5b2c6f]',
                icon: '💠',
                textColor: 'text-purple-50',
                glow: 'shadow-purple-500/50',
                border: 'border-purple-300/40'
            };
        if (name.includes('master'))
            return {
                color: 'from-[#e74c3c] via-[#c0392b] to-[#78281f]',
                icon: '🏆',
                textColor: 'text-red-50 font-black tracking-tighter animate-pulse',
                glow: 'shadow-red-500/60',
                border: 'border-red-400/50'
            };
        return {
            color: 'from-slate-600 via-slate-700 to-slate-800',
            icon: '❓',
            textColor: 'text-slate-400',
            glow: 'shadow-black/20',
            border: 'border-slate-500/20'
        };
    };
    var details = getRankDetails(rank);
    var sizeClasses = {
        sm: {
            container: 'px-1.5 py-0.5 min-w-[60px]',
            text: 'text-[8px]',
            star: 'w-2.5 h-2.5',
            icon: 'text-[9px]',
            gap: 'gap-0.5'
        },
        md: {
            container: 'px-3 py-1 min-w-[90px]',
            text: 'text-[11px]',
            star: 'w-3.5 h-3.5',
            icon: 'text-xs',
            gap: 'gap-1'
        },
        lg: {
            container: 'px-4 py-2 min-w-[120px]',
            text: 'text-sm',
            star: 'w-4.5 h-4.5',
            icon: 'text-base',
            gap: 'gap-1.5'
        }
    };
    var s = sizeClasses[size];
    var maxStars = (0, TournamentUtils_1.getMaxStarsForRank)(rank);
    var isMaster = rank.toLowerCase().includes('master');
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center ".concat(s.gap, " perspective-[1000px]"), children: [(0, jsx_runtime_1.jsxs)("div", { className: "\n                relative flex items-center justify-center gap-1.5 ".concat(s.container, " \n                rounded-full bg-gradient-to-br ").concat(details.color, " \n                ").concat(details.glow, " shadow-lg border-2 ").concat(details.border, "\n                group hover:scale-105 transition-all duration-300 transform-gpu\n            "), children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 rounded-full overflow-hidden pointer-events-none opacity-20", children: (0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" }) }), (0, jsx_runtime_1.jsx)("span", { className: "".concat(s.icon, " drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"), children: details.icon }), showName && ((0, jsx_runtime_1.jsx)("span", { className: "\n                        font-black uppercase tracking-wider ".concat(details.textColor, " ").concat(s.text, "\n                        drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]\n                    "), children: rank }))] }), rank !== 'Unranked' && rank !== 'None' && ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center min-h-[14px]", children: isMaster ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/40 backdrop-blur-sm shadow-[0_0_10px_rgba(239,68,68,0.2)]", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[9px] leading-none drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]", children: "\u2B50" }), (0, jsx_runtime_1.jsxs)("span", { className: "".concat(s.text, " font-black text-yellow-300 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]"), children: ["x", stars] })] })) : ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-1", children: __spreadArray([], Array(maxStars), true).map(function (_, i) { return ((0, jsx_runtime_1.jsx)("div", { className: "relative flex items-center justify-center", children: i < stars ? ((0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 24 24", className: "".concat(s.star, " text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)] transition-all duration-300 transform scale-105"), fill: "currentColor", children: (0, jsx_runtime_1.jsx)("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" }) })) : ((0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 24 24", className: "".concat(s.star, " text-white/20 transition-all duration-300"), fill: "rgba(255,255,255,0.06)", stroke: "rgba(255,255,255,0.3)", strokeWidth: "1.5", strokeLinejoin: "round", children: (0, jsx_runtime_1.jsx)("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" }) })) }, i)); }) })) }))] }));
};
exports.default = RankBadge;
