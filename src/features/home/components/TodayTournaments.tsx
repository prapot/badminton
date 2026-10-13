import React from "react";
import Link from "next/link";
import { TournamentStatusBadge } from "./TournamentStatusBadge";
import { UserAvatar } from "./UserAvatar";

export const TodayTournaments = ({ tournaments, loading, baseUrl }: { tournaments: any[], loading: boolean, baseUrl: string }) => (
  <div className="min-w-0 bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-semibold text-lg text-white flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-sm">⚡</span>
        แมตช์วันนี้
      </h3>
      <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold bg-white/5 px-2 py-1 rounded-md">TODAY</span>
    </div>

    <div className="space-y-3">
      {loading ? (
        Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl" />)
      ) : tournaments.length > 0 ? (
        tournaments.map((t: any) => (
          <Link key={t.id} href={`/tournament/${t.documentId}`} className="block group">
            <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/8 hover:border-green-500/30 transition-all duration-200">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">🏆</span>
                <div className="text-left min-w-0 flex-1">
                  <p className="text-base font-bold text-white group-hover:text-green-400 transition-colors truncate">{t.name}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    <TournamentStatusBadge status={t.tournament_status} />
                    <p className="text-xs text-slate-400 font-medium">
                      {t.type === 'double' ? '👥 คู่' : '👤 เดี่ยว'} · {t.tournament_players_count || 0} คนลงแข่ง
                    </p>
                    <div className="flex items-center gap-1 min-w-0 opacity-70">
                      <UserAvatar user={t.user_created} baseUrl={baseUrl} />
                      <span className="text-[11px] font-medium text-slate-400 truncate">โดย {t.user_created?.username || "ADMIN"}</span>
                    </div>
                  </div>
                </div>
              </div>
              <span aria-hidden className="shrink-0 text-xl text-slate-500 transition-colors group-hover:text-white">›</span>
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
