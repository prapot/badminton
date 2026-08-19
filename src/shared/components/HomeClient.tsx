"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import Navbar from "@/shared/components/Navbar";
import { useAuth } from "@/features/auth/useAuth";
import Footer from "@/shared/components/Footer";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

interface Match {
  id: number;
  scheduledAt: string;
  match_no: number;
  match_status: string;
  score_a?: number;
  score_b?: number;
  team_a_id?: {
    name: string;
    team_players: Array<{ user_id?: { username: string } }>;
  };
  team_b_id?: {
    name: string;
    team_players: Array<{ user_id?: { username: string } }>;
  };
}

interface Tournament {
  id: number;
  documentId: string;
  name: string;
  type: string;
  startDate: string;
  tournament_status: string;
  matches?: Match[];
  tournament_players?: any[];
  tournament_players_count?: number;
  user_created?: {
    id: number;
    username: string;
    picture?: { url: string } | null;
  } | null;
}

const news = [
  { title: "เปิดรับสมัครทัวร์นาเมนต์ประจำเดือน มีนาคม 2026", date: "25 ก.พ. 2026", tag: "ทัวร์นาเมนต์" },
  { title: "ระเบียบการใช้สนามใหม่ 2026 โปรดอ่านก่อนจอง", date: "20 ก.พ. 2026", tag: "ประกาศ" },
  { title: "Workshop การจับแร็กเก็ตอย่างถูกวิธี โดยโค้ชมืออาชีพ", date: "18 ก.พ. 2026", tag: "อบรม" },
];

const fetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Fetch error");
  return res.json();
};

const getTHDateStr = (date: Date) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

export function HomeClient() {
  const { user, jwt } = useAuth();
  
  const { todayDateStr, tomorrowDateStr, in5DaysStr } = useMemo(() => {
    const now = new Date();
    const todayDateStr = getTHDateStr(now);
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = getTHDateStr(tomorrow);
    
    const in5Days = new Date(now);
    in5Days.setDate(in5Days.getDate() + 6);
    const in5DaysStr = getTHDateStr(in5Days);
    
    return { todayDateStr, tomorrowDateStr, in5DaysStr };
  }, []);

  const urlUsersCount = `${STRAPI_BASE_URL}/api/users/count`;
  const urlToday = `${STRAPI_BASE_URL}/api/tournaments?filters[$or][0][startDate]=${todayDateStr}&filters[$or][1][tournament_status]=ongoing&populate[matches][populate][team_a_id][populate][team_players][populate]=user_id&populate[matches][populate][team_b_id][populate][team_players][populate]=user_id&populate[tournament_players][count]=true&populate[user_created][populate]=picture`;
  const urlUpcoming = `${STRAPI_BASE_URL}/api/tournaments?filters[startDate][$gte]=${tomorrowDateStr}&filters[startDate][$lt]=${in5DaysStr}&sort[0]=startDate:asc&populate[tournament_players][count]=true&populate[user_created][populate]=picture`;

  const { data: usersCountData, isLoading: loadingUsers } = useSWR(jwt ? [urlUsersCount, jwt] : null, fetcher);
  const { data: todayTourneysData, isLoading: loadingToday } = useSWR(jwt ? [urlToday, jwt] : null, fetcher);
  const { data: upcomingTourneysData, isLoading: loadingUpcoming } = useSWR(jwt ? [urlUpcoming, jwt] : null, fetcher);

  const membersCount = typeof usersCountData === "number" ? usersCountData : 0;
  
  const todayTournaments = useMemo(() => {
    return (todayTourneysData?.data || []).map((t: any) => ({
      ...t,
      tournament_players_count: t.tournament_players?.count || 0
    }));
  }, [todayTourneysData]);

  const upcomingDays = useMemo(() => {
    const upcomingItems = (upcomingTourneysData?.data || []).map((t: any) => ({
      ...t,
      tournament_players_count: t.tournament_players?.count || 0
    }));

    const now = new Date();
    const days = [];
    for (let i = 1; i < 6; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dStr = getTHDateStr(d);

      const dayTourneys = upcomingItems.filter((t: any) => t.startDate === dStr);
      if (dayTourneys.length > 0) {
        days.push({
          date: dStr,
          label: i === 1 ? "พรุ่งนี้" : d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' }),
          items: dayTourneys.map((t: any) => ({ ...t, kind: 'tournament' }))
        });
      }
    }
    return days;
  }, [upcomingTourneysData]);

  const loading = loadingUsers || loadingToday || loadingUpcoming;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0f1923] text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a2d20] to-[#0f1923] border border-white/10 p-8 shadow-2xl">
          <div className="absolute inset-0 pointer-events-none opacity-5">
            <svg className="w-full h-full" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid slice">
              <rect x="50" y="20" width="800" height="260" fill="none" stroke="#2ecc71" strokeWidth="2" />
              <line x1="450" y1="20" x2="450" y2="280" stroke="#2ecc71" strokeWidth="3" />
            </svg>
          </div>
          <div className="absolute top-4 right-8 text-8xl opacity-10 select-none">🏸</div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              ระบบออนไลน์
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              ยินดีต้อนรับ, {user.username}! 🎉
            </h2>
            <p className="text-slate-400 max-w-xl">
              จัดการสนามแบดมินตัน ดูตารางการแข่งขัน และติดตามผลลัพธ์ได้ที่นี่
            </p>
            <div className="flex items-center gap-3 mt-5">
              <Link href="/tournament" className="px-5 py-2.5 bg-gradient-to-r from-[#2ecc71] to-[#27ae60] text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-green-900/30 hover:scale-[1.02]">
                ทัวร์นาเมนต์
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
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
              <p className="text-2xl font-bold text-white">{loading ? "..." : todayTournaments.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">ทัวร์นาเมนต์วันนี้</p>
            </div>
          </div>
        </div>

        {/* Today's matches + Upcoming Days Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Today's Tournaments (Accordion) */}
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
              ) : todayTournaments.length > 0 ? (
                todayTournaments.map((t: any) => (
                  <Link
                    key={t.id}
                    href={`/tournament/${t.documentId}`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/8 hover:border-green-500/30 transition-all duration-200">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🏆</span>
                        <div className="text-left truncate">
                          <p className="text-sm font-bold text-white group-hover:text-green-400 transition-colors truncate">{t.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {(() => {
                              const cfg: Record<string, { label: string; cls: string }> = {
                                ongoing: { label: "● กำลังแข่ง", cls: "bg-green-500/10 text-green-400 border-green-500/20 animate-pulse" },
                                upcoming: { label: "รอเริ่ม", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                                completed: { label: "จบแล้ว", cls: "bg-white/5 text-slate-400 border-white/10" },
                              };
                              const s = cfg[t.tournament_status] ?? cfg.upcoming;
                              return (
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>
                                  {s.label}
                                </span>
                              );
                            })()}
                            <p className="text-[10px] text-slate-500 font-medium truncate">
                              {t.type === 'double' ? '👥 คู่' : '👤 เดี่ยว'} · {t.tournament_players_count || 0} คนลงแข่ง
                            </p>
                            <div className="flex items-center gap-1 mt-1 opacity-60">
                              {t.user_created?.picture?.url ? (
                                <Image
                                  src={t.user_created.picture.url.startsWith("http") ? t.user_created.picture.url : `${STRAPI_BASE_URL}${t.user_created.picture.url}`}
                                  alt={t.user_created.username}
                                  width={12}
                                  height={12}
                                  className="w-3 h-3 rounded-full object-cover border border-white/10"
                                />
                              ) : (
                                <div className="w-3 h-3 rounded-full bg-slate-700 flex items-center justify-center text-[6px] font-bold text-slate-300">
                                  {t.user_created?.username?.charAt(0).toUpperCase() || "?"}
                                </div>
                              )}
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

          {/* Upcoming 5 Days Schedule */}
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
                        <Link
                          key={item.id}
                          href={`/tournament/${item.documentId}`}
                          className="group block"
                        >
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
                                  {item.user_created?.picture?.url ? (
                                    <Image
                                      src={item.user_created.picture.url.startsWith("http") ? item.user_created.picture.url : `${STRAPI_BASE_URL}${item.user_created.picture.url}`}
                                      alt={item.user_created.username}
                                      width={12}
                                      height={12}
                                      className="w-3 h-3 rounded-full object-cover border border-white/10"
                                    />
                                  ) : (
                                    <div className="w-3 h-3 rounded-full bg-slate-700 flex items-center justify-center text-[6px] font-bold text-slate-300">
                                      {item.user_created?.username?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                  )}
                                  <span className="text-[8px] font-bold text-slate-400">BY: {item.user_created?.username || "ADMIN"}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              {(() => {
                                const cfg: Record<string, { label: string; cls: string }> = {
                                  ongoing: { label: "● กำลังแข่ง", cls: "bg-green-500/10 text-green-400 border-green-500/20 animate-pulse" },
                                  upcoming: { label: "รอเริ่ม", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                                  completed: { label: "จบแล้ว", cls: "bg-white/5 text-slate-400 border-white/10" },
                                };
                                const s = cfg[item.tournament_status] ?? cfg.upcoming;
                                return (
                                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${s.cls}`}>
                                    {s.label}
                                  </span>
                                );
                              })()}
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
        </div>

        {/* News */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
          <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm">📢</span>
            ข่าวสารและประกาศ
          </h3>
          <div className="divide-y divide-white/5">
            {news.map((n, i) => (
              <div key={i} className="py-4 flex items-start justify-between gap-4 group cursor-pointer hover:bg-white/2 px-2 -mx-2 rounded-xl transition-all">
                <div>
                  <p className="text-sm text-slate-200 group-hover:text-white transition-colors leading-snug font-medium">
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                    {n.date}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-tight">
                  {n.tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Footer></Footer>
      </main >
    </div >
  );
}
