import React from "react";
import Link from "next/link";
import { TournamentStatusBadge } from "./TournamentStatusBadge";
import { UserAvatar } from "./UserAvatar";

export const TodayTournaments = ({ tournaments, loading, baseUrl }: { tournaments: any[], loading: boolean, baseUrl: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-semibold text-lg text-white flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-sm">⚡</span>
        แมตช์วันนี้
      </h3>
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold bg-white/5 px-2 py-1 rounded-md">TODAY</span>
    </div>

    <div className="space-y-3">
      {loading ? (
        Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl" />)
      ) : tournaments.length > 0 ? (
        tournaments.map((t: any) => (
          <Link key={t.id} href={`/tournament/${t.documentId}`} className="block group">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/8 hover:border-green-500/30 transition-all duration-200">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className="text-2xl group-hover:scale-110 transition-transform">🏆</span>
                <div className="text-left truncate">
                  <p className="text-sm font-bold text-white group-hover:text-green-400 transition-colors truncate">{t.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <TournamentStatusBadge status={t.tournament_status} />
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {t.type === 'double' ? '👥 คู่' : '👤 เดี่ยว'} · {t.tournament_players_count || 0} คนลงแข่ง
                    </p>
                    <div className="flex items-center gap-1 mt-1 opacity-60">
                      <UserAvatar user={t.user_created} baseUrl={baseUrl} />
                      <span className="text-[8px] font-bold text-slate-400">BY: {t.user_created?.username || "ADMIN"}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter transition-colors group-hover:text-white">Detail ➜</p>
              </div>
            </div>
          </Link>
        ))
      ) : (
        <div className="text-center py-12 bg-white/3 rounded-3xl border border-white/5">
          <span className="text-3xl block mb-2 opacity-50">🏟️</span>
          <p className="text-sm text-slate-500">ไม่มีทัวร์นาเมนต์เปิดวันนี้</p>
        </div>
      )}
    </div>
  </div>
);
