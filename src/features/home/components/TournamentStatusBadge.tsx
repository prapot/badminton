import React from "react";

export const TournamentStatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { label: string; cls: string }> = {
    ongoing: { label: "● กำลังแข่ง", cls: "bg-green-500/10 text-green-400 border-green-500/20 animate-pulse" },
    upcoming: { label: "รอเริ่ม", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    completed: { label: "จบแล้ว", cls: "bg-white/5 text-slate-400 border-white/10" },
  };
  const s = cfg[status] ?? cfg.upcoming;
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  );
};
