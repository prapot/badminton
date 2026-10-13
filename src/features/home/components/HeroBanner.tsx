import React from "react";
import Link from "next/link";

export const HeroBanner = ({ username }: { username: string }) => (
  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a2d20] to-[#0f1923] border border-white/10 p-5 sm:p-8 shadow-2xl">
    <div className="absolute inset-0 pointer-events-none opacity-5">
      <svg className="w-full h-full" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid slice">
        <rect x="50" y="20" width="800" height="260" fill="none" stroke="#2ecc71" strokeWidth="2" />
        <line x1="450" y1="20" x2="450" y2="280" stroke="#2ecc71" strokeWidth="3" />
      </svg>
    </div>
    <div className="absolute top-3 right-4 sm:top-4 sm:right-8 text-6xl sm:text-8xl opacity-10 select-none">🏸</div>
    <div className="relative z-10">
      <div className="inline-flex items-center gap-2 text-xs font-medium text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20 mb-2 sm:mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
        ระบบออนไลน์
      </div>
      <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 leading-snug">
        ยินดีต้อนรับ, {username}! 🎉
      </h2>
      <p className="hidden sm:block text-slate-400 max-w-xl">
        จัดการสนามแบดมินตัน ดูตารางการแข่งขัน และติดตามผลลัพธ์ได้ที่นี่
      </p>
      <div className="flex items-center gap-3 mt-3 sm:mt-5">
        <Link href="/tournament" className="inline-flex items-center min-h-11 px-5 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-green-900/30 hover:scale-[1.02]">
          ทัวร์นาเมนต์
        </Link>
      </div>
    </div>
  </div>
);
