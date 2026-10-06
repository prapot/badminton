"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SkillBadge;
var jsx_runtime_1 = require("react/jsx-runtime");
var skillLevels_1 = require("../constants/skillLevels");
var utils_1 = require("@/shared/utils/utils");
function SkillBadge(_a) {
    var skillLevel = _a.skillLevel, _b = _a.showLabel, showLabel = _b === void 0 ? true : _b, className = _a.className;
    if (!skillLevel)
        return null;
    var config = (0, skillLevels_1.getSkillConfig)(skillLevel);
    return ((0, jsx_runtime_1.jsxs)("span", { className: (0, utils_1.cn)("flex items-center text-[10px] rounded-full font-extrabold whitespace-nowrap shadow-sm border border-black/5 justify-center", showLabel ? "gap-1.5 pr-2 pl-1 py-0.5" : "p-0.5 aspect-square", config.bgClass, config.textClass, className), children: [(0, jsx_runtime_1.jsx)("span", { className: (0, utils_1.cn)("w-4 h-4 rounded-full text-white flex items-center justify-center shadow-sm text-[8px] leading-none tracking-tighter", config.dotClass), children: config.icon }), showLabel && ((0, jsx_runtime_1.jsx)("span", { children: config.shortLabel === 'หน้าบ้าน' ? config.label : "\u0E21\u0E37\u0E2D ".concat(config.shortLabel) }))] }));
}
