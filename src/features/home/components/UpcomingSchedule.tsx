import React from "react";
import Link from "next/link";
import { TournamentStatusBadge } from "./TournamentStatusBadge";
import { UserAvatar } from "./UserAvatar";

export const UpcomingSchedule = ({ upcomingDays, loading, baseUrl }: { upcomingDays: any[], loading: boolean, baseUrl: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
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
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">{day.label}</p>
            </div>

            <div className="space-y-3 ml-8">
              {day.items.map((item: any) => (
                <Link key={item.id} href={`/tournament/${item.documentId}`} className="group block">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/8 hover:border-blue-500/30 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl group-hover:scale-110 transition-transform">🏆</span>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{item.name}</p>
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-2 font-medium">
                          <span className="flex items-center gap-1">
                            {item.type === 'double' ? '👥 คู่' : '👤 เดี่ยว'}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                          <span>ผู้ลงแข่ง: {item.tournament_players_count || 0} คน</span>
                        </p>
                        <div className="flex items-center gap-1 mt-1 opacity-50">
                          <UserAvatar user={item.user_created} baseUrl={baseUrl} />
                          <span className="text-[8px] font-bold text-slate-400">BY: {item.user_created?.username || "ADMIN"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <TournamentStatusBadge status={item.tournament_status} />
                      <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase tracking-tighter">View Detail ➜</p>
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
