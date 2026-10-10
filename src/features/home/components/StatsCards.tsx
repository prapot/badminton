import React from "react";

export const StatsCards = ({ membersCount, todayCount, loading }: { membersCount: number, todayCount: number, loading: boolean }) => (
  <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-5 flex flex-col gap-3 group hover:border-blue-500/40 transition-all">
      <span className="text-2xl group-hover:scale-110 transition-transform">👥</span>
      <div>
        <p className="text-2xl font-bold text-white">{loading ? "..." : membersCount}</p>
        <p className="text-xs text-slate-400 mt-0.5">สมาชิก</p>
      </div>
    </div>
    <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/20 rounded-2xl p-5 flex flex-col gap-3 group hover:border-yellow-500/40 transition-all">
      <span className="text-2xl group-hover:scale-110 transition-transform">⚡</span>
      <div>
        <p className="text-2xl font-bold text-white">{loading ? "..." : todayCount}</p>
        <p className="text-xs text-slate-400 mt-0.5">ทัวร์นาเมนต์วันนี้</p>
      </div>
    </div>
  </div>
);
