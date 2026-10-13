import React from "react";
import Link from "next/link";
import { TournamentStatusBadge } from "./TournamentStatusBadge";
import { UserAvatar } from "./UserAvatar";

export const UpcomingSchedule = ({ upcomingDays, loading, baseUrl }: { upcomingDays: any[], loading: boolean, baseUrl: string }) => (
  <div className="min-w-0 bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-xl">
    <div className="flex items-center justify-between mb-6">
      <h3 className="font-semibold text-lg text-white flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm">📅</span>
        ตารางล่วงหน้า (5 วัน)
      </h3>
    </div>

    <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-[15px] before:w-[2px] before:bg-white/5 before:z-0">
      {loading ? (
        Array(2).fill(0).map((_, i) => <div key={i} className="h-24 bg-white/5 animate-pulse rounded-2xl ml-8" />)
      ) : upcomingDays.length > 0 ? (
        upcomingDays.map((day) => (
          <div key={day.date} className="relative z-10">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#0f1923] border-2 border-slate-700 flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-slate-500"></div>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">{day.label}</p>
            </div>

            <div className="space-y-3 ml-8 min-w-0">
              {day.items.map((item: any) => (
                <Link key={item.id} href={`/tournament/${item.documentId}`} className="group block">
                  <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/8 hover:border-blue-500/30 transition-all duration-300">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">🏆</span>
                      <div className="min-w-0">
                        <p className="text-base font-bold text-white group-hover:text-blue-400 transition-colors truncate">{item.name}</p>
                        <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
                          <span className="flex items-center gap-1">
                            {item.type === 'double' ? '👥 คู่' : '👤 เดี่ยว'}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                          <span>ผู้ลงแข่ง: {item.tournament_players_count || 0} คน</span>
                        </p>
                        <div className="flex items-center gap-1 mt-1 min-w-0 opacity-70">
                          <UserAvatar user={item.user_created} baseUrl={baseUrl} />
                          <span className="text-[11px] font-medium text-slate-400 truncate">โดย {item.user_created?.username || "ADMIN"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <TournamentStatusBadge status={item.tournament_status} />
                      <span aria-hidden className="text-xl text-slate-500 transition-colors group-hover:text-white">›</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 bg-white/3 rounded-3xl border border-white/5 ml-8">
          <p className="text-sm text-slate-500">ยังไม่มีรายการล่วงหน้า</p>
        </div>
      )}
    </div>
  </div>
);
